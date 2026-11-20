"use strict";

// Builds the "pass issued" email in two versions: corporate (red) and GEC Family Membership (green).
// The card in the mail mirrors the Wallet pass: logo with the label beside it, the icon strip,
// and one row with Expiry Date, Member ID and Name. Table-based HTML, because mail clients drop
// SVG and gradients. The strip is the image already generated in the model folder, attached
// inline (cid), so nothing has to be hosted.

const fs = require("fs");
const path = require("path");
const moment = require("moment");
const { isFamilyPartner, designNameFor, designColorsFor, passLabelFor } = require("./memberPassLayout");
const { emailHead } = require("./emailResponsive");

const STRIP_CID = "card-strip";
const LOGO_URL = "https://www.german-emirates-club.com/uploads/files/user/GE-LOGO-GOLD.png";

// Card, buttons and badges: stack on phones. The shared base (viewport, fluid wrapper, dark mode)
// is in emailResponsive.js; the card itself keeps its brand colours in dark mode.
const MEMBER_CSS = `
  .em-link { color: #0b57d0; }
  @media only screen and (max-width: 520px) {
    .mp-pad { padding: 12px !important; }
    .mp-logo-cell, .mp-title-cell { display: block !important; width: 100% !important; text-align: left !important; }
    .mp-title-cell { padding-top: 10px !important; font-size: 18px !important; line-height: 24px !important; }
    .mp-field { display: block !important; width: 100% !important; text-align: left !important; padding: 8px 0 0 !important; }
    .mp-btn { display: block !important; width: 100% !important; padding: 6px 0 !important; text-align: center !important; }
    .mp-btn img { margin: 0 auto !important; }
  }
  @media (prefers-color-scheme: dark) {
    .em-link { color: #8ab4f8 !important; }
  }
  [data-ogsc] .em-link { color: #8ab4f8 !important; }
`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function formatExpiry(value) {
  if (!value) return "--";
  const m = moment(value);
  return m.isValid() ? m.format("DD-MM-YYYY") : "--";
}

function fullName(member) {
  return [member?.firstname, member?.lastname].map((s) => String(s ?? "").trim()).filter(Boolean).join(" ");
}

