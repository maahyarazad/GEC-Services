---

description: "Task list for ticketed Range streaming of Knowledge Base videos"
---

# Tasks: Ticketed Range Streaming for Knowledge Base Videos

**Input**: Design documents from `/specs/004-kb-video-streaming-ticket/`

**Prerequisites**: `plan.md` ✅, `research.md` ✅, `data-model.md` ✅, `contracts/knowledge-base-video.md` ✅, `quickstart.md` ✅

**Tests**: No automated test tasks. This repo has no test runner configured (no `test` script in `package.json`, no `tests/` tree), and neither the plan nor the request asked for TDD. Verification is the manual `quickstart.md` procedure, referenced by scenario number in the tasks below.

**Spec note**: There is no `spec.md` for 004 — the feature arrived as a direct request plus a module, extending `specs/001-admin-knowledge-base/` (FR-020). The three user stories below are derived from `plan.md` and the contract. Run `/speckit-specify` if a formal spec is wanted; nothing here depends on it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3
- Exact file paths are given in every task

## Path Conventions

Express API + React SPA at repository root: `services/`, `routes/`, `middleware/`, `server.js`, `public/src/`. No new directories are introduced.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration that must exist before the ticket module can even be `require()`d

- [X] T001 Generate a ticket signing secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and add it to `.env` as `KB_VIDEO_TICKET_SECRET=<value>`; it MUST differ from the existing `JWT_SECRET` value in that file
- [X] T002 [P] Add `KB_VIDEO_TICKET_TTL=7200` to `.env` as an explicit, documented default (the module falls back to 7200 when it is absent or non-numeric)
- [X] T003 [P] Confirm at least one recording exists at `file_storage/knowledge_base/whatsapp-broadcast.mp4`; without it every endpoint below correctly returns 404 and nothing can be validated
- [X] T004 [P] Verify `jsonwebtoken` resolves at runtime with `node -e "require('jsonwebtoken')"` (declared at `package.json:38`; no install expected)

**Checkpoint**: The secret exists and differs from `JWT_SECRET`; a video file is on disk.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The ticket service every story depends on. **This phase carries the two P0 corrections from `plan.md` § "Blocking defects" — shipping the supplied module verbatim produces a feature that fails 100% of the time.**

**⚠️ CRITICAL**: No user story work can begin until T005–T007 are complete

- [X] T005 Create `services/kbVideoTicket.js` from the supplied module verbatim — keeping the dedicated `KB_VIDEO_TICKET_SECRET`, the boot-time `throw` when it is unset, `PURPOSE = "kb-video"`, `DEFAULT_TTL_SECONDS = 7200`, the `parseTtl`/`ttlSeconds` pair, the `algorithms: ["HS256"]` pin in `verifyVideoTicket`, the uniform `null` return on every failure, and the same `module.exports` surface
- [X] T006 In `services/kbVideoTicket.js`, fix the video-id coercion: sign with `vid: String(videoId)` instead of `Number(videoId)`, and compare with `if (String(payload.vid) !== String(videoId)) return null;` — catalogue ids are slugs (`"whatsapp-broadcast"`, see `VIDEO_FILES` at `routes/knowledge_base.js:24`), so `Number()` yields `NaN` and `NaN !== NaN` rejects every ticket the module itself signed (per `data-model.md` §1 validation rule 3)
- [X] T007 Verify the module in isolation: `node -e "const t=require('./services/kbVideoTicket'); const {token}=t.signVideoTicket({videoId:'whatsapp-broadcast',userId:'a'}); console.log(!!t.verifyVideoTicket(token,'whatsapp-broadcast'), t.verifyVideoTicket(token,'pdf-generator'));"` — must print `true null`. Anything else means T006 was not applied correctly
- [X] T008 [P] Confirm the fail-closed path by running `KB_VIDEO_TICKET_SECRET= node -e "require('./services/kbVideoTicket')"` — it must throw naming the variable (quickstart Scenario 1)

