# Butler - Qlik Sense Enterprise Superpowers

Butler is a Node.js application that adds "superpowers" to Qlik Sense Enterprise on Windows, including advanced reload failure alerts, task scheduling, key-value store, file system access, and REST API capabilities.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Dependencies
- Install dependencies: `npm ci --include=dev --include=prod` -- takes 34 seconds. NEVER CANCEL. Set timeout to 90+ seconds.
- If package-lock.json is missing, use: `npm install` -- takes 60 seconds. NEVER CANCEL. Set timeout to 120+ seconds.
- Dependencies may show warnings about Node.js version requirements (requires Node 22+ for some packages), but builds successfully with Node 20+.

### Build Process
- Fast esbuild compilation: `./node_modules/.bin/esbuild src/butler.js --bundle --external:axios --external:xdg-open --external:enigma.js --outfile=./build/build.cjs --format=cjs --platform=node --target=node22 --minify --inject:./src/lib/import-meta-url.js --define:import.meta.url=import_meta_url` -- takes 0.33 seconds. NEVER CANCEL. Set timeout to 30+ seconds.
- Create build directory first: `mkdir -p build`
- Generate Node.js Single Executable blob: `node --experimental-sea-config build-script/sea-config.json` -- takes 0.043 seconds.
- The build process is extremely fast (sub-second for main compilation).

### Running the Application
- Start Butler with API docs config (for testing): `node src/butler.js -c ./src/config/config-gen-api-docs.yaml --no-qs-connection`
- Main application entry point: `node src/butler.js` (requires proper config file)
- Built application can be tested: `node build/build.cjs --version`
- Application serves REST API on port 8081 when using test config
- API documentation available at: http://localhost:8081/documentation
- Test API endpoint: `curl localhost:8081/v4/butlerping` returns `{"response":"Butler reporting for duty","butlerVersion":"13.1.2"}`

### Testing and Validation
- Run tests: `npm run test` -- takes 1.9 seconds. Most tests require Butler server to be running for integration testing. NEVER CANCEL. Set timeout to 30+ seconds.
- Run linting: `npm run lint` -- takes 1.8 seconds. NEVER CANCEL. Set timeout to 30+ seconds.
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
  2. Wait 10 seconds for startup (application typically starts in 2-3 seconds)
  3. Test API ping: `curl localhost:8081/v4/butlerping`
  4. Verify response contains Butler version: `curl -s localhost:8081/v4/butlerping | jq -r '.butlerVersion'` should return "13.1.2"
  5. Test API documentation: `curl -s localhost:8081/documentation | head -n 5` should return HTML
  6. Stop Butler: `pkill -f 'node src/butler.js'`

### Build and Runtime Validation
- ALWAYS test the complete build chain after making changes:
  1. `mkdir -p build` (create build directory)
  2. `./node_modules/.bin/esbuild src/butler.js --bundle --external:axios --external:xdg-open --external:enigma.js --outfile=./build/build.cjs --format=cjs --platform=node --target=node22 --minify --inject:./src/lib/import-meta-url.js --define:import.meta.url=import_meta_url`
  3. `node --experimental-sea-config build-script/sea-config.json`
  4. `node build/build.cjs --version` should return version number
  5. Verify build artifacts exist: `ls -la build/` should show build.cjs and sea-prep.blob

### Pre-commit Validation
- ALWAYS run these commands before committing:
  1. `npm run lint` -- ensures code quality (1.8 seconds)
  2. `npm run format` -- formats code consistently (4 seconds)
  3. Manual API test (see above scenario)
  4. `npm run test` -- run Jest test suite (1.9 seconds, expects some integration test failures)
- CI pipeline (`/.github/workflows/ci.yaml`) will fail if linting or formatting issues exist

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

### Complete Development Workflow
- ALWAYS follow this sequence when making changes:
  1. `npm ci --include=dev --include=prod` (first time setup, 34 seconds)
  2. Make code changes
  3. `npm run lint` (1.8 seconds) 
  4. `npm run format` (4 seconds)
  5. `npm run test` (1.9 seconds, expect integration test failures)
  6. Build and test manually:
     - `mkdir -p build && ./node_modules/.bin/esbuild src/butler.js --bundle --external:axios --external:xdg-open --external:enigma.js --outfile=./build/build.cjs --format=cjs --platform=node --target=node22 --minify --inject:./src/lib/import-meta-url.js --define:import.meta.url=import_meta_url`
     - `node --experimental-sea-config build-script/sea-config.json`
     - `node build/build.cjs --version`
  7. Run manual API validation scenario (see Validation section)
  8. Commit changes

### Important Notes
- Butler is designed for Qlik Sense Enterprise on Windows environments
- Some features (Windows service monitoring) only work on Windows platform
- Application supports both development mode and single executable builds
- REST API uses versioned endpoints (v4 is current)
- System information gathering can be disabled for security-sensitive environments
- Certificate errors during startup are expected when using test config without Qlik Sense certificates

## Timing Expectations
- Dependency installation: 34 seconds
- Code linting: 1.8 seconds  
- Code formatting: 4 seconds
- Main build (esbuild): 0.33 seconds
- Single executable prep: 0.043 seconds
- Application startup: 2-3 seconds
- Test suite: 1.9 seconds (standalone config test passes, integration tests fail without server)
- Docker build: 10+ minutes (avoid for development)

NEVER CANCEL builds or tests - they complete quickly except for Docker builds which require extended timeouts.