#!/usr/bin/env bash
# Build a standalone Butler binary for Linux (x64).
# Run this script from the repository root: bash scripts/build-binary-linux.sh
# The resulting binary is placed in the repository root with a date and commit SHA suffix,
# e.g. ./butler--local--2026-May-06--a1b2c3d

set -e

BASE_NAME="butler"
SENTINEL_FUSE="NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"
GIT_SHA=$(git rev-parse --short HEAD)
DATE_STR=$(date +"%Y-%b-%d")
DIST_FILE_NAME="${BASE_NAME}--local--${DATE_STR}--${GIT_SHA}"

echo "=== Building Butler binary for Linux ==="
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

echo "Step4: Inject blob into binary..."
npx postject "${DIST_FILE_NAME}" NODE_SEA_BLOB ./build/sea-prep.blob \
    --sentinel-fuse "${SENTINEL_FUSE}"

echo "Step5: Make binary executable..."
chmod +x "./${DIST_FILE_NAME}"

echo "=== Build complete: ./${DIST_FILE_NAME} ==="
