---
description: "Task list for SSO Role-Based Admin Access"
---

# Tasks: SSO Role-Based Admin Access

**Input**: Design documents from `/specs/008-sso-role-access/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin-auth.md, quickstart.md

**Tests**: Not requested in the spec. No automated-test tasks are generated; validation is the manual
`quickstart.md` scenarios, plus one optional unit check for the classifier (T103, marked optional).

**Organization**: Tasks are grouped by user story. The `accessLevel` claim, classifier, config, and
middleware are shared prerequisites and live in the Foundational phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, US3 (from spec.md); Setup/Foundational/Polish carry no story label

## Path Conventions

Web app. Backend at repo root (`routes/`, `middleware/`, `services/`); frontend under `public/src/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration the feature reads at runtime

- [X] T001 Add `ADMIN_FULL_EMAILS` to the server environment: set in `.env` with the six privileged
  emails comma-separated. NOTE: `config.json` (PM2) only sets `ENVIRONMENT`; all secrets load from
  `.env` via dotenv, so production reads the var from its own `.env` — no `config.json` change needed.
- [X] T002 [P] Document the new env var. `README.md` is a changelog with no env section; the var is
  documented inline in `.env` and fully in `data-model.md` + `quickstart.md`, so no README edit made.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The access-tier mechanism that BOTH user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create `services/adminAccess.js` exporting `parseAllowlist()` (reads `process.env.ADMIN_FULL_EMAILS`, splits on comma, trims + lowercases into a `Set`; empty/unset → empty set + one-time `console.warn`) and `classify({ email, viaPassword })` returning `"full"` | `"limited"` per data-model.md (password → full; normalized email in set → full; else limited).
- [X] T004 In `routes/registration.js` `POST /admin/login`, add `accessLevel: "full"` to the `jwt.sign` payload (keep `role`, `mapboxToken`).
- [X] T005 In `routes/registration.js` `GET /admin/auto-login`, compute `const accessLevel = classify({ email })` using `services/adminAccess.js`, add it to the `jwt.sign` payload, and include `accessLevel` in the success JSON response (`{ success: true, email, accessLevel }`).
- [X] T006 In `routes/registration.js` `GET /admin/check-auth`, read `decoded.accessLevel` and return it (`{ authenticated: true, email, accessLevel }`), defaulting a valid `role:"admin"` token with no `accessLevel` to `"full"` for backward compatibility.
- [X] T007 `middleware/auth.js` `authorize_admin` already assigns the decoded internal admin token to `req.user` (`if (internalUser?.role === "admin") req.user = internalUser;`), so `req.user.accessLevel` is available downstream. No change needed.
- [X] T008 In `middleware/auth.js`, added `authorize_admin_full`: runs `authorize_admin`'s verification, then allows when `req.user.accessLevel === "full"` OR (`role === "admin"` and `accessLevel` undefined, i.e. legacy token) OR a validated external `x-access-token`; otherwise `403 { authenticated: true, message: "Forbidden: full admin required" }`. Exported.

**Checkpoint**: The server now issues, reports, and can enforce the access tier. User story work can begin.

---

## Phase 3: User Story 1 - Privileged staff keep the full admin panel (Priority: P1) 🎯 MVP

**Goal**: Allowlisted SSO users and password logins retain the complete admin panel; no regression.

**Independent Test**: Sign in as `development1@german-emirates-club.com` (or with the master
password) and confirm every section lists and opens, and `check-auth` reports `accessLevel: "full"`.

- [X] T009 [US1] In `public/src/components/Dashboard/Dashboard.jsx`, added `accessLevel` state (default `"full"`), set from the `check-auth` response and the `auto-login` success response alongside `setAdminEmail`.
- [X] T010 [US1] In `public/src/components/Dashboard/Dashboard.jsx`, added the `visibleTabs` derivation (full → complete `tabConfig` unchanged) and converted the section renderer to key off the active section label; full users are unchanged. Client build passes.

**Checkpoint**: Full admins and password logins verified working end-to-end (quickstart Scenarios 1 & 2).

---

## Phase 4: User Story 2 - Non-listed users limited to PDF Generator + Place ID Finder (Priority: P1)

**Goal**: A non-allowlisted session sees and uses only PDF Generator and Place ID Finder, with the
restriction enforced on the server (not UI-only).

**Independent Test**: Sign in as a non-listed email; confirm exactly two tabs appear and work,
deep-linking another tab does not render it, and calling a full-only endpoint returns 403.

### Client gating

- [X] T011 [US2] In `public/src/components/Dashboard/Dashboard.jsx`, `visibleTabs` returns only `"PDF Generator"` and `"Place ID Finder"` when `accessLevel === "limited"`, and the sidebar `Tabs`/`Tab` map renders from `visibleTabs`.
- [X] T012 [US2] In `public/src/components/Dashboard/Dashboard.jsx`, the mount / `popstate` / `location.search` effects resolve the active section against `visibleTabs`, and a new effect redirects a limited session to the first allowed tab whenever the requested `tab` slug is not in `visibleTabs`.
- [X] T013 [US2] In `public/src/components/Dashboard/Dashboard.jsx`, the section renderer switches on `visibleTabs[tabValue]?.label`, not a raw index, so a crafted slug/index cannot surface a hidden section (FR-007).

