# The Policy Game, Development Log

A chronological record of the directions given and the changes made to **The Policy Game**
, an interactive free-market / capitalism education game built for the Cato Institute,
Center for Educational Freedom (primary audience: ages 16–25 new to libertarian policy ideas).

**Live site:** https://cato-capitalism-coop.onrender.com
**Teacher dashboard:** https://cato-capitalism-coop.onrender.com/host
**Student entry:** https://cato-capitalism-coop.onrender.com (enter the class code)
**Hosting:** Render.com free tier, auto-deploys on every push to the GitHub repo.

---

## About the dates and times in this log

Dates are accurate, they come from file save-times on disk, from dates recorded inside the
project's own status documents (`QA-Bug-Report.md`, `GRADE-LEVEL-UPDATE-STATUS.md`), and from
the session record of each request. **Exact clock times for individual edits within a day were
not separately logged**, so any times shown for older entries are approximate (based on when
files were saved). The 2026-06-24 entries reflect the order the work was done.
Log compiled 2026-06-24 19:06 UTC and assembled from everything in the project folder.

---

## 2026-06-09, Initial prototype

- **Direction:** Create an interactive, fun game about capitalism / free markets.
- **Change:** First working prototype `policy_game.html` (~99 KB). The player is elected
  leader and faces real policy crises; the nation's stats react to each decision.

---

## 2026-06-11, Core game builds (FINAL → v2 → v3)

- **Direction:** Grow the prototype into a fuller game with better art and more content.
- **Changes:**
  - `CatoCapitalismGame_FINAL.html` (~150 KB, 13:21), first named build.
  - `CatoCapitalismGame_v2.html` (~202 KB, 15:45), expanded content.
  - `CatoCapitalismGame_v3.html` (~628 KB, 15:47), large content + art expansion.
  - Reference art added: `auhocratic city.jpg`, `flat vector galtsgulch.jpg`,
    `socialist city.jpg`.

---

## 2026-06-12, Game-development reference library

- **Change:** Assembled a `skills-reference/` folder of game-dev reference docs to guide the
  build, `game-developer.md`, `ecs-patterns.md`, `performance-optimization.md`, `threejs.md`,
  `shader.md`, `modeling3d.md`, `cad.md`, `blender.md`, `davinci.md`, a `README.md`, and a
  combined `ALL-SKILLS-COMBINED.md` (~78 KB).

---

## 2026-06-15, Multiplayer co-op, classroom hosting, and cloud deploy

- **Direction:** Make the game playable together in a classroom, hosted online, with a teacher
  view of how every student is doing.
- **Changes, the `coop/` system:**
  - `coop/coop-server.js`, a zero-dependency Node.js server (http + os + fs only, no npm
    install). It serves the existing game file untouched, injects a small co-op client, keeps
    every player's live state in memory, and serves the teacher dashboard. It auto-detects
    whether it's running locally (LAN, port 3000+) or in the cloud (binds to `PORT`).
  - `coop/coop-client.js`, injected into the served game: assigns each browser a player ID,
    streams game state (position, stats, avatar, emotes) to the host a few times a second, and
    renders the other players walking around the shared town with name + health bar.
  - `coop/dashboard.html`, live teacher leaderboard: a card per city (four health bars, house
    tier, vanity count, score, grade), sortable columns, world rename, updates every second.
  - `coop/join.html`, projector page with a big QR code + join link.
  - Local launchers: `Start Co-op Host (Mac).command`, `Start Co-op Host (Windows).bat`.
  - Docs: `coop/HOW-TO-HOST.md` (same-wifi hosting), `coop/DEPLOY.md` (GitHub → Render).
- **Direction:** Put it on the internet so anyone can join from any network with one link.
- **Changes, cloud deploy config:**
  - `render.yaml`, Render Blueprint (free web service, `npm install`,
    `node coop/coop-server.js`, `autoDeploy: true`).
  - `package.json`, name `cato-capitalism-coop`, `start` script, Node ≥18, zero dependencies.
  - `.gitignore`, node_modules, OS/editor cruft, `.env`.
  - Deployed live on Render at `https://cato-capitalism-coop.onrender.com` (auto-deploys on
    `git push`). Note: free tier sleeps after ~15 min idle (one slow wake), and the link is
    public.

---

## 2026-06-15, Open-world redesign + export/import (build `CatoCapitalismGame_v4.html`)

- **Direction:** Don't end on a "game over" screen, let players stay and keep governing.
- **Change:** Removed the end screen; reaching 0 on a stat no longer triggers game-over.
  Answering all 10 citizens rolls straight into a fresh term of 10 new questions, in the town.
- **Direction:** Let players save and restore their leader and progress.
- **Change:** Added avatar + progress **export/import codes** (round-trip restores avatar,
  name, stars, house, and items; bad codes rejected with a friendly message).

---

## 2026-06-15, QA Round 1: critical side-effects of removing the end screen

Recorded in `QA-Bug-Report.md` (build: live deploy, commit `3df8368`). Two simulated players
("Maya QA", "Theo QA") driven through every mechanic; no console errors anywhere, but two
serious logic bugs surfaced because important things used to happen only on the (now removed)
end screen:

- 🔴 **Stars could never be earned**, the only `stars +=` lived in `bankStars()`, called only
  from the removed results/game-over screens. The store and house upgrades were effectively
  frozen for all students.
- 🔴 **Score reset to 0 every term**, `continueTerm()` zeroed score/streak/counts, so the
  leaderboard score lurched back to 0 at each rollover.
- 🟠 The **educational payoff became unreachable** (ideology result, historical parallels,
  answer review, achievements, letter grade), and `computeGrade()` reset every term.
- 🟡 By-design notes: two tabs in one browser share a co-op ID (localStorage); background tabs
  throttle animation; export/import carries progress that didn't yet exist.

---

## 2026-06-15, Fixes + QA Round 2: star economy, cumulative score, performance grades

- **Direction:** Fix the bugs from Round 1.
- **Changes (verified live in Round 2):**
  - **Star earning + banking**, stars now accrue during the open-world loop and bank into a
    persistent total across terms; the store and house upgrades work again.
  - **Term recap**, a Term Report (ideology, history, review, grade, stars earned) now shows
    at each term end with a "Keep Governing →" button, restoring the educational payoff without
    a forced game-over.
  - **Cumulative `lifetimeScore`**, accumulates across terms; HUD and leaderboard read it.
  - **Performance grade system**, per-term **letter grades** (A–S/D…) plus a **lifetime grade**
    from the best-answer ratio across all terms; the co-op client reports both.
  - **Dashboard "Rank by" selector**, choose Lifetime or Term 1…N; re-ranks and re-labels the
    leaderboard and city cards; players who haven't reached a term show ", ". Choice persisted
    with scope labels.

---

## 2026-06-15, Classroom features + QA Round 3: clean full retest

- **Direction:** Add classroom engagement features.
- **Changes (all verified working in a full Round 3 retest, no bugs, no code changes needed):**
  - **Class-wide shared goal** on the dashboard.
  - **Buyable avatar emotes** (star store) that pop locally and relay to other players.
  - **Term champion** highlight on the co-op leaderboard.
  - **Building mini-games** awarding stars, Town Hall quiz (100⭐/correct), Market reflex
    (300/200/100), Bank memory match, each with a once-per-term cooldown that resets each term.
  - Full-game bug test + visual/map-continuity check across every system.

