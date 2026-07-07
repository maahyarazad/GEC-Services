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

// The built index.html doesn't change without a deploy (which restarts the
// process), so read it from disk once and reuse it. If you ever hot-swap
// the build without restarting the server, this cache would go stale -
// in that case, remove the caching and just `await fs.readFile(...)` per request.
let templatePromise = null;
function loadTemplate(indexPath) {
  if (!templatePromise) {
    templatePromise = fs.readFile(indexPath, "utf8");
  }
  return templatePromise;
}

async function serveWithOgTags(req, res) {
  const indexPath = path.join(__dirname, "../public", "index.html");
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