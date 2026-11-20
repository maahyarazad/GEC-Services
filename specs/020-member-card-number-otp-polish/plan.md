# Implementation Plan: Admin Card Number, OTP Input Polish, Onboarding Final Message

**Branch**: current (`main`) | **Date**: 2026-11-20 | **Spec**: [spec.md](spec.md)

## Summary
Three small changes: a shared next-card-number helper used by the admin add endpoint and the sync; paste/focus/scroll/colors in the shared `OtpInput` and its two onboarding callers; one bold line on the final onboarding step.

## Technical Context
**Language**: Node.js (CommonJS, Express, better-sqlite3); React + MUI frontend (Vite)
**Storage**: SQLite `member_card` (no schema change)
**Testing**: Node built-in runner for the helper; manual browser check for UI (see quickstart)
**Constraints**: no new dependency; sync behavior must not change.

## Constitution Check
Constitution is an unfilled template: no gates. Self-check passes (no schema change, no dependency, additive API response).

## Project Structure
```text
specs/020-member-card-number-otp-polish/{spec,plan,research,data-model,quickstart}.md, contracts/add-member.md
services/cardNumber.js                      # NEW: nextCardNumber(db, type)
routes/partner_onboarding.js                # add endpoint: transaction, card_number in INSERT, return it
routes/member_card.js                       # sync uses the helper (same result)
tests/members/cardNumber.test.js            # NEW (npm run test:members)
public/src/components/utils/OtpInput.jsx    # paste, multi-char change, focus() on ref
public/src/components/pages/MemberOnboardingComponents/MemberLogin.jsx   # useGECStyle, focus on open
public/src/components/pages/MemberOnboardingComponents/MemberUpdate.jsx  # useGECStyle, focus on open
public/src/components/pages/MemberOnboarding.jsx                         # bold app-account line
services/memberPassEmail.js                                              # US5: add the notice to the html and the plain text
tests/wallet/memberPassEmail.test.js                                     # US5: assert the sentence is present
# US4: MemberLogin.jsx also gets a ref on the result <Card> and an effect that focuses/scrolls it when `wizardState.member` is set
```
**Structure Decision**: single project; shared helper and shared component so both paths and both OTP steps behave the same.
