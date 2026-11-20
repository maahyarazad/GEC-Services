"use strict";

const GOOGLE_SIZES = {
  hero: { width: 1032, height: 336 },
  logo: { width: 660, height: 660 },
};

// Same issuer as services/googlePassService.js. Override with --issuer.
const DEFAULT_ISSUER_ID = "3388000000022971699";
const ISSUER_NAME = "German Emirates Club";

const row = (start, end) => ({
  twoItems: {
    startItem: { firstValue: { fields: [{ fieldPath: `object.textModulesData["${start}"].body` }] } },
    endItem: { firstValue: { fields: [{ fieldPath: `object.textModulesData["${end}"].body` }] } },
  },
});

function classIdFor(design, issuerId = DEFAULT_ISSUER_ID) {
  return `${issuerId}.membership_${design.name}`;
}

// A GenericClass resource: id plus the card layout (same rows as the class in googlePassService.js).
function buildClass(design, { issuerId = DEFAULT_ISSUER_ID } = {}) {
  return {
    id: classIdFor(design, issuerId),
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [row("cardnumber", "partner"), row("expiry", "serialNumber")],
      },
    },
  };
}

// Colors and images belong to each GenericObject in Google Wallet, not to the class.
// This file lists the design values to use when creating objects of this class.
function buildLook(design, { issuerId = DEFAULT_ISSUER_ID } = {}) {
  return {
    classId: classIdFor(design, issuerId),
    issuerName: ISSUER_NAME,
    hexBackgroundColor: design.backgroundColor,
    heroImageFile: "hero.png",
    logoFile: "logo.png",
    note: "Host hero.png and logo.png at public URLs and use them as heroImage.sourceUri.uri and logo.sourceUri.uri on each object.",
  };
}

module.exports = { GOOGLE_SIZES, DEFAULT_ISSUER_ID, ISSUER_NAME, classIdFor, buildClass, buildLook };
