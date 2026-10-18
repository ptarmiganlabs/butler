#!/usr/bin/env bash
# Keychain lifecycle for scripts/release-macos.sh. Sourced, never executed.
#
# Signing a macOS release needs a throwaway keychain holding the Developer ID certificate. Butler's
# release and insiders scripts used to build that keychain by hand, in a way that is fine on a
# hosted runner and hostile on a self-hosted Mac somebody is logged in to, which is where they ran
# until October 2026:
#
#   1. It created the keychain as ~/Library/Keychains/build.keychain, next to the user's own.
#   2. It first cut the user's keychain search list down to the login keychain and a System path
#      that does not exist in the user's folder, dropping anything else on it.
#   3. It put the new keychain at the *head* of the search list, and made it the user's *default*
#      keychain for the whole build.
#   4. It locked that keychain with PROD_MACOS_CI_KEYCHAIN_PWD, a password shared with every other
#      project that used it, and passed it on `security` command lines, where `ps` can read them.
#   5. It imported the private key with -A, which lets any application use it without asking.
#
# (3) is what made the build Mac ask the person at it to unlock "the build keychain": the default
# keychain is where applications create new items, and any application refreshing a credential
# during a build landed on a keychain locked with a CI-only password.
#
# So: the keychain now lives in a folder of the run's own, it is appended to the search list rather
# than prepended, and the default keychain is never touched at all. Nothing needs it - `security
# import`, `unlock-keychain` and `set-key-partition-list` all name the keychain explicitly,
# `codesign` is given it with --keychain, and `notarytool` authenticates from a profile stored in
# this same keychain. Its password is made for each run by the caller.
#
# It stays *on* the search list because it has to: `man codesign` is explicit that a keychain given
# via --keychain is not searched when building the certificate chain unless it is also on the
# user's list.
#
# The release job now runs on a GitHub-hosted macos-15 runner, a fresh machine for every job,
# because the organisation's self-hosted runners do not admit public repositories. None of the care
# below for somebody else's search list is needed there, and it costs nothing; it is kept so that
# the same script stays safe on any Mac it is run on.
#
# This library is a copy of the one persona, otlet, magpie-cli and other Ptarmigan Labs projects use
# (persona's scripts/lib/macos-signing-keychain.sh), with butler's own names. Every name it
# recognises is butler's own: never build.keychain, which ctrl-q still creates on the build Mac, and
# never another project's prefix. A build of theirs on the same Mac needs its keychain left alone.
#
# Written for bash 3.2 - macOS runs these scripts under /bin/bash 3.2, where expanding an empty
# array under `set -u` is a fatal error. Hence the ${arr[@]+"${arr[@]}"} guards.

# Absolute path of the keychain this build owns. Callers pass it to `security import`,
# `set-key-partition-list` and `codesign --keychain`.
BUTLER_KEYCHAIN_PATH=""

# Directory to create that keychain in. The caller sets it to the folder it made for this run, so
# that one cleanup covers the keychain along with everything else the run wrote. Falls back to the
# runner's temp directory.
BUTLER_KEYCHAIN_DIR=""

# The user's keychain search list as found, minus anything of ours. Restored verbatim on teardown.
BUTLER_ORIGINAL_KEYCHAINS=()

# Every keychain this library creates carries this prefix.
BUTLER_KEYCHAIN_PREFIX="butler-signing-"

# Guards teardown against running twice - it is wired to three signals plus EXIT.
BUTLER_KEYCHAIN_TORN_DOWN=""

# Set once the search list has been read, so that teardown writes it back only when there is a
# snapshot to write: teardown also runs when a script stops before setup, and writing an empty list
# then would wipe the person's own.
BUTLER_KEYCHAIN_SNAPSHOT_TAKEN=""

# The keychain paths `security list-keychains` and `default-keychain` print, one a line, without
# the indent and the quotes they come with. Read line by line because a path may hold a space:
# splitting on whitespace, as xargs does, broke "Work Keychain.keychain-db" in two, dropped both
# halves as missing, and so took the person's keychain off their search list for good.
butler_keychain_unquote() {
  sed -e 's/^[[:space:]]*"//' -e 's/"[[:space:]]*$//'
}

# Reports whether a search-list entry is one of ours. Never another project's: a build of theirs on
# the same Mac needs its entry left alone.
#
# $1 - keychain path as reported by `security list-keychains`.
#
# Returns 0 when the entry must not be carried into the restored search list.
butler_keychain_is_ours() {
  case "$1" in
    *"/${BUTLER_KEYCHAIN_PREFIX}"*) return 0 ;;
    *) return 1 ;;
  esac
}

