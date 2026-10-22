# Tasks: WhatsApp component folders + vCard contacts in ChatView

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: No test runner in the repo; validation is the quickstart checks listed per phase.

## Phase 1: User Story 2 — Folder reorganisation (P2, done first so later edits land in the final paths)

- [X] T001 [US2] `git mv` ChatView.jsx/.scss/.css/.css.map into `public/src/components/Dashboard/WhatsApp/ChatView/`
- [X] T002 [P] [US2] `git mv` QuickReply.jsx/.scss/.css/.css.map into `public/src/components/Dashboard/WhatsApp/QuickReply/`
- [X] T003 [P] [US2] `git mv` EventDropdownSearch.tsx/.scss/.css/.css.map into `public/src/components/Dashboard/WhatsApp/EventDropdownSearch/`
- [X] T004 [US2] Update imports in `QuickReply/QuickReply.jsx` (`../../../Providers/Snackbar`, `../ChatView/ChatView`)
- [X] T005 [P] [US2] Update import in `EventDropdownSearch/EventDropdownSearch.tsx` (`../../HoverItem`)
- [X] T006 [P] [US2] Update import in `WhatsApp.jsx` (`./QuickReply/QuickReply`)
- [X] T007 [P] [US2] Update import in `MessageModal.jsx` (`./EventDropdownSearch/EventDropdownSearch`)
- [X] T008 [US2] Verify `vite build` resolves all imports (quickstart §1)

## Phase 2: Foundational — vCard parsing + endpoint (blocks US1)

- [X] T009 [US1] Create `services/vcardParser.js` exporting `parseVCard(text) → ParsedContact[]` per data-model.md
- [X] T010 [US1] Verify parser with quickstart §2
- [X] T011 [US1] Add `GET /api/whatsapp/media-vcard` to `routes/whatsapp_sender.js` per contracts/media-vcard-endpoint.md (Twilio host allow-list, 64 KB cap, no disk write)

## Phase 3: User Story 1 — Contact card in ChatView (P1)

- [X] T012 [US1] Create `ChatView/VCardBubble.jsx` (fetch endpoint on mount; loading / contacts / fallback with download link)
- [X] T013 [US1] Add `text/vcard` / `text/x-vcard` branch in `MediaBubble` (`ChatView/ChatView.jsx`)
- [X] T014 [US1] Add `.vcard-*` styles to `ChatView/ChatView.scss` and recompile `ChatView.css`

## Phase 4: User Story 3 — Generic attachment bubble (P3)

- [X] T015 [US3] Add attachment fallback in `MediaBubble` for any other non-empty media type (download link)

## Phase 5: Polish

- [ ] T016 Final `vite build` ✅ + endpoint 400s ✅ + real sample vCard → 200 ✅ (no file written); REMAINING: in-browser visual check of ChatView contact card, attachment bubble, and the 3 moved components (quickstart §1 manual, §4, §5)

## Dependencies

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5. T013/T015 both edit `ChatView.jsx` → sequential.
