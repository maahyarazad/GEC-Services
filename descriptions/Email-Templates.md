# Email templates: responsive and adaptive

Every HTML email the app sends is made responsive (phones, tablets) and adaptive (light/dark mode) in one place, `services/emailResponsive.js`.

## How it works

1. **Every outgoing email passes through `enhanceEmailHtml()`**. It is called by the three send functions in `services/emailService.js` (`sendEmail`, `sendRawEmailWithAttachments`, `sendRawEmailWithAttachments_AppSupport`), so older templates and `routes/support.js` are covered without editing them. It:
   - adds the missing `<meta>` tags (viewport, `color-scheme`, `supported-color-schemes`, `x-apple-disable-message-reformatting`, `format-detection`, `X-UA-Compatible`) and `<html lang>`;
   - adds one shared `<style>` block: reset, `img { max-width: 100% }`, phone rules (max-width 620px), dark mode (`prefers-color-scheme: dark`, plus Outlook.com `[data-ogsc]` / `[data-ogsb]`);
   - tags the markup with classes the CSS can use: fixed-width wrapper tables (400-720px) become fluid (`width:100%; max-width:<original>px`, the `width` attribute stays for Outlook desktop), cells with 24px+ side padding get `em-px` (16px on phones), white/light-grey layers get `em-card` / `em-page`, dark and grey text get `em-text` / `em-muted`, light borders get `em-border`, images get `em-img`.
   - It is idempotent and skips HTML fragments without `<html>` (the invoice attachment) and templates that already contain its marker (`<!-- em-responsive -->`).
2. **Native template: `services/memberPassEmail.js`** (the pass-issued email) is built directly on the shared head (`emailHead()`), with a hidden preheader, an Outlook wrapper table, and phone rules of its own: logo and title stack, the Expiry / Member ID / Name row stacks, wallet and app-store badges stack. The brand card keeps its colours in dark mode; the page, card, text and links adapt.

## Dark mode

Only the neutral layers change (page, white card, dark/grey text, light borders, plain links). Branded blocks keep the inline colours they were given. Mail clients differ: Apple Mail and Outlook.com follow the rules above; Gmail apps ignore `prefers-color-scheme` and apply their own colour inversion.

## Writing a new template

- Either write it the usual way (tables, inline styles, `<html>` with `<head>`): the enhancer adapts it when it is sent; use `bgcolor`/`background-color:#ffffff` and `color:#333333` style colours for the neutral layers so they are recognised.
- Or build the head with `emailHead({ title, extraCss })` and add the classes yourself (see `memberPassEmail.js`).
- Use a table of 500-600px as the wrapper and keep side padding on the cell (`padding: 10px 30px`), not on the table.

## Checking

- `npm run test:email` runs every email function with a stubbed transport (nothing is sent) and checks the meta tags, CSS, fluid wrappers, padding classes, dark-mode classes, and measures horizontal overflow at 375px and 320px in headless Chrome (skipped if Chrome is not installed).
- `npm run test:wallet` covers the member pass email itself (stacking hooks, dark-mode hooks, escaping).
- The three event emails (`event_confirm_registration_email*`) need QR and map image files on disk, so they are not in the automated test; they go through the same send functions.

## Limits

- Outlook desktop (Word engine) ignores media queries and `max-width`; it keeps the fixed 500/600px layout from the `width` attributes.
- Not tested in real mail clients yet: send one of each type to Gmail, Apple Mail and Outlook before relying on it.
- `newsletter.html` in the repo root is a separate static file that is not sent by this code.
