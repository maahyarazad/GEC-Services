require("dotenv").config();
const path = require("path");
const fs = require("fs");
const fsPromise = require('fs/promises');
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const { SESClient, SendRawEmailCommand } = require("@aws-sdk/client-ses");
const nodemailer = require("nodemailer");
const { PassThrough } = require("stream");

const ses = new SESClient({
    region: process.env.AWS_REGION, // e.g. "us-east-1"
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});


async function sendEmail({ to, subject, html, text }) {
    const params = {
        Source: process.env.SES_FROM_EMAIL, // Must be verified in SES
        Destination: {
            ToAddresses: [to],
        },
        Message: {
            Subject: { Data: subject },
            Body: {
                Html: { Data: html },
                Text: { Data: text || '' },
            },
        },
    };

    try {
        const response = await transporter.sendMail(mailOptions);
        console.log('Email sent:', response.messageId);
        return response;
    } catch (error) {
        console.error('SendGrid SMTP error:', error);
        throw error;
    }
    // try {
    //   const command = new SendEmailCommand(params);
    //   const response = await ses.send(command);
    //   console.log("Email sent:", response.MessageId);
    //   return response;
    // } catch (err) {
    //   console.error("Email send error:", err);
    //   throw err;
    // }
}



async function sendRawEmailWithAttachments({ to, subject, html, text = '', attachments = [] }) {
    const transporter = nodemailer.createTransport({
        secure:false,
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER, // This MUST be the literal string 'apikey'
            pass: process.env.SMTP_PASS, // Your actual SendGrid API Key
        },
        // Stupid configuration coming from ChatGPT and break the whole thing!!
        // streamTransport: true,
        // buffer: true,
    });

    const mailOptions = {
        from: process.env.SMTP_SENDER,
        to,
        // bcc: ["development2@german-emirates-club.com", "office1@german-emirates-club.com"],
        subject,
        text,
        html,
        attachments, // Example format below
    };

    try {
        const response = await transporter.sendMail(mailOptions);
        console.log('Email sent:', response.messageId);
        return response;
    } catch (error) {
        console.error('SendGrid SMTP error:', error);
        throw error;
    }
}


