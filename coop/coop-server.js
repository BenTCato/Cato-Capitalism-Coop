/* ──────────────────────────────────────────────────────────────
   Cato Capitalism Game — Co-op / Classroom Host Server
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
const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { exec } = require('child_process');

const ROOT       = path.join(__dirname, '..');     // project folder (holds the game html)
const COOP_DIR   = __dirname;                       // this /coop folder
const START_PORT = 3000;
const STALE_MS   = 8000;                            // drop a player after 8s of silence
const ENV_PORT   = process.env.PORT ? Number(process.env.PORT) : null;
const IS_CLOUD   = ENV_PORT !== null;

// ── choose which game file to serve ───────────────────────────────
function gameScore(f) {
  const m = f.match(/_v(\d+)/i);
  if (m) return 1000 + Number(m[1]);
  if (/final/i.test(f)) return 100;
  return 1;
}
function findGameFile() {
  const all = fs.readdirSync(ROOT).filter(f => /^CatoCapitalismGame.*\.html$/i.test(f));
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
  return { id: tq.id, style: tq.style, text: tq.text, choices: tq.choices, reward: tq.reward, // note: `correct` is NOT sent to students
    answered: !!mine,
    mine: mine ? { answer: mine.answer, decided: mine.decided, awarded: mine.awarded, correct: mine.correct } : null };
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
const DUEL_DONE_MS    = 20000;   // a finished duel lingers this long so both clients see the result

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
  d.result = { fromId: d.from.id, toId: d.to.id, fromCorrect: fc, toCorrect: tc, winnerId, tie, wager: d.wager };
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
  }
}

// ── tiny helpers ──────────────────────────────────────────────────
function send(res, code, type, body, extraHeaders) {
  const h = Object.assign({ 'Content-Type': type, 'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*' }, extraHeaders || {});
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
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(b));
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
      'Could not find the game file (CatoCapitalismGame*.html) in the project folder.');
    return send(res, 200, 'text/html; charset=utf-8', html);
  }

  // teacher dashboard
  if (p === '/host' || p === '/teacher' || p === '/dashboard') {
    return sendFile(res, path.join(COOP_DIR, 'dashboard.html'), 'text/html; charset=utf-8');
  }

  // join / QR projector page
  if (p === '/join') {
    return sendFile(res, path.join(COOP_DIR, 'join.html'), 'text/html; charset=utf-8');
  }

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
    const r = { name: name || ('Class ' + code), players: new Map(), touched: Date.now() };
    rooms.set(code, r);
    return send(res, 200, 'application/json', JSON.stringify({ ok: true, code: code, world: r.name }));
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
    const qs = Array.isArray(d.questions) ? d.questions.filter(q => q && q.body && Array.isArray(q.choices) && q.best).slice(0, 5) : [];
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
      if (duel && (duel.from.id === d.id || duel.to.id === d.id) && duel.status === 'pending') { duel.status = 'cancelled'; duel.touched = Date.now(); }
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
      if (d && typeof d.world === 'string') r.name = d.world.slice(0, 40) || r.name;
      return send(res, 200, 'application/json', JSON.stringify({ ok: true, world: r.name })); } catch (e) {}
    return send(res, 200, 'application/json', JSON.stringify({ ok: false }));
  }

  // remove a player (clean leave / kick)
  if (p === '/__coop/kick' && req.method === 'POST') {
    const raw = await readBody(req);
    try { const d = JSON.parse(raw); if (d && d.id) { const r = getRoom(d.room, false); if (r) r.players.delete(d.id); } } catch (e) {}
    return send(res, 200, 'application/json', '{"ok":true}');
  }

  // ── teacher posts a class question (replaces any current one) ──
  if (p === '/__coop/tq/create' && req.method === 'POST') {
    const raw = await readBody(req);
    let d; try { d = JSON.parse(raw); } catch (e) { return send(res, 400, 'application/json', '{"error":"bad json"}'); }
    const r = getRoom(d && d.room, true);
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
      if (r && r.tq && r.tq.responses[d.id]) { r.tq.responses[d.id].awarded = !!d.award; r.tq.responses[d.id].decided = true; }
    } catch (e) {}
    return send(res, 200, 'application/json', '{"ok":true}');
  }

  // ── teacher ends the class question ──
  if (p === '/__coop/tq/end' && req.method === 'POST') {
    const raw = await readBody(req);
    try { const d = JSON.parse(raw); const r = getRoom(d && d.room, false); if (r) r.tq = null; } catch (e) {}
    return send(res, 200, 'application/json', '{"ok":true}');
  }

  if (p === '/__coop/ping') return send(res, 200, 'application/json', '{"ok":true}');

  send(res, 404, 'text/plain', 'Not found');
});

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
    console.log('   CATO CAPITALISM GAME — CO-OP SERVER (cloud) LIVE');
    console.log(line);
    console.log('   Game file: ' + (game ? path.basename(game) : 'NOT FOUND'));
    console.log('   Listening on port ' + port);
    console.log('   Open your service URL, then add:');
    console.log('     /        -> students (enter the class code)');
    console.log('     /host    -> teacher: Start a Class to get a code');
    console.log('     /join    -> QR + join screen');
    console.log(line + '\n');
    return;
  }

  const ip = lanIP();
  const base = 'http://' + ip + ':' + port;
  console.log('\n' + line);
  console.log('   CATO CAPITALISM GAME — CO-OP HOST IS RUNNING');
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
  console.log('        ' + base + '/join');
  console.log(line);
  console.log('   Keep this window open. Close it to end the session.');
  console.log(line + '\n');
  openBrowser(base + '/host');
}

start(IS_CLOUD ? ENV_PORT : START_PORT, 12);
