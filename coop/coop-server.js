/* ──────────────────────────────────────────────────────────────
   Freedom Founder, Co-op / Classroom Host Server
   Zero dependencies. Pure Node.js (http + os + fs). No npm install.

   What it does:
   • Serves the game to every student (same wifi, or hosted online).
   • Each student plays their own city; their live stats stream here.
   • Teacher opens /host, clicks "Start a Class" → gets a JOIN CODE.
   • Students enter that code → they share one private world (room).
   • Different classes use different codes, so worlds never mix.

   Run locally with the double-click launcher, or:  node coop-server.js
   In the cloud (Render/Railway/etc.) it binds to the assigned PORT.
   ────────────────────────────────────────────────────────────── */

'use strict';
const http = require('http');
const https = require('https');
const fs   = require('fs');
const os   = require('os');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

const ROOT       = path.join(__dirname, '..');     // project folder (holds the game html)
const COOP_DIR   = __dirname;                       // this /coop folder
const START_PORT = 3000;
const STALE_MS   = 8000;                            // drop a player after 8s of silence
const ENV_PORT   = process.env.PORT ? Number(process.env.PORT) : null;
const IS_CLOUD   = ENV_PORT !== null;

// ── durable player accounts (name + PIN), stored in Upstash Redis via its REST API ──
// Set these two env vars in Render (from a free Upstash database) to turn on automatic cloud saves.
const REDIS_URL   = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const STORE_ON    = !!(REDIS_URL && REDIS_TOKEN);
const ACCT_TTL_S  = 90 * 24 * 60 * 60;  // idle accounts auto-expire after 90 days (privacy retention); refreshed on every sign-in/save
// run one Redis command, e.g. redis(['SET','key','value']) → resolves the result
function redis(cmd) {
  return new Promise((resolve, reject) => {
    if (!STORE_ON) return reject(new Error('storage_off'));
    let u; try { u = new URL(REDIS_URL); } catch (e) { return reject(e); }
    const body = JSON.stringify(cmd);
    const r = https.request(
      { hostname: u.hostname, port: u.port || 443, path: (u.pathname && u.pathname !== '/' ? u.pathname : '/'), method: 'POST',
        headers: { 'Authorization': 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (resp) => { let s = ''; resp.on('data', c => s += c); resp.on('end', () => {
        try { const j = JSON.parse(s); if (j && j.error) reject(new Error(String(j.error))); else resolve(j ? j.result : null); }
        catch (e) { reject(e); } }); });
    r.on('error', reject);
    r.setTimeout(8000, () => r.destroy(new Error('timeout')));
    r.write(body); r.end();
  });
}
function acctKey(name) { return 'cato:acct:' + String(name || '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '').slice(0, 40); }
function pinHash(name, pin) { return crypto.createHash('sha256').update('cato|' + String(name || '').toLowerCase().trim() + '|' + String(pin || '')).digest('hex'); }
// constant-time compare so a wrong PIN can't be distinguished by response timing
function pinMatch(a, b) {
  a = String(a || ''); b = String(b || '');
  const ba = Buffer.from(a), bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  try { return crypto.timingSafeEqual(ba, bb); } catch (e) { return false; }
}

// ── brute-force throttle for PIN sign-in (in-memory, per client+name) ──
// PINs are short (3-6 digits); without this an attacker could guess every combination.
const authFails = new Map();            // key -> { count, first, blockedUntil }
const AUTH_WINDOW_MS  = 10 * 60 * 1000; // failures counted within a 10-minute window
const AUTH_MAX_FAILS  = 8;              // after this many, lock the pair out
const AUTH_BLOCK_MS   = 5  * 60 * 1000; // ...for 5 minutes
function clientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || (req.socket && req.socket.remoteAddress) || 'unknown';
}
function throttleKey(req, name) { return clientIp(req) + '|' + String(name || '').toLowerCase().trim(); }
function authBlocked(key) {
  const e = authFails.get(key);
  if (!e) return false;
  if (e.blockedUntil && Date.now() < e.blockedUntil) return true;
  if (e.blockedUntil && Date.now() >= e.blockedUntil) authFails.delete(key);
  return false;
}
function noteAuthFail(key) {
  const now = Date.now();
  let e = authFails.get(key);
  if (!e || now - e.first > AUTH_WINDOW_MS) e = { count: 0, first: now, blockedUntil: 0 };
  e.count++;
  if (e.count >= AUTH_MAX_FAILS) e.blockedUntil = now + AUTH_BLOCK_MS;
  authFails.set(key, e);
}
function noteAuthOk(key) { authFails.delete(key); }
function pruneAuthFails() {
  const now = Date.now();
  for (const [k, e] of authFails) {
    if ((e.blockedUntil && now >= e.blockedUntil) || (now - e.first > AUTH_WINDOW_MS)) authFails.delete(k);
  }
}

// ── choose which game file to serve ───────────────────────────────
function gameScore(f) {
  const m = f.match(/_v(\d+)/i);
  if (m) return 1000 + Number(m[1]);
  if (/final/i.test(f)) return 100;
  return 1;
}
function findGameFile() {
  const all = fs.readdirSync(ROOT).filter(f => /^(FreedomFounder|CatoCapitalismGame).*\.html$/i.test(f));
  if (!all.length) return null;
  if (process.env.GAME_FILE && all.includes(process.env.GAME_FILE)) {
    return path.join(ROOT, process.env.GAME_FILE);
  }
  all.sort((a, b) => {
    const d = gameScore(b) - gameScore(a);
    if (d) return d;
    return fs.statSync(path.join(ROOT, b)).mtimeMs - fs.statSync(path.join(ROOT, a)).mtimeMs;
  });
  return path.join(ROOT, all[0]);
}

// ── pick a real LAN ip ────────────────────────────────────────────
function lanIP() {
  const ifaces = os.networkInterfaces();
  let fallback = null;
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name]) {
      if (ni.family !== 'IPv4' || ni.internal) continue;
      if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ni.address)) return ni.address;
      if (!fallback) fallback = ni.address;
    }
  }
  return fallback || '127.0.0.1';
}

