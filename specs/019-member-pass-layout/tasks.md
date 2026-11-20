---

description: "Task list for Member Pass Design per Partner, New Pass Layout, Pass-Issued Email and Google Wallet pass"
---

# Tasks: Member Pass Design per Partner, New Pass Layout, Pass-Issued Email and Google Wallet Pass

**Input**: Design documents from `/specs/019-member-pass-layout/` (spec.md, plan.md)

**Prerequisites**: feature 018 models `models/corporate_card.pass` and `models/family_card.pass` exist locally (with `strip@2x.png`); the renewed signing certificate is in `certs/`.

**Tests**: Unit tests for the pure rules (`tests/wallet/memberPassLayout.test.js`) and for the email builder (`tests/wallet/memberPassEmail.test.js`), run with `npm run test:wallet`. Wallet and mail-client display are checked by hand against `IMG_1293.png` (screenshot of the current pass, kept out of git).

**Organization**: Grouped by user story. US1, US2 and US3 change the same function (`generateMemberPass`), so they run one after another. US4 (email) only needs Phase 2 and can run in parallel with them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 = family design for the family partner, US2 = text beside the logo, US3 = Name replaces Corporate Partner, US4 = pass-issued email in two versions, US5 = Google pass follows the same rules, US6 = Google logo is the Apple logo

## Path Conventions

- Google builder: `services/googleMemberPass.js` (new); Google service: `services/googlePassService.js`; Google images: `file_storage/wallet/` (served at `/uploads/wallet/`)
- Rules: `services/memberPassLayout.js` (new); pass builder: `services/applePassService.js`; email builder: `services/memberPassEmail.js` (new); email sender: `services/emailService.js`; route: `routes/member_card.js`
- Tests: `tests/wallet/`

---

## Phase 1: Setup

- [X] T001 Confirm `models/corporate_card.pass/` and `models/family_card.pass/` exist with `pass.json` and the three `strip*.png`; if missing, build them with `npm run wallet:apple -- corporate_card` and `npm run wallet:apple -- family_card`
- [X] T002 Record the current behaviour for comparison: in `IMG_1293.png` the logo text is "CORPORATE CARD", the name is a primary field drawn over the icon strip, the aux row is Member ID (left) and "Corporate Partner" (right), and Expiry Date is a secondary field. The current email (`membership_pass_email` in `services/emailService.js`, around lines 617-860) draws a red table card with "CORPORATE CARD", empty icon cells, and Name, Corporate Partner and Expiry (MM/YY). Do not add `IMG_1293.png` to git (it shows a real member)

---

## Phase 2: Foundational (blocks all stories)

**Purpose**: The pure rules every story uses

- [X] T003 [P] Write `tests/wallet/memberPassLayout.test.js` (node:test) for the functions below: `isFamilyPartner("GEC Family Membership")` and `" gec family membership "` are true; `"ACME"`, `""`, `null`, `undefined` are false. `modelNameFor` returns `family_card.pass` for the family partner and `corporate_card.pass` otherwise. `designNameFor` returns `family_card` or `corporate_card` the same way. `passLabelFor("ACME")` is `Corporate Card - ACME`, `passLabelFor(" ACME ")` trims to the same, `passLabelFor("GEC Family Membership")` is `GEC Family Membership`, `passLabelFor("")` and `passLabelFor(null)` are `Corporate Card`. `buildMemberFields({ firstname: "Ana", lastname: "Lopez", memberId: "123", expiry: "24-03-2027" })` returns `primaryFields: []`, `secondaryFields: [{ key: "expiry", label: "Expiry Date", value: "24-03-2027" }]` and `auxiliaryFields` of Member ID (key `memberId`, left aligned) then Name (key `name`, label `Name`, value `Ana Lopez`, `PKTextAlignmentRight`), with no field labelled "Corporate Partner"; a missing first or last name gives a trimmed name without "undefined" or "null"
- [X] T004 [P] Implement `services/memberPassLayout.js` exporting `FAMILY_PARTNER` (`"GEC Family Membership"`), `isFamilyPartner`, `modelNameFor`, `designNameFor`, `passLabelFor` and `buildMemberFields` exactly as specified in T003 (compare partner with `String(p ?? "").trim().toLowerCase()`). Make T003 pass

