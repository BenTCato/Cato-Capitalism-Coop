# Freedom Founder, Development Log

A chronological record of the directions given and the changes made to **Freedom Founder**
(named "The Policy Game" prior to 2026-07-21), an interactive free-market / capitalism
education game built for the Cato Institute, Center for Educational Freedom (primary
audience: ages 16–25 new to libertarian policy ideas).

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

## Recovered entries (reconstructed 2026-07-07 from GitHub history)

The log went quiet after 2026-06-25, but the GitHub repo (`BenTCato/Cato-Capitalism-Coop`, 109
commits) shows steady work. Commit messages are all web uploads, so the entries below are
reconstructed from commit dates, file timestamps, and the project's own docs.

## 2026-06-18, Post-QA fix uploads

- Two deploys in the days after the QA bug report was finalized (2026-06-17) — fixes from that
  report landing. Why it matters: closed out the first formal QA round before the grade-level work
  began.

## 2026-06-23, Grade-level question pools completed and deployed

- Four deploys finishing the Grade 6–12 reading-level system started 2026-06-22:
  per-citizen × grade question pools reaching **~700 questions** (100 per grade across all 10
  citizen topics), the quote-optional renderer, and `gradePool()` unioning grade + band sets (per
  `GRADE-LEVEL-UPDATE-STATUS.md`). Why it matters: this is what lets one classroom span middle and
  high school reading levels in the same game.

## 2026-06-26, Post-sprint polish deploys

- Six deploys the day after the big 2026-06-25 map/building-art sprint — continued art, layout,
  and balance corrections to that work. Why it matters: the 06-25 sprint touched nearly every
  building and road; this was the settling pass.

## 2026-06-29, How-To-Play walkthrough page

- `How-To-Play-Walkthrough.html` added (three deploys) and the development log updated (the final
  06-25 entry was cut short in that edit — recovered above). Why it matters: gave teachers/students
  a standalone illustrated guide outside the in-game help.

## 2026-06-30, Co-op dashboard + join page updates

- `coop/dashboard.html` and `coop/join.html` revised. Why it matters: the teacher dashboard and
  student join flow are the front door for classroom sessions.

## 2026-07-01, Automatic cloud accounts (name + PIN) and Render blueprint

- Four deploys adding automatic sign-in/progress saving: name + PIN accounts with durable storage
  via Upstash Redis on Render (`coop/ACCOUNTS-SETUP.md`, `render.yaml`, sign-in UI + debounced
  `cloudSave` in the game). Why it matters: student progress (avatar, stars, items, house, grades)
  now survives across devices without manual save codes.

## 2026-07-02, Four-agent playthrough review + fixes (13 deploys)

- `PLAYTHROUGH-FINDINGS.md` written: a four-agent review (core loop, town/build, screens/copy,
  co-op/mobile/perf) with prioritized P0/P1 lists. The placement bug (a props-loop `var P` shadowing
  the profile global) was root-caused and fixed the same session; `coop-client.js`/`coop-server.js`
  updated (duel settlement, account handling); sign-out added for shared Chromebooks. Why it
  matters: the biggest single hardening day on record — correctness/integrity issues (save-load,
  duels, PINs, class-question exploit) identified and worked down.

## 2026-07-06, Playthrough-findings fixes continued (7 deploys)

- Seven further deploys working through the remaining P0/P1 items from `PLAYTHROUGH-FINDINGS.md`.
  Why it matters: cleared the backlog ahead of the 2026-07-07 realism/animation overhaul.

## 2026-07-07, GitHub reconciliation note

- Today's 11 pushes correspond to the seven detailed 2026-07-07 entries below (physics pass, life
  systems, seasons, roster, QA rounds, unified roads, polish + cleanup). Log verified complete
  against all 109 commits in the repo as of 19:59 UTC.

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

## 2026-07-07, Project folder cleanup: removed superseded builds and unused assets

- **Deleted (user-approved, ~1.6MB):** old game builds `CatoCapitalismGame_FINAL.html`, `_v2.html`,
  `_v3.html`, and the original `policy_game.html` prototype; concept-art sources `auhocratic
  city.jpg`, `flat vector galtsgulch.jpg`, `socialist city.jpg`, `Cato_Institute-logo.svg (1).png`
  (all now embedded as base64 inside v4); plus stray sync artifacts (`.fuse_hidden*`, `.Rhistory`).
- **Why it matters:** `coop-server.js` globs `CatoCapitalismGame*.html` and picks the highest
  version, so stale builds sitting next to v4 were both clutter and a small deployment hazard.
  Every deleted file was verified unreferenced by the game, the co-op server, the dashboards, and
  the walkthrough. Folder is now 1.8MB: v4 + coop server + docs + skills-reference only.

---

## 2026-07-07, Co-op UI moved off the map (`coop/coop-client.js`)

- **What changed:** the "🔑 Join a class" button and the "Class World · N online" status badge were
  fixed-position pills pinned to the left edge (`left:12px`, `bottom:172px`/`132px`), floating
  directly over the map's left side during play. First moved to float centered in the header band;
  then (same day, user feedback: "floating") mounted PROPERLY INSIDE the header's `.hd-right` flex
  row via a new `mountTopbar()` helper — they now sit as real top-bar items just left of the 🔊
  sound button (order: 🔑 Join · World status · 🔊 · 💬), restyled to match the header buttons,
  with a fixed top-center fallback if the header is ever missing.
- **Why it matters:** the pills were covering town scenery and NPCs on the map's west side; as true
  header items they scroll with the bar, never overlap the world, and read as part of the UI.

---

## 2026-07-08, Road-clearance sweep: no prop touches any road anywhere

- **What changed:** a computational sweep of every road (all 34 unified roads sampled, incl. the six
  downtown bezier curves + roundabout ring) against every prop's VISUAL footprint (canopy, not
  trunk). Found and fixed: a rock sitting **dead center on the east loop road** (core 1500,980 →
  1440), a bush 22px onto the same road (1480,560 → 1440), two trees whose canopies overhung the
  west/top loop roads (40,950 → 60,950; 60,90 → 60,100), and both fountain-plaza hedges clipping the
  roundabout's new curb ring (640→620, 1085→1105). Two systemic rules fixed in `buildExpansion`:
  the field-scatter road margin is now size-aware (56 trees / 48 bushes / 44 rocks / 34 flowers,
  measured from centerline; was a flat 30, letting canopies overhang asphalt by up to 23px) and the
  park keep-out went 48 → 100 (a park's shade trees reach ±42 with ~26px canopies, so 48 could put
  one fully on the road).
- **Why it matters:** trees and rocks on the pavement broke the "clean pavement" standard the road
  unification set; the placement rules now respect what a prop LOOKS like, not just where its base
  sits, so this stays fixed for every future scatter. Verified: re-ran the sweep, zero overlaps.

---

## 2026-07-08, Graphics batch: ten visual upgrades (approved as a set)

- **Lightning:** heavy storms now fire a double-strobe screen flash with a jagged bolt every
  10-23s. Brief and dim by design (photosensitivity), skipped entirely on reduced-motion and
  low-power devices.
- **Headlight cones:** each car projects a gradient beam wedge onto the road ahead, on the same
  dusk/rain cycle as the headlight glow (shares the `.headlight` class, so no new lighting code).
- **Road markings:** six crosswalks at busy approaches (the dormant `xwalk()` finally earns its
  keep), plus seven manhole covers on the long runs.
- **Building shadows:** every building (core `urban()` + all expansion rows) gets a directional
  cast shadow down-right matching the global sun, plus an ambient-occlusion strip at the
  foundation. Grounds the whole town.
- **Seasonal ground detail:** footprints pressed into snowpack behind the player (pooled, fade as
  fresh snow fills them), snowdrifts banking against every building wall (opacity follows the
  snowpack), autumn leaf piles under the 14 core shade trees (follow `sea.aut`).
- **Water reflections:** a sky sheen on the pond and wobbling bridge-post reflections downstream of
  each deck (shimmer animation).
- **Tumbling leaves:** `fxStep` gained an optional spin arg; leaves/petals now rotate as they fall,
  phase-shifted per particle.
- **Character micro-life:** all characters blink every ~4.6s with per-character delays (creator
  previews included); NPC contact shadows squash with each stride like the player's.
- **Worn desire paths:** bare-earth trails between popular spots. *(Removed same day at user
  request — the dirt lines didn't sit right visually. The other nine features stay.)*
- **Speed camera:** the viewBox eases ~5% wider at full sprint and tightens at rest (off for
  reduced-motion). Particle culling margin widened to match.
- **Why it matters:** depth (shadows), drama (lightning), and micro-life (blinks, footprints,
  tumbling leaves) are the difference between a diagram and a place. All ten respect the existing
  lowPower/reduceMotion fallbacks. All new blocks syntax-checked.

---

## 2026-07-08, Bug fix: game keys hijacked the feedback form (and every other form field)

- **What changed:** the global town keydown handler ran even while typing in the 💬 feedback form —
  it `preventDefault`ed SPACE/WASD (so those characters could never be typed) and left the opener
  button focused, so SPACE re-triggered it and closed the form mid-sentence. The handler now
  (1) returns immediately when focus is in ANY input/textarea/select/contentEditable, stealing no
  keys, (2) returns and clears held movement whenever an overlay is open, and (3) `openSurvey()`
  blurs the opener button. Fixes the same latent key-theft for the bank amount box and the class
  code input.
- **Why it matters:** students literally could not write feedback containing a space, a "w", "a",
  "s", or "d" — which rules out most English sentences.

---

## 2026-07-09, Custom tree art: three illustrated designs replace the procedural trees

- **What changed:** three tree illustrations contributed by the user's friend (a tiered pine, a
  round leaf-cluster canopy, and a branching oak) now replace the old two circle-blob procedural
  trees. Source SVGs live in the new `Illustrations/` folder (which will house all future
  image/illustration assets). Each design was adapted into the `#treeD`/`#treeD2`/`#treeD3` defs:
  trunk base normalized to (0,0), sized to match the old trees (~47-55px at scale 1), canopies
  wrapped in the shared wind-sway animation, and every canopy shape tagged `class="cnp"` for the
  seasonal tint pass. `ftree()` now picks between all three designs deterministically by position;
  the foreground-layer trees use the same defs via `<use>` instead of their own inline circles.