---

## 2026-06-17, QA bug report finalized

- **Change:** `QA-Bug-Report.md` saved (14:01) capturing Rounds 1–3 above, the critical
  findings, the fixes verified live, the "verified working" inventory, and the known by-design
  items.

---

## 2026-06-22, Grade-LEVEL reading difficulty + Cato-sourced charts (`CatoCapitalismGame_v4.html`)

> Note: this is a *different* "grade" feature from the June 15 performance grades. This one sets
> the **reading level** of the questions. Recorded in `GRADE-LEVEL-UPDATE-STATUS.md` (18:42);
> the v4 build saved at 15:18 (~900 KB).

- **Direction:** Make questions match a student's grade level, and ground them in real Cato data.
- **Changes:**
  - Replaced the Easy/Normal/Hard difficulty cards with a **Grade 6–12 selector**
    (`setGrade`, `GRADE_KEY`, default Grade 8). Grade changes question reading level/content,
    not game difficulty.
  - Made the question renderer **quote-optional** (`showFeedback`, `dlgPick`, the newspaper
    step, the links block) so questions without figure quotes/headlines render cleanly.
  - Built **per-NPC × grade question pools**, each of the 10 citizens owns a policy topic
    (trade, taxes, education, money/inflation, business/regulation, jobs/wages,
    property/environment, banking/saving, free speech, health care). `dealTerm`/`gradePool()`
    serve a grade-appropriate question per citizen, falling back to the original bank if a pool
    is empty. Grade-specific pools `QG[grade]` union with shared reading-band pools `QGB`
    (bands A=6–8, B=9–10, C=11–12 via `bandOf()`), ~100 questions per grade across all citizens
    (target ~700 total).
  - Added a small **bar-chart renderer** and attached **Cato-sourced charts** (`CATO_CHARTS`),
    **sourced quote cards** (`CATO_QUOTES`), and **"Learn More" Cato links** (`CHART_LINKS`)
    to matching questions.
  - QA across data structures, title/avatar/profiles, term loop/stars/grades,
    store/house/emotes/mini-games/learn, the grade selector, co-op/dashboard, and the minimap.

---

## 2026-06-24, Co-op rooms, mobile/iOS support, quick-chat, and mobile fixes

All of the following were done today, in this order. Files updated this session:
`coop/coop-server.js` (12,461 B), `coop/coop-client.js` (17,406 B, then again for quick-chat),
`coop/dashboard.html` (24,841 B), and `CatoCapitalismGame_v4.html` (mobile features + fixes).

### Two-tab co-op collision

- **Direction:** *"Is the co-op feature working? I am running two tabs with different avatars
  and the leaderboard is glitching out and I can't see both characters on the same world."*
- **Diagnosis:** both tabs shared one player ID via `localStorage`, so they collided (the
  by-design note from the June 15 QA, now hit in practice).
- **Change (`coop/coop-client.js`):** moved the player ID from `localStorage` to
  **`sessionStorage`** so each tab gets its own ID.

### Private class rooms with join codes

- **Direction:** *"Make a feature where a teacher can start a private world and gives a code for
  users to join to eliminate this issue."*
- **Changes:**
  - `coop/coop-server.js`, full **room system**: a `rooms` Map keyed by a 4-character code
    (`CODE_CHARS` excludes confusable characters like O/0, I/1); `getRoom`/`newCode`/`normCode`,
    per-room pruning of idle players, and a `POST /__coop/create` endpoint that returns a fresh
    code. `/__coop/sync`, `/__coop/state`, `/__coop/world`, and `/__coop/kick` are all
    room-aware. Players with no code share the default open "Class World" (MAIN).
  - `coop/coop-client.js`, reads the room from the `?room=` URL or sessionStorage, sends it on
    every sync, and adds a **join-code overlay UI** (Join / Cancel / Leave).
  - `coop/dashboard.html`, a **"▶ Start a Class"** button that creates a room and shows the
    big join **code** plus the student link (`/?room=CODE`), with Copy-link and New-code
    actions; the dashboard polls only its own room.

### iOS / mobile compatibility

- **Direction:** *"Make the game iOS compatible. I want users on phones/tablets to play without
  WASD and space. Add a joystick, tap the screen when close to an interactive site for NPCs and
  buildings, fit the game view to a tablet/phone screen, and distinguish computer vs. mobile."*
- **Changes (`CatoCapitalismGame_v4.html`):**
  - **Device detection**, `IS_TOUCH` via `ontouchstart` / `maxTouchPoints` /
    `matchMedia('(pointer:coarse)')`; adds a `touch` class to `<html>` so mobile-only UI is
    CSS-gated.
  - **On-screen joystick**, `#joystick` (base + knob) feeds a normalized movement vector
    `touchVec` consumed by the movement loop (`townTick`); `setupTouchControls()` binds the
    drag handlers.
  - **Tap-to-interact**, a context `#act-btn` (Talk / Shop / Home / Learn / Play / Quiz) that
    lights up near an NPC or building and calls `interactNearby()`, the same logic the spacebar
    uses. The in-world "press space" prompt is hidden on touch.
  - **Responsive layout**, town SVG given `preserveAspectRatio="xMidYMid slice"`, the view
    sized to the screen (`height:60vh`), `@media` tweaks for ≤820 px and ≤480 px, and the WASD
    hint replaced on touch by a mobile hint line.

### Quick-chat preset phrases (replacing free-typed chat)

- **Direction:** *"I don't like the talk feature; instead of being able to type anything, let me
  choose certain small sentences like Hi! and Bye!"* (Chosen approach: replace/extend the emote
  button.)
- **Changes:**
  - `CatoCapitalismGame_v4.html`, added a `PHRASES` list (Hi! 👋, Bye!, Good game!, Nice!,
    Thanks!, Help!, Follow me!, Yes!, No!, Haha!); the emote tray now shows a phrase row above
    the owned-emoji row. `sayPhrase(id)` pops a local speech bubble and broadcasts the phrase.
    Added `.speech-pop` styling.
  - `coop/coop-client.js`, `showRemoteEmote()` renders a **text speech bubble** when an emote
    is prefixed `say:` (otherwise the emoji), relayed over the existing emote channel, no
    server change needed.

### Full mobile QA pass + two fixes

- **Direction:** *"Run a final full-playthrough QA pass on a phone-sized viewport to catch any
  mobile layout issues."*
- **Verified live (390 px viewport):** title/leader-card/grade-selector layout; the joystick
  produces a correct normalized vector and walks the player; the Talk button lights up near an
  NPC and opens the question; the quick-chat tray + speech bubble work.
- **Fix 1, mobile hint overlap (`CatoCapitalismGame_v4.html`):** the bottom hint overlapped the
  floating "Join a class" button and clipped at the right edge. Shortened it to
  "🕹️ Drag to walk · tap the gold button to interact" and added side padding so the centered
  text clears both corners.
  `html.touch #town-mobile-hint{display:block;box-sizing:border-box;padding:6px 82px 2px 118px;line-height:1.35;}`
