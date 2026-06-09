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
Each Input field in the SupportPortal and TicketTracker component label should have use the same GEC style color on focus 
