const path = require("path");
const fs = require("fs").promises;

const DEFAULT_OG_IMAGE = "https://services.german-emirates-club.com/uploads/background.webp";

const OG_ROUTES = {
  "/support": {
    title: "Support - German Emirates Club",
    description: "Get support from the German Emirates Club team.",
    url: "https://services.german-emirates-club.com/support",
    image: DEFAULT_OG_IMAGE,
  },
  "/membership": {
    title: "Membership - German Emirates Club",
    description: "Join the German Emirates Club and become a member today.",
    url: "https://services.german-emirates-club.com/membership",
    image: DEFAULT_OG_IMAGE,
  },
  "/partner-onboarding": {
    title: "Partner Onboarding - German Emirates Club",
    description: "Become a partner of the German Emirates Club. Start your onboarding here.",
    url: "https://services.german-emirates-club.com/partner-onboarding",
    image: "https://services.german-emirates-club.com/images/partner-preview.jpg",
  },
};

function buildOgTags({ title, description, url, image }) {
  const escape = (s) => s.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return [
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:image" content="${escape(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:url" content="${escape(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${escape(image)}" />`,
  ].join("\n    ");
}

async function serveWithOgTags(req, res) {
  const indexPath = path.join(__dirname, "../public", "index.html");
  const ogMeta = OG_ROUTES[req.path];
  if (!ogMeta) {
    return res.sendFile(indexPath);
  }
  try {
    let html = await fs.readFile(indexPath, "utf8");
    html = html.replace("</head>", `    ${buildOgTags(ogMeta)}\n  </head>`);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch {
    res.sendFile(indexPath);
  }
}

module.exports = { serveWithOgTags };