- **Fix 2, joystick covering answers (`CatoCapitalismGame_v4.html`):** the joystick overlapped
  the bottom answer card during a question. The joystick and action button now auto-hide
  whenever a dialog is open, on touch only.
  `html.touch .town-viewport:has(#dlg.open) #joystick, html.touch .town-viewport:has(#dlg.open) #act-btn{display:none!important;}`

### Minimap not rendering correctly on phones

- **Direction:** *"The map isn't loading well when I tested the app on my phone."*
- **Diagnosis:** the minimap shrinks to 104×70 px on mobile via CSS, but the JavaScript
  positioned the building markers and the player dot using a hardcoded **150×100 px** scale.
  With `overflow:hidden`, the right/bottom markers and the player dot were pushed outside the
  smaller box and clipped.
- **Change (`CatoCapitalismGame_v4.html`):** switched to **percentage-based positioning** so the
  markers and player dot scale to whatever size the minimap renders at.
  - Markers: `const sx=100/WORLD_W, sy=100/WORLD_H;` → `left:(m.x*sx)%`, `top:(m.y*sy)%`.
  - Player dot: `left:(player.x*100/WORLD_W)%`, `top:(player.y*100/WORLD_H)%`.

### Process / preferences noted today

- **Direction:** *"From now on when you give me links, give me Chrome links."* → Links are now
  given in the `googlechrome://` / `googlechromes://` scheme to open directly in Google Chrome.
- All GitHub uploads and deploys are done by the user: edits are made to the local files, then
  the user pushes to GitHub and Render auto-deploys. Each change this session was verified live
  on the deployed site after upload.

---

## 2026-06-25, 1v1 Star Duels (co-op wager challenges)

- **Direction:** *"Add a co-op feature where users can challenge each other to a 1v1 where
  they can wager a certain amount of stars, get asked 3–5 policy questions, and whoever answers
  the most libertarian-correct answers keeps the stars."*
- **Design decisions (from clarifying questions):** challenge by walking next to another player
  and tapping each other's avatar (mutual tap); **simultaneous race** (both answer the same
  questions at once); a **tie refunds** both wagers; the **challenger picks** the wager
  (250 / 500 / 1000⭐) and length (3 or 5 questions).
- **Anti-cheat choice:** the challenger's client serializes real questions **with** the answer
  key; the server stores and scores them but sends each client the questions **without** the
  `best` field, so the correct answer can't be read from network traffic.
- **Changes, `coop/coop-server.js`:**
  - Added a `duels` Map and a duel state machine: `newDuelId`, `duelForPlayer(room,id)`,
    `scoreDuel` (counts answers matching each question's `best`; more-correct wins, equal = tie),
    `duelView(d, viewerId)` (per-player view that strips `best` and only includes questions
    while the duel is `active`), and `pruneDuels` (expire pending after 35s, clear finished
    after 20s).
  - The existing `/__coop/sync` response now also returns the player's current `duel` view, so
    duel signaling piggybacks on the 160 ms sync loop (no extra polling).
  - New endpoints: `POST /__coop/duel/challenge` (creates a pending duel with wager + question
    payload; rejects if either player is already dueling), `/__coop/duel/respond`
    (accept → `active`, decline → `declined`), `/__coop/duel/answer` (records a player's letters;
    when both are in, calls `scoreDuel`), and `/__coop/duel/cancel`.
- **Changes, `coop/coop-client.js`:**
  - Remote avatars are now tappable (cursor + click/touchend → `onRemoteTap`).
  - `onRemoteTap` enforces proximity (must be within ~160 world px), guards against dueling
    while already in one, requires ≥250⭐, and, if the other player has already challenged you,     a tap on them counts as **Accept** (the mutual-tap flow).
  - Pulls real questions from the game's banks (`Q`, `QBANK`, `NEWQ1…6`), de-dupes, shuffles,
    and serializes N of them.
  - A self-contained duel overlay (its own styles, mobile-friendly) drives every phase from the
    sync `duel` field via a state machine (`none / incoming / waitingAccept / answering /
    waitingOpp / result / ended`): challenge dialog (pick wager + length), incoming
    accept/decline prompt, the simultaneous question screen, a "waiting for opponent" screen,
    and a win / lose / draw result.
  - On result, the client applies its own star delta once (winner +wager, loser −wager, tie 0;
    clamped at 0) via `P.stars`, then `saveProfiles()` + `updateBankUI()` + `updateScoreHUD()`.
  - `beforeunload` also cancels a pending challenge you sent, so a closed tab doesn't leave a
    stuck invite.
- **Verification:** server duel logic unit-tested (winner selection, tie, `best` stripped,
  `duelForPlayer`) and the full lifecycle simulated (challenge → accept → both answer → settle)
  with correct ±wager deltas; both edited files syntax-checked in isolation (the OneDrive mount
  was serving stale copies, so isolation was used as before).
- **Deploy hiccup (resolved):** the first uploads committed the two files to the **repo root**
  instead of the `coop/` folder, so the server kept running the old copies. Re-uploading into
  `coop/` fixed it.
- **Verified live (2026-06-25):** against the deployed server, ran the full flow, challenge →
  opponent's sync receives the pending invite (no questions/answer-key leaked) → accept sends
  both players the questions with `best` stripped → both submit → settles with the correct
  winner and score (3 vs 1, not a tie). Feature is live.

---

## 2026-06-25, Duel extras (proximity hint, win/loss record, result animation)

- **Direction:** after the duel feature shipped, add: a "⚔️ Tap to challenge" hint when standing
  next to a player, a duels won/lost stat on the teacher dashboard, and a richer win/lose
  result animation. (Declined for now: a rematch button.)
- **Changes, `coop/coop-client.js`:**
  - **Proximity hint:** each remote avatar now carries a hidden `⚔️ Tap to duel` pill; the render
    loop finds the nearest player within range (~160 world px) and shows the hint over them,
    hidden while you're already in a duel. Gentle CSS pulse (`coopHintPulse`).
  - **Win/loss record:** on settle, the client increments `P.duelWins` / `P.duelLosses` and adds
    the pot to `P.duelStarsWon` (persisted via `saveProfiles`), and reports all three in
    `gatherState` so the dashboard sees them.
  - **Result animation:** a win fires a CSS confetti burst + a title "pop"; a loss does a red
    flash on the result card (sound was already wired: win/lose/tie cues).
- **Changes, `coop/coop-server.js`:** `publicList` now passes `duelWins` / `duelLosses` /
  `duelStarsWon` through to the dashboard.
- **Changes, `coop/dashboard.html`:** added a sortable **⚔️ Duels** column showing each
  student's record (e.g. `3W / 1L`, with stars-won in the cell tooltip).
- **Verification:** all new fragments (hint SVG/CSS, confetti, win/loss accounting,
  dashboard cell + sort) syntax-checked in isolation. **Verified live (2026-06-25):** the
  deployed client carries the confetti + "Tap to duel" hint, the dashboard shows the ⚔️ Duels
  column, and the record data path works end to end (a reported `3W / 1L` + 2,500⭐ flows through
  the server into the dashboard).

---

## 2026-06-25, Bigger map + neighborhoods, shops, and city districts

- **Direction:** *"Make the map 4 times bigger and add more homes, shops (with no utility
  features), and other normal town/city buildings. Also make the user's home in a neighborhood
  and not away from everyone else."*
