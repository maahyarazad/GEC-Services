# Research: Wallet Card Asset Generators

## Decision 1: Render with the locally installed Chrome, no new dependency
- **Decision**: Spawn Chrome/Chromium headless (`--screenshot`, `--force-device-scale-factor`, `--window-size`), path from `CHROME_PATH` or well-known locations.
- **Rationale**: Already used successfully to prototype the strip. Setting window size and scale factor yields exact pixel sizes at 1x/2x/3x with no resizing step. Avoids adding a ~200 MB Puppeteer download to a deployed server repo.
- **Alternatives**: Puppeteer/Playwright (heavier, install burden on server); `sips`/ImageMagick resize (macOS-only or extra tool, blurry, stretches aspect); `node-canvas`/`sharp` (cannot render HTML/CSS).

## Decision 2: Apple artwork is a strip on a `storeCard` pass
- **Decision**: Output `strip.png`, `strip@2x.png`, `strip@3x.png` (375x144, 750x288, 1125x432, the store card strip size; to be confirmed on a device) and `pass.json` with a `storeCard` block.
- **Rationale**: Apple only displays `background.png` on event tickets and blurs it, which ruins the icon row. A strip is shown sharp. Matches the prototype in `models/membership-updated.pass`.
- **Alternatives**: `eventTicket` with blurred background (rejected, blur); keep `generic` with colour only (rejected, loses the artwork).

## Decision 3: Hide the descriptive label at render time
- **Decision**: Inject CSS (`.cardLabel{display:none}`, strip layout rules) into a temporary copy of the HTML before rendering. The source HTML is never modified.
- **Rationale**: Designers keep the label in the HTML preview; the wallet pass supplies its own text (FR-004). A temp copy keeps the source clean and the result reproducible.
- **Alternatives**: Require designers to remove the label (error-prone); strip it with regex from the source (fragile).

## Decision 4: Colors come from CSS custom properties in the design
- **Decision**: Read `--red` (card background) and `--gold` (labels) from `:root`; fail with a clear message if the background variable is missing. Foreground is white unless `--fg` is defined.
- **Rationale**: Both existing files already define them (`corporate_card.html`: `#9d1d1d`/`#dfab3c`; `family_card.html`: `#139038`/`#dfab3c`). Satisfies the "report rather than guess" edge case.
- **Alternatives**: Sample pixel colors from the render (can hit gradients/overlays); hard-code per design (breaks FR-009).

## Decision 5: No signing files, clean copy of base files
- **Decision**: Copy only `icon*.png` and `logo*.png` from `models/membership.pass`, write fresh `pass.json` and strip images, then write `manifest.json` (SHA1) and a `signature` with `openssl smime -binary -sign ... -outform DER` (the manual workflow). Stale manifest/signature files from the base model are never copied.
- **Rationale**: `passkit-generator` ignores them (`getModelFolderContents.js`) and regenerates them with the signer certificates at issue time (FR-005).

## Decision 6: Google class definition derived from the existing class shape
- **Decision**: Build the `genericClass` JSON from the structure already used in `services/googlePassService.js` (row templates, issuer name), with `id = <issuerId>.membership_<name>` (only valid GenericClass fields: `id`, `classTemplateInfo`). Background color and image references go into a separate `look.json` because Google keeps them on each object. Generate `hero.png` (1032x336) and `logo.png` (660x660) via the same renderer. Output to `wallet_assets/google/<name>/`.
- **Rationale**: Keeps the class compatible with the object-creation code. Google's hero recommendation is 1032x336 and logo is a square image shown in a circle. Publishing images to a public URL and registering the class are separate steps (assumption in spec).
- **Alternatives**: Calling the Google Wallet API directly from the script (needs credentials, out of scope); embedding images as data URIs (not allowed by Google, needs a public URL).

## Decision 7: Safe, idempotent writes
- **Decision**: Render into a temp directory, validate expected files exist, then replace the output folder contents; on any failure delete the temp directory and leave existing output untouched.
- **Rationale**: Meets FR-010 and FR-011.

## Resolved unknowns
None remained; no NEEDS CLARIFICATION items.
