# Feature Specification: Member Pass Design per Partner and New Pass Layout

**Feature Branch**: `019-member-pass-layout`

**Created**: 2026-11-19

**Status**: Draft

**Input**: User description: "Check IMG_1293.png (the current corporate_card.pass). When the Partner name is 'GEC Family Membership' the model should be family_card.pass. Update both pass structures: next to the logo write 'Corporate Card - {Partner Name}', and if the Partner Name is 'GEC Family Membership' write 'GEC Family Membership'. Replace the Corporate Partner field for both types and move the Name there."

Reference screenshot (not committed, it shows a real member): `IMG_1293.png` in the repo root. It shows the pass today: logo with "CORPORATE CARD" beside it, the member name drawn very large over the icon strip, then Expiry Date, Member ID and "Corporate Partner" in a row below the strip, and the QR code.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Family members get the family design (Priority: P1)

When a member's partner is "GEC Family Membership", the Apple pass they receive uses the green family card design. Every other member keeps the red corporate design.

**Why this priority**: It is the visible point of having two designs; today everyone gets the corporate one.

**Independent Test**: Issue a pass for a member whose partner is "GEC Family Membership" and one for another partner; the first is green, the second red.

**Acceptance Scenarios**:

1. **Given** a member whose stored partner is "GEC Family Membership", **When** a pass is issued, **Then** it is built from `family_card.pass`.
2. **Given** a member with any other partner (or none), **When** a pass is issued, **Then** it is built from `corporate_card.pass`.
3. **Given** the partner is written with different capitals or extra spaces ("gec family membership "), **When** a pass is issued, **Then** it is still treated as the family partner.
4. **Given** the client sends a different partner than the one stored for the member, **When** a pass is issued, **Then** the stored partner decides the design and the text.

---

### User Story 2 - The text next to the logo names the partner (Priority: P1)

The text beside the logo reads "Corporate Card - {Partner Name}" for corporate members and "GEC Family Membership" for family members.

**Why this priority**: It replaces the partner field and tells the holder and a checker which card they have.

**Independent Test**: Issue passes for partner "ACME" and for "GEC Family Membership" and read the text beside the logo.

**Acceptance Scenarios**:

1. **Given** partner "ACME", **When** a pass is issued, **Then** the text beside the logo is "Corporate Card - ACME".
2. **Given** partner "GEC Family Membership", **Then** the text is exactly "GEC Family Membership" (no "Corporate Card" prefix).
3. **Given** a member without a partner, **Then** the text is "Corporate Card" with no dangling dash.
4. **Given** the pass is opened from the "Add to Wallet" sheet, **Then** its heading shows the same text.

---

### User Story 3 - The name takes the place of "Corporate Partner" (Priority: P2)

On both designs, the "Corporate Partner" field at the right of the row below the strip is replaced by the member's name (label "Name"), and the large name over the icon strip is removed, so the icons are fully visible.

**Why this priority**: Removes the overlap between the name and the icons seen in the screenshot, and makes room for the partner text beside the logo.

**Independent Test**: Issue a pass of each design and check the strip is clear and the row below shows Expiry Date, Member ID and Name.

**Acceptance Scenarios**:

1. **Given** any member pass, **When** it is displayed, **Then** no text is drawn over the icon strip.
2. **Given** any member pass, **Then** the row below the strip shows Expiry Date, Member ID (left) and Name (right) and no "Corporate Partner" field.
3. **Given** a long name, **Then** it is still shown in full or cut by Wallet, never overlapping other fields.

---

### User Story 4 - The "pass issued" email shows the right card (Priority: P2)

The email sent when a member's pass is issued has two versions. Family members (partner "GEC Family Membership") get the green family card design and wording; all other members get the red corporate card design and wording. The card shown in the email matches the Wallet pass: logo with the card text beside it, the icon strip, and one row with Expiry Date, Member ID and Name.

**Why this priority**: The email is the first thing the member sees; it should show the same card they will add to their wallet.

**Independent Test**: Send the email for a corporate partner and for "GEC Family Membership" and compare the card in each with the corresponding pass.

**Acceptance Scenarios**:

1. **Given** a member with partner "ACME", **When** the pass email is sent, **Then** the card is red (corporate design), the text beside the logo is "Corporate Card - ACME", and the subject is "Your Corporate Card Has Been Issued".
2. **Given** a member with partner "GEC Family Membership", **Then** the card is green (family design), the text is "GEC Family Membership", and the subject is "Your GEC Family Membership Card Has Been Issued".
3. **Given** any member, **Then** the card row shows Expiry Date, Member ID and Name, and no "Corporate Partner".
4. **Given** the Apple Wallet and Google Wallet buttons, **Then** they link to the member's passes as before.
5. **Given** the card strip image cannot be found, **Then** the email is still sent, with the card shown without the icon strip.

