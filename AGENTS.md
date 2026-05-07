# Butler - Agent Guide

## Commands

- `npm ci` — install deps (use `--include=prod` for CI, `--include=dev` for dev)
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
