# Tasks: Separate Invitation Email for Family Membership

**Input**: user request (no spec/plan; scope is small). Written to its own folder so `specs/020-member-card-number-otp-polish/tasks.md` is not overwritten.
**Tests**: extend `tests/email/allTemplates.test.js` (`npm run test:email`).
**Context**: `membership__invitation(data)` in `services/emailService.js` (~l.651-758) is called by `sendBatchEmails` (`data` = member_card row, `data.partner` = partner title) and `POST /api/send-invitation-email` in `routes/member.js`. Family detection already exists: `isFamilyPartner(partner)` in `services/memberPassLayout.js` (`FAMILY_PARTNER = "Family Membership"`, pinned partner id 1719 in `services/partnerList.js`). `enhanceEmailHtml` (`services/emailResponsive.js`) already adds viewport/color-scheme meta and mobile CSS to every sent email; the invitation should also carry them itself and use fluid layout classes.

## Phase 1: Setup
No setup needed (no dependency, no schema change).

## Phase 2: Foundational
- [X] T001 In `services/emailService.js`, require `isFamilyPartner` from `./memberPassLayout` (check it is not already imported) and `emailHead` from `./emailResponsive` (read its signature first). Decide family vs corporate with `isFamilyPartner(data?.partner)`. Also confirm how a partner shown as "GEC Family Membership" (used in tests) matches: if `isFamilyPartner` does not match that title, extend the check in `services/memberPassLayout.js` to accept both "Family Membership" and "GEC Family Membership" (case-insensitive) without breaking `membership_pass_email`.

## Phase 3: User Story 1 - Family Membership members get their own invitation text (P1) 🎯 MVP
**Goal**: members whose partner is Family Membership (id 1719) receive the family wording; every other partner keeps the current wording and subject unchanged.
**Independent test**: call `membership__invitation` with `partner: "Family Membership"` and with `partner: "ACME Trading LLC"`; compare bodies and subjects.
- [X] T002 [US1] In `services/emailService.js` refactor `membership__invitation` so the shell (logo header, greeting, footer, `currentYear`) is shared and only the body paragraphs and subject differ by a `isFamily` flag. Keep `category: "membership-invitation"`, `to: data.email`, `attachments`, and the try/catch.
- [X] T003 [US1] Corporate branch (unchanged): body "Your employer, ${data?.partner || "our partner"}, has requested a complimentary digital Membership Pass ... complete your account setup:", link, "If you have any questions, please contact your HR department or reach out to us via email or WhatsApp.", subject `${data?.partner || "Our partner"} offers you your Membership Pass - for free!`.
- [X] T004 [US1] Family branch: body exactly "As requested, here is your digital Membership Pass for you with the German Emirates Club. With your Pass, you gain access to a wide range of discounts and privileges across Dubai, conveniently available on your mobile device. To activate your membership, please click the link below and complete your account setup:" then the link `https://services.german-emirates-club.com/membership`; closing "If you have any questions, please reach out to us via email or WhatsApp." then "Thank you, German Emirates Club", Email `office2@german-emirates-club.com` (mailto link kept), WhatsApp `+971 56 205 0066` (`https://wa.me/971562050066`). No mention of an employer or HR. Subject for family: "Your German Emirates Club Membership Pass" (confirm wording with the user; not specified in the request).
- [X] T005 [P] [US1] Add tests in `tests/email/allTemplates.test.js`: new call `membership__invitation_family` with `partner: "Family Membership"`; assert it contains "As requested, here is your digital Membership Pass", does not contain "Your employer" or "HR department"; assert the existing corporate call still contains "Your employer, ACME Trading LLC" and "HR department" and the original subject.

**Checkpoint**: `npm run test:email` passes.

## Phase 4: User Story 2 - Responsive invitation with proper meta tags (P2)
**Goal**: the invitation renders well on phones and in dark mode, in both versions.
**Independent test**: render both versions (the existing chrome-based test in `allTemplates.test.js` renders at mobile width) and check no horizontal scroll.
- [X] T006 [US2] In `services/emailService.js` replace the invitation `<head>` with the shared head: `<meta charset="UTF-8">`, `viewport` (`width=device-width, initial-scale=1`), `x-ua-compatible`, `format-detection` (telephone=no), `color-scheme`/`supported-color-schemes` (`light dark`), `x-apple-disable-message-reformatting`, and a real `<title>` (e.g. "Your German Emirates Club Membership Pass"); add `<html lang="en">`. Reuse `emailHead` from `services/emailResponsive.js` if it fits, otherwise write the tags inline.
- [X] T007 [US2] Make the layout fluid: wrapper table `width="600"` becomes `width="100%" style="max-width:600px;width:100%"` with the `em-wrap` class, side padding cells `padding:0 30px` get the `em-px` class (see `EMAIL_CSS` in `services/emailResponsive.js` for class names), logo `<img>` gets `max-width:100%; height:auto`, link text wraps with `word-break:break-word`, and the footer cell keeps `font-size:13px`. Add a plain-text alternative (`text:`) to the `sendRawEmailWithAttachments` call for each version.
- [X] T008 [P] [US2] In `tests/email/allTemplates.test.js` assert both invitation versions include `name="viewport"`, `name="color-scheme"`, a non-empty `<title>`, `lang="en"`, and that the existing responsive check in that file passes for both.

**Checkpoint**: `npm run test:email` passes; send a test to a phone-sized client (or open the HTML at 375px) for both versions.

## Phase 5: Polish
- [X] T009 [P] Update `documents/PARTNER_ONBOARDING_WORKFLOW.md` (~l.211, "membership__invitation") to say Family Membership members get a different invitation text than corporate partners.
- [ ] T010 Run `npm run test:email` and `npm run test:members`; manually POST `/api/send-invitation-email` with `data[partner]=Family Membership` and with a corporate partner to a test address.

## Dependencies
T001 → T002 → T003/T004 → T005. T006/T007 depend on T002 (same function); T008 after T006/T007. T009 independent.

## Parallel examples
- T005 and T009 can run alongside implementation once T004 is done.
- T008 and T009 are independent files.

## Implementation strategy
MVP = Phase 2 + US1 (correct wording per partner). Then US2 (meta tags and fluid layout). Ship together since both edit the same function.