async function event_confirm_registration_email_aws(reqBody) {
    const tempPath = path.join(__dirname, "..", "qr-files");
    const mapRoot = path.join(__dirname, "..", "maps");
    const qrPath = path.join(tempPath, `${reqBody.event_id}.png`);
    const mapPath = path.join(mapRoot, `${reqBody.event}.png`);


    const [mapBuffer, qrBuffer] = await Promise.all([
        fsPromise.readFile(mapPath),
        fsPromise.readFile(qrPath)
    ]);
    const currentYear = new Date().getFullYear();
    const eventTimeSection = reqBody.event_time
        ? `<p><strong>Time:</strong> ${reqBody.event_time}</p>`
        : '';
    const eventLocationName = reqBody.event_location_name
        ? `<p><strong>Time:</strong> ${reqBody.event_location_name}</p>`
        : '';

    const eventLocationSection =
        reqBody.event && reqBody.event_location
            ? `
        <tr>
          <td align="center" style="padding:20px;">
            <p><strong>Event location — tap the map below for navigation:</strong></p>
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reqBody.event_location)}" target="_blank" rel="noopener noreferrer">
              <img src="cid:event-location" alt="Event Location Map" width="200" height="200" style="border:0; display:block;" />
            </a>
          </td>
        </tr>`
            : '';

    const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${reqBody.title} Registration</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
      <thead>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); margin:40px auto;">
              <tr>
                <td bgcolor="#D9B144" style="color:#ffffff; text-align:center; padding:20px; font-size:22px; font-weight:bold; border-top-left-radius:8px; border-top-right-radius:8px;">
                  Registration Confirmed
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; padding:0 30px 30px;">
              <tr>
                <td style="padding:20px; font-size:16px; color:#333333; line-height:1.6;">
                  <p>Thank you for registering for the <strong>${reqBody.title}</strong>. We appreciate your interest and look forward to your participation.</p>
                  <p><strong>Date:</strong> ${reqBody.event_date}</p>
                  ${eventTimeSection}
                  ${eventLocationName}
                </td>
              </tr>
              ${eventLocationSection}
              <tr>
                <td align="center" style="padding:20px;">
                  <p><strong>Please keep this email so we can scan your QR code:</strong></p>
                  <img src="cid:qr-code" alt="QR Code" width="200" height="200" style="display:block;" />
                </td>
              </tr>
              <tr>
                <td style="padding:0 20px 20px; font-size:16px; color:#333333; line-height:1.6;">
                  <p>
                    If you have any questions, feel free to contact us at <br/>
                    <a href="mailto:office5@german-emirates-club.com" style="color:#D9B144; text-decoration:none;">office5@german-emirates-club.com</a>.
                  </p>
                  <p>Warm regards,<br />The German Emirates Club Team</p>
                </td>
              </tr>
              <tr>
                <td style="font-size:13px; color:#777777; text-align:center; padding:20px; border-top:1px solid #dddddd;">
                  &copy; ${currentYear} German Emirates Club. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;

    await sendRawEmailWithAttachments({
        to: reqBody.email,
        subject: `Registration Completed – ${reqBody.title}`,
        html: htmlBody, // your HTML with <img src="cid:event-location"> and <img src="cid:qr-code">
        text: 'Your registration is confirmed.', // fallback text
        attachments: [
            {
                filename: 'map.png',
                content: mapBuffer,
                contentType: 'image/png',
                cid: 'event-location',
            },
            {
                filename: 'qr.png',
                content: qrBuffer,
                contentType: 'image/png',
                cid: 'qr-code',
            }
        ]
    });
}

function slugToTitle(slug) {
  return slug
    .replace(/-/g, ' ')                // Replace dashes with spaces
    .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize first letter of each word
}


