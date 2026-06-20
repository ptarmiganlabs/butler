<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **butler** (2798 symbols, 5571 relationships, 234 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/butler/context` | Codebase overview, check index freshness |
| `gitnexus://repo/butler/clusters` | All functional areas |
| `gitnexus://repo/butler/processes` | All execution flows |
| `gitnexus://repo/butler/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |
| Work in the Configvis area (137 symbols) | `.claude/skills/generated/configvis/SKILL.md` |
| Work in the Qseow area (80 symbols) | `.claude/skills/generated/qseow/SKILL.md` |
| Work in the Rest_server area (48 symbols) | `.claude/skills/generated/rest-server/SKILL.md` |
| Work in the Qrs_util area (45 symbols) | `.claude/skills/generated/qrs-util/SKILL.md` |
| Work in the Influxdb area (44 symbols) | `.claude/skills/generated/influxdb/SKILL.md` |
| Work in the Smtp area (29 symbols) | `.claude/skills/generated/smtp/SKILL.md` |
| Work in the Incident_mgmt area (27 symbols) | `.claude/skills/generated/incident-mgmt/SKILL.md` |
| Work in the Udp area (20 symbols) | `.claude/skills/generated/udp/SKILL.md` |
| Work in the Assert area (13 symbols) | `.claude/skills/generated/assert/SKILL.md` |
| Work in the Qscloud area (12 symbols) | `.claude/skills/generated/qscloud/SKILL.md` |
| Work in the Cluster_30 area (8 symbols) | `.claude/skills/generated/cluster-30/SKILL.md` |
| Work in the Get area (7 symbols) | `.claude/skills/generated/get/SKILL.md` |
| Work in the Api area (6 symbols) | `.claude/skills/generated/api/SKILL.md` |
| Work in the Cluster_27 area (6 symbols) | `.claude/skills/generated/cluster-27/SKILL.md` |
| Work in the Cluster_29 area (6 symbols) | `.claude/skills/generated/cluster-29/SKILL.md` |
| Work in the Handlers area (6 symbols) | `.claude/skills/generated/handlers/SKILL.md` |
| Work in the Cluster_32 area (5 symbols) | `.claude/skills/generated/cluster-32/SKILL.md` |

<!-- gitnexus:end -->
