const path = require("path");
const fs = require("fs").promises;

const BASE_URL = "https://services.german-emirates-club.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/uploads/og_image.png`;

const DEFAULT_OG = {
  title: "Services - German Emirates Club",
  description: "Exclusive services and benefits for members of the German Emirates Club.",
  image: DEFAULT_OG_IMAGE,
};

// Per-route OG overrides. Keys are matched against the normalized request
// path (see normalizePath below), so "/membership" and "/membership/" both
// resolve to the same entry.
const OG_ROUTES = {
  "/": {
    title: "Services - German Emirates Club",
    description: "Exclusive services and benefits for members of the German Emirates Club.",
    url: BASE_URL,
    image: DEFAULT_OG_IMAGE,
  },
  "/support": {
    title: "Support - German Emirates Club",
    description: "Get support from the German Emirates Club team.",
    url: `${BASE_URL}/support`,
    image: DEFAULT_OG_IMAGE,
  },
  "/membership": {
    title: "Membership - German Emirates Club",
    description:
      "Activate your German Emirates Club Membership Pass and access exclusive privileges, discounts, and lifestyle benefits across the UAE.",
    url: `${BASE_URL}/membership`,
    image: DEFAULT_OG_IMAGE,
  },
  "/partner-onboarding": {
    title: "Partner Onboarding - German Emirates Club",
    description:
      "Submit and manage your employee list to onboard your team into the German Emirates Club corporate membership program.",
    url: `${BASE_URL}/partner-onboarding`,
    image: DEFAULT_OG_IMAGE,
  },
};

/**
 * Strip a single trailing slash so "/membership/" and "/membership" resolve
 * to the same OG_ROUTES entry. The root path "/" is left untouched.
 */
function normalizePath(requestPath) {
  if (requestPath.length > 1 && requestPath.endsWith("/")) {
    return requestPath.replace(/\/+$/, "");
  }
  return requestPath;
}

function escapeHtml(value) {
  // Order matters: "&" must be escaped first, or the entities added below
  // would themselves get re-escaped.
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildOgTags({ title, description, url, image }) {
  return [
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  ].join("\n    ");
}

// Static assets are content-hashed, so a request for one that no longer exists
// means the client is holding a stale index.html. Answering those with the SPA
// shell makes the browser reject an HTML body where it expected a JS module,
// which surfaces as a blank page with no useful error. Fail them honestly
// instead, so a bad deploy shows up as a 404 rather than a white screen.
const ASSET_EXTENSIONS = new Set([
  ".js", ".mjs", ".css", ".map", ".json", ".webmanifest",
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
  ".woff", ".woff2", ".ttf", ".eot",
]);

function isAssetRequest(requestPath) {
  return ASSET_EXTENSIONS.has(path.extname(requestPath).toLowerCase());
}

// Cache the built index.html, but key the cache on the file's mtime so a deploy
// that swaps the build without restarting the process picks up the new HTML on
// the next request instead of serving the old asset hashes forever.
let cached = { mtimeMs: null, html: null };
async function loadTemplate(indexPath) {
  const { mtimeMs } = await fs.stat(indexPath);
  if (cached.mtimeMs !== mtimeMs) {
    cached = { mtimeMs, html: await fs.readFile(indexPath, "utf8") };
  }
  return cached.html;
}

async function serveWithOgTags(req, res) {
  const indexPath = path.join(__dirname, "../public", "index.html");

  if (isAssetRequest(req.path)) {
    return res.status(404).type("text/plain").send("Not found");
  }

  const routeKey = normalizePath(req.path);
  const ogMeta = OG_ROUTES[routeKey] ?? {
    ...DEFAULT_OG,
    url: `${BASE_URL}${req.path}`,
  };

  try {
    const template = await loadTemplate(indexPath);
    const html = template.replace("</head>", `    ${buildOgTags(ogMeta)}\n  </head>`);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error(`serveWithOgTags: failed to build OG tags for ${req.path}`, err);
    res.sendFile(indexPath);
  }
}

module.exports = { serveWithOgTags, normalizePath, buildOgTags };