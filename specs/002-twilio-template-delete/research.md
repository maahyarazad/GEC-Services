# Phase 0 Research: Twilio Template Delete & Grid Refresh

**Feature**: `002-twilio-template-delete` | **Date**: 2026-08-19

All Technical Context unknowns are resolved below. No NEEDS CLARIFICATION items remain.

---

## R1 — Where the delete control already lives

**Finding**: The UI is already built. `public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx` renders a `TbTrashX` icon button in the `actions` column, wired to:

```ts
const onDelete = (row: FlatRow) => { console.log(row) }
```

**Decision**: Implement `onDelete` in place rather than adding a new control. The column, tooltip, and error-red styling stay as they are.

**Rationale**: The affordance shipped already; only the behaviour is missing. Avoids a second delete path.

**Alternatives considered**: A bulk-select delete toolbar action — rejected as scope creep, and far more dangerous given deletion is irreversible at Twilio.

---

## R2 — Twilio delete API availability

**Finding**: `twilio@5.13.1` is installed. `node_modules/twilio/lib/rest/content/v1/content.d.ts` exposes `remove(): Promise<boolean>` on a content instance, so `twilioClient.content.v1.contents(sid).remove()` is available.

**Finding**: `services/whatsAppSender.js:573` already contains a dead `deleteContent(req, res)` stub whose only real body is commented out — including the exact call above. It is **not** in the `module.exports` list at the bottom of the file.

**Decision**: Replace the `deleteContent` stub with a real, single-purpose `deleteContentTemplate(contentSid)` that returns `{ status, result }` matching the file's existing convention (`fetchContentTemplates` returns the same shape), and add it to `module.exports`.

**Rationale**: Reusing the stub's name would carry over a misleading `(req, res)` signature that leaks HTTP concerns into the service layer; every other export in that file is transport-agnostic.

---

## R3 — The usage gate: what "no record" means

**Finding**: Live counts in `app.db` for columns holding a content SID:

| Table | Column | Rows | Non-null |
|---|---|---|---|
| `twilio_template_message` | `contentSid` | 29,853 | 29,853 |
| `contact_book` | `contentSid` | 2,464 | 1,722 |
| `contact_book_events` | `contentSid` | 6,817 | 6,817 |

**Finding**: `twilio_template_message` is the join target for the delivery logs (`routes/whatsapp_sender.js:524`), the response logs (`:720`), the insight endpoints (`:732`, `:745`, `:862`) and the sender service (`services/whatsAppSender.js:618`, `:713`). Those joins resolve a template's friendly name by calling Twilio and mapping `contentSid → friendlyName`. Deleting a template that has send history therefore does not break the query, but permanently degrades it: the name resolves to `null` for every historical row.

**Decision**: Gate strictly on `SELECT COUNT(*) FROM twilio_template_message WHERE contentSid = ?` being `0`, exactly as specified.

**Risk accepted and recorded**: A template can have zero `twilio_template_message` rows while still being referenced by `contact_book.contentSid` or `contact_book_events.contentSid`. Those columns track the auto-response/attendance flow, not broadcast history. Deleting such a template leaves those references dangling. This is a narrower gate than the data model strictly warrants.

**Recommendation (out of scope, flagged for the user)**: widen the gate to all three tables, or at minimum report the other two counts in the usage response so the confirmation dialog can warn. The contract in `contracts/` returns the counts separately so this can be tightened later without an API change.

**Alternatives considered**: Deleting the `twilio_template_message` rows alongside the template — rejected outright; that is the delivery audit trail.

---

## R4 — Where the authoritative check must run

**Finding**: `server.js:105` applies `authorize.authorize_admin` to everything under `/api/`, so any new `/api/…` route inherits admin auth without per-route middleware. Note that `routes/whatsapp_sender.js` contains no explicit `authorize` calls at all — it relies entirely on this blanket mount.