**Checkpoint**: `npm run test:wallet` passes including the new file

---

## Phase 3: User Story 1 - Family members get the family design (Priority: P1) MVP

**Goal**: Partner "GEC Family Membership" gets `family_card.pass`, all others `corporate_card.pass`, decided from the database value

**Independent Test**: Issue a pass for each kind of partner and check which model's colour it has (green family, red corporate)

- [X] T005 [US1] In `routes/member_card.js`, in the `/member-pass` handler, set `member.partner = _member.partner || "";` right after `plan` is computed and **outside** the `if (plan.needsNewPass)` block (so both the pass and the email use the stored partner, also when no new pass is issued)
- [X] T006 [US1] In `services/applePassService.js`, change `generateMemberPass` to build the model path with `modelNameFor(partner)` from `services/memberPassLayout.js` (`path.join(process.cwd(), "models", modelNameFor(partner))`). Before `PKPass.from`, check the folder with `fs.existsSync` and throw `new Error("Pass model not found: <path>. Build it with npm run wallet:apple.")` if it is missing (no fallback to the other design; the route already logs the error to `error_log` and returns 500). Leave `generateApplePass` (events) unchanged
- [X] T007 [US1] Verify with a throwaway script run from the repo root (it must run with the repo as the current directory because the service uses `process.cwd()`): call `generateMemberPass` for partner `GEC Family Membership` and for partner `ACME` with serials `TEST-FAMILY` and `TEST-CORP`, unzip each `pass_storage/corporate-card/TEST-*.pkpass`, and confirm `backgroundColor` is `rgb(19, 144, 56)` for the family pass and `rgb(157, 29, 29)` for the other. Then delete `pass_storage/corporate-card/TEST-*.pkpass`

**Checkpoint**: Design selection works and is verified

---

## Phase 4: User Story 2 - Text beside the logo names the partner (Priority: P1)

**Goal**: Logo text and Add-sheet heading follow the partner rules

**Independent Test**: Read `logoText` and `description` in the issued `pass.json` for partners "ACME", "GEC Family Membership" and empty

- [X] T008 [US2] In `services/applePassService.js` `generateMemberPass`, set both `logoText` and `description` in the `PKPass.from` overrides to `passLabelFor(partner)` (replacing `` `${title}` ``). Keep the storage folder and QR link based on `event_page` unchanged (FR-007, FR-008)
- [X] T009 [US2] Verify with the T007 script: `logoText` and `description` are `Corporate Card - ACME`, `GEC Family Membership` and `Corporate Card` for the three partner values; the QR message in `barcodes` is unchanged (`.../guest-registration/corporate-card?guest-code=<serial>`)

**Checkpoint**: Text rules verified

---

## Phase 5: User Story 3 - Name replaces Corporate Partner (Priority: P2)

**Goal**: One row below the strip (Expiry Date, Member ID, Name); strip free of text

**Independent Test**: Inspect `pass.json` of an issued pass and view it in Wallet

- [X] T010 [US3] In `services/applePassService.js` `generateMemberPass`, replace the four `pass.*Fields.push(...)` lines (event_name primary, expiry secondary, Member ID aux, Corporate Partner aux) with the arrays from `buildMemberFields({ firstname, lastname, memberId, expiry: formattedDate })`, pushing each element into `pass.primaryFields`, `pass.secondaryFields` and `pass.auxiliaryFields`. Result: no primary field, no "Corporate Partner" field, Name at the right of the aux row
- [X] T011 [US3] Verify with the T007 script: `pass.json` has `storeCard.primaryFields` empty, `secondaryFields` with Expiry Date, `auxiliaryFields` with Member ID then Name, and no field labelled "Corporate Partner"; the signature of the issued pass verifies with `openssl smime -verify -inform DER -in signature -content manifest.json -noverify`

**Checkpoint**: All three pass stories work

---

## Phase 6: User Story 4 - Pass-issued email in two versions (Priority: P2)

**Goal**: The email sent after a pass is issued shows the right card (corporate red or family green), with the same text and fields as the pass

