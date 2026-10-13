# Feature Specification: Do-Not-Reply Mail Box (Live IMAP Viewer via curl)

**Feature Branch**: `009-do-not-reply-mailbox`

**Created**: 2026-10-13

**Status**: Draft — written during `/speckit-plan` from the user description + codebase research

**Input**: User description: "use `curl -s --user 'USER@german-emirates-club.com:PASSWORD'
imaps://buenapublica.cmpsrv.com/` curl command and fetch all the data from the webmail server and
add new section under the logs and name it 'do-not-reply mail box' and also allow user to change
this by selecting support and do-not-reply and only and only use curl cli to fetch details and move
it to a new branch."

> **Provenance note**: written during `/speckit-plan`; there was no prior `/speckit-specify`
> conversation. Two design forks were confirmed with the user before writing:
> **(1) scope** = list the selected account's **Inbox + Sent** folders (headers list, newest first)
> and open one message's body on demand (attachments out of scope for v1);
> **(2) git** = work proceeds on the new branch `009-do-not-reply-mailbox`.
>
> **Implementation note (amended 2026-10-13)**: the original hard constraint was to fetch with the
> `curl` CLI only. At the user's request this was **changed to use `ImapFlow`** (the same IMAP client
> the project already uses in `services/imapPoller.js`), with `mailparser` for message parsing. The
> service was refactored accordingly; the public service API, the HTTP endpoints, and the UI are
> unchanged. Earlier references to `curl`/stdin in this spec and the other 009 artifacts are
> superseded by this note.
>
> **Security note**: this is a live view of real mailboxes. Credentials live only in server-side
> env vars and are never sent to or exposed in the browser. The mailbox password was visible in
> chat and inline in `.env`; rotating it and removing the inline `curl …:PASSWORD` line from `.env`
> is recommended (see `research.md`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the do-not-reply mailbox from the dashboard (Priority: P1)

An admin opens a new **Do-Not-Reply Mail Box** section in the dashboard (grouped with the other
logs sections). It shows the live contents of the `do-not-reply@german-emirates-club.com` mailbox:
a list of messages for a folder (Inbox or Sent), newest first, each row showing date-time, the
counterpart address (from for Inbox, to for Sent), subject, and size. The data is fetched live from
the webmail server with `curl` over IMAPS — nothing is read from the local database.

**Why this priority**: This is the core request — a window into the actual mailbox on the server,
which the forward-only email *log* (feature 008) cannot provide for historical/received mail.

**Independent Test**: Open the section with the do-not-reply account selected; confirm the message
list matches what the mailbox actually contains (cross-check a couple of rows against webmail).

**Acceptance Scenarios**:

1. **Given** an authenticated admin, **When** they open the Do-Not-Reply Mail Box section,
   **Then** they see a list of messages for the default account (do-not-reply) and folder, newest
   first, each with date-time, counterpart address, subject, and size.
2. **Given** the message list, **When** the admin switches between the Inbox and Sent folders,
   **Then** the list reloads with that folder's messages.
3. **Given** the mail server is unreachable or rejects auth, **When** the admin opens the section,
   **Then** an explicit error state is shown (not a blank screen or a hang), and no credentials
   appear anywhere client-side.

---

### User Story 2 - Open a single message to read it (Priority: P1)

From the list the admin clicks a message. The section fetches that one message from the server with
`curl` and displays its headers (from, to, date, subject) and body (text, or sanitised HTML).

**Why this priority**: A list of subjects is only half the value; reading the actual message is why
an admin opens a mailbox (e.g. "what exactly did we send this person?" / "what did this person ask
support?").

**Independent Test**: Click a known message; confirm the displayed sender/recipient/subject/body
match the real message in webmail.

**Acceptance Scenarios**:

1. **Given** the message list, **When** the admin clicks a message, **Then** its full content
   (headers + body) is fetched via curl and displayed.
2. **Given** a message with an HTML body, **When** it is displayed, **Then** the HTML is rendered
   safely (sanitised; no script execution, remote content handled conservatively).
3. **Given** a message fails to fetch, **When** the admin opens it, **Then** an inline error is
   shown and the admin can return to the list.

---

### User Story 3 - Switch the active mailbox account (Priority: P1)

A selector lets the admin change which mailbox the section is showing, between **do-not-reply** and
**support** (`app.support@…`). Changing the account reloads the folder list/messages for that
account. The section is still titled "Do-Not-Reply Mail Box", with do-not-reply as the default.

**Why this priority**: Explicitly requested ("allow user to change this by selecting support and
do-not-reply"). The two system mailboxes are the only ones that matter operationally, and support
mail (incoming tickets) is as useful to browse as do-not-reply (outbound).

**Independent Test**: Switch the selector to "support"; confirm the list now reflects the
`app.support@…` mailbox, and switch back.

**Acceptance Scenarios**:

1. **Given** the section, **When** the admin opens the account selector, **Then** exactly two
   accounts are offered: do-not-reply (default) and support.
2. **Given** the selector, **When** the admin picks an account, **Then** the message list reloads
   for that account's mailbox using that account's server-side credentials.
3. **Given** an account is selected, **When** any request is made, **Then** the browser sends only
   the account key (e.g. `do-not-reply` / `support`) — never an address or password.

---

### Edge Cases

- **Unreachable / slow server**: every curl call runs under a timeout; a hang surfaces as a timeout
  error, never a blocked request or frozen UI.
- **Auth failure** (wrong/rotated password): shown as an explicit "could not sign in to mailbox"
  error; the raw curl stderr is not leaked to the browser.
- **Large mailbox**: the list is paged (fetch the most recent N messages, then older pages) so a
  mailbox with thousands of messages does not produce an unbounded response or a slow call.
- **Empty folder**: an explicit "no messages" empty state.
- **Folder missing on an account** (e.g. an account without a "Sent" folder): that folder shows an
  empty/unsupported state rather than erroring the whole section.
- **Message with attachments**: v1 shows headers + body only; attachments are listed by name at
  most (download out of scope) — never auto-fetched.
- **Credential/host not configured** for an account: that account is shown as unavailable with a
  clear message, rather than attempting a broken curl call.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST add a new admin dashboard section titled "Do-Not-Reply Mail Box",
  grouped with the existing logs sections, reachable like other sections and guarded by the same
  admin authentication.
- **FR-002**: The system MUST fetch all mailbox details (folder list, message headers, message
  bodies) from the IMAPS webmail server server-side, using `ImapFlow` (reusing the project's existing
  IMAP stack) with `mailparser` for parsing. *(Amended from the original "`curl` CLI only"
  requirement — see the implementation note above.)*
- **FR-003**: The section MUST support at least two folders per account — **Inbox** and **Sent** —
  listing messages newest-first with date-time, counterpart address, subject, and size.
- **FR-004**: The admin MUST be able to open a single message and see its headers and body; HTML
  bodies MUST be rendered safely (sanitised).
- **FR-005**: The admin MUST be able to switch the active account between **do-not-reply** (default)
  and **support**; the section reloads for the chosen account.
- **FR-006**: Mailbox credentials MUST remain server-side (env vars) and MUST NEVER be sent to,
  stored in, or exposed by the browser. The client identifies an account only by a key.
- **FR-007**: Every mail-server connection MUST run under enforced connect/socket timeouts, and
  credentials MUST stay in server env/process memory only — never in the browser, a URL, logs, or a
  process argument list.
- **FR-008**: Message lists MUST be paged/bounded so a large mailbox cannot produce an unbounded
  response or a long-running request.
- **FR-009**: All mailbox endpoints MUST require admin authentication; unauthenticated requests MUST
  be rejected with the standard 401/403.
- **FR-010**: The feature MUST be read-only against the mailbox — no message is deleted, moved,
  marked, or sent. (Opening a message MUST NOT change its seen/unseen state where avoidable, i.e.
  use peek semantics.)
- **FR-011**: Errors from curl/IMAP (timeout, auth failure, unreachable, parse failure) MUST be
  mapped to safe, explicit UI states; raw curl stderr MUST NOT be returned to the browser.
- **FR-012**: The account key the client sends MUST be validated server-side against a fixed
  allow-list (do-not-reply, support); any other value is rejected. Folder names MUST likewise be
  validated against an allow-list.

### Key Entities *(include if feature involves data)*

- **Mailbox Account**: a fixed, server-side-defined account the admin can view. Attributes: key
  (`do-not-reply` | `support`), display label, email address, and the env vars holding its
  credentials. Exactly two exist; not user-editable.
- **Folder**: a named IMAP mailbox folder within an account (allow-listed: Inbox, Sent).
- **Message Summary**: one row in the list — uid, date/time, from, to, subject, size, seen flag.
  Transient (fetched live, not persisted).
- **Message Detail**: a single message's parsed headers and body (text and/or sanitised HTML), plus
  attachment filenames if any. Transient.

> No persistent entity: this feature stores nothing locally — it is a live pass-through to the mail
> server via curl.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can open the section and see the real do-not-reply mailbox message list
  within a few seconds for a normal mailbox, with zero reads from the local database.
- **SC-002**: An admin can open any listed message and read its real content (headers + body),
  matching webmail.
- **SC-003**: An admin can switch to the support mailbox and back, each showing the correct
  account's mail.
- **SC-004**: No mailbox credential is ever present in any browser payload, URL, or in the server
  process's argument list during a fetch (verifiable via `ps` and browser devtools).
- **SC-005**: A deliberately unreachable/slow server yields an explicit error within the configured
  timeout, with the UI remaining responsive.

## Assumptions

- **Fetching uses `ImapFlow`** (already a dependency, used by `services/imapPoller.js`) over IMAPS,
  with `mailparser` for parsing. No new dependency. *(Amended from the original curl-only approach.)*
- **Host**: `buenapublica.cmpsrv.com` over IMAPS (port 993), from `IMAP_HOST`/`IMAP_PORT` with
  `SMTP_HOST` fallback, matching the existing poller's convention.
- **Accounts/credentials** reuse existing env vars: do-not-reply → `SMTP_SENDER` + `SMTP_PASS`;
  support → `SMTP_SUPPORT_SENDER` + `SMTP_SUPPORT_SENDER_PASS`.
- **Live, no storage**: the section does not cache or persist mailbox content in v1 (a short
  in-memory cache is a possible later optimisation, noted but out of scope).
- **Read-only, peek semantics**: the feature never mutates the mailbox and avoids marking messages
  read.
- **Placement**: the new tab is appended to the dashboard `tabConfig` (after "Email Logs"), so it
  sits directly below the logs-related sections and existing tab indices are unchanged.
