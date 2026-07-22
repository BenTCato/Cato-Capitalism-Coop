# Security & Privacy Audit — Freedom Founder (Cato Capitalism Game)

**Date:** 2026-07-22
**Scope:** `FreedomFounder_v4.html`, `coop/coop-server.js`, `coop/coop-client.js`, `coop/dashboard.html`, `coop/join.html`, `coop/privacy.html`, `package.json`, `render.yaml`
**Method:** Repeat of the 2026-07-13 process. Applied the security/privacy skills in `skills-reference/` — Anthropic `security-review`, `owasp-security` (OWASP Top 10:2025 / ASVS 5.0), Trail of Bits `insecure-defaults` and `supply-chain-risk-auditor`, and `coppa-children-privacy`. Three independent reviewers traced data flow across the server, the browser client + dashboard, and the game file/config; findings were verified against the live code before any fix, then fixed server-side and unit-tested.
**Goal:** Re-confirm publication readiness after the tutorial-video work and the July 21 bug-fix pass.

---

## Executive summary

The baseline remains strong: **zero third-party runtime/dev dependencies** (no supply-chain attack surface), name+PIN auth with a constant-time compare, environment-variable secrets that fail secure, and a published, code-enforced privacy posture. The prior audit's four fixes (PIN throttle, `timingSafeEqual`, 4-digit minimum PIN, baseline response headers) are all still present and correct.

This pass found **four new server-side issues** — one that effectively regressed the prior brute-force fix, one live "cheat"/data-leak in the class-question flow, one stored-XSS path into the teacher's browser (the same class of bug as the previously fixed nation-name XSS, but via other relayed fields), and one weak-randomness issue on the teacher key. **All four are fixed and unit-tested (17/17 passing) and verified against a live server.** One additional item (client-asserted player identity) is documented as a recommended follow-up because a proper fix is architectural; its impact is limited to in-session griefing, not durable data.

No SQL/command injection, path traversal, RCE, hardcoded secrets, or supply-chain exposure were found.

---

## Findings and status

### 1. Brute-force throttle bypassable via spoofed `X-Forwarded-For` (HIGH) — FIXED
- **Where:** `coop/coop-server.js`, `clientIp()`/`throttleKey()`, used by `/__coop/account/signin` and `/__coop/account/save`.
- **Issue:** The prior audit's throttle keys on `clientIp + '|' + name`, and `clientIp()` trusts the first value of the client-supplied `X-Forwarded-For` header. A direct caller can send a different spoofed value on every request, giving each PIN guess its own throttle bucket, so the lockout never triggers. This defeats prior fix #1 and re-exposes the entire 10,000-value 4-digit PIN space for any known student name.
- **Fix applied:** Added a second, **IP-independent per-account failure counter** (`authFailsByName`, keyed only on the lowercased name): 30 failures within a 10-minute window locks that name for 10 minutes regardless of source IP (real or spoofed). The original per-(client+name) throttle is retained. Both account endpoints now call combined guards (`authBlockedReq`/`noteAuthFailReq`/`noteAuthOkReq`), and the prune cycle cleans both maps. Tradeoff noted: a griefer could trip a name's cap and briefly lock a real student out; the window is short, self-resetting, and cleared on any successful sign-in, which is an acceptable price for closing an account-takeover path. (`X-Forwarded-For` is still read for the per-IP layer because on Render the app runs behind a proxy; the per-account cap is what makes spoofing pointless.)

### 2. `/__coop/state` leaked the class-question answer key + student responses (MEDIUM) — FIXED
- **Where:** `coop/coop-server.js`, `/__coop/state`; the student sync path (`tqStudentView`) already withholds the correct answer.
- **Issue:** `/__coop/state?room=CODE` performed no key check and returned `tqDashView(r.tq)`, which includes `correct` (the right choice) and every student's name + typed answer. Any student who knew the room code could `GET` it before answering and always win the ⭐250 reward, and it exposed classmates' responses/names to anyone (CORS is `*`).
- **Fix applied:** `/__coop/state` now returns the full teacher view only when the caller presents the room's `teacherKey` (via `teacherOK`); everyone else gets a new `tqPublicView` with the question, choices, reward, and a response count but **no answer key and no per-student responses**. The dashboard now sends its stored `HOSTKEY` on the poll, so the teacher view is unchanged; the `/join` projector screen (which never used the answer key) is unaffected. Verified live: student view returns `correct: undefined` with no responses; keyed teacher view returns `correct: 0` with the responses array.

