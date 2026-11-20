# Quickstart (validation)

1. Card number: in the admin "GEC Corporate and Family Members" page add two members (type 5, then type 7). Check `SELECT id, type, card_number FROM member_card ORDER BY id DESC LIMIT 2;` shows max+1 of each range. Add another of type 5: it is +1 again. Unit test: `npm test` for `services/cardNumber.js` (empty range, existing max, prefix filter).
2. OTP step 1: open the onboarding page, enter email, request OTP; the first box is focused, visible on screen, gold styled. Copy "12345", click a box, paste: all boxes fill and verification starts.
3. OTP step 2: same checks on the second step (phone/update OTP).
4. Final step: complete the flow; the bold "register your username in the mobile app (Create an Account)" line shows under the verified message.
5. Regression: typing digits and Backspace still work; the sync (`/api/member-card-sync`) still numbers new members.

6. Search result: in step 1 search a known email; the member card scrolls to the center and takes focus. Search an unknown email: no scroll, "Email not found" message shows.
