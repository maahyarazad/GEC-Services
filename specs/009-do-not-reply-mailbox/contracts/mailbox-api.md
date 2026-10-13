# Contract: Do-Not-Reply Mail Box Admin API

Router: `routes/mailbox.js`, root-mounted in `routes.js`. Every endpoint is guarded by
`middleware/auth.authorize_admin` (cookie `a-usr` JWT) and the client calls them with
`fetch(..., { credentials: 'include' })`.

**The client sends only an account KEY and a folder KEY — never an address, never a password.**
Credentials are resolved server-side from env vars and fed to `curl` on stdin.

Unauthenticated/forbidden → `401 { authenticated:false, message:"Unauthorized" }` / `403 … "Forbidden"`
(FR-009). Responses use the project's `status: true|false` envelope.

Errors map a `MailboxError.code` to an HTTP status with a **generic** message (raw curl stderr is
never returned, FR-011):

| code | HTTP | meaning |
|------|------|---------|
| (bad input) | 400 | unknown account/folder key, bad uid/page |
| `unavailable` | 409 | account's credentials not configured |
| `auth` | 502 | mail server rejected the credentials |
| `unreachable` | 502 | could not connect to the mail server |
| `timeout` | 504 | curl exceeded `--max-time` |
| `parse` / `unknown` | 500 | unexpected failure |

---

## GET `/api/mailbox/accounts`

Lists the selectable accounts for the account selector (US3).

**200**:

```json
{
  "status": true,
  "accounts": [
    { "key": "do-not-reply", "label": "Do-Not-Reply", "address": "do-not-reply@german-emirates-club.com", "available": true, "default": true },
    { "key": "support",      "label": "Support",       "address": "app.support@german-emirates-club.com", "available": true, "default": false }
  ],
  "folders": [ { "key": "Inbox" }, { "key": "Sent" } ]
}
```

`address` is display-only; no credential is included. `available:false` when env vars are missing.

---

## GET `/api/mailbox/messages`

A page of message summaries for one account+folder, newest first (US1).

**Query params**:

| param | type | default | notes |
|-------|------|---------|-------|
| `account` | key | `do-not-reply` | must be an allow-listed account key |
| `folder` | key | `Inbox` | must be an allow-listed folder key (`Inbox`\|`Sent`) |
| `page` | int ≥ 1 | 1 | 1-based |
| `pageSize` | int | 50 | clamped `[10,100]` |

**200**:

```json
{
  "status": true,
  "account": "do-not-reply",
  "folder": "Inbox",
  "messages": [
    { "uid": 5821, "date": 1760356320000, "from": "jane@example.com", "to": "do-not-reply@german-emirates-club.com", "subject": "Re: Your login code", "size": 4096, "seen": true }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 1342,
  "hasMore": true
}
```

Empty folder → `messages: []`, `total: 0`, `hasMore: false` → client shows "no messages".

---

## GET `/api/mailbox/message`

One full message, fetched with curl and parsed with `mailparser` (US2). Peek semantics — does not
mark the message read (FR-010).

**Query params**: `account` (key, required), `folder` (key, required), `uid` (positive int, required).

**200**:

```json
{
  "status": true,
  "message": {
    "uid": 5821,
    "from": "jane@example.com",
    "to": "do-not-reply@german-emirates-club.com",
    "cc": "",
    "subject": "Re: Your login code",
    "date": 1760356320000,
    "text": "Thanks, it worked.",
    "html": "<p>Thanks, it worked.</p>",
    "attachments": [ { "filename": "receipt.pdf", "contentType": "application/pdf", "size": 20481 } ]
  }
}
```

`html` is rendered client-side inside a sandboxed, scriptless iframe; `text` is the default view.
Attachment entries are metadata only — v1 does not expose download.

---

## Security notes (apply to all endpoints)

- The browser never receives or sends a mailbox password or address-as-selector; only account/folder
  **keys** cross the wire (FR-006).
- `account`/`folder`/`uid` are validated against allow-lists / type before any curl call (FR-012);
  `curl` is invoked via `execFile` (no shell) with credentials on stdin, never in argv (FR-007).