**Independent Test**: Build the email for partners "ACME", "GEC Family Membership" and empty, check subject, card colour, text and fields; then render and view both versions, and send one of each to an address you control

- [X] T012 [P] [US4] Write `tests/wallet/memberPassEmail.test.js` (node:test) for `buildMemberPassEmail({ member, applePKpassPath, googlePassToken, clientOrigin, modelsDir, now })` from `services/memberPassEmail.js`, using a temp `modelsDir` that contains `corporate_card.pass/strip@2x.png` and `family_card.pass/strip@2x.png`. Check: (a) partner `ACME`: `subject` is `Your Corporate Card Has Been Issued`, `html` contains `Corporate Card - ACME`, the corporate background `#9d1d1d`, the labels `Expiry Date`, `Member ID` and `Name`, `cid:card-strip`, and does not contain `Corporate Partner` or `#139038`; (b) partner `GEC Family Membership`: `subject` is `Your GEC Family Membership Card Has Been Issued`, `html` contains `GEC Family Membership` and `#139038` and does not contain `Corporate Card - `; (c) empty partner: label is `Corporate Card` with no ` - `; (d) a name or partner containing `<script>` appears as `&lt;script&gt;`; (e) the Apple Wallet link is `${clientOrigin}${applePKpassPath}` and the Google link is the token; (f) expiry is shown as `DD-MM-YYYY` and a missing expiry shows `--`; (g) `attachments` has one inline image (`cid: "card-strip"`, path inside `modelsDir`) and `warnings` is empty when the strip exists, and with an empty `modelsDir` there is no attachment, no `cid:` in `html`, and `warnings` has one entry; (h) `text` mentions the card type
- [X] T013 [P] [US4] Implement `services/memberPassEmail.js` exporting `escapeHtml` and `buildMemberPassEmail` returning `{ subject, html, text, attachments, warnings }`. Choose the version with `isFamilyPartner(member.partner)`; read colours with `loadDesign(designNameFor(partner))` from `scripts/wallet/lib/design.js` (`backgroundColor`, `accentColor`); the label is `passLabelFor(partner)`; subject is `Your Corporate Card Has Been Issued` or `Your GEC Family Membership Card Has Been Issued`. HTML is table-based (no SVG, gradients or CSS grid): keep the existing 500px white outer table, then a card table with `bgcolor` = design background and rounded corners containing (1) a row with the logo (`https://www.german-emirates-club.com/uploads/files/user/GE-LOGO-GOLD.png`, width 120) at the left and the label right-aligned in the accent colour (about 20px), (2) a full-width `<img src="cid:card-strip" width="100%" style="display:block">` row only when `<modelsDir>/<design>.pass/strip@2x.png` exists, and (3) one row of three cells: Expiry Date (left), Member ID (middle) and Name (right), labels 12px in the accent colour, values 16px white (full name is `firstname lastname`, trimmed; expiry via `moment(...).format("DD-MM-YYYY")`, `--` when missing). Escape every member value with `escapeHtml`. Reuse the existing greeting, Apple Wallet and Google Wallet buttons, app store links, contact text and footer from `membership_pass_email` unchanged, with the intro sentence adapted for the family version ("... we've issued your GEC Family Membership Pass below ..."). The attachment is `{ filename: "card-strip.png", path: <strip path>, cid: "card-strip", contentDisposition: "inline" }`; if the file is missing, add no attachment, omit the image row and push a message to `warnings`. `modelsDir` defaults to `path.join(process.cwd(), "models")`. Make T012 pass
- [X] T014 [US4] In `services/emailService.js`, replace the inline `htmlBody`, subject and text of `membership_pass_email` with `buildMemberPassEmail({ member, applePKpassPath, googlePassToken, clientOrigin: process.env.CLIENT_ORIGIN })`. Pass `html`, `subject`, `text` and `attachments` from the result to `sendRawEmailWithAttachments` (keep `category: "membership-pass"` and `to: member.email`), and log each entry of `warnings` with `dbService.create("error_log", { error, origin_function: "membership_pass_email" })`. Keep the existing try/catch. Do not touch `emailMembershipCard`, `membership__invitation` or `sendBatchEmails`
- [X] T015 [US4] In `routes/member_card.js` `/member-pass`, immediately before `await membership_pass_email(...)` set `member.card_expiry_date = plan.expiry;` (outside the `if (plan.needsNewPass)` block) so the email shows the stored or renewed expiry and not a value sent by the client; `member.partner` is already set by T005
- [X] T016 [US4] Preview both versions: from a throwaway script outside the repo tree, call `buildMemberPassEmail` for partner `ACME` and for `GEC Family Membership` with sample data, replace `cid:card-strip` with the `file://` path of the strip in the written HTML, and render each with `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --screenshot=<file>.png --window-size=700,1200 file://<html>`. View the two images and check: red vs green card, label beside the logo, icon strip visible, Expiry Date / Member ID / Name in one row, no "Corporate Partner", wallet buttons and footer intact. Fix any layout problem in `services/memberPassEmail.js`
- [ ] T017 [US4] Send one real email of each version to an address you control using a throwaway script that calls `membership_pass_email` with sample members (needs the SMTP variables in `.env`; use link paths like `/apple_pass/corporate-card/TEST.pkpass`, they may 404) and check them in Gmail and Apple Mail against the pass (SC-005). Do not send to real members

