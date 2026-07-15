# Feature Ticket: Corporate Member Card and Partner Onboarding Data Management

**1.** In the UI only, rename the Member Card Section to **Corporate Member**.

**2.** In the Member Card Section, use the available space to add a **scrollable and searchable table on the left side** displaying the following data:

```sql
SELECT mc.partner, COUNT(*) AS member_count
FROM member_card AS mc
GROUP BY mc.partner
ORDER BY member_count DESC;
```

Create a dedicated API endpoint for this query.

**3.** On the **right side**, add a **scrollable and searchable table** displaying data from the following function:

```js
async function fetchGroupedPartnerFromGEC(req) {
  const data = req.body;
  const baseUrl =
    process.env.ENVIRONMENT === "PRODUCTION"
      ? `${process.env.GEC__ORIGIN}/api/`
      : `${process.env.GEC__ORIGIN}`;

  // ── 1. Fetch partners ──────────────────────────────────────────
  const fetchRes = await fetch(`${baseUrl}partners/get-grouped-partners`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      services_secret: process.env.SERVICES_SECRET,
    },
  });

  const partnerData = await fetchRes.json();

  if (!fetchRes.ok || !partnerData.success || !partnerData?.data?.length) {
    return { error: true };
  }

  return { error: false, data: partnerData?.data };
}
```

Compare `mc.partner` with `fetchGroupedPartnerFromGEC.title`. In the right-side table, add a **chip indicator** for any partner that does not have corresponding data in the Services.

**4.** Move the existing **DataGrid** from the Member Card Section into a **modal/slider**, accessible via a button labeled **"Corporate Members"** at the top of the section.