**Checkpoint**: `signVideoTicket`/`verifyVideoTicket` round-trip correctly for slug ids and reject cross-video replay.

---

## Phase 3: User Story 1 - Play a tutorial without depending on a third-party cookie (Priority: P1) 🎯 MVP

**Goal**: An admin opens a Knowledge Base topic and the recording plays, authenticated by a short-lived ticket in the URL rather than by the `a-usr` cookie — removing the dependency on cross-origin cookie delivery that Safari ITP and Chrome's third-party-cookie phase-out break.

**Independent Test**: With the API and SPA running, open Knowledge Base → play a topic. The video plays. In DevTools → Network the request is `…/stream?token=…`, the `<video>` element has no `crossorigin` attribute, and no `a-usr` cookie is attached to the stream request (quickstart Scenarios 2, 8).

### Implementation for User Story 1

- [X] T009 [US1] Add `GET /api/knowledge-base/videos/:videoId/ticket` to `routes/knowledge_base.js`: resolve `req.params.videoId` through the existing `VIDEO_FILES` map, 404 with `{ error: "Video not found" }` for an unknown id, run the same `path.resolve` + `startsWith(VIDEO_DIR + path.sep)` + `fs.existsSync` checks the current video route uses, then call `signVideoTicket({ videoId: req.params.videoId, userId: req.user?.username || req.user?.email || req.user?.role || null })` and respond `{ streamingUrl, expiresIn }` where `streamingUrl` is `/api/knowledge-base/videos/<videoId>/stream?token=<token>` — do not return the raw `token` as its own field (contract §1)
- [X] T010 [US1] Add a `GET /api/knowledge-base/videos/:videoId/stream` handler in `routes/knowledge_base.js` on a **separate exported router** (e.g. `module.exports.streamRouter`) that is NOT covered by the file's `router.use("/api/knowledge-base", authorize.authorize_admin)` line: call `verifyVideoTicket(req.query.token, req.params.videoId)`, return `404 { error: "Video not found" }` when it is `null`, and otherwise reuse the existing map lookup, path assertion, existence check and `res.sendFile(absolutePath, { acceptRanges: true }, cb)` — including the error callback that passes a non-404 `err.status` (i.e. 416) straight through instead of flattening it
- [X] T011 [US1] Mount the stream router in `server.js` **above** `app.use("/api/", authorize.authorize_admin)` (currently line 105), with a comment explaining the ordering the same way the `/uploads/knowledge_base` guard at lines 107–118 does — registered below the gate, a cookie-less ticketed request is 401'd before `verifyVideoTicket` ever runs (`research.md` R4)
- [X] T012 [US1] Verify the two routes with curl before touching the client: mint with `-b "a-usr=$ADMIN_COOKIE"` → 200 with a `streamingUrl`; mint without the cookie → 401; fetch the `streamingUrl` with **no** cookie → 200/206 (quickstart Scenarios 2, 3)
- [X] T013 [US1] Rewrite the source resolution in `public/src/components/Dashboard/KnowledgeBase/VideoDialog.jsx`: on `open`, `fetch(`${SERVER_URL}/api/knowledge-base/videos/${topic.video.videoId}/ticket`, { credentials: "include" })`, store the returned `streamingUrl` in state, and render `<video src={`${SERVER_URL}${streamingUrl}`}>` only once it has resolved — mounting `<video>` with an empty `src` fires `onError` immediately and latches the failure panel (`research.md` R7)
- [X] T014 [US1] In the same file, delete the `isCrossOrigin` computation and the `crossOrigin="use-credentials"` spread, plus the block comment above them describing cookie delivery — the stream request is no longer cookie-authenticated, and opting into credentials would reinstate exactly the third-party-cookie dependency this story removes
- [X] T015 [US1] In the same file, route a failed or non-OK ticket fetch into the existing `failed` state so the current "This tutorial video is currently unavailable" panel is reused, and reset `streamingUrl` alongside `failed` in the existing `useEffect` on `[open, topic?.id]` so a stale URL from a previously-viewed topic can never be played
- [X] T016 [US1] Confirm `logKnowledgeBaseView(topic.id, "video_played")` still fires from the `onPlay` handler and still uses its own cookie-authenticated `POST /api/knowledge-base/views` — telemetry stays out of the stream route because a browser issues several Range requests per view and counting them there would inflate the numbers (`data-model.md` §4)