- **Decisions (from clarifying questions):** **4× each side → 16× area** (1800×1200 → 7200×4800);
  keep the home roughly where it is but **wrap it in a neighborhood** of houses.
- **Changes (`CatoCapitalismGame_v4.html`):**
  - `WORLD_W/H` set to **7200×4800**. Camera clamp, night overlay, and the percentage-based
    minimap all key off these, so they scale automatically. Player still spawns at (900,700) in
    the downtown core; all functional buildings (Market, Home, School, Bank, Town Hall, Press)
    and the 10 citizens stay exactly where they were, so every interaction spot keeps working.
  - Increased the grass-texture pass to cover the larger map.
  - Added **`buildExpansion(tiers)`** (appended in `buildWorld`) that lays down ~176 new
    **decorative, non-interactive** buildings plus parks and connecting roads:
    a neighborhood wrapping the player's home (houses around it, extending south), an east
    residential grid, a decorative **shopping street** (CAFÉ, BAKERY, BOOKS, TOYS, DINER, GYM,
    FLORIST, BARBER, GROCER, PIZZA, visual only), an office/business cluster, two large far
    residential neighborhoods, a mixed far-east block, scattered parks, and trees framing the
    edges. New buildings are solid (collision via the existing `urban`/`reg` helpers) but have
    no shop/home/learn functionality.
  - Added 7 **minimap district markers** (🏘️ neighborhoods, 🛍️ shops, 🏢 offices) so the
    larger world is legible on the mini-map.
- **Verification:** `buildExpansion` syntax-checked and run in isolation (returns a valid SVG
  string, generates 176 buildings); minimap marker array validated. **Verified live
  (2026-06-25):** deployed game is 1.24 MB (full question set intact) with `WORLD_W=7200`,
  `buildExpansion`, the CAFÉ shopping street, and the new 🏘️/🛍️/🏢 minimap markers; the town
  renders with no console errors, movement + camera follow across the larger map, and functional
  buildings still trigger (e.g. the Bank "SPACE · Bank Game" prompt).
- **Note (file divergence resolved):** the bash mount was showing a stale 899 KB snapshot of the
  game file while the real/deployed file is 1.24 MB (it carries the full grade-leveled question
  pools). Edits via the file tools landed in the real file, so nothing was lost; the mount size
  is just unreliable for this large OneDrive-synced file.

---

## 2026-06-25, Centered downtown, half-size map, cohesive roads, detailed shops

- **Direction:** *"Shrink the map by half. Have the main downtown center be the middle of the
  map, not the top-left corner. Roads that connect in a complex yet cohesive way. Make the shops
  have more detail to what they actually are."*
- **Changes (`CatoCapitalismGame_v4.html`):**
  - **Half size:** `WORLD_W/H` → **3600×2400** (down from 7200×4800).
  - **Downtown centered (no mass coordinate rewrite):** added `CORE_DX/DY = (900,600)`. The core
    is authored at top-left coords; it's now rendered inside `<g transform="translate(900,600)">`,
    and `reg()` adds `REG_DX/DY` so collision boxes line up with the shifted render. The
    interaction spots (`SHOP/HOME/BANK/HALL/SCHOOL_SPOT`), `NPC_POS`, the player spawn (now
    1800,1300, map center), the foreground-tree and night-glow layers, the fountain particle
    FX, and the core minimap markers are all offset by the same amount. Net effect: downtown sits
    in the middle of the map with everything (render, collision, interactions) consistent.
  - **Cohesive road network:** rebuilt in `buildExpansion`, a **ring road** encircling downtown,
    four **cardinal radial avenues**, four **diagonal radials** to the corners, two horizontal
    **cross-streets**, and a west neighborhood street. Complex but legible, all tied to the
    central roundabout.
  - **Detailed shops:** new `detShop(x,y,kind)` renders distinct themed storefronts, café 🥐,
    bakery, bookshop 📚, toy shop 🧸, grocer 🥦, pizzeria 🍕, ice cream 🍦, florist 🌸, barber 💈,
    diner 🍔, music 🎵, hardware 🔨, each with a striped awning, an emblem, a colored body, and a
    readable name sign. An east shopping district uses them; a few also appear in the north
    district. (Still decorative / non-interactive, as before.)
  - **Districts** repositioned around the centered core: west residential (the home's
    neighborhood), south residential, north offices+shops, east shopping street, four corner
    clusters, and parks, ~61 buildings, denser to suit the smaller map. Minimap markers updated.
- **Verification:** `detShop` + `buildExpansion` syntax-checked and run in isolation (61
  buildings); offset math confirmed. **Verified live (2026-06-25):** deployed game has
  `WORLD_W=3600` + `detShop`; the minimap shows downtown centered with roads radiating from the
  central roundabout; the player spawns in the center; functional buildings render and trigger
  in their shifted positions (Bank, bridge/river crossing work, collision aligned); and all 12
  detailed shop types render (names + emblems confirmed in the live town SVG).
- **Note:** the GitHub contents-API kept showing a cached pre-upload copy briefly; the live
  served game is the source of truth and confirmed the new build. The recurring OneDrive lag
  (uploading a not-yet-synced local copy) required one re-upload, as before.

---

## 2026-06-25, Map polish: connected street grid, road-fronting buildings, clean props, better art

- **Direction:** *"Roads aren't connected / look bad, put roads in front of every shop/home and
  connect them with no inaccuracies. Houses/lights/trees/lamps are on roads or on top of each
  other, fix. Building designs look weird, keep improving."* (Preceded by a requested
  walk-through to surface other issues.)
- **Walk-through findings (before fixing):** no street ran in front of buildings (they sat on
  bare grass; east shops had no road at all); the ring/radials had gaps; trees/benches sat on
  the road in the north; lamps/benches were scattered randomly on grass; houses were plain boxes.
- **Changes (`CatoCapitalismGame_v4.html`, `buildExpansion` fully rewritten):**
  - **Connected street grid:** replaced the ring/radial scheme with a rectilinear grid of
    straight segments, full-height side spines, full-width top/bottom streets, side-margin
    streets, a downtown loop around the core, and loop→core connectors. Because every street is
    a straight H/V line they all intersect, so the network is fully connected with no gaps.
  - **Road in front of every building:** buildings are now placed in rows set just above each
    street (facing it), with intersections kept clear (rows skip positions near a cross-street).
    ~75 buildings, all street-fronting: west homes (your neighborhood), an east shopping street,
    south homes, and a north office + shop strip.
  - **Clean prop placement:** trees/lamps/benches are scattered by a **keep-out check**,     `nearRoad()` + `onBldg()` + spacing + a core-exclusion, so nothing lands on a road, on a
    building, or inside downtown. Verified in isolation: 0 props overlapping a building, 0 inside
    the core.
  - **Better building art:** new self-contained renderers, `expHouse` (pitched roof, door with
    knob, two windows, shadow), `expShop` (colored body, name board, striped awning, display
    window with emblem, door), `expOffice` (multi-floor window grid, flat roof, entrance).
    Replaces the old plain `urban()` boxes for expansion buildings.
