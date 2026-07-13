# Game-Dev Skills Reference (from Snyk's Top 8 Claude Skills article)

Downloaded for the Capitalism Game project. Source article:
https://snyk.io/articles/top-claude-skills-3d-modeling-game-dev-shader-programming/

| File | Skill | Source repo |
|---|---|---|
| game-developer.md | #1 Game Developer (Unity/Unreal/Godot) | Jeffallan/claude-skills (MIT) |
| performance-optimization.md | — its performance reference | Jeffallan/claude-skills |
| ecs-patterns.md | — its ECS/patterns reference | Jeffallan/claude-skills |
| threejs.md | #2 Three.js / R3F best practices | emalorenzo/three-agent-skills |
| modeling3d.md | #3 3D Modeling specialist | majiayu000/claude-skill-registry |
| davinci.md | #4 DavinciDreams 3D Design Team | DavinciDreams/Agent-Team-Plugins |
| blender.md | #5 Blender procedural modeling | Andrew1326/dominations |
| shader.md | #6 Shader techniques | majiayu000/claude-skill-registry |
| cad.md | #8 CAD Agent | clawd-maf/cad-agent |

(#7 Code Buddy Blender: repo path no longer exists — skipped.)

## Security & Privacy Skills (added July 2026 for publication readiness)

Selected after a GitHub-wide search; chosen for source credibility (Anthropic official, Trail of Bits security firm, OWASP-current, dedicated privacy database).

| File | Skill | Source repo |
|---|---|---|
| security-review.md | Official Anthropic security review (high-confidence vuln methodology + false-positive filtering) | anthropics/claude-code-security-review (MIT) |
| owasp-security.md | OWASP Top 10:2025 + ASVS 5.0 checklists, JS/TS quirks | agamm/claude-code-owasp (MIT) |
| insecure-defaults.md | Fail-open defaults, hardcoded secrets, permissive config detection | trailofbits/skills (CC BY-SA 4.0) |
| supply-chain-risk-auditor.md | Dependency takeover/exploitation risk assessment | trailofbits/skills (CC BY-SA 4.0) |
| coppa-children-privacy.md | COPPA/children's privacy compliance for online games | mukul975/Privacy-Data-Protection-Skills (Apache-2.0) |

Runners-up evaluated but not included: netresearch/security-audit-skill (PHP-focused), Masriyan/Claude-Code-CyberSecurity-Skill (offensive-security oriented), VicKayro/claude-security-audit (overlaps with the Anthropic + OWASP pair), Sushegaad GRC skills (enterprise frameworks, overkill for a browser game).

## How to add these to the Claude Project context
1. Open the "Capitalism Game" project in Claude.
2. Project settings → add these files to the project's knowledge/files area, OR
3. To install as real Skills: Claude Settings → Capabilities → Skills → add.

## Already applied to CatoCapitalismGame_v4.html
- Delta-time movement, object pooling, cached refs, culling (game-developer)
- Cel shading, filter passes, post-process grading (shader-techniques)
- defs/use instancing, memoized scene builds (three.js)
- Parametric sprite rig + procedural variation (blender, cad)
- LOD discipline: detailed player, simple NPCs (3d-modeling)
