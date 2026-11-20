"use strict";

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "../../..");
const NAME_RE = /^[a-z0-9_-]+$/;
const DESIGN_FILE_RE = /^([a-z0-9_-]+_card)\.html$/;
// Earlier prototypes that match the *_card.html pattern but are not supported designs.
const LEGACY_DESIGNS = new Set(["red_card"]);

class DesignError extends Error {}

function listDesigns(rootDir = REPO_ROOT) {
  if (!fs.existsSync(rootDir)) return [];
  return fs
    .readdirSync(rootDir)
    .map((f) => DESIGN_FILE_RE.exec(f))
    .filter(Boolean)
    .map((m) => m[1])
    .filter((name) => !LEGACY_DESIGNS.has(name))
    .sort();
}

function normalizeHex(value) {
  const v = String(value || "").trim().toLowerCase();
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
  if (!m) return null;
  const h = m[1];
  return h.length === 3 ? "#" + h.split("").map((c) => c + c).join("") : "#" + h;
}

function parseRootVars(html) {
  const vars = {};
  const rootBlocks = html.match(/:root\s*\{[^}]*\}/g) || [];
  for (const block of rootBlocks) {
    const re = /(--[a-z0-9-]+)\s*:\s*([^;}]+)/gi;
    let m;
    while ((m = re.exec(block))) vars[m[1]] = m[2].trim();
  }
  return vars;
}

function availableMessage(rootDir) {
  const names = listDesigns(rootDir);
  return names.length ? `Available designs: ${names.join(", ")}` : "No designs found.";
}

function loadDesign(rawName, rootDir = REPO_ROOT) {
  const name = String(rawName || "").replace(/\.html$/, "");
  if (!NAME_RE.test(name)) {
    throw new DesignError(
      `Invalid design name "${rawName}". Use lowercase letters, digits, "_" or "-". ${availableMessage(rootDir)}`
    );
  }
  const file = path.join(rootDir, `${name}.html`);
  if (!fs.existsSync(file)) {
    throw new DesignError(`Design file not found: ${file}. ${availableMessage(rootDir)}`);
  }
  const html = fs.readFileSync(file, "utf8");
  const vars = parseRootVars(html);

  const need = (variable, label) => {
    if (!vars[variable]) {
      throw new DesignError(`${name}.html does not define ${variable} (${label}) in :root.`);
    }
    const hex = normalizeHex(vars[variable]);
    if (!hex) {
      throw new DesignError(`${name}.html: ${variable} must be a hex color, got "${vars[variable]}".`);
    }
    return hex;
  };

  const backgroundColor = need("--red", "card background color");
  const accentColor = need("--gold", "accent color");
  const foregroundColor = vars["--fg"] ? need("--fg", "text color") : "#ffffff";
  const labelMatch = /<div class="cardLabel">([^<]*)<\/div>/.exec(html);

  return {
    name,
    file,
    html,
    backgroundColor,
    accentColor,
    foregroundColor,
    label: labelMatch ? labelMatch[1].trim() : null,
  };
}

module.exports = { REPO_ROOT, DesignError, listDesigns, loadDesign, normalizeHex, parseRootVars };
