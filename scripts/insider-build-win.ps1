$ErrorActionPreference = 'Stop'

# Ensure build output directory exists
New-Item -ItemType Directory -Path ./build -Force | Out-Null

# Inject git SHA and date into package.json
$GIT_SHA = (git rev-parse --short HEAD)
if ($LASTEXITCODE -ne 0) { throw "git rev-parse failed with exit code $LASTEXITCODE" }
$BUILD_DATE = (Get-Date -Format "yyyyMMdd")
(Get-Content package.json) -replace '"version": "(.*)"', ('"version": "$1-' + $BUILD_DATE + '-' + $GIT_SHA + '"') | Set-Content package.json

# Create a single JS file using esbuild
./node_modules/.bin/esbuild ./src/butler.js --bundle --outfile=./build/build.cjs --format=cjs --platform=node --target=node24 --inject:./src/lib/import-meta-url.js --define:import.meta.url=import_meta_url
if ($LASTEXITCODE -ne 0) { throw "esbuild failed with exit code $LASTEXITCODE" }

# Generate blob to be injected into the binary
node --experimental-sea-config build-script/sea-config.json
if ($LASTEXITCODE -ne 0) { throw "sea-config generation failed with exit code $LASTEXITCODE" }

# Get a copy of the Node executable
node -e "require('fs').copyFileSync(process.execPath, '${env:DIST_FILE_NAME}.exe')"
if ($LASTEXITCODE -ne 0) { throw "node copyFileSync failed with exit code $LASTEXITCODE" }

pwd
dir

# -------------------
# Remove node.exe's own signature before postject changes the file. signtool is found by search,
# as in release-win.ps1, because the Windows SDK version in its path differs between machines.
$signtool = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1
if (-not $signtool) { throw 'signtool.exe not found. Install the signing tools from the Windows SDK.' }
& $signtool.FullName remove /s "./${env:DIST_FILE_NAME}.exe"
if ($LASTEXITCODE -ne 0) { throw "signtool remove failed with exit code $LASTEXITCODE" }

npx postject "${env:DIST_FILE_NAME}.exe" NODE_SEA_BLOB build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
if ($LASTEXITCODE -ne 0) { throw "postject failed with exit code $LASTEXITCODE" }

# Insiders builds are not signed: they are for testing (plabs-house-rules,
# rules/ci/public-repositories.md). Releases are signed through Azure Artifact Signing, in
# ci.yaml's sign-win64.

# -------------------
# Create insider's build zip
$compress = @{
    Path = "./${env:DIST_FILE_NAME}.exe"
    CompressionLevel = "Fastest"
    DestinationPath = "${env:DIST_FILE_NAME}--win-x64--${env:GITHUB_SHA}.zip"
}
Compress-Archive @compress

# -------------------
# Add following directories & files to the created zip file, in the ./config directory.
# - ./src/config/log_appender_xml
# - ./src/config/email_templates
# - ./src/config/slack_templates
# - ./src/config/teams_templates
# - ./src/config/production_template.yaml
# - ./src/config/schedule_template.yaml
mkdir config
Copy-Item -Path ./src/config/log_appender_xml/ -Destination ./config/ -Recurse
Copy-Item -Path ./src/config/email_templates/ -Destination ./config/ -Recurse
Copy-Item -Path ./src/config/slack_templates/ -Destination ./config/ -Recurse
Copy-Item -Path ./src/config/teams_templates/ -Destination ./config/ -Recurse
Copy-Item -Path ./src/config/production_template.yaml -Destination ./config/
Copy-Item -Path ./src/config/schedule_template.yaml -Destination ./config/

Compress-Archive -Path "./config" -Update -DestinationPath "./${env:DIST_FILE_NAME}--win-x64--${env:GITHUB_SHA}.zip"

# -------------------
# Clean up
Remove-Item -Force build/build.cjs
Remove-Item -Recurse -Force ./config -ErrorAction SilentlyContinue

# dir