- All endpoints are read-only; there is no create/delete/move/send endpoint (FR-010).
# Contract: Do-Not-Reply Mail Box Admin API

Router: `routes/mailbox.js`, root-mounted in `routes.js`. Every endpoint is guarded by
`middleware/auth.authorize_admin` (cookie `a-usr` JWT) and the client calls them with
`fetch(..., { credentials: 'include' })`.

**The client sends only an account KEY and a folder KEY — never an address, never a password.**
Credentials are resolved server-side from env vars and used only by the server-side IMAP client
(`ImapFlow`; amended from the original curl approach). They never reach the browser.

Unauthenticated/forbidden → `401 { authenticated:false, message:"Unauthorized" }` / `403 … "Forbidden"`
(FR-009). Responses use the project's `status: true|false` envelope.

Errors map a `MailboxError.code` to an HTTP status with a **generic** message (raw curl stderr is
never returned, FR-011):

| code | HTTP | meaning |
|------|------|---------|
| (bad input) | 400 | unknown account/folder key, bad uid/page |
| `unavailable` | 409 | account's credentials not configured |
| `auth` | 502 | mail server rejected the credentials |
| `unreachable` | 502 | could not connect to the mail server |
| `timeout` | 504 | curl exceeded `--max-time` |
| `parse` / `unknown` | 500 | unexpected failure |

---

## GET `/api/mailbox/accounts`

Lists the selectable accounts for the account selector (US3).

**200**:

```json
{
  "status": true,
  "accounts": [
    { "key": "do-not-reply", "label": "Do-Not-Reply", "address": "do-not-reply@german-emirates-club.com", "available": true, "default": true },
    { "key": "support",      "label": "Support",       "address": "app.support@german-emirates-club.com", "available": true, "default": false }
  ],
  "folders": [ { "key": "Inbox" }, { "key": "Sent" } ]
}
```

`address` is display-only; no credential is included. `available:false` when env vars are missing.

---

## GET `/api/mailbox/messages`

A page of message summaries for one account+folder, newest first (US1).

**Query params**:

| param | type | default | notes |
|-------|------|---------|-------|
| `account` | key | `do-not-reply` | must be an allow-listed account key |
| `folder` | key | `Inbox` | must be an allow-listed folder key (`Inbox`\|`Sent`) |
| `page` | int ≥ 1 | 1 | 1-based |
| `pageSize` | int | 50 | clamped `[10,100]` |

**200**:

```json
{
  "status": true,
  "account": "do-not-reply",
  "folder": "Inbox",
  "messages": [
    { "uid": 5821, "date": 1760356320000, "from": "jane@example.com", "to": "do-not-reply@german-emirates-club.com", "subject": "Re: Your login code", "size": 4096, "seen": true }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 1342,
  "hasMore": true
}
```

Empty folder → `messages: []`, `total: 0`, `hasMore: false` → client shows "no messages".

---

## GET `/api/mailbox/message`

One full message, fetched with curl and parsed with `mailparser` (US2). Peek semantics — does not
mark the message read (FR-010).

**Query params**: `account` (key, required), `folder` (key, required), `uid` (positive int, required).

**200**:

```json
{
  "status": true,
  "message": {
    "uid": 5821,
    "from": "jane@example.com",
    "to": "do-not-reply@german-emirates-club.com",
    "cc": "",
    "subject": "Re: Your login code",
    "date": 1760356320000,
    "text": "Thanks, it worked.",
    "html": "<p>Thanks, it worked.</p>",
    "attachments": [ { "filename": "receipt.pdf", "contentType": "application/pdf", "size": 20481 } ]
  }
}
```

`html` is rendered client-side inside a sandboxed, scriptless iframe; `text` is the default view.
Attachment entries are metadata only — v1 does not expose download.

---

## Security notes (apply to all endpoints)

- The browser never receives or sends a mailbox password or address-as-selector; only account/folder
  **keys** cross the wire (FR-006).
- `account`/`folder`/`uid` are validated against allow-lists / type before any mail-server call
  (FR-012); credentials stay in server env/process memory, never in argv, logs, or the browser
  (FR-007).
- All endpoints are read-only; there is no create/delete/move/send endpoint (FR-010).
