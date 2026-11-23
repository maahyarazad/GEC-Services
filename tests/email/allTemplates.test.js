"use strict";

// Runs the real email functions with a stubbed SMTP transport (nothing is sent, no database is
// touched) and checks that every HTML email is responsive and adaptive when it leaves the service.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const { horizontalPadding } = require(path.join(ROOT, "services/emailResponsive"));
// Outlook-only markup (<!--[if mso]> ... <![endif]-->) keeps fixed widths on purpose.
const withoutMso = (html) => html.replace(/<!--\[if mso\]>[\s\S]*?<!\[endif\]-->/g, "");

// ── stubs (before the service is loaded) ─────────────────────────────────────
const nodemailer = require("nodemailer");
let sent = [];
nodemailer.createTransport = () => ({ sendMail: async (o) => { sent.push(o); return { messageId: "stub" }; } });
for (const mod of ["services/dbService", "services/emailLogService"]) {
  const file = require.resolve(path.join(ROOT, mod));
  require.cache[file] = { id: file, filename: file, loaded: true, exports: { create() {}, getDB() { return {}; }, logEmailSend() {} } };
}
const svc = require(path.join(ROOT, "services/emailService"));

const sample = (over = {}) =>
  new Proxy(over, {
    get: (t, k) => (k in t ? t[k] : typeof k !== "string" ? undefined : /email/i.test(k) ? "member@example.com" : /date|time/i.test(k) ? "2026-12-01" : `Sample ${k}`),
  });
const companyFields = ["partnerBrand", "partnerName", "cityCountry", "phone", "mobile", "email", "website", "employeeCount", "industry", "ceoOwnerGm", "hrHead", "accountingHead", "marketingHead"];
const member = { firstname: "Ana", lastname: "Lopez", email: "ana@example.com", memberId: "1774354016162", partner: "ACME Trading LLC", card_expiry_date: new Date(2027, 2, 24) };
const pass = { applePKpassPath: "/apple_pass/corporate-card/T.pkpass", googlePassToken: "https://pay.google.com/gp/v/save/T" };

const calls = {
  membership_pass_email_corporate: () => svc.membership_pass_email({ data: { member, ...pass } }),
  membership_pass_email_family: () => svc.membership_pass_email({ data: { member: { ...member, partner: "GEC Family Membership" }, ...pass } }),
  comfirm_message_email: () => svc.comfirm_message_email(sample({ firstName: "Ana", lastName: "Lopez", event: "gec-summer-party" })),
  email_otp: () => svc.email_otp(sample({ otp: "482913", event: "gec-summer-party", message: "Your code" })),
  email_request_received: () => svc.email_request_received(sample({ title: "gec-summer-party", firstName: "Ana", lastName: "Lopez" })),
  gic__reset_password: () => svc.gic__reset_password(sample({ password: "Tmp-Pass-123" })),
  emailMembershipCard: () => svc.emailMembershipCard(sample({ memberName: "Ana Lopez", cardNumber: "100200", expiryDate: "24-03-2027", membershipTier: "Premium" }), Buffer.from("x")),
  membership_courtacy_at_venue_message: () => svc.membership_courtacy_at_venue_message(sample({ firstName: "Ana", lastName: "Lopez", event: "GEC Summer Party" })),
  membership__invitation: () => svc.membership__invitation(sample({ firstname: "Ana", partner: "ACME Trading LLC" })),
  membership__invitation_family: () => svc.membership__invitation(sample({ firstname: "Ana", partner: "Family Membership" })),
  send_party_invitation: () => svc.send_party_invitation(sample({ firstName: "Ana", lastName: "Lopez", event: "GEC Summer Party" })),
  company_data_confirmation_email: () =>
    svc.company_data_confirmation_email(sample({ event: "gec-summer-party", company_data: JSON.stringify(Object.fromEntries(companyFields.map((k) => [`company_${k}`, /mail/i.test(k) ? "c@example.com" : `Sample ${k}`]))) })),
};

const captured = {};
const sentByName = {};
test.before(async () => {
  for (const [name, fn] of Object.entries(calls)) {
    sent = [];
    await fn();
    captured[name] = sent[sent.length - 1].html;
    sentByName[name] = sent[sent.length - 1];
  }
});

let chromeOk = true;
let findChrome;
try {
  ({ findChrome } = require(path.join(ROOT, "scripts/wallet/lib/render")));
  findChrome();
} catch {
  chromeOk = false;
}

