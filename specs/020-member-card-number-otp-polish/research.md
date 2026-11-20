# Research

## R1 - Card number on admin add
- Decision: reuse the sync rule from `routes/member_card.js` (~l.575-690): `MAX(card_number)` among numbers starting with the language prefix ('5' for type 5, '7' otherwise), default base 5000000/7000000, plus 1. Put it in a small shared helper (`services/cardNumber.js`) used by both the sync and `POST /api/partner-onboarding/employee` (`routes/partner_onboarding.js` ~l.392).
- Rationale: one rule for both paths; the add endpoint currently omits `card_number`, so those members have none.
- Race safety: better-sqlite3 is synchronous, so compute + insert inside one `db.transaction` is atomic in this single process.
- Open point: the endpoint's `type` field (5 or 7) selects the range (the form already has "German / Corporate (5)").
- Alternatives: DB trigger or autoincrement column (schema change, rejected); computing on the client (racy, rejected).

## R2 - OTP behavior
- Both steps use the shared `public/src/components/utils/OtpInput.jsx` via `MemberOnboardingComponents/MemberLogin.jsx` (step 1) and `MemberUpdate.jsx` (step 2). One fix in the shared component covers both.
- Coloring: `OtpInput` already has `useGECStyle` (gold border, focus ring); the two callers do not pass it. Pass `useGECStyle`.
- Paste: add `onPaste` on each box: read `clipboardData`, keep digits, fill from index 0 up to `length`, focus the last filled box, call `onChange`; the existing completion effect fires `onComplete`. Also make `handleChange` accept multi-char values (autofill / SMS suggestion) the same way.
- Focus + scroll: expose `focus()` on the ref (`inputsRef[0].focus({preventScroll:true})` then `scrollIntoView({block:'center', behavior:'smooth'})`). Callers call it when the OTP block opens (after `showOtpInput` becomes true; the `.otp-slide` animates max-height, so delay one frame / after transition, ~300 ms). Callers already have an `otpFocus` span ref used for scrolling; reuse it only if it works, else the component's own scrollIntoView.

## R3 - Final message
Plain JSX edit in `MemberOnboarding.jsx` (~l.203): add a bold `<strong>` line with `GEC.goldDark`.