**Checkpoint**: A tutorial plays end-to-end via ticket auth, with no cookie on the stream request. This is the MVP.

---

## Phase 4: User Story 2 - Seek and resume without re-downloading (Priority: P2)

**Goal**: Range requests drive playback, so the video starts on a partial fetch and a seek into an unbuffered region fetches only that region — instead of buffering the whole file before the first frame.

**Independent Test**: `curl -sI -r 0-1023 "$URL"` returns `206` with `Content-Range: bytes 0-1023/<total>`; dragging the seek bar in the browser produces a new `206` with a later range start (quickstart Scenarios 3, 8).

### Implementation for User Story 2

- [X] T017 [US2] Verify Range behaviour against the stream endpoint per quickstart Scenario 3: no `Range` → `200` with `Accept-Ranges: bytes`; `-r 0-1023` → `206` with a correct `Content-Range` and `Content-Length: 1024`; `-r 999999999999-` → `416` with `Content-Range: bytes */<total>`
- [X] T018 [US2] If `416` comes back as `404`, repair the `sendFile` error callback in the stream handler in `routes/knowledge_base.js` so `err.status && err.status !== 404` is re-sent unchanged — a 404 there would tell a client that asked for a byte range past EOF that the video does not exist
- [ ] T019 [US2] Confirm in DevTools → Network that a seek into an unbuffered region issues a **new** `206` with a later `Content-Range` start; a single `200` for the whole file means Range is not in play and progressive playback is not actually working (quickstart Scenario 8, step 4)
- [X] T020 [US2] Confirm `preload="metadata"` is still set on the `<video>` element in `public/src/components/Dashboard/KnowledgeBase/VideoDialog.jsx` so the initial request is a metadata-sized Range rather than a full-file GET
- [ ] T021 [US2] Test playback on iOS Safari if a device is available — it issues its own probing Range requests and refuses a source that only ever answers `200`. If no device is available, record that explicitly as unverified rather than checking this box

**Checkpoint**: Playback is progressive and seeking is cheap on desktop, with iOS either verified or explicitly recorded as unverified.

---

## Phase 5: User Story 3 - A leaked or replayed ticket buys nothing (Priority: P3)

**Goal**: The ticket in the URL is a narrow, short-lived, single-video credential — it cannot be replayed against another video, cannot outlive its TTL, cannot be forged, is not interchangeable with a session token, and does not survive in logs.

**Independent Test**: Cross-video replay, forged, absent and session-token requests all return an identical `404`; an expired ticket returns `404`; the request log shows the token redacted (quickstart Scenarios 4, 5, 6, 7).

### Implementation for User Story 3

- [X] T022 [US3] Redact the ticket in the request logger at `server.js:98` — replace the `token` query value before printing `req.url` (e.g. `req.url.replace(/([?&]token=)[^&]+/, "$1[redacted]")`) so a deliberately short-lived credential is not made durable in stdout and any aggregated log store (`research.md` R6)
- [X] T023 [P] [US3] Verify scope enforcement per quickstart Scenario 4: a ticket minted for `whatsapp-broadcast` replayed against `pdf-generator` must return `404`. A `200`/`206` here is a P0 — it means T006's string comparison is not in effect
- [X] T024 [P] [US3] Verify rejection of an absent token, a garbage token, and an `a-usr` session token used as a ticket — all three must return `404` with an identical body (quickstart Scenario 5). The third is the domain-separation check: a token signed with `JWT_SECRET` must be worthless on this route
- [X] T025 [P] [US3] Verify expiry per quickstart Scenario 6: restart the API with `KB_VIDEO_TICKET_TTL=5`, mint a ticket, confirm `206` immediately and `404` after 6 seconds, then restore the TTL
- [X] T026 [US3] Confirm every rejection path in the stream handler in `routes/knowledge_base.js` returns the same `404 { error: "Video not found" }` — an unknown id, a missing file and a bad ticket must be indistinguishable, so the endpoint cannot be used to enumerate which recordings exist
- [X] T027 [US3] Verify token redaction is actually in effect by repeating a stream request with the API's stdout visible (quickstart Scenario 7)