---

### Edge Cases

- Partner is empty, missing or only spaces: corporate design, text "Corporate Card".
- Partner name is very long: shown as stored; Wallet shortens it if it does not fit.
- The chosen pass model folder does not exist on the server: issuing fails with an error naming the missing model and is logged. It never falls back to the other design silently.
- Members whose passes were already issued keep them; only newly issued passes use the new rules.
- Email: partner, name or other values containing HTML characters are shown as text, never as markup.
- Email: partner empty or missing gives "Corporate Card" with no dangling dash, and the corporate design.
- Email: it is also sent when the pass is not re-issued (existing serial number); it still uses the stored partner and expiry.
- The stored passes' folder and download links stay the same for both designs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST choose `family_card.pass` when the member's stored partner equals "GEC Family Membership" (ignoring capitals and surrounding spaces), and `corporate_card.pass` otherwise.
- **FR-002**: The partner used for the choice and for the text MUST come from the member record in the database, not from the request.
- **FR-003**: The text beside the logo MUST be "Corporate Card - {Partner Name}" for corporate members, "GEC Family Membership" for family members, and "Corporate Card" when there is no partner.
- **FR-004**: The pass heading shown when adding the pass MUST use the same text as FR-003.
- **FR-005**: The "Corporate Partner" field MUST be removed from both designs and the member's name MUST be shown in its place (right side, label "Name").
- **FR-006**: The large name over the icon strip MUST be removed from both designs.
- **FR-007**: Expiry Date and Member ID MUST stay as they are; the QR code and its link MUST not change.
- **FR-008**: Passes MUST still be stored and linked under the existing "corporate-card" folder for both designs.
- **FR-009**: A missing model folder MUST produce a clear logged error, not a pass of the other design.
- **FR-010**: The "pass issued" email MUST come in two versions chosen by the same partner rule as FR-001: family (green, `family_card` design colors and wording) and corporate (red, `corporate_card` design colors and wording).
- **FR-011**: The email card MUST show the logo, the text from FR-003 beside it, the design's icon strip, and a row with Expiry Date, Member ID and Name; it MUST NOT show "Corporate Partner".
- **FR-012**: The email subject and plain-text body MUST name the card type: "Corporate Card" or "GEC Family Membership".
- **FR-013**: Member values in the email MUST be HTML-escaped; the partner and expiry shown MUST come from the member record (database), not the request.
- **FR-014**: If the strip image is unavailable, the email MUST still be sent without it and the problem MUST be logged.
- **FR-015**: The Apple Wallet and Google Wallet buttons, the app links and the footer MUST stay as they are.

### Key Entities

- **Member**: name, member ID, card expiry, serial number and **partner** (the value that decides the design and the text).
- **Pass design**: corporate (red) or family (green), each with its own model folder.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of passes for partner "GEC Family Membership" use the family design, and 0% of other passes do.
- **SC-002**: The text beside the logo matches FR-003 for 100% of tested partner values (named partner, family, empty).
- **SC-003**: On an iPhone, no text overlaps the icon strip on either design.
- **SC-004**: Both designs show Expiry Date, Member ID and Name in one row, and no "Corporate Partner".
- **SC-005**: In a mail client (Gmail and Apple Mail), the email card of each type visually matches its Wallet pass (colors, logo text, icon strip, fields).
- **SC-006**: 100% of tested emails (named partner, family, empty partner) have the right subject, card color and text.

## Assumptions

- This covers the Apple Wallet member pass only. The Google Wallet member pass is not changed here (it can follow with the same rules).
- Existing passes are not re-issued automatically; new passes follow the new rules.
- The family partner is recognised by the exact name "GEC Family Membership" (case-insensitive, trimmed), as written in the screenshot and the database.
- Both generated models (`models/corporate_card.pass`, `models/family_card.pass`) exist on the server; they are built by `npm run wallet:apple` and are not stored in git.
- The pass heading ("description") follows the logo text so the Add sheet is consistent.
- "emailMembershipCard" in the request means the email sent when a member's pass is issued, which is `membership_pass_email` in `services/emailService.js` (called by `/member-pass`). The older `emailMembershipCard` function is not called anywhere (only a commented-out line in `routes/apple_member_card.js`) and is left unchanged.
- The email card is built from the same data as the pass: the design colors come from `corporate_card.html` / `family_card.html`, and the icon strip image is the one already generated in the model folder (attached inline, so no image hosting is needed).
- The expiry in the email uses the same DD-MM-YYYY format as the pass.
- The invitation email (`membership__invitation`, sent to employees before they have a pass) is not changed.