test("every email has viewport, color-scheme, mobile and dark-mode CSS", () => {
  for (const [name, html] of Object.entries(captured)) {
    assert.ok(html, name);
    for (const needle of ['name="viewport"', 'name="color-scheme"', "@media only screen and (max-width: 620px)", "prefers-color-scheme: dark", "<!-- em-responsive -->"]) {
      assert.ok(html.includes(needle), `${name}: ${needle}`);
    }
    assert.equal((html.match(/name="viewport"/g) || []).length, 1, `${name}: one viewport tag`);
    assert.ok(/<html[^>]*\blang=/.test(html), `${name}: html lang`);
  }
});

test("fixed-width wrapper tables are fluid (width:100% up to their original width)", () => {
  for (const [name, html] of Object.entries(captured)) {
    const wrappers = [...withoutMso(html).matchAll(/<table\b[^>]*\bwidth="(\d{3})"[^>]*>/g)].filter((m) => +m[1] >= 400);
    assert.ok(wrappers.length > 0 || /width="100%"/.test(html), `${name}: has a wrapper table`);
    for (const m of wrappers) {
      assert.ok(/max-width:\s*\d+px/.test(m[0]) && /width:\s*100%/.test(m[0]), `${name}: ${m[0].slice(0, 120)}`);
    }
  }
});

test("images never exceed their cell (max-width rule) and wide cells get the phone padding class", () => {
  for (const [name, html] of Object.entries(captured)) {
    assert.ok(/img\s*\{[^}]*max-width:\s*100%/.test(html), `${name}: img max-width`);
    for (const [td] of html.matchAll(/<td\b[^>]*>/g)) {
      const style = /style="([^"]*)"/.exec(td)?.[1] || "";
      if (horizontalPadding(style) >= 24) assert.ok(/em-px/.test(td), `${name}: ${td.slice(0, 120)}`);
    }
  }
});

test("dark mode: the card and the text layers are tagged, the brand colours are not", () => {
  for (const [name, html] of Object.entries(captured)) {
    assert.ok(/class="[^"]*em-(card|page)/.test(html), `${name}: neutral layers tagged`);
  }
});

test("no email has horizontal overflow at 375px and 320px (headless Chrome)", { skip: chromeOk ? false : "Chrome not found" }, () => {
  const chrome = findChrome();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "email-ovf-"));
  try {
    for (const [name, html] of Object.entries(captured)) {
      for (const width of [375, 320]) {
        const srcdoc = html.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
        const host = `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:${width}px;height:1200px;border:0" srcdoc="${srcdoc}"></iframe>
<script>document.getElementById('f').addEventListener('load',function(){document.title='SW='+this.contentDocument.documentElement.scrollWidth;});</script></body></html>`;
        const file = path.join(dir, `${name}-${width}.html`);
        fs.writeFileSync(file, host);
        const dom = execFileSync(chrome, ["--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${path.join(dir, "profile")}`, "--window-size=800,1300", "--virtual-time-budget=4000", "--dump-dom", `file://${file}`], { stdio: ["ignore", "pipe", "ignore"] }).toString();
        const m = /<title>SW=(\d+)/.exec(dom);
        assert.ok(m, `${name}@${width}: could not measure`);
        assert.ok(+m[1] <= width, `${name}@${width}: content is ${m[1]}px wide`);
      }
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("membership invitation: Family Membership has its own text, other partners keep the corporate text", () => {
  const family = captured.membership__invitation_family;
  const corporate = captured.membership__invitation;
  assert.ok(family.includes("As requested, here is your digital Membership Pass"));
  assert.ok(!/Your employer|HR department/.test(family));
  assert.ok(family.includes("please reach out to us via email or WhatsApp."));
  assert.ok(corporate.includes("Your employer, ACME Trading LLC"));
  assert.ok(corporate.includes("HR department"));
  assert.ok(!corporate.includes("As requested, here is your digital"));
});

test("membership invitation: subjects, plain text and head tags", () => {
  assert.equal(sentByName.membership__invitation.subject, "ACME Trading LLC offers you your Membership Pass - for free!");
  assert.equal(sentByName.membership__invitation_family.subject, "Your German Emirates Club Membership Pass");
  for (const name of ["membership__invitation", "membership__invitation_family"]) {
    assert.ok(sentByName[name].text && sentByName[name].text.includes("https://services.german-emirates-club.com/membership"), name);
    const html = captured[name];
    assert.ok(/<title>[^<]+<\/title>/.test(html), `${name}: title`);
    assert.ok(html.includes('name="viewport"') && html.includes('name="color-scheme"') && html.includes('<html lang="en">'), name);
  }
});
