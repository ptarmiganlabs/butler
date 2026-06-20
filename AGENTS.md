# Butler - Agent Guide

## Commands

- `npm ci` — install deps (use `--include=prod` for CI, `--include=dev` for dev)
- `npm test` / `npm run test:unit` — run unit tests only (~50 tests, excludes API tests)
- `npm run test:integration` — run integration tests only (25 REST API tests with Fastify)
- `npm run test:full` — run all tests with coverage
- `npm run lint:fix` then `npm test` — required quality gates
- **Test single file:** `node --experimental-vm-modules node_modules/jest/bin/jest.js src/path/to/file.test.js`
- `npm run format` — Prettier (tabWidth: 4, singleQuote: true, printWidth: 140)
- `node src/butler.js` — start app (needs config file via `-c` flag)

## Architecture

- **Entry point:** `src/butler.js` → initializes globals → delegates to `src/app.js` (Fastify)
- **Globals singleton:** `src/globals.js` — config, logger, shared state (always use `globals.logger`, never `console.log`)
- **Config:** YAML via `config` package, template at `src/config/production_template.yaml`
- **ESM only** (`"type": "module"`) — use `import`/`export`, all test files must use `--experimental-vm-modules`
- **UDP server:** `src/udp/udp_handlers.js` — task events from Qlik Sense schedulers

## Conventions

- **JSDoc enforced** — ESLint with `eslint-plugin-jsdoc`
- **Logging:** always `globals.logger`, never `console.log`
- **Config-driven** — prefer YAML config over env vars
- **Dependencies:** `npm ci --include=prod` for Docker/SEA builds

## Testing Quirks

- **Jest + ESM:** all test runs need `node --experimental-vm-modules --no-warnings node_modules/jest/bin/jest.js`
- **Test separation:** unit tests (`*.test.js`) vs integration tests (`*.api.test.js` in `routes/rest_server/__tests__/`)
- **Unit tests:** `npm run test:unit` — mocks all external dependencies, tests individual modules
- **Integration tests:** `npm run test:integration` — spins up Fastify server, tests REST API endpoints
- **Single test:** `node --experimental-vm-modules --no-warnings node_modules/jest/bin/jest.js src/udp/__tests__/udp_handlers.test.js --verbose`
- **Mock pattern:** use `jest.unstable_mockModule()` (ESM mocks), never `jest.mock()`

## CI Flow

1. `npm ci --include=dev --include=prod` — install all deps
2. Lint (ESLint) → Test (Jest with coverage)
3. Release via `release-please` (auto-generates changelog, tags versions)
4. Docker image build on release

## GitNexus

This repo is indexed as **butler** (2496 symbols, 4842 relationships). Use GitNexus MCP tools for code intelligence:

- **Before editing:** `gitnexus_impact({target: "symbolName", direction: "upstream"})`
- **Before committing:** `gitnexus_detect_changes()`
- **Explore:** `gitnexus_query({query: "concept"})` for execution flows

## Key Config Files

| File | Purpose |
|------|---------|
| `src/config/production_template.yaml` | Config template with all options |
| `src/config/config-gen-api-docs.yaml` | API docs config snapshot |
| `.prettierrc` | Prettier: tabWidth 4, singleQuote, printWidth 140 |
| `release-please-config.json` | Auto-release config |
| `.github/workflows/ci.yaml` | CI pipeline (Node 24) |

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **butler** (2556 symbols, 4992 relationships, 213 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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

<!-- gitnexus:end -->