**Checkpoint**: The ticket is confined to one video, one time window, and one purpose, and it does not leak into logs.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T028 [P] Verify no regressions per quickstart Scenario 9: the legacy `GET /api/knowledge-base/videos/:videoId` still 401s without a cookie and 200s with one, and `GET /uploads/knowledge_base/whatsapp-broadcast.mp4` still returns `404` (the FR-020 static-mount guard)
- [X] T029 [P] Document `KB_VIDEO_TICKET_SECRET` and `KB_VIDEO_TICKET_TTL` as deployment prerequisites wherever this project records env setup — the module throws at `require()`, so a deploy that misses the secret is a server that will not boot
- [X] T030 [P] Add a short comment above the legacy `GET /api/knowledge-base/videos/:videoId` route in `routes/knowledge_base.js` recording that it is retained as a fallback while the ticketed path is field-verified, and that no client code references it after this change (`plan.md` § Backward compatibility)
- [ ] T031 Work through `specs/004-kb-video-streaming-ticket/quickstart.md` end to end and tick its "Done when" list; leave any item unchecked and stated rather than assumed, the way `specs/003-twilio-optout-webhook/plan.md` records its unverified live-Twilio items
- [X] T032 After the ticketed path has been field-verified, open a follow-up to retire the legacy cookie-authenticated video route — removing it in this change would leave no fallback if ticket minting misbehaves in production

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Needs T001 (the secret) or the module throws on `require()`. **Blocks all user stories.**
- **US1 (Phase 3)**: Needs Phase 2. Nothing else depends on US1 being *finished*, but US2 and US3 have nothing to exercise without T009–T012
- **US2 (Phase 4)**: Needs T009–T012 (the routes). Independent of US3
- **US3 (Phase 5)**: Needs T009–T012. Independent of US2. T022 touches `server.js` and must not run concurrently with T011
- **Polish (Phase 6)**: Needs the stories you intend to ship

### Critical path

T001 → T005 → T006 → T007 → T009 → T010 → T011 → T012 → T013

T006 is the single highest-risk task in the list: skip it and every ticket the system signs is rejected by the system's own verifier, with a `404` that looks exactly like a missing file.

### Within US1

- T009 and T010 both edit `routes/knowledge_base.js` — sequential
- T011 (`server.js`) after T010, since it mounts what T010 exports
- T012 gates the client work: proving the API with curl first means a later failure in the browser is unambiguously a client bug
- T013 → T014 → T015 all edit `VideoDialog.jsx` — sequential
- T016 is a read-only confirmation and can happen any time after T013

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 in parallel (T001 first — T005 needs it)
- **Phase 2**: T008 in parallel with T007
- **Phase 5**: T023, T024, T025 are independent read-only curl checks — run together
- **Phase 6**: T028, T029, T030 in parallel
- **Across stories**: once T012 passes, US2 and US3 can be worked in parallel by different people; only T022's `server.js` edit needs coordination

### Parallel Example: Phase 5 verification

```bash
# after T022 is deployed, run T023, T024, T025 concurrently
curl -so /dev/null -w 'cross-video: %{http_code}\n' "$API/api/knowledge-base/videos/pdf-generator/stream?token=$TOKEN" &
curl -so /dev/null -w 'no-token:    %{http_code}\n' "$API/api/knowledge-base/videos/whatsapp-broadcast/stream" &
curl -so /dev/null -w 'garbage:     %{http_code}\n' "$API/api/knowledge-base/videos/whatsapp-broadcast/stream?token=garbage" &
curl -so /dev/null -w 'session-tok: %{http_code}\n' "$API/api/knowledge-base/videos/whatsapp-broadcast/stream?token=$ADMIN_COOKIE" &
wait   # all four must print 404
```

