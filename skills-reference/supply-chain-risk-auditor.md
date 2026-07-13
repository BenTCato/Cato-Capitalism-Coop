<!-- Source: trailofbits/skills (CC BY-SA 4.0) — Trail of Bits security firm
     https://github.com/trailofbits/skills/blob/main/plugins/supply-chain-risk-auditor/skills/supply-chain-risk-auditor/SKILL.md -->
---
name: supply-chain-risk-auditor
description: "Identifies dependencies at heightened risk of exploitation or takeover. Use when assessing supply chain attack surface, evaluating dependency health, or scoping security engagements."
allowed-tools: Read Write Bash Glob Grep
---

# Supply Chain Risk Auditor

Activates when the user says "audit this project's dependencies".

## When to Use

- Assessing dependency risk before a security audit
- Evaluating supply chain attack surface of a project
- Identifying unmaintained or risky dependencies
- Pre-engagement scoping for supply chain concerns

## When NOT to Use

- Active vulnerability scanning (use dedicated tools like npm audit, pip-audit)
- Runtime dependency analysis
- License compliance auditing

## Purpose

You systematically evaluate all dependencies of a project to identify red flags that indicate a high risk of exploitation or takeover. You generate a summary report noting these issues.

### Risk Criteria

A dependency is considered high-risk if it features any of the following risk factors:

* **Single maintainer or team of individuals** - The project is primarily or solely maintained by a single individual, or a small number of individuals, not managed by an organization. If the individual is anonymous, the risk is significantly greater. **Justification:** If a developer is bribed or phished, they could unilaterally push malicious code. Consider the left-pad incident.
* **Unmaintained** - The project is stale (no updates for a long period of time) or explicitly deprecated/archived, or has a large number of unanswered bug/security issues. **Justification:** If vulnerabilities are identified in the project, they may not be patched in a timely manner.
* **Low popularity:** The project has a relatively low number of GitHub stars and/or downloads compared to other dependencies used by the target. **Justification:** Fewer users means fewer eyes on the project; malicious code will not be noticed in a timely manner.
* **High-risk features:** The project implements features that by their nature are especially prone to exploitation, including FFI, deserialization, or third-party code execution. **Justification:** These dependencies are key to the target's security posture and need a high bar of scrutiny.
* **Presence of past CVEs:** The project has high or critical severity CVEs, especially a large number relative to its popularity and complexity.
* **Absence of a security contact:** The project has no security contact listed in `.github/SECURITY.md`, `CONTRIBUTING.md`, `README.md`, etc. **Justification:** Vulnerability reporters will have difficulty reporting safely.

## Workflow (Initial Setup)

1. Start a results report file.
2. Find all git repositories for direct dependencies.
3. Normalize the git repository entries to URLs.

## Workflow (Dependency Audit)
1. For each dependency, evaluate its risk according to the Risk Criteria noted above. Any numbers cited (stars, open issues) must be accurate; round with ~ notation.
2. If a dependency satisfies any of the Risk Criteria, add it to the High-Risk Dependencies table, clearly noting the reason. Skip low-risk dependencies; absence from the report indicates low or no risk.

## Workflow (Post-Audit)
1. For each high-risk dependency, suggest an alternative that performs the same function but is more popular and better maintained. Prefer direct successors and drop-in replacements.
2. Note total counts per risk factor and summarize the overall security posture in an Executive Summary.
3. Summarize recommendations.
