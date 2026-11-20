"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { buildMemberPassEmail, escapeHtml } = require("../../services/memberPassEmail");

// A models folder that contains a strip for each design.
const modelsDir = fs.mkdtempSync(path.join(os.tmpdir(), "email-models-"));
for (const d of ["corporate_card", "family_card"]) {
  fs.mkdirSync(path.join(modelsDir, `${d}.pass`));
  fs.writeFileSync(path.join(modelsDir, `${d}.pass`, "strip@2x.png"), "png");
}
const emptyModelsDir = fs.mkdtempSync(path.join(os.tmpdir(), "email-empty-"));

const base = {
  applePKpassPath: "/apple_pass/corporate-card/GEC-1.pkpass",
  googlePassToken: "https://pay.google.com/gp/v/save/TOKEN",
  clientOrigin: "https://services.example.com",
  modelsDir,
};
const member = (over = {}) => ({ firstname: "Ana", lastname: "Lopez", email: "ana@example.com", memberId: "1774354016162", partner: "ACME", card_expiry_date: "2027-03-24 00:00:00", ...over });

test("corporate partner: red card, label, subject and fields", () => {
  const r = buildMemberPassEmail({ ...base, member: member() });
  assert.equal(r.subject, "Your Corporate Card Has Been Issued");
  assert.ok(r.html.includes("Corporate Card - ACME"));
  assert.ok(r.html.includes("#9d1d1d"));
  assert.ok(!r.html.includes("#139038"));
  for (const label of ["Expiry Date", "Member ID", "Name"]) assert.ok(r.html.includes(label), label);
  assert.ok(r.html.includes("24-03-2027") && r.html.includes("1774354016162") && r.html.includes("Ana Lopez"));
  assert.ok(!r.html.includes("Corporate Partner"));
  assert.ok(r.html.includes("cid:card-strip"));
  assert.match(r.text, /Corporate Card/);
});

test("family partner: green card, family wording, no 'Corporate Card - '", () => {
  const r = buildMemberPassEmail({ ...base, member: member({ partner: "GEC Family Membership" }) });
  assert.equal(r.subject, "Your GEC Family Membership Card Has Been Issued");
  assert.ok(r.html.includes("GEC Family Membership"));
  assert.ok(r.html.includes("#139038"));
  assert.ok(!r.html.includes("#9d1d1d"));
  assert.ok(!r.html.includes("Corporate Card - "));
  assert.match(r.text, /GEC Family Membership/);
  assert.ok(r.attachments[0].path.includes("family_card.pass"));
});

test("empty partner: 'Corporate Card' without a dangling dash, corporate design", () => {
  const r = buildMemberPassEmail({ ...base, member: member({ partner: "" }) });
  assert.ok(r.html.includes("Corporate Card"));
  assert.ok(!r.html.includes("Corporate Card -"));
  assert.ok(r.html.includes("#9d1d1d"));
});

test("member values are HTML-escaped", () => {
  const r = buildMemberPassEmail({ ...base, member: member({ firstname: "<script>alert(1)</script>", partner: 'A&B "C"' }) });
  assert.ok(!r.html.includes("<script>"));
  assert.ok(r.html.includes("&lt;script&gt;"));
  assert.ok(r.html.includes("A&amp;B &quot;C&quot;"));
  assert.equal(escapeHtml("<&>\"'"), "&lt;&amp;&gt;&quot;&#39;");
});

test("wallet links are unchanged", () => {
  const r = buildMemberPassEmail({ ...base, member: member() });
  assert.ok(r.html.includes('href="https://services.example.com/apple_pass/corporate-card/GEC-1.pkpass"'));
  assert.ok(r.html.includes('href="https://pay.google.com/gp/v/save/TOKEN"'));
  assert.ok(r.html.includes("play.google.com/store/apps/details?id=com.buenapublica.GECRewards"));
});

test("a missing expiry shows --", () => {
  const r = buildMemberPassEmail({ ...base, member: member({ card_expiry_date: null }) });
  assert.ok(r.html.includes("--"));
  assert.ok(!r.html.includes("Invalid date"));
});

