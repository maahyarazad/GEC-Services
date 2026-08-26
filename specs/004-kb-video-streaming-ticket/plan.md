# Implementation Plan: Ticketed Range Streaming for Knowledge Base Videos

**Branch**: `003-twilio-optout-webhook` (planned as `004-kb-video-streaming-ticket`) | **Date**: 2026-08-26 | **Spec**: extends [`specs/001-admin-knowledge-base/spec.md`](../001-admin-knowledge-base/spec.md) (FR-020)

**Input**: User description: "Use streamingUrl and range to stream the video in the Knowledgebase and use the token to verify the admin user", plus the supplied `signVideoTicket` / `verifyVideoTicket` module.

> **Placement note**: `setup-plan.sh` resolves the plan path from the active git branch, which is `003-twilio-optout-webhook` (WhatsApp opt-out webhook — unrelated). This plan was written to a new folder rather than overwriting that feature's `plan.md`. Move it under a `004-…` branch when one is cut; nothing here depends on the folder name.

## Summary

The Knowledge Base video endpoint is admin-only and is gated by the httpOnly `a-usr` cookie. A `<video>` element cannot attach an `Authorization` header, and cross-origin cookie delivery (dev: SPA on `:5175`, API on `:5501`; and any deployment where the API is on another host) depends on `crossOrigin="use-credentials"` plus browser third-party-cookie policy — which Safari's ITP and Chrome's third-party cookie phase-out make unreliable. The fallback of fetching bytes through axios into a blob buffers the entire file and discards HTTP Range, so playback waits for a complete download and seeking is impossible.

The fix is a short-lived, video-scoped **streaming ticket**: an admin-authenticated JSON call mints a JWT scoped to one video and one admin, and returns a `streamingUrl` carrying that ticket in the query string. The browser then requests that URL directly as `<video src>`, with no cookie, no header and no blob — so `res.sendFile()`'s existing Range support (206 / `Accept-Ranges` / 416) drives progressive playback and seeking natively.

## Technical Context

**Language/Version**: Node.js (CommonJS), React 18 + Vite for the SPA

**Primary Dependencies**: `express`, `jsonwebtoken` ^9.0.2 (already installed), `send` (via `res.sendFile`), `@mui/material`

**Storage**: Video files on disk in `file_storage/knowledge_base/`; view telemetry in SQLite (`knowledge_base_view_log`). Tickets are **stateless** — nothing is persisted.

**Testing**: No test runner is configured in this repo; validation is the manual `quickstart.md` procedure plus `curl -r` Range checks.

**Target Platform**: Modern desktop + mobile browsers, explicitly including iOS Safari (which issues its own probing Range requests and will not play a source that answers 200-only).

**Project Type**: Web application — Express API (`routes/`, `services/`, `middleware/`) + React SPA (`public/src/`).

**Performance Goals**: First frame renders after the initial `preload="metadata"` Range response, not after a full-file download; a seek into an unbuffered region issues a new Range request rather than re-downloading from byte 0.

**Constraints**: The ticket must never be usable as a session token, must be scoped to a single video, and must expire. The token appears in a URL, so it must not reach logs, and it must not be long-lived enough for a copied URL to be a durable leak.

**Scale/Scope**: 10 catalogued recordings, a handful of admin users, one new service module, one new route, two touched files on the client.

## Constitution Check

`.specify/memory/constitution.md` is still the unmodified template — every principle is a `[PRINCIPLE_N_NAME]` placeholder, so there are no ratified gates to evaluate. **Status: PASS (vacuous).** The design instead holds itself to the security posture already established by FR-020 and `routes/knowledge_base.js`:

| Self-imposed gate | How this design satisfies it |
|---|---|
| Recordings unreachable without admin auth (FR-020) | Ticket minting sits behind `authorize_admin`; the stream route accepts nothing but a valid, unexpired, correctly-scoped ticket. |
| No path derived from user input | Unchanged — `VIDEO_FILES` map lookup, plus the existing `startsWith(VIDEO_DIR + path.sep)` assertion. |
| No new failure mode may break playback | Telemetry stays fire-and-forget; ticket fetch failure surfaces the existing "currently unavailable" panel. |
| Fail closed on misconfiguration | `KB_VIDEO_TICKET_SECRET` unset throws at `require()` — the server refuses to boot rather than 500ing per request. |

## Blocking defects in the supplied module

These must be resolved before the module is wired in; both are silent-failure classes, not style points.

