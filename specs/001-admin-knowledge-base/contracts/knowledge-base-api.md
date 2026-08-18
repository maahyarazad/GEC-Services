# Phase 1 Contracts: Admin Knowledge Base

**Feature**: `001-admin-knowledge-base` | **Date**: 2026-08-18

Three server-side surfaces: two new endpoints and one guard on an existing mount. Plus the client-side
URL contract the jump control depends on, which is not new but must not be broken.

All endpoints live in `routes/knowledge_base.js`, mounted in `server.js` alongside the existing
routers. Both require the `authorize_admin` middleware from `middleware/auth.js`, which reads the
httpOnly `a-usr` cookie and verifies it with `JWT_SECRET`.

---

## 1. `GET /api/knowledge-base/videos/:videoId`

Streams one tutorial recording to an authenticated administrator.

**Auth**: `authorize_admin`. The browser sends the `a-usr` cookie automatically on a same-origin
`<video src>` request, so no client-side token handling is needed.

**Path parameters**

| Name | Type | Notes |
|---|---|---|
| `videoId` | string | Opaque catalogue key. **Never** used to build a filesystem path directly. |

**Request headers**

| Header | Required | Notes |
|---|---|---|
| `Range` | no | E.g. `bytes=1048576-`. Must be honoured so administrators can seek and resume. |
| `Cookie` | yes | Must carry a valid `a-usr` admin token. |

**Responses**

| Status | When | Body / headers |
|---|---|---|
| `200 OK` | Full-file request | `Content-Type: video/mp4`, `Accept-Ranges: bytes`, `Content-Length` |
| `206 Partial Content` | Valid `Range` | Adds `Content-Range: bytes <start>-<end>/<total>` |
| `401 Unauthorized` | Missing or invalid admin token | `{ "authenticated": false, "message": "Unauthorized" }` |
| `404 Not Found` | `videoId` not in catalogue, **or** file absent from disk | `{ "error": "Video not found" }` |
| `416 Range Not Satisfiable` | Range beyond file length | Standard `Content-Range: bytes */<total>` |

**Behavioural contract**

- Resolution is catalogue-driven: look `videoId` up in the known id → filename map. A miss is a 404
  *before* any filesystem access. The parameter never reaches a path, so traversal is impossible by
  construction rather than by sanitisation.
- After resolution, assert the absolute path is still inside `file_storage/knowledge_base/`.
- Range handling comes from `res.sendFile()`, which delegates to `send` and already implements
  `206`/`416`/`Accept-Ranges` correctly. Do not hand-roll it.
- A missing-but-declared file must return 404 cleanly, not throw — the client renders "video
  unavailable" and the rest of the catalogue keeps working (FR-011).
- 404 must be indistinguishable between "unknown id" and "file missing", so the endpoint cannot be
  used to enumerate what exists.

---

## 2. `POST /api/knowledge-base/views`

Records that an administrator opened a topic or played its tutorial (FR-015).

**Auth**: `authorize_admin`.

**Request body**

```json
{
  "topicId": "whatsapp-guest-list",
  "eventType": "video_played"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `topicId` | string | yes | Must exist in the catalogue's known id set; otherwise `400`. |
| `eventType` | string | yes | `"topic_opened"` or `"video_played"`. Any other value is `400`. |

The acting administrator is taken from the verified JWT (`req.user`), **never** from the body.

**Responses**

| Status | When | Body |
|---|---|---|
| `204 No Content` | Recorded | — |
| `400 Bad Request` | Unknown `topicId` or invalid `eventType` | `{ "error": "..." }` |
| `401 Unauthorized` | Missing or invalid admin token | `{ "authenticated": false, "message": "Unauthorized" }` |

**Behavioural contract**

- Fire-and-forget from the client's perspective: a failure here must never block playback or
  navigation. The client does not await it and does not surface its errors.
- Rejecting unknown `topicId` values keeps the table from becoming arbitrary client-writable storage.

---

## 3. Guard on `/uploads/knowledge_base` *(modification to an existing mount)*

**This is the security-critical part of the feature.** `server.js:106` currently serves the whole of
`file_storage/` publicly:

```js
app.use("/uploads", express.static(path.join(__dirname, "file_storage")));
```

Recordings placed in `file_storage/knowledge_base/` would therefore be readable at
`/uploads/knowledge_base/<filename>` by anyone who knows or guesses the name, with no session at all.
FR-020 forbids this.

**Contract**

| Request | Required response |
|---|---|
| `GET /uploads/knowledge_base/<anything>`, no session | `404` — never the file |
| `GET /uploads/knowledge_base/<anything>`, valid admin session | `404` — this path is not the way in |
| `GET /uploads/<other-file>` | Unchanged from today's behaviour |

**Ordering requirement**: the guard must be registered **above** the `express.static` call at
`server.js:106`. Express matches middleware in registration order; registered below, the static
handler answers first and the guard is dead code. This is the single easiest thing to get wrong in
this feature, and the negative test in `quickstart.md` exists specifically to catch it.

404 rather than 403, so the path does not confirm that a knowledge-base directory exists.

---

## 4. Client URL contract *(existing mechanism — must not regress)*

The jump control depends on addressing that already works. It is contract here because this feature
extends it and must not break it.

| URL | Resolves to | Source |
|---|---|---|
| `/admin?tab=<slug>` | Dashboard section | `Dashboard.jsx:311-338` |
| `/admin?tab=whatsapp-broadcast&view=<panel>` | WhatsApp panel | `WhatsApp.jsx:956-972` |

**New slug**: `knowledge-base`, derived automatically from a `tabConfig` label of `"Knowledge Base"`.

**Two additions to `panelMap`** (`WhatsApp.jsx:958-970`) — the only change required to make every
destination this feature needs reachable:

| Key | Panel rendered at | Currently |
|---|---|---|
| `create-template` | `WhatsApp.jsx:1316` | rendered but not addressable |
| `event-logs` | `WhatsApp.jsx:1296` | rendered but not addressable |

**Navigation contract**

- The jump appends `&from=knowledge-base`, and the target section renders a "Back to Knowledge Base"
  control while that flag is present (FR-009).
- The jump must **push** a history entry, not replace. Note that `handleSetOpenPanel`
  (`WhatsApp.jsx:974-992`) navigates with `{ replace: true }` — correct for panel churn, but the
  initial jump must not inherit that, or the Knowledge Base entry is overwritten and Back cannot
  return to it.
- Adding `panelMap` keys is strictly additive: existing `?view=` URLs keep working unchanged.