**Checkpoint**: The email has two versions that match the passes

---

## Phase 7: Polish & Cross-Cutting

- [X] T018 [P] Update `descriptions/Wallet-Card-Generators.md` with a "Member pass design" section: the partner rule (`GEC Family Membership` gives `family_card.pass` and the green email), the logo text rule, the new field layout, that partner and expiry come from the database, that the pass email uses the strip image from the model folder (`models/<design>.pass/strip@2x.png`), and that both model folders must exist on the server (`models/` is not in git; build with `npm run wallet:apple -- <design>` or copy the folders)
- [X] T019 Run `npm run test:wallet` and `npm run test:members`; all must pass
- [ ] T020 Manual check of the passes: issue one pass of each design (a test member with partner `GEC Family Membership` and one corporate member), add them on an iPhone and compare with `IMG_1293.png`: text beside the logo, clear icon strip, Expiry Date, Member ID and Name in one row, QR code present. Note any layout problem
- [X] T021 Confirm unchanged behaviour: `git diff` shows no change to `services/googlePassService.js`, `generateApplePass`, `emailMembershipCard`, `membership__invitation`, the QR link, or the CSV export's pass link (still the `corporate-card` folder)

---

## Phase 8: User Story 5 - Google Wallet pass follows the same rules (Priority: P1)

**Goal**: The Google member pass uses the design chosen by the partner, the same title beside the logo, and Name instead of Corporate Partner

**Independent Test**: Decode the save link generated for partners "ACME", "GEC Family Membership" and empty; check class id, colour, title, hero image and fields (no network calls)

**Current Google structure** (`generateMemberGooglePass` in `services/googlePassService.js`): one class `<issuer>.membership_class`; object with `hexBackgroundColor` `#9d1d1d`, `logo` = `uploads/logo@2x.png`, `cardTitle` = "Corporate Card", `header` = full name, `subheader` = "Name", `heroImage` = `uploads/GEC_transparent.png`, text modules `cardnumber` ("Member Id"), `partner` ("Corporate Partner"), `expiry`, `serialNumber`; class rows `cardnumber | partner` and `expiry | serialNumber`.

