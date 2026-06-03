# Feature Ticket 1: Partner Delivery Info Step in Onboarding Wizard

## Description
Add a new step to the Partner Onboarding Wizard as the **3rd step**.
Partners cannot proceed to the submission step until this step is completed.

## Requirements
At this step, the partner must provide the following information:

| # | Field | Required |
|---|-------|----------|
| 1 | Delivery Address | ✅ |
| 2 | Contact Person | ✅ |
| 3 | Phone Number | ✅ |

## Validation Rules
- All fields are mandatory
- Partner cannot advance to the next step without completing all required fields

---

# Feature Ticket 2: Employee Status Management in Partner Onboarding

## Description
Enhance the Partner Onboarding process to allow HR to manage employee status.
This is an enhancement on top of `feature_2.md` — all existing functionality must be preserved.

## Requirements
HR must be able to perform the following actions on employee submission this where the csv file

| Action | Description |
|--------|-------------|
| **ADD** | Add a new employee record |
| **UPDATE** | Modify an existing employee record |
| **DELETE** | Remove an employee record |

## Scope
- **Frontend:** Remove controls for ADD / UPDATE / DELETE actions
- **Backend:** Update the backend INSERT OR IGNORE INTO partner_onboarding_data (
        title,
        firstname,
        lastname,
        gender,
        mobile_number,
        email,
        partner,
        birthday,
        language
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) and add extra flag as soft delete insert and update features.



## Dependencies
- Builds on top of `feature_2.md` — review and extend existing logic accordingly


## Part 2: Dashboard Sync Enhancement

### Description
The Partner Onboarding Dashboard has two panels (left and right).
The **Sync** button, currently available on the left panel, must also be available on the right panel.

### Requirements
- Display the Sync button on the **right panel** of the Dashboard
- When triggered from the right panel, the Sync button should process and sync partners that **do not yet exist in the services database**

### Acceptance Criteria
- [ ] Sync button is visible and functional on the right panel
- [ ] Sync action filters and processes only partners not found in the services database
- [ ] Existing left panel Sync behavior remains unchanged


## Part 3: Add Type Control to Partner Onboarding Data Sync

## Requirements
- For all **INSERT** and **UPDATE** operations, `member_card.type` must be set to `7`
- **Exception:** If the member's language is **German**, `member_card.type` must be set to `5`

## Logic Summary

| Condition | `member_card.type` |
|---|---|
| Default (all members) | `7` |
| Member language is German | `5` |



# Feature Ticket 3: Brew partner_onboarding_data

## Description
This ticket builds on `feature_7.md` — all existing functionality must be preserved.

## Scope

### Frontend
Move the ADD / UPDATE / DELETE action controls from the Partner Employee List Submission 
section to the Corporate Members section, and remove those buttons from 
Partner Employee List Submission.

### Backend
- Update the backend to handle modifications to `member_card` records related to 
  the Corporate Members section.
- Update the existing INSERT statement to include an action flag supporting 
  soft delete, insert, and update operations:

```sql
  INSERT OR IGNORE INTO partner_onboarding_data (
      title,
      firstname,
      lastname,
      gender,
      mobile_number,
      email,
      partner,
      birthday,
      language,
      action_type
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

## Sync Enhancement Requirements

When triggered from the right panel, the Sync button should process 
`partner_onboarding_data`, determine which action is stored, and invoke 
the corresponding operation during sync:

| Action | Description |
|--------|-------------|
| **ADD** | Add a new `member_card` record |
| **UPDATE** | Modify an existing `member_card` record |
| **DELETE** | Soft delete a `member_card` record |


# Fix Ticket 1: Fix Brew partner_onboarding_data

In `insertContact`, the `action_type` (e.g. `'add'`) should come from the CSV file via the frontend and be passed in as a parameter like the other fields, rather than being hardcoded.

```js
const insertMany = db.transaction((contacts, partner) => {
  let inserted = 0;

  for (const row of contacts) {
    // Normalise keys to lowercase
    const r = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k.toLowerCase().trim(),
        String(v ?? "").trim(),
      ])
    );

    // Sanitise CHECK constraint fields — fall back to "" if value is invalid
    const title = VALID_TITLES.includes(r.title) ? r.title : "";
    const gender = VALID_GENDERS.includes(r.gender) ? r.gender : "";
    const language = VALID_LANGUAGES.includes(r.language) ? r.language : "en";

    let birthday = null;
    if (r["date of birth"]) {
      const ddmmyyyy = r["date of birth"].match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (ddmmyyyy) {
        birthday = `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`; // → YYYY-MM-DD
      } else if (/^\d{4}-\d{2}-\d{2}/.test(r["date of birth"])) {
        birthday = r["date of birth"];
      }
    }

    const insertContact = db.prepare(`
      INSERT OR IGNORE INTO partner_onboarding_data (
          title,
          firstname,
          lastname,
          gender,
          mobile_number,
          email,
          partner,
          birthday,
          language,
          action_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = insertContact.run(
      title,
      r["first name"],
      r["last name"],
      gender,
      r["mobile number"],
      r.email,
      partner,
      birthday,
      language,
      r.action_type        // passed in from the CSV, not hardcoded
    );

    if (info.changes > 0) inserted++;
  }

  return inserted;
});
```



# Fix Ticket 2: Fix UPSERT logic in member-card-sync route

select deduplicated data from partner_onboarding_data


```js
const sync = db.transaction(() => {
      // Step 0 — load the pending batch for this partner
      const batch = db.prepare(`
WITH unsynced_table AS (
  SELECT * FROM partner_onboarding_data
  WHERE LOWER(partner) = LOWER(?)
    AND metadata_createdAt >= datetime('now', '-1 month')
    AND synchronized != 1
),
deduped AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY mobile_number
      ORDER BY metadata_createdAt DESC
    ) AS rn
  FROM unsynced_table
)
SELECT *
FROM deduped
WHERE rn = 1;
      `).all(partner);

      
```