async function comfirm_message_email(reqBody) {
    const { firstName, lastName, email, event } = reqBody;
    try {
        const currentYear = new Date().getFullYear();
        const event_name = slugToTitle(event);
        const fullname = `${firstName} ${lastName}`
        const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${event_name}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
      <thead>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden; margin: 40px auto;">
              <tr>
                <td bgcolor="#D9B144" style="color: #ffffff; text-align: center; padding: 20px; font-size: 22px; font-weight: bold; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  ${event_name} - Application Submitted
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 30px;">
              <tr>
                <td style="color: #333333; font-size: 16px; line-height: 1.6; padding: 0 20px;">
                  <p>Dear ${fullname},</p>
                  <p>
                    Thank you for submitting your application for the <strong>Golden Adler Award</strong>.
                  </p>
                  <p>
                    Your submission has been received. Our committee will review all entries carefully, and will notify you via email if you have been selected as a finalist.
                  </p>
                  <p>
                    If you have any questions in the meantime, please feel free to contact us at
                    <a href="mailto:office5@german-emirates-club.com" style="color: #D9B144; text-decoration: none;">office5@german-emirates-club.com</a>.
                  </p>
                  <p>Warm regards,<br/>The German Emirates Club Team</p>
                </td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #777777; text-align: center; padding: 20px; border-top: 1px solid #dddddd;">
                  &copy; ${currentYear} German Emirates Club. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;

        // const msg = {
        //     to: email,
        //     from: process.env.EMAIL_SENDER,
        //     subject: "Golden Eagle Award Registration",
        //     html: htmlBody,
        //     mailSettings: {
        //         sandboxMode: {
        //             enable: false // ❌ true = testing only, ✅ false = real email is sent
        //         }
        //     }
        // };

        return await sendRawEmailWithAttachments({
            to: reqBody.email,
            subject: `Application Submitted – ${event_name}`,
            html: htmlBody,
            text: 'Your application has been submitted.',

        });

        // const response = await sgMail.send(msg);
        // console.log(response);
        // // return response;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function event_confirm_registration_email(reqBody) {
    const tempPath = path.join(__dirname, "..", "qr-files");
    const mapRoot = path.join(__dirname, "..", "maps");
    const qrPath = path.join(tempPath, `${reqBody.event_id}.png`);
    const mapPath = path.join(mapRoot, `${reqBody.event}.png`);
    const { selected_time_for_email } = reqBody;
    try {
        const qrBuffer = fs.readFileSync(qrPath);
        const mapBuffer = fs.existsSync(mapPath) ? fs.readFileSync(mapPath) : null;

        const attachments = [];

        if (qrBuffer) {
            attachments.push({
                filename: `${reqBody.timestamp}-qr.png`,
                content: qrBuffer,
                contentType: 'image/png',
                cid: 'qr-code',
            });
        }

        if (mapBuffer) {
            attachments.push({
                filename: `${reqBody.timestamp}-map.png`,
                content: mapBuffer,
                contentType: 'image/png',
                cid: 'event-location',
            });
        }

        const currentYear = new Date().getFullYear();

        const eventTimeSection = reqBody.event_time
            ? `<p><strong>Zeit: </strong> ${reqBody.event_time}</p>`
            : '';
        const eventLocationName = reqBody.event_location_name
            ? `<p><strong>Veranstaltungsort: </strong> ${reqBody.event_location_name}</p>`
            : '';

        const eventLocationSection =
            reqBody.event && reqBody.event_location_name && reqBody.event_location
                ? `
          <tr>
            <td align="center" style="padding:20px; font-size:16px; color:#333333;">
              <p style="padding-bottom: 10px;"><strong>Veranstaltungsort – Karte antippen für Navigation.</strong></p>
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reqBody.event_location_name)}" target="_blank" rel="noopener noreferrer">
                <img src="cid:event-location" alt="Event Location Map" width="200" height="200" style="border:0; display:block;" />
              </a>
            </td>
          </tr>
        `
                : '';

        const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${reqBody.title} Anmeldung</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
      <thead>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); margin:40px auto;">
              <tr>
                <td bgcolor="#D9B144" style="color:#ffffff; text-align:center; padding:20px; font-size:22px; font-weight:bold; border-top-left-radius:8px; border-top-right-radius:8px;">
                  Anmeldung Bestätigt
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; padding:0 30px 30px;">
              <tr>
                <td style="padding:20px; font-size:16px; color:#333333; line-height:1.6;">
                  <p style="color:#333333">Vielen Dank für Ihre Anmeldung zum folgenden Event:<strong>${reqBody.title}</strong>. Wir schätzen Ihr Interesse und freuen uns auf Ihre
Teilnahme.</p>
                  <p style="color:#333333"><strong>Datum:</strong> ${reqBody.event_date}</p>
                  ${selected_time_for_email 
  ? `<p><strong>Uhrzeit:</strong> ${selected_time_for_email}</p>` 
  : ""}
                  ${eventTimeSection}
                  ${eventLocationName}
                </td>
              </tr>
              ${eventLocationSection}
              <tr>
                <td align="center" style="padding:20px; font-size:16px; color:#333333;">
                  <p><strong>Bitte bewahren Sie diese E-Mail auf, damit wir Ihren QR-Code scannen können:</strong></p>
                  <img src="cid:qr-code" alt="QR-Code" width="200" height="200" style="display:block;" />
                </td>
              </tr>
              <tr>
                <td style="padding:0 20px 20px; font-size:16px; color:#333333; line-height:1.6;">
                  <p>
                    Wenn Sie Fragen haben, kontaktieren Sie uns bitte unter <br/>
                    <a href="mailto:office5@german-emirates-club.com" style="color:#D9B144; text-decoration:none;">office5@german-emirates-club.com</a>.
                  </p>
                  <p>Mit freundlichen Grüßen,<br />Das Team des German Emirates Club</p>
                </td>
              </tr>
              <tr>
                <td style="font-size:13px; color:#777777; text-align:center; padding:20px; border-top:1px solid #dddddd;">
                  &copy; ${currentYear} German Emirates Club. Alle Rechte vorbehalten.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>

`;

        // ✅ Send email using your own SMTP function
        return await sendRawEmailWithAttachments({
            to: reqBody.email,
            subject: `Registration Completed – ${reqBody.title}`,
            html: htmlBody,
            text: 'Your registration is confirmed.',
            attachments
        });

    } catch (error) {
        console.error("Failed to send registration email:", error);
        throw error;
    }
}

async function event_confirm_registration_email_with_invoice(reqBody) {
    const tempPath = path.join(__dirname, "..", "qr-files");
    const mapRoot = path.join(__dirname, "..", "maps");
    const qrPath = path.join(tempPath, `${reqBody.event_id}.png`);
    const mapPath = path.join(mapRoot, `${reqBody.event}.png`);
    const invoicePath = path.join(__dirname, "..", "invoice_storage", `${reqBody.event}`,  `${reqBody.invoice_filename}`);
    const {selected_time_for_email} = reqBody;

    try {
        const qrBuffer = fs.readFileSync(qrPath);
        const mapBuffer = fs.existsSync(mapPath) ? fs.readFileSync(mapPath) : null;
        const invoiceBuffer = fs.existsSync(invoicePath) ? fs.readFileSync(invoicePath) : null;

        const attachments = [];

        if (qrBuffer) {
            attachments.push({
                filename: `${reqBody.timestamp}-qr.png`,
                content: qrBuffer,
                contentType: 'image/png',
                cid: 'qr-code',
            });
        }

        if (mapBuffer) {
            attachments.push({
                filename: `${reqBody.timestamp}-map.png`,
                content: mapBuffer,
                contentType: 'image/png',
                cid: 'event-location',
            });
        }

         if (invoiceBuffer) {
          attachments.push({
              filename: `${reqBody.invoice_filename}`,
              content: invoiceBuffer,
              contentType: 'application/pdf',
          });
        }

        const currentYear = new Date().getFullYear();

        const eventTimeSection = reqBody.event_time
            ? `<p><strong>Zeit: </strong> ${reqBody.event_time}</p>`
            : '';
        const eventLocationName = reqBody.event_location_name
            ? `<p><strong>Veranstaltungsort: </strong> ${reqBody.event_location_name}</p>`
            : '';

        const eventLocationSection =
            reqBody.event && reqBody.event_location_name && reqBody.event_location
                ? `
          <tr>
            <td align="center" style="padding:20px; font-size:16px; color:#333333;">
              <p style="padding-bottom: 10px;"><strong>Veranstaltungsort – Karte antippen für Navigation.</strong></p>
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reqBody.event_location_name)}" target="_blank" rel="noopener noreferrer">
                <img src="cid:event-location" alt="Event Location Map" width="200" height="200" style="border:0; display:block;" />
              </a>
            </td>
          </tr>
        `
                : '';

        const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${reqBody.title} Anmeldung</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
      <thead>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); margin:40px auto;">
              <tr>
                <td bgcolor="#D9B144" style="color:#ffffff; text-align:center; padding:20px; font-size:22px; font-weight:bold; border-top-left-radius:8px; border-top-right-radius:8px;">
                  Anmeldung Bestätigt
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; padding:0 30px 30px;">
              <tr>
                <td style="padding:20px; font-size:16px; color:#333333; line-height:1.6;">
                  <p>Vielen Dank für Ihre Anmeldung zum folgenden Event:<strong>${reqBody.title}</strong>. Wir schätzen Ihr Interesse und freuen uns auf Ihre
Teilnahme.</p>
                  <p><strong>Datum:</strong> ${reqBody.event_date}</p>
                                    ${selected_time_for_email 
  ? `<p><strong>Uhrzeit:</strong> ${selected_time_for_email}</p>` 
  : ""}
                  ${eventTimeSection}
                  ${eventLocationName}
                </td>
              </tr>
              ${eventLocationSection}
              <tr>
                <td align="center" style="padding:20px; font-size:16px; color:#333333;">
                  <p><strong>Bitte bewahren Sie diese E-Mail auf, damit wir Ihren QR-Code scannen können:</strong></p>
                  <img src="cid:qr-code" alt="QR-Code" width="200" height="200" style="display:block;" />
                </td>
              </tr>
              <tr>
                <td style="padding:0 20px 20px; font-size:16px; color:#333333; line-height:1.6;">
                  <p>
                    Wenn Sie Fragen haben, kontaktieren Sie uns bitte unter <br/>
                    <a href="mailto:office5@german-emirates-club.com" style="color:#D9B144; text-decoration:none;">office5@german-emirates-club.com</a>.
                  </p>
                  <p>Mit freundlichen Grüßen,<br />Das Team des German Emirates Club</p>
                </td>
              </tr>
              <tr>
                <td style="font-size:13px; color:#777777; text-align:center; padding:20px; border-top:1px solid #dddddd;">
                  &copy; ${currentYear} German Emirates Club. Alle Rechte vorbehalten.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>

`;

        // ✅ Send email using your own SMTP function
        return await sendRawEmailWithAttachments({
            to: reqBody.email,
            subject: `Registration Completed – ${reqBody.title}`,
            html: htmlBody,
            text: 'Your registration is confirmed.',
            attachments
        });

    } catch (error) {
        console.error("Failed to send registration email:", error);
        throw error;
    }
}


