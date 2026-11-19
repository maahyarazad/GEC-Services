"use strict";

// Rules for the member pass and the pass-issued email: which design a member gets, the text
// beside the logo, and the fields shown on the pass. Pure functions, no Wallet or SMTP needed.

const FAMILY_PARTNER = "GEC Family Membership";

const clean = (value) => String(value ?? "").trim();

function isFamilyPartner(partner) {
  return clean(partner).toLowerCase() === FAMILY_PARTNER.toLowerCase();
}

// Design name = the HTML file in the repo root (without .html) = the model folder (without .pass).
function designNameFor(partner) {
  return isFamilyPartner(partner) ? "family_card" : "corporate_card";
}

function modelNameFor(partner) {
  return `${designNameFor(partner)}.pass`;
}

// Text beside the logo on the pass and in the email.
function passLabelFor(partner) {
  if (isFamilyPartner(partner)) return FAMILY_PARTNER;
  const name = clean(partner);
  return name ? `Corporate Card - ${name}` : "Corporate Card";
}

// Pass layout: nothing over the icon strip; one row below it with Expiry Date, Member ID and Name.
function buildMemberFields({ firstname, lastname, memberId, expiry }) {
  const name = [clean(firstname), clean(lastname)].filter(Boolean).join(" ");
  return {
    primaryFields: [],
    secondaryFields: [{ key: "expiry", label: "Expiry Date", value: `${expiry}` }],
    auxiliaryFields: [
      { key: "memberId", label: "Member ID", value: `${memberId}`, textAlignment: "PKTextAlignmentLeft" },
      { key: "name", label: "Name", value: name, textAlignment: "PKTextAlignmentRight" },
    ],
  };
}

module.exports = { FAMILY_PARTNER, isFamilyPartner, designNameFor, modelNameFor, passLabelFor, buildMemberFields };
