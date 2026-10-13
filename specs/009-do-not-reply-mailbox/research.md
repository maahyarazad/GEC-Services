# Phase 0 Research: Do-Not-Reply Mail Box (curl IMAPS viewer)

Decisions resolving the Technical Context unknowns. Each: Decision / Rationale / Alternatives.
All credential references are env-var names only — no secret appears here.

## R1. How to fetch mailbox data with curl only (the command recipes)

**Decision**: One server-side module (`services/mailboxService.js`) shells out to `curl` via
`child_process.execFile("curl", argv, { timeout, maxBuffer })`. The IMAPS URL and username go in
argv; the **password and `--user` pair go in a config read from stdin** via `curl -K -`, so the
credential never appears in argv. Three operations:

- **List folders** (allow-listed subset shown): `curl -K -` with
  `url = "imaps://HOST/"` → IMAP `LIST` response lines. (We only *expose* Inbox + Sent, validated
  against the allow-list — the raw list is used to detect availability.)
- **List a page of messages** (headers/envelopes, newest first): select the folder and issue a
  custom `UID FETCH` for a bounded UID range requesting ENVELOPE + size + flags + internaldate, e.g.
  `url = "imaps://HOST/Sent"` with `request = "UID FETCH <lo>:<hi> (UID FLAGS RFC822.SIZE INTERNALDATE ENVELOPE)"`.
  The `<lo>:<hi>` range is derived from the folder's UIDNEXT / message count to get the most recent
  page (see R3).
- **Fetch one message** (on open): `url = "imaps://HOST/Sent;UID=<uid>"` (optionally
  `;SECTION=` / using `BODY.PEEK` semantics, see R8) → raw RFC822, handed to `mailparser`.

**Rationale**: `curl` natively speaks IMAPS and supports both URL-style fetches
(`imaps://host/FOLDER;UID=n`) and arbitrary IMAP commands via `--request`. `execFile` (not `exec`)
runs curl directly with an argv array — **no shell**, so shell injection is structurally impossible.
`curl -K <file>`/`-K -` reads options from a config file/stdin; feeding `user = "addr:pass"` on
stdin keeps the password out of argv and therefore out of `ps`, shell history, and any command log
(FR-007).

**Alternatives considered**:
- *`--user addr:pass` in argv* — rejected: the password would be visible in the process list.
- *`--netrc-file <temp>`* — viable, but a temp file on disk is more to manage/clean than stdin; `-K -`
  keeps the secret in memory only.
- *`imapflow` (already in repo)* — **explicitly disallowed** by the user ("only and only use curl").

## R2. Keeping it safe: timeouts, no shell, sanitised errors

**Decision**: Every curl call sets `--max-time` (e.g. 20s) and `--connect-timeout` (e.g. 10s), and
`execFile` sets a matching `timeout` + bounded `maxBuffer`. On non-zero exit / timeout the service
throws a typed error (`MailboxError` with a safe `code`: `auth` | `unreachable` | `timeout` |
`parse` | `unknown`); the router maps it to an HTTP status + a generic message. Raw curl stderr is
logged server-side only, never returned to the client (FR-011).

**Rationale**: A hung IMAP connection must not block Node or a request (FR-007/SC-005). Sanitised
errors avoid leaking server/host/credential detail to the browser.

**Alternatives considered**: no timeout (rejected — hang risk); returning curl stderr verbatim
(rejected — leaks internal detail).

## R3. Paging a potentially large mailbox

**Decision**: Never fetch the whole mailbox. Determine the folder's message count / UIDNEXT, then
fetch the most recent `pageSize` (default 50) messages for page 1, the next-older block for page 2,
etc., by computing a UID/sequence range from the top. Return `hasMore` so the client can page.

**Rationale**: "Fetch all the data" in practice means "browse the mailbox", and a mailbox can hold
thousands of messages; one unbounded FETCH would be slow and large (FR-008). Newest-first matches
how an admin reads mail.

**Alternatives considered**: `UID FETCH 1:*` everything (rejected — unbounded); server-side full
cache (rejected — v1 is live/no-storage).

## R4. Parsing what curl returns

**Decision**: For **message lists**, parse curl's ENVELOPE/FETCH response lines into summary rows
(uid, date, from, to, subject, size, seen) with a small dedicated parser in `mailboxService.js`.
For a **single opened message**, pass the raw RFC822 bytes to the already-present `mailparser`
(`simpleParser`) to get `from`, `to`, `subject`, `date`, `text`, `html`, and attachment metadata.

**Rationale**: `mailparser` is already a dependency (used by `imapPoller.js`) and robustly handles
MIME/encodings for full messages — reusing it for *parsing* does not violate the curl-only *fetch*
constraint. ENVELOPE responses are simple and structured enough to parse directly for the list,
avoiding a full-message fetch per row.

