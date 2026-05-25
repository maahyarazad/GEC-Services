# Feature Ticket: Add Twilio Template Creation to the WhatsApp Section

## Part 1 — Create Endpoint in Server to Handle the Request

**Description:** Create an endpoint in the server and use env values to authenticate and send requests.

Here is an example from Twilio:

```bash
curl -X POST 'https://content.twilio.com/v1/Content' \
-H 'Content-Type: application/json' \
-u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN \
-d '{
    "friendly_name": "owl_air_qr",
    "language": "en",
    "variables": {"1":"Owl Air Customer"},
    "types": {
        "twilio/quick-reply": {
            "body": "Hi, {{1}} 👋 \nThanks for contacting Owl Air Support. How can I help?",
            "actions": [
                { "title": "Check flight status", "id": "flightid1" },
                { "title": "Check gate number", "id": "gateid1" },
                { "title": "Speak with an agent", "id": "agentid1" }
            ]
        },
        "twilio/text": {
            "body": "Hi, {{1}}. \nThanks for contacting Owl Air Support. How can I help?"
        }
    }
}'
```

My templates are mostly ClubTime invitations with only two buttons and one variable. Example template:

```
For German-speaking ClubPartners, Members, Experts, and DIFA Members:

Hallo {{first_name}},

wir laden dich herzlich ein, bei unserer nächsten ClubTime ABU DHABI dabei zu sein.

✅ Event: ClubTime Abu Dhabi
✅ Datum: 5. Juni 2026
✅ Uhrzeit: ab 19 Uhr
✅ Ort: Abu Dhabi, Shangri-La Hotel @Al Hana Bar

Welcome Drink und Valet Parking inklusive und außerdem:
• 20 % Discount für Übernachtungsgäste
• 25 % Discount für den Brunch am Samstag ab 13–16 Uhr

Um dabei zu sein, klicke schnell auf TEILNEHMEN und sichere dir deinen Platz auf der Gästeliste – die Plätze sind begrenzt!
Danach schicke ich dir sofort die Bestätigung mit Location-Link.

Wir freuen uns auf dich 😊
Herzliche Grüße
Sylvia
German Emirates Club

Buttons: Teilnehmen | Nicht teilnehmen
```

---

## Part 2 — Add a Button in the WhatsApp Section to Create Templates

**Description:** Users should be able to create `twilio/quick-reply` and `twilio/text` templates with variables as well as language. Also add a column to the `CustomDataGrid` that displays Twilio templates and shows their approval status.