# Feature Ticket 4: Pre-fill Delivery Contact Info in Partner Onboarding

**Stage:** Step 3 of the onboarding wizard

**Description:**
On reaching Step 3, query the database use the sql syntax below for an existing delivery address
tied to the current partner. If a record is found, pre-fill the relevant
form fields (address, phone number) with the most recent non-duplicate entry.

**Acceptance Criteria:**
- [ ] Query uses case-insensitive partner matching
- [ ] Deduplication is applied: most recent record per phone_number is used
- [ ] If a record exists, fields are pre-filled (but remain editable)
- [ ] If no record exists, fields remain blank as normal


```sql

  WITH unsynced_table AS (
     SELECT * FROM partner_delivery_info
     WHERE LOWER(partner) = LOWER(?)
   ),
   deduped AS (
     SELECT *,
       ROW_NUMBER() OVER (
         PARTITION BY phone_number
         ORDER BY metadata_createdAt DESC
       ) AS rn
     FROM unsynced_table
   )
   SELECT *
   FROM deduped
   WHERE rn = 1;

      
```



# Feature Ticket 5: Add Synchronized Column to Partner Employee List Submission DataGrid

**Description:**
In the Partner Employee List Submission DataGrid, add a `synchronized` column
to display each record's sync status. Update the query to load non-synchronized
records by default, while allowing users to toggle the view to also see
synchronized records.

**Acceptance Criteria:**
- [ ] A `synchronized` column is added to the DataGrid
- [ ] Column displays a clear indicator (e.g. boolean, badge, or icon) per row
- [ ] Query defaults to loading only non-synchronized records on page load
- [ ] A toggle or filter control allows users to also view synchronized records
- [ ] Switching the filter does not require a full page reload



# Feature Ticket 6: Add Google Phone Validation to `validateAndConvertXlsx.tsx`

## Description

Use `parsePhoneNumberFromString` from `libphonenumber-js` to validate phone numbers during the XLSX import process.

```javascript
const { parsePhoneNumberFromString } = require("libphonenumber-js");
```

If a row contains an invalid phone number, mark the row as a faulty record and add it to the `FaultyRecord` collection.


# Feature Ticket 6.1: Enhance Phone and Email Validation in `validateAndConvertXlsx.tsx`

## Description

For each phone number record:

1. Trim any leading and trailing whitespace.
2. Remove any unwanted characters using a regular expression.
3. Ensure the phone number starts with a `+` before passing it to the `parsePhoneNumberFromString` function.

Use a regular expression to validate email addresses as well. Any row containing an invalid phone number or email address should be added to the `FaultyRecord` list.


# Feature Ticket 6.2: Enhance Phone Validation in Partner Onboarding

## Description

Add phone number validation to the **Delivery Info** step of the Partner Onboarding process.

Use `parsePhoneNumberFromString` from `libphonenumber-js` to validate phone numbers.

```javascript
const { parsePhoneNumberFromString } = require("libphonenumber-js");
```

Before validation:

1. Trim any leading and trailing whitespace.
2. Remove any unwanted characters using a regular expression.
3. Ensure the phone number starts with a `+` before passing it to the `parsePhoneNumberFromString` function.

If the phone number is invalid, display an appropriate validation error and prevent the user from proceeding until the issue is resolved.


# Feature Ticket 7: Fortify the Member Card Sync

## Description

This section of the code in the partner onboarding process plays a crucial role.

