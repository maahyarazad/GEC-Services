# Implementation Plan: WhatsApp component folders + vCard contacts in ChatView

**Branch**: `014-whatsapp-folders-vcard` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/014-whatsapp-folders-vcard/spec.md`

## Summary

Two independent changes in the WhatsApp dashboard:

1. **Folders**: move the three WhatsApp components that own a stylesheet (`ChatView`, `QuickReply`, `EventDropdownSearch`) into `WhatsApp/<Component>/` together with their `.scss/.css/.css.map`, leave the rest in the root, and fix imports.
2. **vCard in ChatView**: contact shares (`MediaContentType0: text/vcard`, empty `Body`) currently render as empty bubbles. Add an admin endpoint `GET /api/whatsapp/media-vcard` that fetches the Twilio media with server credentials (Twilio host only, 64 KB cap, no disk write), parses it with a small in-repo vCard parser, and returns contacts as JSON. A new `VCardBubble` in ChatView renders name, org, phones (`tel:` + `wa.me` links) and emails, with a download fallback. Any other non-inline media type gets a generic attachment bubble.

## Technical Context

**Language/Version**: Node.js (CommonJS, Express) backend; React 18 + Vite frontend (JSX/TSX)

**Primary Dependencies**: Express, Twilio SDK, better-sqlite3, MUI; no new dependencies

**Storage**: Existing SQLite `twilio_responses` (read only); no schema change

**Testing**: No test runner; manual quickstart + `node -e` parser check + `vite build`

**Target Platform**: Linux server + admin dashboard in desktop/mobile browsers

**Project Type**: Web application (Express backend + React SPA in `public/`)

**Performance Goals**: Contact card resolves in < 1 s (one Twilio fetch, small text body)

**Constraints**: Twilio credentials never reach the browser; only `https://api.twilio.com` URLs fetched; body capped at 64 KB

**Scale/Scope**: 1 new route, 1 new service module, 1 new component, 3 component moves, 4 import edits

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no ratified principles, so no gates apply. General checks applied instead:

- No new dependencies ✅
- No schema change / migration ✅
- Security: credentials stay server-side, host allow-list on fetch, route behind existing admin auth ✅
- Behaviour-preserving refactor kept separate from the feature (Story 2 vs. Stories 1/3) ✅

**Post-design re-check**: unchanged — pass.

## Project Structure

### Documentation (this feature)

```text
specs/014-whatsapp-folders-vcard/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── media-vcard-endpoint.md
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
routes/
└── whatsapp_sender.js            # + GET /api/whatsapp/media-vcard
services/
└── vcardParser.js                # NEW — parseVCard(text) → ParsedContact[]

public/src/components/Dashboard/WhatsApp/
├── ChatView/                     # MOVED (git mv)
│   ├── ChatView.jsx              # MediaBubble: + vcard branch, + attachment fallback
│   ├── ChatView.scss / .css / .css.map   # + .vcard-* styles (edit .scss, recompile .css)
│   └── VCardBubble.jsx           # NEW
├── QuickReply/                   # MOVED
│   ├── QuickReply.jsx            # imports: ../../../Providers/Snackbar, ../ChatView/ChatView
│   └── QuickReply.scss / .css / .css.map
├── EventDropdownSearch/          # MOVED
│   ├── EventDropdownSearch.tsx   # import: ../../HoverItem
│   └── EventDropdownSearch.scss / .css / .css.map
├── WhatsApp.jsx                  # import ./QuickReply/QuickReply
├── MessageModal.jsx              # import ./EventDropdownSearch/EventDropdownSearch
└── … (all other components unchanged, stay in root)
```

**Structure Decision**: Existing Express + React layout. Sub-folders follow the `EmailLogs/EmailLogs.jsx` / `MailBox/MailBox.jsx` convention (full-path imports, no barrels). See [research.md](research.md) R5 for the full import list.

## Implementation order

1. **Folder move** (Story 2): `git mv` the 9 files, fix 4 imports, `vite build`, visual check. Commit on its own so the feature diff stays readable.
2. **Parser** (`services/vcardParser.js`): unfold, property/param split, `FN/N/ORG/TEL/EMAIL`, multi-card; verify with quickstart §2.
3. **Endpoint**: URL validation → Twilio fetch with basic auth (reuse the auth-header pattern from `download-media`) → read ≤ 64 KB → parse → JSON per [contract](contracts/media-vcard-endpoint.md).
4. **VCardBubble + MediaBubble**: fetch endpoint on mount, render card / fallback; add generic attachment branch; styles in `ChatView.scss` then recompile `ChatView.css`.
5. Quickstart §3–5.

## Risks / follow-ups

- `/api/whatsapp/download-media` sends Twilio credentials to any `mediaUrl` and writes every download to disk — apply the same host allow-list in a follow-up.
- Twilio media URLs can expire/be deleted; the fallback bubble covers it.
- `.css` is committed alongside `.scss`; whoever edits `ChatView.scss` must recompile `ChatView.css` (same workflow as today).

## Complexity Tracking

None — no constitution violations.
