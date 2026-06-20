# Butler - Agent Guide

Butler is a Node.js application that adds "superpowers" to Qlik Sense Enterprise on Windows, including advanced reload failure alerts, task scheduling, key-value store, file system access, and REST API capabilities.

## Commands

- `npm ci --include=dev --include=prod` — install all deps (33s, NEVER CANCEL, timeout 90+s)
- `npm test` / `npm run test:unit` — run unit tests only (~50 tests, excludes API tests, 10s)
- `npm run test:integration` — run integration tests only (25 REST API tests with Fastify)
- `npm run test:full` — run all tests with coverage
- `npm run lint:fix` then `npm test` — required quality gates
- `npm run lint` — ESLint validation (2s, NEVER CANCEL, timeout 30+s)
- `npm run format` — Prettier (tabWidth: 4, singleQuote: true, printWidth: 140, 4s, NEVER CANCEL, timeout 30+s)
- **Test single file:** `node --experimental-vm-modules node_modules/jest/bin/jest.js src/path/to/file.test.js`
- `node src/butler.js` — start app (needs config file via `-c` flag)
- `node src/butler.js -c ./src/config/config-gen-api-docs.yaml --no-qs-connection` — start with test config

## Build Process

- **Fast esbuild compilation:** `./node_modules/.bin/esbuild src/butler.js --bundle --external:axios --external:xdg-open --external:enigma.js --outfile=./build/build.cjs --format=cjs --platform=node --target=node22 --minify --inject:./src/lib/import-meta-url.js --define:import.meta.url=import_meta_url` (0.4s, NEVER CANCEL, timeout 30+s)
- Create build directory first: `mkdir -p build`
- **Generate Node.js Single Executable blob:** `node --experimental-sea-config build-script/sea-config.json` (0.04s)
- Test built application: `node build/build.cjs --version`
- The build process is extremely fast (sub-second for main compilation)

### Docker Build (WARNING: SLOW)

- Build Docker image: `docker build -t butler-test .` — takes 10+ minutes due to npm install in container. NEVER CANCEL. Set timeout to 20+ minutes.
- Docker builds work but are significantly slower than local development
- For development, prefer local Node.js setup over Docker

## Architecture

- **Entry point:** `src/butler.js` → initializes globals → delegates to `src/app.js` (Fastify)
- **Globals singleton:** `src/globals.js` — config, logger, shared state (always use `globals.logger`, never `console.log`)
- **Config:** YAML via `config` package, template at `src/config/production_template.yaml`
- **ESM only** (`"type": "module"`) — use `import`/`export`, all test files must use `--experimental-vm-modules`
- **UDP server:** `src/udp/udp_handlers.js` — task events from Qlik Sense schedulers
- **REST API:** serves on port 8081 when using test config, API docs at http://localhost:8081/documentation
- **Test API endpoint:** `curl localhost:8081/v4/butlerping` returns `{"response":"Butler reporting for duty","butlerVersion":"13.1.2"}`

## Directory Structure

```
src/
├── butler.js          # Main application entry point
├── app.js            # Core application setup
├── config/           # Configuration templates and files
├── test/             # Jest test suite
├── lib/              # Utility libraries
├── api/              # API route handlers
├── routes/           # Express route definitions
└── globals.js        # Global configuration and state

build-script/         # Build automation scripts
docs/                # Documentation
static/              # Static web assets
```

## Conventions

- **JSDoc enforced** — ESLint with `eslint-plugin-jsdoc`
- **Logging:** always `globals.logger`, never `console.log`
- **Config-driven** — prefer YAML config over env vars
- **Dependencies:** `npm ci --include=prod` for Docker/SEA builds
- **Conventional Commits:** use format `type(scope)!: short, imperative summary`
  - Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `test`, `build`, `ci`, `style`, `revert`
  - Scopes: `api`, `routes`, `config`, `lib`, `docs`, `build`, `deps`, `k8s`, `docker`, `tests`
  - Rules: present/imperative mood, lowercase summary, no trailing period, mark breaking changes with `!` and `BREAKING CHANGE:` footer
  - Examples: `feat(api): add /v4/systeminfo endpoint`, `fix(config): handle missing smtp.auth.user`

## Testing Quirks

- **Jest + ESM:** all test runs need `node --experimental-vm-modules --no-warnings node_modules/jest/bin/jest.js`
- **Test separation:** unit tests (`*.test.js`) vs integration tests (`*.api.test.js` in `routes/rest_server/__tests__/`)
- **Unit tests:** `npm run test:unit` — mocks all external dependencies, tests individual modules
- **Integration tests:** `npm run test:integration` — spins up Fastify server, tests REST API endpoints
- **Single test:** `node --experimental-vm-modules --no-warnings node_modules/jest/bin/jest.js src/udp/__tests__/udp_handlers.test.js --verbose`
- **Mock pattern:** use `jest.unstable_mockModule()` (ESM mocks), never `jest.mock()`
- **Standalone test:** `src/test/config/systeminfo.test.js` validates configuration schema

## Validation

### Manual Testing Scenarios

ALWAYS test API functionality after making changes:
1. Start Butler with test config: `node src/butler.js -c ./src/config/config-gen-api-docs.yaml --no-qs-connection &`
2. Wait 10 seconds for startup
3. Test API: `curl localhost:8081/v4/butlerping`
4. Verify response contains Butler version
5. Stop Butler: `pkill -f 'node src/butler.js'`

### Pre-commit Validation

ALWAYS run these commands before committing:
1. `npm run lint` — ensures code quality
2. `npm run format` — formats code consistently
3. Manual API test (see above)

CI pipeline (`.github/workflows/ci.yaml`) will fail if linting or formatting issues exist.

## Key Config Files

| File | Purpose |
|------|---------|
| `src/config/production_template.yaml` | Config template with all options |
| `src/config/config-gen-api-docs.yaml` | API docs config snapshot |
| `.prettierrc` | Prettier: tabWidth 4, singleQuote, printWidth 140 |
| `release-please-config.json` | Auto-release config |
| `.github/workflows/ci.yaml` | CI pipeline (Node 24) |
| `package.json` | Dependencies and npm scripts |
| `eslint.config.js` | Code linting rules |
| `src/jest.config.js` | Test configuration |

## CI Flow

1. `npm ci --include=dev --include=prod` — install all deps
2. Lint (ESLint) → Test (Jest with coverage)
3. Release via `release-please` (auto-generates changelog, tags versions)
4. Docker image build on release

## Timing Expectations

- Dependency installation: 33 seconds
- Code linting: 2 seconds
- Code formatting: 4 seconds
- Main build (esbuild): 0.4 seconds
- Single executable prep: 0.04 seconds
- Application startup: 2-3 seconds
- Test suite: 10 seconds
- Docker build: 10+ minutes (avoid for development)

NEVER CANCEL builds or tests - they complete quickly except for Docker builds which require extended timeouts.

## Important Notes

- Butler is designed for Qlik Sense Enterprise on Windows environments
- Some features (Windows service monitoring) only work on Windows platform
- Application supports both development mode and single executable builds
- REST API uses versioned endpoints (v4 is current)
- System information gathering can be disabled for security-sensitive environments
- Butler requires Qlik Sense certificates for full functionality
- Use `--no-qs-connection` flag for testing without Qlik Sense
- Configuration file in YAML format required (see templates in `src/config/`)
- Application validates config file structure on startup

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
