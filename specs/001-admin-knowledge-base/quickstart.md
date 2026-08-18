# Phase 1 Quickstart: Validating the Admin Knowledge Base

**Feature**: `001-admin-knowledge-base` | **Date**: 2026-08-18

Manual validation guide. The project has no test runner (see research R8), so these steps *are* the
acceptance procedure. Run them in order; scenario 6 is the one that must never be skipped.

## Prerequisites

- Repository at `001-admin-knowledge-base` with the feature implemented
- `.env` populated (`JWT_SECRET` in particular — `authorize_admin` depends on it)
- Admin credentials for the dashboard
- At least two recordings placed on the server, so a "recorded" and a "not yet recorded" entry can
  both be seen:

```bash
mkdir -p file_storage/knowledge_base
cp ~/recordings/whatsapp-guest-list.mp4 file_storage/knowledge_base/
cp ~/recordings/place-id-finder.mp4     file_storage/knowledge_base/
```

## Setup

```bash
# Terminal 1 — API server
npm run dev

# Terminal 2 — client
cd public && npm run dev
```

Sign in at `/admin`.

---

## Scenario 1 — The catalogue renders (US1, FR-001…FR-005)

1. Open `/admin` and select **Knowledge Base** in the dashboard navigation.
2. Confirm the URL becomes `/admin?tab=knowledge-base`.

**Expected**: all six top-level topics are listed — WhatsApp Broadcast, WhatsApp reporting, Place ID
Finder, PDF Generator, Registration (internal), Registration (external sources). The WhatsApp
Broadcast topic shows its four sub-topics: Twilio templates, event auto-response, guest list, and
contact-list-to-guest-list. Entries with a recording show a duration label.

---

## Scenario 2 — Video playback, seeking, and resume (US1, FR-006, FR-014)

1. On the guest-list topic, activate **view video**.
2. Let it play, pause, drag the scrubber to roughly the middle, and resume.
3. Close the dialog.

**Expected**: the video plays in a dialog over the catalogue. Seeking works and does not restart the
download. On close, the catalogue is still scrolled where it was.

Confirm Range is actually being served — this is what makes seeking work:

```bash
curl -s -o /dev/null -D - \
  -H "Range: bytes=0-1023" \
  -H "Cookie: a-usr=<your admin cookie>" \
  http://localhost:5501/api/knowledge-base/videos/whatsapp-guest-list
```

**Expected**: `HTTP/1.1 206 Partial Content` with `Content-Range` and `Accept-Ranges: bytes`.
A `200` here means Range is not honoured and seeking will be re-downloading the whole file.

---

## Scenario 3 — Missing and unrecorded videos (FR-010, FR-011)

1. Find a topic with no recording on disk.
2. Temporarily rename a file that *is* referenced: `mv file_storage/knowledge_base/place-id-finder.mp4{,.bak}`, reload, open that topic's video.

**Expected**: the unrecorded topic shows its view-video control clearly disabled and is labelled as
not yet recorded — activating it does nothing rather than failing. The renamed one reports the video
as unavailable, and every other entry in the catalogue still works.

Restore: `mv file_storage/knowledge_base/place-id-finder.mp4{.bak,}`

---

## Scenario 4 — Jumping to a section (US2, FR-007, FR-008)

1. On the **Place ID Finder** topic, activate the jump icon.

**Expected**: URL becomes `/admin?tab=place-id-finder&from=knowledge-base` and the Place ID Finder is
loaded and usable — identical to having picked it from the navigation.

2. Repeat for PDF Generator and both Registration topics.

**Expected**: `?tab=pdf-generator` and `?tab=registration-config` respectively. Both registration
topics land on the same section, as designed.

---

## Scenario 5 — The destination picker (US2, FR-018, FR-019)

1. On the **WhatsApp Broadcast** topic — the one with sub-topics — activate the jump icon.

**Expected**: a picker appears rather than an immediate jump, listing the WhatsApp Broadcast section
itself *first*, then the four sub-topic destinations.

2. Choose **managing the guest list**.

**Expected**: `/admin?tab=whatsapp-broadcast&view=guest-list&from=knowledge-base`, and the guest list
panel is open — not the section's default view.

3. Go back and try each remaining destination:

| Choice | Expected `view=` | Panel |
|---|---|---|
| Create Twilio templates | `create-template` | Create Twilio Template |
| Configure event auto-response | `event-list` | Event List (auto-response icon per row) |
| Contact list → guest list | `contact-book` | Contact Book |
| *(from the reporting topic)* | `report` | Reporting |

