# Implementation Plan: Wallet Card Asset Generators

**Branch**: `018-wallet-card-generators` | **Date**: 2026-11-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/018-wallet-card-generators/spec.md`

## Summary

Two independent Node CLI scripts read a card design (`<name>.html` in the repo root) and emit wallet assets. The Apple script renders a full-width strip image at 1x/2x/3x with headless Chrome, copies logo/icon images and writes a `storeCard` `pass.json` with colors taken from the design, into `models/<name>.pass/`. The Google script renders the hero and logo images and writes the `genericClass` JSON. Both share one small renderer module, hide the descriptive label at render time (the HTML file is never edited), and write no signing files. See [research.md](research.md) for the decisions.

## Technical Context

**Language/Version**: Node.js (project's existing runtime, CommonJS)

**Primary Dependencies**: Existing `passkit-generator` (consumes the output, unchanged). No new npm dependency: the renderer spawns the locally installed Chrome/Chromium in headless mode.

**Storage**: Files only. `models/<name>.pass/` (Apple) and `wallet_assets/google/<name>/` (Google).

**Testing**: Node built-in test runner (`node --test`) for the pure functions (design parsing, pass.json and class builders, sizes), plus the manual checks in [quickstart.md](quickstart.md) for rendering and Wallet acceptance.

**Target Platform**: Developer machine (macOS first; Linux works if Chrome path is given via `CHROME_PATH`).

**Project Type**: CLI scripts inside an existing Express web-service repo.

**Performance Goals**: Each command finishes in under 1 minute (SC-001, SC-002); expected a few seconds.

**Constraints**: Idempotent output; no partial output on failure; no manifest/signature written; live pass flow untouched.

**Scale/Scope**: 2 designs now; each additional design is one HTML file.

## Constitution Check

`.specify/memory/constitution.md` is still the unfilled template, so there are no ratified principles to gate against. Self-imposed checks, all passing:

- Existing pass flow unchanged (FR-012): the scripts only add files.
- No new runtime dependency.
- No secrets handled; Google credentials are not needed to generate the class JSON.

Post-design re-check: still passing.

## Project Structure

### Documentation (this feature)

```text
specs/018-wallet-card-generators/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cli.md
│   └── design-html.md
├── checklists/requirements.md
└── tasks.md             # created later by /speckit-tasks
```

### Source Code (repository root)

```text
scripts/wallet/
├── generate-apple-pass.js     # CLI: node scripts/wallet/generate-apple-pass.js <design>
├── generate-google-class.js   # CLI: node scripts/wallet/generate-google-class.js <design>
└── lib/
    ├── args.js                # tiny argv parser
    ├── atomicOutput.js        # temp dir + swap, no partial output
    ├── design.js              # locate/validate HTML, extract colors, list designs
    ├── render.js              # headless Chrome screenshot at given size/scale
    ├── applePass.js           # build pass.json, asset sizes
    └── googleClass.js         # build genericClass JSON, asset sizes

tests/wallet/
├── design.test.js
├── applePass.test.js
└── googleClass.test.js

models/<name>.pass/            # generated (Apple)
wallet_assets/google/<name>/   # generated (Google): class.json, hero.png, logo.png
```

**Structure Decision**: Single-project layout. Scripts live in `scripts/wallet/` with a shared `lib/`; generated output goes to `models/` (where the pass service already reads) and a new `wallet_assets/` folder for Google.

## Complexity Tracking

No violations.
