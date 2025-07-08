const sgMail = require("@sendgrid/mail");
require("dotenv").config();
const path = require("path");
const fs = require("fs");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function comfirm_message_email({ reqBody }) {
  const { fullname, email } = reqBody;
  try {
    const currentYear = new Date().getFullYear();
    console.log(currentYear);
    console.log(fullname);
    console.log(email);

    const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Golden Adler Award Registration</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
      <thead>
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden; margin: 40px auto;">
              <tr>
                <td bgcolor="#D9B144" style="color: #ffffff; text-align: center; padding: 20px; font-size: 22px; font-weight: bold; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  Goldener Adler Award Registration Confirmed
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
                    <a href="mailto:info@german-emirates-club.com" style="color: #D9B144; text-decoration: none;">info@german-emirates-club.com</a>.
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

    const msg = {
      to: email,
      from: process.env.EMAIL_SENDER,
      subject: "Golden Eagle Award Registration",
      html: htmlBody,
    };

    const response = await sgMail.send(msg);
    console.log(response);
    // return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function event_confirm_registration_email(reqBody) {
  const tempPath = path.join(__dirname, "qr-files");
  const filePath = path.join(tempPath, `${reqBody.event_id}.png`);

  // Read and encode the image file as base64
  let attachment;

  fs.readFile(filePath, async (err, fileBuffer) => {
    if (err) {
      throw err;
    }

    try {
      const base64Image = fileBuffer.toString("base64");
      const currentYear = new Date().getFullYear();
      const attachment = {
        content: base64Image,
        filename: `${reqBody.timestamp}.png`,
        type: "image/png",
        disposition: "inline",
        content_id: "qr-code", // ✅ MUST match the cid in <img src="cid:qr-code">
      };

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
                  <p><strong>Time:</strong> 7 PM (Gates open at 6:30 PM)</p>
                  <a href="https://maps.google.com/?q=One%20%26%20Only%20Zabeel,Dubai" target="_blank">
                    <img
                      src="https://maps.googleapis.com/maps/api/staticmap?center=One%20%26%20Only%20Zabeel,Dubai&zoom=15&size=600x300&markers=color:red|label:E|One%20%26%20Only%20Zabeel,Dubai&key=YOUR_REAL_API_KEY"
                      alt="Event Location"
                      width="100%"
                      style="max-width:600px;"
                    />
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:20px;">
                  <p><strong>Please keep this email so we can scan your QR code:</strong></p>
                  <img src="cid:qr-code" alt="QR Code" width="200" height="200" style="display:block;" />
                </td>
              </tr>
              <tr>
                <td style="padding:0 20px 20px; font-size:16px; color:#333333; line-height:1.6;">
                  <p>
                    If you have any questions, feel free to contact us at
                    <a href="mailto:info@german-emirates-club.com" style="color:#D9B144; text-decoration:none;">info@german-emirates-club.com</a>.
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


      const msg = {
        to: reqBody.email,
        from: process.env.EMAIL_SENDER,
        subject: `Registration Completed – ${reqBody.title}`,
        html: htmlBody,
        attachments: [attachment],
      };

      const response = await sgMail.send(msg);
      return response;
    } catch (error) {
      throw error;
    }
  });
}

module.exports = { comfirm_message_email, event_confirm_registration_email };