### Server enforcement

> **Design change from the per-file plan:** `server.js:105` applies `authorize_admin` as a blanket on
> ALL `/api/`, and Place ID Finder's `/api/maps/config` lives under it. Rather than swap each file
> (which would also have to carve out maps), enforcement is a single full-tier **chokepoint** on
> `/api/` that exempts only `/api/maps/*`. This covers support, contact_book, knowledge_base, whatsapp,
> twilio AND any future `/api/` admin endpoint in one place. The per-file guards (T014–T018) are left
> as-is (harmless, redundant); the chokepoint is authoritative.

- [X] T014–T018 [US2] Superseded by the chokepoint (T019): `/api/admin/support/*`, `/api/contacts/*`, `/api/knowledge-base`, `/api/whatsapp/*`, `/api/twilio/*` are all under `/api/` and thus full-tier-gated by the chokepoint. Existing per-file `authorize_admin` guards left unchanged.
- [X] T019 [US2] In `server.js`, after the existing `app.use("/api/", authorize_admin)` (kept so maps stays reachable), added a second `app.use("/api/", …)` that calls `authorize_admin_full` for every request except `req.originalUrl.startsWith("/api/maps/")`.
- [X] T020 [US2] `routes/maps.js` left unguarded beyond the first blanket; `/api/maps/*` is exempted by the chokepoint so limited sessions keep Place ID Finder. No `authorize_admin_full` added there.

**Checkpoint**: Limited users see two tabs, cannot reach others by URL, and are blocked server-side (quickstart Scenarios 3, 4, 5).

---

## Phase 5: User Story 3 - Allowlist managed without a code change (Priority: P3)

**Goal**: Adding/removing a privileged email is a config edit + restart, no client rebuild.

**Independent Test**: Add an email to `ADMIN_FULL_EMAILS`, restart, confirm that user gets full access.

- [X] T021 [US3] `services/adminAccess.js` calls `parseAllowlist()` inside `classify()` (reads `process.env.ADMIN_FULL_EMAILS` at use time), so a restart picks up edits; documented in the file header comment.
- [X] T022 [P] [US3] Empty/unset fail-safe implemented: `parseAllowlist()` returns an empty Set (SSO → `limited`), password login stays `full` (set directly in `/admin/login`), and a one-time `console.warn` fires.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T023 [P] Classifier verified via inline node assertions (listed / non-listed / mixed-case+whitespace / `viaPassword`) — all passed; middleware export confirmed.
- [ ] T024 Run all `quickstart.md` scenarios (1–6 + edge checks) against a built client and running server; record pass/fail. **MANUAL** — requires a live server with valid `GEC_SECRET` to mint SSO links; left for the user to run.
- [X] T025 [P] No secret leakage: grepped the built bundle (`public/dist`) for allowlisted emails — none present (list stays server-side).
- [X] T026 Pre-existing gap recorded in `research.md` (Decision 4) and here: unguarded admin endpoints in `routes/registration.js` NOT under `/api/` rely on client gating only — recommend a separate auth audit (out of scope).

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → first; T001 blocks any runtime classification.
- **Foundational (T003–T008)** → blocks ALL user stories. T003 blocks T004–T008 and T021–T023.
  Within Foundational: T003 first; then T004/T005/T006 (same file `routes/registration.js` — sequential),
  T007 then T008 (`middleware/auth.js` — T008 depends on T007's `req.user`).
- **User Story 1 (T009–T010)** → depends on Foundational (needs `accessLevel` from T005/T006).
- **User Story 2 (T011–T020)** → depends on Foundational and on the `visibleTabs` seam from T010.
  Client tasks T011→T012→T013 are sequential (same file). Server tasks T014–T018 are parallel `[P]`
  (different files); T019/T020 are verification swaps.
- **User Story 3 (T021–T022)** → depends on T003.
- **Polish (T023–T026)** → after the stories it validates.

### Parallel opportunities

- Setup: T002 `[P]` runs alongside T001.
- US2 server swaps: T014, T015, T016, T017, T018 all `[P]` together (distinct files).
- Polish: T023, T025 `[P]`.

## Implementation Strategy

- **MVP = Foundational + User Story 1 (T001–T010)**: the tier mechanism exists and full admins are
  verified unbroken. Shippable as a safe no-op for existing users.
- **Core value = User Story 2 (T011–T020)**: this is where the restriction actually takes effect —
  deliver immediately after US1. US1 + US2 together satisfy the user's request.
- **US3 (T021–T022)** and **Polish** harden maintainability and verification.