- **Verification:** new helpers + `buildExpansion` syntax-checked and run in isolation (75
  buildings, 62 props, asserted no prop overlaps a building or sits in the core). **Verified live
  (2026-06-25)** by walking every district: east shops, west homes, south homes, and the north
  office/shop strip all front clean street grids; props sit on grass (none on roads or buildings);
  the new building art renders well; the central spine connects the new grid into downtown; only
  the benign browser-extension console notices appear (no game errors).

---

## 2026-06-25, Map polish round 2: gap, density, shopping street, spread-out citizens

- **Direction:** close the downtown↔grid gap; fill the empty blocks; polish the shopping street;
  and *"make the new additions have purpose by moving the NPCs around the map more."*
- **Changes (`CatoCapitalismGame_v4.html`, `buildExpansion` + `NPC_POS`):**
  - **Gap closed:** the downtown loop now hugs the core (x900/2700, y620/1780) instead of sitting
    out in the grass, with four connector roads linking the loop to the central roundabout, the
    grid now meets downtown with no grass strip.
  - **Blocks filled:** side-margin streets densified (7 streets per side) and a building row sits
    above each, so the west homes and east district roughly doubled, **~104 expansion buildings**
    now (up from ~75). Prop scatter density increased and **flower planters** added to the mix,
    so blocks read green and full rather than empty.
  - **Shopping-street polish:** benches, flower planters, and lamps placed along the east
    storefronts.
  - **Citizens spread out:** the 10 question NPCs were moved out of downtown and **distributed
    across every district** (downtown, west neighborhood, east shops, south homes, north) so the
    player must explore the whole map each term, giving the new areas a real purpose. Placed on
    walkable road/grass spots clear of buildings.
  - All prop placement still goes through the keep-out check (no props on roads/buildings/core).
- **Verification:** isolation run, 104 buildings, 157 props, asserted 0 props overlap a building
  and 0 sit in the core. **Verified live (2026-06-25):** downtown roads connect into the grid (no
  gap); west & east districts are dense with road-fronting houses/shops; the east shopping street
  has benches/flowers/lamps; citizens are spread across districts and reachable, an east-district
  NPC's "SPACE · Talk" prompt opened its policy question (term loop works with spread NPCs).

---

## 2026-06-25, Faster walking + citizen markers on the minimap

- **Direction:** *"yes both"*, bump walk speed and add citizen (💬) markers to the minimap, now
  that the 10 NPCs are spread across the full map.
- **Changes (`CatoCapitalismGame_v4.html`):**
  - **Walk speed** raised from `GFX.speed 5 → 8.5` (~70% faster; applies to keyboard and the
    mobile joystick).
  - **Citizen markers:** `buildMinimap` now adds a 💬 marker at each citizen's position; the tick
    loop updates them ~4×/sec to follow the NPCs' slight wander and **hides a citizen's marker
    once you've answered them**, so the minimap always shows who's left to find. New `.mm-npc`
    style with a drop-shadow so the markers read against the map.
- **Verification:** marker-build + tick-update logic checked in isolation (answered citizen
  marker hides, unanswered stays visible). **Verified live (2026-06-25):** `GFX.speed=8.5`; the
  minimap shows 10 💬 citizen markers spread across the map (all visible at term start).

---

## 2026-06-25, Graphics walk-through + small speed trim

