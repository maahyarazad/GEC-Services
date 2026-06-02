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
