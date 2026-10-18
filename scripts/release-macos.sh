#!/usr/bin/env bash
#
# Builds butler's macOS binary, signs it with the Developer ID, and leaves the
# notarized zip the release job attaches.
#
#   DIST_FILE_NAME=butler RELEASE_VERSION=17.0.0 bash scripts/release-macos.sh
#
# Run by ci.yaml's release-macos-arm64 job on a GitHub-hosted macos-15 runner,
# with the Apple secrets given to this one step and to nothing else in the job.
# A rehearsal runs it with RELEASE_VERSION=rehearsal-<commit>.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT}"

# Keychain handling lives in a library because signing must never touch the
# default keychain or another build's keychain. See that file for why, and for
# why teardown is wired to the signals as well as EXIT.
# shellcheck source=scripts/lib/macos-signing-keychain.sh
. "${SCRIPT_DIR}/lib/macos-signing-keychain.sh"

: "${DIST_FILE_NAME:?DIST_FILE_NAME must be set, e.g. butler}"
: "${RELEASE_VERSION:?RELEASE_VERSION must be set, e.g. 17.0.0}"
: "${MACOS_CERTIFICATE:?MACOS_CERTIFICATE must be set}"
: "${MACOS_CERTIFICATE_PWD:?MACOS_CERTIFICATE_PWD must be set}"
: "${MACOS_CERTIFICATE_NAME:?MACOS_CERTIFICATE_NAME must be set}"
: "${PROD_MACOS_NOTARIZATION_APPLE_ID:?PROD_MACOS_NOTARIZATION_APPLE_ID must be set}"
: "${PROD_MACOS_NOTARIZATION_TEAM_ID:?PROD_MACOS_NOTARIZATION_TEAM_ID must be set}"
: "${PROD_MACOS_NOTARIZATION_PWD:?PROD_MACOS_NOTARIZATION_PWD must be set}"

# Still shell variables, no longer exported. Each goes to the one command that
# takes it - the certificate to base64 on its standard input, its password to
# `security import`, the app-specific password to `notarytool
# store-credentials` - and nothing reads them from the environment. Exported,
# they reached the build below, which runs esbuild and a postject that npx
# fetches from the registry, and everything those start.
export -n MACOS_CERTIFICATE MACOS_CERTIFICATE_PWD PROD_MACOS_NOTARIZATION_PWD

ZIP_NAME="${DIST_FILE_NAME}-${RELEASE_VERSION}-macos-arm64.zip"

# The name the notarization credentials are stored under, inside this run's own
# keychain. It goes nowhere else, so it needs to be no more than readable.
NOTARY_PROFILE="butler-notarization"

echo "--- building"
mkdir -p build

# Create a single JS file using esbuild
./node_modules/.bin/esbuild src/butler.js --bundle --outfile=./build/build.cjs --format=cjs --platform=node --target=node24 --minify --inject:./src/lib/import-meta-url.js --define:import.meta.url=import_meta_url

# Generate blob to be injected into the binary
node --experimental-sea-config build-script/sea-config.json

# Get a copy of the Node executable, and remove its signature
cp "$(command -v node)" "${DIST_FILE_NAME}"
codesign --remove-signature "${DIST_FILE_NAME}"

# Inject the blob
npx postject "${DIST_FILE_NAME}" NODE_SEA_BLOB build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA

chmod +x "${DIST_FILE_NAME}"

# The certificate and the signing keychain go in one folder of this run's own,
# made by mktemp -d: a new directory, mode 700 whatever the umask, under a name
# nothing can predict. The certificate used to be decoded to ./certificate.p12,
# a path fixed in advance in a checkout that npm ci and the build above have
# run code in; a redirection follows a link already there. A folder that did
# not exist a moment ago cannot hold a link planted earlier. Made after the
# checks above, so that a refusal leaves nothing behind, and with the cleanup
# installed straight after it.
RUN_DIR="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/butler-signing.XXXXXX")"
CERTIFICATE="${RUN_DIR}/certificate.p12"
# Where the keychain library makes the signing keychain, so that one cleanup
# covers the lot.
BUTLER_KEYCHAIN_DIR="${RUN_DIR}"

# Installed before the certificate is decoded, so that a decode that fails
# partway still removes what it wrote. Wired to the signals as well as EXIT,
# because a cancelled workflow run is signalled rather than exited, and an
# EXIT-only trap leaves the keychain behind. And each signal's trap ends the
# script once it has cleaned up: bash runs a trap after the command it was
# waiting for has died, then carries on with the next line, keychain gone,
# unless the trap exits.
cleanup() {
    butler_keychain_teardown
    rm -rf "$RUN_DIR"
}
trap cleanup EXIT
trap 'cleanup; exit 129' HUP
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM

echo "--- preparing a keychain to sign from"
# umask only around the decode, so that the certificate is this user's to read
# and nobody else's whatever the runner's umask is. set -C with it, so that the
# decode creates the file or fails rather than writing through anything already
# at that path: belt and braces beside the fresh folder, and free.
decode_umask="$(umask)"
umask 077
set -C
printf '%s' "$MACOS_CERTIFICATE" | base64 --decode > "$CERTIFICATE"
set +C
umask "$decode_umask"