**Decision**: Two endpoints, both under `/api/`:
- `GET /api/twilio/template-usage/:contentSid` — the pre-flight affordance.
- `DELETE /api/twilio/template/:contentSid` — **re-runs the same count check** before calling Twilio.

**Rationale**: The user's phrasing ("check … then allow user to send the delete request") describes a client-side pre-flight, which is right for UX but is not a security or integrity boundary. Between the browser's check and the confirm click, a scheduled broadcast can insert rows — `services/whatsAppSender.js:478` inserts into `twilio_template_message` on every send. Without a server-side re-check this is a time-of-check/time-of-use hole that silently orphans logs. The pre-flight stays for responsiveness; the delete endpoint is the real gate.

---

## R5 — Refresh control pattern

**Finding**: `public/src/components/Dashboard/Support/SupportSection.jsx` implements the pattern the user pointed at: a `refreshKey` counter in state (`:31`), included in the fetch effect's dependency array (`:95`), and a header button (`:113-119`):

```jsx
<Button size="small" startIcon={<RefreshIcon />}
        onClick={() => setRefreshKey((k) => k + 1)}
        sx={{ textTransform: 'none' }}>Refresh</Button>
```

**Finding**: The template grid's data has two sources on two levels:
- `WhatsApp.jsx:151` — `fetchData()`, a `useCallback` hitting `/api/whatsapp/list`, setting `data`, which a `useEffect` (`:580`) reduces into `groupedByTypeKey` and passes to the grid.
- `TwilioTemplateDataGrid.tsx` — `fetchApprovals()`, a local `useCallback` hitting `/api/twilio/approvals`.

**Decision**: Do not adopt the `refreshKey` counter here. Pass `fetchData` down as an `onRefresh` prop and have the grid's Refresh button call both `onRefresh()` and its own `fetchApprovals()`, awaiting both. Render the button in the grid header with the same `size`/`startIcon`/`textTransform` styling as Support Center.

**Rationale**: `SupportSection` owns its fetch, so a counter is the cheapest trigger there. Here the two fetches sit in different components, and `fetchData` is already a stable `useCallback` that can be invoked directly. A counter would need threading through props anyway and would add an effect that re-runs on mount for no benefit. The visual result — the user's actual ask — is identical.

**Alternatives considered**: Lifting `fetchApprovals` into `WhatsApp.jsx` — rejected; approvals are only consumed by the grid and the extra prop drilling buys nothing.

---

## R6 — Confirmation dialog mechanism

**Decision**: A MUI `Dialog` local to `TwilioTemplateDataGrid`, holding the pending row and the usage-check result.

**Rationale**: `window.confirm` is a blocking browser modal — inconsistent with the MUI surface used everywhere in this section, unstyleable, and it freezes browser automation. The dialog also has to display the usage count and a permanence warning, which `window.confirm` cannot format.

**Note**: `TemplatePreview` in the same file already uses `alert()` in the quick-reply branch. That is pre-existing and out of scope, but the new code must not add to it.

---

## R7 — Grid state after a delete

**Finding**: `rows` is derived on every render from the `groupedByTypeKey` prop; the grid holds no independent row state. `approvals` is local state keyed by SID.

**Decision**: On a successful delete, call `onRefresh()` to re-fetch the authoritative list, and drop the deleted SID from local `approvals`. Clear `selectedRow` and close the preview panel if the deleted row was the selected one.

**Rationale**: Re-fetching from Twilio is the only way to be sure the delete propagated; optimistic local removal alone could disagree with the server on the next refresh. Clearing selection prevents the preview panel from rendering a template that no longer exists.

---

## R8 — Testing approach

**Finding**: No test runner is configured for either the Express routes or the React components; there is no `tests/` directory and no test script in the repo's existing layout.

**Decision**: Validation is manual, scripted as scenarios in `quickstart.md`, plus `node --check` on changed server files and a TypeScript compile of the changed `.tsx`.

**Rationale**: Introducing a test framework is a much larger change than this feature and is not requested. Recorded here so the absence is a known, deliberate gap rather than an oversight.