### 3. Stored XSS into the teacher dashboard via unsanitized relayed player fields (HIGH) — FIXED
- **Where:** `coop/coop-server.js` `/__coop/sync` (only `name`/`emote` were cleaned) → `publicList()` relays fields verbatim → `coop/dashboard.html` interpolates several into `innerHTML` unescaped (e.g. `term` in text context, `grade` inside a `class="…"` attribute, plus numeric fields).
- **Issue:** The entire `/__coop/sync` body is attacker-controlled. A student could POST a crafted `term`/`grade`/`stars` (e.g. `term:"<img src=x onerror=…>"`); the server stored and relayed it, and the teacher's dashboard — polling every 800 ms and privileged, holding the teacher token in `localStorage` — rendered it into `innerHTML`, executing script in the teacher's browser (token theft → teacher-endpoint takeover). Same bug class as the nation-name XSS fixed on July 21, via different fields.
- **Fix applied (defense in depth, sanitize at source + escape the sink):**
  - **Server:** new `sanitizePlayerState()` runs on every `/__coop/sync` body before storage — string display fields go through `cleanStr` (strips `<>`, clamps length); `stars/score/house/vanity/vanityTotal/duel*/term` are coerced to finite numbers; `grade`/`lifetimeGrade` (and each `termGrades` entry) are validated against a real grade token (`/^[SABCDF][+-]?$/`, else `-`); `stats` are coerced and clamped to 0–100. No crafted value can reach any client sink regardless of how the front end renders it.
  - **Dashboard:** the two `grade` sinks now pass through `esc()`, and `term` is coerced with `Number()`.
  - Verified live: a sync full of `<img>/<svg>/<script>` payloads came back with `term:1`, `grade:"-"`, `stars:0`, brackets stripped from `houseName`, stats clamped, and **zero angle brackets anywhere** in the relayed object.

### 4. Teacher key generated with `Math.random()` (MEDIUM) — FIXED
- **Where:** `coop/coop-server.js`, `randToken()` (the `teacherKey`), and `newCode()` (class codes).
- **Issue:** The `teacherKey` is the sole secret authorizing teacher actions (kick, rename world, post/award/end class questions). It was built from `Math.random()`, a non-cryptographic PRNG whose internal state can be recovered from other values the same process emits (class codes, duel/tq ids), making the key theoretically predictable.
- **Fix applied:** `randToken()` now uses `crypto.randomBytes(24).toString('hex')` (a 48-hex-char token, confirmed live), and class-code generation uses `crypto.randomInt()` instead of `Math.floor(Math.random()*…)`.

### 5. Player identity asserted by client-supplied `id` (MEDIUM) — DOCUMENTED, follow-up recommended
- **Where:** `coop/coop-server.js`, `/__coop/sync`, `/__coop/duel/*`, `/__coop/tq/answer` — all trust the `id` in the request body, and ids are disclosed to peers via sync.
- **Assessment:** A malicious student who reads a peer's `id` could overwrite that peer's live state/position, or submit wrong answers as them in a duel/class question, forcing a loss or consuming their single allowed answer. Impact is limited to **live in-session griefing** — durable account data stays PIN-gated and is not reachable this way.
- **Why not fixed now:** The correct fix is a server-issued, unguessable per-player session token bound to the `id` on first sync and required on every id-scoped endpoint. That is a coordinated client+server change on the hot sync path, with real regression risk, and is better done deliberately with its own test pass than rushed into this audit — consistent with how the prior audit deferred its deeper architectural items. **Recommended as the next hardening task.**

### 6. `eval()` in the co-op client (LOW / informational) — NOTED, no change (unchanged from prior audit)
- `coop-client.js` `g(name)` still calls `eval` only with hard-coded literal strings to read the game's own globals; all call sites were re-enumerated and none take user input. Not exploitable. Left as-is; a future cleanup could use `window[name]`.

