# Feature Ticket 10 – View Partner Delivery Location DataGrid

## Description

We need to add a new **Delivery & Tracking** section to the dashboard.

The main section component should be split into two panels:

### Left Panel (1/4 Width)

Display the partner list.

- Reuse the same data source currently used for fetching partners (refer to the `rightTableRows` implementation in `MemberCardDataGrid.jsx`).
- The list should check `partner_onboarding_data`.
- If delivery location data exists for a partner with the same partner name, that partner should be available for selection/clicking.

### Right Panel (3/4 Width)

When a partner is selected from the left panel:

1. Display the partner's delivery locations at the top of the right panel by fetching the data from the corresponding delivery location table.
2. Below the delivery locations, add a **CustomDataGrid**.
3. The grid should be based on the existing **Partner Employee List Submission** implementation and fetch the corresponding partner data when a partner is selected.
4. Reuse the same logic as `MemberCardDataGrid.jsx` and the `rightTableRows` dataset.
5. Add an additional filter so that only **German-speaking people** are displayed.