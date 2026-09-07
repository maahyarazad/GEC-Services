# UI Contract: Guest List Mobile Selector Modal

**Feature**: `007-guest-list-mobile-selector` | **Date**: 2026-09-07

This project's external interface for this feature is its UI, not an API. **No HTTP endpoint is
added, removed, or changed.** The one network call involved — `GET /api/contacts?guest_list=1&event_id=<id>`,
issued by `EventSearch.fetchGuestList` — is untouched in URL, method, credentials, abort handling
and dispatch behaviour (`research.md` R2).

---

## Component: `GuestListPanel`

**File**: `public/src/components/Dashboard/WhatsApp/GuestListPanel.jsx`

**Public props — unchanged**:

```ts
{
  onGuestAttend: (row) => void;
  onRemoveGuest: (row) => void;
  mediaTemplates?: Array<{ value: string; ... }>;   // default []
}
```

The call site in `WhatsApp.jsx` does not change.

### Rendering contract

| Condition | Required output |
|---|---|
| `≥900px` | Exactly today's tree: `<Box flexDirection="row">` with a `280px` column containing `<EventSearch />`, beside the grid column |
| `<900px` | A compact trigger control in place of the inline column, plus a `<Dialog>` containing `<EventSearch />` |
| `<900px`, no event selected | Trigger reads "Select an event"; grid area shows the existing "No event selected." placeholder |
| `<900px`, event selected | Trigger shows the event title, truncated with ellipsis if it overflows |

**Breakpoint**: `useMediaQuery(theme.breakpoints.down('md'))` — the same threshold the component
already uses for `flexDirection: { xs: 'column', md: 'row' }`. Do not introduce a fourth mobile
threshold (`research.md` R4).

---

## New element: mobile event trigger

Not a new file — rendered inline by `GuestListPanel`.

**Behaviour**:

| Interaction | Result |
|---|---|
| Tap | `setEventModalOpen(true)` |
| Keyboard focus + Enter/Space | Same as tap (it must be a real `Button`, not a styled `div`) |

**Display**: the selected event's `title`, or `"Select an event"`. Must not wrap — a long title
truncates via `textOverflow: 'ellipsis'`, `overflow: 'hidden'`, `whiteSpace: 'nowrap'`, matching how
`EventSearch` already truncates its list items (`EventSearch.jsx:124-128`).

**Sizing**: full width of the mobile column, single line. It replaces ~20dvh of inline list with
roughly one control's height — reclaiming that space is the entire point of the feature, so the
trigger must not grow into a multi-line block.

---

## New element: event selection modal

**Pattern**: MUI `Dialog`, matching `NotepadModal.jsx:106` and the QR viewer at
`GuestListPanel.jsx:316` (`research.md` R5). Do **not** use `fullScreen` — it appears nowhere in
this codebase.

```jsx
<Dialog open={eventModalOpen} onClose={closeEventModal} maxWidth="sm" fullWidth>
  <DialogTitle>Select Event</DialogTitle>
  <DialogContent dividers>
    <EventSearch /* list height suited to the modal */ />
  </DialogContent>
  <DialogActions>
    <Button onClick={closeEventModal}>Cancel</Button>
  </DialogActions>
</Dialog>
```

**Contract**:

| Requirement | Detail |
|---|---|
| Dismissal | Backdrop click, Esc, and Cancel all close it and leave the selection unchanged (FR-005) |
| Selection closes it | Choosing an event closes the modal (FR-004) |
| Rendered only on mobile | On desktop the `Dialog` must not be mounted, and `eventModalOpen` must be forced `false` when crossing the breakpoint |
| No selection logic | The modal is a container only — it must not dispatch, fetch, or transform the event list |

---

## Modified component: `EventSearch`

**File**: `public/src/components/Dashboard/WhatsApp/EventSearch.jsx`

**Permitted change — one, and only one**: make the internal list height configurable, because the
current value is tuned for the inline layout and is wrong inside a dialog.

Current (`EventSearch.jsx:110-112`):

```jsx
height: { xs: 'calc(20dvh - 60px)', md: 'calc(85dvh - 60px)' }
```

**New prop**:

```ts
{
  listHeight?: string | { xs?: string; md?: string };  // default: today's value, unchanged
  onSelected?: () => void;                             // optional: fired after a successful selection
}
```

- `listHeight` MUST default to the existing responsive value, so the inline desktop rendering is
  byte-for-byte equivalent (FR-002 / SC-003).
- `onSelected` is how the modal learns to close. It MUST fire **after** the existing
  `setSelectedEvent` dispatch, and MUST NOT replace or wrap the fetch logic.

**Forbidden changes** (these are the parts that make reuse safe — `research.md` R2):
`fetchGuestList`, the `AbortController` handling in `abortRef`, the refetch-nonce effect,
`eventIdRef`, and every `dispatch(...)` call.

---

## What must not change

| Area | Guarantee |
|---|---|
| `CustomDataGrid` | No change. Pagination already renders on mobile; the bug is positional (`research.md` R6) |
| `SlideMenu` | No change *required* by this feature. The `100vh` correction is tracked separately |
| API surface | No endpoint added, removed, or altered |
| Redux `eventSlice` | No new state, no changed action shape |
| Attendance / QR / notepad | Untouched (FR-008) |
| Desktop layout | Identical element tree (FR-002) |

---

## Separately scoped: the `100vh` correction

Not required for the acceptance criteria above, and deliberately isolated so it can be dropped.

| File | Line | Change |
|---|---|---|
| `public/src/components/SlideMenu/SlideMenu.css` | 23 | `height: 100vh` → `height: 100dvh` |
| `public/src/components/SlideMenu/SlideMenu.scss` | 24 | same, to keep the source in sync |

**Both files must be edited.** The `.scss` is not compiled — there is no `sass` dependency and the
build is plain `vite` — so the committed `.css` is what actually loads (`research.md` R3). Editing
only the `.scss` produces a change that reviews as correct and does nothing.

**Blast radius**: every `SlideMenu` panel — Contact Book, Guest List, Event List, Event Logs,
Delivery/Response Logs, and Unsubscribed. The change is a no-op on desktop (`dvh == vh` where there
is no dynamic browser chrome) and strictly an improvement on mobile, but it is a shared stylesheet
and should be verified across panels before merge.
