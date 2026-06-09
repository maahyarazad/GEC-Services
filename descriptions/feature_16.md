# Feature Ticket 16: App Support Portal UI Improvements

## Description

### 1. Update Support Portal and Ticket Tracker UI

Follow the UI and UX patterns used in the `PartnerOnboarding` and `PurchaseMembership` components, and apply the same design to the `SupportPortal` and `TicketTracker` components.

```js
Need help?{" "}
<Box
    component="span"
    sx={footerLinkSx}
    onClick={() => {
        window.location.href =
            "mailto:development3@german-emirates-club.com";
    }}
>
    Contact Support
</Box>
```

### 2. Replace "Contact Support" with "Raise a Ticket"

In both the `PartnerOnboarding` and `PurchaseMembership` components, replace the **"Contact Support"** action with **"Raise a Ticket"** so users are directed to the Support Portal instead of opening an email client.



# Feature Ticket 17: Support Portal UI Improvements


## Description
Validation errors change the layout of the input fields, preserve the height and space for the validation errors so the input fields don't go up and down.


# Feature Ticket 18: Support Portal UI Improvements


## Description
Use SnackBar to reflect the Server API responses in SupportPortal


# Feature Ticket 19: Dashboard Support Center UI Improvement

## Description

Add a detailed modal view that opens when a user clicks on a row in the Support Center table.

The modal should display:

* Ticket description
* User email address
* Ticket status
* Creation date and time
* Assigned user (if applicable)
* Any other relevant ticket details


# Feature Ticket 20: Dashboard Support Center UI Improvement

## Description

Add Action Column to the SupportSection so admin can open the TicketDetailModal

## Implementation

### Frontend (`SupportSection.jsx`)

- Moved the `columns` array inside the component so the action column's `renderCell` can close over `setSelectedId`.
- Added an **Actions** column (first column, width 80, non-sortable, non-filterable) that renders a primary `IconButton` with `OpenInNewIcon` and a "View ticket" tooltip.
- Clicking the button calls `setSelectedId(row.id)` and stops event propagation so it doesn't conflict with any parent handler.
- Removed the broken `onRowClick` prop (it was passing `params.row.id` but `CustomDataGrid` passes the row directly, not `{ row }`) and the associated `cursor: pointer` style. The action button is now the sole entry point for opening the modal.
- Added `Tooltip` and `IconButton` to the MUI imports and `OpenInNewIcon` from `@mui/icons-material/OpenInNew`.

### Frontend (`TicketDetailModal.jsx`)

- Replaced deprecated `InputProps` with `slotProps={{ input: ... }}` on the assign dropdown to resolve the MUI v6 deprecation warning.
