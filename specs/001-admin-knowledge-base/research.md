# Phase 0 Research: Admin Knowledge Base

**Feature**: `001-admin-knowledge-base` | **Date**: 2026-08-18

All Technical Context unknowns are resolved below. No `NEEDS CLARIFICATION` remains.

---

## R1. How the jump control reaches a section — and an inner view

**Decision**: Reuse the dashboard's existing two-level URL addressing. Section level is
`/admin?tab=<slug>`; inner-view level is `/admin?tab=whatsapp-broadcast&view=<panel>`.
Add exactly two entries to an existing map to close the gap.

**Rationale**: The spec's FR-019 was written assuming inner views were not individually
reachable. Investigation showed that is already half-solved:

- `Dashboard.jsx:311-338` derives a slug from each `tabConfig` label and drives the active
  section from `?tab=`. On mount it resolves `?tab=` back to an index (`:320`); on tab change
  it pushes a new URL (`:334-338`). Section-level jumps therefore need **no new code**.
- `WhatsApp.jsx:956-972` already reads `?view=` on mount and maps it through `panelMap` to
  `setOpenPanel`. `handleSetOpenPanel` (`:974-992`) writes `?view=` back on every panel change.
  Ten panels are already addressable: `report`, `report-type`, `report-type-attendance`,
  `response-logs`, `delivery-logs`, `contact-book`, `event-list`, `update-map-url`,
  `report-missing-sid`, `guest-list`.

The gap is narrow: two panels are rendered but absent from `panelMap`, so their URLs are inert —
`create-template` (`WhatsApp.jsx:1316`) and `event-logs` (`WhatsApp.jsx:1296`). Adding both to
`panelMap` makes every destination this feature needs addressable.

**Destination mapping** (final):

| Topic | Destination URL | Status |
|---|---|---|
| WhatsApp Broadcast (parent) | `?tab=whatsapp-broadcast` | works today |
| — Create Twilio templates | `?tab=whatsapp-broadcast&view=create-template` | **needs `panelMap` entry** |
| — Configure event auto-response | `?tab=whatsapp-broadcast&view=event-list` | works today |
| — Manage the guest list | `?tab=whatsapp-broadcast&view=guest-list` | works today |
| — Contact list → guest list | `?tab=whatsapp-broadcast&view=contact-book` | works today |
| WhatsApp reporting | `?tab=whatsapp-broadcast&view=report` | works today |
| Place ID Finder | `?tab=place-id-finder` | works today |
| PDF Generator | `?tab=pdf-generator` | works today |
| Registration (internal) | `?tab=registration-config` | works today |
| Registration (external sources) | `?tab=registration-config` | works today |

**Alternatives considered**:

- *Build a new deep-link registry / route table.* Rejected — duplicates a working mechanism and
  would leave two competing navigation models in one dashboard.
- *Point every WhatsApp sub-topic at the section root (spec option A).* Rejected by the user's
  clarification, and unnecessary: the addressing already exists.
- *Deep-link the auto-response dialog itself.* Rejected — the dialog in `EventSection.jsx:145-148`
  is bound to a specific event row (`autoResponseTarget`), so it cannot open without choosing an
  event first. The event list is the correct, stable landing point.

---

## R2. Where the catalogue lives

**Decision**: A single client-side module, `public/src/components/Dashboard/KnowledgeBase/knowledgeBase.catalog.js`,
exporting a frozen array of topic objects. No database table, no CRUD endpoints, no admin editing UI.

**Rationale**: FR-017 fixes the catalogue in the application; content changes ship with a release.
A plain module is the smallest thing that satisfies that, keeps topic titles reviewable in a diff,
and lets the jump destinations sit literally next to the topics they belong to. Video *files* are
still dropped onto the server without a deploy — only the catalogue entry describing a video needs
a release.

**Alternatives considered**:

- *SQLite table seeded by `create_tables.sql`.* Rejected — adds a migration, a read endpoint, and
  a loading state for data that is constant per release, with no editing capability to justify it.
- *JSON file read at runtime by the server.* Rejected — same deploy cadence as a JS module but with
  an extra fetch, an extra failure mode, and no type-checking at build time.

---

## R3. Serving tutorial videos to admins only

**Decision**: Store recordings under `file_storage/knowledge_base/`, as the user specified. Serve
them **only** through a new authenticated route `GET /api/knowledge-base/videos/:videoId`, guarded by
the existing `authorize_admin` middleware. Mount a guard on `/uploads/knowledge_base` *before* the
existing static handler so the public path returns 404.

**Rationale**: This is the security requirement FR-020 exists for. `server.js:106` currently does:

```js
app.use("/uploads", express.static(path.join(__dirname, "file_storage")));
```

Anything under `file_storage/` is world-readable at `/uploads/<name>` with no session. Tutorials
covering Twilio template setup, guest-list handling, and registration procedures are internal
operational material and must not be. Ordering matters: Express matches middleware in registration
order, so the guard must be registered above line 106 to take effect.

Authentication carries itself: `authorize_admin` (`middleware/auth.js:6-13`) reads the httpOnly
cookie `a-usr`, and a browser sends cookies on `<video src="...">` requests to the same origin. No
blob fetching, no token in a query string, no URL that leaks through logs or referrers.

