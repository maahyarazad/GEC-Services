"use strict";

// Responsive and adaptive (light/dark) base for every HTML email the app sends.
//
//  - EMAIL_CSS / EMAIL_META / emailHead(): the shared <head> content (reset, fluid wrappers,
//    mobile rules, dark mode). Native templates such as memberPassEmail.js use it directly.
//  - enhanceEmailHtml(html): applied to every outgoing email by the send functions in emailService.js.
//    It adds the viewport/color-scheme meta tags and the CSS above to older templates and tags their
//    markup with classes (em-wrap, em-px, em-img, em-card, em-text ...) so the CSS can adapt them.
//    It is idempotent and leaves HTML fragments (no <html> tag, e.g. invoices) untouched.
//
// Outlook desktop ignores max-width and media queries; the fixed width attributes stay in the markup
// for it, so it keeps showing the fixed-width layout.

const MARKER = "<!-- em-responsive -->";

const EMAIL_META = [
  ["viewport", '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'],
  ["X-UA-Compatible", '<meta http-equiv="X-UA-Compatible" content="IE=edge" />'],
  ["x-apple-disable-message-reformatting", '<meta name="x-apple-disable-message-reformatting" />'],
  ["format-detection", '<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />'],
  ["color-scheme", '<meta name="color-scheme" content="light dark" />'],
  ["supported-color-schemes", '<meta name="supported-color-schemes" content="light dark" />'],
];

const MSO_SETTINGS =
  '<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->';

// Dark palette (neutral, so it works for every brand block: branded colors are inline and untouched).
const DARK = { page: "#16181d", card: "#1f2329", text: "#e6e8eb", muted: "#9aa4b2", border: "#343a43" };