# Made here rather than read from a secret. The keychain is deleted at the end
# of this run and nothing else ever opens it, so a password it shares with every
# other build buys nothing, and `security` takes keychain passwords on the
# command line, where `ps` can read them. 24 random bytes as hex, from the
# kernel: od and tr rather than a pipeline that could fail under pipefail.
KEYCHAIN_PWD="$(od -An -tx1 -N24 /dev/urandom | tr -d ' \n')"
[ "${#KEYCHAIN_PWD}" -eq 48 ] || { echo "::error::could not read 24 random bytes for the keychain password"; exit 1; }

butler_keychain_setup "$KEYCHAIN_PWD"
# -x: the private key cannot be exported from the keychain once it is in, so a
# later step cannot read it back out whatever it knows. -T /usr/bin/codesign
# rather than the -A this used to pass, which let any application use the key
# without asking. -P is the one password still on a command line here; `man
# security` calls its use insecure, and the alternative it offers is a GUI
# prompt, which a runner cannot answer. It is there for the moment this import
# takes, and the certificate file goes immediately after.
security import "$CERTIFICATE" -k "$BUTLER_KEYCHAIN_PATH" -P "$MACOS_CERTIFICATE_PWD" -T /usr/bin/codesign -x
rm -f "$CERTIFICATE"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PWD" "$BUTLER_KEYCHAIN_PATH"

echo "DEBUG: Runner architecture"
uname -m

# RUNNER_DEBUG is what Actions sets when a run is re-run with debug logging.
if [ "${RUNNER_DEBUG:-}" = "1" ]; then
    echo "DEBUG: macOS version"
    sw_vers

    echo "DEBUG: Available signing identities in the signing keychain"
    security find-identity -v -p codesigning "$BUTLER_KEYCHAIN_PATH" || true

    echo "DEBUG: Matching certificate entries in the signing keychain"
    security find-certificate -a -c "$MACOS_CERTIFICATE_NAME" "$BUTLER_KEYCHAIN_PATH" || true

    echo "DEBUG: Binary architecture before codesign"
    file "./${DIST_FILE_NAME}"
fi

# Apple's app-specific password goes into the throwaway keychain once, instead
# of on the command line of the notarytool call. It is the Apple ID's password
# for more than notarization, and the submission below waits in the process
# table for as long as Apple takes, where any process of this user can read its
# arguments. store-credentials is seconds, and validates the credentials with
# Apple before storing them, so bad ones fail here rather than after signing.
echo "--- storing the notarization credentials in the signing keychain"
xcrun notarytool store-credentials "$NOTARY_PROFILE" \
    --apple-id "$PROD_MACOS_NOTARIZATION_APPLE_ID" \
    --team-id "$PROD_MACOS_NOTARIZATION_TEAM_ID" \
    --password "$PROD_MACOS_NOTARIZATION_PWD" \
    --keychain "$BUTLER_KEYCHAIN_PATH"

# --keychain so that codesign takes the identity from this run's keychain, and
# never one of the same name from another keychain on the search list.
echo "--- signing"
codesign --force -s "$MACOS_CERTIFICATE_NAME" --keychain "$BUTLER_KEYCHAIN_PATH" -v "./${DIST_FILE_NAME}" \
    --deep --strict --options=runtime --timestamp \
    --entitlements "./release-config/${DIST_FILE_NAME}.entitlements"

echo "--- verifying the signature before spending a notarization on it"
codesign -vvv --deep --strict "./${DIST_FILE_NAME}"

# Notarization takes an archive, not a bare executable, and it takes this one,
# so the archive Apple notarized is the archive that ships. The binary at the
# top, and these from ./src/config in a config/ folder beside it:
# email_templates, slack_templates, teams_templates, production_template.yaml,
# schedule_template.yaml and log_appender_xml.
echo "--- packaging"
rm -f "./${ZIP_NAME}"
zip -r "./${ZIP_NAME}" "./${DIST_FILE_NAME}" -x "*.DS_Store"
(
    cd src
    zip -u -r "../${ZIP_NAME}" "./config/email_templates" "./config/slack_templates" "./config/teams_templates" "./config/production_template.yaml" "./config/schedule_template.yaml" "./config/log_appender_xml" -x "*.DS_Store"
)

echo "--- notarizing"
xcrun notarytool submit "./${ZIP_NAME}" \
    --keychain-profile "$NOTARY_PROFILE" \
    --keychain "$BUTLER_KEYCHAIN_PATH" \
    --wait

# Deliberately no `xcrun stapler staple`: a ticket can only be stapled to a
# bundle, a disk image or an installer package. A bare executable has nowhere to
# put one, so Gatekeeper checks this binary against Apple's service online.

echo "--- done"
ls -la "./${ZIP_NAME}"
