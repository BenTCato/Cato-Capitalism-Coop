/* ──────────────────────────────────────────────────────────────
   Cato Capitalism Game — Co-op / Classroom Host Server
   Zero dependencies. Pure Node.js (http + os + fs). No npm install.

   What it does:
   • Serves the game to every student (same wifi, or hosted online).
   • Each student plays their own city; their live stats stream here.
   • Teacher opens /host for a live leaderboard + grid of every city.
   • The town is a shared world: students see each other walking around.

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
// In the cloud (Render/Railway/etc.) the host assigns a port via PORT.
const ENV_PORT   = process.env.PORT ? Number(process.env.PORT) : null;
const IS_CLOUD   = ENV_PORT !== null;

// ── choose which game file to serve ───────────────────────────────
// Prefer the highest version (…_v4 > …_v3 > FINAL > unlabeled). Timestamps
// are NOT reliable after a git checkout (all files share one mtime), so we
// rank by the version in the filename. Override with the GAME_FILE env var.
function gameScore(f) {
  const m = f.match(/_v(\d+)/i);
  if (m) return 1000 + Number(m[1]);   // versioned wins, highest number first
  if (/final/i.test(f)) return 100;    // FINAL beats unlabeled
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

// ── pick a real LAN ip (192.168.x / 10.x / 172.x preferred) ───────
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

// ── in-memory player table ────────────────────────────────────────
// id -> { ...summary, lastSeen }
const players = new Map();

function prune() {
  const now = Date.now();
  for (const [id, p] of players) if (now - p.lastSeen > STALE_MS) players.delete(id);
}

function publicList() {
  prune();
  const now = Date.now();
  return [...players.values()].map(p => ({
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
function injectedGame(worldName) {
  const file = findGameFile();
  if (!file) return null;
  let html = fs.readFileSync(file, 'utf8');
  const tag =
    '\n<!-- co-op injected -->\n' +
    '<script>window.COOP={world:' + JSON.stringify(worldName) + '};</script>\n' +
    '<script src="/__coop/client.js"></script>\n';
  if (html.includes('</body>')) html = html.replace('</body>', tag + '</body>');
  else html += tag;
  return html;
}

// ── server ────────────────────────────────────────────────────────
let WORLD_NAME = 'Class World';

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;

  if (req.method === 'OPTIONS') return send(res, 204, 'text/plain', '');

  // student game
  if (p === '/' || p === '/play' || p === '/index.html') {
    const html = injectedGame(WORLD_NAME);
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

  // student posts its state, gets back the other town players
  if (p === '/__coop/sync' && req.method === 'POST') {
    const raw = await readBody(req);
    let d; try { d = JSON.parse(raw); } catch (e) { return send(res, 400, 'application/json', '{"error":"bad json"}'); }
    if (!d || !d.id) return send(res, 400, 'application/json', '{"error":"no id"}');
    d.lastSeen = Date.now();
    players.set(d.id, d);
    prune();
    const others = [...players.values()]
      .filter(o => o.id !== d.id && o.inTown)
      .map(o => ({ id: o.id, name: o.name, avatar: o.avatar, pos: o.pos,
                   stats: o.stats, house: o.house }));
    return send(res, 200, 'application/json', JSON.stringify({ now: Date.now(), world: WORLD_NAME, players: others }));
  }

  // dashboard polls full state
  if (p === '/__coop/state') {
    return send(res, 200, 'application/json',
      JSON.stringify({ now: Date.now(), world: WORLD_NAME, count: players.size, players: publicList() }));
  }

  // set the world name from the dashboard
  if (p === '/__coop/world' && req.method === 'POST') {
    const raw = await readBody(req);
    try { const d = JSON.parse(raw); if (d && typeof d.world === 'string') WORLD_NAME = d.world.slice(0, 40) || 'Class World'; } catch (e) {}
    return send(res, 200, 'application/json', JSON.stringify({ ok: true, world: WORLD_NAME }));
  }

  // remove a player (kick) — optional dashboard control / clean leave
  if (p === '/__coop/kick' && req.method === 'POST') {
    const raw = await readBody(req);
    try { const d = JSON.parse(raw); if (d && d.id) players.delete(d.id); } catch (e) {}
    return send(res, 200, 'application/json', '{"ok":true}');
  }

  if (p === '/__coop/ping') return send(res, 200, 'application/json', '{"ok":true}');

  send(res, 404, 'text/plain', 'Not found');
});

// ── start ─────────────────────────────────────────────────────────
// Cloud: bind exactly to the assigned PORT. Local: try 3000, then 3001…
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
    // Hosted online — the platform gives the public URL; no LAN ip, no browser.
    console.log('\n' + line);
    console.log('   CATO CAPITALISM GAME — CO-OP SERVER (cloud) LIVE');
    console.log(line);
    console.log('   Game file: ' + (game ? path.basename(game) : 'NOT FOUND'));
    console.log('   Listening on port ' + port);
    console.log('   Open your service URL, then add:');
    console.log('     /        -> students');
    console.log('     /host    -> teacher leaderboard');
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
  console.log('   TEACHER  (leaderboard + all cities):');
  console.log('        ' + base + '/host');
  console.log('');
  console.log('   STUDENTS (share this link / QR):');
  console.log('        ' + base);
  console.log('');
  console.log('   PROJECT THIS so students can join:');
  console.log('        ' + base + '/join');
  console.log(line);
  console.log('   Keep this window open. Close it to end the session.');
  console.log(line + '\n');
  // open the projector + dashboard for the host automatically
  openBrowser(base + '/join');
  setTimeout(() => openBrowser(base + '/host'), 700);
}

start(IS_CLOUD ? ENV_PORT : START_PORT, 12);