```js
router.post("/api/member-card-sync", (req, res) => {
  const { partner } = req.body;
  if (!partner) return res.status(400).json({ status: false, message: "partner is required" });

  try {
    const sync = db.transaction(() => {
      // Step 0 — load the pending batch for this partner
      const batch = db.prepare(`
      WITH unsynced_table AS (
  SELECT * FROM partner_onboarding_data
  WHERE LOWER(partner) = LOWER(?)
    AND metadata_createdAt >= datetime('now', '-1 month')
    AND synchronized != 1
),
deduped AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY mobile_number
      ORDER BY metadata_createdAt DESC
    ) AS rn
  FROM unsynced_table
)
SELECT *
FROM deduped
WHERE rn = 1;
      `).all(partner);

      if (batch.length === 0) return { updated: 0, inserted: 0, deactivated: 0 };

      const addBatch    = batch.filter(r => r.action_type === 'add');
      const updateBatch = batch.filter(r => r.action_type === 'update');
      const deleteBatch = batch.filter(r => r.action_type === 'delete');

      let updated = 0;
      let deactivated = 0;

      // STEP 1:  Handle 'update' action: apply field changes to existing member_card rows
      const updateStmt = db.prepare(`
        UPDATE member_card
        SET firstname = ?, lastname = ?, title = ?,
            gender    = CASE ? WHEN 'm' THEN 'Herr' WHEN 'f' THEN 'Frau' ELSE NULL END,
            email = ?, birthday = ?,
            type      = CASE ? WHEN 'de' THEN 5 ELSE 7 END,
            active = 1,
            remarks = 'synchronized ' || datetime('now'),
            metadata_modifiedAt = datetime('now')
        WHERE LOWER(partner) = LOWER(?) AND mobile_number = ?
      `);
      for (const r of updateBatch) {
        updated += updateStmt.run(r.firstname, r.lastname, r.title, r.gender, r.email, r.birthday, r.language, r.partner, r.mobile_number).changes;
      }

      // STEP 2: Handle 'delete' action: soft-delete matching member_card rows
      const deleteStmt = db.prepare(`
        UPDATE member_card SET active = 0, remarks = 'synchronized delete ' || datetime('now')
        WHERE LOWER(partner) = LOWER(?) AND mobile_number = ?
      `);
      for (const r of deleteBatch) {
        deactivated += deleteStmt.run(r.partner, r.mobile_number).changes;
      }

      // STEP 3: Handle 'add' action: batch INSERT / UPDATE / DEACTIVATE (original logic)
      let insertResult = { changes: 0 };
      let deactivateResult = { changes: 0 };
      let updateResult = { changes: 0 };

      if (addBatch.length > 0) {
       
        // INSERT new members whose mobile_number is not yet in member_card
        insertResult = db.prepare(`
          INSERT INTO member_card (partner, mobile_number, firstname, lastname, title, gender, email, birthday, active, type, remarks)
          SELECT pod.partner, pod.mobile_number, pod.firstname, pod.lastname,
                 pod.title,
                 CASE pod.gender WHEN 'm' THEN 'Herr' WHEN 'f' THEN 'Frau' ELSE NULL END,
                 pod.email, pod.birthday,
                 1,
                 CASE pod.language WHEN 'de' THEN 5 ELSE 7 END,
                 'synchronized ' || datetime('now')
          FROM partner_onboarding_data AS pod
          WHERE LOWER(pod.partner) = LOWER(?)
            AND pod.metadata_createdAt >= datetime('now', '-1 month')
            AND pod.synchronized != 1
            AND (pod.action_type IS NULL OR pod.action_type = 'add')
            AND NOT EXISTS (
                SELECT 1 FROM member_card AS mc
                WHERE LOWER(mc.partner) = LOWER(pod.partner)
                  AND mc.mobile_number = pod.mobile_number
            )
        `).run(partner);

       
      }

      // Step 4 — Mark all batch records as synchronized
      db.prepare(`
        UPDATE partner_onboarding_data
        SET synchronized = 1
        WHERE LOWER(partner) = LOWER(?)
          AND metadata_createdAt >= datetime('now', '-1 month')
          AND synchronized != 1
      `).run(partner);

      return {
        updated:     updated + updateResult.changes,
        inserted:    insertResult.changes,
        deactivated: deactivated + deactivateResult.changes,
      };
    });

    const result = sync();
    return res.json({ status: true, ...result });
  } catch (error) {
    console.error("Error in /api/member-card-sync:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});
```

### 1. Enhance Add Logic

Before performing the insert, the system must check whether a record with the same phone number already exists in `member_card`.

* If a matching phone number exists, the operation must be converted from an **INSERT** to an **UPDATE**.
* This behavior is mandatory and must always be applied.

#### 1.1 Additional Validation for the Add Flag

When processing records with the `add` flag, the following restriction must be enforced:

* If a record with the same phone number exists:

  * in `member_card` with `active = 1`, and
  * in `partner_onboarding_data` with:

    * the same phone number,
    * `sync = 1`, and
    * a `created_metadata` value less than three months old,

then the system must prevent the transaction for that specific record and continue processing the remaining records.

---

### 2. Card Number and Expiry Date Generation

This logic applies **only** to records with the `add` flag.

The system must:

1. Generate a new expiry date based on the current date, with an expiration date one year in the future.
2. Generate a new card number by:

   * Finding the largest existing card number that starts with `7` for the `en` language and `5` for the `de` language.
   * Incrementing that number by `1`.
   * Assigning the new value to the newly created record.

---

### 3. Update Logic

For records with the `update` flag:

* The system may update only the following fields:

  * `firstname`
  * `lastname`
  * `title`
  * `birthdate`
  * `email`
  * `active`

* Before performing the update, the system must verify that the phone number does not already belong to another record.

* If another record with the same phone number exists, the update operation must be rejected for that specific record, and processing must continue with the remaining records.

