"use strict";

// Strip image sizes for a storeCard pass (points x scale). Apple scales the strip to the pass width.
const ASSET_SIZES = {
  strip: { width: 375, height: 144 },
  "strip@2x": { width: 750, height: 288 },
  "strip@3x": { width: 1125, height: 432 },
};

const BASE_FILES = ["icon.png", "icon@2x.png", "logo.png", "logo@2x.png"];
const ORGANIZATION_NAME = "German Emirates Club";

function hexToRgb(hex) {
  const h = String(hex).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

function buildPassJson(design, base = {}, { passTypeIdentifier } = {}) {
  const { generic, storeCard, eventTicket, boardingPass, coupon, ...rest } = base;
  return {
    ...rest,
    ...(passTypeIdentifier ? { passTypeIdentifier } : {}),
    organizationName: ORGANIZATION_NAME,
    foregroundColor: hexToRgb(design.foregroundColor),
    labelColor: hexToRgb(design.accentColor),
    backgroundColor: hexToRgb(design.backgroundColor),
    storeCard: {
      primaryFields: [],
      secondaryFields: [],
      auxiliaryFields: [],
      backFields: [],
    },
  };
}

module.exports = { ASSET_SIZES, BASE_FILES, ORGANIZATION_NAME, hexToRgb, buildPassJson };
