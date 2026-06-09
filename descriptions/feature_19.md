# Feature Ticket 19: Dashboard Support Center UI Improvement

## Description

Add a detailed modal view that opens when a user clicks on a row in the Support Center table.

## Implementation

### Backend (`routes/support.js`)

- Updated `GET /api/admin/support/tickets/:id` to LEFT JOIN `GIC_Users` and return the assigned admin's `firstName`, `lastName`, and `email` alongside the ticket data.
- Updated the same endpoint to also JOIN admin names onto `support_ticket_comments` and `support_ticket_activity` rows so the UI can display who made each comment or performed each action.
- Added `GET /api/admin/support/admins` endpoint that returns all admin users (`id`, `firstName`, `lastName`, `email`) for use in the assign dropdown.

### Frontend (`TicketDetailModal.jsx`)

The modal already existed and opened on row click. Changes made:

1. **Assigned To row** — added to the Ticket Information section, showing the admin's name with a small avatar initial chip, or "Unassigned" in italic when no admin is set.
2. **Customer display** — separated `full_name` and `email` into stacked lines for better readability instead of the `name <email>` inline format.
3. **Assign Ticket section** — new section (below Change Status) with a dropdown of all admin users and a "Save Assignment" button, wired to the existing `PATCH /api/admin/support/tickets/:id/assign` endpoint.
4. **Activity timeline** — now shows the admin name alongside each activity entry ("by First Last").
5. **Comments** — now shows the admin name who posted each comment next to the Public/Internal chip.