---

## Implementation Strategy

### MVP (US1 only — T001 through T016)

Delivers the whole point of the feature: playback authenticated by ticket rather than by a cross-origin cookie. US2 and US3 are verification-and-hardening layers over routes that already exist by then, so US1 is genuinely shippable on its own — with the caveat that T022's log redaction is one line and worth pulling forward if anything is deployed anywhere with log aggregation.

### Incremental delivery

1. Phase 1 + 2 → the ticket service is proven correct in `node -e` before any HTTP exists
2. Phase 3 → the feature works; stop here for a demo
3. Phase 4 → prove the Range behaviour that motivated the change
4. Phase 5 → prove the credential is as narrow as it claims to be
5. Phase 6 → confirm nothing regressed, then plan retirement of the legacy route

### What is deliberately not here

No automated tests, because the repo has no runner to hang them on — adding one is a larger decision than this feature should make unilaterally. No `spec.md`. No change to `VIDEO_FILES`, path resolution, or the view-log table.

---

## Implementation status — 2026-08-26

Implemented on branch `004-kb-video-streaming-ticket`. 29 of 32 tasks complete; the three open ones all need a real browser and are listed below with what was verified in their place.

**Open**

- **T019** (seek issues a fresh `206` in DevTools) — the server side is proven: a mid-file `Range: bytes=20000000-20001023` returns `206` with `Content-Range: bytes 20000000-20001023/53067320`. What is unverified is that the browser actually issues that request on a seek rather than refetching from 0. Needs DevTools on a running SPA.
- **T021** (iOS Safari) — no device available in this session.
- **T031** (walk `quickstart.md` end to end) — Scenarios 1–7 and 9 were executed against a live server on port 5599 and all pass; Scenario 8 (browser end-to-end) is the gap, and is the same gap as T019/T021.

**Notes on completed tasks**

- **T018** was a no-op: `416` already passed through correctly on the first run, because the stream route reuses the same `sendVideo` error callback as the legacy route rather than reimplementing it.
- **T029**: this project documents environment variables in `.env` itself (see the `# JWT_SECRETS` header there), not in a README section or a `.env.example` — neither exists. Both new variables were added there under a comment block explaining the boot-time failure and why the secret must differ from `JWT_SECRET`.
- **T032**: recorded as a comment above the legacy route in `routes/knowledge_base.js` rather than an issue, since this repo has no issue tracker wired in.
- The plan named the session secret `ACCESS_TOKEN_SECRET`; the variable this codebase actually uses for admin sessions is `JWT_SECRET` (`middleware/auth.js`). The error message and comments in `services/kbVideoTicket.js` name `JWT_SECRET` accordingly.

**Verified against a live server (port 5599)**

| Check | Result |
|---|---|
| Mint without admin cookie | `401` |
| Mint with admin cookie | `200` + `streamingUrl` |
| Mint for a declared-but-absent recording | `404` |
| Stream with ticket, **no cookie** | `200`, `Accept-Ranges: bytes` |
| `Range: bytes=0-1023` | `206`, `Content-Range: bytes 0-1023/53067320` |
| `Range: bytes=20000000-20001023` | `206`, correct `Content-Range` |
| Range past EOF | `416`, `Content-Range: bytes */53067320` |
| Cross-video replay of a valid ticket | `404` |
| Absent / garbage / session token as ticket | `404` each, identical body |
| Ticket expiry (`KB_VIDEO_TICKET_TTL=5`) | `206` immediately, `404` after 7s |
| Token in request log | `token=[redacted]` |
| Legacy route without / with cookie | `401` / `200`, `206` on Range |
| `/uploads/knowledge_base/*.mp4` guard | `404` |
| `POST /api/knowledge-base/views` | `204` |
| `eslint` on `VideoDialog.jsx` | clean |