### 7. Wildcard CORS (`Access-Control-Allow-Origin: *`) (LOW) — ACCEPTED (unchanged)
- Auth is an explicit name+PIN in the body with no cookies/ambient session, so wildcard CORS does not enable CSRF/credential theft. The new per-account cap (finding 1) further limits cross-origin guessing. Kept permissive for hosting flexibility.

### 8. Supply chain (INFORMATIONAL) — CLEAN
- `package.json`: `private: true`, **zero runtime and dev dependencies**, no install lifecycle scripts, `engines.node >= 18`. `coop-server.js` uses only Node built-ins (`http, https, fs, os, path, crypto, child_process`). `render.yaml`'s `npm install` is a no-op on an empty tree. Best-possible supply-chain posture. The only external runtime touchpoints are optional Upstash Redis (env-configured, HTTPS) and a Google-Fonts CSS `@import` in the browser (no remote JavaScript is loaded anywhere).

---

## Privacy (COPPA / children's data) — MATERIALLY IMPROVED since 2026-07-13

The prior audit's four privacy recommendations are now largely **done in code and content**:

1. **Privacy notice — DONE.** `coop/privacy.html` exists (linked from the Join overlay) and describes what the accounts feature stores (display name, PIN, in-game progress), that it is optional, no email/phone/address/location/media/ad-IDs, and how to request deletion.
2. **First-name-only guidance — DONE.** The Join overlay and the notice both tell students to use a first name or nickname only.
3. **Data retention — DONE and enforced.** A 90-day TTL (`ACCT_TTL_S`) is applied via Redis `EX` on every account write, and stated in the notice.
4. **Parental consent — PARTIAL/OPEN (policy, not code).** No new PII or trackers were added; the game is declared 13+ with no knowing under-13 collection. There is still no active age gate or verifiable-parental-consent mechanism, so under-13 classroom use continues to rely on the school-authorization pathway and teacher discretion. This remains a policy/process decision, not a code bug.

Two minor notes (not defects): the optional in-app feedback form invites a name/email that is sent via the user's own mail client (`mailto:`), which is worth reconciling with the notice's "no email" wording; and the PIN is stored as an unsalted SHA-256 over a small keyspace — online guessing is now well contained (constant-time compare + per-client + per-account caps), but a slow salted KDF would be a reasonable future step if data sensitivity ever rises.

---

## What was changed in code

- **`coop/coop-server.js`:** per-account brute-force cap + combined auth guards (finding 1); `tqPublicView` and key-gated `/__coop/state` (finding 2); `sanitizePlayerState()` applied on `/__coop/sync`, plus `numOr`/`cleanGrade` helpers (finding 3); `crypto`-based `randToken()` and `newCode()` (finding 4).
- **`coop/dashboard.html`:** sends the teacher key on the state poll (finding 2); escapes `grade` and number-coerces `term` at the render sinks (finding 3, defense in depth).
- The game file (`FreedomFounder_v4.html`) and `coop-client.js` were not modified; their prior XSS hardening (`escapeHtml`, `sanitizeNationName`, `escapeXml`) was re-verified intact.

## Validation

- **Unit tests:** `Bug Tests/sec-fix-test-2026-07-22.js` — **17/17 passing**. Covers payload neutralization for grade/term/stars/houseName/stats/termGrades, the public-vs-teacher class-question views, `teacherOK` gating, the per-account lockout surviving rotating/spoofed IPs, counter-clear on success, and the grade/number helpers.
- **Live server:** booted the patched server and confirmed (a) students get `correct: undefined` and no responses from `/__coop/state` while the keyed teacher view still returns them; (b) the teacher key is a 48-char crypto token; (c) a sync full of `<img>/<svg>/<script>` payloads is returned with all fields coerced to safe values and zero angle brackets remaining.
- `node --check coop/coop-server.js` passes; the dashboard script parses.

**Recommended final step on your machine:** run `node --check coop/coop-server.js` and `node Bug\ Tests/sec-fix-test-2026-07-22.js`, start the server once (`npm start`), and open the dashboard to confirm a clean boot before publishing. Then schedule finding 5 (per-player session token) as the next hardening task.
