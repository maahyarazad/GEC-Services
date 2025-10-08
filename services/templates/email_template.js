const emailTemplates = {
    german: {
        subject: (title) => `${title} Anmeldung`,
        header: "Anmeldung Bestätigt",
        greeting: (title) =>
            `Vielen Dank für Ihre Anmeldung zum folgenden Event: <strong>${title}</strong>. Wir schätzen Ihr Interesse und freuen uns auf Ihre Teilnahme.`,
        dateLabel: "Datum",
        timeLabel: "Uhrzeit",
        eventTimeSection: (time) =>
            time ? `<p><strong>Zeit: </strong> ${time}</p>` : "",
        qrMessage:
            "Bitte bewahren Sie diese E-Mail auf, damit wir Ihren QR-Code scannen können:",
             passMessage: "Hinweis: Klicken Sie unten auf die Schaltflächen \"Apple Pass\" oder \"Google Pass\", um Ihren Event Access Pass auf Ihr Telefon herunterzuladen.",
       
        appleWalletAlt: "Add to Apple Wallet",
        googleWalletAlt: "Add to Google Wallet",
                eventLocationName: (event_location_name) =>
            event_location_name ? `<p><strong>Veranstaltungsort: </strong> ${event_location_name}</p>` : "",
        locationLabel: "Veranstaltungsort – Karte antippen für Navigation.",
        contactMessage: `Wenn Sie Fragen haben, kontaktieren Sie uns bitte unter <br/><a href="mailto:office5@german-emirates-club.com" style="color:#D9B144; text-decoration:none;">office5@german-emirates-club.com</a>.`,
        closing: "Mit freundlichen Grüßen,<br />Das Team des German Emirates Club",
        footer: (year) =>
            `&copy; ${year} German Emirates Club. Alle Rechte vorbehalten.`,
    },
    english: {
        subject: (title) => `${title} Registration`,
        header: "Registration Confirmed",
        greeting: (title) =>
            `Thank you for registering for the following event: <strong>${title}</strong>. We appreciate your interest and look forward to your participation.`,
        dateLabel: "Date",
        timeLabel: "Time",
        eventTimeSection: (time) =>
            time ? `<p><strong>Time: </strong> ${time}</p>` : "",
        eventLocationName: (event_location_name) =>
            event_location_name ? `<p><strong>Event Venue: </strong> ${event_location_name}</p>` : "",
        qrMessage: "Please keep this email so we can scan your QR code:",
         passMessage:
            "Note: Please make sure to click on Apple Pass or Google Pass buttons below to download your Event Access Pass on your phone",
        appleWalletAlt: "Add to Apple Wallet",
        googleWalletAlt: "Add to Google Wallet",
        locationSection: "Event Location – Tap map for navigation.",
        locationLabel: "Event Location – Tap map for navigation.",
        contactMessage: `If you have any questions, please contact us at <br/><a href="mailto:office5@german-emirates-club.com" style="color:#D9B144; text-decoration:none;">office5@german-emirates-club.com</a>.`,
        closing: "Best regards,<br />The German Emirates Club Team",
        footer: (year) =>
            `&copy; ${year} German Emirates Club. All rights reserved.`,
    },
};

module.exports = { emailTemplates };