// ── ROOMS: each join code is its own private world ────────────────
// rooms: code -> { name, players: Map(id -> state{...,lastSeen}) }
const rooms = new Map();
const DEFAULT_ROOM = 'MAIN';           // players with no code share this open world
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no easily-confused chars (O/0, I/1)

// ── DUEL QUESTION BANK: server-authoritative so a challenger can't supply their own answer key ──
let DUEL_BANK = [];
// grade-banked duel banks (built from the game's own QG grade pools), so duel questions match
// each player's designated reading level instead of a separate one-size bank
let DUEL_BANKS = {};
try { DUEL_BANKS = JSON.parse(fs.readFileSync(path.join(COOP_DIR, 'duel-bank-by-grade.json'), 'utf8')) || {}; } catch (e) { DUEL_BANKS = {}; }
function duelPoolFor(grade) {
  const g = Math.max(6, Math.min(12, Number(grade) || 8));
  const bank = DUEL_BANKS[String(g)];
  return (Array.isArray(bank) && bank.length) ? bank : DUEL_BANK;   // legacy bank only as a fallback
}
try {
  DUEL_BANK = JSON.parse(fs.readFileSync(path.join(COOP_DIR, 'duel-bank.json'), 'utf8'));
  if (!Array.isArray(DUEL_BANK)) DUEL_BANK = [];
} catch (e) { DUEL_BANK = []; }
if (!DUEL_BANK.length) {
  // minimal fallback so duels still work if the bank file is missing
  DUEL_BANK = [
    { title:'Trade', body:'Two towns each make something the other wants. What should your town do?',
      choices:['Let them trade freely, no border tax.','Add a small fee on imports.','Ban the imports to protect local makers.','Have the town buy everything itself.'], best:0 },
    { title:'Business', body:'You want more new businesses to open. What helps most?',
      choices:['Cut the red tape so it is easy to start one.','Add more permits and inspections first.','Have the town run the businesses.','Pick a few founders to receive grants.'], best:0 }
  ];
}
function randToken() { return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10); }
// a room's teacher actions are authorized only if the room has a teacherKey AND the caller presents it.
// rooms with no teacherKey (the open MAIN world) stay open, matching the legacy anonymous behavior.
function teacherOK(r, d) { return !r || !r.teacherKey || !!(d && d.key && String(d.key) === r.teacherKey); }

function normCode(c) {
  c = String(c == null ? '' : c).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return c || DEFAULT_ROOM;
}
function getRoom(code, create) {
  code = normCode(code);
  let r = rooms.get(code);
  if (!r && (create || code === DEFAULT_ROOM)) {
    r = { name: code === DEFAULT_ROOM ? 'Class World' : ('Class ' + code), players: new Map() };
    rooms.set(code, r);
  }
  return r;
}
function newCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  } while (rooms.has(code));
  return code;
}
function pruneRoom(r) {
  const now = Date.now();
  for (const [id, p] of r.players) if (now - p.lastSeen > STALE_MS) r.players.delete(id);
}
function pruneAll() {
  const now = Date.now();
  for (const [code, r] of rooms) {
    pruneRoom(r);
    // forget empty, idle, non-default rooms so memory never grows unbounded
    if (code !== DEFAULT_ROOM && r.players.size === 0 && (now - (r.touched || 0) > 60000)) rooms.delete(code);
  }
  pruneDuels();
  pruneAuthFails();
}
function publicList(r) {
  pruneRoom(r);
  const now = Date.now();
  return [...r.players.values()].map(p => ({
    id: p.id, name: p.name, avatar: p.avatar,
    stats: p.stats, house: p.house, houseName: p.houseName,
    vanity: p.vanity, vanityTotal: p.vanityTotal, stars: p.stars,
    duelWins: p.duelWins, duelLosses: p.duelLosses, duelStarsWon: p.duelStarsWon,
    score: p.score, grade: p.grade, term: p.term,
    lifetimeGrade: p.lifetimeGrade, termGrades: p.termGrades,
    started: p.started, inTown: p.inTown,
    pos: p.pos, idleMs: now - p.lastSeen
  }));
}

