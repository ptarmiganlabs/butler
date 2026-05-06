#!/usr/bin/env bash
# Build a standalone Butler binary for macOS (arm64).
# Run this script from the repository root: bash scripts/build-binary-macos.sh
# The resulting binary is placed in the repository root with a date and commit SHA suffix,
# e.g. ./butler--local--2026-May-06--a1b2c3d
# Note: Code signing and notarization are NOT performed (CI-only steps).

set -e

BASE_NAME="butler"
SENTINEL_FUSE="NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"
GIT_SHA=$(git rev-parse --short HEAD)
DATE_STR=$(date +"%Y-%b-%d")
DIST_FILE_NAME="${BASE_NAME}--local--${DATE_STR}--${GIT_SHA}"

echo "=== Building Butler binary for macOS ==="
echo "Output file: ./${DIST_FILE_NAME}"

echo "Step1: Bundle source with esbuild..."
mkdir -p build
./node_modules/.bin/esbuild src/butler.js \
    --bundle \
    --outfile=./build/build.cjs \
    --format=cjs \
    --platform=node \
    --target=node24 \
    --inject:./src/lib/import-meta-url.js \
    --define:import.meta.url=import_meta_url

echo "Step2: Generate SEA blob..."
node --experimental-sea-config ./build-script/sea-config.json

echo "Step3: Copy Node.js executable..."
cp "$(node -e "process.stdout.write(process.execPath)")" "${DIST_FILE_NAME}"

echo "Step4: Remove existing code signature from Node.js binary..."
codesign --remove-signature "./${DIST_FILE_NAME}"

echo "Step5: Inject blob into binary..."
npx postject "${DIST_FILE_NAME}" NODE_SEA_BLOB ./build/sea-prep.blob \
    --sentinel-fuse "${SENTINEL_FUSE}" \
    --macho-segment-name NODE_SEA

echo "Step6: Re-sign binary with ad-hoc signature (required on arm64 macOS)..."
codesign --sign - "./${DIST_FILE_NAME}"

echo "Step7: Make binary executable..."
chmod +x "./${DIST_FILE_NAME}"

echo "=== Build complete: ./${DIST_FILE_NAME} ==="
echo "Note: This binary has an ad-hoc signature for local use only."
echo "      For distribution, use the CI/CD pipeline which handles full signing and notarization."