**Alternatives considered**: hand-rolling a MIME parser (rejected — `mailparser` exists and is
battle-tested); fetching each message fully just to list it (rejected — far too slow).

## R5. Accounts & folders: fixed allow-lists mapped to env vars

**Decision**: A fixed registry in `services/mailboxAccounts.js`:

| key | label | address (env) | credential env vars |
|-----|-------|---------------|---------------------|
| `do-not-reply` (default) | Do-Not-Reply | `SMTP_SENDER` | `SMTP_SENDER` + `SMTP_PASS` |
| `support` | Support | `SMTP_SUPPORT_SENDER` | `SMTP_SUPPORT_SENDER` + `SMTP_SUPPORT_SENDER_PASS` |

Host = `IMAP_HOST || SMTP_HOST` (default `buenapublica.cmpsrv.com`), port = `IMAP_PORT || 993`,
matching `services/imapPoller.js`. Folder allow-list = `{ Inbox: "INBOX", Sent: "Sent" }`. The HTTP
layer accepts only an account **key** and a folder **key**, both validated against these maps before
any curl call (FR-012). An account whose env vars are missing is reported as "unavailable".

**Rationale**: The browser must never choose a mailbox by address or send credentials (FR-006); a
key + server-side map is the safe indirection. Reusing the poller's env convention avoids new
config. Allow-listing folder names prevents a crafted folder path reaching curl.

**Alternatives considered**: free-form account/folder from the client (rejected — injection /
credential-exposure risk); a third "custom" account (rejected — only the two system mailboxes were
requested).

## R6. Rendering message bodies safely without a new dependency

**Decision**: Default the viewer to the **plain-text** body (`mailparser.text`) — always safe. When
only an HTML body exists (or the admin toggles to it), render it inside a **sandboxed iframe**:
`<iframe sandbox srcdoc={html}>` with the `sandbox` attribute left WITHOUT `allow-scripts` and
WITHOUT `allow-same-origin`. This neutralises scripts and cross-origin access with **no sanitiser
dependency**.

**Rationale**: No sanitiser (`dompurify`/`sanitize-html`) exists in the repo and the plan adds no
dependency. A scriptless, origin-less sandboxed iframe is the standard dependency-free way to
display untrusted HTML email safely (FR-004). Text-first keeps the common case trivial and safe.

**Alternatives considered**: `dangerouslySetInnerHTML` raw (rejected — XSS); adding `dompurify`
(rejected — avoidable new dependency); stripping to text only (rejected — loses HTML-only messages'
fidelity).

## R7. Dashboard placement ("under the logs")

**Decision**: Append a new `tabConfig` entry "Do-Not-Reply Mail Box" (a mailbox icon) immediately
after "Email Logs" in `public/src/components/Dashboard/Dashboard.jsx`, add a `React.lazy` import and
the matching index-based `case`. Append-only — existing indices unchanged.

**Rationale**: The dashboard's content switch is positional; the logs-related sections (Server Logs,
Email Logs) sit toward the end, so appending places the new section directly "under the logs" as
asked, with zero renumbering risk. Mirrors exactly how feature 008 added its tab.

**Alternatives considered**: inserting right after "Server Logs" mid-list (rejected — renumbers the
positional switch).

## R8. Read-only / do not mark messages read

**Decision**: Fetch message bodies with **peek** semantics (`BODY.PEEK[...]` / curl fetch that does
not set `\Seen`) so opening a message in the viewer does not flip it to "read" on the server. The
feature issues no `STORE`, `EXPUNGE`, `MOVE`, `APPEND`, or delete.

**Rationale**: FR-010 — the viewer observes, it must not mutate the real mailbox (an admin peeking
should not disturb unread counts that the support workflow may rely on).

**Alternatives considered**: plain `FETCH BODY[]` (rejected — marks \Seen).

## R9. Security follow-up (ops, not code)

**Decision / recommendation**: The do-not-reply mailbox password appeared inline in `.env` (in a
`curl …:PASSWORD` example line) and in chat. Recommend: (1) remove the inline
`curl --user '…:PASSWORD' …` line from `.env` (keep only the `SMTP_*` vars the code reads),
(2) rotate the password, (3) ensure `.env` is git-ignored (it is). This is operational and tracked
in `quickstart.md`, not a code task.

**Rationale**: Credentials that have been exposed should be rotated; example command lines holding
real passwords should not live in `.env`.
# Phase 0 Research: Do-Not-Reply Mail Box (IMAP viewer)

