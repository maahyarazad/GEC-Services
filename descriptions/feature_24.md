# Feature_24: Add Past Events Log
# Part 1
## Description

### 1. Backend

Add a new API endpoint named `clubtime_guest_logs`.

The `GET` endpoint must support:

- Server-side pagination
- Server-side filtering
- Server-side sorting

The data should be retrieved from the following table:

```sql
CREATE TABLE clubtime_guests (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  event_title    TEXT NOT NULL,                       -- e.g. 'ClubTime - 2026-07-07'
  event_type     TEXT NOT NULL,                       -- 'ClubTime' | 'Business Breakfast'
  name           TEXT NOT NULL,                       -- Guest / attendee name
  member_partner TEXT,                                -- Membership status or partner/company
  remarks        TEXT,                                -- Payment remarks (e.g. '50 AED', 'Card')
  mobile         TEXT,                                -- Phone number (digits only), may be blank
  invitee        TEXT,                                -- Invited via / by (e.g. 'App', 'Sylvia')
  note           TEXT,                                -- Free-text note
  event_date     TEXT NOT NULL,                       -- DATE stored as 'YYYY-MM-DD'
  created_at     DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_event_date  ON clubtime_guests (event_date);
CREATE INDEX idx_event_type  ON clubtime_guests (event_type);
CREATE INDEX idx_event_title ON clubtime_guests (event_title);
CREATE INDEX idx_mobile      ON clubtime_guests (mobile);
CREATE INDEX idx_name        ON clubtime_guests (name);
```

## Frontend

### 2. Add Event Logs Button

In the **WhatsappBroadcast** section:

- Add a new button below **Guest List** named **Event Logs**.
- Clicking the button should open a slider, similar to the **Contact Book** slider.
- Load the data from the `clubtime_guest_logs` endpoint.
- Use the following component for the data grid:

```javascript
import _CustomDataGrid from '../../CustomDataGrid';
```

### 3. Data Grid

- Use `NotepadModal.jsx` to display the **Note** field.
- Use `NotepadModal.jsx` to display the **Remarks** field.
- Place both **Note** and **Remarks** in the **Actions** column.
- Use a different icon for **Remarks** so users can easily distinguish it from **Note**.




# Feature: Add Past Events Log

---

## Frontend

### 3. Enhance Guest List with Past Events Log

1. Add a total count in the top-right corner of the SlideModal title for each event in **GuestListPanel.jsx**.

2. Add a new column next to **Active Member**, named **History**.  
   For each page, send a request to the `clubtime_guest_logs` endpoint.

3. If the query finds any record for the specific **full name** or **mobile number**, display a **warning icon (orange color)**.  
   If the member has an active membership value, the warning icon should be **light gray** instead.  
   Add a tooltip that displays the history logs for that record.

4. Add a **Copy to Clipboard** action so the administrator can easily copy the data.

---

## Backend API

1. Check my code and fix response messages and normilizing the name and full names
```js
// POST /api/clubtime_guest_logs/check-batch
// Body: { phone_numbers: string[], full_names?: string[] }
// Matches active members by normalized phone OR full name (first_name + ' ' + name)

router.post('/api/clubtime_guest_logs/check-batch', async (req, res) => {
  const { phone_numbers, full_names } = req.body;

  if (!Array.isArray(phone_numbers) || phone_numbers.length === 0) {
    return res.status(400).json({
      status: false,
      message: 'phone_numbers array is required'
    });
  }

  try {

    const normalizedPhones = phone_numbers.map(p =>
      p.replace(/[+\-\s]/g, '')
    );

    const phonePlaceholders = normalizedPhones.map(() => '?').join(', ');

    const hasNames = Array.isArray(full_names) && full_names.length > 0;
    const namePlaceholders = hasNames
      ? full_names.map(() => '?').join(', ')
      : null;

    const params = hasNames
      ? [...normalizedPhones, ...full_names]
      : normalizedPhones;

    const query = `
      SELECT *
      FROM clubtime_guests
      WHERE name IN (?)
         OR mobile IN (?);
    `;

    const stmt = db.prepare(query);
    const result = stmt.run(params);

    return res.json({
      status: true,
      data: result
    });

  } catch (err) {
    console.error(`${Date.now()} - GEC members batch check error:`, err);

    return res.status(500).json({
      status: false,
      message: 'Server error'
    });
  }
});
```