function buildMemberPassEmail({ member, applePKpassPath, googlePassToken, clientOrigin, modelsDir = path.join(process.cwd(), "models"), now = new Date() }) {
  const warnings = [];
  const partner = member?.partner;
  const family = isFamilyPartner(partner);
  const designName = designNameFor(partner);
  const label = passLabelFor(partner);
  const { backgroundColor: bg, accentColor: accent } = designColorsFor(partner);

  const stripPath = path.join(modelsDir, `${designName}.pass`, "strip@2x.png");
  const hasStrip = fs.existsSync(stripPath);
  const attachments = [];
  if (hasStrip) {
    attachments.push({ filename: "card-strip.png", path: stripPath, cid: STRIP_CID, contentDisposition: "inline" });
  } else {
    warnings.push(`Card strip image not found: ${stripPath}; the email was sent without it.`);
  }

  const cardName = family ? "Family Membership" : "Corporate Card";
  const subject = family ? "Your Family Membership Card Has Been Issued" : "Your Corporate Card Has Been Issued";
  const firstName = escapeHtml(String(member?.firstname ?? "").trim() || "Member");
  const expiry = formatExpiry(member?.card_expiry_date);
  const memberId = member?.memberId ?? "";
  const name = fullName(member);
  const year = now.getFullYear();

  const intro = family
    ? "Your account has been verified and we've issued your Family Membership Pass below. Please click on the image matching your mobile app wallet."
    : "Your account has been verified and we've issued your Membership Pass below. Please click on the image matching your mobile app wallet.";

  const field = (labelText, value, align) => `
                                <td class="mp-field" valign="top" align="${align}" style="padding:12px 4px 4px; font-family:Arial, Helvetica, sans-serif;">
                                    <div style="color:${accent}; font-size:12px; line-height:16px;">${labelText}</div>
                                    <div style="color:#ffffff; font-size:16px; line-height:22px;">${escapeHtml(value)}</div>
                                </td>`;

  const stripRow = hasStrip
    ? `
                            <tr>
                                <td colspan="3" style="padding:0;">
                                    <img src="cid:${STRIP_CID}" width="100%" alt="" style="display:block; width:100%; height:auto; border:0;">
                                </td>
                            </tr>`
    : "";

  const preheader = escapeHtml(`Your ${label} has been issued. Add it to Apple Wallet or Google Wallet.`);
  const appleHref = escapeHtml(`${clientOrigin ?? ""}${applePKpassPath ?? ""}`);
  const googleHref = escapeHtml(googlePassToken ?? "");

  const html = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    ${emailHead({ title: `${escapeHtml(cardName)} Issued`, extraCss: MEMBER_CSS })}
</head>

<body id="body" class="em-page" style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, Helvetica, sans-serif;">

    <!-- Preheader: the preview text in the inbox list -->
    <div class="em-preheader">${preheader}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4" class="em-page">
        <tr>
            <td align="center" class="em-outer" style="padding:40px 12px;">
                <!--[if mso]><table role="presentation" align="center" width="500" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
                <table role="presentation" width="500" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" class="em-wrap em-card"
                    style="width:100%; max-width:500px; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1);">

                    <tr>
                        <td class="mp-pad" style="padding:20px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                                bgcolor="${bg}" style="width:100%; background:${bg}; border-radius:10px; overflow:hidden;">
                                <tr>
                                    <td colspan="3" style="padding:15px 20px 10px; font-family:Arial, Helvetica, sans-serif;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td class="mp-logo-cell" align="left" valign="middle" width="130">
                                                    <img src="${LOGO_URL}" width="120" alt="German Emirates Club" class="em-img" style="display:block; border:0; width:120px; max-width:100%; height:auto;">
                                                </td>
                                                <td class="mp-title-cell" align="right" valign="middle" style="color:${accent}; font-size:20px; line-height:26px; font-family:Arial, Helvetica, sans-serif;">
                                                    ${escapeHtml(label)}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>${stripRow}
                                <tr>
                                    <td colspan="3" style="padding:6px 20px 16px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>${field("Expiry Date", expiry, "left")}${field("Member ID", memberId, "left")}${field("Name", name, "right")}
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td class="em-px em-text" style="padding:10px 30px 30px; font-size:16px; color:#333333; line-height:1.7;">
                            <p style="margin:0 0 16px;">Dear ${firstName},</p>
                            <p style="margin:0;">
                                ${intro}
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" class="em-px" style="padding:0 30px 30px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td class="mp-btn" align="right" style="padding-right:10px;">
                                        <a href="${appleHref}" style="display:inline-block;">
                                            <img src="https://services.german-emirates-club.com/uploads/apple-wallet.png" alt="Add to Apple Wallet"
                                                style="height:60px; width:auto; border:0; border-radius:12px; display:block;" />
                                        </a>
                                    </td>
                                    <td class="mp-btn" align="left" style="padding-left:10px;">
                                        <a href="${googleHref}" style="display:inline-block;">
                                            <img src="https://services.german-emirates-club.com/uploads/enUS_add_to_google_wallet_add-wallet-badge.png" alt="Add to Google Wallet"
                                                style="height:60px; width:auto; border:0; border-radius:12px; display:block;" />
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td class="em-px em-text" style="padding:0 30px 20px; font-size:16px; color:#333333; line-height:1.7;">
                            <p style="margin:0;">Download the GEC Mobile App here to avail your benefits.</p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" class="em-px" style="padding:0 30px 30px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td class="mp-btn" align="right" style="padding-right:10px;">
                                        <a href="https://play.google.com/store/apps/details?id=com.buenapublica.GECRewards"
                                            target="_blank" rel="noopener noreferrer" style="display:inline-block;">
                                            <img src="https://www.german-emirates-club.com/images/download-play-store.png"
                                                alt="Get it on Google Play" style="height:50px; width:auto; border:0; display:block;">
                                        </a>
                                    </td>
                                    <td class="mp-btn" align="left" style="padding-left:10px;">
                                        <a href="https://apps.apple.com/ae/app/gec-rewards/id6444924851" target="_blank"
                                            rel="noopener noreferrer" style="display:inline-block;">
                                            <img src="https://www.german-emirates-club.com/images/download-app-store.png"
                                                alt="Download on the App Store"
                                                style="height:50px; width:auto; border:0; display:block;">
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td class="em-px em-text" style="padding:0 30px 20px; font-size:16px; color:#333333; line-height:1.7;">
                            <p style="margin:0 0 16px;">
                                For any queries or clarifications, please send us a message on
                                <a href="mailto:office2@german-emirates-club.com?subject=GEC%20Mobile%20App%20inquiries" class="em-link">Email</a>
                                or
                                <a href="https://wa.me/971562050066" class="em-link">Whatsapp</a>
                            </p>
                            <p style="margin:0;">
                                Best regards,<br />
                                German Emirates Club Team
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td class="em-muted em-border" style="font-size:13px; color:#777777; text-align:center; padding:20px; border-top:1px solid #dddddd;">
                            &copy; ${year} German Emirates Club. All rights reserved.
                        </td>
                    </tr>

                </table>
                <!--[if mso]></td></tr></table><![endif]-->
            </td>
        </tr>
    </table>

</body>
</html>`;

  const text = family
    ? "Your Family Membership card has been issued. Please download the mobile application, register, and log in. You can also add your card to Apple Wallet or Google Wallet."
    : "Your Corporate Card has been issued. Please download the mobile application, register, and log in. You can also add your card to Apple Wallet or Google Wallet.";

  return { subject, html, text, attachments, warnings };
}

module.exports = { buildMemberPassEmail, escapeHtml, STRIP_CID };