> **Amended 2026-10-13**: the fetch mechanism was changed from the `curl` CLI to **`ImapFlow`** (the
> project's existing IMAP client, as in `services/imapPoller.js`) at the user's request, with
> `mailparser` for parsing. R1–R4 below describe the original curl approach and are kept for history;
> the shipped `services/mailboxService.js` uses ImapFlow (per-request connect, `getMailboxLock`,
> `fetch`/`fetchOne`, peek preserved by restoring `\Seen`, connect/socket timeouts). R5–R9
> (accounts/folders allow-list, safe HTML rendering, dashboard placement, read-only/peek, the
> security follow-up) are unchanged and still apply.

Decisions resolving the Technical Context unknowns. Each: Decision / Rationale / Alternatives.
All credential references are env-var names only — no secret appears here.

## R1. How to fetch mailbox data with curl only (the command recipes)

**Decision**: One server-side module (`services/mailboxService.js`) shells out to `curl` via
`child_process.execFile("curl", argv, { timeout, maxBuffer })`. The IMAPS URL and username go in
argv; the **password and `--user` pair go in a config read from stdin** via `curl -K -`, so the
credential never appears in argv. Three operations:

- **List folders** (allow-listed subset shown): `curl -K -` with
  `url = "imaps://HOST/"` → IMAP `LIST` response lines. (We only *expose* Inbox + Sent, validated
  against the allow-list — the raw list is used to detect availability.)
- **List a page of messages** (headers/envelopes, newest first): select the folder and issue a
  custom `UID FETCH` for a bounded UID range requesting ENVELOPE + size + flags + internaldate, e.g.
  `url = "imaps://HOST/Sent"` with `request = "UID FETCH <lo>:<hi> (UID FLAGS RFC822.SIZE INTERNALDATE ENVELOPE)"`.
  The `<lo>:<hi>` range is derived from the folder's UIDNEXT / message count to get the most recent
  page (see R3).
- **Fetch one message** (on open): `url = "imaps://HOST/Sent;UID=<uid>"` (optionally
  `;SECTION=` / using `BODY.PEEK` semantics, see R8) → raw RFC822, handed to `mailparser`.

**Rationale**: `curl` natively speaks IMAPS and supports both URL-style fetches
(`imaps://host/FOLDER;UID=n`) and arbitrary IMAP commands via `--request`. `execFile` (not `exec`)
runs curl directly with an argv array — **no shell**, so shell injection is structurally impossible.
`curl -K <file>`/`-K -` reads options from a config file/stdin; feeding `user = "addr:pass"` on
stdin keeps the password out of argv and therefore out of `ps`, shell history, and any command log
(FR-007).

**Alternatives considered**:
- *`--user addr:pass` in argv* — rejected: the password would be visible in the process list.
- *`--netrc-file <temp>`* — viable, but a temp file on disk is more to manage/clean than stdin; `-K -`
  keeps the secret in memory only.
- *`imapflow` (already in repo)* — **explicitly disallowed** by the user ("only and only use curl").

## R2. Keeping it safe: timeouts, no shell, sanitised errors

**Decision**: Every curl call sets `--max-time` (e.g. 20s) and `--connect-timeout` (e.g. 10s), and
`execFile` sets a matching `timeout` + bounded `maxBuffer`. On non-zero exit / timeout the service
throws a typed error (`MailboxError` with a safe `code`: `auth` | `unreachable` | `timeout` |
`parse` | `unknown`); the router maps it to an HTTP status + a generic message. Raw curl stderr is
logged server-side only, never returned to the client (FR-011).

**Rationale**: A hung IMAP connection must not block Node or a request (FR-007/SC-005). Sanitised
errors avoid leaking server/host/credential detail to the browser.

**Alternatives considered**: no timeout (rejected — hang risk); returning curl stderr verbatim
(rejected — leaks internal detail).

## R3. Paging a potentially large mailbox

**Decision**: Never fetch the whole mailbox. Determine the folder's message count / UIDNEXT, then
fetch the most recent `pageSize` (default 50) messages for page 1, the next-older block for page 2,
etc., by computing a UID/sequence range from the top. Return `hasMore` so the client can page.

**Rationale**: "Fetch all the data" in practice means "browse the mailbox", and a mailbox can hold
thousands of messages; one unbounded FETCH would be slow and large (FR-008). Newest-first matches
how an admin reads mail.

**Alternatives considered**: `UID FETCH 1:*` everything (rejected — unbounded); server-side full
cache (rejected — v1 is live/no-storage).

## R4. Parsing what curl returns

**Decision**: For **message lists**, parse curl's ENVELOPE/FETCH response lines into summary rows
(uid, date, from, to, subject, size, seen) with a small dedicated parser in `mailboxService.js`.
For a **single opened message**, pass the raw RFC822 bytes to the already-present `mailparser`
(`simpleParser`) to get `from`, `to`, `subject`, `date`, `text`, `html`, and attachment metadata.

**Rationale**: `mailparser` is already a dependency (used by `imapPoller.js`) and robustly handles
MIME/encodings for full messages — reusing it for *parsing* does not violate the curl-only *fetch*
constraint. ENVELOPE responses are simple and structured enough to parse directly for the list,
avoiding a full-message fetch per row.

**Alternatives considered**: hand-rolling a MIME parser (rejected — `mailparser` exists and is
battle-tested); fetching each message fully just to list it (rejected — far too slow).

## R5. Accounts & folders: fixed allow-lists mapped to env vars

**Decision**: A fixed registry in `services/mailboxAccounts.js`:

| key | label | address (env) | credential env vars |
|-----|-------|---------------|---------------------|
| `do-not-reply` (default) | Do-Not-Reply | `SMTP_SENDER` | `SMTP_SENDER` + `SMTP_PASS` |
| `support` | Support | `SMTP_SUPPORT_SENDER` | `SMTP_SUPPORT_SENDER` + `SMTP_SUPPORT_SENDER_PASS` |

Host = `IMAP_HOST || SMTP_HOST` (default `buenapublica.cmpsrv.com`), port = `IMAP_PORT || 993`,
matching `services/imapPoller.js`. Folder allow-list = `{ Inbox: "INBOX", Sent: "Sent" }`. The HTTP
layer accepts only an account **key** and a folder **key**, both validated against these maps before
any curl call (FR-012). An account whose env vars are missing is reported as "unavailable".

**Rationale**: The browser must never choose a mailbox by address or send credentials (FR-006); a
key + server-side map is the safe indirection. Reusing the poller's env convention avoids new
config. Allow-listing folder names prevents a crafted folder path reaching curl.

**Alternatives considered**: free-form account/folder from the client (rejected — injection /
credential-exposure risk); a third "custom" account (rejected — only the two system mailboxes were
requested).

## R6. Rendering message bodies safely without a new dependency

**Decision**: Default the viewer to the **plain-text** body (`mailparser.text`) — always safe. When
only an HTML body exists (or the admin toggles to it), render it inside a **sandboxed iframe**:
`<iframe sandbox srcdoc={html}>` with the `sandbox` attribute left WITHOUT `allow-scripts` and
WITHOUT `allow-same-origin`. This neutralises scripts and cross-origin access with **no sanitiser
dependency**.

**Rationale**: No sanitiser (`dompurify`/`sanitize-html`) exists in the repo and the plan adds no
dependency. A scriptless, origin-less sandboxed iframe is the standard dependency-free way to
display untrusted HTML email safely (FR-004). Text-first keeps the common case trivial and safe.

**Alternatives considered**: `dangerouslySetInnerHTML` raw (rejected — XSS); adding `dompurify`
(rejected — avoidable new dependency); stripping to text only (rejected — loses HTML-only messages'
fidelity).

## R7. Dashboard placement ("under the logs")

**Decision**: Append a new `tabConfig` entry "Do-Not-Reply Mail Box" (a mailbox icon) immediately
after "Email Logs" in `public/src/components/Dashboard/Dashboard.jsx`, add a `React.lazy` import and
the matching index-based `case`. Append-only — existing indices unchanged.

**Rationale**: The dashboard's content switch is positional; the logs-related sections (Server Logs,
Email Logs) sit toward the end, so appending places the new section directly "under the logs" as
asked, with zero renumbering risk. Mirrors exactly how feature 008 added its tab.

**Alternatives considered**: inserting right after "Server Logs" mid-list (rejected — renumbers the
positional switch).

## R8. Read-only / do not mark messages read

**Decision**: Fetch message bodies with **peek** semantics (`BODY.PEEK[...]` / curl fetch that does
not set `\Seen`) so opening a message in the viewer does not flip it to "read" on the server. The
feature issues no `STORE`, `EXPUNGE`, `MOVE`, `APPEND`, or delete.

**Rationale**: FR-010 — the viewer observes, it must not mutate the real mailbox (an admin peeking
should not disturb unread counts that the support workflow may rely on).

**Alternatives considered**: plain `FETCH BODY[]` (rejected — marks \Seen).

## R9. Security follow-up (ops, not code)

**Decision / recommendation**: The do-not-reply mailbox password appeared inline in `.env` (in a
`curl …:PASSWORD` example line) and in chat. Recommend: (1) remove the inline
`curl --user '…:PASSWORD' …` line from `.env` (keep only the `SMTP_*` vars the code reads),
(2) rotate the password, (3) ensure `.env` is git-ignored (it is). This is operational and tracked
in `quickstart.md`, not a code task.

**Rationale**: Credentials that have been exposed should be rotated; example command lines holding
real passwords should not live in `.env`.
