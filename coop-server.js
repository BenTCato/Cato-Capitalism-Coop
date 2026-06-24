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
}
function publicList(r) {
  pruneRoom(r);
  const now = Date.now();
  return [...r.players.values()].map(p => ({
    id: p.id, name: p.name, avatar: p.avatar,
    stats: p.stats, house: p.house, houseName: p.houseName,
    vanity: p.vanity, vanityTotal: p.vanityTotal,
    score: p.score, grade: p.grade, term: p.term,
    lifetimeGrade: p.lifetimeGrade, termGrades: p.termGrades,
    started: p.started, inTown: p.inTown,
    pos: p.pos, idleMs: now - p.lastSeen
  }));
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
    return send(res, 200, 'application/json', JSON.stringify({ now: Date.now(), world: r.name, room: normCode(d.room), players: others }));
  }

  // dashboard polls full state for one room (?room=CODE; defaults to MAIN)
  if (p === '/__coop/state') {
    pruneAll();
    const r = getRoom(u.searchParams.get('room'), true);
    r.touched = Date.now();
    return send(res, 200, 'application/json',
      JSON.stringify({ now: Date.now(), world: r.name, room: normCode(u.searchParams.get('room')), count: r.players.size, players: publicList(r) }));
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
