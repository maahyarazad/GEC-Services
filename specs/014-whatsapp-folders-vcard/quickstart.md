# Quickstart: validate feature 014

## Prerequisites

- Server running with `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` set; logged in as admin.
- A received WhatsApp contact share in `twilio_responses` (send a contact to the business number, or use an existing row such as the sample payload from the spec, `MessageSid MM928fd6…`).

## 1. Folder reorganisation (Story 2)

```bash
ls public/src/components/Dashboard/WhatsApp/{ChatView,QuickReply,EventDropdownSearch}
cd public && npx vite build
```

Expected: each folder holds the component + `.scss` + `.css` + `.css.map`; build succeeds with no unresolved imports. No other WhatsApp file has its own stylesheet left in the root.

Manual: open the WhatsApp dashboard → Message modal (event dropdown styled as before) → Response Log instant-reply (chat bubbles and layout as before).

## 2. vCard parser

```bash
node -e '
const { parseVCard } = require("./services/vcardParser");
console.log(JSON.stringify(parseVCard(
  "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Doe;Jane;;;\r\nFN:Jane Doe\r\nORG:ACME;\r\n" +
  "TEL;type=CELL;waid=971501234567:+971 50 123\r\n  4567\r\nEMAIL;type=WORK:jane@example.com\r\nEND:VCARD\r\n"
), null, 2));'
```

Expected: one contact, name `Jane Doe`, org `ACME`, phone `+971 50 123 4567` (folded line joined) with type `cell` and waId `971501234567`, one email.

## 3. Endpoint contract

- `GET /api/whatsapp/media-vcard?mediaUrl=https://example.com/x` → **400**.
- `GET /api/whatsapp/media-vcard?mediaUrl=<MediaUrl0 of the sample row>` → **200** with `contacts[]` ([contract](contracts/media-vcard-endpoint.md)).
- No new file appears in `twilio_media/`.

## 4. ChatView (Story 1)

Response Log → instant-reply on the contact-share row's guest → the chat shows a contact card with name and phone(s); the phone is a `tel:` link and has a WhatsApp link.

Break the URL (e.g. edit the row's `MediaUrl0` in a dev DB) → bubble shows "Contact card" with a download link; the rest of the chat renders.

## 5. Other attachments (Story 3)

A received row with `MediaContentType0 = application/pdf` shows "Attachment (application/pdf)" with a working download link.
