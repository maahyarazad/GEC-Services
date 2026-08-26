# Phase 0 Research: Ticketed Range Streaming

All Technical Context unknowns are resolved below; no `NEEDS CLARIFICATION` markers remain.

## R1. How does a `<video>` element authenticate against an admin-only endpoint?

**Decision**: A short-lived, video-scoped JWT ticket in the query string, minted by a separate cookie-authenticated endpoint.

**Rationale**: A media element issues its own requests; there is no hook to attach an `Authorization` header. That leaves three carriers — cookie, query string, or fetch-then-blob. The cookie works only same-origin or with `crossOrigin="use-credentials"` plus a CORS origin echo, and even then it is a third-party cookie in any split-origin deployment, which Safari ITP blocks outright and Chrome is phasing out. The query string is carried by the browser unconditionally, on the initial request and on every subsequent Range request, which is precisely what progressive playback needs.

**Alternatives considered**:
- *Keep the cookie (`crossOrigin="use-credentials"`)* — what the code does today. Works in the current dev setup, silently fails wherever third-party cookies are restricted, and the failure surfaces only as a video that will not load.
- *MediaSource Extensions with `fetch` + `Authorization`* — full header control, but it means owning buffer management, codec strings and seek logic, and it does not work on iOS Safari without extra work. Enormous cost to avoid a query parameter.
- *Signed URL with an HMAC of `videoId + expiry`* — functionally similar and dependency-free, but the project already depends on `jsonwebtoken`, and JWT gives expiry, claims and algorithm pinning without hand-rolling them.

## R2. Why not the session token in the query string?

**Decision**: A dedicated ticket, signed with `KB_VIDEO_TICKET_SECRET` — a key distinct from `JWT_SECRET`.

**Rationale**: A URL leaks by nature: browser history, `Referer`, screenshots, copy-paste into a chat, proxy and CDN logs. A leaked session token is total account compromise; a leaked ticket is read access to one already-catalogued tutorial video, for a bounded window. The separate key makes cross-domain use cryptographically impossible rather than merely checked — a bug in the `purpose` comparison cannot promote a ticket into a session token — and lets tickets be rotated without logging every admin out.

**Alternatives considered**: Reuse `JWT_SECRET` with only the `purpose` claim separating the domains — rejected, since it makes one claim comparison the sole barrier between a video ticket and a full admin session.

## R3. Does `res.sendFile` need to be replaced with manual Range handling?

**Decision**: No. Keep `res.sendFile(absolutePath, { acceptRanges: true })`.

**Rationale**: `sendFile` delegates to `send`, which parses `Range`, emits `206 Partial Content` with a correct `Content-Range`, advertises `Accept-Ranges: bytes`, and returns `416` with a `Content-Range: bytes */<size>` for unsatisfiable ranges. Hand-rolling `fs.createReadStream(path, { start, end })` reproduces this and adds the classic off-by-one on the inclusive `end` byte, plus multi-range and `If-Range` handling that `send` already covers. The existing error callback in `routes/knowledge_base.js` deliberately passes non-404 statuses through so a 416 is not flattened into a 404 — that nuance is already correct and is retained.

**Alternatives considered**: Manual `fs.createReadStream` — rejected; strictly more code for strictly less correctness.

## R4. How does a ticketed request get past the global `/api/` admin gate?

**Decision**: Mount the stream route on its own router registered in `server.js` **before** `app.use("/api/", authorize.authorize_admin)`.

**Rationale**: Express matches middleware in registration order. Registered after the gate, a cookie-less ticketed request is 401'd before `verifyVideoTicket` runs — the feature would appear entirely broken with a misleading error. The repo already relies on this ordering rule intentionally: the `/uploads/knowledge_base` 404 guard sits above the `express.static` mount for the same reason, with a comment warning that below it the guard becomes dead code. This keeps the exemption to exactly one path.

**Alternatives considered**: Make `authorize_admin` itself recognise a ticket and skip. Rejected — it puts ticket-parsing on the hot path of every `/api/` route, where a mistake in the skip condition is an API-wide auth bypass rather than a single-route bug.

## R5. Ticket lifetime

**Decision**: Default 7200s (2h), overridable via `KB_VIDEO_TICKET_TTL`, minted fresh each time the dialog opens.

**Rationale**: It must comfortably exceed the longest recording plus pauses and seeks, or playback dies mid-video with an opaque error. Two hours clears any plausible tutorial length by a wide margin while keeping a copy-pasted URL short-lived. Because a ticket is minted per dialog-open, the TTL never has to cover a whole admin session.

**Alternatives considered**: Very short TTL (5 min) with in-player renewal — rejected as unnecessary complexity: swapping `video.src` mid-playback interrupts the stream, and the asset being protected is an internal tutorial, not a paid asset.

## R6. Keeping the ticket out of logs

**Decision**: Redact the `token` parameter in the request logger at `server.js:98`.

**Rationale**: That logger prints `req.url` verbatim for every request, so without redaction every ticket lands in stdout and any aggregated log store — turning a deliberately short-lived, narrowly-scoped credential into a durable one for anyone with log access. Redaction at the single logging site is complete, because that is the only place the raw URL is written.

**Alternatives considered**: Ticket in a `Cookie` set by the mint endpoint scoped to the stream path — avoids the URL entirely, but re-introduces the exact cross-origin cookie problem R1 exists to escape.

## R7. Client rendering while the ticket is in flight

**Decision**: Render `<video>` only after `streamingUrl` resolves; reuse the existing `failed` state for a ticket-fetch failure.

**Rationale**: Mounting `<video>` with an empty or partial `src` fires `onError` immediately and would latch the "currently unavailable" panel before the ticket ever arrives. Gating the element on the resolved URL avoids a spurious error path, and reusing `failed` means no new UI surface has to be designed or translated.
