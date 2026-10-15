# Contract: Admin Auth & Authorization

The admin SPA talks to the Node/Express backend over these endpoints. Only the deltas introduced by
this feature are normative; everything else is unchanged.

## GET /admin/auto-login  (SSO token path)

Query: `email` (string), `token` (HMAC-SHA256(email, GEC_SECRET), hex).

- **200** `{ "success": true, "email": "<email>", "accessLevel": "full" | "limited" }`
  - Sets `a-usr` cookie (httpOnly, secure, sameSite=none, 1 week) with JWT claims
    `{ role: "admin", email, accessLevel, mapboxToken }`.
  - `accessLevel = classify({ email })`.
- **401** `{ "success": false, "error": "Missing credentials" | "Invalid token" }`
- **500** `{ "success": false, "error": "Server misconfiguration" | "Server error" }`

## POST /admin/login  (shared password path)

Body: `password`.

- **200** `{ "success": true }`
  - Sets `a-usr` JWT with `{ role: "admin", accessLevel: "full", mapboxToken }` (no email).
- **401** `{ "error": "Invalid password" }`
- **429** rate limited. **500** misconfiguration.

## GET /admin/check-auth

Reads `a-usr` cookie.

- **200** `{ "authenticated": true, "email": <string|null>, "accessLevel": "full" | "limited" }`
  - `accessLevel` is read from the verified JWT claim; a valid `role:"admin"` token lacking the claim
    reports `"full"` (backward compatibility).
- **401** `{ "authenticated": false }` — no/invalid token or non-admin role.

## Authorization middleware

### authorize_admin (existing, extended)

- Verifies `a-usr` (or `x-access-token` external token) and calls `next()`.
- **Delta**: MUST set `req.user` to the decoded internal token for admin sessions so downstream
  handlers and `authorize_admin_full` can read `req.user.accessLevel`.

### authorize_admin_full (new)

- Runs `authorize_admin`'s verification, then requires the session be full-tier:
  - `req.user.accessLevel === "full"`, **or**
  - `req.user.role === "admin"` with `accessLevel` undefined (legacy/password token) → allowed.
- On failure: **403** `{ "authenticated": true, "message": "Forbidden: full admin required" }`.

### Application matrix

| Route file              | Sites | Change                                             |
|-------------------------|-------|----------------------------------------------------|
| `routes/support.js`     | 7     | `authorize_admin` → `authorize_admin_full`         |
| `routes/contact_book.js`| 2     | `authorize_admin` → `authorize_admin_full`         |
| `routes/knowledge_base.js`| 2   | `authorize_admin` → `authorize_admin_full`         |
| `routes/twilio_credentials.js`| 1| `authorize_admin` → `authorize_admin_full`         |
| `routes/whatsapp_sender.js`| 1  | `authorize_admin` → `authorize_admin_full`         |
| `server.js`             | 1     | `authorize_admin` → `authorize_admin_full` (confirm the mounted path is a full-only feature) |
| `routes/maps.js`        | 0→*   | Keep reachable by limited users; endpoints Place ID Finder needs stay open to any admin tier |

> Pre-existing gap: section endpoints in `routes/registration.js` that have **no** admin guard today
> are out of scope here (see research.md, Decision 4). Flag for a follow-up audit.

## Client contract (Dashboard.jsx)

- On `checkAuth`, store `accessLevel` from `check-auth` / `auto-login`.
- Derive `visibleTabs`:
  - `full` → full `tabConfig` (today's behavior).
  - `limited` → only `["PDF Generator", "Place ID Finder"]`.
- Resolve the active section from the `tab` URL slug **within `visibleTabs`**; if the slug is not in
  `visibleTabs`, redirect to the first visible tab (PDF Generator for limited).
- Render section content by resolved section identity, not by a raw index into the full array.