- **Direction:** walk the world checking for graphics inaccuracies; lower the walk speed a touch.
- **Walk-through (live):** surveyed downtown, the north office/shop strip, west & south
  residential, the east shopping street, the SE corner, and the core↔grid seams (home/pond,
  north connector). Result, clean: buildings front the streets, props are all on grass, no
  building overlaps or z-order glitches, citizens spread with 💬 markers. Only minor nit: the
  north connector road ends in a short stub near the town hall (capped intentionally so a road
  doesn't draw through the hall), harmless.
- **Change (`CatoCapitalismGame_v4.html`):** `GFX.speed 8.5 → 7.2` (small reduction).

---

## 2026-06-25, Teacher-authored class questions (post → students answer for stars)

- **Direction:** make the teacher role more interactive, let the teacher write their own
  question on the leaderboard page, post it to the room, and have every student answer it for
  stars, to tie in-class ideas to the game.
- **Decisions (from clarifying questions):** teacher chooses the style per question, **multiple
  choice** (auto-graded: correct = stars) **or short answer** (teacher reviews each and clicks
  Award/No); **fixed reward** of ⭐250; each student answers **once while it's live**.
- **Changes, `coop/coop-server.js`:** per-room `tq` (teacher question) with style/text/choices/
  correct/reward/responses. Endpoints `tq/create`, `tq/answer` (MC auto-grades; short stays
  pending), `tq/decide` (teacher awards/denies a short answer), `tq/end`. Sync returns a
  student view (with `correct` **stripped** so it can't be read off the wire); `/__coop/state`
  returns the full question + responses for the dashboard.
- **Changes, `coop/dashboard.html`:** a **📣 Class Question** panel, pick MC or Short, type the
  question (+ MC choices with a "correct" radio), Post. When live it shows the question, a tally
  (MC: answered/correct) or the list of short answers with **Award ⭐250 / No** buttons, and an
  **End question** button. (Form renders once so typing isn't wiped by polling.)
- **Changes, `coop/coop-client.js`:** when a question is live and unanswered, a pulsing
  **"📣 Class Question, tap to answer"** banner appears in-game; the answer overlay shows MC
  choice buttons or a short-answer textarea. MC correct auto-awards ⭐250; short answers show
  "submitted, your teacher will review," and when the teacher approves, the student's client
  applies ⭐250 once (with a toast). Answer-once enforced.
- **Verification:** TQ logic unit-tested; client + dashboard pass full `node --check`; and the
  **whole flow was simulated against the real server running locally**, MC create→answer→
  auto-award, `correct` not leaked, re-answer blocked, short answer pending→approve→award, and
  the dashboard sees responses. **Verified live (2026-06-25):** posted an MC question via the
  dashboard path; in-game the "📣 Class Question" banner appeared, the answer overlay rendered the
  question + choices, answering correctly showed "✓ Correct! +⭐250" and the balance went
  1,420 → 1,670 (P.stars confirmed).
- **Follow-up fix:** the in-town star badge (`town-score`) only refreshed on a full re-render, so
  it lagged after a star award. Added `refreshStarBadges()` (updates `town-score` + `score-val`
  immediately) and used it for both teacher-question and duel awards. (Re-upload `coop-client.js`.)

---

## 2026-06-25, Map fixes: no buildings on roads, cleaner connections, unique shops

- **Direction:** houses still over roads; roads not 100% connected realistically; shops repeat
  (multiple diners), don't duplicate shop types.
- **Changes (`CatoCapitalismGame_v4.html`, `buildExpansion`):**
  - **No buildings on roads:** the row placer's keep-clear margin around cross-streets widened
    from 60→92 px (≥ building-half + road-half), and the loop verticals (x900/2700) added to the
    keep-clear list so rows skip any slot that would clip a perpendicular road. North office
    heights capped to 2–3 floors so they don't poke into the street above. Verified: 0
    building-on-building overlaps; clearances satisfy the road math.
  - **Cleaner road connections:** replaced the old loop→core links (one ran straight through the
    town hall) with connectors routed through the gaps between core buildings that join the loop
    to downtown's actual road ends.
  - **Unique shops:** all 12 shop types now placed **exactly once** in the east shopping district
    via a single `SHOPKINDS` pool (`nextShop()` hands out each kind once; leftover slots become
    houses). The north district is now **offices only**, so no shop type repeats anywhere.
- **Verification:** isolation run, 61 buildings, exactly 12 shops with **no duplicate kinds**, 0
  building overlaps; full game script passes `node --check`. **Verified live (2026-06-25):** east
  shops all distinct (each of the 12 names appears exactly once, confirmed in the rendered SVG);
  south rows and the spine road show clear gaps between houses and roads; the loop→downtown
  connectors reach the Town Hall beside the road (no more road-through-the-hall). The
  `coop-client.js` star-badge instant-refresh fix is also live.

---

## 2026-06-25, Road overhaul near downtown: river/bridge, pond, and core seams

- **Direction:** roads look overlapping / curves morphed; the bridge road and a road going through
  the river need fixing; the pond by the house is messed up; and the road by the three upper-left
  downtown houses is wrong.
- **Root cause:** the loop→core connector roads I'd added were drawing **over core content**, one
  crossed the **river** with no bridge, one ran through the **pond**, and two cut past the **three
  upper-left houses**, and the loop's top/bottom clipped the river.
- **Changes (`CatoCapitalismGame_v4.html`, `buildExpansion` road grid):**
  - The downtown **loop now stays west of the river** (right edge x2400), so its top/bottom no
    longer clip the water.
  - Added a single **bridge road** (`HR(1337,2400,2760)`), the **only** crossing over the river,
    sitting on the existing bridge, plus an **east-of-river arterial** (`VR 2760`) that the east
    shopping streets connect to.
  - **Removed** the connectors that overlapped the pond / the three houses / the river; replaced
    them with two clean **avenues into downtown at x2000**, routed through the open gap between the
    hall/fountain and the school/bank (verified clear of buildings), plus one west link.
  - East shops shifted to start east of the new arterial (x2820) and the polish props moved clear
    of it.
- **Verification:** full game script passes `node --check`; isolation run, 57 buildings, 12
  unique shops (no dups), 0 building overlaps. **Verified live (2026-06-25):** the river is crossed
  only by the bridge (clean continuous road, no road through the water); the pond by the house is
  clean (no road through it); the three upper-left downtown houses sit on open grass with the
  avenue routed clear; downtown roads no longer pile up. (Also saw a 2nd live player with the duel
  hint, co-op intact.)

---

## 2026-06-25, Road network cleanup (caps, block size, downtown simplification)

- **Direction:** after a full-map screenshot review, the roads "poorly overlap." Fix: crisp caps,
  bigger blocks, continuous grid, simplified downtown.
- **Diagnosis (from a 9-region + overview screenshot sweep):** rounded end-caps made every street
  end/junction bulge into "blobs"; the side-streets were too closely spaced (cramped); and the
  straight grid avenues clashed with the core's curvy radial roads at the roundabout.
- **Changes (`CatoCapitalismGame_v4.html`):**
  - `roadsSVG(list, cap)` now takes a cap style; the **expansion grid is drawn with `butt`
    (flat) caps + miter joins** → crisp ends and clean intersections (no blobs). The core's
    curvy roads keep `round` caps.
  - **Wider blocks:** side streets spaced ~240px (`SIDE=[620,860,1100,1340,1580]`, 5 not 7);
    removed an east vertical so east blocks are larger too.
  - **Simplified downtown:** removed the straight avenues that clashed with the core's curves;
    the loop is the clean boundary and the core's own roads serve downtown (one short link kept).
- **Verification:** full game script passes `node --check`; isolation, 58 buildings, 12 unique
  shops (no dups), 0 building overlaps. **Verified live (2026-06-25)** with the same full-map +
  region screenshot sweep: grid intersections are now crisp flat crossroads (no round blobs),
  blocks are noticeably wider/less cramped, and downtown reads as the core's curvy roads radiating
  from the roundabout with no clashing straight avenues. Shops still unique; buildings front roads.

---

## 2026-06-25, Denser, prettier town (fill neighborhoods + upgraded building art)

- **Direction:** fill the neighborhoods with more buildings so it looks like a real town, and
  spruce up the building graphics for a better look & feel.
- **Changes (`CatoCapitalismGame_v4.html`):**
  - **Fill:** the row placer now takes a side offset, and residential streets are lined on
    **both sides** (north + south). Building count went **58 → 112**, west & south neighborhoods
    and the east district are now fully built up on both sides of every street (shops stay unique
    on the north side, homes on the south). North stays single-row offices (they're tall).
  - **Upgraded art (every expansion building):**
    - **Houses:** shaded wall side for depth, a pitched roof with a shaded slope + a chimney, a
      door with a stoop/step and knob, and proper framed windows (glass with a highlight, muntins,
      and a sill) via a new `expWin()` helper.
    - **Shops:** shaded wall, a sign board with a drop-shadow, a scalloped awning, a framed
      display window with the emblem, and a door with a knob.
    - **Offices:** shaded side, a parapet + rooftop unit, framed window grid with lit windows, and
      an entrance with a canopy.
  - Removed the dedicated shopping-prop row (now that both sides are built up); the keep-out prop
    scatter fills the remaining grass/block interiors.
- **Verification:** full game script passes `node --check`; isolation, 112 buildings, 12 unique
  shops (no dups), 0 building-on-building overlaps. Pending live full-map review.

---

## 2026-06-25, Revamp the original (core) buildings to match the new art

- **Direction:** revamp the original downtown buildings too (they still used the old flat style).
- **Changes (`CatoCapitalismGame_v4.html`, shared core renderers):**
  - **`winGrid()`** (used by every core building, Town Hall, Bank, School, Market, Press, your
    Home, core houses): windows are now **framed** (cream frame + glass with a top highlight +
    vertical/horizontal muntins), still tier-aware (dark & sparse under autocratic, warm-lit under
    free-market).
  - **`urban()`**: added a soft top-light band on the body (keeps the existing side shade) for
    depth across all core buildings.
  - **Core houses (`bHouse`)**: added a **pitched roof** (with a shaded slope) so the downtown
    houses match the upgraded town homes; the chimney/smoke sits on the roof.
  - Civic landmarks keep their flat rooftops + signs (architecturally right for hall/bank/school/
    market/press), but now share the upgraded windows + shading. The player Home keeps its
    per-upgrade-tier topper design.
- **Verification:** new `winGrid`/`urban`/`bHouse` fragments syntax-checked and run for free &
  autocratic tiers. **Verified live (2026-06-25):** downtown, Town Hall, School, and Bank now show
  framed, glowing windows + wall shading; the core houses now have pitched roofs + chimneys +
  framed windows, matching the upgraded town homes. (Required one re-upload due to OneDrive sync
  lag, then deployed.)

---

## 2026-06-25, Detailed building art pass: no overlaps, no floating roofs, clear of roads

- **Direction:** better graphics for *all* buildings; nothing should overlap that wouldn't in real
  life (e.g. doors must not overlap windows); roofs must not float; and **no building may touch a
  road**.
- **Building art rebuilt (`CatoCapitalismGame_v4.html`):**
  - **Houses (`expHouse`)** redrawn with an explicit layout, wall + foundation strip + right-side
    shade; a pitched roof whose base **overlaps the wall top** with an **eave board over the seam**
    (so the roof reads as resting on the wall, never floating) + ridge line + a chimney that sits
    *on* the roof; door centered low; two framed windows flank it in the upper wall.
  - **Shops (`expShop`)** now put the **display window on the left and the door on the right, side
    by side** (they used to be stacked, which read as overlapping), under a sign board + scalloped
    awning, with a foundation strip.
  - **Offices (`expOffice`)** get a parapet + rooftop unit that sit on the roof, a framed window
    grid, and the **two ground-floor center window cells are omitted** so the entrance + canopy have
    clear space.
  - **Core renderers (`winGrid`/`urban`)**: `winGrid` now takes a door-zone and **skips the
    ground-floor windows that sit where the door is**, so Town Hall / Bank / School / Market / Press
    / Home / core houses no longer have a window behind the door. *(Entry was cut short here in the
    original log; recovered 2026-07-07.)*

---

## 2026-07-07, Real-physics pass: avatar, clouds, water, day/night, ambient props

- **Direction:** make movement and the environment behave like the real world instead of looping
  canned animations.
- **Avatar (`townTick`/`playerSVG`):** smoothed facing (the body pivots through turns instead of
  snap-flipping), a small torso lean into horizontal acceleration, idle breathing at rest, and a
  contact shadow that shrinks/lightens as the body rises in each stride.
- **Clouds (`buildClouds` + wind pass):** replaced fixed CSS drift loops with a JS wind system —
  5 clouds ride one shared gusting wind (two slow sine waves summed), higher clouds move faster
  (wind aloft), puffs billow over ~17s, ground shadows stay pinned, wrapped clouds re-enter at a
  new latitude.
- **Water:** pond ripple rings that expand and fade (energy over a growing circle) + twinkling sun
  glints; ducks paddle/bob with a trailing wake; river current became a seamless sliding dash
  pattern (`.riverflow`, no snap-back) at two speeds; fountain spray pulses with pump pressure.
- **Day/night:** dusk/dawn now pass through golden-hour amber and violet twilight (`lerpHex` over
  the night tint), lamps fade in only at true darkness (with a subtle per-lamp flicker), the whole
  scene loses brightness/saturation at night.
- **Props/details:** chimney smoke rises, expands, and shears downwind; small skeins of birds glide
  across by day; three SVG transform-origin bugs fixed (`transform-box:fill-box` on smoke/ducks so
  CSS animations don't fight positional transforms).
- **Verification:** in-browser on the live deploy — 0 console errors, cloud altitude differential
  measured (higher cloud moved 40% farther in 5s), lean/turn/shadow live-inspected, dusk `#774c62`
  → midnight navy with lamps at full. 33fps steady.

---

## 2026-07-07, Seven "more life" systems: NPCs, weather, windows, river, traffic, footsteps, seasons

- **Direction:** approve-all on the recommendation list from the physics pass. Why it matters: the
  NPCs were the stiffest thing on screen and the world had no weather, traffic, or nightlife —
  these seven systems are what make the town read as a living place between quiz questions rather
  than a static backdrop.
- **NPCs:** walk-cycle bob, face travel direction (speech bubbles stay unmirrored via a separate
  `npc-body-N` group), pause-and-greet when two citizens pass close by day, hurry in rain, head to
  their home anchor and rest at night.
- **Weather (`WX` + `wxTick`):** rain fronts every few minutes; storm ramps in over ~10s — clouds
  darken, light goes slate, 30-streak rain pool, ground splashes, puddles fill along streets and
  dry slowly after. Skipped on low-power devices.
- **Windows:** every `url(#glass)` pane gets its own dusk threshold → the town lights up window by
  window at dusk and in dark storms (swap to `url(#glassLit)`).
- **River life:** drifting log (fast, shallow draft), rowboat with rower (slow), 2 river ducks —
  all carried downstream with eddy sway, wrapping upstream.
- **Traffic:** 4 cars on the two long east-west streets; cruise at individual speeds, brake
  smoothly for the player in-lane ahead, flip at road ends, headlight beams at dusk/in rain.
- **Footsteps:** splash when ground is wet, grass flecks ~30% on turf, dust otherwise.
- **Seasons (v1):** slow year; canopies amber-up in autumn (runtime tint of the shared `#treeD`
  defs + fg-layer), leaves fall 2× and turn orange.
- **Verification:** live — braking measured 2.00→0.00 with player in lane, log drifted 167px/5s,
  36/45 windows lit at na=0.72, storm at 1.0 with all effects. 0 console errors.

---

## 2026-07-07, Full four-season cycle: spring rain + wildflowers, winter snow accumulation

- **Direction:** "make the complete season cycle at 10 min, also let snow accumulate on the ground.
  Add spring (make it rainy with lots of wild flowers), and add winter."
- **Season engine (`seasonNow`):** 600s year in four quarters; each season's strength is a triangle
  peaking at its center, crossfading linearly into neighbors (weights always sum to 1 — verified
  numerically across the whole year).
- **Spring:** showers ~3× as frequent, 90 wildflowers in 5 colors fade in (drawn under the
  road/building layers so blooms never sit on pavement; river corridor excluded), fresh-green
  canopies, falling particles become pink blossom petals. Spring warmth drives the snow melt.
- **Winter:** fronts snow instead of rain (slow wandering flakes); **snowpack accumulates** on a
  ground-level white layer (roads stay plowed) and persists between storms; canopies snow-dust
  white; leaf fall stops; hard freeze (`.frozen`) locks the pond and winterizes the fountain.
- **Order change (same day):** year now **starts at mid-spring** and runs spring → summer → autumn
  → winter, repeating (offset 0.375 → 0.125).
- **Verification:** live — warped the clock to each season; snow 0→1 over ~18s of snowfall, melt
  1→0.54 in 8s of spring while wildflowers faded in at 0.42; 57.5fps; 0 console errors.

---

## 2026-07-07, Named citizen roster + gender-matched appearances

- **Direction:** fixed names, identical every term: Ben, Daire, Anna, Jessie, Tanisha, Sam,
  Valentina, Cortez, Teddy, Trenton. Ben/Daire/Sam/Cortez/Teddy/Trenton male; Anna/Jessie/Tanisha/
  Valentina female.
- **Change:** `CIT_NAMES` replaced (names are keyed to fixed map positions, so they persist across
  terms by construction); `NPC_CFG` re-styled — Ben short hair + cap (was long hair + flower),
  Jessie long hair + glasses (was buzz cut + beard; keeps the professor persona), Tanisha ponytail
  + flower, Teddy short hair (was bun). Dialog placeholder updated.
- **Verification:** live — dialog names checked in-game (Ben, Jessie); full 10-citizen config dump
  matched the intended looks.

---

## 2026-07-07, QA audit rounds 1 & 2 (agents + live map walk): 11 defects found, 11 fixed

- **Round 1 (2 code-audit agents + visual walk):** (1) river traffic drew **over** bridges → items
  now drawn before railings; (2) river ducks' swim arc left the water → repositioned;
  (3) "frozen" ducks/boat kept drifting in winter → ducks migrate, boat docks (log keeps drifting;
  rivers flow under ice); (4) pond/fountain stayed liquid blue in a hard freeze → ice sheet with
  cracks fades in over 3s (`.pond-ice`); (5) butterflies flew in rain/winter, fireflies in
  midwinter, birds in snowstorms → all season/weather-gated; (6) brown footstep dust on snow →
  dust whitens with snowpack, grass flecks stop; (7) NPC snap-flip on turn → smoothed facing.
- **Round 2 (fresh agents, lifecycle/z-order/CSS focus):** (8) weather leaked between games (snow
  on a fresh spring start) → `startGame` resets `WX`; (9) world froze during building placement
  (ambient passes halted then snapped) → `PLACE` early-return moved below the wind/ambient/lighting
  passes; (10) duck **wake** still grazed the bank by 5px at worst case → ducks moved to channel
  center (worst case now exactly the waterline); (11) static ripple rings showed through the ice →
  ripples/glints fully hidden when frozen.
- **Verification:** all fixes live-verified in-browser (weather reset test, frozen-pond inspection,
  computed duck extents, console clean).

---

## 2026-07-07, Unified road network: one pavement, no overlapping lines

- **Direction:** "blend all the roads together so there are no awkward overlapping lines. Fix every
  road on the map."
- **Root cause:** roads drew in three separate batches (downtown curves, roundabout, street grid),
  so wherever batches met, one road's curb stroke crossed another's asphalt.
- **Rebuild (`roadGrid`/`CORE_ROADS`/`roadsUnified`):** all 34 roads now paint in shared passes —
  ALL curbs → ALL asphalt → ALL centerlines — so no curb can sit on another road's surface. The
  roundabout joins the passes (new curb ring; surface laid last so radiating centerlines never poke
  into the circle). **54 junction boxes**: plain asphalt patches over every grid crossing, so
  centerlines stop at intersections like real markings. The grid geometry is shared (`EXP_RG`) with
  `buildExpansion` for building keep-outs; `ROAD_RECTS` set in `buildWorld`.
- **Bridges:** the unified layer sits under the river, so each of the 6 crossings re-lays a short
  deck (same curb+asphalt geometry → invisible seams; no centerline, like real bridges). Deck draws
  after the log/boat/ducks, so river traffic passes beneath; railings stay on top.
- **Verification:** live — roundabout, loop corners, grid intersections, and bridges all screenshot-
  checked; DOM count 40 curb paths = 34 roads + 6 decks; a car crossed a deck and a duck passed
  under another during the check. 0 console errors.

---

## 2026-07-07, Small polish: static cloud spots removed + fairgrounds label auto-hides

- **Static clouds removed:** three near-opaque white ellipse clusters (over the school, Town Hall,
  and the top-left houses) drew at top town tier — pre-dating the wind-driven cloud system and
  reading as stuck "white spots." Deleted; the drifting clouds own the sky now. **User-verified
  gone on the live deploy.**
- **Fairgrounds signpost:** the "🎡 FAIRGROUNDS 🎢 / open build land" text now only renders while
  the bottom band is empty — building the first attraction there hides it for good (checked via
  `ownsAttraction` + placement positions at world build).

---

## 2026-07-07, Build anywhere you own + the downtown city center opened for building

- **Direction:** a chain of related requests: first "let people place newly acquired buildings
  wherever they please (any open space that fits)," then the guardrail "make sure you can't place
  buildings on land you don't own yet," and finally "allow building in the main city center."
- **Changes (`CatoCapitalismGame_v4.html`, `placeZones`/`canPlaceAt`):**
  - Placement is no longer limited to the bottom Fairgrounds band. `placeZones()` now returns the
    Fairgrounds + the downtown city center + every district the player has actually bought.
  - `canPlaceAt` requires the building's whole ground footprint (left, center, right of the base)
    to sit on owned land, so a building can't overhang land that is still for sale.
  - The downtown city center is now an always-owned build zone (the player starts owning downtown),
    so buildings can go in the open plaza and street gaps of the core. Roads, water, and existing
    buildings are still blocked by the collision checks, so you can only drop into genuine gaps.
  - Blocked-state button now reads "Move onto land you own."
- **Why it matters:** gives players real freedom in where the city grows while keeping the "you have
  to own the land first" economic lesson intact.
- **Verification:** live in-browser on a no-districts profile: only the Fairgrounds + city center were
  buildable and all four districts stayed locked; placed a Botanical Garden in the core and confirmed
  it rendered; every existing core building and road correctly blocked placement.

---

## 2026-07-07, "Home" button: return to the leader-selection screen mid-game

- **Direction:** add a back-to-home / avatar-selection feature.
- **Changes (`CatoCapitalismGame_v4.html`):** new `goHome()` plus a "Home" button in the town header.
  It cancels any in-progress building placement, closes open dialogs/overlays, saves both locally and
  to the cloud, refreshes the leader cards + avatar preview, and returns to the title screen with the
  current nation name pre-filled.
- **Why it matters:** players can switch leaders, adjust their avatar, or start a new leader at any
  time without losing progress or reloading the page.
- **Verification:** live, clicked from in-game and landed on the title/leader-selection screen with the
  active leader shown and progress saved.

---

## 2026-07-07, Designated map props + softer directional shadows

- **Direction:** "there are a lot of random benches around the map, they look super AI. Make the small
  features make more sense," plus make the shadows more lifelike.
- **Changes (`CatoCapitalismGame_v4.html`, prop pass in `buildExpansion` + `sh()`):**
  - Replaced the old uniform-grid scatter (which dropped benches and streetlamps randomly in empty
    fields) with three purpose-built passes: **lamps** now line the roads just off the curb; **benches**
    appear only inside small **parks** (a bench with shade trees, a bush, and flowers, so a bench always
    has context); open fields get natural greenery only (trees, bushes, rocks, wildflowers) placed with
    organic jitter instead of a rigid grid.
  - **Shadows (`sh()`)** now use a soft radial-gradient ellipse (`#shadG`) offset down-right for one
    consistent light from the upper-left, sized to each object so a tree casts a bigger shadow than a
    flower. Uses a gradient fill rather than a per-object blur filter, so it stays cheap on classroom
    Chromebooks.
- **Why it matters:** lone benches and lamps stranded in meadows were one of the biggest
  "AI-generated" tells; tying props to roads and parks and grounding everything with a single light
  direction makes the town read as deliberately designed.
- **Verification:** live map walk, lamps ran along the roads, a park cluster showed its bench among
  trees and flowers, open blocks held only natural greenery, and props sat on soft directional shadows.

---

## 2026-07-07, Note: superseded / parallel work this day

- The **downtown road-overlap fix** made earlier in this chat (nudging the market/pond/first-house
  spur roads so they stopped short of those obstacles) was **superseded** by the same-day *Unified road
  network* rebuild from a separate chat, so it is intentionally **not** logged as a standing change.
- Likewise, an interim **4-cloud dial-back** tweak from this chat was replaced by the wind-driven cloud
  system already recorded under *Real-physics pass*. The soft ground shadows above are separate and do
  stand.