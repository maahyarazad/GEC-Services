# Bug Ticket: OTP Timer Issue

## Description

The `OtpTimer` component in `OTPInput` has two issues:

1. The timer does not reset when a new OTP is requested. 
2. On the registration page, the **Request OTP** button becomes disabled after requesting an OTP, which is not the intended behavior.

The server-side rate limiter is already in place and should remain enabled. Therefore, the client-side button should not be permanently disabled and should allow users to request a new OTP when appropriate.

# Bug Ticket: OTP Timer Issue – Part 2

## Description

The `OtpTimer` component in `OTPInput` has an issue:

1. The timer does not reset when a new OTP is requested. It currently works correctly only in `TemplateForm.jsx`.

Review the implementation pattern used in `TemplateForm.jsx` and apply the same pattern to all other locations where `OTPInput` is used to ensure consistent timer reset behavior.

# Bug Ticket: OTP Timer Issue – Part 3

## Description

The `OtpTimer` component in `OTPInput` is not visible in PartnerOnboarding.tsx

1. the OTPInput is nit visible in PartnerOnboarding.tsx 

Review the implementation pattern used in `MemberLogin.jsx` and apply the same pattern to PartnerOnboarding.tsx


# Feature Ticket: Change Server Request to Stored Procedure Call

## Description

Replace the external API request with a direct MySQL stored procedure call.

Use the MySQL database and execute the following stored procedure to retrieve the data:

```js
const rows = await query("CALL sp_get_partner_contact_grouped_list()");
```

The `/api/gec-grouped-partners` endpoint should no longer make a request to the GEC service. Instead, it should fetch the data directly from the database using the stored procedure above.

The endpoint should continue to return only active partners (`status === '1'`) to maintain compatibility with the existing API response format.

The following implementation should be replaced:

```js
router.get("/api/gec-grouped-partners", async (req, res) => {
  try {
    const baseUrl =
      process.env.ENVIRONMENT === "PRODUCTION"
        ? `${process.env.GEC__ORIGIN}/api/`
        : `${process.env.GEC__ORIGIN}`;

    const fetchRes = await fetch(
      `${baseUrl}partners/get-grouped-partner-list`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          services_secret: process.env.SERVICES_SECRET,
        },
      }
    );

    if (!fetchRes.ok) {
      return res
        .status(502)
        .json({ status: false, message: "GEC fetch failed" });
    }

    const partnerData = await fetchRes.json();

    return res.json({
      status: true,
      data: partnerData?.data.filter((x) => x.status === "1") ?? [],
    });
  } catch (error) {
    console.error("Error in /api/gec-grouped-partners:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});
```


# Bug Ticket: Partner Onboarding Issue – Legacy Admin Partners Shows All Partners

## Description


below is the d.data sample please fix the right panel - it should show all the legacy admin partners 

```js
 const fetchGecPartners = useCallback(async () => {
        setGecLoading(true);
        try {
            const r = await fetch(`${import.meta.env.VITE_SERVERURL}/api/gec-grouped-partners`, { credentials: 'include' });
            const d = await r.json();
            
            setGecPartners(d.data ?? []);
        } catch (e) {
            console.error('GEC partners fetch failed', e);
        } finally {
            setGecLoading(false);
        }
    }, []);
```

```js
[
    [
        {
            "group_name": "****** | ******",
            "subsidiaries": null,
            "email_count": 1,
            "fullname": "****** ******t",
            "emails": "******=******@zub**********ational.com",
            "divions": "Entscheidungsträger"
        },
       
    ],
    {
        "fieldCount": 0,
        "affectedRows": 0,
        "insertId": 0,
        "info": "",
        "serverStatus": 34,
        "warningStatus": 0,
        "changedRows": 0
    }
]
```

# Bug Ticket: PlaceIdFinder Crash

## Description

Switching between tabs in the dashboard causes the application to crash. fix the MAP_ID AND USE GOOGLE RECOMMENDED DOSC

The issue appears to occur when the `PlaceIdFinder` component is unmounted and remounted during tab navigation.

Error log:

```txt
main.js:478 The map is initialized without a valid Map ID, which will prevent use of Advanced Markers.
log @ main.js:478Understand this error
main.js:186 Uncaught InvalidValueError: <gmp-map>: Cannot set property "center" to 25.2048, 55.2708: not a LatLng or LatLngLiteral with finite coordinates: not an Object
```

## Expected Behavior

Switching between dashboard tabs should not cause the application to crash. The `PlaceIdFinder` component should properly clean up any active instances, event listeners, and external resources when it is unmounted.