async function email_otp(reqBody) {
    const { email, event, otp } = reqBody;
    try {
        const currentYear = new Date().getFullYear();
        const event_name = slugToTitle(event);

        const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${event_name} - OTP Verification</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
      <thead>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden; margin: 40px auto;">
              <tr>
                <td bgcolor="#D9B144" style="color: #ffffff; text-align: center; padding: 20px; font-size: 22px; font-weight: bold; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  ${event_name} - OTP Verification
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 30px;">
              <tr>
                <td style="color: #333333; font-size: 16px; line-height: 1.6; padding: 0 20px;">
                  <p style="color: #333333;">
                    To complete your registration for <strong>${event_name}</strong>, please use the following One-Time Password (OTP):
                  </p>
                  <p style="text-align: center; margin: 30px 0; color: #333333;">
                    <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #D9B144;">${otp}</span>
                  </p>
                  <p style="color: #333333;">
                    This OTP is valid for the next <strong>1 minutes</strong>. Please do not share it with anyone.
                  </p>
                  <p style="color: #333333;">
                    If you did not request this OTP, please ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #777777; text-align: center; padding: 20px; border-top: 1px solid #dddddd;">
                  &copy; ${currentYear} German Emirates Club. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;

        return await sendRawEmailWithAttachments({
            to: reqBody.email,
            subject: `Your OTP Code – ${event_name}`,
            html: htmlBody,
            text: `Your OTP code is: ${otp}. It is valid for 1 minutes.`,
        });

    } catch (error) {
        console.log(error);
        throw error;
    }
}


