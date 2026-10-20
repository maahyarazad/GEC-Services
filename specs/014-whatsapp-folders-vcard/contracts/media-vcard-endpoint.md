# Contract: `GET /api/whatsapp/media-vcard`

Admin-only (covered by `authorize.authorize_admin` on `/api/`).

## Request

| Query | Required | Notes |
|---|---|---|
| `mediaUrl` | yes | Must be `https://api.twilio.com/...` |

## Responses

**200**
```json
{
  "status": true,
  "contacts": [
    {
      "name": "Jane Doe",
      "org": "ACME",
      "phones": [{ "value": "+971 50 123 4567", "type": "cell", "waId": "971501234567" }],
      "emails": [{ "value": "jane@example.com", "type": "work" }]
    }
  ]
}
```

**400** — missing `mediaUrl`, or host/protocol not `https://api.twilio.com`
```json
{ "status": false, "message": "Invalid mediaUrl" }
```

**422** — fetched but no `BEGIN:VCARD` block could be parsed
```json
{ "status": false, "message": "Could not parse contact card" }
```

**502** — Twilio returned non-2xx, or body exceeds 64 KB
```json
{ "status": false, "message": "Failed to fetch contact card" }
```

Side effects: none (no file written, no DB write).

---

# Contract: ChatView `MediaBubble` rendering

| `media_type` | Render |
|---|---|
| `image/*` | `<img>` (unchanged) |
| `video/*` | `<video>` (unchanged) |
| `audio/*` | `<audio>` (unchanged) |
| `text/vcard`, `text/x-vcard` | `VCardBubble` — contact list; fallback "Contact card" + download link (`download-media?filename=contact.vcf`) |
| any other non-empty type | "Attachment (`<type>`)" + download link |
| empty / null | nothing (unchanged) |
