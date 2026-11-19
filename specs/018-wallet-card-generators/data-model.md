# Data Model: Wallet Card Asset Generators

## Card Design
| Field | Source | Rule |
|-------|--------|------|
| name | HTML file name without `.html` | `[a-z0-9_-]+`; file must exist in repo root |
| backgroundColor | `--red` in `:root` | Required, hex color |
| accentColor | `--gold` in `:root` | Required, hex color |
| foregroundColor | `--fg` in `:root` | Optional, default `#ffffff` |
| label | `.cardLabel` text | Optional; removed from artwork |

Invariant: designs are listed by scanning the repo root for `*_card.html`.

## Apple Pass Model (output)
`models/<name>.pass/`
- `pass.json`: `storeCard` pass, colors as `rgb(r,g,b)`, `organizationName` "German Emirates Club"
- `strip.png`, `strip@2x.png`, `strip@3x.png`: 375x144, 750x288, 1125x432
- `icon.png`, `icon@2x.png`, `logo.png`, `logo@2x.png`: copied from the base model
- `manifest.json` (SHA1 per file) and `signature` (DER PKCS#7 of the manifest), unless `--no-sign` is used

## Google Generic Class (output)
`wallet_assets/google/<name>/`
- `class.json`: GenericClass resource: `id` and `classTemplateInfo` only (Google keeps colors and images on each object, not on the class)
- `look.json`: `classId`, `issuerName`, `hexBackgroundColor`, `heroImageFile`, `logoFile` for creating objects of this class
- `hero.png`: 1032x336
- `logo.png`: 660x660

## State
Stateless. Re-running replaces output atomically; failure leaves previous output intact.
