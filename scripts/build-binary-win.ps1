# Build a standalone Butler binary for Windows (x64).
# Run this script from the repository root: powershell -ExecutionPolicy Bypass -File scripts/build-binary-win.ps1
# The resulting binary is placed in the repository root with a date and commit SHA suffix,
# e.g. .\butler--local--2026-May-06--a1b2c3d.exe
# Note: Code signing is NOT performed (CI-only step).

$ErrorActionPreference = "Stop"

$BASE_NAME = "butler"
$SENTINEL_FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"
$GIT_SHA = (git rev-parse --short HEAD)
$DATE_STR = (Get-Date -Format "yyyy-MMM-dd")
$DIST_FILE_NAME = "${BASE_NAME}--local--${DATE_STR}--${GIT_SHA}"

Write-Output "=== Building Butler binary for Windows ==="
Write-Output "Output file: .\${DIST_FILE_NAME}.exe"

Write-Output "Step1: Bundle source with esbuild..."
New-Item -ItemType Directory -Force -Path "build" | Out-Null
./node_modules/.bin/esbuild "src/butler.js" `
    --bundle `
    --outfile=build/build.cjs `
    --format=cjs `
    --platform=node `
    --target=node24 `
    "--inject:./src/lib/import-meta-url.js" `
    "--define:import.meta.url=import_meta_url"

Write-Output "Step2: Generate SEA blob..."
node --experimental-sea-config build-script/sea-config.json

Write-Output "Step3: Copy Node.js executable..."
# In CI, we remove the existing Authenticode signature from the copied node.exe
# using `signtool remove` before injecting the SEA blob (see .github/workflows/ci.yaml).
# This local script intentionally skips that step because `signtool.exe` from the
# Windows SDK is unlikely to be available on most developer machines. Running
# `postject` on a signed binary can cause Windows to treat the signature as invalid
# and may trigger SmartScreen/antivirus warnings; this is acceptable for local
# testing, but for distribution use the CI/CD pipeline which handles signing.
node -e "require('fs').copyFileSync(process.execPath, '${DIST_FILE_NAME}.exe')"

Write-Output "Step4: Inject blob into binary..."
npx postject "${DIST_FILE_NAME}.exe" NODE_SEA_BLOB build/sea-prep.blob `
    --sentinel-fuse $SENTINEL_FUSE

Write-Output "=== Build complete: .\${DIST_FILE_NAME}.exe ==="
Write-Output "Note: This binary is not code-signed."
Write-Output "      For distribution, use the CI/CD pipeline which handles signing."
