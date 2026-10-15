# Feature Specification: SSO Role-Based Admin Access

**Feature Branch**: `008-sso-role-access`

**Created**: 2026-10-13

**Status**: Draft — written during `/speckit-plan` from the user description + codebase research

**Input**: User description: "there is login method with sso which a token sends and an email sub will shown on the header as the login so the full admin panel should be only available for jan.hussing@german-emirates-club.com, development1/2/3@german-emirates-club.com, office1@german-emirates-club.com, office2@german-emirates-club.com — and other emails can only view and interact with pdf-generator and the place-id-finder"

> **Provenance note**: written during `/speckit-plan`; there was no prior `/speckit-specify`
> conversation. Priorities and success criteria are proposals to confirm.

## Clarifications

### Session 2026-10-13

- Q: Is "offie2@" a typo for "office2@"? → A: Yes, `office2@german-emirates-club.com`.
- Q: Does the shared master-password admin login keep full access? → A: Yes — password login is full admin; only email/SSO logins are tiered.
- Q: Where does the allowlist live? → A: Server environment variable (`ADMIN_FULL_EMAILS`), comma-separated.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Privileged staff keep the full admin panel (Priority: P1)

A staff member on the allowlist signs in to `/admin` via the SSO auto-login link
(`?email=…&token=…`). The header shows "Logged in as: {their email}". They see and can use
every section of the admin panel exactly as today.

**Why this priority**: These six people run the business operations; losing any section would
block their daily work. Protecting their existing access is the baseline the feature must not break.

**Independent Test**: Sign in as a listed email and confirm all admin tabs render and function.

**Acceptance Scenarios**:

1. **Given** a valid SSO token for `development1@german-emirates-club.com`, **When** they open the
   admin panel, **Then** all sections (Website Health … Knowledge Base) are listed and reachable.
2. **Given** the shared admin master password, **When** a user logs in with it, **Then** they get
   the full panel (password login is treated as full admin).

### User Story 2 - Non-listed users are limited to PDF Generator + Place ID Finder (Priority: P1)

A user whose SSO email is **not** on the allowlist signs in. The header shows their email. They see
only two sections — **PDF Generator** and **Place ID Finder** — and can use both. No other section
is visible, and trying to reach one by URL or deep link does not expose it.

**Why this priority**: This is the core access-control requirement. Without it, any SSO user reaches
the full panel.

**Independent Test**: Sign in as an email not on the list and confirm exactly two tabs appear and
work, and that deep-linking `?tab=registration-config` does not render that section.

**Acceptance Scenarios**:

1. **Given** a valid SSO token for `someone.else@example.com`, **When** they open the admin panel,
   **Then** only "PDF Generator" and "Place ID Finder" tabs appear and the first one is active.
2. **Given** a limited user, **When** they manually set `?tab=server-logs` in the URL, **Then** they
   are redirected to an allowed tab and the Server Logs section never renders.
3. **Given** a limited user, **When** they call an admin-only server endpoint directly, **Then** the
   server rejects it with 403 (the restriction is enforced server-side, not only in the UI).

### User Story 3 - Allowlist is managed without a code change (Priority: P3)

An operator adds or removes a privileged email by editing server configuration and restarting,
with no client rebuild.

**Why this priority**: Convenience/maintainability; the feature works without it but staff churn is
expected over time.

**Independent Test**: Add an email to `ADMIN_FULL_EMAILS`, restart, confirm that user now sees the
full panel.

**Acceptance Scenarios**:

1. **Given** `ADMIN_FULL_EMAILS` is updated and the server restarted, **When** the newly added email
   logs in, **Then** they get full access.

### Edge Cases

- Email case/whitespace: `Development1@German-Emirates-Club.com ` must match `development1@…`
  (compare lowercased + trimmed).
- Token valid but email missing from the JWT (older sessions / password login without email):
  treated as **full admin** per the password-login decision; SSO always carries an email.
- Limited user's cookie is tampered to claim full access: rejected because the access tier is a
  signed JWT claim set server-side, not a client value.
- `ADMIN_FULL_EMAILS` unset/empty: fail safe — only password login is full admin; all SSO emails are
  limited (log a warning so misconfiguration is visible).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST classify every authenticated admin session as one of two tiers:
  `full` or `limited`.
- **FR-002**: The system MUST assign `full` when the login is via the shared admin password, or when
  the SSO email (lowercased, trimmed) is in the configured allowlist; otherwise `limited`.
- **FR-003**: The allowlist MUST be read from server configuration (`ADMIN_FULL_EMAILS`), not
  hardcoded in the browser bundle.
- **FR-004**: The access tier MUST be carried as a signed, server-set claim in the admin session JWT
  so it cannot be altered by the client.
- **FR-005**: `GET /admin/check-auth` and `GET /admin/auto-login` MUST return the session's email and
  access tier to the client.
- **FR-006**: The admin UI MUST show all sections for `full` sessions and only "PDF Generator" and
  "Place ID Finder" for `limited` sessions.
- **FR-007**: For a `limited` session, selecting or deep-linking any other section MUST NOT render it;
  the UI MUST fall back to an allowed section.
- **FR-008**: Server endpoints backing full-only sections MUST reject `limited` sessions with HTTP 403.
- **FR-009**: Endpoints required by the two allowed sections (maps config/search for Place ID Finder;
  PDF Generator is client-only) MUST remain reachable by `limited` sessions.
- **FR-010**: The header MUST continue to display the logged-in email for both tiers.

### Key Entities

- **Admin session**: the authenticated principal. Attributes: `email` (nullable for password login),
  `role` ("admin"), `accessLevel` ("full" | "limited"). Lives in the signed `a-usr` JWT cookie.
- **Full-admin allowlist**: the set of emails granted `full`, sourced from `ADMIN_FULL_EMAILS`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the six listed emails see and can use all admin sections after signing in.
- **SC-002**: A non-listed SSO user sees exactly two sections (PDF Generator, Place ID Finder) and
  zero others, including via direct URL.
- **SC-003**: A limited session receives HTTP 403 on every full-only admin endpoint it calls directly.
- **SC-004**: Changing the allowlist requires only a config edit + restart (no client rebuild).

## Assumptions

- The SSO auto-login HMAC mechanism (`/admin/auto-login`) is the "token" path referenced; the "email
  sub shown in the header" is the existing `adminEmail` display.
- "View and interact with" the two allowed sections means full use of those sections (not read-only).
- Password login remains full admin (confirmed).
