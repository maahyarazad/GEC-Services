# Feature Ticket Part 1: Twilio Template Creation Enhancements

## Description

Currently, the template creation form only supports a single personalization variable.

Example:

```txt
Use {{1}} for the personalization variable

Hans Smith
Example value for {{1}}

Actual sample shown to WhatsApp for approval, e.g. "Hans" or "Maria"
```

We need to enhance the template creation UI to support **multiple personalization variables**.

## Frontend Requirements

* Add an **"Add Variable"** button.
* When clicked, a new input field should be added dynamically.
* Each input field represents a sample value for a template variable.
* The UI should support an arbitrary number of variables:

  * `{{1}}`
  * `{{2}}`
  * `{{3}}`
  * etc.
* Users should be able to provide a sample value for each variable that will be submitted to Twilio for template approval.

### Example

Template body:

```txt
Hello {{1}},

Your membership card {{2}} is ready for collection.

Thank you,
{{3}}
```

Sample values:

```txt
{{1}} = Hans Smith
{{2}} = GEC-12345
{{3}} = German Emirates Club
```

## Backend Requirements

The backend currently assumes that only a single variable exists.

Update the template creation and approval workflow to support multiple variables by accepting and forwarding all provided sample values to Twilio.

The approval-related endpoints should also be reviewed and updated where necessary to ensure that templates containing multiple personalization variables are handled correctly.

Example endpoint:

```javascript
router.get("/api/twilio/approvals", async (req, res) => {
  try {
    const result = await fetchContentTemplates();

    if (!result.status) {
      return res.status(500).json({
        status: false,
        message: "Failed to fetch templates",
      });
    }

    const credentials = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString("base64");

    const approvals = await Promise.all(
      result.result.map(async (template) => {
        try {
          const r = await fetch(
            `https://content.twilio.com/v1/Content/${template.sid}/ApprovalRequests`,
            {
              headers: {
                Authorization: `Basic ${credentials}`,
              },
            }
          );

          const data = await r.json();

          return {
            sid: template.sid,
            approval: r.ok ? data : null,
          };
        } catch {
          return {
            sid: template.sid,
            approval: null,
          };
        }
      })
    );

    const approvalMap = {};

    for (const { sid, approval } of approvals) {
      approvalMap[sid] = approval;
    }

    return res.json({
      status: true,
      approvals: approvalMap,
    });
  } catch (error) {
    console.error("Error in /api/twilio/approvals:", error);

    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
});
```


variable_examples
```json
[
  "Herr",
  "Dr.",
  "Hans Smith",
]
```

body:
```txt
'Lieber {{gender}} {{title}} {{last_name}}, auf Empfehlung von Dr. Jan Niclas Strickling möchten wir Sie herzlich zu unserem nächsten Meeting der Medical Society einladen. 📅 Datum: 8. Juni 2026 🕖 Beginn: ab 19:00 Uhr Location: Swissôtel Al Murooj Dubai Freuen Sie sich auf einen angenehmen Abend mit Austausch, Networking und gemeinsamen Gesprächen in entspannter Atmosphäre. Inklusive: • Valet Parking • Kaffeepause • Networking-Zeit • Dinner Wir bitten Sie herzlich um kurze Bestätigung Ihrer Teilnahme und freuen uns darauf, Sie zu sehen. Herzliche Grüße Sylvia Raseck und das Team der German Medical Society'
```

this pattern doesn't work and the variables objects are empty
```js
    // Build variables map from all {{N}} occurrences in the body
    const variables = {};
    const varPattern = /\{\{(\d+)\}\}/g;
    let varMatch;
    while ((varMatch = varPattern.exec(typePayload.body)) !== null) {
      const idx = parseInt(varMatch[1], 10);
      const sample = (variable_examples || [])[idx - 1];
      if (sample) variables[String(idx)] = sample;
    }
```