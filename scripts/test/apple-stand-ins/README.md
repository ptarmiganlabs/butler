# Stand-ins for Apple's tools and the build

`scripts/test/release-kit.test.js` puts this folder first on `PATH` and runs the macOS scripts
(`scripts/release-macos.sh`, `scripts/insider-build-mac.sh` and the keychain library) against what
is here, under `/bin/bash`, in a copy of the repository's `scripts/` and `release-config/`.

Each stand-in appends the command line it was given to `$LOG` and does the least the scripts need,
and nothing else:

- `security` keeps the keychain search list in the file `$FAKE_KEYCHAINS`, one path a line, and
  prints it the way the real one does, indented and quoted. With `$FAKE_LIST_KEYCHAINS_FAILS` set,
  reading the list fails, as it does when `security` cannot reach securityd. The default keychain is
  the login keychain unless `$FAKE_DEFAULT_KEYCHAIN` names another; `delete-keychain` reads a bare
  name as a keychain in `~/Library/Keychains`, as the real one does. `security import` records the
  mode of the file it was given. Copied unchanged from persona's.
- `codesign` signs nothing and says yes.
- `xcrun` says yes to `notarytool` and `stapler`. A submission sleeps `$FAKE_NOTARY_SLEEP` seconds
  first when that is set. Copied unchanged from persona's.
- `zip` records the folder it ran in, and makes the archive, empty.
- `esbuild`, `node` and `npx` stand in for the build: esbuild leaves a file at its `--outfile`, `node
  --experimental-sea-config` leaves `build/sea-prep.blob`, and npx injects nothing. Each records which
  of the signing secrets it could read from its environment, by name (`held`). The kit copies
  `esbuild` to the copy's `node_modules/.bin/`, where the scripts call it from, and the scripts copy
  `node` to be the binary they sign.
- `git rev-parse --short HEAD` answers `abc1234`.

No real keychain, signature or notarization is involved. Apple's side is exercised only by a
release, or by a rehearsal: `gh workflow run ci.yaml --ref master -f rehearse_signing=true`.
