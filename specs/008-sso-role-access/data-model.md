# Phase 1 Data Model: SSO Role-Based Admin Access

No database entities change. The "data" here is the shape of the session claim and the configuration.

## Admin session (JWT payload in the `a-usr` cookie)

Signed with `JWT_SECRET`, `expiresIn` 1 week (unchanged).

| Field         | Type                     | Required | Notes                                                                 |
|---------------|--------------------------|----------|-----------------------------------------------------------------------|
| `role`        | `"admin"`                | yes      | Unchanged; `authorize_admin` already checks this.                     |
| `email`       | string \| undefined      | no       | Present for SSO auto-login; absent for shared-password login.         |
| `accessLevel` | `"full"` \| `"limited"`  | **new**  | Set server-side at login. Absent on legacy tokens → treated as `full`.|
| `mapboxToken` | string                   | yes      | Unchanged; existing claim.                                            |

**Derivation (set at login, never trusted from the client):**

```
accessLevel =
  viaPassword ? "full"
  : allowlist.has(normalize(email)) ? "full"
  : "limited"

normalize(e) = String(e).trim().toLowerCase()
```

**Backward compatibility**: a valid admin token issued before this change has no `accessLevel`.
Middleware treats `role === "admin"` with missing `accessLevel` as `full`, so existing sessions are
not demoted mid-week.

## Full-admin allowlist (configuration)

- Source: `ADMIN_FULL_EMAILS` env var.
- Format: comma-separated emails, e.g.
  `jan.hussing@german-emirates-club.com,development1@german-emirates-club.com,development2@german-emirates-club.com,development3@german-emirates-club.com,office1@german-emirates-club.com,office2@german-emirates-club.com`
- Parsed once into a `Set<string>` of normalized (trim+lowercase) values.
- Empty/unset → empty set (fail-safe: SSO users become `limited`; warning logged).

## Section → tier mapping (client + server)

| Section (tab label) | Visible to `limited`? | Backing server endpoint(s)        | Server guard                 |
|---------------------|-----------------------|-----------------------------------|------------------------------|
| PDF Generator       | **yes**               | none (client-only)                | n/a                          |
| Place ID Finder     | **yes**               | `/api/maps/config`, `/maps/*`     | any admin tier (unchanged)   |
| All other sections  | no                    | various (see contracts)           | `authorize_admin_full` → 403 |

## Client-visible auth response

`GET /admin/check-auth` and the `GET /admin/auto-login` success body return:

```json
{ "authenticated": true, "email": "user@example.com", "accessLevel": "limited" }
```

The client stores `accessLevel` alongside `adminEmail` and uses it to derive the visible tab list and
the section router. It is advisory for UX only — the server claim is authoritative.

## State transitions

Authorization is stateless per request (JWT verify). The only transition is at login:

```
(no session) --login/password--> session{accessLevel: full}
(no session) --auto-login/SSO, email in list--> session{accessLevel: full}
(no session) --auto-login/SSO, email not in list--> session{accessLevel: limited}
session --logout--> (no session)
```