**`create-template` is the one most likely to fail.** It was rendered but absent from `panelMap`
before this feature. If the panel does not open, the `panelMap` addition in `WhatsApp.jsx` is missing.

4. On the **Place ID Finder** topic — no sub-topics — activate the jump icon.

**Expected**: navigates immediately, with no picker.

---

## Scenario 6 — Videos are not publicly readable (FR-020) ⚠️ **do not skip**

This catches the security regression the feature would otherwise introduce. `server.js:106` serves
all of `file_storage/` at `/uploads` with no authentication.

```bash
# 1. Direct public path, no session — MUST be refused
curl -s -o /dev/null -w "%{http_code}\n" \
  http://localhost:5501/uploads/knowledge_base/whatsapp-guest-list.mp4

# 2. The API route without a session — MUST be refused
curl -s -o /dev/null -w "%{http_code}\n" \
  http://localhost:5501/api/knowledge-base/videos/whatsapp-guest-list

# 3. The API route WITH a valid admin session — MUST succeed
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Cookie: a-usr=<your admin cookie>" \
  http://localhost:5501/api/knowledge-base/videos/whatsapp-guest-list

# 4. An unrelated existing upload — MUST still work (no collateral breakage)
curl -s -o /dev/null -w "%{http_code}\n" \
  http://localhost:5501/uploads/gec-logo.png
```

**Expected**: `404`, `401`, `200`, `200`.

**A `200` on check 1 is a hard fail** — the recordings are world-readable. The usual cause is the
guard being registered *below* the `express.static` mount instead of above it; Express matches in
registration order.

Also confirm traversal is refused:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Cookie: a-usr=<your admin cookie>" \
  "http://localhost:5501/api/knowledge-base/videos/..%2F..%2F.env"
```

**Expected**: `404` — the id is not in the catalogue, so it never reaches the filesystem.

---

## Scenario 7 — Getting back (FR-009)

1. Jump from any topic into a section.
2. Press the browser Back button.

**Expected**: the Knowledge Base, not the dashboard's default landing section. If you land on Website
Health, the jump replaced history instead of pushing it — note that `handleSetOpenPanel` in
`WhatsApp.jsx` uses `{ replace: true }`, which the initial jump must not inherit.

3. Jump again, then use the **Back to Knowledge Base** control in the target section.

**Expected**: same destination, and it appears only when `from=knowledge-base` is in the URL.

---

## Scenario 8 — Search (US3, FR-013)

| Type | Expect |
|---|---|
| `guest list` | the guest-list sub-topic, with enough parent context to place it |
| `auto response` | the auto-response sub-topic |
| `invoice` | the PDF Generator topic, if its summary mentions invoices |
| `zzzz` | an empty state explaining nothing matched, with a way to clear |
| *(cleared)* | the full catalogue restored |

---

## Scenario 9 — Mobile (FR-012)

In responsive mode at 375 px wide: browse the catalogue, play a video, open the destination picker,
and complete a jump.

**Expected**: no horizontal overflow, controls remain tappable, the video dialog fits, and the picker
is usable. Verify on real iOS Safari if you can — that is where native `<video>` behaviour differs
most.

---

## Scenario 10 — View telemetry (FR-015)

After running the scenarios above:

```bash
sqlite3 app.db "SELECT topic_id, event_type, admin_user, created_at
                FROM knowledge_base_view_log
                ORDER BY created_at DESC LIMIT 20;"
```

**Expected**: `topic_opened` and `video_played` rows with real topic ids and the acting admin.

Confirm telemetry cannot be poisoned:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: a-usr=<your admin cookie>" \
  -d '{"topicId":"not-a-real-topic","eventType":"video_played"}' \
  http://localhost:5501/api/knowledge-base/views
```

**Expected**: `400`, and no new row.

---

## Sign-off

| # | Scenario | Covers |
|---|---|---|
| 1 | Catalogue renders | FR-001…005, SC-005 |
| 2 | Playback, seek, resume | FR-006, FR-014 |
| 3 | Missing / unrecorded video | FR-010, FR-011 |
| 4 | Section jump | FR-007, FR-008, SC-002 |
| 5 | Destination picker | FR-018, FR-019 |
| 6 | **Not publicly readable** | **FR-020, FR-002** |
| 7 | Getting back | FR-009 |
| 8 | Search | FR-013 |
| 9 | Mobile | FR-012, SC-006 |
| 10 | Telemetry | FR-015 |

`SC-001`, `SC-003`, `SC-004`, and `SC-007` are outcome measures observed with real administrators
after release, not verifiable in this guide.