async function email_request_received(reqBody) {
    const { email, title, firstName, lastName } = reqBody;
    try {
        const currentYear = new Date().getFullYear();

        const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${title} - Request Received</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
      <thead>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden; margin: 40px auto;">
              <tr>
                <td bgcolor="#D9B144" style="color: #ffffff; text-align: center; padding: 20px; font-size: 22px; font-weight: bold; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  ${title} - Request Received
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 30px;">
              <tr>
                <td style="color: #333333; font-size: 16px; line-height: 1.6; padding: 0 20px;">
                  <p style="color: #333333;">
                    Dear ${firstName} ${lastName},
                  </p>
                  <p style="color: #333333;">
                    Your request for <strong>${title}</strong> has been successfully received. 
                  </p>
                  <p style="color: #333333;">
                    Our team will review your request and get back to you shortly with further details. 
                  </p>
                  <p style="color: #333333;">
                    Thank you for your interest in being part of <strong>${title}</strong>.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #777777; text-align: center; padding: 20px; border-top: 1px solid #dddddd;">
                  &copy; ${currentYear} German Emirates Club. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;

        return await sendRawEmailWithAttachments({
            to: reqBody.email,
            subject: `Request Received – ${title}`,
            html: htmlBody,
            text: `Your request for ${title} has been received. Our team will contact you soon.`,
        });

    } catch (error) {
        console.log(error);
        throw error;
    }
}


