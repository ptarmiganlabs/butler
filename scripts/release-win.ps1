# Platform: Windows only
# Requires: Node.js, the npm dependencies (npm ci), PowerShell, Windows SDK (signtool.exe)
#
#   .\scripts\release-win.ps1          # what CI runs
#   .\scripts\release-win.ps1 -Zip     # also zip it, unsigned, in the release layout
#
# Builds the unsigned Windows release binary, butler.exe, and a SHA-256 digest of it,
# butler.exe.sha256, in the repository root, and stages the files that ship beside it in
# win64-extras/. Signing happens elsewhere.
#
# In a release, ci.yaml's build-win64 job runs this script, sign-win64 signs the binary through
# Azure Artifact Signing, and publish-win64 zips the signed binary with win64-extras/ and attaches
# the zip to the release. sign-win64 holds the signing credential and runs none of this code, which
# is why this script stops at an unsigned binary. The digest is how sign-win64 knows that the file
# it signs is the file this built. Butler SOS builds its Windows release the same way.
param(
    # Also write butler-<version>-win.zip, as a release has it but unsigned. For local builds:
    # CI never uses it, because a release must ship the signed binary.
    [switch]$Zip
)
$ErrorActionPreference = 'Stop'

# Fixed rather than configurable: ci.yaml's Windows jobs and the release asset name use it too.
$name = 'butler'
$binary = "./$name.exe"
$extras = './win64-extras'

# -------------------
# Bundle the app into one file, and turn that into the blob the executable carries.
New-Item -ItemType Directory -Path ./build -Force | Out-Null
./node_modules/.bin/esbuild src/butler.js --bundle --outfile=./build/build.cjs --format=cjs --platform=node --target=node24 --minify --inject:./src/lib/import-meta-url.js --define:import.meta.url=import_meta_url
if ($LASTEXITCODE -ne 0) { throw "esbuild failed with exit code $LASTEXITCODE" }

node --experimental-sea-config build-script/sea-config.json
if ($LASTEXITCODE -ne 0) { throw "Generating the SEA blob failed with exit code $LASTEXITCODE" }

# -------------------
# Start from a copy of the Node.js executable running this script.
node -e "require('fs').copyFileSync(process.execPath, '$name.exe')"
if ($LASTEXITCODE -ne 0) { throw "Copying node.exe failed with exit code $LASTEXITCODE" }

# Remove node.exe's own signature before postject changes the file. Left in place, it no longer
# matches the contents, and Windows reports the binary as tampered with rather than as unsigned.
# signtool is found by search, because the Windows SDK version in its path differs between
# machines; the hard-coded 10.0.22621.0 path this used to have only existed on one of them.
$signtool = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1
if (-not $signtool) { throw 'signtool.exe not found. Install the signing tools from the Windows SDK.' }
& $signtool.FullName remove /s $binary
if ($LASTEXITCODE -ne 0) { throw "signtool remove failed with exit code $LASTEXITCODE" }

npx postject $binary NODE_SEA_BLOB build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
if ($LASTEXITCODE -ne 0) { throw "postject failed with exit code $LASTEXITCODE" }

# -------------------
# Smoke-test it. A binary that cannot start is not worth signing, and this is the cheapest check
# that postject produced something that runs. Some line of its output must be the version being
# built and nothing else: a bare substring match would also accept 17.0.10 for 17.0.1, or an error
# message that happens to mention the version. Butler prints a line about where it runs from first.
$expected = node -p "require('./package.json').version"
$reported = (& $binary --version | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { throw "The built binary failed to run: --version exited $LASTEXITCODE." }
if ($reported -notmatch "(?m)^\s*v?$([regex]::Escape($expected))\s*$") {
    throw "The built binary reports version '$reported', expected '$expected'."
}
Write-Host "smoke test: --version reports $expected"

# -------------------
# Check that it is unsigned rather than signed badly: sign-win64 signs a clean file or nothing.
$status = (Get-AuthenticodeSignature -LiteralPath $binary).Status
if ($status -ne 'NotSigned') { throw "The built binary should carry no signature; Windows reports '$status'." }

# -------------------
# Record what was built.
$hash = (Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash
Set-Content -LiteralPath "$binary.sha256" -Value $hash -Encoding ascii
Write-Host "unsigned SHA256: $hash"

# -------------------
# Stage what ships beside the binary, laid out as it is in the release zip: the config templates,
# in config/. This is the one place that layout is defined; publish-win64 zips the signed binary
# with whatever is staged here.
if (Test-Path $extras) { Remove-Item -LiteralPath $extras -Recurse -Force }
New-Item -ItemType Directory -Path "$extras/config" -Force | Out-Null
Copy-Item -Path ./src/config/log_appender_xml -Destination "$extras/config/" -Recurse
Copy-Item -Path ./src/config/email_templates -Destination "$extras/config/" -Recurse
Copy-Item -Path ./src/config/slack_templates -Destination "$extras/config/" -Recurse
Copy-Item -Path ./src/config/teams_templates -Destination "$extras/config/" -Recurse
Copy-Item -Path ./src/config/production_template.yaml -Destination "$extras/config/"
Copy-Item -Path ./src/config/schedule_template.yaml -Destination "$extras/config/"

if ($Zip) {
    $zipName = "./$name-$expected-win.zip"
    Compress-Archive -Path $binary, "$extras/*" -DestinationPath $zipName -Force
    Write-Host "unsigned zip: $zipName"
}

Get-ChildItem $binary, "$binary.sha256"
Get-ChildItem $extras -Recurse | Select-Object -ExpandProperty FullName