// ── TEACHER QUESTIONS: a teacher posts a question to a room; students answer for stars ──
// room.tq = { id, style:'mc'|'short', text, choices[], correct, reward, responses{id:{name,answer,correct,decided,awarded}} }
const TQ_REWARD = 250;
function newTqId(){ return 't_' + Math.random().toString(36).slice(2, 9); }
function tqStudentView(tq, sid){
  if (!tq) return null;
  const mine = tq.responses[sid] || null;
  // grant the reward ONCE: report the pre-mark credited state, then mark it so reloads cannot re-claim stars
  let wasCredited = false;
  if (mine) { wasCredited = !!mine.credited; if (mine.awarded && !mine.credited) mine.credited = true; }
  return { id: tq.id, style: tq.style, text: tq.text, choices: tq.choices, reward: tq.reward, // note: `correct` is NOT sent to students
    answered: !!mine,
    mine: mine ? { answer: mine.answer, decided: mine.decided, awarded: mine.awarded, correct: mine.correct, credited: wasCredited } : null };
}
function tqDashView(tq){
  if (!tq) return null;
  const resp = Object.keys(tq.responses).map(function(k){ const x = tq.responses[k];
    return { id: k, name: x.name, answer: x.answer, correct: x.correct, decided: x.decided, awarded: x.awarded }; });
  return { id: tq.id, style: tq.style, text: tq.text, choices: tq.choices, correct: tq.correct, reward: tq.reward, responses: resp };
}

// ── 1v1 DUELS: wager stars, answer the same questions, most-correct wins ──
// duels: duelId -> { id, room, from, to, wager, n, questions[], status,
//                    answers{id:{letters,done}}, result, created, touched }
const duels = new Map();
const DUEL_PENDING_MS = 35000;   // a challenge expires if not answered in time
const DUEL_DONE_MS    = 60000;   // a finished duel lingers this long so both clients see the result (60s covers a reload during settling so the winner still gets the star delta)

// build N duel questions from the server bank: copy, shuffle choices, letter them, and record the
// correct LETTER as the key (identical, unknown-in-advance questions for both players)
function pickDuelQuestions(n, grade) {
  const LET = ['A','B','C','D','E','F'];
  const pool = duelPoolFor(grade).slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  return pool.slice(0, n).map(function (q) {
    const idx = q.choices.map(function (_, i) { return i; });
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    let best = 'A';
    const choices = idx.map(function (srcI, k) { if (srcI === q.best) best = LET[k]; return { letter: LET[k], label: String(q.choices[srcI]).slice(0, 200) }; });
    return { title: String(q.title || 'Policy Question').slice(0, 60), body: String(q.body).slice(0, 400), choices: choices, best: best };
  });
}
function newDuelId() {
  let id;
  do { id = 'd_' + Math.random().toString(36).slice(2, 9); } while (duels.has(id));
  return id;
}
// the duel (if any) this player is currently involved in, within their room
function duelForPlayer(room, id) {
  room = normCode(room);
  for (const d of duels.values()) {
    if (d.room !== room) continue;
    if (d.from.id === id || d.to.id === id) return d;
  }
  return null;
}
function scoreDuel(d) {
  function count(id) {
    const a = d.answers[id]; if (!a || !a.letters) return 0;
    let c = 0;
    for (let i = 0; i < d.questions.length; i++) {
      if (a.letters[i] && a.letters[i] === d.questions[i].best) c++;
    }
    return c;
  }
  const fc = count(d.from.id), tc = count(d.to.id);
  let winnerId = null, tie = false;
  if (fc > tc) winnerId = d.from.id;
  else if (tc > fc) winnerId = d.to.id;
  else tie = true;
  // authoritative star delta per player, so the client never has to guess (prevents desync on disconnect)
  const delta = {};
  if (tie) { delta[d.from.id] = 0; delta[d.to.id] = 0; }
  else { const loserId = (winnerId === d.from.id) ? d.to.id : d.from.id; delta[winnerId] = d.wager; delta[loserId] = -d.wager; }
  d.result = { fromId: d.from.id, toId: d.to.id, fromCorrect: fc, toCorrect: tc, winnerId, tie, wager: d.wager, delta };
  d.status = 'done';
  d.touched = Date.now();
}
// client-facing view (strips the `best` answer so it can't be read off the wire)
function duelView(d, viewerId) {
  return {
    id: d.id, status: d.status, wager: d.wager, n: d.n,
    from: d.from, to: d.to,
    youAre: d.from.id === viewerId ? 'from' : (d.to.id === viewerId ? 'to' : null),
    questions: (d.status === 'active') ? d.questions.map(q => ({ title: q.title, body: q.body, choices: q.choices })) : null,
    youDone: !!(d.answers[viewerId] && d.answers[viewerId].done),
    oppDone: (function () { const o = d.from.id === viewerId ? d.to.id : d.from.id; return !!(d.answers[o] && d.answers[o].done); })(),
    result: d.result || null
  };
}
function pruneDuels() {
  const now = Date.now();
  for (const [id, d] of duels) {
    if (d.status === 'pending' && now - d.created > DUEL_PENDING_MS) duels.delete(id);
    else if (d.status === 'done' && now - d.touched > DUEL_DONE_MS) duels.delete(id);
    else if ((d.status === 'declined' || d.status === 'cancelled') && now - d.touched > 8000) duels.delete(id);
    else if (d.status === 'active' && now - d.touched > 90000) duels.delete(id); // opponent vanished mid-duel: void it so the survivor is freed (no stars have moved yet)
  }
}

