# Feature Ticket: WhatsApp Section Enhancements

## Part 1 — Add Active Event to WhatsApp Section

Use the same styling as the Website Health section and add an **Active Event** card above the **Send Message** button.

The card should be slightly more compact and display the active event title by using the `active_event` column from the `events` table.

## Part 2 — Move out the Guest List DataGrid from the ContactBookDataGrid

Add a button in the WhatsApp Section below the contact book button and name it Guest List and it should view the same UI just take it out from ContactBookDataGrid

## Part 3 — Add UI Validation to Create Twilio Template

Add validation to the **Create Template** button. The button should be disabled with a tooltip explaining why it is disabled.

### Rules
1. **Message Body** must be filled in.
2. **Friendly Name** must be filled in and slugified.

---

Move the **Slugify** `IconButton` and place it next to the input field. Replace it with a `contained` style Button that includes an icon, and set the button label to **"Normalize"**.
