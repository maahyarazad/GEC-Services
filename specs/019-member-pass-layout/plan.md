# Implementation Plan: Member Pass Design per Partner and New Pass Layout

**Branch**: `019-member-pass-layout` | **Date**: 2026-11-19 | **Spec**: [spec.md](spec.md)

## Summary

Add a small pure module with the partner rules (design choice, logo text, field list) and use it in `generateMemberPass`. The route passes the partner read from the database. A second module builds the "pass issued" email (two versions) from the same rules and the design colors, and `membership_pass_email` uses it. The Google member pass gets the same rules through a pure builder (`services/googleMemberPass.js`), and the Google logo is replaced by the Apple logo on a square image. Apple pass, Google pass and that email.

## Technical Context

**Language/Version**: Node.js (CommonJS), existing Express app

**Primary Dependencies**: existing `passkit-generator`; models from feature 018 (`models/corporate_card.pass`, `models/family_card.pass`)

**Storage**: none new (`member_card.partner` already exists)

**Testing**: Node built-in runner (`npm run test:wallet`), plus manual check on an iPhone (screenshot compared with `IMG_1293.png`)

**Target Platform**: Server issuing Apple passes; iOS Wallet

**Email approach**: table-based HTML (no SVG or gradients, which mail clients drop). Colors come from the design HTML (`loadDesign` in `scripts/wallet/lib/design.js`). The icon strip is `models/<design>.pass/strip@2x.png`, attached inline with a `cid:` reference through nodemailer, so nothing needs to be hosted. The logo keeps its existing hosted URL.

**Constraints**: Do not change the QR link, storage folder, or Member ID and Expiry fields. Do not fall back silently to another design.

## Constitution Check

The constitution is still an unfilled template, so there are no gates. Self-checks: no new dependency, no schema change, existing passes untouched.

## Project Structure

```text
specs/019-member-pass-layout/{spec.md, plan.md, tasks.md}

services/memberPassLayout.js        # NEW: pure rules (design, label, fields)
services/memberPassEmail.js         # NEW: builds the pass-issued email (subject, html, text, inline strip image)
services/googleMemberPass.js        # NEW: pure builder of the Google class and object (design, label, fields, images)
services/googlePassService.js       # generateMemberGooglePass uses the builder; logo URL of the event pass
services/applePassService.js        # generateMemberPass uses the rules
services/emailService.js            # membership_pass_email uses memberPassEmail.js
routes/member_card.js               # /member-pass: partner and expiry from the database
tests/wallet/memberPassLayout.test.js
tests/wallet/memberPassEmail.test.js
tests/wallet/googleMemberPass.test.js
file_storage/wallet/{logo.png, corporate_card-hero.png, family_card-hero.png}   # served at /uploads/wallet/
scripts/wallet/lib/render.js + generate-google-class.js   # logo = Apple logo, square, transparent
(file_storage/ is not in git or in the deployment: upload the three images by hand)
descriptions/Wallet-Card-Generators.md   # note on design selection
```

**Structure Decision**: single project; one new service module so the rules are testable without Wallet or certificates.
