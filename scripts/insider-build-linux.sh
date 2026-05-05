#!/usr/bin/env bash
set -e

# Inject git SHA and date into package.json
GIT_SHA=$(git rev-parse --short HEAD)
BUILD_DATE=$(date +%Y%m%d)
VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION-$BUILD_DATE-$GIT_SHA\"/" package.json

./node_modules/.bin/esbuild ./src/butler.js --bundle --outfile=./build/build.cjs --format=cjs --platform=node --target=node23 --inject:./src/lib/import-meta-url.js --define:import.meta.url=import_meta_url
node --experimental-sea-config build-script/sea-config.json

# Get a copy of the Node executable
cp $(command -v node) ${DIST_FILE_NAME}
npx postject ${DIST_FILE_NAME} NODE_SEA_BLOB build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

chmod +x ${DIST_FILE_NAME}

# Compress insider's build
# Include following directories & files in the created archive file.
# - ./src/config/log_appender_xml
# - ./src/config/email_templates
# - ./src/config/slack_templates
# - ./src/config/teams_templates
# - ./src/config/production_template.yaml
# - ./src/config/schedule_template.yaml
echo "Creating temp notarization archive for insider build"
zip -9 -r "./${DIST_FILE_NAME}--linux-x64--${GITHUB_SHA}.zip" "${DIST_FILE_NAME}"

cd src
zip -9 -u -r "../${DIST_FILE_NAME}--linux-x64--${GITHUB_SHA}.zip" "./config/email_templates" "./config/slack_templates" "./config/teams_templates" "./config/production_template.yaml" "./config/schedule_template.yaml" "./config/log_appender_xml"
cd ..

# Clean up
rm build/build.cjs build/sea-prep.blob

ls -la
