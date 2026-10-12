// Runs babel-plugin-react-compiler over src/ and reports every component/hook
// it compiled or skipped (with the reason). Usage:
//   npm run check:compiler            -> summary + skipped list
//   npm run check:compiler -- <path>  -> limit to a file or folder
import { transformFileSync } from "@babel/core";
import fs from "fs";
import path from "path";

const root = process.argv[2] || "src";
const files = [];
(function walk(p) {
  if (fs.statSync(p).isFile()) return /\.(jsx?|tsx?)$/.test(p) && files.push(p);
  for (const e of fs.readdirSync(p)) walk(path.join(p, e));
})(root);

let compiled = 0;
const skipped = new Map(); // "file:line" -> reason
const reasons = {};

for (const file of files) {
  const events = [];
  transformFileSync(file, {
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ["jsx", "typescript"] },
    plugins: [["babel-plugin-react-compiler", { logger: { logEvent: (_f, e) => events.push(e) } }]],
  });
  for (const e of events) {
    if (e.kind === "CompileSuccess") compiled++;
    if (e.kind === "CompileError" || e.kind === "PipelineError") {
      const reason = (e.detail?.reason || e.detail?.options?.reason || String(e.data ?? "unknown"))
        .replace(/^\(.*?\)\s*/, "");
      const key = `${file}:${e.fnLoc?.start?.line ?? "?"}`;
      if (!skipped.has(key)) {
        skipped.set(key, reason);
        reasons[reason] = (reasons[reason] || 0) + 1;
      }
    }
  }
}

console.log(`\nCompiled: ${compiled}   Skipped: ${skipped.size}   Files: ${files.length}\n`);
if (skipped.size) {
  console.log("Skip reasons:");
  for (const [r, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${r}`);
  console.log("\nSkipped components/hooks:");
  for (const [loc, r] of skipped) console.log(`  ${loc}  —  ${r}`);
}
