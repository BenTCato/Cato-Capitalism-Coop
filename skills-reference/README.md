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
