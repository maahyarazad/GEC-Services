# Data Model

No schema change. `member_card.card_number` (existing) is now filled on admin add.

| Field | Rule |
|---|---|
| card_number | `max(card_number LIKE '<prefix>%') + 1`, prefix 5 (type 5) or 7 (type 7); empty range starts at 5000001 / 7000001 |
| type | 5 or 7 as sent by the form (already validated) |

OTP component state: `otp: string[length]` unchanged; new behaviors only (paste fill, `focus()`).
