# Feature Ticket 9 – Add MySQL Instance and Create Endpoint

## Description

Use the query below to implement this endpoint. The endpoint should be added under the `gec/members/` route.

```js
checkMemberStatByEmail = async (phone_number) => {
  try {
    const [err, rows] = await this.db().query({
      sql: `
        SELECT
          um.usrId,
          um.time,
          um.first_name,
          um.name,
          ml.email,
          ml.phone
        FROM __member_login ml
        LEFT JOIN usr_membership um ON um.usrId = ml.user_id
        WHERE um.time BETWEEN DATE_SUB(NOW(), INTERVAL 1 YEAR) AND NOW()
          AND um.id IS NOT NULL
          AND ml.phone = ?
      `,
      params: [phone_number],
    });

    return !err && rows?.length ? rows : [];
  } catch (err) {
    console.error("getPartnerEmailLogs error:", err);
    return [];
  }
};
```

## Part 2 – Display Member Status

### Description

In both the **ContactBook** component and the **Guest List**, add a new column named **Active Member**.

For each contact, call the `gec/members/` endpoint to determine whether the contact is an active member. If a matching record is found, display the same green indicator currently used for active events. If no record is found, leave the column empty.

To improve performance, consider enhancing the endpoint to accept a batch of phone numbers from the client and return all matching results in a single request, rather than making individual requests for each contact.



# Fix Display Member Status

### Description

The server sends back the data but the green indicator doesn't show - also when the mouse hover open a tool tip and view the response data 


## Part 2.1 – Display Member Status Enhancement

### Description

Add the same member status information to the **Response Logs** section.

Also, standardize and reuse the tooltip format shown below, and ensure that the tooltip appearance and styling are consistent throughout the application wherever member status information is displayed.

```js
<Tooltip
    title={`ID: ${member.usrId ?? ''} | Issue Date: ${
        member.time ? new Date(member.time).toLocaleString() : ''
    } | Email: ${member.email ?? ''}`}
    arrow
>
    <span>
        <BiSolidCheckCircle size={22} color="green" />
    </span>
</Tooltip>
```

### Requirements

* Add the member status indicator to the **Response Logs** section.
* Use the same tooltip content format across all components.
* Standardize the tooltip styling and behavior throughout the application.
* Ensure all member status tooltips provide a consistent user experience.


## Part 3 – Add Notepad for Each Contact Book Record

### Description

Add endpoints to the Contact Book routes to support storing notes for each contact record. Use the following table structure and maintain the relationship using the foreign key:

```sql
CREATE TABLE contact_book_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_book_id INTEGER,
    note_body TEXT,
    FOREIGN KEY (contact_book_id) REFERENCES contact_book(id)
);
```

### UI Requirements

In the **Contact Book**, **Guest List**, and **Response Logs** components, add a new action icon named **Notepad**.

When the user clicks the Notepad icon:

* Open a modal dialog.
* Display a textarea with **10 rows**.
* Style the textarea to resemble a **yellow sticky note**.
* Provide **Save** and **Cancel** buttons.

### Update Blank note_body Confirmation

If the user accidentally deletes the note content and clicks **Save**, display a confirmation dialog before removing the note from the database.

The confirmation dialog should ask the user to confirm the deletion action before proceeding.

## Part 3.1 – Improve Notepad Modal

* First replace all the TbNotes Icons with import { FaStickyNote } from "react-icons/fa";
* Second - pass down the contact first name and last name to the Notepad Modal and put it in the title 

## Part 3.2 – Improve Notepad Modal

Anywhere that we use Notepad instead of showing Notepad as the tooltip vie wthe content of Note pad if there is any

## Part 3.3 – Improve Notepad Tooltip Content View

on hovering the tool tip show at least 5 lines of the content note_body

## Part 3.4 – Improve Notepad Icon 

When the record doesn't have any content or note_body is null or empty the color of the notepad should be gray and if it has content use the same color that it has


# Fix `gec/members/check` and `gec/members/check-batch` Queries

## Description

The current query checks for matching members using normalized phone numbers:

```sql
SELECT
    um.usrId,
    um.time,
    um.first_name,
    um.name,
    ml.email,
    ml.phone
FROM __member_login ml
LEFT JOIN usr_membership um ON um.usrId = ml.user_id
WHERE um.time BETWEEN DATE_SUB(NOW(), INTERVAL 1 YEAR) AND NOW()
  AND um.id IS NOT NULL
  AND REPLACE(REPLACE(REPLACE(ml.phone, '+', ''), '-', ''), ' ', '')
      IN (${placeholders})
```

Additional logic is required.

If no match is found using the phone number, the query should also check the member's full name by combining `um.first_name` and `um.name`.
and the fullname placeholders should send to the end point from the client
Example:

```sql
SELECT
    um.usrId,
    um.time,
    um.first_name,
    um.name,
    ml.email,
    ml.phone
FROM __member_login ml
LEFT JOIN usr_membership um ON um.usrId = ml.user_id
WHERE um.time BETWEEN DATE_SUB(NOW(), INTERVAL 1 YEAR) AND NOW()
  AND um.id IS NOT NULL
  AND CONCAT(um.first_name, ' ', um.name)
      IN (${placeholders})
```

Consider using `COALESCE` or a similar approach so that the lookup can match either:

1. The normalized phone number.
2. The member's full name (`first_name + name`) when the phone number is unavailable or does not match.

This enhancement should improve member identification when phone data is missing or inconsistent.

# Fix Active Member Green Check in UI

## Description

In the ticket **Fix `gec/members/check` and `gec/members/check-batch` Queries**, we updated the server-side logic to find missing member records.

However, the client-side UI does not display the active member green check for records that were matched using the member's first name and last name. As a result, these members are correctly identified by the API but are not visually marked as active in the user interface.

Update the client-side logic to ensure that members found through first-name and last-name matching are displayed in the same way as members found through phone number matching, including the active member green check indicator.