const EMAIL_CSS = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; max-width: 100%; }
  img[width] { height: auto; }
  a[x-apple-data-detectors], u + #body a, #MessageViewBody a {
    color: inherit !important; text-decoration: none !important; font-size: inherit !important;
    font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important;
  }
  .em-preheader { display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; }

  /* Tablets and phones: the 500-650px wrapper tables shrink, side padding gets smaller, long words wrap. */
  @media only screen and (max-width: 620px) {
    .em-outer { padding: 0 !important; }
    .em-wrap { margin-top: 0 !important; margin-bottom: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
    .em-px { padding-left: 16px !important; padding-right: 16px !important; }
    .em-wrap td, .em-wrap p, .em-wrap a { word-break: break-word; overflow-wrap: anywhere; }
    .em-stack { display: block !important; width: 100% !important; max-width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; text-align: left !important; }
    .em-center { text-align: center !important; }
  }

  /* Dark mode: only the neutral layers change; branded blocks keep their inline colors. */
  @media (prefers-color-scheme: dark) {
    body, .em-page { background-color: ${DARK.page} !important; }
    .em-card { background-color: ${DARK.card} !important; color: ${DARK.text} !important; border-color: ${DARK.border} !important; }
    .em-text { color: ${DARK.text} !important; }
    .em-muted { color: ${DARK.muted} !important; }
    .em-border { border-color: ${DARK.border} !important; }
  }
  [data-ogsc] .em-text { color: ${DARK.text} !important; }
  [data-ogsc] .em-muted { color: ${DARK.muted} !important; }
  [data-ogsb] body, [data-ogsb] .em-page { background-color: ${DARK.page} !important; }
  [data-ogsb] .em-card { background-color: ${DARK.card} !important; }
`;

function emailHead({ title = "", extraCss = "" } = {}) {
  return [
    '<meta charset="UTF-8" />',
    ...EMAIL_META.map(([, tag]) => tag),
    `<title>${title}</title>`,
    MSO_SETTINGS,
    MARKER,
    `<style>${EMAIL_CSS}${extraCss}</style>`,
  ].join("\n    ");
}

// ── Class tagging of older templates ──────────────────────────────────────────

const hex6 = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (v === "white") return "#ffffff";
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
  if (!m) return null;
  return m[1].length === 3 ? "#" + m[1].split("").map((c) => c + c).join("") : "#" + m[1];
};

const CARD_BG = new Set(["#ffffff"]);
const PAGE_BG = new Set(["#f4f4f4", "#f8f9fb", "#f0f2f5", "#f5f5f5", "#fafafa", "#f7f7f7", "#f9f9f9", "#f2f2f2", "#f1f1f1", "#efefef", "#eeeeee", "#f3f4f6"]);
const TEXT_DARK = new Set(["#000000", "#111111", "#1a1a1a", "#1a2332", "#222222", "#2d3748", "#333333", "#444444", "#4a5568", "#555555", "#666666"]);
const TEXT_MUTED = new Set(["#718096", "#777777", "#888888", "#999999"]);
const BORDER_LIGHT = new Set(["#dddddd", "#e2e8f0", "#eeeeee", "#cccccc", "#e0e0e0", "#e5e5e5"]);

function styleValue(style, propRe) {
  const m = new RegExp(`(?:^|;)\\s*${propRe}\\s*:\\s*([^;]+)`, "i").exec(style || "");
  return m ? m[1].trim() : null;
}

// Horizontal padding (px) of a style attribute, from the padding shorthand or padding-left/right.
function horizontalPadding(style) {
  const px = (v) => {
    const m = /^(-?\d+(?:\.\d+)?)px$/.exec(String(v).trim());
    return m ? parseFloat(m[1]) : 0;
  };
  let left = 0;
  let right = 0;
  const sh = styleValue(style, "padding");
  if (sh) {
    const p = sh.split(/\s+/);
    if (p.length === 1) left = right = px(p[0]);
    else if (p.length === 2 || p.length === 3) left = right = px(p[1]);
    else if (p.length === 4) { right = px(p[1]); left = px(p[3]); }
  }
  const pl = styleValue(style, "padding-left");
  const pr = styleValue(style, "padding-right");
  if (pl) left = px(pl);
  if (pr) right = px(pr);
  return Math.max(left, right);
}

const getAttr = (attrs, name) => {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(attrs);
  return m ? { raw: m[0], value: m[2] !== undefined ? m[2] : m[3] } : null;
};

function setAttr(attrs, name, value) {
  const a = getAttr(attrs, name);
  if (a) return attrs.replace(a.raw, ` ${name}="${value}"`);
  return `${attrs} ${name}="${value}"`;
}

function addClasses(attrs, classes) {
  if (!classes.length) return attrs;
  const existing = (getAttr(attrs, "class")?.value || "").split(/\s+/).filter(Boolean);
  const merged = [...new Set([...existing, ...classes])];
  return setAttr(attrs, "class", merged.join(" "));
}

function wrapperWidth(tag, attrs, style) {
  if (tag !== "table") return 0;
  const w = getAttr(attrs, "width")?.value;
  let n = 0;
  if (w && /^\d+$/.test(w.trim())) n = parseInt(w, 10);
  const sw = styleValue(style, "width");
  if (!n && sw && /^\d+px$/.test(sw)) n = parseInt(sw, 10);
  return n >= 400 && n <= 720 ? n : 0;
}

function tagElement(tag, rawAttrs) {
  let attrs = rawAttrs;
  const style = getAttr(attrs, "style")?.value || "";
  const classes = [];

  // Colours -> classes the dark-mode CSS can override.
  const bg = hex6(getAttr(attrs, "bgcolor")?.value) || hex6(styleValue(style, "background(?:-color)?"));
  if (bg && CARD_BG.has(bg) && tag !== "img" && tag !== "a") classes.push("em-card");
  else if (bg && PAGE_BG.has(bg) && tag !== "img" && tag !== "a") classes.push("em-page");

  const color = hex6(styleValue(style, "color"));
  if (color && TEXT_DARK.has(color)) classes.push("em-text");
  else if (color && TEXT_MUTED.has(color)) classes.push("em-muted");

  const border = /(?:^|;)\s*border[a-z-]*\s*:[^;]*(#[0-9a-fA-F]{3,6})/i.exec(style);
  if (border && BORDER_LIGHT.has(hex6(border[1]))) classes.push("em-border");

  if (tag === "img") classes.push("em-img");

  // Fixed-width wrapper tables become fluid up to their original width.
  const w = wrapperWidth(tag, attrs, style);
  if (w) {
    classes.push("em-wrap");
    let next = style.replace(/;?\s*$/, "");
    if (!/(?:^|;)\s*max-width\s*:/i.test(next)) next += `${next ? ";" : ""}max-width:${w}px`;
    if (!/(?:^|;)\s*width\s*:\s*100%/i.test(next)) {
      next = next.replace(/(?:^|;)\s*width\s*:[^;]*/i, "");
      next += `${next ? ";" : ""}width:100%`;
    }
    attrs = setAttr(attrs, "style", next);
  }

  // Cells with wide side padding get less of it on phones.
  if ((tag === "td" || tag === "th") && horizontalPadding(style) >= 24) classes.push("em-px");

  return addClasses(attrs, classes);
}

const TAG_RE = /<(body|table|td|th|img|a|p|h1|h2|h3|span|div)\b((?:"[^"]*"|'[^']*'|[^'">])*)(\/?)>/gi;

function enhanceEmailHtml(html, { lang = "en" } = {}) {
  if (typeof html !== "string" || !html) return html;
  if (!/<html[\s>]/i.test(html)) return html; // fragment (for example an invoice): leave as is
  if (html.includes(MARKER)) return html; // already enhanced or built natively

  let out = html.replace(TAG_RE, (_m, tag, attrs, selfClose) => `<${tag}${tagElement(tag.toLowerCase(), attrs)}${selfClose}>`);

  // <html lang>
  out = out.replace(/<html\b((?:"[^"]*"|'[^']*'|[^'">])*)>/i, (_m, attrs) => `<html${/\slang\s*=/.test(attrs) ? attrs : `${attrs} lang="${lang}"`}>`);

  // <head> with the missing meta tags, the marker and the shared CSS.
  const missing = EMAIL_META.filter(([key]) => !new RegExp(`(?:name|http-equiv)\\s*=\\s*["']${key}["']`, "i").test(out)).map(([, tag]) => tag);
  const hasCharset = /<meta[^>]+charset/i.test(out);
  const injection = [hasCharset ? "" : '<meta charset="UTF-8" />', ...missing, MSO_SETTINGS, MARKER, `<style>${EMAIL_CSS}</style>`]
    .filter(Boolean)
    .join("\n    ");
  if (/<head\b[^>]*>/i.test(out)) {
    out = out.replace(/<\/head>/i, `    ${injection}\n</head>`);
  } else {
    out = out.replace(/(<html\b[^>]*>)/i, `$1\n<head>\n    ${injection}\n</head>`);
  }

  // <body> gets an id so the Apple Mail link-colour rule above can find it.
  out = out.replace(/<body\b((?:"[^"]*"|'[^']*'|[^'">])*)>/i, (_m, attrs) => `<body${/\sid\s*=/.test(attrs) ? attrs : `${attrs} id="body"`}>`);
  return out;
}

module.exports = { EMAIL_CSS, EMAIL_META, MARKER, DARK, emailHead, enhanceEmailHtml, horizontalPadding };