1. **`Number(videoId)` cannot represent this catalogue's ids.** Video ids are slugs — `"whatsapp-broadcast"`, `"pdf-generator"` (see `VIDEO_FILES` in `routes/knowledge_base.js:24` and `knowledgeBase.catalog.js`). `Number("whatsapp-broadcast")` is `NaN`, and `NaN !== NaN` is always true, so `verifyVideoTicket` would return `null` for **every** ticket it ever signed — every video 403s, with no error explaining why. `vid` must carry the string id and be compared as `String(payload.vid) !== String(videoId)`.
2. **The global `/api/` cookie gate runs before the stream route.** `server.js:105` applies `authorize.authorize_admin` to everything under `/api/`, so a ticketed request with no `a-usr` cookie is rejected with 401 before `verifyVideoTicket` is ever consulted — which defeats the entire purpose. See "Mounting" below.

A third, lower-severity issue: `server.js:98` logs `req.url` for every request, which would write the ticket into stdout and any aggregated log. Redact it.

## Design

### Ticket lifecycle

```
Admin opens VideoDialog
   │
   ├─► GET /api/knowledge-base/videos/:videoId/ticket        [a-usr cookie, credentials: include]
   │      authorize_admin → signVideoTicket({videoId, userId})
   │   ◄── { streamingUrl: "/api/knowledge-base/videos/<id>/stream?token=…", expiresIn: 7200 }
   │
   └─► <video src={SERVER_URL + streamingUrl} preload="metadata">
          GET …/stream?token=…            (no cookie, no crossOrigin attribute)
          verifyVideoTicket(token, videoId) → payload | null
          null → 404   |   ok → res.sendFile(path, { acceptRanges: true })
                                     └─ send emits 206 + Content-Range on Range: bytes=…
```

### Mounting (the part that actually makes it work)

The stream route must be reachable without the `a-usr` cookie while every other `/api/knowledge-base/*` route stays cookie-gated. Two viable options; the plan picks the first:

- **Chosen — register a dedicated stream router in `server.js` *above* `app.use("/api/", authorize.authorize_admin)`.** Express matches middleware in registration order, so the ticket route resolves before the cookie gate is reached. This mirrors the existing `/uploads/knowledge_base` 404 guard, which is deliberately placed above the static mount for exactly the same ordering reason — a precedent already documented in `server.js:107-118`. It touches no shared auth code, so no other route's behaviour can shift.
- **Rejected — teach `authorize_admin` to skip when a valid ticket is present.** Every route under `/api/` would then depend on ticket-parsing logic, and a bug in the skip condition becomes an auth bypass across the whole API rather than on one path.

### Range

No hand-rolled Range parsing. `res.sendFile(path, { acceptRanges: true })` delegates to `send`, which already emits `Accept-Ranges: bytes`, `206 Partial Content` with a correct `Content-Range`, and `416` for unsatisfiable ranges. The existing error callback (`routes/knowledge_base.js:105-118`) already passes 416 through instead of flattening it to 404 — that behaviour is preserved verbatim.

### What changes on the client

`VideoDialog.jsx` currently builds `src` directly and sets `crossOrigin="use-credentials"`. It becomes: on open, `fetch` the ticket with `credentials: "include"`, hold `streamingUrl` in state, render `<video>` only once it arrives, and **drop the `crossOrigin` attribute** — the request is now unauthenticated-by-cookie, so opting into credentials would re-introduce the third-party-cookie dependency this feature exists to remove. A failed ticket fetch sets the existing `failed` state, so the "currently unavailable" panel is reused unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/004-kb-video-streaming-ticket/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output — ticket claims, no persistence
├── quickstart.md        # Phase 1 output — manual validation incl. curl Range checks
└── contracts/
    └── knowledge-base-video.md
```

### Source Code (repository root)

```text
services/
└── kbVideoTicket.js                     # NEW — sign/verify, corrected per "Blocking defects"

routes/
└── knowledge_base.js                    # MODIFIED — + /ticket route, + /stream route,
                                         #            existing /videos/:videoId retained

server.js                                # MODIFIED — mount stream router above the /api/ gate;
                                         #            redact `token` from the request log

.env                                     # MODIFIED — + KB_VIDEO_TICKET_SECRET, + KB_VIDEO_TICKET_TTL

public/src/components/Dashboard/KnowledgeBase/
└── VideoDialog.jsx                      # MODIFIED — fetch ticket, use streamingUrl, drop crossOrigin
```

**Structure Decision**: Existing Express-plus-SPA layout, unchanged. The ticket logic lands in `services/` alongside `optOutService.js` and `dbService.js` — it is pure, dependency-light and independently testable, which is exactly what that directory holds today.

## Backward compatibility

The current cookie-authenticated `GET /api/knowledge-base/videos/:videoId` stays in place and keeps working. Nothing else in the repo references it, so it can be retired in a follow-up once the ticketed path is field-verified — but removing it in the same change would leave no fallback if ticket minting misbehaves in production.

## Complexity Tracking

No constitution violations to justify (the constitution is an unfilled template). The one non-obvious structural choice — a second router mounted ahead of the global auth middleware — is recorded under "Mounting" above with its rejected alternative.
