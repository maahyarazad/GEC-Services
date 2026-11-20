# Feature Specification: Admin Card Number, OTP Input Polish, Onboarding Final Message

**Feature Branch**: `020-member-card-number-otp-polish` (work stays on the current branch; no branch created)

**Created**: 2026-11-20

**Input**: Three requests: (1) when an admin adds a member in "GEC Corporate and Family Members", the insert must also set the card number (latest + 1); (2) in `MemberOnboarding.jsx` the email OTP field should get focus, scroll into view, use the GEC colors, and accept a pasted full OTP, in step 1 and step 2; (3) the last step must say in bold that the member registers their username in the mobile app (Create an Account).

## User Stories

### US1 - Admin-added members get a card number (P1)
**Acceptance**
1. Given the highest card number for the member's language range is N, when an admin adds a member, then the new row has `card_number = N + 1`.
2. Given no card exists in the range yet, the first number is 5000001 (German, type 5) or 7000001 (other, type 7), the same as the sync.
3. Two adds in a row never get the same number.

### US2 - OTP field is easy to use (P1)
**Acceptance**
1. When the OTP is requested (step 1 and step 2), the first OTP box is focused and scrolled into view.
2. The boxes use the GEC colors (gold border, focus ring), like the partner onboarding.
3. Pasting a code (for example "12345") into any box fills all boxes, ignores non-digits, and completes verification. Typing still works.

### US3 - Final step tells the member to create the app account (P2)
**Acceptance**: below "Your account has been verified!..." a bold line says to register the username in the mobile app ("Create an Account"). The existing "Don't forget to download the GEC Mobile App" text stays.

## Out of Scope
Backfilling card numbers of existing members; changing the sync numbering; OTP length or backend OTP logic.