// ── tiny helpers ──────────────────────────────────────────────────
function send(res, code, type, body, extraHeaders) {
  const h = Object.assign({ 'Content-Type': type, 'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    // baseline hardening headers (safe for this inline-heavy game; no CSP so inline SVG/scripts keep working)
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'no-referrer' }, extraHeaders || {});
  res.writeHead(code, h);
  res.end(body);
}
function sendFile(res, file, type) {
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'text/plain', 'Not found: ' + path.basename(file));
    send(res, 200, type, data);
  });
}
function readBody(req) {
  return new Promise((resolve) => {
    let b = '', done = false;
    const fin = () => { if (!done) { done = true; resolve(b); } };
    req.on('data', c => { b += c; if (b.length > 1e6) { b = ''; try { req.destroy(); } catch (e) {} fin(); } });
    req.on('end', fin);
    req.on('close', fin);       // client aborted / socket closed: settle so the handler never hangs
    req.on('error', fin);
  });
}

// ── inject the co-op client into the served game ──────────────────
function injectedGame() {
  const file = findGameFile();
  if (!file) return null;
  let html = fs.readFileSync(file, 'utf8');
  const tag =
    '\n<!-- co-op injected -->\n' +
    '<script>window.COOP={world:"Class World"};</script>\n' +
    '<script src="/__coop/client.js"></script>\n';
  if (html.includes('</body>')) html = html.replace('</body>', tag + '</body>');
  else html += tag;
  return html;
}

