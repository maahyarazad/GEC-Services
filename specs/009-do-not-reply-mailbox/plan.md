# Implementation Plan: Do-Not-Reply Mail Box (Live IMAP Viewer via curl)

**Branch**: `009-do-not-reply-mailbox` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-do-not-reply-mailbox/spec.md`

> **Amended 2026-10-13**: the mailbox fetch mechanism was changed from the `curl` CLI to `ImapFlow`
> (the project's existing IMAP stack) at the user's request. `services/mailboxService.js` was
> refactored; the public service API, HTTP endpoints, and UI are unchanged. References to
> `curl`/`execFile`/stdin below are historical and superseded by this note.

## Summary

Add a **Do-Not-Reply Mail Box** section to the admin dashboard (grouped with the logs sections) that
shows the live contents of a system mailbox, fetched from the IMAPS webmail server
(`buenapublica.cmpsrv.com`) using the **`curl` CLI only**. The admin can switch the active account
between **do-not-reply** (default) and **support**, browse the **Inbox** and **Sent** folders
(headers list, newest first, paged), and open a single message to read its headers + sanitised body.

Backend: a `curl`-driven service (`services/mailboxService.js`) that shells out via
`child_process.execFile` with the credentials passed on **stdin** (`curl -K -`) so no password ever
touches the argument list, under a hard `--max-time`. A thin admin-guarded router
(`routes/mailbox.js`) exposes list/message/folders endpoints that take only an **account key**
(validated against a fixed allow-list) — credentials stay in server env vars and never reach the
browser. Parsing the RFC822 bytes curl returns uses the already-present `mailparser`.

Frontend: a new lazy-loaded `MailBox` section appended to `Dashboard.jsx` (account selector + folder
tabs + message list + message viewer).

**No persistence** (live pass-through), **no new npm dependency** (curl is a system binary;
`mailparser` already present), **no IMAP library** used for fetching.

## Technical Context

**Language/Version**: Node.js + Express (CommonJS) backend; React 18 + Vite (JSX) frontend

**Primary Dependencies**: system `curl` (IMAPS; verified 8.x with IMAP), `mailparser` (already a
dependency — parses fetched bytes only), `express`, `@mui/material` / `react-icons` on the client.
**None added.** `imapflow` is intentionally NOT used here (curl-only constraint)

**Storage**: none — the feature fetches live and stores nothing. No DB table, no migration

**Testing**: No automated framework configured; validation is the manual `quickstart.md` suite
(includes live curl commands against the server)

**Target Platform**: Node server under PM2 (host has curl); admin dashboard in desktop/mobile
browsers

**Project Type**: Web application — Express backend at repo root + React SPA in `public/`

**Performance Goals**: list a folder's recent page within a few seconds for a normal mailbox; every
curl call bounded by `--max-time` (e.g. 20s) so nothing hangs the event loop or a request

**Constraints**: curl-only fetching (FR-002); credentials server-side only and never in argv
(FR-006/FR-007) → creds via `curl -K -` on stdin; read-only + peek semantics (FR-010); account and
folder names validated against allow-lists (FR-012); raw curl stderr never returned to the browser
(FR-011)

**Scale/Scope**: 1 backend service + 1 router (3 endpoints) + 1 client section; 2 accounts, 2
folders; paged message lists

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an **unfilled template** — no
ratified principles, so no formal gates. Held against the codebase's de-facto conventions, which
this plan respects:

- **Reuse existing infrastructure** — the `authorize_admin` guard, the `tabConfig` + lazy-section
  dashboard pattern, the Section fetch pattern, the IMAP host/credential env-var convention from
  `services/imapPoller.js`, and the existing `mailparser` dependency. ✅
- **No new dependency.** ✅
- **Security-first for a live-credential, live-mailbox feature** — creds never leave the server,
  never enter argv; inputs allow-listed; read-only; errors sanitised. ✅
- **No scope creep** — no storage, no send/delete/move, no attachment download in v1. ✅

A real risk this plan must hold: shelling out to `curl`. It is mitigated by `execFile` (no shell, so
no injection), argv with no credentials, stdin-fed config, allow-listed inputs, and enforced
timeouts. Recorded in Complexity Tracking below as a justified, contained risk rather than a gate
violation.

Initial Constitution Check: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/009-do-not-reply-mailbox/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (transient entity shapes; no DB)
├── quickstart.md        # Phase 1 output (incl. live curl command recipes)
├── contracts/
│   └── mailbox-api.md    # HTTP contract for the admin endpoints
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
# Backend (Express, repo root)
services/
├── mailboxService.js        # NEW: the ONLY module that runs curl. Exports listMessages(),
│                           #   getMessage(), listFolders(). Builds a `curl -K -` config on stdin
│                           #   (url + user from env), execFile with --max-time, parses output
│                           #   (envelopes for lists; mailparser for a full message). Never logs creds.
├── mailboxAccounts.js       # NEW: fixed account allow-list {key,label,address,userEnv,passEnv}
│                           #   + folder allow-list (Inbox, Sent). Resolves a key -> credentials.
└── imapPoller.js            # existing (imapflow) — untouched; NOT used by this feature

routes/
└── mailbox.js               # NEW: GET /api/mailbox/accounts, /folders, /messages, /message
                             #   guarded by authorize.authorize_admin; takes account KEY only

routes.js                    # EDIT: require + register the new router

# Frontend (React SPA, public/)
public/src/components/Dashboard/
├── Dashboard.jsx            # EDIT: append "Do-Not-Reply Mail Box" to tabConfig (after "Email Logs")
│                           #   + lazy import + switch case (APPEND only — indices unchanged)
└── MailBox/
    └── MailBox.jsx          # NEW: account selector + folder tabs + paged message list + message
                             #   viewer (sanitised HTML), with loading/empty/error states

# Config
.env                         # (ops) ensure IMAP_HOST/IMAP_PORT present (or rely on SMTP_HOST);
                             #   credentials reuse SMTP_SENDER/SMTP_PASS and
                             #   SMTP_SUPPORT_SENDER/SMTP_SUPPORT_SENDER_PASS. No secret in repo.
```

**Structure Decision**: Web application. Backend isolates ALL curl/IMAP interaction in
`services/mailboxService.js` (one audited surface for the shell-out and credential handling); the
router is a thin, admin-guarded, allow-list-validating pass-through that never sees a password. The
frontend follows the established lazy-section pattern and is appended to `tabConfig` so existing tab
indices (including Email Logs at 13) are unchanged — the new section lands directly below the logs
group, matching "add new section under the logs".

## Complexity Tracking

| Violation / Risk | Why Needed | Mitigation / Why simpler rejected |
|------------------|------------|-----------------------------------|
| Shelling out to `curl` instead of using the in-repo `imapflow` | Explicit hard user constraint: "only and only use curl cli to fetch details" | `execFile` (no shell → no injection) + credentials via `curl -K -` on stdin (never in argv) + allow-listed account/folder inputs + `--max-time`. Using `imapflow` would be simpler but is explicitly disallowed for this feature. |
| Rendering fetched HTML email bodies | Reading real messages (US2) requires showing their HTML | Sanitise before render; conservative handling of remote content; no script execution. Plain-text-only would be simpler but loses the actual message fidelity admins need. |