async function company_data_confirmation_email(reqBody) {
  try {
    const currentYear = new Date().getFullYear();
    const event_name = slugToTitle(reqBody.event);

    // Destructure company data
    const {
      company_partnerBrand,
      company_partnerName,
      company_cityCountry,
      company_phone,
      company_mobile,
      company_email,
      company_website,
      company_employeeCount,
      company_industry,
      company_ceoOwnerGm,
      company_ceoOwnerGm_contactNumber,
      company_ceoOwnerGm_landline,
      company_ceoOwnerGm_email,
      company_hrHead,
      company_hrHead_contactNumber,
      company_hrHead_landline,
      company_hrHead_email,
      company_accountingHead,
      company_accountingHead_contactNumber,
      company_accountingHead_landline,
      company_accountingHead_email,
      company_marketingHead,
      company_marketingHead_contactNumber,
      company_marketingHead_landline,
      company_marketingHead_email,
      company_pa,
      company_pa_contactNumber,
      company_pa_landline,
      company_pa_email
    } = JSON.parse(reqBody.company_data);

    const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${event_name} - Data Received</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif; color: #333333;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden; margin: 40px auto;">
            <tr>
              <td bgcolor="#D9B144" style="color: #ffffff; text-align: center; padding: 20px; font-size: 22px; font-weight: bold; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                ${event_name} - Company Data Received
              </td>
            </tr>
            <tr>
              <td style="color: #333333; font-size: 16px; line-height: 1.6; padding: 30px;">
                <p style="margin: 0 0 15px 0; color: #333333;">Dear ${company_partnerName},</p>
                <p style="margin: 0 0 15px 0; color: #333333;">We have successfully received your company information for <strong>${event_name}</strong>. Below are the details provided:</p>

                <table width="100%" cellpadding="8" cellspacing="0" border="0" style="border-collapse: collapse; font-size: 14px; color: #333333;">
                  <tbody>
                    <tr><td style="color:#333333;"><strong>Partner Brand</strong></td><td style="color:#333333;">${company_partnerBrand || '-'}</td></tr>
                    <tr><td style="color:#333333;"><strong>Partner Name</strong></td><td style="color:#333333;">${company_partnerName || '-'}</td></tr>
                    <tr><td style="color:#333333;"><strong>City / Country</strong></td><td style="color:#333333;">${company_cityCountry || '-'}</td></tr>
                    <tr><td style="color:#333333;"><strong>Phone</strong></td><td style="color:#333333;">${company_phone || '-'}</td></tr>
                    <tr><td style="color:#333333;"><strong>Mobile</strong></td><td style="color:#333333;">${company_mobile || '-'}</td></tr>
                    <tr><td style="color:#333333;"><strong>Email</strong></td><td style="color:#333333;">${company_email || '-'}</td></tr>
                    <tr><td style="color:#333333;"><strong>Website</strong></td><td style="color:#333333;">${company_website || '-'}</td></tr>
                    <tr><td style="color:#333333;"><strong>Employee Count</strong></td><td style="color:#333333;">${company_employeeCount || '-'}</td></tr>
                    <tr><td style="color:#333333;"><strong>Industry</strong></td><td style="color:#333333;">${company_industry || '-'}</td></tr>
                    
                    <tr><td colspan="2" style="padding-top: 15px; color:#333333;"><strong>CEO / Owner / GM</strong></td></tr>
                    <tr><td style="color:#333333;">Name</td><td style="color:#333333;">${company_ceoOwnerGm || '-'}</td></tr>
                    <tr><td style="color:#333333;">Contact Number</td><td style="color:#333333;">${company_ceoOwnerGm_contactNumber || '-'}</td></tr>
                    <tr><td style="color:#333333;">Contact Number</td><td style="color:#333333;">${company_ceoOwnerGm_landline || '-'}</td></tr>
                    <tr><td style="color:#333333;">Email</td><td style="color:#333333;">${company_ceoOwnerGm_email || '-'}</td></tr>
                    
                    <tr><td colspan="2" style="padding-top: 15px; color:#333333;"><strong>PA</strong></td></tr>
                    <tr><td style="color:#333333;">Name</td><td style="color:#333333;">${company_pa || '-'}</td></tr>
                    <tr><td style="color:#333333;">Contact Number</td><td style="color:#333333;">${company_pa_contactNumber || '-'}</td></tr>
                    <tr><td style="color:#333333;">Contact Number</td><td style="color:#333333;">${company_pa_landline || '-'}</td></tr>
                    <tr><td style="color:#333333;">Email</td><td style="color:#333333;">${company_pa_email || '-'}</td></tr>

                    <tr><td colspan="2" style="padding-top: 15px; color:#333333;"><strong>HR Head</strong></td></tr>
                    <tr><td style="color:#333333;">Name</td><td style="color:#333333;">${company_hrHead || '-'}</td></tr>
                    <tr><td style="color:#333333;">Contact Number</td><td style="color:#333333;">${company_hrHead_contactNumber || '-'}</td></tr>
                    <tr><td style="color:#333333;">Contact Number</td><td style="color:#333333;">${company_hrHead_landline || '-'}</td></tr>
                    <tr><td style="color:#333333;">Email</td><td style="color:#333333;">${company_hrHead_email || '-'}</td></tr>
                    
                    <tr><td colspan="2" style="padding-top: 15px; color:#333333;"><strong>Accounting Head</strong></td></tr>
                    <tr><td style="color:#333333;">Name</td><td style="color:#333333;">${company_accountingHead || '-'}</td></tr>
                    <tr><td style="color:#333333;">Contact Number</td><td style="color:#333333;">${company_accountingHead_contactNumber || '-'}</td></tr>
                    <tr><td style="color:#333333;">Contact Number</td><td style="color:#333333;">${company_accountingHead_landline || '-'}</td></tr>
                    <tr><td style="color:#333333;">Email</td><td style="color:#333333;">${company_accountingHead_email || '-'}</td></tr>
                    
                    <tr><td colspan="2" style="padding-top: 15px; color:#333333;"><strong>Marketing Head</strong></td></tr>
                    <tr><td style="color:#333333;">Name</td><td style="color:#333333;">${company_marketingHead || '-'}</td></tr>
                    <tr><td style="color:#333333;">Contact Number</td><td style="color:#333333;">${company_marketingHead_contactNumber || '-'}</td></tr>
                    <tr><td style="color:#333333;">Contact Number</td><td style="color:#333333;">${company_marketingHead_landline || '-'}</td></tr>
                    <tr><td style="color:#333333;">Email</td><td style="color:#333333;">${company_marketingHead_email || '-'}</td></tr>
                    
                  </tbody>
                </table>

                <p style="margin-top: 20px; color:#333333;">If any information is incorrect, please contact us immediately.</p>
                <p style="color:#333333;">Thank you,<br/>German Emirates Club</p>
              </td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #777777; text-align: center; padding: 20px; border-top: 1px solid #dddddd;">
                &copy; ${currentYear} German Emirates Club. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;


    return await sendRawEmailWithAttachments({
      to: company_email,
      subject: `Company Data Received – ${event_name}`,
      html: htmlBody,
      text: `We have received your company information for ${event_name}.`,
    });

  } catch (error) {
    console.log(error);
    throw error;
  }
}



