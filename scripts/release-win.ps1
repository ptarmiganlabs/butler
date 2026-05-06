$ErrorActionPreference = 'Stop'

# Ensure build output directory exists
New-Item -ItemType Directory -Path ./build -Force | Out-Null

# Create a single JS file using esbuild
./node_modules/.bin/esbuild src/butler.js --bundle --outfile=./build/build.cjs --format=cjs --platform=node --target=node24 --minify --inject:./src/lib/import-meta-url.js --define:import.meta.url=import_meta_url
if ($LASTEXITCODE -ne 0) { throw "esbuild failed with exit code $LASTEXITCODE" }

# Generate blob to be injected into the binary
node --experimental-sea-config build-script/sea-config.json
if ($LASTEXITCODE -ne 0) { throw "sea-config generation failed with exit code $LASTEXITCODE" }

# Get a copy of the Node executable
node -e "require('fs').copyFileSync(process.execPath, '${env:DIST_FILE_NAME}.exe')"
if ($LASTEXITCODE -ne 0) { throw "node copyFileSync failed with exit code $LASTEXITCODE" }

# -------------------
# Remove the signature from the executable
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe" remove /s "./${env:DIST_FILE_NAME}.exe"
if ($LASTEXITCODE -ne 0) { throw "signtool remove failed with exit code $LASTEXITCODE" }

npx postject "${env:DIST_FILE_NAME}.exe" NODE_SEA_BLOB build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
if ($LASTEXITCODE -ne 0) { throw "postject failed with exit code $LASTEXITCODE" }

# -------------------
# Sign the executable
# 1st signing
# & "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe" sign /sha1 "$env:CODESIGN_WIN_THUMBPRINT" /tr http://time.certum.pl /td sha256 /fd sha1 /v "./${env:DIST_FILE_NAME}.exe"
# if ($LASTEXITCODE -ne 0) { throw "signtool sign (1st pass) failed with exit code $LASTEXITCODE" }

# -------------------
# 2nd signing
# & "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe" sign /sha1 "$env:CODESIGN_WIN_THUMBPRINT" /tr http://time.certum.pl /td sha256 /fd sha256 /v "./${env:DIST_FILE_NAME}.exe"
# if ($LASTEXITCODE -ne 0) { throw "signtool sign (2nd pass) failed with exit code $LASTEXITCODE" }

# -------------------
# Create release binary zip
$compress = @{
    Path = "./${env:DIST_FILE_NAME}.exe"
    CompressionLevel = "Fastest"
    DestinationPath = "${env:DIST_FILE_NAME}-${env:RELEASE_VERSION}-win.zip"
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

Compress-Archive -Path "./config" -Update -DestinationPath "./${env:DIST_FILE_NAME}-${env:RELEASE_VERSION}-win.zip"

# dir