# Snapshots the user's keychain search list, dropping entries that must not be restored.
#
# Two kinds are dropped. Ours - a stale keychain of ours from a run that never cleaned up - because
# restoring those would keep a deleted keychain on the list for good. And paths that no longer
# exist, because a search list containing a dangling path is the state an interrupted cleanup
# leaves behind, and quietly writing it back would preserve it.
#
# Refuses when the list cannot be read. A list that could not be read is not an empty one: taken as
# empty, setup would put the signing keychain on the list in place of the person's own, and teardown
# would then write the empty snapshot back, taking their login keychain off the list for good.
butler_keychain_snapshot() {
  local keychain
  local listed

  BUTLER_ORIGINAL_KEYCHAINS=()

  if ! listed="$(security list-keychains -d user)"; then
    echo "::error::could not read the keychain search list; refusing to change it, or to sign"
    return 1
  fi

  while IFS= read -r keychain; do
    [ -n "$keychain" ] || continue

    if butler_keychain_is_ours "$keychain"; then
      echo "keychain: dropping stale signing keychain from the search list: $keychain"
      continue
    fi

    if [ ! -f "$keychain" ]; then
      echo "keychain: dropping search-list entry that no longer exists: $keychain"
      continue
    fi

    BUTLER_ORIGINAL_KEYCHAINS+=("$keychain")
  done < <(printf '%s\n' "$listed" | butler_keychain_unquote)

  BUTLER_KEYCHAIN_SNAPSHOT_TAKEN="yes"
  echo "keychain: search list to preserve: ${BUTLER_ORIGINAL_KEYCHAINS[*]:-(empty)}"
}

# Repairs the default keychain, when an interrupted run left it broken.
#
# A default keychain that points at a keychain of ours, at a file that is gone, or at nothing keeps
# prompting the person at that Mac long after the build that caused it, and does not heal on its
# own. `security default-keychain -d user` answers an error rather than a path when there is no
# default at all, so an empty answer counts as needing repair just as much as a stale one. A default
# that is another project's live keychain, ctrl-q's build.keychain during its build say, is not
# broken, and is theirs to restore.
butler_keychain_repair_default() {
  local default_keychain
  local login_keychain="${HOME}/Library/Keychains/login.keychain-db"

  default_keychain=$(security default-keychain -d user 2>/dev/null | butler_keychain_unquote || true)

  # The only case where this script writes the default keychain at all: it points at our debris, at
  # a file that is gone, or at nothing. Anything the user chose deliberately is left alone.
  if [ -z "$default_keychain" ]; then
    echo "keychain: this host has no default keychain - pointing it at the login keychain"
    security default-keychain -d user -s "$login_keychain" >/dev/null 2>&1 || true
  elif butler_keychain_is_ours "$default_keychain" || [ ! -f "$default_keychain" ]; then
    echo "keychain: default keychain is stale ($default_keychain) - restoring the login keychain"
    security default-keychain -d user -s "$login_keychain" >/dev/null 2>&1 || true
  elif [ "$default_keychain" != "$login_keychain" ]; then
    # Not ours to change, but said, because it is where to look if signing then fails. A build that
    # makes its own keychain the default, and first on the list, while it signs leaves it so when it
    # is killed, locked with a password this build does not have.
    echo "::warning::the default keychain is $default_keychain, not the login keychain. It is not butler's, so it is left as it is; if signing fails, look at it first."
  fi

  # The same for the head of the search list, as the snapshot found it.
  local first="${BUTLER_ORIGINAL_KEYCHAINS[0]-}"
  if [ -n "$first" ] && [ "$first" != "$login_keychain" ]; then
    echo "::warning::the search list starts with $first, not the login keychain. It is not butler's, so it is left where it is; if signing fails, look at it first."
  fi
}

