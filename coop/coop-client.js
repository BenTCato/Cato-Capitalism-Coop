/* ──────────────────────────────────────────────────────────────
   Co-op client — injected into the game by coop-server.js
   • Streams this student's live state to the host every ~160ms.
   • Renders the OTHER students as avatars walking in the shared town.
   Runs in the game's global scope, so it can read player/avatar/S/P/etc.
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (!window.COOP) return;

  // stable per-browser id
  var ID;
  try {
    ID = localStorage.getItem('coopId');
    if (!ID) { ID = 'p_' + Math.random().toString(36).slice(2, 10); localStorage.setItem('coopId', ID); }
  } catch (e) { ID = 'p_' + Math.random().toString(36).slice(2, 10); }

  var SYNC_MS = 160;
  var remotes = {};      // id -> {data, rx, ry, tx, ty, dir, el, body, tag, seen}
  var onlineCount = 1;

  function g(name, dflt) { try { return eval(name); } catch (e) { return dflt; } }

  function townActive() {
    var t = document.getElementById('screen-town');
    return !!(t && t.classList.contains('active'));
  }

  function gatherState() {
    var S = g('S', null), P = g('P', null);
    var av = g('avatar', null);
    var pl = g('player', null);
    var started = !!(S && S.stats);
    var stats = started ? { h: Math.round(S.stats.h), e: Math.round(S.stats.e), ed: Math.round(S.stats.ed), f: Math.round(S.stats.f) }
                        : null;
    var grade = null;
    if (started) { try { grade = (g('computeGrade'))().letter; } catch (e) {} }
    var lifeGrade = null;
    try { var lg = g('lifetimeGrade'); if (lg) lifeGrade = lg().letter; } catch (e) {}
    var termGrades = {};
    try {
      if (P && Array.isArray(P.terms)) P.terms.forEach(function (t) { termGrades[t.term] = { grade: t.grade, score: t.score }; });
      if (started) termGrades[(S.term || 1)] = { grade: grade, score: (S.score || 0), live: true };
    } catch (e) {}
    var TIERS = g('HOUSE_TIERS', null);
    var house = P ? (P.house || 0) : 0;
    var houseName = (TIERS && TIERS[house]) ? TIERS[house].name : '';
    var STORE = g('STORE_ITEMS', null);
    return {
      id: ID,
      name: g('nationName', 'A Nation') || 'A Nation',
      avatar: av ? { skin: av.skin, hair: av.hair, hairColor: av.hairColor, beard: av.beard,
                     glasses: av.glasses, extra: av.extra, outfit: av.outfit } : null,
      stats: stats,
      score: ((P && P.lifetimeScore) || 0) + ((S && S.score) || 0),
      grade: grade,
      lifetimeGrade: lifeGrade,
      termGrades: termGrades,
      term: (S && S.term) || 1,
      house: house,
      houseName: houseName,
      vanity: P && P.owned ? P.owned.length : 0,
      vanityTotal: STORE ? STORE.length : 0,
      started: started,
      inTown: townActive(),
      pos: pl ? { x: Math.round(pl.x), y: Math.round(pl.y), dir: pl.dir, moving: !!pl.moving, step: pl.step || 0 } : null
    };
  }

  // ── network loop ──────────────────────────────────────────────
  function sync() {
    var body;
    try { body = JSON.stringify(gatherState()); } catch (e) { return; }
    fetch('/__coop/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.world) setBadge(d.world, (d.players ? d.players.length : 0) + 1);
        ingest(d && d.players ? d.players : []);
      })
      .catch(function () { setBadge(null, 0); });
  }
  setInterval(sync, SYNC_MS);

  // ── ingest other players ──────────────────────────────────────
  function ingest(list) {
    var now = Date.now();
    list.forEach(function (p) {
      if (!p.pos) return;
      var r = remotes[p.id];
      if (!r) { r = remotes[p.id] = { rx: p.pos.x, ry: p.pos.y, dir: p.pos.dir || 1 }; }
      r.data = p;
      r.tx = p.pos.x; r.ty = p.pos.y; r.dir = p.pos.dir || r.dir; r.seen = now;
      // teleport if jump is huge (e.g. just entered town)
      if (Math.abs(r.tx - r.rx) > 500 || Math.abs(r.ty - r.ry) > 500) { r.rx = r.tx; r.ry = r.ty; }
    });
    // drop players we haven't heard about in a while
    for (var id in remotes) if (now - (remotes[id].seen || 0) > 5000) removeRemote(id);
  }

  function removeRemote(id) {
    var r = remotes[id];
    if (r && r.el && r.el.parentNode) r.el.parentNode.removeChild(r.el);
    delete remotes[id];
  }

  // ── build a remote avatar SVG (reuses the game's own art fns) ──
  function avgHealth(s) { return s ? Math.round((s.h + s.e + s.ed + s.f) / 4) : 0; }
  function healthColor(v) { return v <= 25 ? '#E03131' : v <= 50 ? '#F2762E' : v <= 70 ? '#F2B23E' : '#2EB872'; }

  function bodySVG(p) {
    var SKIN = g('SKIN', null), SPRITE = g('SPRITE', null);
    var worldOutfit = g('worldOutfit'), worldHead = g('worldHead');
    if (!SKIN || !SPRITE || !worldOutfit || !worldHead || !p.avatar) return '';
    var av = p.avatar;
    var skin = (SKIN[av.skin] || SKIN[0]).c;
    var pant = SPRITE.pants[av.outfit] || '#3B4252';
    var s = '';
    s += '<rect x="-8.5" y="18" width="7" height="13" rx="3" fill="' + pant + '"/>';
    s += '<rect x="1.5" y="18" width="7" height="13" rx="3" fill="' + pant + '"/>';
    s += '<rect x="-9.5" y="28" width="9" height="6" rx="3" fill="' + SPRITE.shoes + '"/>';
    s += '<rect x="0.5" y="28" width="9" height="6" rx="3" fill="' + SPRITE.shoes + '"/>';
    s += worldOutfit(av.outfit, skin);
    s += worldHead(av);
    return s;
  }

  function nameplate(p) {
    var nm = (p.name || 'A Nation');
    if (nm.length > 16) nm = nm.slice(0, 15) + '…';
    var w = Math.max(46, nm.length * 7 + 18);
    var hv = avgHealth(p.stats);
    var s = '<g transform="translate(0,-58)">';
    s += '<rect x="' + (-w / 2) + '" y="-13" width="' + w + '" height="18" rx="9" fill="rgba(20,28,48,.82)"/>';
    s += '<text x="0" y="0" text-anchor="middle" font-size="10.5" font-weight="800" fill="#FFF3BF" font-family="Verdana, sans-serif">' + escapeXml(nm) + '</text>';
    if (p.stats) {
      s += '<rect x="' + (-w / 2 + 6) + '" y="6" width="' + (w - 12) + '" height="4" rx="2" fill="rgba(255,255,255,.25)"/>';
      s += '<rect x="' + (-w / 2 + 6) + '" y="6" width="' + ((w - 12) * hv / 100) + '" height="4" rx="2" fill="' + healthColor(hv) + '"/>';
    }
    return s + '</g>';
  }

  function escapeXml(t) {
    return String(t).replace(/[<>&'"]/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c];
    });
  }

  function ensureLayer() {
    var svg = document.getElementById('town-world');
    if (!svg) return null;
    var layer = svg.getElementById ? svg.querySelector('#coop-layer') : document.getElementById('coop-layer');
    if (!layer) {
      layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      layer.setAttribute('id', 'coop-layer');
      // insert just before the local player so remotes sit in the same plane
      var pg = document.getElementById('player-g');
      if (pg && pg.parentNode === svg) svg.insertBefore(layer, pg);
      else svg.appendChild(layer);
      // existing remote elements were wiped by a re-render; recreate lazily
      for (var id in remotes) { remotes[id].el = null; }
    }
    return layer;
  }

  function buildEl(layer, id, p) {
    var ns = 'http://www.w3.org/2000/svg';
    var grp = document.createElementNS(ns, 'g');
    grp.setAttribute('class', 'coop-remote');
    grp.setAttribute('data-id', id);
    grp.innerHTML =
      '<ellipse cx="0" cy="34" rx="14" ry="4" fill="rgba(20,30,40,.22)"/>' +
      '<g class="cr-body"></g>' +
      '<g class="cr-tag"></g>';
    layer.appendChild(grp);
    var r = remotes[id];
    r.el = grp;
    r.body = grp.querySelector('.cr-body');
    r.tag = grp.querySelector('.cr-tag');
    r.body.innerHTML = bodySVG(p);
    r.tag.innerHTML = nameplate(p);
    r.avKey = JSON.stringify(p.avatar);
    r.nameKey = p.name + '|' + avgHealth(p.stats);
    return grp;
  }

  // ── render loop (smooth interpolation) ────────────────────────
  function frame() {
    requestAnimationFrame(frame);
    if (!townActive()) return;
    var layer = ensureLayer();
    if (!layer) return;
    for (var id in remotes) {
      var r = remotes[id];
      if (!r.data) continue;
      if (!r.el || !r.el.parentNode) buildEl(layer, id, r.data);
      // refresh art only when it actually changed (avatar swap / health move)
      var ak = JSON.stringify(r.data.avatar);
      if (ak !== r.avKey) { r.body.innerHTML = bodySVG(r.data); r.avKey = ak; }
      var nk = r.data.name + '|' + avgHealth(r.data.stats);
      if (nk !== r.nameKey) { r.tag.innerHTML = nameplate(r.data); r.nameKey = nk; }
      // interpolate toward target
      r.rx += (r.tx - r.rx) * 0.22;
      r.ry += (r.ty - r.ry) * 0.22;
      r.el.setAttribute('transform', 'translate(' + r.rx.toFixed(1) + ',' + r.ry.toFixed(1) + ')');
      if (r.body) r.body.setAttribute('transform', 'scale(' + (r.dir < 0 ? -1 : 1) + ',1)');
    }
  }
  requestAnimationFrame(frame);

  // ── tiny "connected" badge ────────────────────────────────────
  var badge = document.createElement('div');
  badge.id = 'coop-badge';
  badge.style.cssText =
    'position:fixed;left:12px;bottom:12px;z-index:9999;font-family:Verdana,sans-serif;' +
    'font-size:12px;font-weight:700;color:#fff;background:rgba(16,22,40,.82);' +
    'padding:7px 12px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.3);' +
    'display:flex;align-items:center;gap:7px;pointer-events:none;';
  badge.innerHTML = '<span id="coop-dot" style="width:9px;height:9px;border-radius:50%;background:#9aa;"></span>' +
                    '<span id="coop-text">Connecting…</span>';
  function setBadge(world, n) {
    onlineCount = n || onlineCount;
    var dot = document.getElementById('coop-dot');
    var txt = document.getElementById('coop-text');
    if (!dot || !txt) return;
    if (world) { dot.style.background = '#2EB872'; txt.textContent = world + ' · ' + onlineCount + ' online'; }
    else { dot.style.background = '#E03131'; txt.textContent = 'Reconnecting…'; }
  }
  window.addEventListener('DOMContentLoaded', function () { document.body.appendChild(badge); });
  if (document.body) document.body.appendChild(badge);

  // graceful "leave" so others see you drop fast
  window.addEventListener('beforeunload', function () {
    try { navigator.sendBeacon('/__coop/kick', JSON.stringify({ id: ID })); } catch (e) {}
  });
})();