// ── server ────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;

  if (req.method === 'OPTIONS') return send(res, 204, 'text/plain', '');

  // student game
  if (p === '/' || p === '/play' || p === '/index.html') {
    const html = injectedGame();
    if (!html) return send(res, 500, 'text/plain',
      'Could not find the game file (FreedomFounder*.html) in the project folder.');
    return send(res, 200, 'text/html; charset=utf-8', html);
  }

  // teacher dashboard
  if (p === '/host' || p === '/teacher' || p === '/dashboard') {
    return sendFile(res, path.join(COOP_DIR, 'dashboard.html'), 'text/html; charset=utf-8');
  }

  // join / QR projector page
  if (p === '/join') {
    // the same-wifi QR join screen is retired: students join with the class code inside the game
    res.writeHead(302, { Location: '/' }); return res.end();
  }

  // privacy notice
  if (p === '/privacy' || p === '/privacy.html') {
    return sendFile(res, path.join(COOP_DIR, 'privacy.html'), 'text/html; charset=utf-8');
  }

  // how-to-play tutorial videos (student video on the title screen, teacher video on the dashboard)
  if (p === '/howto-student.mp4') return sendFile(res, path.join(ROOT, 'howto-student.mp4'), 'video/mp4');
  if (p === '/howto-teacher.mp4') return sendFile(res, path.join(ROOT, 'howto-teacher.mp4'), 'video/mp4');

  // injected client script
  if (p === '/__coop/client.js') {
    return sendFile(res, path.join(COOP_DIR, 'coop-client.js'), 'application/javascript; charset=utf-8');
  }

  // teacher creates a private class → returns a fresh join code
  if (p === '/__coop/create' && req.method === 'POST') {
    const raw = await readBody(req);
    let name = '';
    try { const d = JSON.parse(raw); if (d && typeof d.name === 'string') name = d.name.slice(0, 40); } catch (e) {}
    const code = newCode();
    const teacherKey = randToken();
    const r = { name: name || ('Class ' + code), players: new Map(), touched: Date.now(), teacherKey: teacherKey };
    rooms.set(code, r);
    // the key is returned ONLY here (to the creator) and is required for this room's teacher actions
    return send(res, 200, 'application/json', JSON.stringify({ ok: true, code: code, world: r.name, key: teacherKey }));
  }

  // ── ACCOUNTS: name + PIN sign-in with durable auto-save (Upstash) ──
  // sign in (or create): {name, pin} → {ok, isNew, data}
  if (p === '/__coop/account/signin' && req.method === 'POST') {
    const raw = await readBody(req);
    let d; try { d = JSON.parse(raw); } catch (e) { return send(res, 400, 'application/json', '{"ok":false,"error":"bad_json"}'); }
    const name = String((d && d.name) || '').trim(), pin = String((d && d.pin) || '');
    if (name.length < 2 || name.length > 24 || !/^\d{4,6}$/.test(pin)) return send(res, 200, 'application/json', '{"ok":false,"error":"invalid"}');
    if (!STORE_ON) return send(res, 200, 'application/json', '{"ok":false,"error":"storage_off"}');
    const tkey = throttleKey(req, name);
    if (authBlocked(tkey)) return send(res, 429, 'application/json', '{"ok":false,"error":"too_many_attempts"}');
    try {
      const key = acctKey(name), want = pinHash(name, pin), cur = await redis(['GET', key]);
      if (!cur) { const rec = { pin: want, display: name, data: null, created: Date.now(), updated: Date.now() };
        await redis(['SET', key, JSON.stringify(rec), 'EX', String(ACCT_TTL_S)]);
        noteAuthOk(tkey);
        return send(res, 200, 'application/json', '{"ok":true,"isNew":true,"data":null}'); }
      let rec = null; try { rec = JSON.parse(cur); } catch (e) {}
      if (!rec) return send(res, 200, 'application/json', '{"ok":false,"error":"corrupt"}');
      if (!pinMatch(rec.pin, want)) { noteAuthFail(tkey); return send(res, 200, 'application/json', '{"ok":false,"error":"wrong_pin"}'); }
      noteAuthOk(tkey);
      return send(res, 200, 'application/json', JSON.stringify({ ok: true, isNew: false, data: rec.data || null }));
    } catch (e) { return send(res, 200, 'application/json', '{"ok":false,"error":"store_error"}'); }
  }
  // auto-save: {name, pin, data} → {ok}
  if (p === '/__coop/account/save' && req.method === 'POST') {
    const raw = await readBody(req);
    let d; try { d = JSON.parse(raw); } catch (e) { return send(res, 400, 'application/json', '{"ok":false,"error":"bad_json"}'); }
    const name = String((d && d.name) || '').trim(), pin = String((d && d.pin) || '');
    if (!STORE_ON) return send(res, 200, 'application/json', '{"ok":false,"error":"storage_off"}');
    if (name.length < 2 || !/^\d{4,6}$/.test(pin)) return send(res, 200, 'application/json', '{"ok":false,"error":"invalid"}');
    const tkeyS = throttleKey(req, name);
    if (authBlocked(tkeyS)) return send(res, 429, 'application/json', '{"ok":false,"error":"too_many_attempts"}');
    try {
      const key = acctKey(name), want = pinHash(name, pin), cur = await redis(['GET', key]);
      let rec = null; try { rec = cur ? JSON.parse(cur) : null; } catch (e) {}
      if (!rec || !pinMatch(rec.pin, want)) { noteAuthFail(tkeyS); return send(res, 200, 'application/json', '{"ok":false,"error":"auth"}'); }
      rec.data = d.data || null; rec.updated = Date.now();
      await redis(['SET', key, JSON.stringify(rec), 'EX', String(ACCT_TTL_S)]);
      return send(res, 200, 'application/json', '{"ok":true}');
    } catch (e) { return send(res, 200, 'application/json', '{"ok":false,"error":"store_error"}'); }
  }

  // student posts its state, gets back the other players IN THE SAME ROOM
  if (p === '/__coop/sync' && req.method === 'POST') {
    const raw = await readBody(req);
    let d; try { d = JSON.parse(raw); } catch (e) { return send(res, 400, 'application/json', '{"error":"bad json"}'); }
    if (!d || !d.id) return send(res, 400, 'application/json', '{"error":"no id"}');
    const r = getRoom(d.room, true);
    r.touched = Date.now();
    d.lastSeen = Date.now();
    r.players.set(d.id, d);
    pruneRoom(r);
    const others = [...r.players.values()]
      .filter(o => o.id !== d.id && o.inTown)
      .map(o => ({ id: o.id, name: o.name, avatar: o.avatar, pos: o.pos,
                   stats: o.stats, house: o.house, emote: o.emote, emoteAt: o.emoteAt }));
    pruneDuels();
    const myDuel = duelForPlayer(d.room, d.id);
    return send(res, 200, 'application/json', JSON.stringify({ now: Date.now(), world: r.name, room: normCode(d.room),
      players: others, duel: myDuel ? duelView(myDuel, d.id) : null, tq: tqStudentView(r.tq, d.id) }));
  }

  // ── duel: a player challenges another (challenger supplies the questions, with answers) ──
  if (p === '/__coop/duel/challenge' && req.method === 'POST') {
    const raw = await readBody(req);
    let d; try { d = JSON.parse(raw); } catch (e) { return send(res, 400, 'application/json', '{"error":"bad json"}'); }
    if (!d || !d.from || !d.to || !d.from.id || !d.to.id) return send(res, 400, 'application/json', '{"ok":false,"error":"missing players"}');
    const room = normCode(d.room);
    if (duelForPlayer(room, d.from.id)) return send(res, 200, 'application/json', '{"ok":false,"error":"You are already in a duel."}');
    if (duelForPlayer(room, d.to.id))   return send(res, 200, 'application/json', '{"ok":false,"error":"That player is already in a duel."}');
    const rChal = getRoom(room, false); const tgt = rChal && rChal.players.get(String(d.to.id));
    if (!tgt || (Date.now() - (tgt.lastSeen || 0) > STALE_MS)) return send(res, 200, 'application/json', '{"ok":false,"error":"That player just left the town."}'); // do not strand the challenger on an absent opponent
    // SERVER-AUTHORITATIVE questions: pick from the bank and build the answer key here so a
    // crafted client can't supply questions whose "best" matches what it will answer.
    const want = Math.max(1, Math.min(5, Number(d.n) || 3));
    // both duelists see the same questions, drawn at the more accessible of their two reading levels
    const chal = rChal && rChal.players.get(String(d.from.id));
    const gFrom = Number(chal && chal.gradeLevel) || 8, gTo = Number(tgt && tgt.gradeLevel) || 8;
    const qs = pickDuelQuestions(want, Math.min(gFrom, gTo));
    if (qs.length < 1) return send(res, 200, 'application/json', '{"ok":false,"error":"no questions"}');
    const wager = Math.max(0, Math.min(100000, Number(d.wager) || 0));
    const duel = {
      id: newDuelId(), room,
      from: { id: String(d.from.id), name: String(d.from.name || 'Challenger').slice(0, 24) },
      to:   { id: String(d.to.id),   name: String(d.to.name   || 'Opponent').slice(0, 24) },
      wager, n: qs.length, questions: qs,
      status: 'pending', answers: {}, result: null,
      created: Date.now(), touched: Date.now()
    };
    duels.set(duel.id, duel);
    return send(res, 200, 'application/json', JSON.stringify({ ok: true, duel: duelView(duel, duel.from.id) }));
  }

  // ── duel: the challenged player accepts or declines ──
  if (p === '/__coop/duel/respond' && req.method === 'POST') {
    const raw = await readBody(req);
    let d; try { d = JSON.parse(raw); } catch (e) { return send(res, 400, 'application/json', '{"error":"bad json"}'); }
    const duel = duels.get(d && d.duelId);
    if (!duel) return send(res, 200, 'application/json', '{"ok":false,"error":"Duel not found."}');
    if (duel.to.id !== d.id) return send(res, 200, 'application/json', '{"ok":false,"error":"not your invite"}');
    if (duel.status !== 'pending') return send(res, 200, 'application/json', JSON.stringify({ ok: true, duel: duelView(duel, d.id) }));
    if (d.accept) { duel.status = 'active'; duel.startedAt = Date.now(); }
    else { duel.status = 'declined'; }
    duel.touched = Date.now();
    return send(res, 200, 'application/json', JSON.stringify({ ok: true, duel: duelView(duel, d.id) }));
  }

  // ── duel: a player submits all their answers; when both are in, it settles ──
  if (p === '/__coop/duel/answer' && req.method === 'POST') {
    const raw = await readBody(req);
    let d; try { d = JSON.parse(raw); } catch (e) { return send(res, 400, 'application/json', '{"error":"bad json"}'); }
    const duel = duels.get(d && d.duelId);
    if (!duel) return send(res, 200, 'application/json', '{"ok":false,"error":"Duel not found."}');
    if (duel.from.id !== d.id && duel.to.id !== d.id) return send(res, 200, 'application/json', '{"ok":false,"error":"not in this duel"}');
    if (duel.status === 'active') {
      duel.answers[d.id] = { letters: Array.isArray(d.letters) ? d.letters.slice(0, duel.n) : [], done: true };
      duel.touched = Date.now();
      const bothDone = duel.answers[duel.from.id] && duel.answers[duel.from.id].done &&
                       duel.answers[duel.to.id] && duel.answers[duel.to.id].done;
      if (bothDone) scoreDuel(duel);
    }
    return send(res, 200, 'application/json', JSON.stringify({ ok: true, duel: duelView(duel, d.id) }));
  }

  // ── duel: cancel a pending challenge you sent (or leave) ──
  if (p === '/__coop/duel/cancel' && req.method === 'POST') {
    const raw = await readBody(req);
    try { const d = JSON.parse(raw); const duel = duels.get(d && d.duelId);
      if (duel && (duel.from.id === d.id || duel.to.id === d.id) && (duel.status === 'pending' || duel.status === 'active')) { duel.status = 'cancelled'; duel.touched = Date.now(); } // allow leaving an active duel too (no stars have moved before it is 'done')
    } catch (e) {}
    return send(res, 200, 'application/json', '{"ok":true}');
  }

  // dashboard polls full state for one room (?room=CODE; defaults to MAIN)
  if (p === '/__coop/state') {
    pruneAll();
    const r = getRoom(u.searchParams.get('room'), true);
    r.touched = Date.now();
    return send(res, 200, 'application/json',
      JSON.stringify({ now: Date.now(), world: r.name, room: normCode(u.searchParams.get('room')), count: r.players.size, players: publicList(r), tq: tqDashView(r.tq) }));
  }

  // rename a room's world from the dashboard
  if (p === '/__coop/world' && req.method === 'POST') {
    const raw = await readBody(req);
    try { const d = JSON.parse(raw); const r = getRoom(d && d.room, true);
      if (!teacherOK(r, d)) return send(res, 403, 'application/json', '{"ok":false,"error":"not authorized"}');
      if (d && typeof d.world === 'string') r.name = d.world.slice(0, 40) || r.name;
      return send(res, 200, 'application/json', JSON.stringify({ ok: true, world: r.name })); } catch (e) {}
    return send(res, 200, 'application/json', JSON.stringify({ ok: false }));
  }

  // remove a player (clean leave / kick)
  if (p === '/__coop/kick' && req.method === 'POST') {
    const raw = await readBody(req);
    try { const d = JSON.parse(raw); if (d && d.id) { const r = getRoom(d.room, false);
      // the student leave-beacon (own id) is fine; removing anyone from a keyed class room needs the teacher key
      if (r && teacherOK(r, d)) r.players.delete(d.id); } } catch (e) {}
    return send(res, 200, 'application/json', '{"ok":true}');
  }

  // ── teacher posts a class question (replaces any current one) ──
  if (p === '/__coop/tq/create' && req.method === 'POST') {
    const raw = await readBody(req);
    let d; try { d = JSON.parse(raw); } catch (e) { return send(res, 400, 'application/json', '{"error":"bad json"}'); }
    const r = getRoom(d && d.room, true);
    if (!teacherOK(r, d)) return send(res, 403, 'application/json', '{"ok":false,"error":"not authorized"}');
    const style = (d && d.style === 'short') ? 'short' : 'mc';
    const text = String((d && d.text) || '').slice(0, 300);
    if (!text) return send(res, 200, 'application/json', '{"ok":false,"error":"Question text is required."}');
    let choices = [], correct = 0;
    if (style === 'mc') {
      choices = (Array.isArray(d.choices) ? d.choices : []).map(function (c) { return String(c == null ? '' : c).slice(0, 120); }).filter(function (c) { return c.length; }).slice(0, 4);
      if (choices.length < 2) return send(res, 200, 'application/json', '{"ok":false,"error":"Add at least 2 answer choices."}');
      correct = Math.max(0, Math.min(choices.length - 1, Number(d.correct) || 0));
    }
    r.tq = { id: newTqId(), style: style, text: text, choices: choices, correct: correct, reward: TQ_REWARD, responses: {}, created: Date.now() };
    return send(res, 200, 'application/json', JSON.stringify({ ok: true, tq: tqDashView(r.tq) }));
  }

  // ── student answers the class question (once) ──
  if (p === '/__coop/tq/answer' && req.method === 'POST') {
    const raw = await readBody(req);
    let d; try { d = JSON.parse(raw); } catch (e) { return send(res, 400, 'application/json', '{"error":"bad json"}'); }
    const r = getRoom(d && d.room, false);
    if (!r || !r.tq || !d || !d.id) return send(res, 200, 'application/json', '{"ok":false,"error":"No active question."}');
    const tq = r.tq;
    if (tq.responses[d.id]) return send(res, 200, 'application/json', JSON.stringify({ ok: true, already: true, mine: tqStudentView(tq, d.id).mine, reward: tq.reward }));
    let resp;
    if (tq.style === 'mc') {
      const ai = Number(d.answer);
      const correct = (ai === tq.correct);
      resp = { name: String(d.name || '').slice(0, 24), answer: ai, correct: correct, decided: true, awarded: correct, at: Date.now() };
    } else {
      resp = { name: String(d.name || '').slice(0, 24), answer: String(d.answer || '').slice(0, 300), correct: null, decided: false, awarded: false, at: Date.now() };
    }
    tq.responses[d.id] = resp;
    return send(res, 200, 'application/json', JSON.stringify({ ok: true, mine: { answer: resp.answer, decided: resp.decided, awarded: resp.awarded, correct: resp.correct }, reward: tq.reward }));
  }

  // ── teacher awards / denies a (short-answer) response ──
  if (p === '/__coop/tq/decide' && req.method === 'POST') {
    const raw = await readBody(req);
    try { const d = JSON.parse(raw); const r = getRoom(d && d.room, false);
      if (!teacherOK(r, d)) return send(res, 403, 'application/json', '{"ok":false,"error":"not authorized"}');
      if (r && r.tq && r.tq.responses[d.id]) { r.tq.responses[d.id].awarded = !!d.award; r.tq.responses[d.id].decided = true; }
    } catch (e) {}
    return send(res, 200, 'application/json', '{"ok":true}');
  }

  // ── teacher ends the class question ──
  if (p === '/__coop/tq/end' && req.method === 'POST') {
    const raw = await readBody(req);
    try { const d = JSON.parse(raw); const r = getRoom(d && d.room, false);
      if (!teacherOK(r, d)) return send(res, 403, 'application/json', '{"ok":false,"error":"not authorized"}');
      if (r) r.tq = null; } catch (e) {}
    return send(res, 200, 'application/json', '{"ok":true}');
  }

  if (p === '/__coop/ping') return send(res, 200, 'application/json', '{"ok":true}');

  send(res, 404, 'text/plain', 'Not found');
});