- [X] T022 [P] [US5] Write `tests/wallet/googleMemberPass.test.js` (node:test) for `buildGoogleMemberPass({ data, issuerId: "123", assetBaseUrl: "https://x/uploads", qrValue, expirationDate })` from `services/googleMemberPass.js`, returning `{ genericClass, genericObject }`. With `data = { firstname: "Ana", lastname: "Lopez", memberId: "1774354016162", serial_number: "GEC-1", partner, formattedExpiry: "24-03-2027" }`, check: (a) partner `ACME`: `genericClass.id` and `genericObject.classId` are `123.membership_corporate_card`, `hexBackgroundColor` `#9d1d1d`, `cardTitle.defaultValue.value` `Corporate Card - ACME`, `heroImage.sourceUri.uri` `https://x/uploads/wallet/corporate_card-hero.png`, `logo.sourceUri.uri` `https://x/uploads/wallet/logo.png`; (b) partner `GEC Family Membership` (also `" gec family membership "`): class id `123.membership_family_card`, `#139038`, title `GEC Family Membership`, hero `.../wallet/family_card-hero.png`; (c) empty partner: title `Corporate Card` and the corporate class; (d) `header.defaultValue.value` is `Membership Pass` and there is no `subheader`; (e) `textModulesData` has exactly the ids `expiry` (header `Expiry Date`, body `24-03-2027`), `cardnumber` (header `Member ID`, body `1774354016162`), `name` (header `Name`, body `Ana Lopez`) and `serialNumber` (body `GEC-1`), and no id `partner` and no header `Corporate Partner`; (f) `genericClass` has only the keys `id` and `classTemplateInfo`, whose `cardRowTemplateInfos` are a `threeItems` row with the field paths `expiry`, `cardnumber`, `name` in that order and then a `oneItem` row with `serialNumber`; (g) `barcode` is `{ type: "QR_CODE", value: qrValue }` and `validTimeInterval.end.date` equals the given `expirationDate` ISO string; (h) a missing last name gives the name `Ana` without "undefined"
- [X] T023 [P] [US5] Implement `services/googleMemberPass.js` exporting `buildGoogleMemberPass` as specified in T022. Use `designNameFor`, `designColorsFor` and `passLabelFor` from `services/memberPassLayout.js`; class id `${issuerId}.membership_${designName}`; object `state: "active"`, `hexBackgroundColor` from the design, `logo` and `heroImage` (with `contentDescription` like the existing code) from `${assetBaseUrl}/wallet/logo.png` and `${assetBaseUrl}/wallet/${designName}-hero.png`, `cardTitle` = label, `header` = `Membership Pass`, `linksModuleData` as in the existing object (official site link), `barcode` and `validTimeInterval` as in the existing object (`start` = now ISO). Do not import anything from `scripts/` (the server deployment does not copy it). Make T022 pass
- [X] T024 [US5] In `services/googlePassService.js` `generateMemberGooglePass`, replace the inline `genericClass` and `genericObject` literals with the result of `buildGoogleMemberPass({ data: { ...data, formattedExpiry: formattedDate }, issuerId, assetBaseUrl: WALLET_ASSET_BASE, qrValue, expirationDate })`, where `const WALLET_ASSET_BASE = process.env.WALLET_ASSET_BASE_URL || "https://services.german-emirates-club.com/uploads";` is defined near `issuerId`. Keep the JWT claims, `objectId`, `qrValue`, expiry maths, the `generateGooglePass` function and the exports unchanged. Remove variables that become unused
- [X] T025 [US5] Verify with a throwaway script run from the repo root (`GOOGLE_CONFIG` comes from `.env`; signing is local, no network): call `generateMemberGooglePass` for partners `ACME`, `GEC Family Membership` and empty, take the token after `process.env.GOOGLE_PASS_BASE_PATH` in the returned URL, `jwt.decode` it, and check the same points as T022 on `payload.genericClasses[0]` and `payload.genericObjects[0]`; also check `exp` is the card expiry

**Checkpoint**: The Google pass follows the Apple rules

---

## Phase 9: User Story 6 - Google logo is the Apple logo (Priority: P1)

**Goal**: The Google pass logo is the Apple logo on a square image, hosted by the server

**Independent Test**: Open the logo and hero URLs in a browser; add a pass on an Android phone

**Background**: the Google pass now uses `uploads/logo@2x.png` (the "20 Jahre" anniversary logo with a laurel wreath, 299x200); the Apple pass uses `models/membership.pass/logo*.png` (the plain logo). Google shows logos in a round frame, so a wide logo would be cut: use a square image with margin and a transparent background.

