"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { enhanceEmailHtml, MARKER, EMAIL_CSS } = require("../../services/emailResponsive");

// A template in the style of the older ones: fixed 600px table, inline colours, no <style>, no viewport.
const legacy = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Legacy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; margin: 40px auto;">
        <tr><td bgcolor="#D9B144" style="color: #ffffff; padding: 20px;">Header</td></tr>
        <tr><td style="padding: 30px; color: #333333; font-size: 16px;">
          <p style="color:#777777">Muted</p>
          <img src="https://x/logo.png" width="200" alt="logo">
          <a href="mailto:a@b.c?subject=a>b" style="color:#D9B144">link</a>
        </td></tr>
        <tr><td style="padding: 10px 30px 20px; border-top: 1px solid #dddddd;">footer</td></tr>
        <tr><td style="padding: 8px 12px;">small padding</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

test("adds viewport, color-scheme and the shared CSS to a legacy template", () => {
  const out = enhanceEmailHtml(legacy);
  for (const needle of ['name="viewport"', 'name="color-scheme"', 'name="supported-color-schemes"', 'name="x-apple-disable-message-reformatting"', "@media only screen and (max-width: 620px)", "prefers-color-scheme: dark", MARKER]) {
    assert.ok(out.includes(needle), needle);
  }
  assert.ok(out.includes('<html lang="en">'));
  assert.ok(out.includes('<meta charset="UTF-8" />'));
  assert.equal((out.match(/<meta charset/gi) || []).length, 1, "no duplicate charset");
});

test("the fixed-width wrapper becomes fluid but keeps its width attribute and maximum", () => {
  const out = enhanceEmailHtml(legacy);
  const table = /<table width="600"[^>]*>/.exec(out)[0];
  assert.ok(/class="[^"]*em-wrap/.test(table));
  assert.ok(table.includes("max-width:600px") && table.includes("width:100%"));
  assert.ok(table.includes("background-color: #ffffff"), "existing styles are kept");
  // the 100% outer table is not a wrapper
  assert.ok(!/<table width="100%"[^>]*em-wrap/.test(out));
});

test("wide side padding gets em-px, small padding does not", () => {
  const out = enhanceEmailHtml(legacy);
  assert.ok(/<td style="padding: 30px;[^>]*class="[^"]*em-px/.test(out) || /<td class="[^"]*em-px[^"]*" style="padding: 30px/.test(out));
  assert.ok(/class="[^"]*em-px[^"]*"[^>]*>footer|padding: 10px 30px 20px[^>]*class="[^"]*em-px/.test(out.replace(/\n/g, " ")));
  const small = /<td[^>]*padding: 8px 12px[^>]*>/.exec(out)[0];
  assert.ok(!small.includes("em-px"));
  const header = /<td[^>]*D9B144[^>]*>/.exec(out)[0];
  assert.ok(!header.includes("em-px"), "20px padding is below the threshold");
});

test("images get em-img; the mailto link with '>' in its query is not broken", () => {
  const out = enhanceEmailHtml(legacy);
  assert.ok(/<img[^>]*class="em-img"/.test(out));
  assert.ok(out.includes('href="mailto:a@b.c?subject=a>b"'));
});

test("light colours are tagged for dark mode, brand colours are not", () => {
  const out = enhanceEmailHtml(legacy);
  assert.ok(/<table width="100%"[^>]*class="[^"]*em-page/.test(out));
  assert.ok(/<body[^>]*class="[^"]*em-page/.test(out));
  assert.ok(/<table width="600"[^>]*class="[^"]*em-card/.test(out));
  assert.ok(/<td style="padding: 30px;[^>]*class="[^"]*em-text/.test(out) || /<td class="[^"]*em-text[^"]*" style="padding: 30px/.test(out));
  assert.ok(/<p[^>]*class="[^"]*em-muted/.test(out));
  assert.ok(/border-top: 1px solid #dddddd[^>]*class="[^"]*em-border/.test(out) || /class="[^"]*em-border[^"]*"[^>]*border-top/.test(out));
  const header = /<td[^>]*D9B144[^>]*>/.exec(out)[0];
  assert.ok(!/em-(card|page|text|muted)/.test(header), "branded header untouched");
  const link = /<a [^>]*>/.exec(out)[0];
  assert.ok(!/em-(text|muted)/.test(link), "brand-coloured link untouched");
});

test("idempotent: a second pass changes nothing", () => {
  const once = enhanceEmailHtml(legacy);
  assert.equal(enhanceEmailHtml(once), once);
});

test("fragments without <html> (invoices) and non-strings are returned as is", () => {
  const frag = '<table width="600"><tr><td style="padding:30px">x</td></tr></table>';
  assert.equal(enhanceEmailHtml(frag), frag);
  assert.equal(enhanceEmailHtml(undefined), undefined);
  assert.equal(enhanceEmailHtml(""), "");
});

test("a template that already has a viewport tag does not get a second one", () => {
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head><body></body></html>';
  const out = enhanceEmailHtml(html);
  assert.equal((out.match(/name="viewport"/g) || []).length, 1);
});

test("a document without <head> gets one", () => {
  const out = enhanceEmailHtml('<html><body><table width="500"><tr><td>x</td></tr></table></body></html>');
  assert.ok(/<head>[\s\S]*name="viewport"[\s\S]*<\/head>/.test(out));
  assert.ok(/<table width="500"[^>]*max-width:500px/.test(out));
});

test("the CSS has the mobile and dark-mode blocks", () => {
  assert.ok(EMAIL_CSS.includes("@media only screen and (max-width: 620px)"));
  assert.ok(EMAIL_CSS.includes("@media (prefers-color-scheme: dark)"));
  assert.ok(EMAIL_CSS.includes("[data-ogsc]"));
});
