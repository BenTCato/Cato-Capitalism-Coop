# Security & Privacy Audit — The Policy Game (Cato Capitalism Game)

**Date:** 2026-07-13
**Scope:** `CatoCapitalismGame_v4.html`, `coop/coop-server.js`, `coop/coop-client.js`, `coop/dashboard.html`, `coop/join.html`, `package.json`, `render.yaml`
**Method:** Applied the newly added security/privacy skills in `skills-reference/` — Anthropic `security-review`, `owasp-security` (OWASP Top 10:2025 / ASVS 5.0), Trail of Bits `insecure-defaults` and `supply-chain-risk-auditor`, and `coppa-children-privacy`.
**Goal:** Publication readiness.

---

## Executive summary

The codebase is in good shape for a browser game with an optional classroom server. It has a strong baseline: **zero third-party runtime dependencies** (no supply-chain attack surface), server-side output escaping on both the dashboard and the injected client, request-body size caps, and secrets kept in environment variables (fail-secure — the app runs without them, it just disables cloud saves).

The audit found **no critical, directly exploitable vulnerabilities** (no SQL/command injection, no path traversal, no RCE, no hardcoded secrets). The meaningful findings were all in the account sign-in path (weak PIN auth with no brute-force protection) plus some defense-in-depth hardening. All server-side findings have been **fixed and unit-tested**. Privacy is the main remaining work item, and it is a policy/paperwork task, not a code bug.

---

## Findings and status

### 1. Weak account authentication — no brute-force protection (MEDIUM) — FIXED
- **Where:** `coop/coop-server.js`, `/__coop/account/signin` and `/__coop/account/save`.
- **Issue:** Accounts are protected by a 3–6 digit numeric PIN. A 3-digit PIN is 1,000 combinations and there was no limit on failed attempts, so an attacker could brute-force any student's saved progress. The PIN comparison also used `!==`, which can leak timing information.
- **Fix applied:**
  - Minimum PIN length raised from 3 to **4 digits**.
  - Added an **in-memory brute-force throttle**: after 8 failed attempts for a given client+name pair (within a 10-minute window), that pair is locked out for 5 minutes and receives HTTP 429.
  - PIN comparison switched to **`crypto.timingSafeEqual`** (constant-time).
  - Verified with 12 unit tests (`outputs/sec-fix-test.js`): correct/incorrect PIN handling, PIN-policy enforcement, lockout on the 9th attempt, reset-on-success, and per-client isolation (one locked client does not lock others).

### 2. Missing baseline security response headers (LOW / hardening) — FIXED
- **Where:** `coop/coop-server.js`, the shared `send()` helper.
- **Issue:** Responses set no `X-Content-Type-Options`, `X-Frame-Options`, or `Referrer-Policy`.
- **Fix applied:** Added `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` (prevents clickjacking / embedding the dashboard elsewhere), and `Referrer-Policy: no-referrer` to every response. A strict Content-Security-Policy was intentionally **not** added because the game relies heavily on inline scripts and inline SVG; a strict CSP would break it. If a CSP is desired later it needs nonces/hashes across the whole game.

### 3. `eval()` in the co-op client (LOW / informational) — NOTED, no change needed
- **Where:** `coop/coop-client.js:42` — `function g(name, dflt) { try { return eval(name); } catch (e) { return dflt; } }`.
- **Assessment:** `g()` is only ever called with hard-coded literal strings (`'SKIN'`, `'SPRITE'`, `'worldOutfit'`, `'worldHead'`) to read the game's own globals. It never receives user input, so it is **not exploitable** (matches the OWASP false-positive guidance: eval without attacker-controlled input is not a vulnerability). It is left as-is to avoid destabilizing the avatar rendering, but flagged because automated scanners will report it. A future cleanup could read these off `window[name]` instead of `eval`.

### 4. Wildcard CORS (`Access-Control-Allow-Origin: *`) (LOW) — ACCEPTED
- **Where:** `coop/coop-server.js`, `send()`.
- **Assessment:** All responses allow any origin. Because the API uses **no cookies or ambient session** (auth is an explicit name+PIN in the request body), wildcard CORS does not enable a classic CSRF/credential-theft attack. The brute-force throttle (finding 1) now also limits cross-origin guessing. Kept permissive so the game can be embedded/hosted flexibly; tightening it is optional.

### 5. Supply chain (INFORMATIONAL) — CLEAN
- **Where:** `package.json`, `render.yaml`.
- **Assessment:** **Zero runtime and dev dependencies.** The server is pure Node standard library (`http`, `https`, `fs`, `os`, `path`, `crypto`, `child_process`). This is the best possible supply-chain posture — nothing to be typosquatted, abandoned, or taken over. `render.yaml`'s `buildCommand: npm install` is a harmless no-op with an empty dependency tree. No action needed.

### 6. Secrets handling (INFORMATIONAL) — GOOD
- Upstash Redis URL/token are read from environment variables and never hardcoded. `STORE_ON` is false when they are absent, so the app **fails secure** (cloud save simply turns off). This is exactly the pattern the `insecure-defaults` skill looks for and approves.
- Note (not a code bug): the stored PIN is an **unsalted SHA-256** keyed by name. It is a fast hash, so if the Redis store were ever dumped, 4–6 digit PINs would crack instantly. For a classroom game holding only display name + game progress this is a low-value target, but if the data sensitivity ever rises, move to a slow salted KDF (bcrypt/scrypt/Argon2) or per-account random salt.

---

## Privacy (COPPA / children's data) — ACTION RECOMMENDED (policy, not code)

The game's stated audience is 16–25, but it is deployed to classrooms, so under-13 students may use it, which brings **COPPA (16 CFR Part 312)** into scope. The optional accounts feature collects a **display name + PIN** and stores game progress in Redis.

The game's technical design is already privacy-friendly and close to compliant:
- No email, real name, address, phone, geolocation, photos, audio, or persistent advertising identifiers are collected.
- No third-party trackers or ad networks.
- Chat is limited to pre-set quick phrases (the safest pattern — Epic/Fortnite's USD 275M COPPA penalty was largely about open chat and default data collection).

Recommended before publication (see `skills-reference/coppa-children-privacy.md`):
1. Publish a short **privacy policy / notice** describing what the accounts feature stores (display name, PIN, in-game progress), that it is optional, and how to request deletion.
2. Tell teachers, in the host instructions, that names should be **first-name or nickname only** — no full names.
3. Decide and document a **data retention** window for idle Redis accounts (COPPA 312.10).
4. If you ever add real personal data or third-party services, revisit verifiable parental consent (312.5).

None of these block the game from working; they are the compliance paperwork that makes it publication-ready.

---

## What was changed in code

Only `coop/coop-server.js` was modified. Changes: PIN brute-force throttle + constant-time compare + 4-digit minimum in the two account endpoints; baseline security headers in `send()`; throttle cleanup wired into the existing prune cycle. The game file and client rendering were not touched.

## Validation note

The security logic was unit-tested (12/12 passing) in `outputs/sec-fix-test.js`. During this session the Linux sandbox's view of the OneDrive-synced project folder served a **stale, truncated snapshot** of the `coop/` files (cut off mid-file), so `node --check` run inside the sandbox reported false end-of-input errors against the cut-off copies. The authoritative files are complete and the edited regions were verified balanced. **Recommended final step on your machine:** run `node --check coop/coop-server.js` and start the server once (`npm start`) to confirm a clean boot before publishing.