- **Evergreen realism:** the pine's canopy shapes carry `class="evg"` — the seasonal pass skips
  spring/autumn tinting for them (needles stay green year-round) while winter snow-dust still
  applies to all three designs.
- **Why it matters:** hand-drawn art with real silhouettes (tiered pine, layered clusters, visible
  branches) gives the map far more character than two-circle blobs, and the adaptation keeps every
  existing system working: sway, seasons, autumn leaf piles, snow dusting, and road keep-outs.

---

## 2026-07-09, Custom vehicle art: four illustrated designs replace the procedural cars

- **What changed:** four vehicle illustrations by the same friend (orange sports car, blue sports
  car, teal van, teal+red bus — `Illustrations/cars-04..07.svg`) replace the old rectangle-built
  cars. New `vehicleDefs()` provides `#carA..#carD`: each normalized to face RIGHT (the three
  left-facing sources are mirrored with a negative x-scale), wheels on y=0, sized 40-50px.
  `carsSVG()` instances now `<use>` the defs; each keeps its shadow, gradient headlight cone, and
  glow (front offset `f` is per-vehicle since the bus is longer). The bus cruises slower (1.4) to
  read as the heavy vehicle. Braking-for-pedestrians, end-of-road flips, and dusk/rain headlights
  all work unchanged.
- **Why it matters:** real car silhouettes with hoods, windshields, and hubcaps replace colored
  rectangles — and the bus gives the streets vehicle variety for free.
- **Size bump (same day, user request):** trees +~14% (def scales 0.115→0.13 / 0.13→0.148) and
  vehicles +~15% (0.1→0.115 sports, 0.088→0.1 van, 0.069→0.078 bus; front offsets 20→23 / 26→29 so
  headlight cones stay on the bumpers). Road keep-outs retuned for the wider canopies (field trees
  56→60, parks 100→104) so the larger art still never touches pavement.

---

## 2026-07-09, Road-clearance sweep round 2 (post-resize): lamp heads, canopy lift, cart

- **What changed:** a second full mathematical sweep (all roads incl. curves/roundabout vs every
  prop's true visual disc) at the new sizes found three classes of obstacle the first sweep's
  simpler model missed. (1) **Street lamp heads on the asphalt:** lamps south of an E-W road stood
  at +42 while their heads hang 44px up — putting the head dead center on the road; and lamps beside
  one road could stand right on a CROSSING road at junctions. South-side lamps now stand at +84, and
  both base and head must clear every other road segment (`nearRoadX`). (2) **Canopy lift:** tree
  canopies float ~34px above the trunk, so trees SOUTH of a road lean their canopy over it even with
  the base 60px clear — field-tree margin 60→92, and park shade trees now validate their own spots
  (park centers back to margin 52, so benches survive; a road-adjacent park just goes treeless).
  (3) The market **handcart** sat 10px onto the downtown market curve → nudged to (855,1062).
- **Why it matters:** the placement model now accounts for what hangs OVER a road (lamp heads,
  canopy discs), not just where things stand. Re-ran the sweep after fixes: zero overlaps across 38
  lamps, 5 parks, 82 field props, and every hand-placed core prop. Visual pass follows the deploy.
- **Manhole covers removed (same day, user report):** the seven covers from the graphics batch read
  as "wheel things" lying on the road at game scale rather than flush metal covers. Deleted;
  crosswalks stay as the roads' detail element.

---

## 2026-07-09, Terrain + water materials: textured, meshed ground and water (skills-reference port)

- **Direction:** "textualize and mesh the map; specifically the ground and water" — lose the flat
  AI-generated look, working from the game-developer skills in `skills-reference/`.
- **Skills applied:** the shader doc's surface-material model (albedo base + tiling detail texture +
  depth tint + specular) became SVG pattern layers; its water UV-panning became CSS-scrolled pattern
  rects that move EXACTLY one tile length per loop (perfectly seamless); the performance doc's
  batching rule became shared `<pattern>` paint servers (one material definition, reused everywhere,
  zero per-frame JS — all motion on the compositor); its LOD principle keeps textures static under
  `no-wind`/reduced-motion; the modeling doc's transition-zone rule produced the shorelines.
- **Ground:** a 4-octave material stack — policy-tinted base → existing mid-octave patches → broad
  rotated meadow banding (`grassBand`, macro) → tuft-and-fleck detail tile (`grassTx`, micro). Both
  texture layers are alpha-only, so the policy palette and winter snowpack read through them.
- **Water:** wave-crest tile (`waterTx`) + a larger second octave (`waterTx2`) scroll downstream at
  different speeds for parallax depth; a deep-channel gradient darkens the river center and a radial
  depth tint deepens the pond middle; the fountain basin shares the wave material. The pond's mesh
  scrolls inside a parent-level clip so the basin stays fixed while the water moves.
- **Shorelines:** sandy speckled strips along both river banks and a sand ring around the pond, plus
  reed clumps at the pond's edge — the land-to-water transition is now a real zone, not a hard line.
- **Why it matters:** flat single-tone fills are the biggest "AI-generated" tell; layered materials
  with seams, motion, and transition zones read as authored — a prerequisite for pitching the game
  to teachers and students as a finished product.
- **Bridge fix (same day, user report):** the new 9px sand shore strips poked out 5px past both ends
  of every bridge deck (decks spanned RX±54, shores reach ±59). Decks widened to RX±64 so they cover
  water, banks, and shoreline completely, still butting seamlessly into the main road.

---

## 2026-07-09, De-AI-ification deep dive: the world reads authored (full skills-reference pass)

- **Direction:** "create a less AI generated world map… improve every area… no restraints" — every
  change below traces to a specific technique in `skills-reference/`.
