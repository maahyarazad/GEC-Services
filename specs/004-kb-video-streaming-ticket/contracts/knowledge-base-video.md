# Contract: Knowledge Base Video Endpoints

Two new endpoints plus one retained legacy endpoint. Ids are catalogue slugs (`whatsapp-broadcast`, `pdf-generator`, …) drawn from `VIDEO_FILES` in `routes/knowledge_base.js`.

---

## 1. `GET /api/knowledge-base/videos/:videoId/ticket`

Mints a streaming ticket for one video and one admin.

**Auth**: admin session cookie `a-usr` (the existing `authorize_admin`). Cross-origin callers must send `credentials: "include"`; `CLIENT_ORIGIN` is already allowed with `credentials: true` in the CORS config.

**Path params**: `videoId` — must be a key of `VIDEO_FILES`.

**Responses**

| Status | Body | When |
|---|---|---|
| `200` | `{ "streamingUrl": "/api/knowledge-base/videos/whatsapp-broadcast/stream?token=eyJ…", "expiresIn": 7200 }` | Admin authenticated, id known. |
| `401` | `{ "authenticated": false, "message": "Unauthorized" }` | No/invalid admin session (emitted by `authorize_admin`). |
| `404` | `{ "error": "Video not found" }` | Unknown `videoId`, **or** the declared file is absent from disk. Identical body in both cases so the endpoint cannot enumerate what exists. |

**Notes**
- `streamingUrl` is root-relative; the client prefixes `VITE_SERVERURL`.
- The raw `token` is not returned as its own field — folding it into the URL keeps exactly one thing for the client to use, and no second place for it to be logged or stored.
- The existence check runs at mint time as well as stream time, so a missing recording surfaces as a clean 404 in the dialog rather than as a `<video>` error event.

---

## 2. `GET /api/knowledge-base/videos/:videoId/stream?token=<jwt>`

Streams the recording with full Range support.

**Auth**: the ticket only. No cookie is read, no `Authorization` header is consulted. **This route must be registered before `app.use("/api/", authorize.authorize_admin)` in `server.js`**, or the global gate 401s it before the ticket is examined.

**Query params**: `token` (required) — a `kb-video` JWT whose `vid` equals `videoId`.

**Request headers**: `Range: bytes=<start>-<end>` (optional; sent by the browser for `preload="metadata"` and on every seek).

**Responses**

| Status | Headers | When |
|---|---|---|
| `200` | `Content-Type: video/mp4`, `Content-Length`, `Accept-Ranges: bytes` | No `Range` header — whole file. |
| `206` | `Content-Range: bytes <start>-<end>/<total>`, `Content-Length`, `Accept-Ranges: bytes` | Satisfiable `Range`. The normal playback and seek path. |
| `404` | `{ "error": "Video not found" }` | Missing/invalid/expired/mis-scoped ticket, unknown id, or file absent — **one uniform response for all of them**. |
| `416` | `Content-Range: bytes */<total>` | Range past end of file. Passed through from `send`, not flattened to 404. |

**Guarantees**
- `Accept-Ranges: bytes` is always advertised, so browsers enable the seek bar before the file is buffered.
- A `404` never distinguishes an auth failure from a missing file.
- Response caching is per-viewer at best; the URL contains a credential, so it must not be cached by shared proxies.

**Example**

```bash
# Mint (as an admin)
curl -s -b "a-usr=$ADMIN_COOKIE" \
  http://localhost:5501/api/knowledge-base/videos/whatsapp-broadcast/ticket
# → {"streamingUrl":"/api/knowledge-base/videos/whatsapp-broadcast/stream?token=eyJ…","expiresIn":7200}

# Range request with the ticket, no cookie
curl -sI -r 0-1023 "http://localhost:5501/api/knowledge-base/videos/whatsapp-broadcast/stream?token=eyJ…"
# → HTTP/1.1 206 Partial Content
#   Accept-Ranges: bytes
#   Content-Range: bytes 0-1023/48210944
```

---

## 3. `GET /api/knowledge-base/videos/:videoId` *(retained, unchanged)*

The original cookie-authenticated endpoint. Kept as a fallback while the ticketed path is field-verified; no client code references it after this change. Behaviour, statuses and Range handling are exactly as they are today.

---

## 4. Service contract — `services/kbVideoTicket.js`

```js
signVideoTicket({ videoId: string, userId: string|null })
  → { token: string, expiresIn: number }

verifyVideoTicket(token: string|undefined, videoId: string)
  → payload | null      // null for EVERY failure; callers must not branch on the reason

ttlSeconds() → number   // KB_VIDEO_TICKET_TTL, or 7200
PURPOSE = "kb-video"
DEFAULT_TTL_SECONDS = 7200
```

**Required correction to the supplied module**: `vid` must be stored and compared as a string. `Number(videoId)` on a slug yields `NaN`, and `NaN !== NaN` is always true, so `verifyVideoTicket` would reject every ticket it signed.

```js
// sign
vid: String(videoId),
// verify
if (String(payload.vid) !== String(videoId)) return null;
```

Everything else in the supplied module — the dedicated secret, the boot-time throw on an unset secret, the `algorithms: ["HS256"]` pin, the `purpose` claim, and the uniform `null` return — is correct as written and should be kept verbatim.
