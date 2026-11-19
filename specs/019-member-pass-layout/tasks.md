---

description: "Task list for Member Pass Design per Partner, New Pass Layout and Pass-Issued Email"
---

# Tasks: Member Pass Design per Partner, New Pass Layout and Pass-Issued Email

**Input**: Design documents from `/specs/019-member-pass-layout/` (spec.md, plan.md)

**Prerequisites**: feature 018 models `models/corporate_card.pass` and `models/family_card.pass` exist locally (with `strip@2x.png`); the renewed signing certificate is in `certs/`.

**Tests**: Unit tests for the pure rules (`tests/wallet/memberPassLayout.test.js`) and for the email builder (`tests/wallet/memberPassEmail.test.js`), run with `npm run test:wallet`. Wallet and mail-client display are checked by hand against `IMG_1293.png` (screenshot of the current pass, kept out of git).

**Organization**: Grouped by user story. US1, US2 and US3 change the same function (`generateMemberPass`), so they run one after another. US4 (email) only needs Phase 2 and can run in parallel with them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 = family design for the family partner, US2 = text beside the logo, US3 = Name replaces Corporate Partner, US4 = pass-issued email in two versions

## Path Conventions

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

## Dependencies & Execution Order

- Phase 1, then Phase 2 (T003 and T004 can run together; T003 passes once T004 exists)
- US1 (T005-T007) before US2 (T008-T009) before US3 (T010-T011): all edit `services/applePassService.js`, so they are sequential
- US4 needs only Phase 2 and T005; it can run in parallel with US1-US3 because it edits other files (`services/memberPassEmail.js`, `services/emailService.js`). T015 and T005 both edit `routes/member_card.js`, so do them in order
- Within US4: T012 and T013 together, then T014, T015, then T016 and T017
- Polish after the stories; T018 can run any time after T013

## Parallel Example

```text
Phase 2:  T003 (tests/wallet/memberPassLayout.test.js)  ||  T004 (services/memberPassLayout.js)
US4:      T012 (tests/wallet/memberPassEmail.test.js)   ||  T013 (services/memberPassEmail.js)
Streams:  US1-US3 (pass)  ||  US4 (email), after Phase 2
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

- Google Wallet member pass is out of scope (see spec assumptions); ask if it should get the same rules
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