# Puts Apple's intermediate and root into the signing keychain.
#
# codesign has to build the whole chain from the signing identity up to a self-signed root, and the
# .p12 in MACOS_CERTIFICATE carries the leaf and its private key and nothing above it. The scripts
# used to download the intermediate from apple.com on every run; it is committed instead, in
# release-config/apple-ca, so that a release does not depend on apple.com answering and the keychain
# needs nothing from the machine it runs on. release-config/apple-ca/README.md says which
# certificates and why.
butler_keychain_import_apple_cas() {
  local ca_dir
  ca_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../release-config/apple-ca" && pwd)"

  local ca
  for ca in "$ca_dir"/*.cer; do
    # A literal glob means the directory is empty, which is a packaging mistake rather than
    # something to sign through: without these, codesign fails later and less legibly.
    [ -f "$ca" ] || { echo "::error::no Apple CA certificates in $ca_dir"; return 1; }
    echo "keychain: trusting $(basename "$ca")"
    # No -T: these are certificates, not identities, so nothing needs key access to them.
    security import "$ca" -k "$BUTLER_KEYCHAIN_PATH"
  done
}

# Creates the signing keychain and makes it usable by codesign.
#
# $1 - password to lock the new keychain with: the caller's own, made for this run.
#
# Sets BUTLER_KEYCHAIN_PATH. The caller is expected to have installed butler_keychain_teardown as a
# trap before calling this.
butler_keychain_setup() {
  local keychain_password="$1"
  local keychain_dir="${BUTLER_KEYCHAIN_DIR:-${RUNNER_TEMP:-${TMPDIR:-/tmp}}}"

  # Before anything is created or written, so that a refusal leaves nothing for teardown to undo.
  butler_keychain_snapshot || return 1
  butler_keychain_repair_default

  # Outside ~/Library/Keychains on purpose: it never shows up in Keychain Access, it cannot collide
  # with another project's keychain there, and on a runner it is swept with RUNNER_TEMP even if this
  # script is killed hard enough that no trap runs.
  BUTLER_KEYCHAIN_PATH="${keychain_dir%/}/${BUTLER_KEYCHAIN_PREFIX}$$.keychain-db"

  echo "keychain: creating $BUTLER_KEYCHAIN_PATH"
  security create-keychain -p "$keychain_password" "$BUTLER_KEYCHAIN_PATH"

  # A keychain straight from `security create-keychain` reports "lock-on-sleep timeout=300s" - it
  # relocks after five idle minutes and whenever the machine sleeps. The scripts used to pass
  # `-t 3600 -l` under a comment claiming it prevented locking, but -l is what *enables*
  # lock-on-sleep, so it only ever extended the timeout. Omitting -l clears the sleep trigger, and
  # six hours outlasts any build.
  security set-keychain-settings -t 21600 "$BUTLER_KEYCHAIN_PATH"

  # Appended, not prepended. The login keychain keeps its place at the head of the list, so an
  # application looking up its own credential still finds it there first.
  security list-keychains -d user -s \
    ${BUTLER_ORIGINAL_KEYCHAINS[@]+"${BUTLER_ORIGINAL_KEYCHAINS[@]}"} "$BUTLER_KEYCHAIN_PATH"

  security unlock-keychain -p "$keychain_password" "$BUTLER_KEYCHAIN_PATH"

  butler_keychain_import_apple_cas

  echo "keychain: search list is now"
  security list-keychains -d user
  echo "keychain: default keychain left at $(security default-keychain -d user 2>/dev/null | butler_keychain_unquote)"
}

# Deletes the signing keychain and puts the search list back exactly as it was found.
#
# Idempotent and silent about failures: it runs on the way out of a script that may already be
# unwinding from a real error, and losing that error behind a cleanup failure helps nobody.
butler_keychain_teardown() {
  [ -z "$BUTLER_KEYCHAIN_TORN_DOWN" ] || return 0
  BUTLER_KEYCHAIN_TORN_DOWN="yes"

  if [ -n "$BUTLER_KEYCHAIN_PATH" ]; then
    security delete-keychain "$BUTLER_KEYCHAIN_PATH" >/dev/null 2>&1 || true
    rm -f "$BUTLER_KEYCHAIN_PATH"
  fi

  # Whenever a snapshot was taken, an empty one included: setup put the signing keychain on the
  # list, and only writing the snapshot back takes the deleted file off it again. With no keychain
  # after -s, `security` sets an empty list rather than printing one: keychain_list() in Apple's
  # SecurityTool/macOS/keychain_list.c (Security-61901.120.67) builds an empty CFArray when argc is
  # 0 and passes it to SecKeychainSetDomainSearchList.
  if [ -n "$BUTLER_KEYCHAIN_SNAPSHOT_TAKEN" ]; then
    security list-keychains -d user -s \
      ${BUTLER_ORIGINAL_KEYCHAINS[@]+"${BUTLER_ORIGINAL_KEYCHAINS[@]}"} >/dev/null 2>&1 || true
  fi
}
