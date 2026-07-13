<!-- Source: mukul975/Privacy-Data-Protection-Skills (Apache-2.0) — 282-skill privacy database
     https://github.com/mukul975/Privacy-Data-Protection-Skills/blob/main/skills/privacy/coppa-compliance/SKILL.md
     (Condensed for this project: consent-method procedural detail trimmed; game-relevant guidance kept) -->
---
name: coppa-compliance
description: >-
  Implements Children's Online Privacy Protection Act (COPPA) compliance
  under 16 CFR Part 312. Covers verifiable parental consent, direct notice,
  data minimisation, and FTC enforcement precedents. Keywords: COPPA, FTC,
  children, parental consent, children's privacy, online games.
license: Apache-2.0
---

# COPPA Compliance — Children's Online Privacy Protection Act

## Overview

COPPA (15 U.S.C. 6501-6506; FTC COPPA Rule, 16 CFR Part 312) regulates online collection, use, and disclosure of personal information from children under 13. It applies to operators of commercial websites and online services (including games and apps) directed to children under 13, or operators with actual knowledge they are collecting personal information from a child under 13. Persistent identifiers, photos, videos, audio, and geolocation all count as personal information.

## Key Definitions (16 CFR 312.2)

- **Child**: individual under 13
- **Personal information**: name; address; online contact info (email); phone; SSN; persistent identifier that can recognise a user over time and across sites; photo/video/audio of a child; geolocation to street level; anything combined with the above
- **Directed to children**: judged by subject matter, visuals, animated characters, child-oriented activities/incentives, music, age of models, child celebrities, ads directed at children, and evidence of actual audience

## Obligations of Operators (16 CFR 312.3)

1. **Direct notice to parents** (312.4) before collecting, using, or disclosing a child's personal information
2. **Verifiable parental consent** (312.5) before any collection, use, or disclosure
3. **Parental access** (312.6): parents can review collected data and refuse further collection
4. **Confidentiality, security, integrity** (312.8): reasonable procedures protecting children's data
5. **Data minimisation** (312.7): cannot condition participation on providing more data than reasonably necessary
6. **Data retention** (312.10): retain only as long as reasonably necessary

## Consent Method Selection Matrix

| Data Use Scenario | Minimum Consent Method | FTC Expectation |
|-------------------|----------------------|-----------------|
| Internal use only (no disclosure) | Email Plus | Acceptable minimum |
| Sharing with third parties | Signed form, payment, phone/video, gov ID, or KBA | Higher assurance required |
| Public posting of child's information | Same high-assurance methods | Highest assurance |
| Behavioural advertising | Same high-assurance methods | FTC scrutinises closely |
| Photos/videos/audio | Same high-assurance methods | Verify before publication |

## Practical Compliance Architecture for a Game

- Landing page prominently links to the Children's Privacy Policy
- Age screen with neutral yes/no options (no age pre-fill, no incentive to lie)
- Under-13 users route to a parental consent flow, or the service collects no personal information at all
- **The safest design: collect no personal information.** No persistent identifiers for advertising, no geolocation, no photo/video/audio storage, avatars from pre-set options, no open chat for children (moderated or pre-approved messages only)
- Parent dashboard: view, download, and delete collected information; modify consent

## Annual COPPA Audit Checklist

| # | Audit Item | Regulatory Reference |
|---|-----------|---------------------|
| 1 | Privacy policy posted and current | 312.4(b) |
| 2 | Direct notice sent before collection | 312.4(c) |
| 3 | Verifiable parental consent obtained | 312.5 |
| 4 | Parental access mechanism functional | 312.6 |
| 5 | No excess data collection | 312.7 |
| 6 | Security measures adequate | 312.8 |
| 7 | Retention limits enforced | 312.10 |
| 8 | Third-party disclosures documented | 312.4(b)(4) |
| 9 | Staff training completed | Internal policy |

## FTC Enforcement Actions (Games Are a Target)

- **Epic Games/Fortnite (2022)**: USD 275 million penalty — collecting children's data without consent, default-on voice/text chat with strangers, dark patterns. Largest COPPA penalty in history.
- **Google/YouTube (2019)**: USD 170 million — persistent identifiers from child-directed channels for targeted ads.
- **Musical.ly/TikTok (2019)**: USD 5.7 million — collecting children's personal info with knowledge users were under 13.
- **VTech (2018)**: USD 650,000 — children's photos/chat/audio without consent plus a breach exposing 6.4 million children's records.

## Recent Rule Amendments (2024-2025 direction)

1. Separate opt-in consent for targeted advertising (cannot be bundled)
2. Cannot condition service access on push notification consent
3. Written information security program required
4. Biometric identifiers explicitly personal information
5. Strict retention limits

## Integration Points

- **GDPR Art. 8**: EU parental consent thresholds are 13-16 depending on Member State; satisfy both if serving EU users
- **Age screening** must not incentivise false age claims
- **School exception** (312.5(c)(4)): schools may consent on behalf of parents for classroom EdTech
