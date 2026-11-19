"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

const BASE_WIDTH = 375; // layout reference width in CSS px (strip at 1x)

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(
      "Chrome/Chromium not found. Install it or set CHROME_PATH to the executable."
    );
  }
  return found;
}

// CSS injected into a temporary copy of the design. The source HTML is never modified.
function buildInjectedCss(mode, width, height, design) {
  const k = width / BASE_WIDTH;
  const px = (n) => `${+(n * k).toFixed(3)}px`;
  const common = `
html,body{margin:0!important;padding:0!important;min-height:0!important;display:block!important;gap:0!important;background:${design.backgroundColor}!important}
.cardContainer{width:${width}px!important;height:${height}px!important;aspect-ratio:auto!important;filter:none!important}
.card,.glow,.glare{border-radius:0!important}
.glow{box-shadow:none!important}
.cardLabel{display:none!important}
`;
  if (mode === "strip" || mode === "hero") {
    return (
      common +
      `.icons{left:${px(20)}!important;right:${px(20)}!important;top:50%!important;transform:translateY(-50%)!important}
.box{width:${px(46)}!important;height:${px(46)}!important;border-radius:${px(6)}!important}
.icon{border-width:${px(1.5)}!important}
.icon svg{width:${px(36)}!important;height:${px(36)}!important}
.gec{font-size:${px(14)}!important}
`
    );
  }
  if (mode === "logo") {
    const badge = Math.round(width * 0.6);
    return (
      common +
      `.card > :not(.icons){display:none!important}
.icons > :not(.gec){display:none!important}
.icons{left:0!important;right:0!important;top:50%!important;transform:translateY(-50%)!important;justify-content:center!important}
.gec{width:${badge}px!important;height:${badge}px!important;font-size:${Math.round(badge * 0.36)}px!important;border-radius:${Math.round(badge * 0.16)}px!important}
`
    );
  }
  throw new Error(`Unknown render mode "${mode}".`);
}

function readPngSize(file) {
  const buf = fs.readFileSync(file);
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`${file} is not a PNG image.`);
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function runChrome(chrome, args) {
  return new Promise((resolve, reject) => {
    execFile(chrome, args, { timeout: 60000 }, (err, _stdout, stderr) => {
      if (err) reject(new Error(`Chrome failed: ${err.message}\n${stderr || ""}`.trim()));
      else resolve();
    });
  });
}

// Renders the design to a PNG of exactly width*scale by height*scale pixels.
async function renderDesign(design, { mode, width, height, scale = 1, outFile }) {
  const chrome = findChrome();
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "wallet-render-"));
  try {
    const css = buildInjectedCss(mode, width, height, design);
    const html = design.html.includes("</head>")
      ? design.html.replace("</head>", `<style>${css}</style></head>`)
      : `<style>${css}</style>${design.html}`;
    const htmlFile = path.join(workDir, "render.html");
    fs.writeFileSync(htmlFile, html);

    const args = [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${path.join(workDir, "profile")}`,
      `--force-device-scale-factor=${scale}`,
      `--window-size=${width},${height}`,
      `--screenshot=${outFile}`,
      `file://${htmlFile}`,
    ];
    if (typeof process.getuid === "function" && process.getuid() === 0) args.unshift("--no-sandbox");
    await runChrome(chrome, args);

    if (!fs.existsSync(outFile)) throw new Error(`Chrome did not produce ${outFile}.`);
    const size = readPngSize(outFile);
    const expected = { width: width * scale, height: height * scale };
    if (size.width !== expected.width || size.height !== expected.height) {
      throw new Error(
        `${path.basename(outFile)} is ${size.width}x${size.height}, expected ${expected.width}x${expected.height}.`
      );
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

module.exports = { findChrome, buildInjectedCss, readPngSize, renderDesign };
