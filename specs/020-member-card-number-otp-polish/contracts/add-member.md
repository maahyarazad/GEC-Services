# Contract: POST /api/partner-onboarding/employee

Request: unchanged (title, firstname, lastname, gender, mobile_number, email, partner, birthday, type, card_expiry_date).
Behavior change: the inserted row also has `card_number` (next in the range of `type`).
Response 201: `{ status: true, message: "Member added", id, card_number }` (`card_number` is new, additive).
Errors: unchanged (400 validation, 500).

# Contract: OtpInput ref
`clear()`, `blurAll()` (existing); `focus()` (new: focus first box and scroll into view).
Paste on any box: digits only, fills from the first box, triggers `onChange` and `onComplete` when full.
