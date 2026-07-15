# Feature Ticket 15: Create App Support Portal

## Overview

Implement a complete Support Portal that allows users to submit bugs, issues, feature requests, and general support inquiries directly from the client application.

The solution should include:

* Client-facing support ticket submission form
* File attachment support
* Automated email notifications
* Public ticket tracking portal
* Administrative ticket management dashboard
* Activity and audit logging
* Security controls and validation

---

# Part 1: Support Portal

## Description

Create a new Support section accessible from the client application where users can submit support requests.

## Requirements

### Ticket Submission Form

Users must provide:

* Full Name
* Email Address
* Subject
* Category
* Priority
* Detailed Description

### Categories

* Bug Report
* Technical Issue
* Feature Request
* Account Issue
* General Inquiry

### Priority Levels

* Low
* Medium
* High

### File Attachments

Users may upload supporting documents or screenshots.

#### Restrictions

* Maximum 3 files per ticket
* Maximum 1 MB per file
* Allowed file types:

  * JPG
  * JPEG
  * PNG
  * PDF
  * DOCX
  * TXT

### Validation

Implement both:

* Client-side validation
* Server-side validation

### Ticket Creation

Upon successful submission:

1. Generate a unique ticket number
3. Store the ticket in the database
4. Store uploaded attachments
5. Send confirmation email
6. Display ticket number

### Ticket Number Format

```txt
SUP-YYYYMMDD-XXXXXX
```

Example:

```txt
SUP-20260708-000123
```

---

# Part 2: Database Design

## Table: support_tickets

| Column         | Type        | Description           |
| -------------- | ----------- | --------------------- |
| id             | INTEGER PK  | Internal identifier   |
| ticket_number  | TEXT UNIQUE | Public ticket number  |
| full_name      | TEXT        | Customer name         |
| email          | TEXT        | Customer email        |
| subject        | TEXT        | Ticket subject        |
| category       | TEXT        | Ticket category       |
| priority       | TEXT        | Ticket priority       |
| description    | TEXT        | Ticket details        |
| status         | TEXT        | Current status        |
| assigned_to    | INTEGER     | Assigned admin user   |
| created_at     | DATETIME    | Creation timestamp    |
| updated_at     | DATETIME    | Last update timestamp |
| resolved_at    | DATETIME    | Resolution timestamp  |

### Status Values

```txt
Open
In Progress
Waiting for Customer
Resolved
Closed
```

---

## Table: support_ticket_attachments

| Column        | Type       | Description |
| ------------- | ---------- | ----------- |
| id            | INTEGER PK |             |
| ticket_id     | INTEGER FK |             |
| original_name | TEXT       |             |
| file_name     | TEXT       |             |
| mime_type     | TEXT       |             |
| file_size     | INTEGER    |             |
| created_at    | DATETIME   |             |

---

## Table: support_ticket_comments

| Column     | Type       | Description |
| ---------- | ---------- | ----------- |
| id         | INTEGER PK |             |
| ticket_id  | INTEGER FK |             |
| admin_id   | INTEGER    |             |
| comment    | TEXT       |             |
| is_public  | BOOLEAN    |             |
| created_at | DATETIME   |             |

### Purpose

Store:

* Internal admin notes
* Customer-visible responses

---

## Table: support_ticket_activity

| Column     | Type       | Description |
| ---------- | ---------- | ----------- |
| id         | INTEGER PK |             |
| ticket_id  | INTEGER FK |             |
| admin_id   | INTEGER    |             |
| action     | TEXT       |             |
| old_value  | TEXT       |             |
| new_value  | TEXT       |             |
| created_at | DATETIME   |             |

### Purpose

Store all ticket activity for auditing purposes.

---

# Part 3: Automated Email Notifications

## Description

Send automated emails when ticket events occur.

---

## Event: Ticket Created

Immediately after submission send a confirmation email.

### Subject

```txt
Support Ticket Received - {Ticket Number}
```

### Email Content

Include:

* Customer Name
* Ticket Number
* Subject
* Category
* Priority
* Submission Date
* Current Status
* Tracking Instructions

---

## Future Notification Events

### Ticket Assigned

Notify the customer when support begins working on the ticket.

### Public Reply Added

Notify the customer whenever an admin responds.

### Status Updated

Notify the customer when status changes.

### Ticket Resolved

Notify the customer when the issue has been resolved.