// periodic reaper so rooms / stale duels / auth records are bounded even with no dashboard open
const PRUNE_TIMER = setInterval(pruneAll, 30000);
if (PRUNE_TIMER.unref) PRUNE_TIMER.unref();

// ── start ─────────────────────────────────────────────────────────
function start(port, attemptsLeft) {
  server.once('error', (err) => {
    if (!IS_CLOUD && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      start(port + 1, attemptsLeft - 1);
    } else {
      console.error('Could not start server:', err.message);
      process.exit(1);
    }
  });
  server.listen(port, '0.0.0.0', () => banner(port));
}

function openBrowser(url) {
  const plat = process.platform;
  const cmd = plat === 'win32' ? `start "" "${url}"`
            : plat === 'darwin' ? `open "${url}"`
            : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function banner(port) {
  const game = findGameFile();
  const line = '═'.repeat(58);

  if (IS_CLOUD) {
    console.log('\n' + line);
    console.log('   FREEDOM FOUNDER, CO-OP SERVER (cloud) LIVE');
    console.log(line);
    console.log('   Game file: ' + (game ? path.basename(game) : 'NOT FOUND'));
    console.log('   Listening on port ' + port);
    console.log('   Open your service URL, then add:');
    console.log('     /        -> students (enter the class code)');
    console.log('     /host    -> teacher: Start a Class to get a code');
      console.log(line + '\n');
    return;
  }

  const ip = lanIP();
  const base = 'http://' + ip + ':' + port;
  console.log('\n' + line);
  console.log('   FREEDOM FOUNDER, CO-OP HOST IS RUNNING');
  console.log(line);
  console.log('   Game file:   ' + (game ? path.basename(game) : 'NOT FOUND'));
  console.log('');
  console.log('   TEACHER  (Start a Class, get a join code):');
  console.log('        ' + base + '/host');
  console.log('');
  console.log('   STUDENTS (open this, then enter the code):');
  console.log('        ' + base);
  console.log('');
  console.log('   PROJECT THIS so students can join:');
  console.log(line);
  console.log('   Keep this window open. Close it to end the session.');
  console.log(line + '\n');
  openBrowser(base + '/host');
}

start(IS_CLOUD ? ENV_PORT : START_PORT, 12);
// security hardening: PIN brute-force throttle, constant-time PIN compare, baseline response headers (added July 2026 audit)
