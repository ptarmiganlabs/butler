# Docs Staging: `to-doc-site`

Files in this folder are the source of truth for updates to the Butler documentation site. They are written, reviewed, and finalized here before being published to the official documentation.

## Purpose

This folder serves as a staging area for documentation that should eventually appear on the Butler doc site (`butler.ptarmiganlabs.com`). It is the single place where documentation is authored outside of the doc site's own repository.

## Audience

Files here should be written for **Butler and Qlik Sense administrators** — not Node.js developers. Assume the reader:

- Is familiar with Qlik Sense and its ecosystem
- Has admin-level access to a Qlik Sense environment
- Understands what Butler does and why they would use it
- May not know what an HTTP API is or how to read a JSON response body
- May be managing Butler in a production environment

When in doubt, err on the side of explaining more rather than less. Use plain language, avoid jargon where simple words suffice, and provide enough context that an admin with no software development background can understand and act on the information.

## File format

- Use Markdown (`.md`)
- One topic per file
- File names should be descriptive and kebab-case (e.g., `audit-api-return-codes.md`)
- Include all information relevant to the doc site in a single file — do not split topics across files or assume readers will cross-reference multiple files
- Do not include internal implementation details (code snippets, internal variable names, file paths in the codebase) unless they are directly relevant to an administrator configuring or operating Butler

## Processing status in file names

Files in this folder can also carry a status prefix in their file name:

- Files without a prefix are still pending review or migration to the doc site.
- Files starting with `done_` have already been incorporated into the Butler doc site, or their content has been verified to already exist there.

When marking a file as processed, keep the original file name after the prefix:

- `audit-api-return-codes.md` becomes `done_audit-api-return-codes.md`

Keep processed files in this folder for traceability until there is a deliberate cleanup pass.

## Ownership

These files are maintained by the Butler core team. Pull requests and issues are welcome.