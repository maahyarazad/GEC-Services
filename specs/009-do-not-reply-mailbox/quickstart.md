# Quickstart & Validation: Do-Not-Reply Mail Box

Run/validation guide proving the feature works end-to-end. Shapes: see
[data-model.md](./data-model.md); HTTP contract: [contracts/mailbox-api.md](./contracts/mailbox-api.md).

> **Secrets**: every command below reads the password from an **env var** — never type or paste the
> real password into a shell. Credentials go to curl on **stdin** (`-K -`), so they never appear in
> `ps` or shell history.

## Prerequisites

- `curl` with IMAP support on the host — verify: `curl --version | grep -i imap` (expect `IMAP IMAPS`).
- Env vars set (already used by the app): `SMTP_HOST` (or `IMAP_HOST`), optional `IMAP_PORT` (993),
  and credentials `SMTP_SENDER`/`SMTP_PASS` (do-not-reply) and
  `SMTP_SUPPORT_SENDER`/`SMTP_SUPPORT_SENDER_PASS` (support).
- Backend runnable (`npm run dev` at repo root); client dev server (`cd public && npm run dev`).
- An admin dashboard login so the `a-usr` cookie is set (endpoints are admin-guarded).

> **Amended 2026-10-13**: the service now uses `ImapFlow`, not `curl`. Step 0's curl recipes are no
> longer how the app fetches, but they remain a handy standalone way to sanity-check mailbox
> connectivity/credentials from the host shell. The in-app validation (V1–V7) is unchanged.

## Step 0 — (Optional) Prove the mailbox is reachable from the host shell

These `curl` recipes are NOT how the app fetches anymore (it uses ImapFlow), but they're a quick way
to confirm credentials/connectivity. Credentials via stdin:

```bash
# List folders for the do-not-reply account
printf 'user = "%s:%s"\nurl = "imaps://%s/"\n' \
  "$SMTP_SENDER" "$SMTP_PASS" "${IMAP_HOST:-$SMTP_HOST}" \
  | curl -s -K - --max-time 20 --connect-timeout 10

# List recent message envelopes in Sent (headers only)
printf 'user = "%s:%s"\nurl = "imaps://%s/Sent"\nrequest = "UID FETCH 1:* (UID FLAGS RFC822.SIZE INTERNALDATE ENVELOPE)"\n' \
  "$SMTP_SENDER" "$SMTP_PASS" "${IMAP_HOST:-$SMTP_HOST}" \
  | curl -s -K - --max-time 20 | head -40

# Fetch ONE full message by UID (peek — does not mark it read)
printf 'user = "%s:%s"\nurl = "imaps://%s/Sent;UID=3"\n' \
  "$SMTP_SENDER" "$SMTP_PASS" "${IMAP_HOST:-$SMTP_HOST}" \
  | curl -s -K - --max-time 20 | head -60
```

**Expected**: folder names listed; envelope lines returned; a raw RFC822 message printed. Confirm
`ps aux | grep curl` during the call shows **no password** in the arguments (it is on stdin).

## Validation scenarios

Each maps to a user story / FR in [spec.md](./spec.md).

### V1 — Section loads the do-not-reply mailbox (US1 / FR-001, FR-003)

1. Open the dashboard → the **Do-Not-Reply Mail Box** tab (below the logs sections).
2. Confirm a message list for the default account (do-not-reply), default folder (Inbox), newest
   first, with date-time / counterpart / subject / size.
3. Switch the folder tab to **Sent** → list reloads with Sent messages.
4. Cross-check two rows against actual webmail.

Equivalent API check: `GET /api/mailbox/messages?account=do-not-reply&folder=Inbox` returns the
paged shape in the contract.

### V2 — Open a message (US2 / FR-004, FR-010)

1. Click a message → its headers + body render (text by default; HTML in a sandboxed iframe).
2. Confirm sender/recipient/subject/body match webmail.
3. Confirm the message's **read/unread** state in webmail is unchanged afterwards (peek semantics).

### V3 — Switch account to support and back (US3 / FR-005)

1. Open the account selector → exactly two options: Do-Not-Reply (default) and Support.
2. Pick **Support** → list reloads for `app.support@…`.
3. Switch back to Do-Not-Reply.

Equivalent API check: `GET /api/mailbox/messages?account=support&folder=Inbox`.

### V4 — Credentials never reach the browser (FR-006, SC-004)

1. With the section open, inspect browser devtools → Network: requests carry only
   `account`/`folder`/`uid` — **no address, no password**.
2. On the server during a fetch, `ps aux | grep curl` shows **no credential** in argv.

### V5 — Input is allow-listed (FR-012)

1. `GET /api/mailbox/messages?account=bogus&folder=Inbox` → `400` before any curl call.
2. `GET /api/mailbox/messages?account=do-not-reply&folder=../evil` → `400`.

### V6 — Failure modes are safe (FR-007, FR-011, SC-005)

1. Temporarily point `IMAP_HOST` at an unreachable host (test env) → the section shows an explicit
   error within the timeout; the UI stays responsive; the response carries a generic message (no raw
   curl stderr).
2. Temporarily use a wrong password → an explicit "could not sign in to mailbox" error.

### V7 — Admin guard (FR-009)

1. `curl` the endpoints with no `a-usr` cookie → `401`.

## Ops security follow-up (not code — see research.md R9)

- [ ] Remove the inline `curl --user '…:PASSWORD' …` example line from `.env` (keep only the
      `SMTP_*` vars the code reads).
- [ ] Rotate the do-not-reply mailbox password (it was exposed in chat/.env).
- [ ] Confirm `.env` is git-ignored (it is).

## Sign-off checklist

- [ ] Section appears under the logs group; existing tabs keep their indices.
- [ ] Inbox + Sent list, newest-first, paged; open-one shows real content.
- [ ] Account selector switches do-not-reply ⇄ support.
- [ ] All fetching is curl-only; no `imapflow` used in this feature's code path.
- [ ] No credential in any browser payload or in curl argv.
- [ ] Inputs allow-listed; read-only; errors sanitised; timeouts enforced.
