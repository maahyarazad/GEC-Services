# Data Model: WhatsApp component folders + vCard contacts

No schema changes. Data is read from the existing `twilio_responses.payload` JSON and from Twilio media.

## Received message (existing — `twilio_responses.payload`)

| Field | Example | Use |
|---|---|---|
| `MessageType` | `"contacts"` | Informational only |
| `Body` | `""` | Empty for contact shares |
| `NumMedia` | `"1"` | Only index 0 is used |
| `MediaUrl0` | `https://api.twilio.com/2010-04-01/Accounts/AC…/Messages/MM…/Media/ME…` | Fetched server-side with Twilio auth |
| `MediaContentType0` | `"text/vcard"` | Selects the bubble renderer |
| `WaId` | `"971585465202"` | History lookup key |

## History item (existing — `GET /api/whatsapp/history/:phone` → `result[]`)

`{ body, media_url, media_type, received_at, type: "r" | "s" }` — unchanged.

## ParsedContact (new — returned by `/api/whatsapp/media-vcard`)

| Field | Type | Rule |
|---|---|---|
| `name` | string | `FN`; else `N` joined as "Given Family"; else first phone; else `"Unknown contact"` |
| `org` | string \| null | First component of `ORG` |
| `phones` | `{ value: string, type: string \| null, waId: string \| null }[]` | Every `TEL`; `type` from `TYPE=` param (lower-cased, first value); `waId` from `waid=` param |
| `emails` | `{ value: string, type: string \| null }[]` | Every `EMAIL` |

A vCard file yields `ParsedContact[]` (one per `BEGIN:VCARD…END:VCARD` block). An empty array is a parse failure.

## VCardBubble UI state

`loading` → `ready(contacts)` | `error` (shows fallback with download link). Fetched once per mount; no caching beyond React state.