### Ticket Closed

Notify the customer when the ticket is closed.

---

# Part 4: Public Ticket Tracking Portal

## Description

Create a public-facing page allowing users to track ticket progress without requiring authentication.

---

## Tracking Form

Fields:

* Ticket Number


Example:

```txt
Ticket Number: SUP-20260708-000123
```

---

## Tracking Endpoint

Authorize user with correct ticketNumber and create JSONWebToken

```http
POST /api/support/ticket/status

```

Request:

```json
{
  "ticketNumber": "SUP-20260708-000123",
}
```

---

## Tracking Page Information

Display:

* Ticket Number
* Subject
* Category
* Priority
* Status
* Created Date
* Last Updated Date
* Public Admin Responses
* Resolution Date

---

## Security

### Requirements

* Generic error messages
* Rate limiting
* Input sanitization
* Request logging

---

# Part 5: Admin Dashboard Support Center

## Description

Create a dedicated Support Tickets section within the Dashboard.

Reuse existing components and patterns currently used throughout the project.

---

## Data Grid

Use:

```javascript
CustomDataGrid
```

Features:

* Server-side pagination
* Server-side sorting
* Server-side filtering
* Quick search

---

## Grid Columns

* Ticket Number
* Subject
* Category
* Priority
* Status
* Customer
* Assigned To
* Created At
* Updated At

---

## Filters

### Status

* Open
* In Progress
* Waiting for Customer
* Resolved
* Closed

### Priority

* Low
* Medium
* High

### Category

* Bug Report
* Technical Issue
* Feature Request
* Account Issue
* General Inquiry

### Additional Filters

* Assigned Admin
* Date Range

---

## Ticket Detail View

### Ticket Information

Display:

* Full customer details
* Subject
* Description
* Attachments
* Ticket history

---

## Attachment Viewer

Allow administrators to:

* Download files
* Preview supported formats

---

## Ticket Actions

### Assign Ticket

Assign ticket to:

* Yourself
* Another administrator

### Change Status

Available statuses:

```txt
Open
In Progress
Waiting for Customer
Resolved
Closed
```

### Add Internal Notes

Visible only to administrators.

### Add Public Responses

Visible in:

* Ticket tracker page
* Email notifications

---

# Part 6: Activity Logging

## Description

Every action performed on a support ticket should be logged.

---

## Log Events

* Ticket Created
* Ticket Assigned
* Ticket Reassigned
* Status Changed
* Internal Note Added
* Public Response Added
* Ticket Resolved
* Ticket Closed

---

## Activity Timeline

Display a chronological activity timeline within the ticket details page.

Example:

```txt
08 Jul 2026 09:00 Ticket Created
08 Jul 2026 09:15 Assigned to Admin
08 Jul 2026 09:25 Status Changed to In Progress
08 Jul 2026 09:30 Public Response Added
```

---

# Part 7: Security Requirements

## File Upload Security

### Validation

* Validate MIME type
* Validate extension
* Validate file size
* Reject executable files

### Storage

* Rename files using UUIDs
* Store outside public directory
* Serve through authenticated endpoints

---

## API Security

### Protection

* Rate limiting
* Input sanitization
* SQL injection prevention
* XSS prevention
* CSRF protection where applicable

---

## Tracking Portal Security

### Requirements

* Tracking token verification
* Request throttling
* Generic error responses
* Activity logging

---


## Planned Enhancements

### Ticket Reopening

Allow customers to reopen resolved tickets.

### Email Reply Integration

Convert email replies into ticket comments.

### SLA Management

Track response and resolution times.

### Ticket Tagging

Add custom tags for categorization.

### Analytics Dashboard

Provide metrics such as:

* Open tickets
* Resolution time
* Tickets by category
* Tickets by priority

### Knowledge Base Integration

Suggest help articles before ticket creation.

### Live Chat Escalation

Convert live chat sessions into support tickets.

### WhatsApp Integration

Allow support tickets to be created directly from WhatsApp conversations.

---

# Acceptance Criteria

* Users can create support tickets.
* Users can upload up to 3 attachments.
* Automated confirmation emails are sent.
* Tickets are stored in the database.
* Public ticket tracking is functional.
* Dashboard support section is operational.
* Administrators can manage ticket lifecycle.
* Activity logs are recorded.
* Security validation is implemented.
* All features follow the existing project UI and component architecture.



