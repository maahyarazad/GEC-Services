# Implementation Plan: Admin Knowledge Base

**Branch**: `001-admin-knowledge-base` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-admin-knowledge-base/spec.md`

## Summary

Add a Knowledge Base section to the admin dashboard listing the ten things an administrator can do
across WhatsApp Broadcast, broadcast reporting, Place ID Finder, PDF Generator, and internal and
external registration. Each entry plays a self-hosted tutorial video and offers a jump control that
lands the administrator on the exact place in the dashboard where the task is performed — with a
destination picker when the entry has sub-topics.

The technical approach is deliberately small, because research found most of the mechanism already
built. Section- and panel-level URL addressing already exists (`?tab=` in `Dashboard.jsx`, `?view=`
in `WhatsApp.jsx`), so the jump control reuses it and only two missing `panelMap` entries need
adding. The catalogue is a frozen module in the client, per the decision to fix content in code. The
only genuinely new server surface is an authenticated video-streaming route, plus a guard that stops
the existing public `/uploads` mount from exposing the recordings — the one security issue this
feature introduces and must close.

## Technical Context

**Language/Version**: Node.js 20 (CommonJS) on the server; React 19 with ES modules on the client

**Primary Dependencies**: Server — Express 4.21, `jsonwebtoken` 9, `cookie-parser`, `better-sqlite3` 12.
Client — React 19, MUI 7, `react-router-dom` 7, `react-icons` 5, Vite 6. **No new dependency is added
on either side.**

**Storage**: Tutorial video files on the server filesystem under `file_storage/knowledge_base/`,
placed by hand. View telemetry in the existing SQLite database `app.db` via `services/dbService.js`.
Catalogue content in a source module, not in any database.

**Testing**: Manual verification against `quickstart.md`. The project has no test runner
(`package.json:7` is the default failing stub) and this feature does not introduce one — see
research R8.

**Target Platform**: Modern evergreen browsers, desktop and mobile, served by the existing Express
app behind PM2.

**Project Type**: Web application — Express API server at the repository root, React SPA under
`public/`.

**Performance Goals**: Catalogue renders in under 200 ms with no network round-trip, since it is
static client data. Video playback starts within 2 seconds on office broadband and supports seeking
via HTTP Range without re-downloading from the start.

**Constraints**: Tutorial files must be unreachable without an admin session, including by direct URL
(FR-020). The Knowledge Base must remain usable at the smallest width the dashboard already supports
(FR-012). Changes to `WhatsApp.jsx` must be strictly additive — it is a large, live file serving the
project's most-used section.

**Scale/Scope**: 6 top-level topics, 4 sub-topics, 10 tutorial videos. A handful of concurrent
administrators. One new dashboard section, one new client component tree, one new route file, two
small edits to existing files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unmodified Spec Kit template — every principle is still a
`[PRINCIPLE_N_NAME]` / `[PRINCIPLE_N_DESCRIPTION]` placeholder, and the governance section is
unfilled. There are therefore **no ratified project principles to check against**, and no gate can
be meaningfully evaluated.

**Initial gate result**: PASS by vacuity, not by merit. Recorded honestly rather than claimed.

**Post-Phase-1 re-check**: PASS, unchanged — nothing in the Phase 1 design could violate principles
that do not yet exist.

**Recommendation**: run `/speckit-constitution` to fill the constitution before this project's next
feature. Two conventions this codebase already follows in practice would be worth ratifying, since
this plan leans on both: admin surfaces are guarded by `authorize_admin`, and nothing sensitive is
placed under a statically-served directory. The second is precisely the rule that the existing
`/uploads` mount would have quietly broken here.

## Project Structure

### Documentation (this feature)

```text
specs/001-admin-knowledge-base/
├── plan.md              # This file
├── spec.md              # Feature specification (16/16 checklist)
├── research.md          # Phase 0 output — 8 decisions
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output — manual validation guide
├── contracts/
│   └── knowledge-base-api.md   # Phase 1 output — 2 endpoints + 1 guard
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
# NEW — client feature module
public/src/components/Dashboard/KnowledgeBase/
├── KnowledgeBase.jsx            # Section root: search, catalogue list, telemetry
├── KnowledgeBaseTopic.jsx       # One row: title, summary, duration, video + jump controls
├── VideoDialog.jsx              # MUI Dialog wrapping native <video>, Range-seekable
├── JumpMenu.jsx                 # Destination picker for topics with sub-topics (FR-018)
├── knowledgeBase.catalog.js     # THE fixed catalogue — topics, destinations, video ids
└── KnowledgeBase.scss           # Follows the sibling-section .scss/.css convention

# NEW — server
routes/knowledge_base.js         # GET /videos/:videoId (Range), POST /views

# NEW — content (files placed by hand, not committed)
file_storage/knowledge_base/     # *.mp4 recordings

# MODIFIED — three existing files, additively
server.js                        # Mount guard ABOVE line 106 static; mount new router
create_tables.sql                # knowledge_base_view_log table
public/src/components/Dashboard/Dashboard.jsx
                                 # tabConfig entry + lazy import + switch case 12
public/src/components/Dashboard/WhatsApp/WhatsApp.jsx
                                 # panelMap: add 'create-template' and 'event-logs'
```

**Structure Decision**: Web application layout, matching what the repository already is — an Express
server at the root (`routes/`, `services/`, `middleware/`) and a Vite React SPA in `public/`. The
Knowledge Base client code is a new folder under `public/src/components/Dashboard/`, sitting beside
`WhatsApp/`, `PDFGenerator/`, and `PlaceIdFinder/` and following their internal conventions
(`React.lazy` import in `Dashboard.jsx`, co-located `.scss`). The server side is a single new router
in `routes/`, mounted the same way every other router in `server.js` is.

Note the ordering constraint in `server.js`: the `/uploads/knowledge_base` guard must be registered
**before** the `express.static` mount at line 106, since Express matches middleware in registration
order. Registered after, it is dead code and FR-020 silently fails.

## Complexity Tracking

> No Constitution Check violations to justify — the constitution defines no principles yet, so
> nothing was overridden or waived. This section is intentionally empty.
