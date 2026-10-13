# Phase 1 Data Model: Do-Not-Reply Mail Box

**No persistence.** This feature stores nothing locally — there is no table and no migration. The
entities below are **transient shapes** produced by `services/mailboxService.js` from live curl
output and returned over the API (see [contracts/mailbox-api.md](./contracts/mailbox-api.md)). They
are documented so the service, router, and client agree on structure.

## Entity: Mailbox Account (fixed registry, `services/mailboxAccounts.js`)

Exactly two, defined server-side. Not user-editable; the client references one only by `key`.

| Field | Type | Notes |
|-------|------|-------|
| `key` | string | `do-not-reply` (default) \| `support` — the ONLY value the client sends |
| `label` | string | display name, e.g. "Do-Not-Reply", "Support" |
| `address` | string | email address, resolved from an env var (`SMTP_SENDER` / `SMTP_SUPPORT_SENDER`) |
| `userEnv` / `passEnv` | string | names of the env vars holding the credentials (never the values) |
| `available` | boolean | computed: true when the account's credential env vars are set |

Resolution rule: `key → { address, user, pass, host, port }` is computed server-side at call time;
credentials are read from `process.env` and passed to curl via stdin — never returned to the client.

## Entity: Folder (allow-list)

| Field | Type | Notes |
|-------|------|-------|
| `key` | string | client-facing key: `Inbox` \| `Sent` |
| `imapName` | string | server mailbox name: `INBOX` / `Sent` — validated against the allow-list before any curl call |

Only allow-listed folders may be requested (FR-012). An account missing a folder reports it as
empty/unsupported rather than erroring.

## Entity: Message Summary (one list row — transient)

Parsed from an IMAP ENVELOPE/FETCH response. Never persisted.

| Field | Type | Notes |
|-------|------|-------|
| `uid` | integer | IMAP UID within the folder (stable id for the "open message" call) |
| `date` | integer | epoch ms (from INTERNALDATE / envelope date), for newest-first ordering + locale display |
| `from` | string | sender address/display (primary counterpart for Inbox) |
| `to` | string | recipient address/display (primary counterpart for Sent) |
| `subject` | string | message subject (may be empty) |
| `size` | integer | RFC822.SIZE in bytes |
| `seen` | boolean | derived from IMAP `\Seen` flag (display only; never modified) |

## Entity: Message Detail (one opened message — transient)

Produced by `mailparser.simpleParser()` over the raw RFC822 bytes curl returns.

| Field | Type | Notes |
|-------|------|-------|
| `uid` | integer | echoes the requested UID |
| `from` / `to` / `cc` | string | parsed address headers |
| `subject` | string | |
| `date` | integer | epoch ms |
| `text` | string \| null | plain-text body (default view — always safe) |
| `html` | string \| null | HTML body, if present (rendered in a sandboxed, scriptless iframe) |
| `attachments` | array | metadata only: `{ filename, contentType, size }` — v1 does not fetch/download content |

## Validation rules

- `account` must be one of the registry keys; otherwise the request is rejected (400) before any
  curl call (FR-012).
- `folder` must be an allow-listed key; otherwise rejected (400).
- `uid` must be a positive integer; otherwise rejected (400).
- `page` ≥ 1; `pageSize` clamped to `[10, 100]`.
- Credentials for a `key` are read from env at call time; if absent, the account is `available:false`
  and requests return a clear "account unavailable" state (not a broken curl call).

## Lifecycle

Request → validate inputs against allow-lists → resolve credentials from env → run curl under a
timeout → parse output into the shapes above → return JSON. Nothing is cached or written. (A short
in-memory TTL cache keyed by account+folder+page is a possible later optimisation — out of scope.)

## Error shape (transient)

`MailboxError { code: 'auth'|'unreachable'|'timeout'|'parse'|'unavailable'|'unknown' }` →
router maps to `{ status:false, code, message }` with a generic message; raw curl stderr stays
server-side (FR-011).
