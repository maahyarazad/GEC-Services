# Follow-up: deferred "Category" column in the template grid

**Feature**: `005-twilio-template-category` | **Raised by**: T033 | **Status**: not started

Deliberately out of scope for feature 005 (research R9 — the scope boundary is the
two files the feature description names). Recorded here so it is not lost.

## What

Show each template's WhatsApp approval category as a column in
`public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx`, beside the
existing approval status.

## Why it is cheap

No server work is needed. `GET /api/twilio/approvals` already proxies Twilio's
whole `whatsapp` approval object per SID, `category` included (research R8), so the
value is already arriving in the browser and is simply not read.

## Where

`TwilioTemplateDataGrid.tsx:565` already does:

```ts
const status: string = a?.whatsapp?.status ?? 'unknown';
```

The category sits next to it on the same object:

```ts
const category: string = a?.whatsapp?.category ?? 'unknown';
```

Add a column rendering that value alongside the existing status column. This is a
client-only change.

## Why it is worth doing

Feature 005 lets an administrator *request* a category and reports what Twilio
echoed back at creation time. But Meta's final decision arrives asynchronously,
after the snackbar is long gone. Until the grid shows the category, there is no
place in the application to see what a template's category actually settled on —
the administrator has to open the Twilio Console.