async function gic__reset_password(reqBody) {
  const { password } = reqBody;
  try {
    const currentYear = new Date().getFullYear();
    const org_name = "German Industrial Club";

const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${org_name} - Reset Password</title>
  </head>
  <body style="margin:0; padding:0; background-color: #F5F5F5; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F5F5F5">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); overflow: hidden; margin: 40px auto;">
            
            <!-- Header -->
            <tr>
              <td bgcolor="#0D1B2A" style="color: #ffffff; text-align: center; padding: 20px; font-size: 22px; font-weight: bold;">
                ${org_name} - Password Reset
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="color: #0D1B2A; font-size: 16px; line-height: 1.6; padding: 30px;">
                <p style="color: #0D1B2A;">
                  Please use the following temporary password to reset your password:
                </p>
                <p style="text-align: center; margin: 30px 0;">
                  <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #D4AF37;">
                    ${password}
                  </span>
                </p>
                <p style="color: #0D1B2A;">
                  For your security, please reset your password immediately after logging in.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="font-size: 13px; color: #555555; text-align: center; padding: 20px; border-top: 1px solid #dddddd;">
                &copy; ${currentYear} ${org_name}. All rights reserved.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;


    return await sendRawEmailWithAttachments({
      to: reqBody.email,
      subject: `${org_name} - Reset Your Password`,
      html: htmlBody,
      text: `Your temporary password is: ${password}. Please log in and reset your password immediately.`,
    });

  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function emailMembershipCard(reqBody, pkpassBuffer) {
    const { email, memberName, cardNumber, expiryDate, membershipTier } = reqBody;

    try {
        const currentYear = new Date().getFullYear();

        const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>German Emirates Club - Membership Card</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); margin: 40px auto; overflow: hidden;">
            <tr>
              <td bgcolor="#D9B144" style="color: #ffffff; text-align: center; padding: 20px; font-size: 22px; font-weight: bold; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                German Emirates Club - Membership Card
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                <p>Dear <strong>${memberName}</strong>,</p>
                <p>We are excited to provide you with your <strong>German Emirates Club Membership Card</strong> for Apple Wallet.</p>
                <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px; background-color: #f4f4f4; font-weight: bold;">Card Number:</td>
                    <td style="padding: 10px;">${cardNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; background-color: #f4f4f4; font-weight: bold;">Membership Tier:</td>
                    <td style="padding: 10px;">${membershipTier}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; background-color: #f4f4f4; font-weight: bold;">Expiry Date:</td>
                    <td style="padding: 10px;">${expiryDate}</td>
                  </tr>
                </table>
                <p>You can add your membership card to Apple Wallet by following the instructions in the attached file or link.</p>
                <p>Enjoy your membership benefits!</p>
              </td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #777777; text-align: center; padding: 20px; border-top: 1px solid #dddddd;">
                &copy; ${currentYear} German Emirates Club. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const attachments = [
    {
        filename: 'membership.pkpass',  // The filename the recipient sees
        content: pkpassBuffer,          // Your generated .pkpass as a Buffer
        contentType: 'application/vnd.apple.pkpass' // MIME type for Apple Pass
    }
];

        return await sendRawEmailWithAttachments({
            to: email,
            subject: `Your German Emirates Club Membership Card`,
            html: htmlBody,
            text: `Hello ${memberName},\n\nYour German Emirates Club Membership Card is ready.\nCard Number: ${cardNumber}\nMembership Tier: ${membershipTier}\nExpiry Date: ${expiryDate}`,
            // Optionally, attach the .pkpass file:
            attachments: attachments
        });

    } catch (error) {
        console.log(error);
        throw error;
    }
}



module.exports = { emailMembershipCard, 
  comfirm_message_email, 
  event_confirm_registration_email,
   event_confirm_registration_email_aws,
    email_otp, company_data_confirmation_email ,
     gic__reset_password,
     email_request_received,
      event_confirm_registration_email_with_invoice};
