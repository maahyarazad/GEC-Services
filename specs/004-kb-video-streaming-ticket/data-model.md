# Phase 1 Data Model: Streaming Ticket

No database table, no migration, no persisted state. A ticket is a self-contained signed value; the server keeps nothing and therefore has nothing to clean up, expire or replicate. Everything below describes the JWT payload and the in-memory shapes around it.

## 1. Streaming Ticket (JWT, HS256)

Signed with `KB_VIDEO_TICKET_SECRET`. Verified with `algorithms: ["HS256"]` pinned — without the pin, `jsonwebtoken` honours the token header's own `alg`, which lets a forged token claim `none`.

| Claim | Type | Source | Notes |
|---|---|---|---|
| `purpose` | string | constant `"kb-video"` | Domain separator. Rejected if it does not match exactly. |
| `vid` | **string** | `req.params.videoId` | The catalogue slug, e.g. `"whatsapp-broadcast"`. **Must not be coerced with `Number()`** — see the validation rule below. |
| `uid` | string \| null | `req.user?.username \|\| req.user?.email \|\| req.user?.role \|\| null` | Attribution only; not re-checked at verify time. Mirrors how `admin_user` is derived for `knowledge_base_view_log`. |
| `iat` | number | `jsonwebtoken` | Automatic. |
| `exp` | number | `iat + ttlSeconds()` | From `KB_VIDEO_TICKET_TTL`, default 7200s. |

### Validation rules

1. **Signature** — must verify against `KB_VIDEO_TICKET_SECRET` with HS256 pinned. Any failure (bad signature, malformed, expired) → `null`.
2. **Purpose** — `payload.purpose === "kb-video"`, exact match.
3. **Scope** — `String(payload.vid) === String(videoId)` for the video being requested. **String comparison, not numeric.** The supplied module's `Number(payload.vid) !== Number(videoId)` evaluates `NaN !== NaN` → `true` for every slug id in this catalogue, rejecting 100% of otherwise-valid tickets.
4. **Expiry** — enforced by `jwt.verify` via `exp`; no separate check.
5. **Uniform failure** — every rejection returns `null`, and the route answers `404` for all of them. Distinguishing "expired" from "wrong video" from "forged" hands an attacker free information; a uniform 404 also matches how an unknown `videoId` already responds, so the endpoint cannot be used to enumerate what exists.

### Lifecycle

`Minted` (admin opens the dialog) → `Valid` (until `exp`) → `Expired`. There is no revocation: a ticket cannot be invalidated before `exp` except by rotating `KB_VIDEO_TICKET_SECRET`, which invalidates all outstanding tickets at once. This is acceptable because the protected asset is an internal tutorial recording and the window is short — but it is a real property, not an oversight, and it is the reason the TTL is bounded rather than session-length.

## 2. Ticket response (`signVideoTicket` return, widened for the route)

| Field | Type | Notes |
|---|---|---|
| `token` | string | The signed JWT. Returned by the service; **not** exposed directly in the API response — the route folds it into `streamingUrl`. |
| `expiresIn` | number | Seconds. Returned to the client so it can decide when a URL is stale. |
| `streamingUrl` | string | Built by the route: `/api/knowledge-base/videos/<videoId>/stream?token=<token>`. Root-relative — the client prefixes `VITE_SERVERURL`, matching the convention in `knowledgeBase.telemetry.js`. |

## 3. Configuration

| Variable | Required | Default | Notes |
|---|---|---|---|
| `KB_VIDEO_TICKET_SECRET` | **Yes** | none | Must differ from `JWT_SECRET`. Absent → `require()` throws and the server refuses to boot. Not currently present in `.env` — adding it is a deployment prerequisite, not an optional step. |
| `KB_VIDEO_TICKET_TTL` | No | `7200` | Seconds. Non-numeric or `<= 0` falls back to the default rather than erroring. |

## 4. Unchanged entities

- **`VIDEO_FILES`** (`routes/knowledge_base.js`) — the `videoId → filename` map remains the only way a request reaches a path. Directory traversal stays structurally impossible; the ticket adds authentication, not path resolution.
- **`knowledge_base_view_log`** — untouched. Telemetry still comes from the SPA's fire-and-forget `POST /api/knowledge-base/views`, which keeps its cookie auth. Playback is not logged from the stream route: browsers issue several Range requests per view, so counting them there would inflate the numbers.