**Range requests**: the route must honour `Range` so administrators can seek and resume mid-video
(spec edge case: long multi-part WhatsApp tutorials). `res.sendFile()` delegates to `send`, which
already emits `206 Partial Content` with correct `Content-Range` and `Accept-Ranges` headers — so
this is configuration, not implementation.

**Path safety**: `:videoId` is resolved against the catalogue's known filenames, never concatenated
into a path. An unknown id is a 404. This makes directory traversal structurally impossible rather
than filtered.

**Alternatives considered**:

- *Leave files on the public `/uploads` path.* Rejected — violates FR-020.
- *Signed, expiring URLs.* Rejected — meaningful complexity (signing, clock skew, expiry-mid-playback)
  to solve a problem the existing admin cookie already solves on a same-origin request.
- *A separate private directory outside `file_storage/`.* Viable and marginally simpler to reason
  about, but the user explicitly chose `file_storage`. The guard achieves the same isolation.
- *Streaming manually with `fs.createReadStream` and hand-rolled Range parsing.* Rejected —
  re-implements what `send` already does correctly, including multi-range and malformed-header cases.

---

## R4. Returning to the Knowledge Base after a jump

**Decision**: The jump pushes a history entry, so the browser Back button returns to the Knowledge
Base. Additionally, carry `&from=knowledge-base` and render a "Back to Knowledge Base" control in the
target section while that flag is present.

**Rationale**: FR-009 requires returning to the Knowledge Base rather than the dashboard's default
section. `Dashboard.jsx:334-338` already pushes (not replaces) on tab change, so Back works as-is for
section jumps. The explicit control covers the mobile case, where Back is less discoverable, and the
case where the admin has since changed panels inside the target section and accumulated history.

**Caution for implementation**: `WhatsApp.jsx:974-992` navigates with `{ replace: true }` on panel
changes. That is correct for panel churn, but the *initial* jump from the Knowledge Base must be a
push, or the Knowledge Base entry is overwritten before Back can reach it.

**Alternatives considered**:

- *Rely on Back alone.* Rejected — fails once the admin opens a panel or two inside the target.
- *Store "came from KB" in app state.* Rejected — lost on refresh; the URL survives.

---

## R5. Recording which topics get viewed

**Decision**: New SQLite table `knowledge_base_view_log` in the existing `app.db`, written through
`services/dbService.js`, via `POST /api/knowledge-base/views`.

**Rationale**: FR-015 asks which procedures administrators struggle with. `services/dbService.js:1-8`
already opens `app.db` with `better-sqlite3`, and `create_tables.sql` is where this project declares
schema — so this follows the path already worn into the codebase. Two event kinds are enough to
answer the question: the topic was opened, and its video was played.

**Alternatives considered**:

- *MySQL (`services/mysqlService.js`).* Rejected — MySQL here holds business records; a UI telemetry
  log belongs with the application's own operational data in SQLite.
- *No tracking.* Rejected — FR-015 is explicit, and without it there is no way to tell which of the
  ten entries deserve a re-recording.

---

## R6. Video player

**Decision**: The native `<video controls preload="metadata">` element inside an MUI `Dialog`.

**Rationale**: `preload="metadata"` gives the duration for FR-014 without pulling the whole file.
Native controls bring seek, pause, resume, volume, fullscreen, captions, and keyboard and screen-reader
support for free, and behave correctly on iOS Safari, which matters for FR-012. The client already has
MUI 7 for the dialog shell; no new dependency enters `public/package.json`.

**Alternatives considered**:

- *A player library (video.js, Plyr, react-player).* Rejected — bundle weight and a new dependency for
  behaviour the platform already provides for a plain MP4 from one origin.
- *Inline expansion instead of a dialog.* Rejected — pushes catalogue rows around during playback and
  makes the small-screen layout harder to keep usable.

---

## R7. Approximate tutorial length (FR-014)

**Decision**: Store `durationLabel` (e.g. `"4 min"`) as a literal string on each catalogue entry.

**Rationale**: The requirement is to let an administrator decide whether to commit *before* opening the
video. Reading real duration requires loading metadata for all ten entries on mount — ten requests for
a cosmetic label. A hand-written string is accurate enough for "is this a 2-minute or a 15-minute
watch", costs nothing, and is edited in the same commit that adds the recording.

**Alternatives considered**:

- *Probe duration server-side with ffprobe.* Rejected — a new binary dependency for a label.
- *Read `loadedmetadata` per entry on mount.* Rejected — ten video requests to render a list.

---

## R8. Testing

**Decision**: Manual verification against `quickstart.md`. No automated test framework is introduced.

**Rationale**: Root `package.json:7` is `"test": "echo \"Error: no test specified\" && exit 1"` and the
client has no test runner or test files. Standing up a framework is a project-wide decision well beyond
this feature's scope, and doing it half-way — one feature with tests, none elsewhere — is worse than
either end state. `quickstart.md` therefore carries explicit, reproducible manual steps, including the
negative security check for FR-020.

**Alternatives considered**:

- *Introduce Vitest + React Testing Library for this feature.* Rejected as out of scope; worth raising
  separately as its own piece of work.