test("strip present: one inline attachment, no warnings", () => {
  const r = buildMemberPassEmail({ ...base, member: member() });
  assert.equal(r.attachments.length, 1);
  assert.equal(r.attachments[0].cid, "card-strip");
  assert.equal(r.attachments[0].contentDisposition, "inline");
  assert.ok(r.attachments[0].path.startsWith(modelsDir));
  assert.deepEqual(r.warnings, []);
});

test("strip missing: email still built, without the image, and a warning", () => {
  const r = buildMemberPassEmail({ ...base, modelsDir: emptyModelsDir, member: member() });
  assert.equal(r.attachments.length, 0);
  assert.ok(!r.html.includes("cid:card-strip"));
  assert.equal(r.warnings.length, 1);
  assert.ok(r.html.includes("Corporate Card - ACME"));
});

// ── Responsive and adaptive behaviour ────────────────────────────────────────

const { enhanceEmailHtml } = require("../../services/emailResponsive");

test("responsive head: viewport, color scheme, mobile and dark-mode CSS", () => {
  const { html } = buildMemberPassEmail({ ...base, member: member() });
  assert.equal((html.match(/name="viewport"/g) || []).length, 1);
  for (const needle of ['content="width=device-width, initial-scale=1.0"', 'name="color-scheme"', 'name="supported-color-schemes"',
    "@media only screen and (max-width: 520px)", "@media only screen and (max-width: 620px)", "prefers-color-scheme: dark", "[data-ogsc]"]) {
    assert.ok(html.includes(needle), needle);
  }
  assert.ok(html.includes('<html lang="en"'));
});

test("fluid wrapper with Outlook fallback and a hidden preheader", () => {
  const { html } = buildMemberPassEmail({ ...base, member: member() });
  assert.ok(/<table[^>]*width="500"[^>]*class="em-wrap em-card"[^>]*max-width:500px/.test(html));
  assert.ok(html.includes("<!--[if mso]>") && html.includes("<![endif]-->"));
  assert.match(html, /class="em-preheader">Your Corporate Card - ACME has been issued\./);
});

test("phone layout hooks: logo/title, fields and badges can stack", () => {
  const { html } = buildMemberPassEmail({ ...base, member: member() });
  assert.equal((html.match(/class="mp-field"/g) || []).length, 3);
  assert.ok(html.includes("mp-logo-cell") && html.includes("mp-title-cell"));
  assert.equal((html.match(/class="mp-btn"/g) || []).length, 4, "two wallet badges and two app-store badges");
  assert.ok(html.includes(".mp-field { display: block !important"));
});

test("dark mode: neutral layers are tagged, the brand card is not", () => {
  const { html } = buildMemberPassEmail({ ...base, member: member() });
  for (const cls of ["em-page", "em-card", "em-text", "em-muted", "em-border", "em-link"]) assert.ok(html.includes(cls), cls);
  const brandCard = /<table[^>]*bgcolor="#9d1d1d"[^>]*>/.exec(html)[0];
  assert.ok(!/em-(card|page)/.test(brandCard));
});

test("the generic enhancer leaves the native template unchanged and no fixed pixel width exceeds the wrapper", () => {
  for (const partner of ["ACME", "GEC Family Membership"]) {
    const { html } = buildMemberPassEmail({ ...base, member: member({ partner }) });
    assert.equal(enhanceEmailHtml(html), html);
    const widths = [...html.matchAll(/(?<![a-z-])width:\s*(\d+)px/g)].map((m) => +m[1]);
    assert.ok(widths.every((w) => w <= 500), `style widths: ${widths}`);
  }
});

test("long values are escaped and cannot add markup", () => {
  const { html } = buildMemberPassEmail({ ...base, member: member({ partner: "A".repeat(80) + "<b>x</b>", firstname: "Very".repeat(30) }) });
  assert.ok(!html.includes("<b>x</b>"));
  assert.ok(html.includes("&lt;b&gt;x&lt;/b&gt;"));
});

test("both versions tell the member to register in the mobile app before signing in", () => {
  const sentence = "You need to register your username in the Mobile Application before signing in. Please go to Create an Account (Corporate and Family Cardholders Only).";
  for (const partner of ["ACME", "GEC Family Membership"]) {
    const r = buildMemberPassEmail({ ...base, member: member({ partner }) });
    assert.ok(r.html.includes(`<strong>${sentence}</strong>`));
    assert.ok(r.text.includes(sentence));
  }
});
