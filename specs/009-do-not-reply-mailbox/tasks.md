---

description: "Task list for Do-Not-Reply Mail Box (Live IMAP Viewer via curl)"
---

# Tasks: Do-Not-Reply Mail Box (Live IMAP Viewer via curl)

**Input**: Design documents from `/specs/009-do-not-reply-mailbox/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/mailbox-api.md, quickstart.md

**Tests**: No automated test framework is configured in this project (root `package.json` `test` is a
stub; the client has only `vite` / `build` / `eslint`). Per the spec, validation is the **manual**
scenario suite in `quickstart.md` (which includes live curl recipes). No test tasks are generated.

**Organization**: Tasks are grouped by user story. All three stories are P1. The curl core, the
account/folder allow-list, the admin-guarded router, and the section shell are **Foundational** —
every story needs them.

**Hard constraint (all backend tasks)**: fetching is **curl CLI only** (no `imapflow`); credentials
go to curl on **stdin** (`curl -K -`), never in argv; inputs are allow-listed; calls are read-only
(peek) and time-bounded. See research.md R1–R8.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3 (user-story phases only)
- All paths are repo-relative to `/Users/germanworldclub/Downloads/registration-app20250717-update/`

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 [P] Create skeleton files: `services/mailboxService.js`, `services/mailboxAccounts.js`, `routes/mailbox.js`, and the client dir `public/src/components/Dashboard/MailBox/MailBox.jsx` (empty default-export React component). Confirm `curl --version | grep -i imap` shows IMAP/IMAPS on the dev host.

**Checkpoint**: Empty modules exist; the app still boots.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Stand up the curl core, the account/folder registry, the admin router, and the section shell. No story works without these.

**⚠️ CRITICAL**: Complete Phase 2 before US1/US2/US3.

- [X] T002 [P] Implement the fixed registry in `services/mailboxAccounts.js`: the two accounts (`do-not-reply` default, `support`) each `{ key, label, addressEnv, userEnv, passEnv }`; the folder allow-list `{ Inbox: "INBOX", Sent: "Sent" }`; host = `IMAP_HOST || SMTP_HOST`, port = `IMAP_PORT || 993`; and `resolve(key)` → `{ address, user, pass, host, port, available }` reading `process.env` (do-not-reply → `SMTP_SENDER`/`SMTP_PASS`, support → `SMTP_SUPPORT_SENDER`/`SMTP_SUPPORT_SENDER_PASS`). Never return `pass` to callers that serialise to the client.
- [X] T003 Implement the curl core in `services/mailboxService.js`: a private `runCurl({ url, request })` that `execFile("curl", ["-s","-K","-","--max-time","20","--connect-timeout","10", ...])` and writes the config (`user = "addr:pass"`, `url = "..."`, optional `request = "..."`) to **stdin** so no credential is in argv; bounded `maxBuffer`; map non-zero exit / stderr / timeout to a typed `MailboxError { code: 'auth'|'unreachable'|'timeout'|'parse'|'unavailable'|'unknown' }`; log raw stderr server-side only. (depends on T001; reads creds via T002's resolve)
- [X] T004 Create `routes/mailbox.js`: Express router, `router.use("/api/mailbox", authorize.authorize_admin)`, input validators (account key + folder key against the T002 allow-lists, uid positive int, page/pageSize clamp), and a `MailboxError.code → HTTP status + generic message` mapper (never leak curl stderr). Register the router in `routes.js` (require + add to `rootRouters`). (depends on T002)
- [X] T005 [P] Scaffold the client: in `public/src/components/Dashboard/MailBox/MailBox.jsx` a base layout + a fetch helper (`${import.meta.env.VITE_SERVERURL}/api/mailbox/...`, `credentials:'include'`, 401/403 handling). Wire into `public/src/components/Dashboard/Dashboard.jsx` by **appending** (indices unchanged): a `tabConfig` entry "Do-Not-Reply Mail Box" (a mailbox icon from `react-icons`) after "Email Logs", a `React.lazy` import, and the matching `case` in the content switch.

**Checkpoint**: `/api/mailbox/*` is admin-guarded; a hand-run curl (quickstart Step 0) reaches the mailbox; the empty section tab renders below the logs group.

---

## Phase 3: User Story 1 - Browse the mailbox (Priority: P1) 🎯 MVP

**Goal**: Show a paged, newest-first list of the selected account+folder's messages (date-time, counterpart, subject, size).

**Independent Test**: Open the section (default account/folder); list matches real webmail; switch Inbox⇄Sent reloads (quickstart V1).

- [X] T006 [US1] In `services/mailboxService.js` add `listFolders(accountKey)` (curl `LIST` on `imaps://HOST/`, used for availability) and `listMessages({ account, folder, page, pageSize })` (curl `UID FETCH <range> (UID FLAGS RFC822.SIZE INTERNALDATE ENVELOPE)` for the most-recent page per research.md R3), parsing ENVELOPE lines into summary rows `{ uid, date, from, to, subject, size, seen }`, newest-first, with `total`/`hasMore`.
- [X] T007 [US1] Add `GET /api/mailbox/messages` to `routes/mailbox.js` (validate account/folder/page/pageSize, call `listMessages`, return the contract shape; map errors).
- [X] T008 [US1] In `MailBox.jsx` render folder tabs (Inbox/Sent) + a paged message table (Sent date-time, counterpart address, subject, size) with loading, empty ("no messages"), and error states.

**Checkpoint**: US1 works — the real mailbox lists and pages, Inbox and Sent.

---

## Phase 4: User Story 2 - Open a single message (Priority: P1)

**Goal**: Click a message → fetch it via curl and show headers + body (text default; HTML safely).

**Independent Test**: Open a known message; sender/recipient/subject/body match webmail; its read/unread state is unchanged after (quickstart V2).

- [X] T009 [US2] In `services/mailboxService.js` add `getMessage({ account, folder, uid })`: curl fetch of the single message with **peek** semantics (does not set `\Seen`, research.md R8), parse the RFC822 bytes with `mailparser.simpleParser`, return `{ uid, from, to, cc, subject, date, text, html, attachments:[{filename,contentType,size}] }`.
- [X] T010 [US2] Add `GET /api/mailbox/message` to `routes/mailbox.js` (validate account/folder/uid, call `getMessage`, return the contract shape; map errors).
- [X] T011 [US2] In `MailBox.jsx` add the message viewer: headers + plain-text body by default; when only HTML exists (or on toggle) render it in a `<iframe sandbox srcdoc=...>` WITHOUT `allow-scripts`/`allow-same-origin` (research.md R6); list attachment filenames (no download); a Back control and inline error state.

**Checkpoint**: US1 + US2 — browse and read real messages.

---

## Phase 5: User Story 3 - Switch the active account (Priority: P1)

**Goal**: A selector switches the mailbox between do-not-reply (default) and support; the list reloads for that account.

**Independent Test**: Selector offers exactly the two accounts; picking support shows `app.support@…` mail; switch back (quickstart V3).

- [X] T012 [US3] Add `GET /api/mailbox/accounts` to `routes/mailbox.js` returning the registry (`key`, `label`, `address`, `available`, `default`) + the folder keys, from `mailboxAccounts` — **no credentials in the response**.
- [X] T013 [US3] In `MailBox.jsx` add the account selector (fetch `/accounts`; do-not-reply default ⇄ support); changing the account resets folder/page and reloads the list. The browser sends only the account key.

**Checkpoint**: All three P1 stories work — browse, read, switch account.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T014 [P] Run `quickstart.md` Step 0 (live curl recipes) and scenarios V1–V7 end-to-end; record results.
- [X] T015 [P] Verify security invariants: no credential in curl argv (`ps aux | grep curl` during a fetch) or in any browser payload (devtools); allow-list rejects bogus `account`/`folder` with 400 (V5); read-only/peek confirmed (unread state unchanged, V2.3); every curl call has `--max-time`/`--connect-timeout` and a hang surfaces as a timeout (V6).
- [X] T016 [P] Run eslint in `public/` on `MailBox.jsx` + `Dashboard.jsx`; confirm `imapflow` is NOT imported anywhere in this feature's code path; confirm existing dashboard tab indices are unchanged.
- [ ] T017 Ops follow-up (manual, not code): remove the inline `curl --user '…:PASSWORD' …` example line from `.env`, rotate the exposed do-not-reply password, and confirm `.env` is git-ignored (research.md R9 / quickstart ops checklist).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup; **blocks all stories**. Order: T002 → T003 (core needs resolve) ; T004 after T002 ; T005 independent of the backend chain (only needs T001).
- **US1 / US2 / US3 (Phases 3–5)**: depend on Foundational. All P1. US2 and US3 are API-independent of US1 (testable directly via their endpoints), but in the UI the viewer (US2) and the account selector (US3) are reached from / drive the US1 list — so for a full demo, do US1 first.
- **Polish (Phase 6)**: after the stories.

### Within shared files (sequential — same file)

- `services/mailboxService.js`: T003 → T006 → T009.
- `routes/mailbox.js`: T004 → T007 → T010 → T012.
- `public/.../MailBox/MailBox.jsx`: T005 → T008 → T011 → T013.
- `Dashboard.jsx`: T005 only.

### Parallel Opportunities

- T002 and T005 can run alongside each other (different files); T005 can proceed while the backend chain (T003/T004) is built.
- Once Foundational is done, the backend endpoint tasks (T007, T010, T012) can be built in parallel with each other **only if** split carefully — but they share `routes/mailbox.js`, so treat them sequential; their corresponding service methods (T006, T009) also share `mailboxService.js` → sequential.
- Polish tasks T014–T016 are independent of each other.

---

## Parallel Example: Foundational

```bash
# Different files — can run together:
Task: "T002 Implement account/folder registry in services/mailboxAccounts.js"
Task: "T005 Scaffold MailBox.jsx + wire Dashboard.jsx tab + fetch helper"
```

---

## Implementation Strategy

### MVP First

1. Phase 1: Setup (T001).
2. Phase 2: Foundational (T002–T005) — curl core, registry, admin router, section shell. **Validate** curl connectivity (quickstart Step 0).
3. Phase 3: US1 (T006–T008) — browse Inbox/Sent. **Validate V1.** This is the minimal demoable slice: a live mailbox list in the dashboard.
4. Phase 4: US2 (T009–T011) — open/read a message. **Validate V2.**
5. Phase 5: US3 (T012–T013) — account switch. **Validate V3.** Feature complete.

### Incremental Delivery

Setup + Foundational → curl reaches the mailbox and the shell renders → US1 (list) → US2 (read) →
US3 (switch) → Polish (security checks + lint + ops rotation).

---

## Notes

- [P] = different files, no dependency on an incomplete task.
- No automated tests are generated (no framework); Polish runs `quickstart.md` manually.
- Keep ALL curl/credential handling inside `services/mailboxService.js` — one audited surface.
- Never pass credentials in argv; never return a password to the client; never reuse `imapflow` here.
- Append the dashboard tab; do not insert mid-list (the content switch is index-based).
- Commit after each task or logical group (work stays on branch `009-do-not-reply-mailbox`).
