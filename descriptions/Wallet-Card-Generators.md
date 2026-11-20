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

Options: `--out <dir>` (output folder), `--logo <png>` (Google: logo image), `--certs <dir>` / `--no-sign` / `--allow-expired` (signing, see below), `--base <dir>` (Apple: model that supplies `icon`/`logo` images and the base `pass.json`, default `models/membership.pass`), `--issuer <id>` (Google), `--root <dir>` (where to look for design HTML).

## Apple output (`models/<name>.pass/`)

`strip.png`, `strip@2x.png`, `strip@3x.png` (375x144 / 750x288 / 1125x432), `icon*.png` and `logo*.png` (copied from the base model), `pass.json` (a `storeCard` pass with the design colors).
`manifest.json` (SHA1 of each file, same as `openssl sha1 <files>`) and `signature` (same as `openssl smime -binary -sign -certfile AppleWWDRCAG4.pem -signer signerCert.pem -inkey signerKey.pem -in manifest.json -out signature -outform DER`) are written using the certificates in `certs/` and the passphrase in `APPLE_PASS_SIGNER_KEY_PASSPHRASE`. The command stops if the signer certificate has expired (use `--no-sign` to skip signing, or `--allow-expired` to sign anyway). Note: `passkit-generator` ignores these two files and signs again when a pass is issued, so what Wallet checks is the certificate used by the pass service. Point the pass service at the model folder (its name must end in `.pass`) to use it.

## Google output (`wallet_assets/google/<name>/`)

- `class.json`: the GenericClass (id `<issuerId>.membership_<name>` and the card rows).
- `look.json`: background color and image names to put on each GenericObject (Google keeps colors and images on the object, not the class).
- `hero.png` (1032x336) and `logo.png` (660x660, the Apple logo, transparent, centred with margin). Host them at public URLs before using them (see "Google Wallet member pass" below).
Nothing is sent to Google; create or update the class with the Wallet console or API.

## Design HTML contract

`:root` must define `--red` (card background) and `--gold` (accent), optionally `--fg` (text, default white). Use a `.card` containing `.icons` (with a `.box.gec` badge). A `.cardLabel` element is hidden in the generated artwork. `red_card` is a legacy prototype and is ignored.

## Requirements

Node and Chrome/Chromium (set `CHROME_PATH` if it is not in a standard location). Rendering uses headless Chrome; the HTML source files are never modified.

## Member pass design and email (feature 019)

Rules live in `services/memberPassLayout.js`; the partner always comes from the member record in the database (not the request).

| Partner | Apple pass model | Pass label (Apple: right end of the header; Google and email: beside the logo; also the Add-sheet heading) | Email |
|---|---|---|---|
| `GEC Family Membership` (case and spaces ignored) | `models/family_card.pass` (green) | `GEC Family Membership` | green card, subject "Your GEC Family Membership Card Has Been Issued" |
| any other partner | `models/corporate_card.pass` (red) | `Corporate Card - {Partner}` | red card, subject "Your Corporate Card Has Been Issued" |
| none / empty | `models/corporate_card.pass` | `Corporate Card` | red card |

- **Apple label position** (`generateMemberPass`): the label is **not** beside the logo. It is a right-aligned header field (`buildHeaderFields` in `services/memberPassLayout.js`), which Wallet draws at the right end of the top row, and the model's `logoText` is replaced by a single space (the pass library rejects an empty string). Long labels are shortened by Wallet. The Add-sheet heading (`description`) is still the label. The Google pass and the email are unchanged: the label stays beside the logo there.
- **Pass layout** (`generateMemberPass`): nothing over the icon strip; one row below it with Expiry Date, Member ID and Name (Name takes the place of the old "Corporate Partner" field). The QR link and the `pass_storage/corporate-card/` folder are unchanged for both designs.
- **Email** (`membership_pass_email` -> `services/memberPassEmail.js`, responsive and with dark mode, see `descriptions/Email-Templates.md`): the card mirrors the pass (logo, label, icon strip, one row of fields). Colors come from `corporate_card.html` / `family_card.html`; the strip is `models/<design>.pass/strip@2x.png`, attached inline (`cid:card-strip`). Member values are HTML-escaped. If the strip is missing the email is still sent without it and a line is written to `error_log`.
- **Server requirement**: both model folders must exist on the server (`models/` is not in git). Build them with `npm run wallet:apple -- corporate_card` and `-- family_card`, or copy the folders. A missing model makes pass issuing fail with a clear error (it never falls back to the other design).
- Not changed: the Apple event pass (`generateApplePass`), `emailMembershipCard` (unused) and the employee invitation email.

### Google Wallet member pass

`generateMemberGooglePass` (`services/googlePassService.js`) builds its class and object with `services/googleMemberPass.js`, with the same partner rules:

| Partner | Class id | Background | Title beside the logo | Hero image |
|---|---|---|---|---|
| `GEC Family Membership` | `<issuer>.membership_family_card` | `#139038` | `GEC Family Membership` | `/uploads/wallet/family_card-hero.png` |
| other / none | `<issuer>.membership_corporate_card` | `#9d1d1d` | `Corporate Card - {Partner}` / `Corporate Card` | `/uploads/wallet/corporate_card-hero.png` |

- Fields: one row with Expiry Date, Member ID and Name, then the serial number below. "Corporate Partner" is gone. Google requires a header, so it is the fixed text "Membership Pass" (the name is in the row).
- One class per design: passes saved before this change stay on the old class `membership_class` and look as before.
- **Logo**: the same logo as the Apple pass (`models/membership.pass/logo-original.png`) on a square transparent image (`/uploads/wallet/logo.png`). Google crops logos into a circle, so the logo has margin. The Google event pass uses this logo too (before, both used the "20 Jahre" `logo@2x.png`).
- **Images**: the server serves `file_storage/` at `/uploads`, so the pass uses `file_storage/wallet/{logo.png, corporate_card-hero.png, family_card-hero.png}` on the server. `file_storage/` is not in git and the deploy workflow does not copy it: **copy these three files to the server by hand** (the sources are in git under `wallet_assets/google/`, see below). Base address: `WALLET_ASSET_BASE_URL` in `.env`, default `https://services.german-emirates-club.com/uploads`.
- **Rebuild and publish the images** after changing a design or the logo: `npm run wallet:google -- corporate_card` and `-- family_card` (option `--logo <png>` to use another logo). Then upload, for example:
  ```bash
  ssh USER@HOST "mkdir -p ~/node/services.german-emirates-club.com/file_storage/wallet"
  scp wallet_assets/google/corporate_card/hero.png USER@HOST:~/node/services.german-emirates-club.com/file_storage/wallet/corporate_card-hero.png
  scp wallet_assets/google/family_card/hero.png    USER@HOST:~/node/services.german-emirates-club.com/file_storage/wallet/family_card-hero.png
  scp wallet_assets/google/corporate_card/logo.png USER@HOST:~/node/services.german-emirates-club.com/file_storage/wallet/logo.png
  ```
  Check that `https://services.german-emirates-club.com/uploads/wallet/logo.png` loads. Without the files Google shows the pass without logo and hero image.
