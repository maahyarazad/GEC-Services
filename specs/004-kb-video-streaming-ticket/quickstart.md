# Quickstart: Validating Ticketed Range Streaming

A manual validation guide — this repo has no test runner. Contract details live in [`contracts/knowledge-base-video.md`](contracts/knowledge-base-video.md); claim semantics in [`data-model.md`](data-model.md).

## Prerequisites

1. **Secret configured.** Add to `.env` (it is not there yet — the server will not boot without it):

   ```bash
   KB_VIDEO_TICKET_SECRET=<a long random value, DIFFERENT from JWT_SECRET>
   # optional
   KB_VIDEO_TICKET_TTL=7200
   ```

   Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

2. **At least one recording on disk**, e.g. `file_storage/knowledge_base/whatsapp-broadcast.mp4`. Without it every check below returns 404 — correctly, but uninformatively.

3. **An admin session cookie.** Sign in to the dashboard and copy the `a-usr` cookie value from DevTools → Application → Cookies:

   ```bash
   export ADMIN_COOKIE='<a-usr value>'
   export API=http://localhost:5501
   ```

4. Servers running: `npm start` (API) and the Vite dev server for the SPA.

## Scenario 1 — Boot fails closed without the secret

```bash
KB_VIDEO_TICKET_SECRET= node server.js
```

**Expect**: an immediate throw naming `KB_VIDEO_TICKET_SECRET`, before the server listens. **Not** a booted server that 500s on the first video request. Restore the variable afterwards.

## Scenario 2 — Mint a ticket

```bash
curl -s -b "a-usr=$ADMIN_COOKIE" \
  "$API/api/knowledge-base/videos/whatsapp-broadcast/ticket"
```

**Expect**: `200` with `{"streamingUrl":"/api/knowledge-base/videos/whatsapp-broadcast/stream?token=…","expiresIn":7200}`.

Save it: `export URL="$API$(curl -s -b "a-usr=$ADMIN_COOKIE" "$API/api/knowledge-base/videos/whatsapp-broadcast/ticket" | node -pe 'JSON.parse(require("fs").readFileSync(0)).streamingUrl')"`

**Without the cookie**, the same call must return `401` — the mint endpoint stays cookie-gated.

## Scenario 3 — Range streaming works with no cookie (the core of the feature)

```bash
curl -sI -r 0-1023 "$URL"
```

**Expect**: `206 Partial Content`, `Accept-Ranges: bytes`, `Content-Range: bytes 0-1023/<total>`, `Content-Length: 1024`. No cookie was sent — this is the proof the ticket alone authenticates, and that playback starts on a partial fetch instead of a full download.

```bash
curl -sI "$URL"                       # no Range → 200 + Accept-Ranges: bytes
curl -sI -r 999999999999- "$URL"      # past EOF → 416 + Content-Range: bytes */<total>
```

A `404` where `416` is expected means the `sendFile` error callback is flattening statuses — see `routes/knowledge_base.js`.

## Scenario 4 — Scope enforcement

```bash
# Ticket minted for whatsapp-broadcast, replayed against a different video
TOKEN=$(printf '%s' "$URL" | sed 's/.*token=//')
curl -so /dev/null -w '%{http_code}\n' \
  "$API/api/knowledge-base/videos/pdf-generator/stream?token=$TOKEN"
```

**Expect**: `404`. **A `200`/`206` here is a P0 failure** — it means the scope check is not comparing ids.

**If you get `404` on Scenario 3 as well**, the `vid` claim is being coerced with `Number()`: every slug becomes `NaN` and no ticket ever validates. See the correction in `contracts/knowledge-base-video.md` §4.

## Scenario 5 — Forged, absent and mangled tickets

```bash
curl -so /dev/null -w '%{http_code}\n' "$API/api/knowledge-base/videos/whatsapp-broadcast/stream"
curl -so /dev/null -w '%{http_code}\n' "$API/api/knowledge-base/videos/whatsapp-broadcast/stream?token=garbage"
# session token must NOT work as a ticket
curl -so /dev/null -w '%{http_code}\n' "$API/api/knowledge-base/videos/whatsapp-broadcast/stream?token=$ADMIN_COOKIE"
```

**Expect**: `404` for all three, with an identical body. The third is the domain-separation check — a session token signed with `JWT_SECRET` must be worthless here.

## Scenario 6 — Expiry

```bash
# restart the API with KB_VIDEO_TICKET_TTL=5, mint, then wait
KB_VIDEO_TICKET_TTL=5 npm start
# … mint as in Scenario 2, sleep 6, then:
curl -so /dev/null -w '%{http_code}\n' "$URL"
```

**Expect**: `206` immediately, `404` after the TTL passes. Restore the TTL afterwards.

## Scenario 7 — The ticket is not in the logs

With the API's stdout visible, repeat Scenario 3 and inspect the request log line from `server.js`.

**Expect**: the URL logged with the token redacted (e.g. `token=[redacted]`). A full JWT in the log means a short-lived credential has been made durable for anyone with log access.

## Scenario 8 — End-to-end in the browser

1. Open the dashboard → Knowledge Base → play a recorded topic.
2. **Expect**: the video starts within a second or two, not after a full download.
3. DevTools → Network: the first `…/stream?token=…` request is `206`, and the `<video>` element has **no** `crossorigin` attribute.
4. Drag the seek bar into an unbuffered region → a **new** `206` request appears with a later `Content-Range` start. If the whole file was fetched as one `200`, Range is not in play and progressive playback is not actually working.
5. Close and reopen the dialog → a fresh `…/ticket` call is made.
6. Test on iOS Safari if available: it issues its own probing Range requests and will refuse a source that only ever answers `200`.

## Scenario 9 — Nothing else regressed

```bash
curl -so /dev/null -w '%{http_code}\n' "$API/api/knowledge-base/videos/whatsapp-broadcast"          # 401 without cookie
curl -so /dev/null -w '%{http_code}\n' -b "a-usr=$ADMIN_COOKIE" "$API/api/knowledge-base/videos/whatsapp-broadcast"  # 200
curl -so /dev/null -w '%{http_code}\n' "$API/uploads/knowledge_base/whatsapp-broadcast.mp4"        # 404 (FR-020 guard)
```

The third is the one worth re-running every time: it confirms the static-mount guard still shadows the public path, which is what keeps the recordings unreadable without auth.

## Done when

- [ ] Server refuses to boot without `KB_VIDEO_TICKET_SECRET` (S1)
- [ ] Mint requires an admin cookie; stream requires none (S2, S3)
- [ ] `206` + `Content-Range` on Range, `416` past EOF (S3)
- [ ] Cross-video replay, forged, absent and session tokens all `404` (S4, S5)
- [ ] Expired ticket `404`s (S6)
- [ ] Token redacted in request logs (S7)
- [ ] Playback starts fast and seeking issues fresh Range requests (S8)
- [ ] Legacy endpoint and the `/uploads` guard unchanged (S9)
