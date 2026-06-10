const path = require("path");
const fs = require("fs").promises;

const DEFAULT_OG_IMAGE = "https://services.german-emirates-club.com/uploads/og_image.png";

const BASE_URL = "https://services.german-emirates-club.com";

const DEFAULT_OG = {
  title: "Services - German Emirates Club",
  description: "Exclusive services and benefits for members of the German Emirates Club.",
  image: DEFAULT_OG_IMAGE,
};

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
  
  console.log('======req.path======')
  console.log(req.path)
  console.log('======req.path======')
  console.log('======OG_ROUTES[req.path]======')
  console.log(OG_ROUTES[req.path])
  console.log('======rOG_ROUTES[req.path]======')
  const ogMeta = OG_ROUTES[req.path] ?? {
    ...DEFAULT_OG,
    url: `${BASE_URL}${req.path}`,
  };
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
