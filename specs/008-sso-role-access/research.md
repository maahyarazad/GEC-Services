# Phase 0 Research: SSO Role-Based Admin Access

All items in the plan's Technical Context are known from the codebase; there were no open
`NEEDS CLARIFICATION` markers. This document records the design decisions and the alternatives weighed.

## Decision 1 — Where the access tier lives

**Decision**: Carry `accessLevel` ("full" | "limited") as a claim inside the existing `a-usr` JWT,
set at login and verified on every request.

**Rationale**: The JWT is already signed with `JWT_SECRET` and verified by `authorize_admin`
(`middleware/auth.js`). Adding a claim reuses that trust path and makes the tier tamper-proof — a
limited user cannot edit a cookie to gain full access. No new storage or session store is needed.

**Alternatives considered**:
- *Look up the email against the allowlist on every request*: redundant work and still needs a
  trusted email source — which is already the signed JWT, so the claim is strictly simpler.
- *Store tier in client state only*: rejected — client state is not a security boundary; trivially
  bypassed via the browser console or direct API calls.

## Decision 2 — Classification rules

**Decision**: `full` when (a) login used the shared master password, or (b) the SSO email, lowercased
and trimmed, is in `ADMIN_FULL_EMAILS`; otherwise `limited`.

**Rationale**: Matches the confirmed product decisions — the master password is the operator's
break-glass/full credential, and SSO users are tiered by identity. Lowercasing + trimming avoids
case/whitespace mismatches (`Development1@…` vs `development1@…`).

**Alternatives considered**:
- *Password login = limited*: rejected by the user; it would lock operators out during SSO outages.
- *Case-sensitive match*: rejected — email local parts are case-insensitive in practice here and a
  case mismatch would silently demote a privileged user.

## Decision 3 — Allowlist source

**Decision**: `ADMIN_FULL_EMAILS` environment variable, comma-separated, parsed once into a `Set`.

**Rationale**: The server already reads config from env (`JWT_SECRET`, `GEC_SECRET`,
`VITE_ADMIN_PASSWORD`, …) via dotenv and PM2's `config.json`. Keeping the list server-side means it
is never shipped in the browser bundle and can be changed with a restart, no client rebuild (SC-004).

**Alternatives considered**:
- *Hardcoded constant*: offered to the user; env var chosen as the maintainable, standard-practice
  default.
- *Database table*: over-engineered for six rarely-changing entries; adds a query to the hot auth path.

**Fail-safe**: if `ADMIN_FULL_EMAILS` is unset/empty, only password login is `full`; all SSO emails
are `limited`, and the server logs a one-time warning so the misconfiguration is visible.

## Decision 4 — Server enforcement surface

**Decision**: Add `authorize_admin_full` (= `authorize_admin` + require `accessLevel === "full"`;
treat a missing `accessLevel` on an otherwise valid admin token as `full` for backward compatibility)
and apply it to every full-only admin endpoint. Leave the Place ID Finder's maps endpoints reachable
by any admin tier. PDF Generator makes no server calls (verified — no `fetch`/`VITE_SERVERURL` in
`PDFGenerator.jsx`), so it needs no server rule.

**Rationale**: The spec requires the restriction to be real, not cosmetic (FR-008, SC-003). Current
admin-only endpoints are guarded by `authorize_admin` in 6 files (14 sites: `support.js` ×7,
`contact_book.js` ×2, `knowledge_base.js` ×2, `twilio_credentials.js` ×1, `whatsapp_sender.js` ×1,
`server.js` ×1). Swapping those to `authorize_admin_full` closes the gap for the sections a limited
user must not touch.

**Known pre-existing risk (flagged, not solved here)**: many section endpoints in `registration.js`
are **not** currently behind `authorize_admin` at all. This feature does not regress that, and the
client gating still hides those sections from limited users, but true defense-in-depth would require
auditing and guarding those routes. Captured as a follow-up, out of scope for this plan unless the
user expands it.

**Alternatives considered**:
- *Per-route email checks*: rejected — scatters the allowlist logic; the signed claim + one
  middleware is centralized and testable.

## Decision 5 — Client gating strategy

**Decision**: Dashboard computes the visible `tabConfig` from `accessLevel`. For `limited`, the list
is `[PDF Generator, Place ID Finder]`, the default/active tab resolves to PDF Generator, and the
`tab` URL-param resolver falls back to an allowed slug when the requested one is not in the visible
set. The section `switch` renders by the resolved section, not a raw index, so a crafted index/slug
cannot surface a hidden section.

**Rationale**: FR-006/FR-007 require both hiding and non-rendering on deep links. Driving the tab
list and the router from one derived list keeps them consistent and avoids index drift (today the
section is chosen by `switch (tabValue)` over the full array — the limited list must not reintroduce
a hidden section via a stale index).

**Alternatives considered**:
- *CSS-hide the tabs only*: rejected — the section still mounts and its data still loads; fails
  FR-007 and leaks data.

## Summary of inputs verified in the codebase

- SSO/token path: `routes/registration.js` `GET /admin/auto-login` (HMAC over email with `GEC_SECRET`).
- Session cookie + claims: `jwt.sign({ role, email, mapboxToken }, JWT_SECRET)`.
- Auth check returning email: `GET /admin/check-auth` → `{ authenticated, email }`.
- Header email display: `public/src/components/utils/Header.jsx` (`adminEmail`).
- Client auth + tabs + section router: `public/src/components/Dashboard/Dashboard.jsx`
  (`checkAuth`, `tabConfig`, `switch (tabValue)`).
- Allowed sections' endpoints: Place ID Finder → `/api/maps/config`, `/maps/*`; PDF Generator → none.
