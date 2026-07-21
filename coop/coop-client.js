/* ──────────────────────────────────────────────────────────────
   Co-op client,injected into the game by coop-server.js
   • Streams this student's live state to the host every ~160ms.
   • Renders the OTHER students as avatars walking in the shared town.
   Runs in the game's global scope, so it can read player/avatar/S/P/etc.
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (!window.COOP) return;

  // Per-TAB id (sessionStorage, not localStorage) so two tabs in the SAME browser
  // are treated as distinct players,they see each other and both appear on the
  // leaderboard. sessionStorage survives a reload of the same tab but is unique per tab.
  var ID;
  try {
    ID = sessionStorage.getItem('coopId');
    if (!ID) { ID = 'p_' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('coopId', ID); }
  } catch (e) { ID = 'p_' + Math.random().toString(36).slice(2, 10); }

  var SYNC_MS = 160;
  var remotes = {};      // id -> {data, rx, ry, tx, ty, dir, el, body, tag, seen}
  var onlineCount = 1;

  // ── Class room (private world): from ?room=CODE in the URL, else this tab's saved code ──
  function cleanCode(c){ return String(c==null?'':c).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6); }
  function readRoom() {
    var c = '';
    try { c = new URLSearchParams(location.search).get('room') || ''; } catch (e) {}
    if (c) { try { sessionStorage.setItem('coopRoom', c); } catch (e) {} }
    if (!c) { try { c = sessionStorage.getItem('coopRoom') || ''; } catch (e) {} }
    return cleanCode(c);
  }
  var ROOM = readRoom();
  function setRoom(code) {
    ROOM = cleanCode(code);
    try { if (ROOM) sessionStorage.setItem('coopRoom', ROOM); else sessionStorage.removeItem('coopRoom'); } catch (e) {}
    for (var id in remotes) removeRemote(id);   // leaving a world: clear who we were seeing
    refreshJoinBtn();
    sync();                                     // re-announce in the new room immediately
  }

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
    // report the SAME bars the player sees in their HUD: dispStats() = policy stats + town growth
    // bonuses. Raw S.stats made the dashboard disagree with the student's screen for anyone who
    // had built things before joining the class.
    var statsSrc = S ? S.stats : null;
    if (started) { try { var df = g('dispStats', null); var ds = (typeof df === 'function') ? df() : null; if (ds && typeof ds.h === 'number') statsSrc = ds; } catch (e) {} }
    var stats = started ? { h: Math.round(statsSrc.h), e: Math.round(statsSrc.e), ed: Math.round(statsSrc.ed), f: Math.round(statsSrc.f) }
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
      room: ROOM,
      name: g('nationName', 'A Nation') || 'A Nation',
      avatar: av ? { skin: av.skin, hair: av.hair, hairColor: av.hairColor, beard: av.beard,
                     glasses: av.glasses, extra: av.extra, outfit: av.outfit } : null,
      stats: stats,
      score: ((P && P.lifetimeScore) || 0) + ((S && S.score) || 0),
      grade: grade,
      gradeLevel: g('GRADE_KEY', null),   // reading grade (6-12): the server picks duel questions to match
      lifetimeGrade: lifeGrade,
      termGrades: termGrades,
      term: (S && S.term) || 1,
      house: house,
      houseName: houseName,
      vanity: P && P.owned ? P.owned.length : 0,
      vanityTotal: STORE ? STORE.length : 0,
      stars: (P && P.stars) || 0,          // the actual spendable ⭐ balance shown in-game (so the leaderboard matches)
      duelWins: (P && P.duelWins) || 0,
      duelLosses: (P && P.duelLosses) || 0,
      duelStarsWon: (P && P.duelStarsWon) || 0,
      started: started,
      inTown: townActive(),
      emote: (function(){ var ce = window.currentEmote; return (ce && (Date.now() - ce.at) < 4000) ? ce.id : null; })(),
      emoteAt: (window.currentEmote && window.currentEmote.at) || 0,
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
        handleDuelState(d && d.duel ? d.duel : null);
        handleTQ(d && d.tq ? d.tq : null);
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
      '<g class="cr-tag"></g>' +
      '<g class="cr-hint" style="display:none;"></g>';
    layer.appendChild(grp);
    var r = remotes[id];
    r.el = grp;
    r.body = grp.querySelector('.cr-body');
    r.tag = grp.querySelector('.cr-tag');
    r.hint = grp.querySelector('.cr-hint');
    r.hint.innerHTML =
      '<g transform="translate(0,-94)">' +
      '<rect x="-54" y="-13" width="108" height="21" rx="10.5" fill="#FFD166" stroke="rgba(20,28,48,.3)"/>' +
      '<polygon points="-5,8 5,8 0,14" fill="#FFD166"/>' +
      '<text x="0" y="2" text-anchor="middle" font-size="10.5" font-weight="800" fill="#3a2a00" font-family="Verdana, sans-serif">⚔️ Tap to duel</text>' +
      '</g>';
    // tappable → challenge to a 1v1 duel (must be standing next to each other)
    grp.style.cursor = 'pointer';
    grp.addEventListener('click', function () { onRemoteTap(id); });
    grp.addEventListener('touchend', function (e) { e.preventDefault(); onRemoteTap(id); }, { passive: false });
    r.body.innerHTML = bodySVG(p);
    r.tag.innerHTML = nameplate(p);
    r.avKey = JSON.stringify(p.avatar);
    r.nameKey = p.name + '|' + avgHealth(p.stats);
    return grp;
  }

  // ── remote emotes (rendered above another player's avatar) ────
  var EMOJI = { wave:'👋', thumb:'👍', heart:'❤️', laugh:'😂', party:'🎉', cool:'😎', think:'🤔', fire:'🔥' };
  (function(){
    var s = document.createElement('style');
    s.textContent = '@keyframes coopEmoteFloat{0%{opacity:0;transform:translateY(6px) scale(.5);}20%{opacity:1;transform:translateY(-4px) scale(1.1);}100%{opacity:0;transform:translateY(-32px) scale(1);}} .coop-emote{animation:coopEmoteFloat 1.6s ease forwards;transform-box:fill-box;transform-origin:center;}' +
      '@keyframes coopHintPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.07);}} .cr-hint{animation:coopHintPulse 1.1s ease-in-out infinite;transform-box:fill-box;transform-origin:center bottom;}';
    (document.head || document.documentElement).appendChild(s);
  })();
  function showRemoteEmote(r) {
    if (!r.el) return;
    var ns = 'http://www.w3.org/2000/svg';
    var em = r.data.emote || '', node, life = 1600;
    if (em.indexOf('say:') === 0) {
      // quick-chat phrase → text bubble above the avatar
      var txt = em.slice(4); if (txt.length > 22) txt = txt.slice(0, 21) + '…';
      var w = Math.max(42, txt.length * 7 + 20);
      node = document.createElementNS(ns, 'g'); node.setAttribute('class', 'coop-emote');
      node.innerHTML = '<rect x="' + (-w / 2) + '" y="-94" width="' + w + '" height="22" rx="11" fill="#fff" stroke="rgba(16,22,40,.25)"/>' +
        '<text x="0" y="-79" text-anchor="middle" font-size="12.5" font-weight="800" fill="#13234a" font-family="Verdana, sans-serif">' + escapeXml(txt) + '</text>';
      life = 1900;
    } else {
      node = document.createElementNS(ns, 'text');
      node.setAttribute('x', '0'); node.setAttribute('y', '-78'); node.setAttribute('text-anchor', 'middle');
      node.setAttribute('font-size', '26'); node.setAttribute('class', 'coop-emote');
      node.textContent = EMOJI[em] || '❓';
    }
    r.el.appendChild(node);
    setTimeout(function(){ if (node.parentNode) node.parentNode.removeChild(node); }, life);
  }

  // ── render loop (smooth interpolation) ────────────────────────
  function frame() {
    requestAnimationFrame(frame);
    if (!townActive()) return;
    var layer = ensureLayer();
    if (!layer) return;
    var _pl = null; try { _pl = g('player'); } catch (e) {}
    var _busy = !!(DUEL && DUEL.status && DUEL.status !== 'done' && DUEL.status !== 'declined' && DUEL.status !== 'cancelled');
    var _nid = null, _nd = (typeof DUEL_RANGE === 'number' ? DUEL_RANGE : 160) + 1;
    for (var id in remotes) {
      var r = remotes[id];
      if (!r.data) continue;
      if (!r.el || !r.el.parentNode) buildEl(layer, id, r.data);
      if (_pl && r.data.pos) { var _d = Math.sqrt(Math.pow(_pl.x - r.data.pos.x, 2) + Math.pow(_pl.y - r.data.pos.y, 2)); if (_d < _nd) { _nd = _d; _nid = id; } }
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
      if (r.data.emote && r.data.emoteAt && r.data.emoteAt !== r.lastEmote) {
        r.lastEmote = r.data.emoteAt;
        if (Date.now() - r.data.emoteAt < 4000) showRemoteEmote(r);
      }
    }
    // show the "⚔️ Tap to duel" hint over the nearest player within range (when not busy in a duel)
    for (var hid in remotes) {
      var hr = remotes[hid];
      if (!hr.hint) continue;
      hr.hint.style.display = (!_busy && hid === _nid && _nd <= (typeof DUEL_RANGE === 'number' ? DUEL_RANGE : 160)) ? '' : 'none';
    }
  }
  requestAnimationFrame(frame);

  // ── tiny "connected" badge ────────────────────────────────────
  var badge = document.createElement('div');
  badge.id = 'coop-badge';
  // mounted INSIDE the header's right-side flex row (next to the sound button), so it's part of the
  // top bar rather than floating over the page; falls back to a fixed pill if the header is missing
  badge.style.cssText =
    'font-family:Verdana,sans-serif;font-size:11px;font-weight:700;color:#fff;' +
    'background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.25);' +
    'padding:4px 10px;border-radius:999px;white-space:nowrap;' +
    'display:flex;align-items:center;gap:6px;pointer-events:none;';
  badge.innerHTML = '<span id="coop-dot" style="width:9px;height:9px;border-radius:50%;background:#9aa;"></span>' +
                    '<span id="coop-text">Connecting…</span>';
  function setBadge(world, n) {
    onlineCount = n || onlineCount;
    var dot = document.getElementById('coop-dot');
    var txt = document.getElementById('coop-text');
    if (!dot || !txt) return;
    if (world) {
      dot.style.background = '#2EB872';
      // only show a world name + online count once a class code has been entered;
      // the shared default world (no code) reads "Not in a class yet" instead
      txt.textContent = ROOM ? (world + ' · ' + onlineCount + ' online') : 'Not in a class yet';
    }
    else { dot.style.background = '#E03131'; txt.textContent = 'Reconnecting…'; }
  }
  // mount into the header row just left of the sound button; re-inserting the same node is safe
  function mountTopbar(el, beforeEl){
    var hr = document.querySelector('.header .hd-right') || document.querySelector('.hd-right');
    if (hr) {
      var anchor = (beforeEl && beforeEl.parentElement === hr) ? beforeEl : document.getElementById('sfx-btn');
      if (anchor && anchor.parentElement === hr) hr.insertBefore(el, anchor); else hr.appendChild(el);
      el.style.position = ''; el.style.top = ''; el.style.left = ''; el.style.transform = '';
    } else {   // no header on this page: fall back to a fixed pill at top center
      el.style.position = 'fixed'; el.style.top = '16px'; el.style.left = '50%';
      el.style.transform = 'translateX(-50%)'; el.style.zIndex = '9999';
      document.body.appendChild(el);
    }
  }
  window.addEventListener('DOMContentLoaded', function () { mountTopbar(badge); });
  if (document.body) mountTopbar(badge);

  // ── "Join a Class" code entry,lets a class (or two tabs) share one private world ──
  var joinBtn, joinOv;
  function refreshJoinBtn(){ if (joinBtn) joinBtn.textContent = ROOM ? ('🔑 Class ' + ROOM) : '🔑 Join a class'; }
  function openJoin(){
    if (!joinOv) return;
    var inp = document.getElementById('coop-join-input'); if (inp) inp.value = ROOM || '';
    var leave = document.getElementById('coop-join-leave'); if (leave) leave.style.display = ROOM ? 'inline-block' : 'none';
    joinOv.style.display = 'flex';
    if (inp) setTimeout(function(){ inp.focus(); }, 30);
  }
  function closeJoin(){ if (joinOv) joinOv.style.display = 'none'; }
  function buildJoinUI(){
    if (document.getElementById('coop-join-btn') || !document.body) return;
    joinBtn = document.createElement('button');
    joinBtn.id = 'coop-join-btn';
    joinBtn.style.cssText = 'font-family:Verdana,sans-serif;font-size:11px;font-weight:800;color:#13234a;background:#FFD166;border:none;cursor:pointer;padding:5px 11px;border-radius:999px;white-space:nowrap;';   // header pill, sized to sit beside the sound button
    joinBtn.onclick = openJoin;
    mountTopbar(joinBtn, badge);   // header order: [🔑 Join a class][World · N online][🔊][💬]

    joinOv = document.createElement('div');
    joinOv.id = 'coop-join-ov';
    joinOv.style.cssText = 'position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;background:rgba(10,14,28,.6);font-family:Verdana,sans-serif;';
    joinOv.innerHTML =
      '<div style="background:#fff;border-radius:18px;padding:26px 24px;width:min(360px,90vw);box-shadow:0 18px 50px rgba(0,0,0,.4);text-align:center;">' +
      '<div style="font-size:1.25rem;font-weight:900;color:#13234a;margin-bottom:4px;">Join a Class</div>' +
      '<div style="font-size:.85rem;color:#5a6b8c;margin-bottom:16px;">Enter the code your teacher shows on the board.</div>' +
      '<input id="coop-join-input" maxlength="6" placeholder="CODE" autocomplete="off" ' +
        'style="width:100%;box-sizing:border-box;text-align:center;letter-spacing:.35em;text-transform:uppercase;font-size:1.6rem;font-weight:900;color:#13234a;padding:12px;border:2px solid #cdd7ea;border-radius:12px;outline:none;">' +
      '<div style="display:flex;gap:10px;margin-top:16px;">' +
        '<button id="coop-join-cancel" style="flex:1;padding:11px;border:none;border-radius:10px;background:#e7ecf5;color:#3a4a6a;font-weight:800;cursor:pointer;font-family:inherit;">Cancel</button>' +
        '<button id="coop-join-go" style="flex:1;padding:11px;border:none;border-radius:10px;background:#2d6fd6;color:#fff;font-weight:800;cursor:pointer;font-family:inherit;">Join →</button>' +
      '</div>' +
      '<button id="coop-join-leave" style="display:none;margin-top:12px;background:none;border:none;color:#b03030;font-weight:700;cursor:pointer;font-size:.8rem;font-family:inherit;text-decoration:underline;">Leave this class</button>' +
      '<div style="margin-top:14px;font-size:.72rem;color:#8a96ac;">Use a first name or nickname only. <a href="/privacy" target="_blank" style="color:#8a96ac;">Privacy notice</a></div>' +
      '</div>';
    document.body.appendChild(joinOv);
    var inp = document.getElementById('coop-join-input');
    var go = function(){ if (inp && cleanCode(inp.value)) setRoom(inp.value); closeJoin(); };
    document.getElementById('coop-join-go').onclick = go;
    document.getElementById('coop-join-cancel').onclick = closeJoin;
    document.getElementById('coop-join-leave').onclick = function(){ setRoom(''); closeJoin(); };
    if (inp) { inp.addEventListener('keydown', function(e){ if (e.key === 'Enter') go(); });
               inp.addEventListener('input', function(){ inp.value = cleanCode(inp.value); }); }
    joinOv.addEventListener('click', function(e){ if (e.target === joinOv) closeJoin(); });
    refreshJoinBtn();
  }
  if (document.body) buildJoinUI();
  window.addEventListener('DOMContentLoaded', buildJoinUI);

  // ══════════════════════════════════════════════════════════════
  //  1v1 STAR DUELS,tap a nearby player, wager stars, race on the
  //  same policy questions; most "best/most-libertarian" answers wins.
  // ══════════════════════════════════════════════════════════════
  var DUEL_RANGE = 160;                 // how close (world px) two avatars must be
  var WAGER_OPTIONS = [250, 500, 1000];
  var DUEL = null;                      // latest duel view from the server
  var phase = 'none', phaseDuelId = ''; // UI state machine
  var myAnswers = [], qIdx = 0, mySubmitted = false, applied = {};

  function myStars() { var P = g('P'); return (P && P.stars) || 0; }
  function myName() { return g('nationName', 'You') || 'You'; }
  function localPos() { var pl = g('player'); return pl ? { x: pl.x, y: pl.y } : null; }
  function dist(a, b) { return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)); }
  function trySfx(n) { try { var f = g('sfx'); if (typeof f === 'function') f(n); } catch (e) {} }

  // gather real policy questions → pick N, keep the answer key.
  // Draw from the SELECTED GRADE's pools so duel questions match the player's grade level
  // and the operating-profile voice (the QG/QGB banks are the grade-leveled, rewritten ones).
  function buildDuelPool() {
    var out = [], seen = {};
    function add(q) {
      if (!q || !q.body || !Array.isArray(q.choices) || !q.best) return;
      var key = (q.title || '') + '|' + q.body.slice(0, 40);
      if (seen[key]) return; seen[key] = 1;
      out.push(q);
    }
    // Primary source: every citizen's pool for the currently selected grade.
    var grade = g('GRADE_KEY', null);
    var poolFn = g('gradePool', null);
    if (typeof poolFn === 'function' && grade != null) {
      for (var npc = 0; npc < 10; npc++) {
        var pool = poolFn(grade, npc);
        if (Array.isArray(pool)) pool.forEach(add);
      }
    }
    // Also include this term's live questions (already grade-based).
    var Q = g('Q', null);
    if (Array.isArray(Q)) Q.forEach(add);
    // Safety fallback: if the grade pools aren't reachable, use the legacy banks so duels still work.
    if (out.length === 0) {
      ['Q', 'QBANK', 'NEWQ1', 'NEWQ2', 'NEWQ3', 'NEWQ4', 'NEWQ5', 'NEWQ6'].forEach(function (nm) {
        var arr = g(nm, null);
        if (Array.isArray(arr)) arr.forEach(add);
      });
    }
    return out;
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pickQuestions(n) {
    var pool = buildDuelPool().slice();
    // Prefer questions this player has NOT seen yet (NPC terms or past duels). Fall back to
    // seen ones only if there aren't enough fresh questions to fill the duel.
    try {
      var keyFn = g('qKey', null), storeFn = g('seenStore', null);
      var seen = (typeof storeFn === 'function') ? storeFn() : null;
      if (seen && typeof keyFn === 'function') {
        var unseen = shuffle(pool.filter(function (q) { return !seen[keyFn(q)]; }));
        var rest = shuffle(pool.filter(function (q) { return seen[keyFn(q)]; }));
        pool = unseen.concat(rest);          // fresh questions first, seen ones only as backfill
      } else { shuffle(pool); }
    } catch (e) { shuffle(pool); }
    var LET = ['A', 'B', 'C', 'D', 'E', 'F'];
    return pool.slice(0, n).map(function (q) {
      // copy choices, flag the correct one, then SHUFFLE so the best answer isn't always "A"
      var ch = q.choices.map(function (c) { return { label: c.label, _best: (c.letter === q.best) }; });
      for (var i = ch.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = ch[i]; ch[i] = ch[j]; ch[j] = t; }
      var best = q.best;
      var choices = ch.map(function (c, idx) { if (c._best) best = LET[idx]; return { letter: LET[idx], label: c.label }; });
      return { title: q.title || q.tag || 'Policy Question', body: q.body, choices: choices, best: best };
    });
  }

  // ── network actions ───────────────────────────────────────────
  function postJSON(url, body, cb) {
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); }).then(function (d) { if (cb) cb(d); }).catch(function () { if (cb) cb(null); });
  }
  function sendChallenge(toId, toName, wager, n) {
    // questions + answer key now come from the SERVER (server-authoritative), so nothing is sent here
    postJSON('/__coop/duel/challenge', { room: ROOM, from: { id: ID, name: myName() }, to: { id: toId, name: toName }, wager: wager, n: n },
      function (d) { if (d && d.ok) { sync(); } else { toast((d && d.error) || 'Could not start the duel.'); } });
  }
  function respondDuel(accept) {
    if (!DUEL) return;
    if (accept && myStars() < DUEL.wager) { toast('You need ' + DUEL.wager.toLocaleString() + '⭐ to accept (you have ' + myStars().toLocaleString() + ').'); return; }
    postJSON('/__coop/duel/respond', { duelId: DUEL.id, id: ID, accept: !!accept }, function () { sync(); });
  }
  function submitAnswers() { if (!DUEL) return; postJSON('/__coop/duel/answer', { duelId: DUEL.id, id: ID, letters: myAnswers }, function () { sync(); }); }
  function cancelChallenge() { if (!DUEL) return; postJSON('/__coop/duel/cancel', { duelId: DUEL.id, id: ID }, function () { sync(); }); closeDuelOv(); phase = 'none'; phaseDuelId = ''; }

  // ── tap a remote avatar → challenge (or accept their challenge) ─
  function onRemoteTap(id) {
    var r = remotes[id]; if (!r || !r.data || !r.data.pos) return;
    // if they already challenged me, tapping them back = accept (mutual tap)
    if (DUEL && DUEL.status === 'pending' && DUEL.youAre === 'to' && DUEL.from && DUEL.from.id === id) { respondDuel(true); return; }
    if (DUEL && DUEL.status !== 'done' && DUEL.status !== 'declined' && DUEL.status !== 'cancelled') return; // busy in a duel
    var pl = localPos(); if (!pl) return;
    if (dist(pl, r.data.pos) > DUEL_RANGE) { toast('Walk up next to ' + (r.data.name || 'them') + ' to challenge.'); return; }
    if (myStars() < WAGER_OPTIONS[0]) { toast('You need at least ' + WAGER_OPTIONS[0] + '⭐ to start a duel.'); return; }
    openChallengeDialog(id, r.data.name || 'Player');
  }

  // ── UI: overlay + toast ────────────────────────────────────────
  (function () {
    var s = document.createElement('style');
    s.textContent =
      '#duel-ov{position:fixed;inset:0;z-index:10001;display:none;align-items:center;justify-content:center;background:rgba(8,12,26,.72);font-family:Verdana,sans-serif;padding:16px;}' +
      '#duel-card{background:#fff;border-radius:20px;padding:22px 20px;width:min(440px,94vw);max-height:92vh;overflow:auto;box-shadow:0 22px 60px rgba(0,0,0,.45);text-align:center;}' +
      '.duel-h{font-size:1.3rem;font-weight:900;color:#13234a;margin:0 0 4px;}' +
      '.duel-sub{font-size:.86rem;color:#5a6b8c;margin-bottom:14px;line-height:1.4;}' +
      '.duel-q{font-size:1.02rem;font-weight:800;color:#13234a;text-align:left;margin:6px 0 14px;line-height:1.4;}' +
      '.duel-opt{display:block;width:100%;box-sizing:border-box;text-align:left;margin:8px 0;padding:13px 15px;border:2px solid #d7deec;border-radius:13px;background:#f7f9fd;color:#1b2b4d;font-weight:700;font-size:.95rem;font-family:inherit;cursor:pointer;line-height:1.35;}' +
      '.duel-opt:hover{border-color:#2d6fd6;background:#eef4ff;}' +
      '.duel-opt b{color:#2d6fd6;margin-right:7px;}' +
      '.duel-row{display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin:10px 0;}' +
      '.duel-pick{flex:1;min-width:90px;padding:12px;border:2px solid #d7deec;border-radius:12px;background:#f7f9fd;color:#13234a;font-weight:800;font-family:inherit;cursor:pointer;font-size:.95rem;}' +
      '.duel-pick.on{border-color:#2d6fd6;background:#2d6fd6;color:#fff;}' +
      '.duel-pick:disabled{opacity:.4;cursor:not-allowed;}' +
      '.duel-btn{padding:12px 18px;border:none;border-radius:12px;font-weight:800;font-family:inherit;cursor:pointer;font-size:.98rem;}' +
      '.duel-go{background:linear-gradient(180deg,#FFD43B,#ED8B00);color:#3a2a00;}' +
      '.duel-ghost{background:#e7ecf5;color:#3a4a6a;}' +
      '.duel-win{color:#2EB872;}.duel-lose{color:#E03131;}.duel-tie{color:#F2762E;}' +
      '#duel-toast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:10002;background:rgba(16,22,40,.93);color:#fff;font-family:Verdana,sans-serif;font-size:.84rem;font-weight:700;padding:10px 16px;border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.35);opacity:0;transition:opacity .2s;pointer-events:none;max-width:80vw;text-align:center;}' +
      '#duel-toast.show{opacity:1;}' +
      '@keyframes duelHpop{0%{transform:scale(.6);opacity:0;}60%{transform:scale(1.12);}100%{transform:scale(1);opacity:1;}} .duel-h-pop{animation:duelHpop .5s ease;display:inline-block;}' +
      '@keyframes duelFlash{0%,100%{box-shadow:0 22px 60px rgba(0,0,0,.45);}35%{box-shadow:0 0 0 4px rgba(224,49,49,.65),0 22px 60px rgba(0,0,0,.45);}} .duel-card-lose{animation:duelFlash .45s ease 2;}' +
      '@keyframes duelConf{0%{transform:translateY(-12vh) rotate(0);opacity:1;}100%{transform:translateY(86vh) rotate(540deg);opacity:.15;}} .duel-confetti{position:fixed;top:0;width:9px;height:14px;border-radius:2px;z-index:10003;pointer-events:none;}';
    (document.head || document.documentElement).appendChild(s);
  })();
  var ov, card, toastEl, toastT;
  function ensureOv() {
    if (ov) return;
    ov = document.createElement('div'); ov.id = 'duel-ov';
    card = document.createElement('div'); card.id = 'duel-card';
    ov.appendChild(card); document.body.appendChild(ov);
    toastEl = document.createElement('div'); toastEl.id = 'duel-toast'; document.body.appendChild(toastEl);
  }
  function openOv(html) { ensureOv(); card.innerHTML = html; ov.style.display = 'flex'; }
  function closeDuelOv() { if (ov) ov.style.display = 'none'; }
  function toast(msg) { ensureOv(); toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2600); }

  function openChallengeDialog(toId, toName) {
    ensureOv();
    var stars = myStars(), wager = WAGER_OPTIONS.filter(function (w) { return w <= stars; }).slice(-1)[0] || WAGER_OPTIONS[0], len = 5;
    function render() {
      var wagerBtns = WAGER_OPTIONS.map(function (w) {
        return '<button class="duel-pick ' + (w === wager ? 'on' : '') + '" data-w="' + w + '"' + (w > stars ? ' disabled' : '') + '>' + w.toLocaleString() + '⭐</button>';
      }).join('');
      var lenBtns = [3, 5].map(function (k) { return '<button class="duel-pick ' + (k === len ? 'on' : '') + '" data-n="' + k + '">' + k + ' questions</button>'; }).join('');
      openOv(
        '<div class="duel-h">⚔️ Challenge ' + esc(toName) + '</div>' +
        '<div class="duel-sub">You both answer the same questions at once. Most best-answers wins the pot. A tie refunds both.</div>' +
        '<div style="font-weight:800;color:#13234a;font-size:.8rem;text-align:left;margin-bottom:5px;">WAGER (you have ' + stars.toLocaleString() + '⭐)</div>' +
        '<div class="duel-row" id="duel-wager">' + wagerBtns + '</div>' +
        '<div style="font-weight:800;color:#13234a;font-size:.8rem;text-align:left;margin:8px 0 5px;">LENGTH</div>' +
        '<div class="duel-row" id="duel-len">' + lenBtns + '</div>' +
        '<div class="duel-row" style="margin-top:16px;">' +
          '<button class="duel-btn duel-ghost" id="duel-cancel" style="flex:1;">Cancel</button>' +
          '<button class="duel-btn duel-go" id="duel-send" style="flex:2;">Send Challenge →</button>' +
        '</div>');
      card.querySelectorAll('#duel-wager .duel-pick').forEach(function (b) { b.onclick = function () { if (b.disabled) return; wager = +b.getAttribute('data-w'); render(); }; });
      card.querySelectorAll('#duel-len .duel-pick').forEach(function (b) { b.onclick = function () { len = +b.getAttribute('data-n'); render(); }; });
      card.querySelector('#duel-cancel').onclick = function () { closeDuelOv(); };
      card.querySelector('#duel-send').onclick = function () { closeDuelOv(); sendChallenge(toId, toName, wager, len); };
    }
    render();
  }

  function esc(t) { return escapeXml(t); }

  function renderIncoming(d) {
    openOv(
      '<div class="duel-h">⚔️ Duel Challenge!</div>' +
      '<div class="duel-sub"><b>' + esc(d.from.name) + '</b> challenges you to a policy duel.<br>Wager <b>' + d.wager.toLocaleString() + '⭐</b> · <b>' + d.n + '</b> questions · winner takes the pot.</div>' +
      '<div class="duel-row">' +
        '<button class="duel-btn duel-ghost" id="duel-decline" style="flex:1;">Decline</button>' +
        '<button class="duel-btn duel-go" id="duel-accept" style="flex:1;">Accept ⚔️</button>' +
      '</div>');
    card.querySelector('#duel-decline').onclick = function () { respondDuel(false); };
    card.querySelector('#duel-accept').onclick = function () { respondDuel(true); };
  }
  function renderWaitingAccept(d) {
    openOv(
      '<div class="duel-h">Waiting…</div>' +
      '<div class="duel-sub">Challenge sent to <b>' + esc(d.to.name) + '</b><br>Wager ' + d.wager.toLocaleString() + '⭐ · ' + d.n + ' questions.<br>Waiting for them to accept.</div>' +
      '<div class="duel-row"><button class="duel-btn duel-ghost" id="duel-cancel2">Cancel challenge</button></div>');
    card.querySelector('#duel-cancel2').onclick = function () { cancelChallenge(); };
  }
  function startAnswering(d) {
    mySubmitted = false; qIdx = 0; myAnswers = [];
    // remember these questions so neither NPC terms nor future duels repeat them for this player
    try { var mark = g('markSeen', null); if (typeof mark === 'function' && d && d.questions) mark(d.questions); } catch (e) {}
    renderQuestion(d);
  }
  function renderQuestion(d) {
    if (!d.questions || !d.questions[qIdx]) { return; }
    var q = d.questions[qIdx];
    var opts = q.choices.map(function (c) { return '<button class="duel-opt" data-l="' + c.letter + '"><b>' + c.letter + '</b>' + esc(c.label) + '</button>'; }).join('');
    openOv(
      '<div class="duel-sub" style="margin-bottom:6px;">⚔️ Duel · question ' + (qIdx + 1) + ' of ' + d.n + ' · ' + d.wager.toLocaleString() + '⭐</div>' +
      '<div class="duel-q">' + esc(q.body) + '</div>' + opts +
      '<div class="duel-row" style="margin-top:8px;"><button class="duel-btn duel-ghost" id="duel-quit">Quit duel</button></div>');
    card.querySelectorAll('.duel-opt').forEach(function (b) {
      b.onclick = function () {
        myAnswers[qIdx] = b.getAttribute('data-l');
        qIdx++;
        if (qIdx < d.n) renderQuestion(d);
        else { mySubmitted = true; phase = 'waitingOpp'; submitAnswers(); renderWaitingOpp(d); }
        trySfx('click');
      };
    });
    var qb = card.querySelector('#duel-quit'); if (qb) qb.onclick = function () { cancelChallenge(); }; // let a player bail mid-question, voids the duel (no stars moved yet)
  }
  function renderWaitingOpp(d) {
    openOv('<div class="duel-h">✅ Answers in!</div><div class="duel-sub">Waiting for your opponent to finish…</div>' +
      '<div style="font-size:2rem;">⏳</div>' +
      '<div class="duel-row"><button class="duel-btn duel-ghost" id="duel-leave">Leave duel</button></div>');
    var lb = card && card.querySelector('#duel-leave'); if (lb) lb.onclick = function () { cancelChallenge(); }; // free the survivor immediately if the opponent vanished
  }
  function applyResultOnce(d) {
    if (!d.result || applied[d.id]) return;
    applied[d.id] = true;
    var res = d.result;
    var won = !res.tie && res.winnerId === ID;
    var lost = !res.tie && res.winnerId !== ID;
    var delta = res.tie ? 0 : (won ? res.wager : -res.wager);
    if (res.delta && (ID in res.delta)) delta = res.delta[ID];   // prefer the server-authoritative star delta (prevents desync)
    var P = g('P');
    if (P) {
      if (delta !== 0) P.stars = Math.max(0, (P.stars || 0) + delta);
      if (won) { P.duelWins = (P.duelWins || 0) + 1; P.duelStarsWon = (P.duelStarsWon || 0) + res.wager; }
      else if (lost) { P.duelLosses = (P.duelLosses || 0) + 1; }
      refreshStarBadges();
    }
    trySfx(res.tie ? 'pop' : (won ? 'win' : 'bad'));
  }
  function confettiBurst() {
    var colors = ['#FFD43B', '#2EB872', '#2D6FD6', '#ED8B00', '#E03131', '#9b59b6'];
    for (var i = 0; i < 22; i++) {
      var c = document.createElement('div');
      c.className = 'duel-confetti';
      c.style.left = (Math.random() * 100) + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animation = 'duelConf ' + (1.6 + Math.random() * 1.4) + 's ease-in ' + (Math.random() * 0.45) + 's forwards';
      document.body.appendChild(c);
      (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3400); })(c);
    }
  }
  function renderResult(d) {
    var res = d.result; var iAmFrom = res.fromId === ID;
    var myC = iAmFrom ? res.fromCorrect : res.toCorrect;
    var opC = iAmFrom ? res.toCorrect : res.fromCorrect;
    var opName = iAmFrom ? d.to.name : d.from.name;
    var title, cls, line;
    if (res.tie) { title = '🤝 Draw'; cls = 'duel-tie'; line = 'Both wagers refunded, no stars change hands.'; }
    else if (res.winnerId === ID) { title = '🏆 You win!'; cls = 'duel-win'; line = 'You take <b>' + res.wager.toLocaleString() + '⭐</b> from ' + esc(opName) + '.'; }
    else { title = '💔 You lose'; cls = 'duel-lose'; line = esc(opName) + ' takes your <b>' + res.wager.toLocaleString() + '⭐</b>.'; }
    openOv(
      '<div class="duel-h ' + cls + '">' + title + '</div>' +
      '<div class="duel-sub">You: <b>' + myC + '</b> best-answers · ' + esc(opName) + ': <b>' + opC + '</b><br>' + line + '</div>' +
      '<div style="font-size:.8rem;color:#7a88a6;margin-bottom:12px;">Your balance: ' + myStars().toLocaleString() + '⭐</div>' +
      '<div class="duel-row"><button class="duel-btn duel-go" id="duel-done" style="flex:1;">Done</button></div>');
    var h = card.querySelector('.duel-h'); if (h) h.classList.add('duel-h-pop');
    if (!res.tie && res.winnerId === ID) confettiBurst();
    else if (!res.tie) { card.classList.add('duel-card-lose'); setTimeout(function () { card.classList.remove('duel-card-lose'); }, 1100); }
    card.querySelector('#duel-done').onclick = function () { closeDuelOv(); };
  }

  // ── duel state machine, driven by each sync response ───────────
  function handleDuelState(duel) {
    DUEL = duel;
    var did = duel ? duel.id : '';
    var target;
    if (!duel) target = 'none';
    else if (duel.status === 'pending') target = (duel.youAre === 'to') ? 'incoming' : 'waitingAccept';
    else if (duel.status === 'active') target = (duel.youDone || mySubmitted) ? 'waitingOpp' : 'answering';
    else if (duel.status === 'done') target = 'result';
    else if (duel.status === 'declined' || duel.status === 'cancelled') target = 'ended';
    else target = 'none';

    if (target === phase && did === phaseDuelId) return; // no change → don't disturb the UI
    phase = target; phaseDuelId = did;

    if (target === 'none') { closeDuelOv(); }
    else if (target === 'ended') {
      toast(duel.status === 'declined' ? (duel.youAre === 'from' ? esc(duel.to.name) + ' declined.' : 'Challenge declined.') : (mySubmitted ? 'Duel ended, your opponent left. No stars lost.' : 'Duel ended.'));
      closeDuelOv();
    }
    else if (target === 'incoming') renderIncoming(duel);
    else if (target === 'waitingAccept') renderWaitingAccept(duel);
    else if (target === 'answering') startAnswering(duel);
    else if (target === 'waitingOpp') renderWaitingOpp(duel);
    else if (target === 'result') { applyResultOnce(duel); renderResult(duel); }
  }

  // ══════════════════════════════════════════════════════════════
  //  TEACHER CLASS QUESTIONS,answer the teacher's posted question for stars
  // ══════════════════════════════════════════════════════════════
  var TQNOW = null, appliedTQ = {}, tqBanner = null;
  function refreshStarBadges() {
    var P = g('P');
    var sp = g('saveProfiles'); if (typeof sp === 'function') sp();
    var ub = g('updateBankUI'); if (typeof ub === 'function') ub();
    var us = g('updateScoreHUD'); if (typeof us === 'function') us();
    var ts = document.getElementById('town-score'); if (ts && P) ts.textContent = '⭐ ' + ((P.stars || 0)).toLocaleString();
    var sc = document.getElementById('score-val'); if (sc && P) sc.textContent = '⭐ ' + ((P.stars || 0)).toLocaleString();
  }
  function applyTQStars(reward) {
    var P = g('P'); if (!P) return;
    P.stars = (P.stars || 0) + reward;
    refreshStarBadges();
  }
  function ensureTqBanner() {
    if (tqBanner || !document.body) return;
    var st = document.createElement('style');
    st.textContent = '@keyframes tqPulse{0%,100%{transform:translateX(-50%) scale(1);}50%{transform:translateX(-50%) scale(1.05);}}';
    document.head.appendChild(st);
    tqBanner = document.createElement('button');
    tqBanner.id = 'tq-banner';
    tqBanner.style.cssText = 'position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:9998;display:none;background:linear-gradient(180deg,#FFD43B,#ED8B00);color:#3a2a00;border:none;border-radius:999px;padding:10px 18px;font-family:Verdana,sans-serif;font-weight:900;font-size:.9rem;box-shadow:0 6px 18px rgba(0,0,0,.35);cursor:pointer;animation:tqPulse 1.4s ease-in-out infinite;';
    tqBanner.textContent = '📣 Class Question, tap to answer for ⭐';
    tqBanner.onclick = function () { if (TQNOW) openTQAnswer(TQNOW); };
    document.body.appendChild(tqBanner);
  }
  function openTQAnswer(tq) {
    ensureOv();
    if (tq.style === 'mc') {
      var opts = tq.choices.map(function (c, i) { return '<button class="duel-opt" data-i="' + i + '"><b>' + String.fromCharCode(65 + i) + '</b>' + esc(c) + '</button>'; }).join('');
      openOv('<div class="duel-sub" style="margin-bottom:6px;">📣 Class Question · ⭐' + tq.reward + '</div><div class="duel-q">' + esc(tq.text) + '</div>' + opts);
      card.querySelectorAll('.duel-opt').forEach(function (b) { b.onclick = function () { submitTQ(tq, +b.getAttribute('data-i')); }; });
    } else {
      openOv('<div class="duel-sub" style="margin-bottom:6px;">📣 Class Question · ⭐' + tq.reward + '</div><div class="duel-q">' + esc(tq.text) + '</div>' +
        '<textarea id="tq-ans" style="width:100%;box-sizing:border-box;min-height:72px;border:2px solid #d7deec;border-radius:12px;padding:10px;font-family:inherit;font-size:.95rem;" placeholder="Type your answer…"></textarea>' +
        '<div class="duel-row" style="margin-top:12px;"><button class="duel-btn duel-ghost" id="tq-cancel" style="flex:1;">Cancel</button><button class="duel-btn duel-go" id="tq-send" style="flex:2;">Submit →</button></div>');
      card.querySelector('#tq-cancel').onclick = function () { closeDuelOv(); };
      card.querySelector('#tq-send').onclick = function () { var t = (document.getElementById('tq-ans') || {}).value || ''; if (!t.trim()) return; submitTQ(tq, t); };
    }
  }
  function submitTQ(tq, answer) {
    postJSON('/__coop/tq/answer', { room: ROOM, id: ID, name: myName(), answer: answer }, function (d) {
      if (!d || !d.ok) { toast((d && d.error) || 'Could not submit.'); return; }
      if (tqBanner) tqBanner.style.display = 'none';
      if (tq.style === 'mc') {
        var correct = d.mine && d.mine.correct;
        if (correct && !appliedTQ[tq.id]) { appliedTQ[tq.id] = true; applyTQStars(d.reward || tq.reward); }
        openOv('<div class="duel-h ' + (correct ? 'duel-win' : 'duel-lose') + '">' + (correct ? '✓ Correct!' : '✗ Not quite') + '</div>' +
          '<div class="duel-sub">' + (correct ? 'You earned ⭐' + (d.reward || tq.reward) + '!' : 'No stars this time, but keep going!') + '</div>' +
          '<div class="duel-row"><button class="duel-btn duel-go" id="tq-done" style="flex:1;">Done</button></div>');
        card.querySelector('#tq-done').onclick = function () { closeDuelOv(); };
        trySfx(correct ? 'win' : 'bad');
      } else {
        openOv('<div class="duel-h">✅ Submitted!</div><div class="duel-sub">Your teacher will review your answer and award ⭐ if it\'s good.</div>' +
          '<div class="duel-row"><button class="duel-btn duel-go" id="tq-done" style="flex:1;">Done</button></div>');
        card.querySelector('#tq-done').onclick = function () { closeDuelOv(); };
        trySfx('pop');
      }
      sync();
    });
  }
  function handleTQ(tq) {
    TQNOW = tq; ensureTqBanner();
    if (!tq) { if (tqBanner) tqBanner.style.display = 'none'; return; }
    if (tq.answered) {
      if (tqBanner) tqBanner.style.display = 'none';
      if (tq.mine && tq.mine.awarded && !tq.mine.credited && !appliedTQ[tq.id]) { appliedTQ[tq.id] = true; applyTQStars(tq.reward); toast('📣 Your teacher awarded you ⭐' + tq.reward + '!'); trySfx('win'); } // server credited flag blocks re-claim on reload
    } else {
      var show = townActive() && (!ov || ov.style.display === 'none');
      if (tqBanner) tqBanner.style.display = show ? '' : 'none';
    }
  }

  // graceful "leave" so others see you drop fast
  window.addEventListener('beforeunload', function () {
    try { navigator.sendBeacon('/__coop/kick', JSON.stringify({ id: ID })); } catch (e) {}
    try { if (DUEL && (DUEL.status === 'pending' || DUEL.status === 'active')) navigator.sendBeacon('/__coop/duel/cancel', JSON.stringify({ duelId: DUEL.id, id: ID })); } catch (e) {}
  });
})();
