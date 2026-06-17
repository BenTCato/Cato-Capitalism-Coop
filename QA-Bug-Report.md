# Cato Capitalism Game — QA Playtest Report

**Date:** June 15, 2026
**Build tested:** live deploy `https://cato-capitalism-coop.onrender.com` (commit `3df8368`, v4 with the new open-world + export/import changes)
**Method:** Two simulated players ("Maya QA" and "Theo QA") driven through every mechanic in real browser tabs, with console-error capture after each phase. No console errors or exceptions were observed in any phase.

---

## TL;DR

The game is stable — no crashes, no console errors, and the core loop, co-op, and leaderboard all work. **But removing the end screen had a side effect that quietly breaks the economy and removes the educational payoff**, because several important things only used to happen on the (now unreachable) results/game-over screens. Details below, ordered by severity.

---

## 🔴 Critical

### 1. Players can no longer earn Stars (the whole economy is frozen)
- **What happens:** I played full terms (answering all 10 citizens repeatedly). `P.stars` never changed. Confirmed in code: stars are only ever credited by `bankStars()`, and its only call sites are inside `renderGameOver()` and the results screen — both of which we made unreachable when we removed the end screen. There is exactly one `stars +=` in the whole game and it lives inside `bankStars()`.
- **Why it matters:** Stars are the currency for **both** the Star Store (vanity items) and **house upgrades**. New leaders start at 0 stars. So in the current build a real student can *never* buy a vanity item or upgrade their house. On the teacher leaderboard, "house upgrade level" and "vanity items collected" will sit frozen at the defaults for everyone — and those are two of the columns the leaderboard is built around.
- **Note:** The store/upgrade math itself is fine — when I manually granted stars, buying boxes and upgrading houses deducted correctly, never went negative, and never gave free items. The problem is purely that stars are never awarded during play.
- **Fix direction (for later):** Award stars during the open-world loop — e.g., bank `score` into `P.stars` at each term rollover inside `continueTerm()`, or award stars per citizen helped, before the score resets.

### 2. Score resets to 0 every term (no cumulative progress)
- **What happens:** `continueTerm()` resets `score`, `streak`, `bestCount`, and counts to 0 for the new term. With the new endless-term design, this means the leaderboard "Score" climbs during a term and then **drops back to 0** at every rollover.
- **Why it matters:** For a class leaderboard that's meant to run continuously, score should probably accumulate (or be banked into a running total) rather than reset every ~10 questions. Right now rankings will lurch around at each term boundary.
- **Fix direction:** Keep a cumulative/lifetime score (e.g., `P.best` or a new `P.totalScore`) that the leaderboard reads, and/or bank the term score before resetting.

---

## 🟠 Important consequences of removing the end screen

### 3. The educational "results" payoff is now unreachable
Removing the results/game-over screens also removed everything that lived only on them:
- **Ideology result** (`ideologyResult()` — "You're a Libertarian Capitalist / Social Democrat / …") with its explanation.
- **Historical parallels** (`HIST_PARALLELS` — Venezuela, USSR, East Germany, etc.) tied to which stat collapsed.
- **Answer review** (`renderReview()` — what the best evidence-based answer was for each question).
- **Achievements** (`renderAchievements()`), **letter grade** (`computeGrade()`), and the end-of-run **city render**.

For a Cato education game, that review/ideology content is arguably the main teaching moment, and students will now never see it. This may be intended ("just roam"), but flagging it in case you'd rather **surface it inside the open world** — e.g., a "📊 My Report" button in the town that opens the ideology result + review on demand, instead of a forced end screen.

### 4. `computeGrade()` is based on a per-term counter that now resets
The leaderboard "Grade" reads `computeGrade()`, which uses `S.bestCount` — but `continueTerm()` resets `bestCount` to 0 each term. So a student's grade also resets every term and only reflects the current term, not overall performance. Tie this to whatever cumulative metric you choose in fix #2.

---

## 🟡 Minor / by-design (not blocking)

### 5. Two tabs in one browser share one co-op identity
The player ID is stored in the browser's local storage, which is shared across tabs of the same site. So two tabs in the *same* browser appear as a single player. This is **not** a problem for real students (each is on their own device/browser), and I worked around it in testing by assigning distinct IDs. Worth knowing only if a single user opens the game twice.

### 6. Remote avatars only animate while the tab is in the foreground
Browsers pause animation timers in background tabs, so a co-op player's avatar won't visibly move on your screen while *your* tab is in the background. In normal play everyone's own game is in front, so this is invisible — but it's why, during testing with multiple tabs at once, a remote avatar sometimes looked "frozen" until I focused its tab. The position data itself syncs correctly through the server regardless.

