#!/usr/bin/env bash
#
# Builds butler's macOS insiders binary and zips it, with the config templates
# beside it, for insiders-build.yaml to upload.
#
#   DIST_FILE_NAME=butler GITHUB_SHA=<commit> bash scripts/insider-build-mac.sh
#
# Signed ad hoc only, which is what lets an arm64 Mac run it at all; not with
# the Developer ID, and not notarized. Insiders builds are for testing, and
# signing every one would spend the signing identity on builds nobody ships
# (plabs-house-rules, rules/ci/public-repositories.md). So Gatekeeper warns
# about a downloaded one. Releases are signed and notarized by
# scripts/release-macos.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT}"

: "${DIST_FILE_NAME:?DIST_FILE_NAME must be set, e.g. butler}"
: "${GITHUB_SHA:?GITHUB_SHA must be set to the commit being built}"

ZIP_NAME="${DIST_FILE_NAME}--macos-arm64--${GITHUB_SHA}.zip"

# Ensure build output directory exists
mkdir -p build

# Inject git SHA and date into package.json
GIT_SHA=$(git rev-parse --short HEAD)
BUILD_DATE=$(date +%Y%m%d)
VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION-$BUILD_DATE-$GIT_SHA\"/" package.json

# Create a single JS file using esbuild
./node_modules/.bin/esbuild ./src/butler.js --bundle --outfile=./build/build.cjs --format=cjs --platform=node --target=node24 --inject:./src/lib/import-meta-url.js --define:import.meta.url=import_meta_url

# Generate blob to be injected into the binary
node --experimental-sea-config ./build-script/sea-config.json

# Get a copy of the Node executable, and remove its signature
cp "$(command -v node)" "${DIST_FILE_NAME}"
codesign --remove-signature "${DIST_FILE_NAME}"

# Inject the blob
npx postject "${DIST_FILE_NAME}" NODE_SEA_BLOB ./build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA

# Re-sign with an ad-hoc signature, which arm64 macOS requires to run anything
codesign --sign - "./${DIST_FILE_NAME}"
chmod +x "${DIST_FILE_NAME}"

echo "DEBUG: Runner architecture"
uname -m

# The binary at the top, and these from ./src/config in a config/ folder beside
# it: email_templates, slack_templates, teams_templates,
# production_template.yaml, schedule_template.yaml and log_appender_xml.
echo "Creating insider build archive"
rm -f "./${ZIP_NAME}"
zip -r "./${ZIP_NAME}" "./${DIST_FILE_NAME}" -x "*.DS_Store"
(
    cd src
    zip -u -r "../${ZIP_NAME}" "./config/email_templates" "./config/slack_templates" "./config/teams_templates" "./config/production_template.yaml" "./config/schedule_template.yaml" "./config/log_appender_xml" -x "*.DS_Store"
)

# Clean up
rm build/build.cjs build/sea-prep.blob

ls -la
