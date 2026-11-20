"use strict";

// Builds the Google Wallet generic class and object of a member pass. It follows the same rules as
// the Apple pass (design by partner, text beside the logo, Name instead of Corporate Partner).
// Pure function: no Google credentials, no network. Do not import anything from scripts/ here:
// the server deployment does not copy that folder.

const { designNameFor, designColorsFor, passLabelFor } = require("./memberPassLayout");

const text = (value) => ({ defaultValue: { language: "en-US", value } });
const field = (key) => ({ firstValue: { fields: [{ fieldPath: `object.textModulesData["${key}"].body` }] } });
const clean = (value) => String(value ?? "").trim();

function buildGoogleMemberPass({ data, issuerId, assetBaseUrl, qrValue, expirationDate, now = new Date() }) {
  const { firstname, lastname, memberId, serial_number, partner, formattedExpiry } = data;
  const designName = designNameFor(partner);
  const { backgroundColor } = designColorsFor(partner);
  // One class per design, so passes already saved under the old "membership_class" are not changed.
  const classId = `${issuerId}.membership_${designName}`;
  const fullName = [clean(firstname), clean(lastname)].filter(Boolean).join(" ");
  const logoUri = `${assetBaseUrl}/wallet/logo.png`;

  const genericClass = {
    id: classId,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          { threeItems: { startItem: field("expiry"), middleItem: field("cardnumber"), endItem: field("name") } },
          { oneItem: { item: field("serialNumber") } },
        ],
      },
    },
  };

  const genericObject = {
    id: `${issuerId}.member_${now.getTime()}`,
    classId,
    state: "active",
    hexBackgroundColor: backgroundColor,
    logo: { sourceUri: { uri: logoUri } },
    cardTitle: text(passLabelFor(partner)),
    // Google requires a header; the name is in the row below, as on the Apple pass.
    header: text("Membership Pass"),
    heroImage: {
      sourceUri: { uri: `${assetBaseUrl}/wallet/${designName}-hero.png` },
      contentDescription: text("Hero Image Banner"),
    },
    linksModuleData: {
      uris: [{ id: "official_site", uri: "https://www.german-emirates-club.com/", description: "Visit German Emirates Club" }],
    },
    textModulesData: [
      { id: "expiry", header: "Expiry Date", body: `${formattedExpiry}` },
      { id: "cardnumber", header: "Member ID", body: `${memberId}` },
      { id: "name", header: "Name", body: fullName },
      { id: "serialNumber", header: "Serial Number", body: `${serial_number}` },
    ],
    barcode: { type: "QR_CODE", value: qrValue },
    validTimeInterval: {
      start: { date: now.toISOString() },
      end: { date: expirationDate.toISOString() },
    },
  };

  return { genericClass, genericObject };
}

module.exports = { buildGoogleMemberPass };
