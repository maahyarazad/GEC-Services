# Quickstart / Validation: SSO Role-Based Admin Access

Manual validation of the two-tier admin access. Run after implementing the tasks from
`/speckit-tasks`. References: [spec.md](./spec.md), [contracts/admin-auth.md](./contracts/admin-auth.md).

## Prerequisites

- Server `.env` (or PM2 `config.json` env) contains:
  ```
  ADMIN_FULL_EMAILS=jan.hussing@german-emirates-club.com,development1@german-emirates-club.com,development2@german-emirates-club.com,development3@german-emirates-club.com,office1@german-emirates-club.com,office2@german-emirates-club.com
  ```
  plus the existing `JWT_SECRET`, `GEC_SECRET`, `VITE_ADMIN_PASSWORD`.
- Build the client (`cd public && npm run build`) or run the Vite dev server, and start the backend.
- Have a way to mint an SSO auto-login link: `token = HMAC_SHA256(email, GEC_SECRET)` in hex. A one-off
  node snippet using `crypto.createHmac("sha256", GEC_SECRET).update(email).digest("hex")` is enough.

## Scenario 1 — Privileged SSO user gets the full panel (FR-001/002/006, SC-001)

1. Build an auto-login URL for `development1@german-emirates-club.com` and open
   `/admin?email=…&token=…`.
2. **Expect**: header shows "Logged in as: development1@german-emirates-club.com"; all sections from
   Website Health through Knowledge Base are listed and open normally.
3. Open DevTools → Network → `check-auth`: response has `"accessLevel": "full"`.

## Scenario 2 — Shared password = full admin (FR-002, backward compat)

1. Go to `/admin`, log in with `VITE_ADMIN_PASSWORD`.
2. **Expect**: full panel; `check-auth` returns `"accessLevel": "full"` and `email: null`.

## Scenario 3 — Non-listed SSO user is limited (FR-006/007, SC-002)

1. Build an auto-login URL for `nobody@example.com`; open it.
2. **Expect**: header shows the email; exactly two tabs appear — **PDF Generator** and
   **Place ID Finder** — with PDF Generator active by default.
3. In the URL bar, change to `/admin?tab=server-logs`.
   **Expect**: the UI redirects to an allowed tab; Server Logs never renders (confirm no Server Logs
   network calls fire).
4. In Place ID Finder, perform a lookup. **Expect**: `/api/maps/config` and the maps search succeed.
5. In PDF Generator, generate a document. **Expect**: it works (client-only; no server dependency).

## Scenario 4 — Server enforces the tier, not just the UI (FR-008, SC-003)

1. As the limited user from Scenario 3 (cookie set), call a full-only endpoint directly, e.g.
   `curl -i --cookie "a-usr=<limited token>" https://<host>/support/<some-admin-endpoint>`.
2. **Expect**: HTTP **403** with `{"message":"Forbidden: full admin required"}`.
3. Repeat with a full user's cookie. **Expect**: the endpoint responds normally.

## Scenario 5 — Tamper resistance (FR-004)

1. As the limited user, attempt to edit the `a-usr` cookie or client state to claim full access.
2. **Expect**: no change — the server re-verifies the signed JWT; a modified cookie fails
   verification (401) and full-only endpoints still return 403 for an unmodified limited token.

## Scenario 6 — Allowlist is config-only (SC-004)

1. Add `newstaff@german-emirates-club.com` to `ADMIN_FULL_EMAILS`, restart the server (no client
   rebuild).
2. Open an auto-login URL for that email. **Expect**: full panel; `accessLevel: "full"`.
3. Remove it, restart, re-open. **Expect**: limited (two tabs).

## Edge checks

- Mixed-case / trailing space email in the link (e.g. `Development1@German-Emirates-Club.com `)
  resolves to `full` (normalized match).
- Unset `ADMIN_FULL_EMAILS`: SSO users are limited; password login still full; server logs a warning.

## Pass criteria

All scenarios behave as "Expect"-ed, matching SC-001…SC-004 in the spec.