- [X] T026 [US6] In `scripts/wallet/lib/render.js` and `scripts/wallet/generate-google-class.js`, make `logo.png` (660x660) the Apple logo instead of the GEC badge: add a render mode that writes a temporary HTML page with a transparent body and one `<img>` whose `src` is a `data:image/png;base64,...` URI of `models/membership.pass/logo-original.png` (path from a new `--logo <file>` option, default that file), scaled to fit 80% of the width and centred, and run headless Chrome with `--default-background-color=00000000` so the PNG keeps its transparency. The logo is the same for every design. Keep `hero.png` as is. Update `tests/wallet/newDesign.test.js` if it asserts the old badge (size stays 660x660), and `contracts/cli.md` of feature 018 and `descriptions/Wallet-Card-Generators.md` for the new `--logo` option
- [X] T027 [US6] Regenerate with `npm run wallet:google -- corporate_card` and `npm run wallet:google -- family_card`, then open `wallet_assets/google/<design>/logo.png` and `hero.png` and confirm: the logo is the eagle and palm logo without "20 Jahre" or laurel, centred with margin, transparent background; the heroes show the red and green designs. Fix the render mode (T026) if the logo is cut or blurry
- [X] T028 [US6] Create `file_storage/wallet/` with `logo.png` (copy of `wallet_assets/google/corporate_card/logo.png`), `corporate_card-hero.png` and `family_card-hero.png` (copies of each design's `hero.png`), so they are served at `/uploads/wallet/...` (server.js serves `file_storage/` under `/uploads`). Check that `file_storage/wallet/*` is not ignored by git (`git check-ignore`) and commit-ready
- [X] T029 [US6] In `services/googlePassService.js` `generateGooglePass` (event pass), replace the `https://services.german-emirates-club.com/uploads/logo@2x.png` address (the event pass has one: its `logo`) with `${WALLET_ASSET_BASE}/wallet/logo.png`. Do not change anything else in that function (this edits the same file as T024: do it after T024)
- [X] T030 [US6] In `.github/workflows/deply_registration_app_server.yml`, add a step line to the "Upload server files" run block that copies `file_storage/wallet` to `~/node/services.german-emirates-club.com/file_storage/` with `scp -i ~/.ssh/id_rsa -P ${{ secrets.SSH_PORT }} -r file_storage/wallet ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }}:~/node/services.german-emirates-club.com/file_storage/`, so the images are available at `https://services.german-emirates-club.com/uploads/wallet/...` after each deploy

**Checkpoint**: Google logo and hero images exist, are hosted and are used by the passes

---

## Phase 10: Google Polish

- [X] T031 [P] Update `descriptions/Wallet-Card-Generators.md`: in the "Member pass design" section add the Google rules (class `membership_corporate_card` / `membership_family_card`, colours, title, row Expiry Date / Member ID / Name plus serial, header "Membership Pass"), the image folder `file_storage/wallet/` served at `/uploads/wallet/`, that the deploy copies it, and that old passes stay on class `membership_class`
- [X] T032 Run `npm run test:wallet` and `npm run test:members`; all must pass. Also repeat the deploy simulation from earlier (copy only `server.js routes.js package.json services routes websocket middleware helpers` to a temp folder, load `./services/googlePassService.js` and `./services/googleMemberPass.js` with `GOOGLE_CONFIG` and `DOTENV_CONFIG_PATH` set) to prove nothing needs `scripts/` or the design HTML at runtime
- [ ] T033 Manual check: after deploying, open `https://services.german-emirates-club.com/uploads/wallet/logo.png` and both hero URLs (each must return the image), then save one Google pass of each type on an Android phone and compare with the Apple passes: colour, text beside the logo, hero image, one row of Expiry Date / Member ID / Name, serial number below, logo fully visible in the round frame
- [X] T034 Confirm unchanged behaviour: `git diff` shows no change to the Apple pass code, the email code, `routes/member_card.js` or the `generateGooglePass` layout (only its two logo addresses), and objects already saved under `membership_class` are not touched

---

## Dependencies & Execution Order

- Phase 1, then Phase 2 (T003 and T004 can run together; T003 passes once T004 exists)
- US1 (T005-T007) before US2 (T008-T009) before US3 (T010-T011): all edit `services/applePassService.js`, so they are sequential
- US4 needs only Phase 2 and T005; it can run in parallel with US1-US3 because it edits other files (`services/memberPassEmail.js`, `services/emailService.js`). T015 and T005 both edit `routes/member_card.js`, so do them in order
- Within US4: T012 and T013 together, then T014, T015, then T016 and T017
- Polish after the stories; T018 can run any time after T013
- US5 (T022-T025) needs only Phase 2 (T004) and can run in parallel with US1-US4; T022 and T023 together, then T024, then T025. T024 and T029 edit the same file: T024 first
- US6 needs T023's image address convention: T026 then T027 then T028, T029 (after T024) and T030 can follow in any order after T028; T033 needs a deployment
- Phase 10 after US5 and US6; T031 can start after T023

## Parallel Example

```text
Phase 2:  T003 (tests/wallet/memberPassLayout.test.js)  ||  T004 (services/memberPassLayout.js)
US4:      T012 (tests/wallet/memberPassEmail.test.js)   ||  T013 (services/memberPassEmail.js)
Streams:  US1-US3 (Apple pass)  ||  US4 (email)  ||  US5 (Google pass), after Phase 2
US5:      T022 (tests/wallet/googleMemberPass.test.js)   ||  T023 (services/googleMemberPass.js)
```

## Implementation Strategy

### MVP (User Story 1)

1. Phases 1-2, then US1: the partner decides the model
2. Stop and verify T007 (green for family, red otherwise)

### Incremental Delivery

1. US2 (text beside the logo), verify
2. US3 (Name replaces Corporate Partner), verify
3. US4 (email in two versions), preview and send tests
4. Polish: documentation, full tests, iPhone check

## Notes

- The Google Wallet member pass and its logo are now in scope (US5, US6); the Google event pass only gets the new logo
- "emailMembershipCard" in the request is read as the pass-issued email (`membership_pass_email`); the older `emailMembershipCard` function is unused and left alone
- Passes already issued are not changed; only new passes and new emails use these rules
- Commit after each story; do not commit `IMG_1293.png` or generated `models/` folders

---

## Implementation Notes

- **Done by hand later**: T017 (send one real email of each version to an address you control) and T020 (add one pass of each design on an iPhone and compare with `IMG_1293.png`). Both need real SMTP or a device, so they were not run here. The email was instead run through `membership_pass_email` with the SMTP transport stubbed, and both versions were rendered in headless Chrome and checked by eye.
- **Verification of the pass**: a throwaway script issued passes for partners `GEC Family Membership`, `  gec family membership ` , `ACME` and empty and checked colour, logo text, heading, fields, QR link and signature; a missing family model fails with the "Pass model not found" error (no fallback).
- **Extra fix**: `services/emailService.js` called `dbService.create(...)` (in `sendBatchEmails`) without importing `dbService`, so those error paths would have thrown a ReferenceError. The import was added because the new warning logging needs it.
- **Partner/expiry source**: `/member-pass` now sets `member.partner` and `member.card_expiry_date` from the database/renewal for both the pass and the email, also when no new pass is issued.
- Two real passes created earlier by your own testing remain in `pass_storage/corporate-card/`; they were not touched.
- **Google (US5, US6)**: `services/googleMemberPass.js` builds the class and object (pure, 8 tests); `generateMemberGooglePass` uses it. A throwaway script generated real signed save links for partners `ACME`, ` gec family membership` and empty, decoded the JWT and checked class id, colour, title, hero, logo, fields, header, QR and expiry (no network). The logo is now the Apple logo (`logo-original.png`) rendered to a square transparent PNG by the 018 generator (`--logo` option); checked visually and in a circular-crop simulation. The event pass had one logo address (not two) and it now points to `/wallet/logo.png`.
- **Hosting (changed after T030)**: the deploy step that copied `file_storage/wallet` was removed from the workflow and `file_storage/` is now in `.gitignore`, so T028/T030 ended up as: the images exist locally in `file_storage/wallet/` (not in git) and must be uploaded to the server by hand; their sources are tracked in `wallet_assets/google/`. Deploy simulation with no `scripts/` folder loads the Google, email, Apple and member modules.
- **Still manual**: T033 (open the three `/uploads/wallet/...` URLs after deploying, then save a Google pass of each type on an Android phone and compare with the Apple passes).