- **Toon outlines (shader.md's cel-shading pass):** every building — expansion houses, shops,
  offices, and all core `urban()` civic buildings — now carries a subtle 1.4px dark outline on wall
  and roof silhouettes. The single strongest "illustrated, not generated" cue.
- **Road materials (shader surface model):** an asphalt speckle-and-crack texture pass over every
  road, a translucent tire-wear band down each traveled center, and the roundabout interior dressed
  as a paved civic plaza (paver grid + inner ring) around the fountain.
- **De-gridded streets (ECS data-driven variety, keyed to position — never random):** ~1 in 8 lots
  is now a vacant gap; every building takes a ±4px hash setback so facade lines waver; hue/roof/door
  and office floor-count are keyed to position hash instead of placement order (kills the visible
  repeating cycle); north-side lots get a paved walkway from door to curb plus a hash-chosen yard
  kit (flowerbed / mailbox / dooryard shrub).
- **Nature composition (modeling/scene-creation skill):** 9 hash-seeded tree GROVES cluster the
  countryside into woodland masses with deliberate negative space between; 6 year-round flower
  drifts replace confetti scatter; the farm gains an orchard (2×3 fruit trees — deliberately
  gridded, since orchards really are) and a fenced sheep pasture with two sheep (one grazing, one
  bobbing); rocks and reed clumps alternate down the river banks between bridges.
- **Cinematic grade (davinci.md):** a constant radial grade — warm key-light center, cool edge
  falloff — sits under the day/night tint, unifying the palette the way a LUT does.
- **Performance (performance-optimization.md):** every addition is a static string or shared
  pattern; zero new per-frame JS; seasonal tint picks up the orchard canopies via the existing
  `.cnp` class.
- **Verification:** all six modified builders extracted and EXECUTED under Node (this caught one
  real bug: an inline comment swallowing a closing bracket in the office row — fixed);
  `buildWorld` syntax-checked. Live visual audit after deploy.

---

## 2026-07-10, World rescale: realistic avatar-to-structure ratio

- **Direction:** houses were literally avatar-height (58px vs a ~68px avatar) — the worst remaining
  believability tell. Buildings, trees, and vehicles all scaled up.
- **Buildings:** expansion houses 58→80px tall and 84→96 wide (extra siding course, second window
  row, bigger door), centered on their lots; shops 1.4x and offices 1.35x via uniform scale-wraps
  (window/sign internals untouched); core civic buildings (`urban()`) grow to 40+30/floor while the
  COLLIDER keeps the old 34+24/floor height, so the extra height rises visually behind without
  blocking any walk path; `winGrid` gained a floor-pitch param so window rows track the taller
  floors. South-side row offset 102→110 keeps the taller back-to-back blocks from overlapping
  (max gap math: block 240 = 34 + H + gap + H + 44).
- **Trees:** +23% (defs 0.16 / 0.185 / 0.16 → pines ~77px, oaks/rounds ~70px — properly above the
  rooflines). **Vehicles:** +20-22% (sports 0.14, van 0.12, bus 0.094 → the bus is now ~68px, a
  real road presence); headlight cones/glows track the new bumper offsets (f 28/35).
- **Clearance retune:** field-tree road margin 92→108, grove margin likewise, park self-checks
  80/78, leaf piles widened. The full clearance sweep at the new geometry caught the orchard's first
  row sitting on the downtown link road (rows moved to core y662+) and one core tree 1px onto the
  loop road (y120→126) — re-swept: all clear.
- **Why it matters:** when a person stands door-height next to their house instead of roof-height,
  the whole scene snaps into believable proportion — the single biggest scale cue in the game.
- **Vehicle bump 2 (same day, live-audit verdict):** the first deploy's live check showed the bus
  braking at the avatar's knees — still toy-scale. Second notch: sports 0.155, van 0.135, bus 0.105
  (~80px long); bumper offsets f 31/39. Houses and downtown verified at proper ratio on the same
  audit (avatar stands door-height at houses; the Bank reads ~2 avatars tall).

---

## 2026-07-10, Mega bug check: ground-truth overlap audit (math + visual)

- **Method:** the actual game builders were EXECUTED under Node with every prop function
  instrumented and all districts/attractions owned (worst-case density) — dumping 158 prop
  placements, 78 building boxes, and 174 colliders of ground-truth geometry. An analyzer then
  checked every overlap class: props vs roads, props vs buildings (canopy discs AND trunks),
  building vs building, props vs water, and NPC anchors + all five interaction SPOTs vs colliders.
  The live build was then walked visually in Chrome, which CONFIRMED the math's findings on screen
  before the fixes (the rock visibly on the school wall, the bush in the Bank).
- **Real bugs found and fixed (4):** (1) the bush relocated during the road sweep had been pushed
  INTO the Bank's east wall → moved south of the Bank, clear of wall and road; (2) a rock had sat
  INSIDE the school's footprint since the original layout → moved east of the school; (3) park
  shade trees never checked buildings, and one overlapped a house → park trees now verify no
  building under trunk or canopy; (4) back-to-back house rows could overlap by up to 4px because
  the ±4 setback jitter ate the 6px block gap → jitter tightened to ±3 and south offset 110→108
  (guaranteed ≥2px gap at worst-case jitter).
- **Dismissed as false positives (verified by hand):** the farm fence and six fairground venue
  flags came from the analyzer's circle-model on wide boxes (real boxes clear their roads by 6-7px);
  one "building overlap" was the player home double-instrumented through its internal urban() call.
- **Also verified clean:** NPC anchors and every interaction SPOT reachable, venues clear of the
  promenade and river, scaled shops/awnings within their lots, zero console errors.

---

## 2026-07-13, Map repopulation for the larger buildings (+ new civic art incoming)

- **Direction:** after the rescale, building counts and placement read "strange" — sparse rows,
  and several of the 12 shop kinds never appeared at all.
- **Fixes (slot math checked against the vertical-street clearance bands before choosing steps):**
  west homes origin/step retuned (290/145) → 3 houses per row, up from 2; south homes step 180→165
  fills the long streets evenly; offices step 250→230; the east shopping rows rebuilt (origin 2790,
  step 200, vacancy-gaps disabled for shops) → exactly 3 slots × 4 rows = all 12 shop kinds now
  appear. Residential rows keep their vacant-lot character.
- **Verified:** ground-truth harness rebuild shows 94 expansion buildings (up from 68) with zero
  new overlaps against roads, each other, or props.
- **Pending:** four new civic-building illustrations (buildings-08..11: Town Hall with bell tower,
  twin-storefront Market, columned Bank, clock-gabled School) arrived via upload but the files came
  through empty; awaiting re-drop into Illustrations/ to convert and wire in.

---

## 2026-07-13, Custom civic-building art: Hall, Market, Bank, School (buildings-08..11)

- **What changed:** the four downtown landmarks now use the friend's illustrations, converted by an
  automated style-inliner (CSS classes → fill/stroke attributes, coords rounded, ~27KB of defs) and
  normalized to base-center origin. New `bldCivic()` places each with its OLD `urban()` collider
  footprint, so every interaction spot and walk path is unchanged; nameplates (signFlat) ride above
  the art, and the neglected tier (t=0) dims the building with a dark wash.
  Mapping: **Town Hall** = brick hall + stepped-gable bell tower with flag (08, 0.36x, ~174px
  tall — the town's landmark); **Market** = twin storefronts with pharmacy-cross and shop-sign poles
  (09, 0.30x); **Bank** = columned classical facade with a $ pediment and steps (10, 0.42x);
  **School** = clock-gabled schoolhouse with arched windows (11, 0.34x, center shifted +7 so its
  wider art clears the recess playground).
- **Also:** the old procedural civic renderers (pediments, scallop awnings, column strips) retired
  for these four; `urban()` remains for houses/press/home. Defs validated standalone (27 balanced
  groups, all ids); colliders byte-identical to the mega-check audit.
- **Correction (see next entry):** buildings-08 and 09 were misidentified. 08 is TWO apartment
  designs (not a Town Hall) and 09 is a pharmacy + a coffee shop (not a market). Only the Bank (10)
  and School (11) mappings above stand.

---

## 2026-07-13, Art correction: 08 = two apartments, 09 = pharmacy + coffee shop (user ID'd)

- **Direction:** the user identified that buildings-08 is two apartment building designs and
  buildings-09 is a pharmacy and a coffee shop — not a Town Hall and not a market. Fix: restore the
  old procedural Town Hall and Market, spread the two apartments across the map, use the pharmacy
  and coffee shop as specialty stores, and restyle the other specialty stores to match.
- **What changed (`CatoCapitalismGame_v4.html`):**
  - `bHall()` and `bShops()` restored to their pre-illustration `urban()` renderers (pediment +
    flag hall; scallop-awning market), colliders and spots unchanged.
  - `bldDefs()` now splits the buildings-08 def at runtime into `#bldAptRed` (tall stepped-gable
    tower, 0.40x ≈ 198px) and `#bldAptBrown` (wide brick walk-up, 0.40x ≈ 176px); `bldHall`/
    `bldMarket` no longer emitted. The two apartments stand in the south band between the homes and
    the fairgrounds — brown at (660, 2500), red at (1690, 2510) — registered as colliders and prop
    keep-outs before any scatter runs.
  - `expShop()` rebuilt as a parametric storefront in the friend's flat style derived from the 09
    pair: white-outlined pastel facade, wave-scalloped awning, white name band, big blue display
    window + brown door, and a corner sign — the pharmacy gets the white-circle red cross, everyone
    else a hanging round sign. `EXP_SHOPS` repainted with the friend palette (pink café = the
    coffee-shop design, light-blue pharmacy = the pharmacy design); `barber` swapped for
    `pharmacy`, and pharmacy moved to slot 2 of `SHOPKINDS` since road clearances leave 8 shop
    slots (2×4 rows), so late-list kinds never render.
- **Why it matters:** the shopping district is now cohesive with the illustrated art (every
  storefront shares the 09 buildings' language instead of two odd ones out), the apartments give
  residential variety at city scale, and downtown keeps working landmarks. Verified headlessly by
  executing `buildWorld()` under jsdom with all districts owned: 189 colliders, zero overlaps,
  pharmacy + cross rendering, apartments clear of every road band. Live visual pass after the push.
- **Ops note:** the first write raced OneDrive and corrupted the game file (duplicated 300KB tail);
  rebuilt from the pushed GitHub copy and re-applied all edits in /tmp before a single atomic copy
  back. Local `.git` is hollow (OneDrive doesn't sync objects) — the GitHub remote is the real
  backup.

---

## 2026-07-13, De-cramping pass: shop spacing, house stagger, apartments respread (user request)

- **Direction:** "apartments need to be more widespread and shouldn't overlap with any other
  housing or obstacles; specialized shops should be more spaced out; the houses to the north of
  each one should be placed a block over to the left" — verify mathematically and in the browser
  before finalizing.
- **What the checks found:** (1) shop art at 104px tall slid ~20px under the south-side homes of
  the street above (colliders only touch by 2px, so the math audit passed while the art
  overlapped); (2) the 200-step shop rows lost their two left slots to the x2760/x3080 road
  clearances, so shops rendered as a squeezed pair per right block with empty left blocks; (3) the
  apartments' upper floors sat ~70px behind the y2280 street's south house row.
- **Fixes (`CatoCapitalismGame_v4.html`):** shop template compacted to exactly 84px tall (same
  envelope the old shops proved out); east shop rows re-slotted to origin 2895 / step 400 → one
  storefront centered per block (8 render, pharmacy in slot 2); east south-side house rows shifted
  a block left (origin 2820→2600, step 185) so storefronts get open sky; apartments moved to
  opposite ends of the fairgrounds band — brown walk-up at (660,2585), red tower at (3160,2585,
  rescaled 0.40→0.38) — art tops clear the south-homes row bottom (2394) and bases clear the
  promenade (2591).
- **Verification:** jsdom ground-truth run with every district owned: 188 colliders, zero overlaps,
  all road bands clear; then a live in-browser preview (game builders monkey-patched in memory,
  world overlay rendered at each site) confirmed the spacing visually before any push.

---

## 2026-07-13, Promenade rowhouses: ten tinted apartments line the bottom road

- **Direction:** "add more of the same kinds of apartments to fill in the bottom road, change the
  colors so it looks like a lively area."
- **What changed (`CatoCapitalismGame_v4.html`):** `bldDefs()` now emits six apartment defs — the
  two buildings-08 designs plus wall-tint variants (`tint()` swaps only the wall fill): red tower
  in brick red / orange `#f7931e` / green `#7ac943`, brown walk-up in brick / pink `#ff7bac` /
  light blue `#9ac7d6`. Ten rowhouses line the fairgrounds' north edge at base y2585:
  380P·660·900O | sign gap | 1450B·1650P·1900G·2150R | river | 2950B·3160R·3390O — no two
  neighbors share a tint. Gaps are reserved for the FAIRGROUNDS ghost sign (x~950-1370) and the
  river corridor (x2490-2630); every spot clears the vertical-road bands, the promenade (2591),
  and the south-homes row bottoms (2394).
- **Save-safety:** `apt()` now checks `P.town.pos` and silently skips any apartment whose footprint
  would intersect a venue the player has already placed in the fairgrounds band (verified: a stub
  venue at x330 correctly suppresses the 380 rowhouse). `canPlaceAt` already blocks future venue
  placement on the apartments via colliders.
- **Why it matters:** the bottom road reads as a lively, colorful promenade street framing the
  fairgrounds instead of two lone towers, using only recolors of the friend's art so the style
  stays cohesive. Verified: jsdom run with all districts owned — 196 colliders, zero overlaps;
  live in-browser preview of both halves of the strip before pushing.

---

## 2026-07-13, Full multi-agent bug test + fixes (shops regression + co-op security)

- **What we did:** ran three headless QA agents in parallel, each driving simulated users — a
  full-playthrough logic fuzzer (all 493 questions × every choice, currency, bank, save/load), a
  geometry auditor across 18 ownership/tier states, and a co-op tester running multiple live socket
  clients against the deployed server — plus a live browser UI pass. Findings written to
  `BUG-TEST-2026-07-13.md`. Single-player game came back clean (no crashes, no NaN, no economy
  exploits, zero collider overlaps, clean live boot).
- **Fix 1 — shop-kind regression (`CatoCapitalismGame_v4.html`).** The earlier "one shop per block"
  change (origin 2895, step 400) fit only 2 shops per row → 8 of 12 kinds; florist, diner, music,
  hardware never spawned. Restored all 12 with the airy look by splitting each of the 4 east rows
  into two `row()` calls: a left lane (one storefront, clear of the x2760 street) and a right lane
  (two storefronts, clear of the x3080 street) → 3/row × 4 = 12. A literal 5th row would have
  collided with the east homes at y1580, so this was the clean path. Verified: jsdom all-owned run,
  196 colliders, zero overlaps, all 12 kinds present exactly once.
- **Fix 2 — co-op security (`coop/coop-server.js`, `coop-client.js`, `dashboard.html`, new
  `duel-bank.json`).** Closed the three HIGH holes: (a) **teacher auth** — `/__coop/create` now
  mints a `teacherKey`, returned only to the creator; `world`/`tq/create`/`tq/decide`/`tq/end` and
  class-room `kick` require it (rooms with no key, i.e. the open MAIN world, stay open for legacy
  anonymous use); (b) **self-award** closed by the same gate on `tq/decide`; (c) **duel rigging** —
  the challenger no longer supplies questions/answer key; the server picks from a 113-question bank
  snapshotted from the game's own graded policy questions (`duel-bank.json`), shuffles choices, and
  holds the key server-side (never sent to clients). Also added a `setInterval(pruneAll, 30s)`
  reaper so rooms/duels/auth records are bounded without a dashboard poll, and fixed `readBody` to
  always settle (an oversized POST previously left a dangling promise → Render 502/hang; now it
  resets fast and the server stays healthy).
- **Verification:** booted the patched server locally and re-ran the co-op agent's attack scenarios
  — 14/14 passed: teacher actions blocked without the key and allowed with it, self-award blocked,
  duel questions served from the bank with no `best` on the wire, oversized body settling in 8ms
  (was a hang), MAIN world still open. `node --check` clean on all JS; dashboard inline JS parses.
- **Why it matters:** removes the one gameplay regression and makes the classroom co-op layer safe
  to put in front of students before promotion — cheating a duel, awarding yourself stars, or
  hijacking another class's world now all require the teacher key.

---

## 2026-07-13, East district is now shops-only (removed Market Lofts)

- **Direction:** "get rid of the houses by the 12 shops — they aren't needed."
- **What changed (`CatoCapitalismGame_v4.html`):** removed the `east_homes` / "Market Lofts"
  development entirely — both the `TOWN_DEVS` entry (so the build-menu button and its +4 happiness
  bonus are gone) and its render block (the staggered house rows that interleaved with the shops).
  East ("Market Quarter") is now a pure shopping district with a single development, consistent
  with west/south/north which each have one dev too.
- **Why it matters:** the shopping street reads clean — 12 storefronts, one per block, open green
  space where the houses were. Verified: jsdom all-owned run, 0 overlaps, all 12 shop kinds present,
  the east band contains only shop-sized (151×84) boxes (no house footprints), and the Lofts option
  is gone from the menu; confirmed with a live in-browser preview of the full district.

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

---

## 2026-07-09, Full question rewrite to operating-profile voice + NY reading standards

- **Direction:** Rewrite every question in the game to match the intern's `cato-operating-profile.md`
  voice and the New York Next Generation ELA reading standards.
- **Scope:** All ~541 questions across three data sets were reworded: the 493 grade-leveled `MQ()`
  pool questions in `QG[6..12]` and the shared reading bands `QGB.A/B/C`; the 40 rich scenario
  questions in `QBANK` and `NEWQ1`–`NEWQ6`; and the 8 `QUIZ_QS` Town Hall Quiz items. In total 5,785
  individual text strings (scenario prompts, answer labels, newspaper headlines/sublines, feedback,
  and takeaways) were rewritten.
- **How:** Voice follows the profile: direct, plain, data-and-consequence over opinion, no jargon,
  no em dashes or en dashes, no emojis in prose, balanced framing on every option (no strawmen).
  Reading level is matched to each pool's target grade per NY ELA bands (Grade 6 = short concrete
  sentences; Grades 11-12 = college-prep syntax with precise economics vocabulary).
- **What was preserved exactly:** every `fx` stat object, `best` answer, `letter`/`type`, `npc`,
  `tag`, `icon`, `gradient`, `links`/`url`, and all historical `figure` quotes/names/years/sources
  were kept byte-for-byte. Only human-readable strings changed. Verified programmatically that all
  protected fields are identical to the originals.
- **Verification:** each of the 53 rewritten JavaScript blocks passed a Node syntax check; a
  structural fingerprint confirmed no stat objects, quotes, or entries were added, dropped, or
  reordered; and the finished file was re-read to confirm every rewritten block is present and each
  original block is gone. Line counts per block were preserved, so nothing downstream shifted.
- **Wiring confirmed (correction):** an earlier draft of this note wrongly said the question bank
  was not wired in. That was a false alarm from reading a truncated copy of the file. The bank IS
  wired: `startGame()` runs `Q=dealTerm(null)` and `continueTerm()` runs `Q=dealTerm(Q)`, and
  `dealTerm()` pulls from `gradePool(GRADE_KEY, npc)`, i.e. the rewritten `QG`/`QGB` pools. An init
  IIFE also attaches figure quotes (`CATO_QUOTES`) and charts (`CATO_CHARTS`) to each pool question
  by regex-matching the body text. Verified the rewrite did not regress that matching: figure
  attachment held at 224/493 questions after vs 221/493 before (the ~44% rate is by design, since
  the matchers only cover specific scenario topics). `QBANK` and `NEWQ1`–`NEWQ6` remain legacy and
  are not read by the live `dealTerm()` path; they were rewritten anyway for consistency.

---

## 2026-07-09, Duel questions now follow grade standards and profile voice

- **Direction:** Make 1v1 duel questions correlate with the selected grade level and the
  operating-profile voice, instead of pulling mostly from the fixed rich-scenario banks.
- **Change:** Rewrote `buildDuelPool()` in `coop/coop-client.js`. It previously gathered from
  `Q`, `QBANK`, and `NEWQ1`–`NEWQ6` (about 50 questions, only ~10 of which were grade-based).
  It now draws from the selected grade's pools via `gradePool(GRADE_KEY, npc)` for all 10 citizens,
  plus the current term's `Q`. Because the `QG`/`QGB` pools are the grade-leveled, profile-voice
  rewrites, duel questions now match both the player's grade reading level and the intended voice.
- **Safety fallback:** if the grade pools are not reachable at runtime, it falls back to the legacy
  `Q`/`QBANK`/`NEWQ` banks so duels still work.
- **Note:** duels are challenger-supplied, so a duel uses the challenger's selected grade for its
  question set.
- **Verification:** the new `buildDuelPool()` was syntax-checked in isolation with Node; the edit
  was a self-contained function replacement with surrounding code untouched.
- **To deploy:** commit `coop/coop-client.js` (served by the co-op server as `/__coop/client.js`)
  and push; Render auto-deploys.

---

## 2026-07-09, No repeated questions across NPC terms and duels

- **Direction:** Make sure a player never sees the same question twice, in any form (NPC citizens
  or 1v1 duels).
- **How it works:** added a shared, per-profile "seen" set. `CatoCapitalismGame_v4.html` now defines
  `qKey(q)` (a stable id from the question's tag/title plus the first 60 chars of its body),
  `seenStore()` (returns `P.seenQ`, persisted with the profile), and `markSeen(list)`.
  - `dealTerm()` now prefers questions not in the seen set (and still skips the previous term), marks
    the dealt term seen, and recycles a citizen's pool only after every question in it has been used,
    so the game never runs dry.
  - `coop/coop-client.js`: `pickQuestions()` prefers unseen questions (seen ones only backfill if
    there aren't enough fresh), and `startAnswering()` marks a duel's questions seen for both players.
    Because duels and NPC terms share `P.seenQ`, a duel won't reuse a question the player already saw
    as a citizen, and vice versa.
- **Verification (Node simulation over the real rewritten pools):** across grades 6, 8, 10, and 12,
  no citizen repeated a question until its entire pool was exhausted; a duel right after an NPC term
  had zero overlap with that term; and two consecutive duels had zero overlap. No runtime errors.
- **Known limits:** per-citizen grade pools are small, so after a player exhausts a citizen's pool it
  recycles (repeats become possible again). Duel questions are challenger-supplied, so the no-repeat
  guarantee is per-player from that player's own history; it cannot know what the opponent saw before.
- **To deploy:** commit `CatoCapitalismGame_v4.html` and `coop/coop-client.js`, then push.
- **Why it matters:** the questions are the core teaching surface of the game. They now speak in the
  intern's voice and meet grade-appropriate reading levels, making the free-market ideas clearer and
  more accessible to the 16-25 audience while keeping every citation and game-balance value intact.

---

## 2026-07-13, Security & privacy audit + fixes (publication readiness)

- **Direction:** Research the best privacy/security Claude skills on GitHub, add the best ones to
  `skills-reference/`, then use them to audit the game's code and fix issues before publication.
- **Skills researched and added** (chosen for source credibility after a GitHub-wide search):
  `security-review.md` (official Anthropic security-review methodology, MIT), `owasp-security.md`
  (OWASP Top 10:2025 + ASVS 5.0, MIT), `insecure-defaults.md` and `supply-chain-risk-auditor.md`
  (Trail of Bits security firm, CC BY-SA 4.0), and `coppa-children-privacy.md` (from the 282-skill
  Privacy-Data-Protection database, Apache-2.0). See `skills-reference/README.md` for the full table
  and the runners-up that were evaluated and rejected.
- **Audit result:** no critical/exploitable vulnerabilities (no SQL/command injection, path traversal,
  RCE, or hardcoded secrets). Full write-up in `SECURITY-AUDIT-2026-07-13.md`.
- **Code fixes (all in `coop/coop-server.js`):**
  - Account sign-in hardened against brute force: added an in-memory throttle (8 failed attempts per
    client+name in a 10-minute window → 5-minute lockout, HTTP 429), raised the minimum PIN from 3 to
    4 digits, and switched PIN comparison to constant-time `crypto.timingSafeEqual`. Applied to both
    `/__coop/account/signin` and `/__coop/account/save`; throttle map is cleaned in the existing prune cycle.
  - Added baseline security headers to every response (`X-Content-Type-Options: nosniff`,
    `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`). No CSP, deliberately, since the
    game is inline-script/inline-SVG heavy and a strict CSP would break it.
- **Left as-is (documented, not bugs):** wildcard CORS is safe here because auth is explicit
  name+PIN with no cookies/ambient session; the `eval()` in `coop-client.js` only ever receives
  hard-coded literals (not user input) so it is not exploitable; zero npm dependencies means an
  essentially clean supply chain.
- **Privacy (policy, not code):** the accounts feature stores display name + PIN + progress, so with
  classroom use COPPA is in scope. Recommended before publish: a short privacy notice, "first
  name/nickname only" guidance for teachers, and a data-retention window for idle accounts. Details
  in the audit report.
- **Verification:** the new security logic was unit-tested (12/12 passing, `outputs/sec-fix-test.js`):
  PIN match/reject, PIN-policy enforcement, lockout timing, reset-on-success, and per-client isolation.
  Note: this session's Linux sandbox served a stale, truncated view of the OneDrive-synced `coop/`
  files, so in-sandbox `node --check` gave false errors against cut-off copies; the authoritative
  files are complete and edited regions were verified balanced. Recommend running
  `node --check coop/coop-server.js` and a one-time `npm start` locally as the final pre-publish check.
- **Local boot verification (same session):** the fixed server was reconstructed and booted in the
  sandbox on a test port; confirmed a clean start, the game page served with the co-op client
  injected and all three security headers present, `/__coop/create` returning a join code, `ping`
  working, a 3-digit PIN rejected as `invalid`, and a valid 4-digit PIN returning `storage_off`
  (correct fail-secure behavior with no Redis configured).

---

## 2026-07-13, Privacy notice + retention + teacher guidance (publication readiness)

- **Direction:** Draft the privacy notice and teacher guidance identified in the security audit, so
  the game is publication-ready on the privacy side. Chosen options: contact = btaylor@cato.org,
  retention = 90 days idle, delivery = a served page linked from the screens.
- **New file `coop/privacy.html`:** a plain-language privacy notice (Cato/CEF voice, no jargon, no em
  dashes). Covers: the game itself collects nothing; the only stored data is the optional display
  name + hashed PIN + game progress; explicit "we do not collect" list (no email, location, photos,
  ads/trackers, no open chat); use limited to saving progress; storage (local mode saves nothing,
  hosted mode uses secured Upstash over TLS); 90-day idle deletion; review/delete rights for players
  and parents; a 13+ intended-audience statement with a delete path for under-13; and the contact.
- **Retention implemented in code (so the notice is truthful):** `coop/coop-server.js` now sets a
  90-day TTL (`ACCT_TTL_S`, `SET ... EX`) on every account write, in both the create and save paths,
  so idle accounts auto-expire. Added a `/privacy` (and `/privacy.html`) route to serve the notice.
- **Linked from every entry point:** the projector **join screen** (`join.html`), the **teacher
  dashboard** header plus a highlighted first-names-only tip on the class bar (`dashboard.html`), and
  the student-facing **"Join a class" overlay** in the injected client (`coop-client.js`), which now
  also reminds students to use a first name or nickname only.
- **Teacher guidance:** `coop/HOW-TO-HOST.md` gained a "Student privacy (please read before class)"
  section (first-names-only, accounts optional, 90-day deletion, contact) and its "how it works" note
  was corrected to distinguish local classroom mode (nothing leaves the network) from online hosted
  mode (optional accounts stored in a secured database, auto-expiring after 90 days idle).
- **Verification:** all edited regions of `coop-server.js` were confirmed syntactically balanced via
  the authoritative file (the `/privacy` route mirrors the proven `/join` route; both TTL `SET`
  edits and the `ACCT_TTL_S` constant are correctly embedded). `privacy.html` is valid standalone
  HTML. Note: the sandbox's OneDrive mount served stale partial-sync snapshots of the `coop/` files
  during this session, so a fresh in-sandbox boot of the very latest file was not re-run; recommend a
  local `node --check coop/coop-server.js` + `npm start` as the final pre-publish check.
- **Why it matters:** this closes the last non-code publication item from the audit. Students can play
  with zero data collection, the optional accounts are minimal and self-deleting, teachers get clear
  privacy guidance, and there is a real, contactable privacy notice — the posture the COPPA skill
  calls for in a classroom game.

---

## 2026-07-13, Co-op badge reads "Not in a class yet" before a code is entered

- **Direction:** The in-game co-op badge showed "Class World · 1 online" for a student who had not
  joined any class, which was confusing (the "1" was just themselves in the shared default world).
- **Change:** In `coop/coop-client.js`, `setBadge()` now checks whether a class code has been entered.
  With no code, the badge reads **"Not in a class yet"**; once a student joins a class it shows the
  world name and online count as before (`<World> · N online`). Purely a client-side display change;
  the shared default world and player counting are unchanged.
- **Verification:** the revised `setBadge` logic was extracted and syntax-checked with Node and its
  output confirmed ("Not in a class yet" with no code). No server changes.
- **Why it matters:** removes a confusing signal for teachers/students who open the game before a
  class is started, making the "am I in a class?" state obvious at a glance.
- **To deploy:** re-upload `coop/coop-client.js` (served as `/__coop/client.js`) and push; Render auto-deploys.

---

## 2026-07-14, Town map rezoned to the user's hand-drawn plan (fairgrounds moved, apartments respread)

- **Direction:** the user submitted a hand-drawn world map (`Image (3).jpg`): offices (B) across the
  whole top, houses (H) on the left and center, the 12 shops in a 3×4 grid right of the river, more
  houses right of the river below the shops, a big apartment (A) band in the bottom-LEFT, and the
  fairgrounds relocated to the bottom-RIGHT (kept empty for attractions). Center starting setup
  unchanged. Also: use the 3 tree designs, add a few benches that make sense, and more cars. Chosen
  approach: keep the buy-to-build system, reshape the zones (not a fully-pre-built world).
- **What changed (`CatoCapitalismGame_v4.html`):**
  - **Fairgrounds → bottom-right corner.** `placeZones()` fairgrounds rect moved from the full bottom
    band `{150,2360,3470,2800}` to `{2700,2320,3500,2800}` (right of the river); the 12
    `TOWN_ATTRACTIONS` default coords regridded into that corner (6 cols × 2 rows, bases 2540/2780);
    the FAIRGROUNDS ghost label moved to (3100, 2455).
  - **Apartment band → bottom-left.** Replaced the 10 spread-out promenade rowhouses with a fuller
    two-row band on the left: 8 columns (x250–1690) × 2 rows straddling the promenade road — upper
    row base 2560 (h176, tops clear the south-homes bottoms at 2280), lower row base 2795 (h150,
    tops clear the y2620 road band); tints alternate across the six apartment defs.
  - **Right-of-river homes.** Added a house row along the y1580 side street (x2850–3500) below the
    east shop district.
  - **Offices full-width.** North office rows extended from x300–3300 to x160–3480 so B spans the
    entire top edge; `row()` still skips the river corridor and vertical-road bands.
  - **Benches + cars.** Added four benches on the grass strip between the south homes and the new
    apartment band (a residents' green). Traffic raised from 4 to 10 cars — added opposing pairs on
    the top street (y220), the second bottom street (y2280), and the fairgrounds promenade (y2620).
    The 3 illustrated tree designs already rotate through the scatter (unchanged).
- **Why it matters:** the town now matches the user's intended layout — a clear civic/commercial/
  residential zoning read (offices up top, shops by the river, homes filling the neighborhoods,
  apartments massed bottom-left) with the fairgrounds as its own corner — while preserving the
  "buy the land, then build" economic lesson intact.
- **Verification:** reconstructed the full OneDrive file in the sandbox (the mount served a
  tail-truncated snapshot) and ran the jsdom ground-truth harness — clean load with zero errors,
  `buildWorld()` builds, all 12 shop kinds present exactly once, 16 apartments placed, fairgrounds
  label at the bottom-right. Rasterized the rendered world to PNG and visually confirmed it against
  the hand-drawn plan: offices span the top, shops sit right of the river in the exact drawn order
  (Café, Pharmacy, Bakery / Bookshop, Toy, Grocer / Pizza, Ice Cream, Flowers / Diner, Music,
  Hardware), homes fill left/center and right-of-river-below-shops, apartments mass bottom-left,
  fairgrounds empty bottom-right, center untouched. The whole script parsed under jsdom, so the
  10-car array edit is syntactically valid (cars don't instance in headless because `GFX.lowPower`
  suppresses `carsSVG` off-screen).
- **Follow-up (same day):** regenerated the two printable maps in `Maps/` to match the new layout —
  `World Map - All Buildings` (full built-out world, all districts owned) and `World Map - Land Only`
  (roads, roundabout, pond, river + bridges; building/prop functions stubbed to empty). Both
  re-rendered from the updated game via jsdom and exported to landscape PDFs (+ SVG originals).

---

## 2026-07-14, City-density pass + fairgrounds keep-out (sharpie-map compare, math + visual)

- **Direction:** compared the build against the user's sharpie drawing mathematically and visually.
  Fixes requested: houses were landing on the fairgrounds; houses under the shopping district were
  too sparse; and the town needed more offices, more apartments, and more houses on the left to read
  as a real city.
- **Math baseline (jsdom ground-truth on `EXP_BR`):** 103 expansion buildings — offices 12, west
  homes 20, apartments 16, and **2 houses intruding on the bottom-right fairgrounds** (the south
  y2280 back-lane, bases ~2388 inside the fairgrounds band).
- **What changed (`CatoCapitalismGame_v4.html`):**
  - **Fairgrounds keep-out** in `row()`: any lot with `cx>2680 && b>2300` is skipped, so nothing
    ever builds on the bottom-right fairgrounds (removed the 2 intruders at the root, not by hand).
  - **Offices** densified for a skyline: step 230→155 with `noVac` (no vacant lots) and floors
    3-5 (was 2-3) across the full top edge.
  - **Apartments** expanded to a 13-column × 2-row band (was 8×2), spanning x240–2220 and skipping
    the x1800 spine → ~26 units massed bottom-left for a true city block.
  - **Houses under the shops** (right of river) rebuilt as a dense double-lane block on the y1580
    street (step 150, both lanes, no vacancies).
  - **Left neighborhood** filled: west rows now build both lanes with no vacant lots plus a far-left
    column at the map edge (clear of the x240 spine).
- **Math after (jsdom re-run):** 142 buildings — offices 12→**27**, west homes 20→**36**, apartment
  units **26** (bottom-left area ~34 incl. adjacent homes), denser under-shop homes, **0 on the
  fairgrounds**; all 12 shop kinds still render exactly once; zero load errors.
- **Visual:** rasterized the rendered world to PNG and compared to the sharpie plan — dense office
  band across the top, packed left neighborhood, 12 shops with a full house block beneath, big
  apartment district bottom-left, homes across the bottom-centre, empty fairgrounds bottom-right,
  center untouched. (A live Chrome pass on the local file was not possible — the extension can't open
  `file://` URLs and the deployed site still runs the pre-edit build; edits remain local/unpushed.)

---

## 2026-07-14, Fix: tall offices blocked the road; fill the under-shop neighborhood (user report)

- **Direction (from a live look at the pushed build):** the avatar couldn't walk the top road, and
  the right-of-river neighborhood under the shops still wasn't full of houses.
- **Root cause (offices):** the previous pass raised offices to 3-5 floors, and `expOffice` registered
  the FULL building height as the player collider. A tall office on the `y420` row (base ~376) then
  extended its collider up past `y=240` — across the `y220` road band — so the road read as blocked.
- **Fixes (`CatoCapitalismGame_v4.html`):**
  - `expOffice`: player collider capped to the ground portion — `colH=Math.min(H*S,108)`, registered
    from the base up only; the prop keep-out (`EXP_BR`) still uses the full visual footprint, so the
    tall tower rises behind without blocking the road or map edge above it. Office floors returned to
    2-3 (the tall look now comes from COUNT, not height).
  - Under-shop homes rebuilt as a PACKED block: three rows (y1500/1690/1830) × five hand-placed
    columns (two fit between the x2760 & x3080 streets, three east of x3080) → a full neighborhood
    right of the river beneath the 12 shops.
- **Verification (jsdom ground-truth):** every building collider tested against every road rect —
  **0 building-vs-road overlaps** (was blocking before); under-shop homes **17** (up from ~4); all 12
  shop kinds present; 151 expansion buildings; zero load errors. Rasterized render confirms the top
  road is clear and the under-shop block is full. (Sandbox note: OneDrive again served a
  tail-truncated snapshot; the authoritative file is complete and the verified build was reconstructed
  in /tmp.)

---

## 2026-07-14, Complete single-player bug check (parse/boot/geometry/logic/runtime)

- **Direction:** "do a complete bug check on the game."
- **Method:** four jsdom harnesses against a parse-checked full reconstruction of the file — boot,
  geometry (all-owned + none-owned), logic fuzz, and a runtime/screens exercise. Full write-up in
  `BUG-TEST-2026-07-14.md`.
- **Bug found & fixed (`CatoCapitalismGame_v4.html`):** the south lower-street back-lane houses
  (base ~2388) overlapped the new apartment-band tops (2384) by ~6px. Dropped that back lane
  (south = y2040 both lanes + y2280 front lane only). Re-audit: **0 building-vs-building overlaps.**
- **Everything else clean:** 0 parse/boot/console errors; 0 building-vs-road (the office-collider fix
  holds); 0 buildings on the fairground; all interaction spots reachable; 493 questions / 1,972 choices
  all valid; stats always clamp [0,100] with no NaN; economy never goes negative; save/load roundtrips;
  a 6-term / 60-answer driven playthrough ran with 0 exceptions; all screens + build/place/quiz flows
  execute cleanly.
- **Notes (not bugs):** the relocated bottom-right fairground fits ~10 of 12 attractions (overflow
  can go in the downtown build zone); the river overlaps the 6 road crossings by design (bridges).

---

## 2026-07-14, Deep-dive bug check round 2: live browser + broader headless (post-push)

- **Direction:** "do another deep dive bug check" (after pushing the fixes live).
- **Live browser (deployed site):** confirmed the deploy carries the latest code (office ground-only
  collider, 10 cars, bottom-right fairground); 0 console errors; drove the real `collides()` engine —
  the top road is now WALKABLE (the reported block is gone), buildings/river block correctly, and
  bridges cross via the north half of each deck. Live full-map screenshot matches the intended city
  (dense offices, packed left, downtown intact, moving cars, river + bridges).
- **Broader headless:** 6 ownership states × 3 tiers → 0 load errors, 0 building-vs-road, 0
  building-vs-building, 0 on-fairground everywhere; 10/10 NPC anchors reachable; a 135-point road
  walkability scan found 0 blocked cells (only the river/bridge centerline, as expected).
- **Verdict:** clean, no new bugs. Full report appended to `BUG-TEST-2026-07-14.md`.
- **One pre-existing polish item (optional, not introduced by the rework):** the river collider starts
  at each bridge centerline, so the south half of every bridge deck reads as over-water; crossing
  still works via the north half. Could inset the river collider ~20px at each crossing.

---

## 2026-07-14, Teacher-portal / co-op server bug test

- **Direction:** "do a bug test on the teacher portal side of the game."
- **Method:** verified all `coop/` files read fully and pass `node --check` (`duel-bank.json` = valid
  113-question array); booted `coop-server.js` on a test port and drove it with a real HTTP client —
  endpoint/auth pass with no Redis, plus an account/PIN pass using an in-memory Redis stub. Findings
  appended to `BUG-TEST-2026-07-14.md`.
- **Result: 39/39 checks pass, no bugs.**
  - Teacher gating enforced: world-rename, tq create/decide/end, and kick all 403 without the room
    `teacherKey` and succeed with it.
  - No answer-key leaks: duel wire never carries `best`; student class-question view omits `correct`.
  - Duel is server-authoritative with zero-sum star deltas; tq answers scored server-side.
  - Accounts: creation, correct/wrong PIN, save-guarding, data round-trip, and brute-force lockout
    (429, blocks even the correct PIN during lockout; other accounts unaffected) all correct.
  - Security headers present; bad JSON → 400; oversized body settles fast (no hang); 404 on unknown.
  - Dashboard persists + sends the teacherKey on every teacher action; client never holds the key and
    shows "Not in a class yet" pre-join; privacy links + first-name guidance present.
- **Design note (not a bug):** the default MAIN world has no teacherKey, so teacher actions there are
  open (legacy anonymous behavior). Classroom use should always "Start a Class" for a keyed room.
## 2026-07-20, NPC question bank review export

- **Direction:** "create a document with all the in-game NPC questions... organize them by grade level and tell me what reading/writing standards you used."
- **Method:** parsed the `QG[6..12]` and `QGB.A/B/C` pools out of `CatoCapitalismGame_v4.html` by evaluating the question-definition block in Node, dumped to structured JSON, then generated a Word doc with docx-js.
- **Result:** `NPC-Questions-Review.docx` (155 pages, 403 questions). Organized by grade-specific pool (6-12) and the three shared reading bands, grouped by citizen/topic. Each entry shows the prompt, all four choices (best = free-market, flagged green), the Happiness/Economy/Education/Freedom effects, per-choice feedback, and the takeaway.
- **Standards note:** documented the reading bands the questions were authored against (labeled "NY Next Gen bands" in the source) — NY Next Generation / Common Core ELA Reading Standard 10 text-complexity bands (6-8, 9-10, 11-12) plus Writing Standards 1-2 for the claim/reason/takeaway structure. No game code or content was changed; this was a read-only export.

## 2026-07-20, Realism batch: five skills-reference changes (graphics + physics + economy ratio)

- **Direction:** "make the game more realistic and life-like using the game design claude skills... 5 in-game changes that make graphics, in-game physics, and relative game ratios better that mimic other popular games... look less AI generated... publishable level."
- **Method:** surveyed the live deployed build in Chrome (title, plaza, downtown, promenade, west residential, uptown) and audited the code in the sandbox against the skills-reference set (game-developer physics/balance rules, modeling3d/davinci lighting consistency, shader/threejs material notes). Five changes, all in `CatoCapitalismGame_v4.html`:
- **1. Sun-tracked building shadows (graphics).** Building cast shadows now share one sky: a `.bshadow` class on urban(), bldCivic() and apt() cast shadows, driven by three CSS variables the lighting pass updates from the day clock. Shadows lean west at dawn, sit short under the wall at noon, stretch long east at dusk, and fade out at night so lamps and windows take over. The day-cycle grounding trick of top-down life sims (Stardew, Zelda-likes); 39 shadow-casters on the base map, more as the town grows.
- **2. Organic grass patch scatter (graphics).** The 260 ground patches were a fixed lattice of 4 sizes on a `(i*457, i*331)` grid — exactly the kind of repetition that reads machine-made. Replaced with 300 hash-jittered patches with per-patch rotation, size and opacity, the standard terrain-artist tiling break-up.
- **3. Vehicle suspension physics (physics).** Cars now carry weight: braking for a pedestrian pitches the nose down (spring-damped, capped ±4.5°), pulling away squats the tail, cruise adds a faint road bob, and a car pulling away from a full stop puffs exhaust from the tailpipe. Verified headlessly: brake dive to +2.9°, pull-away squat to −3.2°, both easing back to level.
- **4. Soft character collision (physics).** The player can no longer ghost through citizens: within 30px both ease apart (citizen yields more than the player), respecting world colliders on both sides. Verified: overlap distance 2.0 → 23.5 and separating. Standard NPC-blocking softness from top-down RPGs, without hard walls that would snag movement.
- **5. Bank interest rebalance (relative game ratios).** 5%/5min compounding was ~80%/hour and had minted a 5.1M-star test balance that made every price in the game meaningless (venues top out at 3,800). Now 1% per 5 minutes, paid on the first 50,000 saved, max 3 ticks per accrual; bank overlay copy updated to match. Same fix Nintendo shipped for Animal Crossing's Bank of Nook when interest farming broke its economy. Existing balances are kept, they just stop compounding to the moon.
- **Verification:** full game script passes `node --check`; boots in jsdom with 0 errors and 300 ticks run clean; bank accrual unit-checked (5M/3h → +1,500 capped; 10k/6min → +100); headless Chromium screenshots confirm shadow sweep (skew −25° morning → +32° evening, length 0.56 → 1.74), organic grass, and suspension pitch traces.

## 2026-07-20, Realism batch 2: five more skills-reference changes (living-world + economy)

- **Direction:** "continue by making more changes like these. 5 more."
- **Method:** same playbook as the first batch — scouted remaining "static world" tells in code and screenshots, checked what the earlier polish passes had already covered (footstep dust, cloud shadows, fountain spray all existed), and picked five untouched gaps. All in `CatoCapitalismGame_v4.html`:
- **1. Citizens notice you (life).** An idle citizen within ~85px now turns to face the player as they approach — the universal RPG-villager tell. Uses the existing smoothed-facing pipeline so they pivot naturally instead of snap-flipping, and never interrupts walking, greeting, or the night walk home.
- **2. Brush-past foliage rustle (physics).** Every tree and bush registers its base point (`FOLI`, 53 on the base map); hurry within 32px and the canopy shakes off the contact with a short damped-rotation rustle (Zelda-style reactive foliage). Instanced `<use>` trees were restructured into a positioning `<g>` wrapper so the CSS animation never fights the placement transform.
- **3. Night window light-spill (graphics).** Lit buildings now pour a warm pool onto the ground in front of them at night — a `winspill` ellipse on urban(), bldCivic() and apt() (35 on the base map), driven by a `--spillOp` variable the lighting pass computes from the same curve as the lamp glow. Streets at night read lived-in (Stardew night look) instead of uniformly dark.
- **4. Plaza pigeons (life/physics).** Six pigeons peck and hop around the plaza, park, market and promenade; charge at one and it bursts away in a flapping arc (velocity + slight lift, wing-flap squash), disappears into the distance in ~1.5s, and glides back to its patch once the player is well clear. GTA/Zelda-style ambient wildlife that makes public spaces feel inhabited.
- **5. Hot-streak star bonus (relative game ratios).** Consecutive best answers now pay a Kahoot-style streak bonus: +40/+80/+120 (capped) on the 2nd/3rd/4th+ best-in-a-row, on top of the 120+380 base. Rewards sustained good judgment; per-question payouts verified at 500/540/580/620/620 — modest enough that building prices stay meaningful post-bank-fix.
- **Verification:** full script passes `node --check`; jsdom boot 0 errors, 300 ticks clean; headless Chromium behavior tests — NPC faces player (left → face −1), rustle triggers at 6px pass distance, birds flee 104px then despawn and respawn, `--spillOp` 0.498 at midnight / sun shadows 0.00, streak payouts exact. Night screenshot confirms the spill pools and shadow fade-out.

## 2026-07-21, Renamed "The Policy Game" to "Freedom Founder"

- **Direction:** brainstorm a new game name (short, fun, includes "freedom" or "liberty", connected to
  Cato's mission without saying "Cato"), then replace "The Policy Game" everywhere with the chosen name.
- **Why:** "The Policy Game" undersold the game, it read as a dry classroom label rather than something
  a player would want to tell a friend about. "Freedom Founder" keeps the liberty theme front and center
  and matches what the player actually does: found and build a city from nothing, term after term.
- **Changes:**
  - Renamed `CatoCapitalismGame_v4.html` → `FreedomFounder_v4.html`; updated its `<title>`, title-screen
    `<h1>`, and the feedback-form subject line ("Policy Game Feedback" → "Freedom Founder Feedback").
  - `coop/coop-server.js`: file-detection regex now matches `FreedomFounder*.html` (kept matching the old
    `CatoCapitalismGame*.html` pattern too, so nothing breaks if an old build is still on disk); updated
    the header comment and the "game file not found" error text.
  - `coop/privacy.html`: title and body copy now say "Freedom Founder" instead of "The Policy Game" /
    "Cato Capitalism Game."
  - `coop/dashboard.html`: teacher dashboard title and sub-header updated.
  - `How-To-Play-Walkthrough.html`: title tag, brand bar, and title-screen slide (both the narration title
    and the rendered SVG text) updated.
  - `package.json`: package name `cato-capitalism-coop` → `freedom-founder-coop`; description updated.
  - Launcher scripts (`Start Co-op Host (Mac).command`, `(Windows).bat`) and the example commit message in
    `coop/DEPLOY.md` updated to the new name.
  - This log's own title and intro line updated to lead with the new name, noting the prior name for
    continuity. Older dated entries above were left untouched, they're an accurate record of what the
    project was called and which filenames existed at the time.
- **Deliberately left unchanged:** `render.yaml`'s service `name` (still `cato-capitalism-coop`), and the
  GitHub-repo-naming instructions in `coop/DEPLOY.md`. Those map directly to the live
  `cato-capitalism-coop.onrender.com` URL; changing them is a real infrastructure decision (could rename,
  duplicate, or orphan the live service depending on how Render's Blueprint sync treats the name change)
  that needs to happen deliberately in the Render dashboard / GitHub, not as a side effect of a text
  find-and-replace.
- **Follow-up (not yet done):** commit and push these changes from the actual git repo (this session
  couldn't reach it), and decide separately whether to rename the live Render service / GitHub repo to
  match.

## 2026-07-21, How-to-play tutorial videos (student + teacher), embedded in the game

- **Direction:** "create a video how-to-play tutorial for both students and teachers... incorporate all features of the game... attach the videos to the game (student video on the loading screen, teacher video on the teacher interface)."
- **Method:** scripted real gameplay in headless Chromium (Playwright screencast at 1280×720, Noto Color Emoji installed so icons render) with an injected caption bar, visible click cursor, and fade transitions; teacher footage runs against a live local co-op server (real class code created, joined, and shown on the dashboard). Segments assembled with ffmpeg into H.264 MP4s with branded title/end cards.
- **`howto-student.mp4` (2:20):** covers naming a nation, leader builder, grade levels 6–12, name+PIN saves/Save Codes, walking (WASD/joystick), the four stats, citizen questions with feedback/figures, stars + streak bonuses, Build, Bank, Market/emotes, house upgrades, School recaps, minigames, duels, day/night + seasons + weather, world events, and the end-of-term report card.
- **`howto-teacher.mp4` (1:55):** any-browser/no-install pitch, per-student reading bands, privacy-first accounts, the /join projector screen with QR, Start a Class + class codes on the /host dashboard, the student join flow (recorded live: "Class AJWP · 1 online"), the live leaderboard (cards, sorting, class goal), the Class Question tool with ⭐250 awards, /privacy, and a links recap.
- **Embedding:** title screen's "How to Play" card gains a 🎬 "Watch the 2-minute video" button opening a modal player (`FreedomFounder_v4.html`); the teacher dashboard header gains a 🎬 "Teacher video" pill with the same modal (`coop/dashboard.html`); `coop/coop-server.js` serves both files at `/howto-student.mp4` and `/howto-teacher.mp4`. Videos load with `preload="metadata"` so they cost nothing until tapped.
- **Verification:** live local-server test — both routes return 200 `video/mp4` (3.8MB / 2.8MB), both modals open and the players show correct durations; server passes `node --check`; spot-checked frames across all 10 recorded segments for caption/emoji/gameplay correctness.

## 2026-07-21, Ten-fix batch from user playtest (dashboard, class flow, duels, cleanup)

- **Direction:** ten numbered fixes from the user's review (plus a note that the tutorial videos will be re-recorded without glitches or em dashes).
- **1. Dashboard health bars now match the student's screen.** The co-op client was syncing raw policy stats while the student's HUD shows `dispStats()` (policy + town building bonuses), so anyone who had built before joining looked wrong on the dashboard. The client now reports the same numbers the student sees (`coop/coop-client.js`).
- **2. Cato logo on the dashboard.** The dashboard header now carries the white Cato Institute logo top-left (same SVG as the game header); the leaderboard title, world name, and controls all sit top-right (`coop/dashboard.html`).
- **3. Privacy button stands out.** The dashboard privacy pill went from faint translucent white to a solid green gradient.
- **4. Class-question drafts are private (verified + labeled).** Confirmed drafts never touch the network until "Post to the class" (the room's `tq` only exists after `/__coop/tq/create`); the popup now says so explicitly so teachers can type with confidence.
- **5. How to Play = the video.** The title-screen accordion text and stat explainers are gone; the card is now a single 🎬 "How to Play (2-minute video)" button. The in-town WASD/joystick hint bars at the bottom of the screen are removed too.
- **6. School links audited (all 27).** Fetched every Learn-screen link: 26 were correct; `cato.org/multimedia` now redirects to the Tax & Budget department page (as the user reported), so the hub is now 🎧 "Cato Podcasts" pointing at `cato.org/podcasts` (verified live).
- **7. Same-wifi QR join retired.** Students join only by class code inside the game. `/join` now redirects home, the dashboard's "Join screen" pill is gone, the empty-state and HOW-TO-HOST instructions now describe the code flow.
- **8. Duel questions match reading level.** Generated `coop/duel-bank-by-grade.json` from the game's own QG grade pools (grades 6-12, 40-113 questions each); the client reports each player's grade, and the server draws both duelists' identical questions from the more accessible of their two levels (server-authoritative, so no cheating window reopened). Verified: a grade-6 vs grade-11 duel served grade-6 questions.
- **9. Title stands alone.** The tagline under "Freedom Founder" on the home screen is hidden.
- **10. Market/Bank mini-avatars removed.** The decorative people (and their floating coins) at the Market and Bank are gone; the schoolyard kids stay.
- **Verification:** game passes `node --check` and boots in jsdom with 0 errors (hint bars gone, tagline hidden, podcasts link live, how-to button present); server passes `node --check`; live server test confirms `/join` → 302, dashboard renders logo/green privacy/draft note/no join pill, and the duel API serves grade-banked questions.

## 2026-07-21, Follow-up: market strollers removed + teacher dashboard reorganized

- **Market avatars, round 2 (user re-report):** the first pass removed the fperson() pairs at the Market and Bank, but two ambient "stroller" pedestrians near the market (inline SVG literals at core 838,1052 and 900,990, not drawn through fperson) survived. Both removed; verified with a live screenshot that the market frontage now shows only the stall, produce cart, barrels and crates.
- **Teacher dashboard reorganization:** header now reads as three clear zones: Cato logo alone top-left; title plus a grouped settings card (World name / Rank by / online count) top-right; and one action row (Class Question / Teacher video / Privacy) that wraps as a unit. Below the header, the class-code panel and the Class Goal card sit side by side in a responsive two-column grid (stacking on narrow screens) instead of two full-width stacked bars, so the leaderboard starts higher on the page.
- **Verification:** game passes node --check and renders the clean market; dashboard screenshot confirms the new layout with a live class code (logo left, grouped controls right, two-column top row, leaderboard visible without scrolling).

## 2026-07-21, Binding duels: no backing out, walk-outs forfeit the pot

- **Direction:** "once you join a duel, you cant back out until both parties finish answering the questions and if one party leaves, the one still on gets the rewards."
- **Server (`coop/coop-server.js`):** `/duel/cancel` now only withdraws PENDING challenges; an accepted duel cannot be cancelled by either side. `pruneDuels` gained presence-based forfeit: if one duelist goes silent for 12s mid-duel (clients sync every 160ms) while the other is still connected, the duel settles immediately as a forfeit; the player who stayed wins the full pot (server-authoritative star delta), it counts as a normal win/loss, and the result carries a `forfeit` flag. Both gone for 60s voids the duel (wagers never moved). A 5-minute cap stops stalling: whoever has finished answering wins; if neither finished, the duel voids.
- **Client (`coop/coop-client.js`):** the "Quit duel" button (mid-questions) and "Leave duel" button (waiting screen) are gone, replaced with notes that duels are binding and that a walk-out hands the pot to the opponent. The accept dialog warns "Accepting is binding" before a player commits. The result screen has forfeit wording: "🏳️ Opponent left! ... you take the pot" or "You left the duel ... forfeits the pot". Declining a pending challenge and withdrawing an unanswered challenge both still work.
- **Verification (live server):** cancel attempts on an active duel by both players left it active; a walk-out settled in ~12s as winner=stayer, forfeit=true, delta +500/-500; pending-cancel still cancels; a normally completed duel still settles by score with forfeit=false. Both files pass node --check.

## 2026-07-21, Multiplayer bug test: 4-account classroom simulation (~20 min)

- **Direction:** "complete bug test... 20 minutes... multiple agents playing on numerous chrome browsers on different game accounts to simulate a real game."
- **Method:** built `outputs/bugbot.js` — a Playwright rig that boots four separate Chromium contexts (four distinct student accounts: speedy/tycoon/social/chaos, grades 6/10/8/12) into one shared class code on the DEPLOYED site, plus a teacher polling `/__coop/state` and posting Class Questions. Ran 15 rounds (~30s each of concurrent play), logging every pageerror/console-error/network-failure and checking economy + stat invariants each round; a parallel static-audit agent read the game + coop source. Two isolation harnesses pinned the high-severity findings.
- **Result — strong stability:** across 15 rounds, 0 crashes, 0 uncaught JS errors in normal play, 0 negative/NaN star or bank balances, 0 out-of-range stats. Bad class codes, emoji input, overlay spam, double-clicks, and mid-question reloads all handled cleanly.
- **Bug 1 (HIGH, star exploit):** a settled duel keeps returning the winner's authoritative `+wager` delta on every sync for 60s, and the client's re-apply guard is in-memory only — so a winner who reloads within 60s re-banks the pot (verified: 3 syncs each returned +500). Duels need a server-side `credited` flag like the teacher-question flow already has.
- **Bug 2 (HIGH, stored XSS):** the nation name is injected unescaped at `FreedomFounder_v4.html:3028` (`#begin-btn` innerHTML); a `<img onerror>` name executes, and during the multi-bot run it fired in other students' browsers 4 times — an intermittent cross-user path. Most other name sinks already escape. Fix: sanitize at source + escape the begin-btn sink + strip HTML server-side.
- **Bug 3 (LOW, cosmetic):** dashboard health bars lag the live student HUD by ≤5 points (both directions) — `/__coop/state` snapshot latency, self-corrects in seconds; not the earlier stat-source bug.
- **Deliverable:** `BUG-TEST-2026-07-21.md`. No game code changed in this pass (test only); fixes pending user go-ahead.

## 2026-07-21, Bug fixes from BUG-TEST-2026-07-21 (Fable 5 orchestration, Opus 4.8 subagents)

- **Process:** Fable 5 analyzed the bug test and wrote `FIX-PLAN-2026-07-21.md`, then dispatched two Opus 4.8 subagents on disjoint files (no merge conflicts), a third Opus agent as an independent adversarial reviewer, and finished with a Fable 5 integration + live-regression pass.
- **Bug 1 fixed (HIGH, duel reward duplication) — `coop/coop-server.js` + `coop/coop-client.js`:** duels now credit each player exactly once, mirroring the teacher-question `credited` pattern. `duelView(d, viewerId, credit)` marks `d.credited[viewerId]` the first time the settling result is reported via the `/__coop/sync` path and zeroes that viewer's `delta` on every later view (win/lose text and correct-counts still render). Only the sync caller passes `credit=true`; challenge/respond/answer never credit, and the client banks stars only from sync. Client `applyResultOnce` now applies nothing (no stars, no win/loss counters) when the server delta is 0 on a non-tie result, with the in-memory `applied{}` guard kept as a second layer. Covers both the normal `scoreDuel` and `settleForfeit` paths.
- **Bug 2 fixed (HIGH, nation-name stored XSS) — `FreedomFounder_v4.html` (+ server defense-in-depth):** the begin-button sink now uses `escapeHtml(nationName)`; a new `sanitizeNationName()` strips `<>` and control chars and clamps to 40 chars, applied on every set/load path (`customNationName`, `applySaveData`, `activateProfile`). Full sink audit confirmed every other name→innerHTML sink was already escaped (bank header, profiles, history) or uses `textContent`. Server-side, `cleanStr()` strips `<>` and clamps length on `name`, `emote`, duel names, world name, and TQ answers before storage, so no client can receive a payload.
- **Bug 3 (LOW/cosmetic) — `coop/dashboard.html`:** downgraded (real dashboard already polled every 1.2s and shows an "updated" timestamp; the gap the rig saw was its own 9s poll). Tightened the dashboard refresh to 800ms.
- **Verification:** independent Opus reviewer adversarially re-tested both fixes (reload/forfeit/tie/loser/concurrency for the duel; 9 XSS payloads across every name path) — both PASS. Fable 5 finalizer re-ran the 4-account live rig against the fixed local build: **0 XSS events (was 25+), 0 other issues, 0 server errors**, and a deterministic duel check showed the winner paid +500 once then 0 on repeated syncs. All three files pass `node --check`; the game boots clean in jsdom.

## 2026-07-22, Tutorial videos v2: smooth, feature-complete remakes (student + teacher)

- **Direction:** "Recreate the video without it being laggy and showing all the features that a user might encounter... explained as if the tutorial was meant for a 6 year old... replace the old tutorials on both websites."
- **Problem with v1:** the old screencast-based videos were effectively slideshows — the 2:20 student video contained only 405 unique frames out of 3,366 (~3 fps of real motion, the rest frozen duplicates), captions used em dashes and jargon, and whole systems (minigames, duels, class questions, world events, report card, house, history, emotes, joystick) were skipped or glossed over.
- **Method:** scene-by-scene deterministic capture in headless Chromium against a live local co-op server — crisp 2560×1440 screenshots of 38 student scenes and 18 teacher scenes, each composed in-page with a numbered kid-style caption bar and a yellow spotlight ring that dims everything except the feature being taught. The walking segment was captured with CDP virtual-time stepping (33ms budget per frame), so gameplay motion is true 30fps with zero dropped frames. Scenes were assembled with ffmpeg (gentle Ken Burns zoom toward each spotlight, dip-to-black fades, constant 30fps H.264, faststart). Result: 6,922 unique frames out of 6,922 — every frame animates.
- **`howto-student.mp4` (3:51, 12.9MB):** 38 numbered steps in first-grader language covering sign-in (name+PIN), Save Codes, leader builder, grade picker, naming the nation, the town, WASD walking + mobile joystick, the four stat bars, minimap, stars, header buttons, citizen questions (choices, why-feedback, newspaper), streak bonuses, Build + fairgrounds, Bank + interest + memory match, Market + arcade, Town Hall quiz, house upgrades, School, history scroll, Join a class, playing together, duels, emotes/quick-chat, Class Questions (banner + answering), world events, the Term Report Card, Keep Governing, and day/night/seasons.
- **`howto-teacher.mp4` (1:51, 6.8MB):** 18 steps covering the no-install pitch, grade-leveled play, the /host dashboard, Start a Class + 4-letter code + Copy link, live join counter, per-student leaderboard cards, Rank by + term champion, the duels column, Class Goal, posting a Class Question (MC auto-award + short-answer Award flow), world rename/kick, privacy (first names only), and the Teacher video pill.
- **Deployment:** replaced `howto-student.mp4` and `howto-teacher.mp4` in place, so both the game modal (`FreedomFounder_v4.html`) and the teacher dashboard pill (`coop/dashboard.html`) plus the server routes serve the new files with no code changes; the title-screen card and button now read "How to Play (4 minutes)" to match the new length.
- **Verification:** live local-server test — both routes return 200 `video/mp4` (12,911,338 / 6,800,062 bytes), the student modal reports 230.7s and the teacher modal 110.6s, mpdecimate confirms every output frame is unique (no frozen/laggy stretches), and contact-sheet review of all 56 scenes confirmed captions, spotlight rings, emoji, and no em dashes anywhere.

## 2026-07-22, Tutorial videos v2.1: removed the Ken Burns zoom

- **Direction:** "remove the ken burns effect. No need to zoom in and out."
- **Change:** rebuilt both tutorials from the same 56 captured scenes with each step now shown as a steady full-frame shot (no pan/zoom); kept the 30fps timing, dip-to-black fades, captions, and spotlight rings. Bonus: static frames compress far better, so `howto-student.mp4` dropped 12.9MB → 5.3MB and `howto-teacher.mp4` 6.8MB → 2.0MB at the same visual quality, with durations unchanged (3:51 / 1:51).
- **Verification:** both server routes return 200 with the new byte sizes, ffprobe confirms durations, and a spot-checked frame shows the full UI steady and uncropped.
