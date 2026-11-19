# CLI Contract

## Apple
`node scripts/wallet/generate-apple-pass.js <design> [--out <dir>] [--base <model-dir>] [--root <dir>] [--certs <dir>] [--no-sign] [--allow-expired]`
`node scripts/wallet/generate-apple-pass.js --list`

- `<design>`: name of `<design>.html` in the repo root.
- `--out`: default `models/<design>.pass`. `--base`: default `models/membership.pass` (source of icon/logo). `--root`: folder holding the design HTML files, default repo root (used by tests). `--list`: print usage and available designs. `--certs`: folder with `signerCert.pem`, `signerKey.pem`, `AppleWWDRCAG4.pem` (default `certs/`; passphrase from `APPLE_PASS_SIGNER_KEY_PASSPHRASE`). `--no-sign`: skip `manifest.json` and `signature`. `--allow-expired`: sign even if the signer certificate has expired (Wallet will reject such a pass).
- Exit 0 and print the list of written files on success.
- Exit 1 with a message on: missing design (lists available designs), missing `--red`/`--gold`, Chrome not found (mentions `CHROME_PATH`), render failure. No partial output.

## Google
`node scripts/wallet/generate-google-class.js <design> [--out <dir>] [--issuer <id>] [--root <dir>]`
`node scripts/wallet/generate-google-class.js --list`

- `--out`: default `wallet_assets/google/<design>`. `--issuer`: default is the issuer id used in `services/googlePassService.js`.
- Output files: `class.json` (GenericClass), `look.json` (background color and image names for objects), `hero.png`, `logo.png`.
- Exit codes and error behaviour identical to the Apple command.
- Prints the class id and reminds that images must be hosted at a public URL before registering.

## Shared
- Commands are independent; neither calls the other.
- Output is deterministic for identical input.