### 7. Export/import carries progress that doesn't yet exist
The export code correctly carries stars/house/vanity, but until bug #1 is fixed, new players have none of those to carry. Once stars are earnable, export/import becomes fully meaningful. (The round-trip itself works perfectly — verified export → wipe → import restores avatar, name, stars, house, and items exactly.)

---

## ✅ Verified working (no issues found)

- **No console errors or exceptions** in any phase (title, town, store, home, learn, co-op).
- **Avatar creator:** every tab (skin, hair, color, eyes, beard, glasses, outfit, extras), individual picks, and "random avatar" all work.
- **Profiles:** create new, switch, delete, nation naming (custom + auto) all work.
- **Export / Import:** 📤/📥 buttons present; full round-trip restores avatar + name + stars + house + items exactly; bad codes are rejected with a friendly message.
- **Town & questions:** walking, talking to citizens, answering, stat changes, score, feedback panel, figure quotes, and the newspaper overlay all work.
- **No end screen (as designed):** stats driven to 0 do **not** trigger game-over; answering all 10 citizens rolls straight into a fresh term of 10 new questions while staying in the town.
- **Store & home economy math:** box purchases (2,500 stars) and house upgrades deduct correctly, block when funds are insufficient, never go negative, never grant free items.
- **NPC independence:** Maya answering citizen #3 left citizen #3 fully available for Theo — NPC progress is per-player, never shared. (This was a specific request — confirmed good.)
- **Co-op + leaderboard:** two distinct players show on the dashboard with correct house tier name, vanity count (x/16), score, term, health average, and online/idle status; world rename works; both players render each other's named avatars in the shared town.
- **Misc:** stats clamp to 0–100; undo/back button runs; world events fire without error; re-opening an already-answered citizen does **not** double-count.

---

## Suggested priority for the fix session

1. **Re-enable star earning** in the open-world loop (critical — unlocks store, house upgrades, and two leaderboard columns).
2. **Decide score model** for endless play (cumulative vs. per-term) and point the leaderboard score + grade at it.
3. **Decide whether to preserve the educational report** (ideology result / historical parallels / review) via an on-demand button in the town.
4. Everything else is optional polish.

*Test note: the live leaderboard currently shows two leftover test players ("Maya QA", "Theo QA"); they'll drop off automatically a few seconds after those tabs close.*

---

# Round 2 — Re-test after star / score / grade fixes (June 15, later)

**Build:** live `cato-capitalism-coop.onrender.com` with star-earning, cumulative score, term recap, and the new lifetime + per-term grade system.

## Result: all clear — no new bugs

**Fixes from Round 1 verified working live:**
- **Stars earn + bank:** played 3 full terms; stars accrued from correct answers (+participation) and banked into a bank that **persisted across terms** (ended at 3,000⭐). Store/house are now usable.
- **Term recap:** the Term Report (ideology, history, review, grade, stars earned) shows at each term end and its "Keep Governing →" button returns to a fresh term. No forced game-over.
- **Cumulative score:** `lifetimeScore` accumulated across terms (2,445 after 3 terms) and the leaderboard/HUD show the climbing total.

**New grade feature verified:**
- **Per-term grades recorded:** 3 terms logged distinct grades (D, D, C) with per-term scores and best-answer counts.
- **Lifetime grade:** computed from the best-answer ratio across all terms (6/30 → D), updates live.
- **Dashboard "Rank by" selector:** dropdown correctly lists **Lifetime + Term 1…N**. Switching modes re-ranks and re-labels both the leaderboard and the city cards:
  - Lifetime → Beta (A, 5,800) over Alpha (D, 2,565)
  - Term 1 → Beta (A) / Alpha (D); Term 2 → Beta (S) / Alpha (D); Term 3 → Beta (B) / Alpha (C)
  - Players who haven't reached a selected term correctly show "—".
- **No console errors** from game code on any tab (only the benign browser-extension "message channel closed" notices, which are not from the game).

## Notes (not bugs)
- **The in-progress (current) term appears in the Rank-by list** and shows a partial grade until that term is finished. Intended, but worth knowing.
- **Reloaded tabs needed after a deploy:** an already-open tab keeps running the old code until refreshed (normal web behavior). During testing one tab briefly looked like it "wasn't recording terms" — it was simply running the pre-deploy page; a refresh fixed it.
- **Re-confirmed the two Round-1 by-design items:** background browser tabs get throttled (a backgrounded test player was pruned from "online"); and two tabs in one browser share a co-op ID. Neither affects real students on their own devices/foreground tabs.

**Bottom line:** the star economy, cumulative scoring, term recap, and the lifetime/per-term grade selector all work correctly on the live build with no game errors.
