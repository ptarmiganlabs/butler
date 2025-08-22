# Butler - Qlik Sense Enterprise Superpowers

Butler is a Node.js application that adds "superpowers" to Qlik Sense Enterprise on Windows, including advanced reload failure alerts, task scheduling, key-value store, file system access, and REST API capabilities.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Dependencies

- Install dependencies: `npm ci --include=dev --include=prod` -- takes 33 seconds. NEVER CANCEL. Set timeout to 90+ seconds.
- If package-lock.json is missing, use: `npm install` -- takes 60 seconds. NEVER CANCEL. Set timeout to 120+ seconds.
- Dependencies may show warnings about Node.js version requirements (requires Node 22+ for some packages), but builds successfully with Node 20+.

### Build Process

- Fast esbuild compilation: `./node_modules/.bin/esbuild src/butler.js --bundle --external:axios --external:xdg-open --external:enigma.js --outfile=./build/build.cjs --format=cjs --platform=node --target=node22 --minify --inject:./src/lib/import-meta-url.js --define:import.meta.url=import_meta_url` -- takes 0.4 seconds. NEVER CANCEL. Set timeout to 30+ seconds.
- Create build directory first: `mkdir -p build`
- Generate Node.js Single Executable blob: `node --experimental-sea-config build-script/sea-config.json` -- takes 0.04 seconds.
- The build process is extremely fast (sub-second for main compilation).

### Running the Application

- Start Butler with API docs config (for testing): `node src/butler.js -c ./src/config/config-gen-api-docs.yaml --no-qs-connection`
- Main application entry point: `node src/butler.js` (requires proper config file)
- Built application can be tested: `node build/build.cjs --version`
- Application serves REST API on port 8081 when using test config
- API documentation available at: http://localhost:8081/documentation
- Test API endpoint: `curl localhost:8081/v4/butlerping` returns `{"response":"Butler reporting for duty","butlerVersion":"13.1.2"}`

### Testing and Validation

- Run tests: `npm run test` -- takes 10 seconds. Most tests require Butler server to be running for integration testing.
- Run linting: `npm run lint` -- takes 2 seconds. NEVER CANCEL. Set timeout to 30+ seconds.
- Format code: `npm run format` -- takes 4 seconds. NEVER CANCEL. Set timeout to 30+ seconds.
- All tests pass except integration tests that need live server connection
- One test passes standalone: `src/test/config/systeminfo.test.js` validates configuration schema

### Docker Build (WARNING: SLOW)

- Build Docker image: `docker build -t butler-test .` -- takes 10+ minutes due to npm install in container. NEVER CANCEL. Set timeout to 20+ minutes.
- Docker builds work but are significantly slower than local development
- For development, prefer local Node.js setup over Docker

## Validation

### Manual Testing Scenarios

- ALWAYS test API functionality after making changes:
    1. Start Butler with test config: `node src/butler.js -c ./src/config/config-gen-api-docs.yaml --no-qs-connection &`
    2. Wait 10 seconds for startup
    3. Test API: `curl localhost:8081/v4/butlerping`
    4. Verify response contains Butler version
    5. Stop Butler: `pkill -f 'node src/butler.js'`

### Pre-commit Validation

- ALWAYS run these commands before committing:
    1. `npm run lint` -- ensures code quality
    2. `npm run format` -- formats code consistently
    3. Manual API test (see above)
- CI pipeline (`/.github/workflows/ci.yaml`) will fail if linting or formatting issues exist

### Commit Messages (Conventional Commits)

- Always use Conventional Commits for commit messages: `type(scope)!: short, imperative summary`
- Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `test`, `build`, `ci`, `style`, `revert`
- Scopes (examples): `api`, `routes`, `config`, `lib`, `docs`, `build`, `deps`, `k8s`, `docker`, `tests`
- Rules:
    - Use present/imperative mood, lowercase summary, no trailing period
    - Include a body if context is helpful; wrap at ~72 chars
    - Mark breaking changes with `!` after scope and add a footer: `BREAKING CHANGE: ...`
    - Make focused commits; don’t mix unrelated changes
- Examples:
    - `feat(api): add /v4/systeminfo endpoint`
    - `fix(config): handle missing smtp.auth.user with clear error`
    - `refactor(lib): extract disk utils into separate module`
    - `feat(config)!: change default log level to info\n\nBREAKING CHANGE: default log level was debug`

Note: This repo uses release tooling that relies on Conventional Commits to generate CHANGELOG and versions.

## Common Tasks

### Directory Structure

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

### Key Configuration Files

- `src/config/production_template.yaml` - Main configuration template
- `src/config/config-gen-api-docs.yaml` - Test configuration for API documentation
- `package.json` - Dependencies and npm scripts
- `eslint.config.js` - Code linting rules
- `src/jest.config.js` - Test configuration

### Key npm Scripts

- `npm run test` - Run Jest test suite
- `npm run lint` - ESLint validation
- `npm run format` - Prettier code formatting
- `npm run butler` - Start Butler application (requires config)
- `npm run build:docs` - Generate API documentation

### Configuration Requirements

- Butler requires Qlik Sense certificates for full functionality
- Use `--no-qs-connection` flag for testing without Qlik Sense
- Configuration file in YAML format required (see templates in `src/config/`)
- Application validates config file structure on startup

### Important Notes

- Butler is designed for Qlik Sense Enterprise on Windows environments
- Some features (Windows service monitoring) only work on Windows platform
- Application supports both development mode and single executable builds
- REST API uses versioned endpoints (v4 is current)
- System information gathering can be disabled for security-sensitive environments

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
