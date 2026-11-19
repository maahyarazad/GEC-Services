# Wallet Card Generators

Two independent scripts turn a card design (`<name>_card.html` in the repo root) into wallet assets.
Currently supported designs: `corporate_card`, `family_card`. Adding a design = adding one HTML file.

## Commands

```bash
npm run wallet:apple  -- corporate_card     # -> models/corporate_card.pass/
npm run wallet:google -- corporate_card     # -> wallet_assets/google/corporate_card/
node scripts/wallet/generate-apple-pass.js --list   # show available designs
npm run test:wallet
```

Options: `--out <dir>` (output folder), `--certs <dir>` / `--no-sign` / `--allow-expired` (signing, see below), `--base <dir>` (Apple: model that supplies `icon`/`logo` images and the base `pass.json`, default `models/membership.pass`), `--issuer <id>` (Google), `--root <dir>` (where to look for design HTML).

## Apple output (`models/<name>.pass/`)

`strip.png`, `strip@2x.png`, `strip@3x.png` (375x144 / 750x288 / 1125x432), `icon*.png` and `logo*.png` (copied from the base model), `pass.json` (a `storeCard` pass with the design colors).
`manifest.json` (SHA1 of each file, same as `openssl sha1 <files>`) and `signature` (same as `openssl smime -binary -sign -certfile AppleWWDRCAG4.pem -signer signerCert.pem -inkey signerKey.pem -in manifest.json -out signature -outform DER`) are written using the certificates in `certs/` and the passphrase in `APPLE_PASS_SIGNER_KEY_PASSPHRASE`. The command stops if the signer certificate has expired (use `--no-sign` to skip signing, or `--allow-expired` to sign anyway). Note: `passkit-generator` ignores these two files and signs again when a pass is issued, so what Wallet checks is the certificate used by the pass service. Point the pass service at the model folder (its name must end in `.pass`) to use it.

## Google output (`wallet_assets/google/<name>/`)

- `class.json`: the GenericClass (id `<issuerId>.membership_<name>` and the card rows).
- `look.json`: background color and image names to put on each GenericObject (Google keeps colors and images on the object, not the class).
- `hero.png` (1032x336) and `logo.png` (660x660, the GEC badge on the card color). Host them at public URLs before using them.
Nothing is sent to Google; create or update the class with the Wallet console or API.

## Design HTML contract

`:root` must define `--red` (card background) and `--gold` (accent), optionally `--fg` (text, default white). Use a `.card` containing `.icons` (with a `.box.gec` badge). A `.cardLabel` element is hidden in the generated artwork. `red_card` is a legacy prototype and is ignored.

## Requirements

Node and Chrome/Chromium (set `CHROME_PATH` if it is not in a standard location). Rendering uses headless Chrome; the HTML source files are never modified.
