# Implementation Plan: SSO Role-Based Admin Access

**Branch**: `008-sso-role-access` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-sso-role-access/spec.md`

## Summary

Introduce a two-tier authorization model for the admin panel. The admin session JWT already exists
(`a-usr` cookie, signed with `JWT_SECRET`); we add a server-set `accessLevel` claim (`full` |
`limited`) computed at login from either the shared master password (always `full`) or the SSO email
measured against a configured allowlist (`ADMIN_FULL_EMAILS`). `full` sessions keep today's complete
panel; `limited` sessions see and use only **PDF Generator** and **Place ID Finder**. The tier is
enforced on both sides: the client filters the tab list and section router, and the server rejects
`limited` callers on full-only endpoints with 403. The allowlist lives only on the server, never in
the browser bundle.

## Technical Context

**Language/Version**: Node.js (CommonJS, Express 4) backend; React 18 + Vite frontend (JSX).

**Primary Dependencies**: `jsonwebtoken` (JWT sign/verify), `express`, `crypto` (HMAC auto-login),
MUI `Tabs`/`Tab`, React Router. All already in use.

**Storage**: No database change. Authorization state lives in the signed `a-usr` JWT cookie; the
allowlist lives in process env (`.env` / PM2 config).

**Testing**: No formal test runner is wired for these routes today; validation is via the
`quickstart.md` manual scenarios plus optional lightweight node assertions for the classifier helper.

**Target Platform**: Web (browser admin SPA + Node server).

**Project Type**: Web application (frontend `public/` + backend at repo root: `routes/`, `middleware/`).

**Performance Goals**: Authorization is O(1) per request (JWT verify + set membership); no measurable
impact.

**Constraints**: Must not break existing `full` admins or the shared-password login path. The tier
must be unforgeable by the client (signed claim only). No client rebuild required to edit the list.

**Scale/Scope**: 6 privileged emails today; a handful of admin route files (14 `authorize_admin`
call sites across 6 files) plus two client files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an unfilled template with no ratified
principles, so there are no concrete gates to evaluate. Default engineering guardrails applied:
security boundary enforced server-side (not UI-only), fail-safe defaults, no secret shipped to the
client, minimal surface change. **PASS** (no violations; Complexity Tracking left empty).

## Project Structure

### Documentation (this feature)

```text
specs/008-sso-role-access/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── admin-auth.md     # JWT claim + endpoint contracts
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
# Backend (repo root)
middleware/
└── auth.js                     # add authorize_admin_full; extend authorize_admin to pass tier through
routes/
├── registration.js             # /admin/login, /admin/auto-login, /admin/check-auth — set + return accessLevel
├── support.js                  # 7 authorize_admin sites → authorize_admin_full
├── contact_book.js             # 2 sites → authorize_admin_full
├── knowledge_base.js           # 2 sites → authorize_admin_full
├── twilio_credentials.js       # 1 site → authorize_admin_full
├── whatsapp_sender.js          # 1 site → authorize_admin_full
└── maps.js                     # stays reachable by limited (Place ID Finder); add any-admin guard
server.js                       # 1 authorize_admin site → classify
services/ (or middleware/)
└── adminAccess.js (new)        # allowlist parse + classify(email) helper, single source of truth

# Frontend
public/src/components/Dashboard/
└── Dashboard.jsx               # read accessLevel from check-auth/auto-login; filter tabConfig + section router
public/src/components/utils/
└── Header.jsx                  # (no change required; already shows adminEmail)
```

**Structure Decision**: Web application layout. The authorization decision is centralized in one new
server helper (`adminAccess.js`) that both the login routes and the middleware import, so "who is a
full admin" is defined in exactly one place. The client treats `accessLevel` as display/navigation
guidance only; the server helper + signed claim are the security boundary.

## Approach (high level)

1. **Server — classify once.** New `adminAccess.js` exports `parseAllowlist()` (reads
   `ADMIN_FULL_EMAILS`, lowercases/trims into a `Set`) and `classify({ email, viaPassword })` →
   `"full" | "limited"`. Password login → `full`. SSO email in allowlist → `full`, else `limited`.
2. **Server — embed the tier.** `/admin/login` signs `accessLevel: "full"`; `/admin/auto-login`
   signs `accessLevel: classify({ email })`. Both already sign `role: "admin"`.
3. **Server — report the tier.** `/admin/check-auth` (and the `auto-login` response) return
   `{ authenticated, email, accessLevel }`.
4. **Server — enforce.** New `authorize_admin_full` middleware = `authorize_admin` + require
   `req.user.accessLevel === "full"` (password-admin tokens with no `accessLevel` are treated as
   `full` for backward compatibility). Swap it in on every full-only route; leave `maps.js` reachable
   by any admin tier. `authorize_admin` continues to set `req.user` so the tier is available.
5. **Client — gate the UI.** Dashboard stores `accessLevel`. When `limited`, derive the tab list to
   only PDF Generator + Place ID Finder, default the active tab to PDF Generator, and guard the
   `tab` URL param / section switch so an out-of-list slug falls back to an allowed section.

See `research.md` for the decisions behind each and `data-model.md` for the exact claim shape.

## Complexity Tracking

> No constitution violations; section intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| —         | —          | —                                    |
