# Feature Specification: WhatsApp component folders + vCard contacts in ChatView

**Feature Branch**: `014-whatsapp-folders-vcard`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "organize the WhatsApp components in their sub folders and keep the one that does not have css in the root WhatsApp folder - add feature so in the Response Log can view the [Twilio inbound payload with `MessageType: contacts`, `MediaContentType0: text/vcard`, empty `Body`, `MediaUrl0` pointing at Twilio media] in ChatView"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a shared contact card in the chat history (Priority: P1)

An admin opens the Response Log, clicks the instant-reply action on a guest's message and the
chat history (ChatView) opens. When the guest has shared a WhatsApp contact (Twilio
`MessageType: "contacts"`, `MediaContentType0: "text/vcard"`, empty `Body`), the bubble today is
blank. After this feature the bubble shows the contact: name, organisation (if any), phone
number(s) and email(s).

**Why this priority**: Guests share contacts to refer friends or hand over a colleague's details;
right now the admin can't see them at all.

**Independent Test**: Seed a `twilio_responses` row with the sample payload (or receive a real
contact share), open the instant-reply modal for that WaId, and confirm the contact card appears
with the correct name and phone.

**Acceptance Scenarios**:

1. **Given** a received message with `MediaContentType0 = text/vcard`, **When** the admin opens the chat history, **Then** the bubble shows the contact's display name and every phone number in the vCard.
2. **Given** a vCard holding several contacts, **When** it renders, **Then** each contact is listed in the same bubble.
3. **Given** the vCard can't be fetched or parsed (Twilio media expired, network error), **When** it renders, **Then** the bubble shows "Contact card" with a download link instead of being blank, and the rest of the chat still renders.
4. **Given** a phone number in the card, **When** the admin clicks it, **Then** it opens as a `tel:` link; a WhatsApp link (`https://wa.me/<digits>`) is also offered.

---

### User Story 2 - WhatsApp component folder layout (Priority: P2)

A developer working in `public/src/components/Dashboard/WhatsApp/` finds every component that
owns a stylesheet in its own sub-folder (component + `.scss` + compiled `.css` + `.css.map`), and
every component without its own stylesheet stays in the WhatsApp root.

**Why this priority**: Pure housekeeping; no user-visible change, but it keeps style files next to
their component as the folder grows.

**Independent Test**: The app builds (`vite build`) and the WhatsApp dashboard, Message modal
(event dropdown) and instant-reply modal look and behave as before.

**Acceptance Scenarios**:

1. **Given** the reorganised folders, **When** the frontend builds, **Then** there are no unresolved imports.
2. **Given** the WhatsApp dashboard, **When** an admin opens the instant-reply modal and the Message modal, **Then** chat bubbles, quick-reply layout and the event dropdown are styled exactly as before.

---

### User Story 3 - No more blank bubbles for other media (Priority: P3)

Any received media type ChatView can't render inline (PDF, document, sticker, location-less
attachments) shows a generic "Attachment (<type>)" bubble with a download link instead of a
blank bubble.

**Why this priority**: Same root cause as Story 1, cheap to cover in the same change.

**Independent Test**: Seed a row with `MediaContentType0 = application/pdf` and confirm the
attachment bubble with a working download link.

### Edge Cases

- vCard with no `FN` → fall back to the `N` property, then the first phone number, then "Unknown contact".
- vCard line folding (continuation lines starting with a space/tab) and `TEL;TYPE=CELL;waid=...:+971...` parameters must parse correctly.
- `NumMedia > 1` → only `MediaUrl0` is surfaced by the history query today; additional media are out of scope.
- Twilio media URLs require account credentials; the browser must never get them and the server must only fetch Twilio-hosted URLs.
- Large/garbage file at the media URL → server caps the read size and returns an error the bubble handles.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: ChatView MUST render a contact-card bubble for received messages whose media type is `text/vcard` or `text/x-vcard`.
- **FR-002**: The contact card MUST show, per contact: display name, organisation (if present), all phone numbers (with type label if present) and all email addresses.
- **FR-003**: Phone numbers MUST be clickable (`tel:`) and offer a WhatsApp link.
- **FR-004**: The server MUST provide an admin-only endpoint that fetches a Twilio vCard media URL with the account credentials and returns the parsed contacts as JSON, without writing the file to disk.
- **FR-005**: That endpoint MUST reject any `mediaUrl` whose host is not `api.twilio.com` and MUST cap the response body it reads.
- **FR-006**: When fetch or parse fails, the bubble MUST show a "Contact card" fallback with a download link (existing `/api/whatsapp/download-media` with a `.vcf` filename).
- **FR-007**: Received media of any type ChatView can't render inline MUST show an "Attachment" bubble with a download link (Story 3).
- **FR-008**: Components with their own stylesheet (`ChatView`, `QuickReply`, `EventDropdownSearch`) MUST move into `WhatsApp/<Component>/` with their `.scss`, `.css` and `.css.map`; all other WhatsApp components stay in the root. All imports MUST be updated.
- **FR-009**: The reorganisation MUST NOT change behaviour or styling.

### Key Entities

- **Received WhatsApp message** (`twilio_responses.payload`): Twilio webhook body; relevant fields `MessageType`, `Body`, `NumMedia`, `MediaUrl0`, `MediaContentType0`, `WaId`.
- **Parsed contact**: name, organisation, phones[{ value, type }], emails[{ value, type }].

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The sample payload from the request renders as a readable contact card in ChatView, not an empty bubble.
- **SC-002**: Zero blank bubbles for received messages that carry media.
- **SC-003**: `vite build` succeeds with no new warnings after the folder move; the three moved components are visually unchanged.
- **SC-004**: The vCard endpoint returns 400 for a non-Twilio `mediaUrl`.

## Assumptions

- Only `MediaUrl0` / `MediaContentType0` are used (matches the current history query).
- vCards from WhatsApp are vCard 3.0, UTF-8, small (< 64 KB).
- The Response Log "instant reply" modal (`QuickReply` → `ChatView`) is the entry point; the "log"/"history" JSON views are unchanged.
- No test framework exists in the repo; validation is manual plus a small Node check of the parser.
