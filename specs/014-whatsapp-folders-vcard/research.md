# Research: WhatsApp component folders + vCard contacts in ChatView

## R1 — Why the contact bubble is blank today

- **Finding**: `fetchHistory()` (`services/whatsAppSender.js`) already returns `media_url` (`$.MediaUrl0`) and `media_type` (`$.MediaContentType0`) for received rows. `ChatView`'s `MediaBubble` only handles `image/*`, `video/*`, `audio/*` and returns `null` otherwise; `Body` is `""` for contact shares, so the bubble only shows the timestamp.
- **Decision**: Add a `text/vcard` / `text/x-vcard` branch to `MediaBubble` that renders a new `VCardBubble`, plus a generic attachment fallback for every other non-empty `media_type`.
- **Alternatives**: Using `MessageType === "contacts"` — rejected because the history query doesn't select it and `media_type` is already enough.

## R2 — Where to fetch and parse the vCard

- **Decision**: New endpoint `GET /api/whatsapp/media-vcard?mediaUrl=…` in `routes/whatsapp_sender.js`. It fetches with Twilio basic auth, reads the body as text in memory (cap 64 KB), parses it and returns JSON contacts.
- **Rationale**: Twilio media needs account credentials, which must stay server-side. The existing `/api/whatsapp/download-media` writes every request to `twilio_media/` on disk and responds with a file download (`res.download`), which is wasteful for a bubble that renders on every chat open. All `/api/` routes already pass `authorize.authorize_admin` (`server.js:96`).
- **Alternatives**: Client fetches `download-media` and parses in the browser — rejected (disk write per view, `.ogg` default filename, no host check). Parsing at webhook time and storing contacts in the DB — rejected (needs a migration path, and existing rows would still need on-demand parsing).

## R3 — SSRF guard on the media URL

- **Finding**: `download-media` forwards Twilio credentials to whatever `mediaUrl` is passed in.
- **Decision**: The new endpoint parses `mediaUrl` with `new URL()` and requires `protocol === "https:"` and `hostname === "api.twilio.com"`; otherwise 400. Hardening `download-media` is noted as a follow-up and is out of scope here.

## R4 — vCard parsing library vs. small parser

- **Finding**: No vCard library in `package.json`. WhatsApp sends vCard 3.0, e.g.
  `BEGIN:VCARD / VERSION:3.0 / N:;Name;;; / FN:Name / TEL;type=CELL;waid=9715…:+971 5… / END:VCARD`.
- **Decision**: A ~60-line parser in `services/vcardParser.js`: unfold continuation lines (CRLF/LF + space/tab), split on the first unescaped `:`, strip `itemN.` group prefixes, read `TYPE`/`type` params, unescape `\,` `\;` `\n`, support multiple `BEGIN:VCARD…END:VCARD` blocks. Handles `FN`, `N`, `ORG`, `TEL`, `EMAIL`.
- **Rationale**: Tiny scope, no new dependency, easy to check with `node -e`.
- **Alternatives**: `vcf` / `vcard4` npm packages — rejected as extra dependency for five properties.

## R5 — Folder reorganisation

- **Finding**: Only three WhatsApp components own a stylesheet: `ChatView` (`.scss/.css/.css.map`), `QuickReply` (same), `EventDropdownSearch` (same, `.tsx`). `ActiveEventCard.jsx` imports `../../Dashboard/HealthCheck/HealthCheck.css` (shared, not its own) and `WhatsApp.jsx` / `WhatsAppComponentConfig.jsx` import `react-json-pretty` theme CSS — these stay in the root.
- **Decision**: `WhatsApp/ChatView/`, `WhatsApp/QuickReply/`, `WhatsApp/EventDropdownSearch/`, each with component + `.scss` + `.css` + `.css.map`. Import by full path (`./QuickReply/QuickReply`), matching `EmailLogs/EmailLogs.jsx`, `MailBox/MailBox.jsx` — no `index.js` barrels. Use `git mv` to keep history. `.css.map` `sources` are relative filenames, so they keep working when moved together.
- **Import updates**:
  - `WhatsApp.jsx`: `./QuickReply` → `./QuickReply/QuickReply`
  - `MessageModal.jsx`: `./EventDropdownSearch` → `./EventDropdownSearch/EventDropdownSearch`
  - `QuickReply.jsx`: `../../Providers/Snackbar` → `../../../Providers/Snackbar`; `./ChatView` → `../ChatView/ChatView`
  - `EventDropdownSearch.tsx`: `../HoverItem` → `../../HoverItem`
  - `ChatView.jsx` / `QuickReply.jsx` own `./X.css` imports are unchanged.
- **New file placement**: `VCardBubble.jsx` lives in `WhatsApp/ChatView/` (it is part of ChatView and its styles go in `ChatView.scss`).

## R6 — Testing approach

- **Finding**: No test runner (`"test"` script is the npm placeholder).
- **Decision**: Manual validation via `quickstart.md`, a `node -e` check of `services/vcardParser.js` against the sample vCard, and `vite build` for the reorganisation.
