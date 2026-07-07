
# Feature 31 – Enhance Guest List for Mobile View

## Description

1. In **`GuestListPanel.jsx`**, the `CustomDataGrid` should display only the following columns when viewed on a mobile device:
   - Type
   - First Name
   - Last Name
   - Active Member
   - QR Code
   - Actions

```jsx
<CustomDataGrid
    key={eid}
    rows={selectedGuestList}
    columns={columns}
    rowsPerPageOptions={[25, 50, 100]}
    disableRowSelectionOnClick
    showToolbar
/>
```