# Quickstart: Validate Wallet Card Generators

**Prerequisites**: Node installed, Chrome or Chromium installed (set `CHROME_PATH` if not in a standard location), repo dependencies installed.

## 1. Apple model
```bash
node scripts/wallet/generate-apple-pass.js corporate_card
node scripts/wallet/generate-apple-pass.js family_card
ls models/corporate_card.pass models/family_card.pass
```
Expected: each folder has `pass.json`, `strip.png`/`@2x`/`@3x`, icon and logo files, and no `manifest.json` or `signature`. Open the strips and confirm no "Corporate Card" or "Family Membership Card" text and the correct colors (red `#9d1d1d`, green `#139038`).

## 2. Issue a test pass
Point a test run of the pass service at the generated model, issue a pass, open the `.pkpass` on an iPhone or in Wallet preview. Expected: accepted, strip shown, fields readable on top.

## 3. Google class
```bash
node scripts/wallet/generate-google-class.js family_card
ls wallet_assets/google/family_card
```
Expected: `class.json`, `look.json`, `hero.png` (1032x336), `logo.png` (660x660). Host the images, register the class via the Wallet console or API, and confirm it is accepted.

## 4. New type and errors
```bash
cp family_card.html blue_card.html   # change --red
node scripts/wallet/generate-apple-pass.js blue_card
node scripts/wallet/generate-google-class.js nope_card   # expect clear error listing available designs
```

## 5. Unit tests
```bash
npm run test:wallet
```
See [contracts/cli.md](contracts/cli.md) and [data-model.md](data-model.md).
