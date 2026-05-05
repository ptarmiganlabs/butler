$ErrorActionPreference = 'Stop'

# Inject git SHA and date into package.json
$GIT_SHA = (git rev-parse --short HEAD)
$BUILD_DATE = (Get-Date -Format "yyyyMMdd")
(Get-Content package.json) -replace '"version": "(.*)"', ('"version": "$1-' + $BUILD_DATE + '-' + $GIT_SHA + '"') | Set-Content package.json

# Create a single JS file using esbuild
./node_modules/.bin/esbuild ./src/butler.js --bundle --outfile=./build/build.cjs --format=cjs --platform=node --target=node23 --inject:./src/lib/import-meta-url.js --define:import.meta.url=import_meta_url

# Generate blob to be injected into the binary
node --experimental-sea-config build-script/sea-config.json

# Get a copy of the Node executable
node -e "require('fs').copyFileSync(process.execPath, '${env:DIST_FILE_NAME}.exe')"

pwd
dir

# -------------------
# Remove the signature from the executable
$processOptions1 = @{
    FilePath = "C:\Program Files (x86)/Windows Kits/10/bin/10.0.22621.0/x64/signtool.exe"
    Wait = $true
    ArgumentList = "remove", "/s", "./${env:DIST_FILE_NAME}.exe"
    WorkingDirectory = "."
    NoNewWindow = $true
}
Start-Process @processOptions1

npx postject "${env:DIST_FILE_NAME}.exe" NODE_SEA_BLOB build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

# -------------------
# Sign the executable
# 1st signing
$processOptions1 = @{
    FilePath = "C:\Program Files (x86)/Windows Kits/10/bin/10.0.22621.0/x64/signtool.exe"
    Wait = $true
    ArgumentList = "sign", "/sha1", "$env:CODESIGN_WIN_THUMBPRINT", "/tr", "http://time.certum.pl", "/td", "sha256", "/fd", "sha1", "/v", "./${env:DIST_FILE_NAME}.exe"
    WorkingDirectory = "."
    NoNewWindow = $true
}
Start-Process @processOptions1

# -------------------
# 2nd signing
$processOptions2 = @{
    FilePath = "C:\Program Files (x86)/Windows Kits/10/bin/10.0.22621.0/x64/signtool.exe"
    Wait = $true
    ArgumentList = "sign", "/sha1", "$env:CODESIGN_WIN_THUMBPRINT", "/tr", "http://time.certum.pl", "/td", "sha256", "/fd", "sha256", "/v", "./${env:DIST_FILE_NAME}.exe"
    WorkingDirectory = "."
    NoNewWindow = $true
}
Start-Process @processOptions2

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
