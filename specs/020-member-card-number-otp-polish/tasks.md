# Tasks: Admin Card Number, OTP Input Polish, Onboarding Final Message

**Input**: specs/020-member-card-number-otp-polish/ (spec, plan, research, data-model, contracts, quickstart)
**Tests**: only the card number helper gets an automated test (pure logic, `npm run test:members`); UI is checked manually per quickstart.

## Phase 1: Setup
No setup needed (no new dependency, no schema change).

## Phase 2: Foundational
- [X] T001 Create `services/cardNumber.js` exporting `nextCardNumber(db, type)`: prefix `'5'` when type is 5 else `'7'`; base 5000000 / 7000000; query `SELECT MAX(card_number) AS max_num FROM member_card WHERE CAST(card_number AS TEXT) LIKE ?` with `<prefix>%`; return `(max_num ?? base) + 1`. Mirror the logic in `routes/member_card.js` (~l.575-682).

## Phase 3: User Story 1 - Admin-added members get a card number (P1) 🎯 MVP
**Goal**: members added from the admin page have `card_number` = latest + 1.
**Independent test**: add two type-5 members and one type-7 member in the admin page; numbers are consecutive per range.
- [X] T002 [P] [US1] Add `tests/members/cardNumber.test.js` (node:test) covering: empty range gives 5000001 and 7000001, existing max gives max+1, rows of the other prefix are ignored. Use an in-memory better-sqlite3 db with a minimal `member_card(card_number)` table.
- [X] T003 [US1] In `routes/partner_onboarding.js` (`POST /api/partner-onboarding/employee`, ~l.378-415): require `nextCardNumber`, compute `const memberType = type === 5 ? 5 : 7`, and inside one `db.transaction` compute the number and run the INSERT with a new `card_number` column/value; use `memberType` for `type`.
- [X] T004 [US1] In the same handler return `card_number` in the 201 JSON (`{ status, message, id, card_number }`) per `contracts/add-member.md`.
- [X] T005 [US1] In `routes/member_card.js` sync (~l.675-682) replace the inline max/+1 code and the `getMaxCardNumber` statement with `nextCardNumber(db, r.language === 'de' ? 5 : 7)`; behavior must stay identical.

**Checkpoint**: run `npm run test:members`; add members in the admin UI and verify with the SQL in quickstart step 1.

## Phase 4: User Story 2 - OTP field is easy to use (P1)
**Goal**: focus, scroll, GEC colors and paste work in step 1 and step 2.
**Independent test**: quickstart steps 2 and 3.
- [X] T006 [US2] In `public/src/components/utils/OtpInput.jsx` add a shared `fillFrom(startIndex, rawValue)` that strips non-digits, writes digits into the boxes from `startIndex` (capped at `length`), calls `onChange`, and focuses the box after the last filled one (or the last box).
- [X] T007 [US2] In `OtpInput.jsx` make `handleChange` use `fillFrom` when the value has more than one digit (autofill), keeping single-digit behavior; add `onPaste` on each `TextField` input (via `inputProps` or `slotProps`) that calls `e.preventDefault()` and `fillFrom(0, e.clipboardData.getData('text'))`. Ensure the existing completion effect still fires `onComplete` once.
- [X] T008 [US2] In `OtpInput.jsx` add `focus()` to `useImperativeHandle`: focus `inputsRef.current[0]` with `{ preventScroll: true }` then `scrollIntoView({ block: 'center', behavior: 'smooth' })`.
- [X] T009 [P] [US2] In `public/src/components/pages/MemberOnboardingComponents/MemberLogin.jsx` (step 1, `<OtpInput>` ~l.630) pass `useGECStyle`; add an effect that, when `showOtpInput` becomes true and the OTP block has rendered, calls `otpRef.current?.focus()` after ~350 ms (the `.otp-slide` transition is 0.5 s; use a timeout cleared on unmount).
- [X] T010 [P] [US2] In `public/src/components/pages/MemberOnboardingComponents/MemberUpdate.jsx` (step 2, `<OtpInput>` ~l.568) apply the same: `useGECStyle` and the focus effect keyed on `wizardState.otpState?.showOtpInput` and `currentResponseStatus`.
- [X] T011 [US2] Check other `OtpInput` users (`PurchaseComponent/MemberLogin.jsx`, `PurchaseComponent/MemberUpdate.jsx`, `PartnerOnboarding.tsx`, `TemplateForm.jsx`) still work with paste (additive change; no prop changes required) and that `useGECStyle` is not forced on them.

**Checkpoint**: manual run of quickstart steps 2, 3 and 5 (typing and Backspace still work).

## Phase 5: User Story 3 - Final step message (P2)
**Goal**: bold app-account instruction on the last step.
**Independent test**: quickstart step 4.
- [X] T012 [P] [US3] In `public/src/components/pages/MemberOnboarding.jsx` after the "Your account has been verified!..." Typography (~l.199-205) add a bold line, e.g. `<strong style={{ color: GEC.goldDark }}>Register your username in the GEC Mobile App (Create an Account) to access your membership.</strong>`, as its own `Typography variant="body2"` inside the same box or directly below it, matching spacing.

## Phase 6: User Story 4 - Search result scrolls into view (P2)
**Goal**: after a successful email search in step 1, the member card is focused and visible.
**Independent test**: search a known email in step 1 on a phone-width screen; the card is scrolled to the center. Search an unknown email; no scroll and the error message shows.
- [X] T015 [US4] In `public/src/components/pages/MemberOnboardingComponents/MemberLogin.jsx` add `const resultRef = useRef(null)`; put `ref={resultRef}` and `tabIndex={-1}` (plus `outline: 'none'` in `sx`) on the result `<Card>` rendered under `{wizardState?.member && (` (~l.524).
- [X] T016 [US4] In the same file add `useEffect(() => { if (!wizardState?.member) return; const t = setTimeout(() => { resultRef.current?.focus({ preventScroll: true }); resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); return () => clearTimeout(t); }, [wizardState?.member?.email]);` so it runs when a member is found (keyed on the email so authentication state changes do not re-scroll). Keep it clear of the OTP focus effect (350 ms, runs only after OTP is requested).
- [X] T017 [US4] Verify manually (quickstart step 6): found email scrolls/focuses the card, unknown email does not, OTP focus still works after "Send OTP".

## Phase 7: Polish
- [X] T013 Run `npm run test:members` and `npm run test:wallet`, then the frontend build/lint (`cd public && npm run build`) to confirm nothing broke.
- [X] T014 Walk through `quickstart.md` end to end.

## Dependencies & Order
- T001 blocks T003, T005; T002 can run in parallel with T003 once T001 exists.
- US1 (T001-T005), US2 (T006-T011) and US3 (T012) touch different files and are independent. Within US2: T006 → T007 → T008 → (T009, T010 in parallel) → T011.
- US4 (T015-T017) touches only `MemberLogin.jsx`, after US2's edit to that file (T009). Polish after all stories.

## Parallel example
T002 with T003; T009 with T010; T012 anytime.

## Strategy
MVP = US1 (card number). Then US2, then US3 (a one-line change). Commit per story.
