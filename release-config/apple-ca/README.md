# Apple certificate authorities, for the signing keychain

Two public Apple CA certificates. They carry no secret — a CA certificate is the public half by
definition, and Apple publishes both at the URLs below. Nothing here is a credential.

| File | Subject | Expires |
| --- | --- | --- |
| `DeveloperIDG2CA.cer` | `CN=Developer ID Certification Authority, OU=G2, O=Apple Inc.` | 2031-09-17 |
| `AppleIncRootCertificate.cer` | `CN=Apple Root CA, O=Apple Inc.` | 2035-02-09 |

```
sha256(DeveloperIDG2CA.cer)         = f16cd3c54c7f83cea4bf1a3e6a0819c8aaa8e4a1528fd144715f350643d2df3a
sha256(AppleIncRootCertificate.cer) = b0b1730ecbc7ff4505142c49f1295e6eda6bcaed7e2c68c5be91b5a11001f024
```

Sources: <https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer> and
<https://www.apple.com/appleca/AppleIncRootCertificate.cer>. Both hashes were checked against those
downloads on 2026-10-18, and the files are byte-identical to the copies persona, otlet and
magpie-cli commit.

## Why they are committed rather than fetched

`scripts/lib/macos-signing-keychain.sh` imports them into the throwaway signing keychain on every
macOS release. The release scripts used to download the G2 intermediate with `curl` on every run,
with no check of what came back. Committing them keeps a release from depending on apple.com being
reachable at the moment somebody cuts one, and makes the signing keychain self-contained: it needs
nothing from the machine it runs on.

## Why they are needed at all

A `codesign` run has to build the full chain from the signing identity to a self-signed root. The
`.p12` in `MACOS_CERTIFICATE` holds the leaf and its private key, and nothing above it. GitHub's
hosted macOS images ship Apple's intermediates, so this is invisible there; a self-hosted Mac without
them fails at once:

```
Warning: unable to build chain to self-signed root for signer "..."
errSecInternalComponent
```

## Which certificates, and why only these two

The chain for a current Developer ID Application certificate is

```
Developer ID Application: <name> (<team>)      the leaf, from MACOS_CERTIFICATE
  └─ Developer ID Certification Authority, G2  DeveloperIDG2CA.cer
       └─ Apple Root CA                        AppleIncRootCertificate.cer
```

Apple Root CA ships in every Mac's system trust store, so signing would very likely succeed with G2
alone. It is included anyway so the signing keychain does not depend on the state of the machine it
runs on. Trust is unaffected either way: `security import` adds a certificate, not a trust setting,
and the chain still ends at the system's own copy of the root.

The older non-G2 `Developer ID Certification Authority` is deliberately absent. Apple stopped
issuing from it long ago, it expires in February 2027, and no certificate this project signs with
chains through it. If `codesign` ever reports an unbuildable chain again, check what the leaf's
issuer actually is before adding anything:

```bash
security find-certificate -c "Developer ID Application" -p | openssl x509 -noout -issuer
```

## Replacing them

These expire long after any certificate they vouch for, so the likely reason to touch this folder
is Apple issuing from a new intermediate. Download from the source above, confirm the subject and
the SHA-256, and update this file's table. `scripts/test/release-kit.test.js` checks that the
signing keychain imports every certificate here.
