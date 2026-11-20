---

description: "Task list for Wallet Card Asset Generators"
---

# Tasks: Wallet Card Asset Generators

**Input**: Design documents from `/specs/018-wallet-card-generators/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli.md, contracts/design-html.md, quickstart.md

**Tests**: The plan lists unit tests for the pure functions (design parsing, `pass.json` and class builders, sizes) using Node's built-in runner. Rendering and Wallet acceptance are verified manually per `quickstart.md`.

**Organization**: Tasks are grouped by user story so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 = Apple pass model, US2 = Google generic class, US3 = new card type from one HTML file
- All paths are relative to the repo root

## Path Conventions

- Scripts: `scripts/wallet/` with shared helpers in `scripts/wallet/lib/`
- Tests: `tests/wallet/`
- Apple output: `models/<name>.pass/`
- Google output: `wallet_assets/google/<name>/`
- Design inputs: `<name>_card.html` in the repo root (`corporate_card.html`, `family_card.html`)

---

## Phase 1: Setup

**Purpose**: Folder layout and confirmation that the existing designs follow the contract

- [X] T001 Create the folders `scripts/wallet/lib/`, `tests/wallet/fixtures/` and `wallet_assets/google/` (add a `.gitkeep` in `wallet_assets/google/`)
- [X] T002 Check that `corporate_card.html` and `family_card.html` satisfy `specs/018-wallet-card-generators/contracts/design-html.md` (`--red` and `--gold` in `:root`, `.card`, `.icons`, `.cardLabel`, `.box.gec`, no remote assets). Fix only what is missing in those two files and do not change their look

---

## Phase 2: Foundational (blocks all user stories)

**Purpose**: Shared helpers used by both generators

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Write `tests/wallet/design.test.js` using `node:test`: `listDesigns` returns only `*_card.html` files (excludes `red_card.html`), `loadDesign` returns `backgroundColor`, `accentColor` and `foregroundColor` (default `#ffffff`), and it throws clear errors for an invalid name, a missing file (message lists available designs) and a missing `--red` or `--gold`. Use small HTML fixtures written to a temp directory
- [X] T004 [P] Implement `scripts/wallet/lib/design.js` exporting `listDesigns(rootDir)` and `loadDesign(name, rootDir)`. Name must match `/^[a-z0-9_-]+$/`. Read `<rootDir>/<name>.html`, parse `--red`, `--gold` and optional `--fg` from the `:root` block, and return `{ name, file, html, backgroundColor, accentColor, foregroundColor }`. Errors follow `specs/018-wallet-card-generators/contracts/cli.md` (message names the missing file and the available designs). Make T003 pass
- [X] T005 [P] Implement `scripts/wallet/lib/render.js` exporting `findChrome()` and `renderDesign(design, mode, scale, outFile)`. `findChrome` uses `CHROME_PATH`, then the macOS Chrome path, then `google-chrome`, `chromium` and `chromium-browser` on PATH, and throws a message mentioning `CHROME_PATH` when none exists. `renderDesign` writes a temporary copy of the HTML with injected CSS (the source file is never modified) that hides `.cardLabel` and applies a layout for the mode: `strip` 375x144 (card flattened to square corners, icon row vertically centered, no glow or border radius), `hero` 1032x336 (icon row scaled to fit), `logo` 660x660 (only the `.gec` badge centered on the design background color). It then runs headless Chrome with `--headless=new --hide-scrollbars --force-device-scale-factor=<scale> --window-size=<w>,<h> --screenshot=<outFile>`, and cleans up the temporary copy even on failure
- [X] T006 [P] Implement `scripts/wallet/lib/atomicOutput.js` exporting `withTempOutput(outDir, buildFn)`. It creates a temp directory next to `outDir`, calls `buildFn(tempDir)`, checks the directory is non-empty, then replaces `outDir` with it (keeping nothing stale). On any error it deletes the temp directory and leaves any existing `outDir` untouched. Add `atomicOutput.js` to the source tree listed in `specs/018-wallet-card-generators/plan.md`

**Checkpoint**: Design parsing, rendering and safe output are available to both generators

---

## Phase 3: User Story 1 - Apple Wallet pass model from a card design (Priority: P1) MVP

**Goal**: One command turns a design HTML file into a usable `models/<name>.pass/` folder with no label in the artwork and no signing files

**Independent Test**: Run the command for `corporate_card` and `family_card`, inspect the folders, issue a test pass from each model and confirm it is accepted (`quickstart.md` steps 1 and 2)

### Implementation for User Story 1

- [X] T007 [P] [US1] Write `tests/wallet/applePass.test.js`: `ASSET_SIZES` is 375x144, 750x288 and 1125x432 for `strip`, `strip@2x` and `strip@3x`; `hexToRgb("#9d1d1d")` gives `rgb(157, 29, 29)`; `buildPassJson(design, baseJson)` returns a `storeCard` block (empty `primaryFields`, `secondaryFields`, `auxiliaryFields`, `backFields`), copies `passTypeIdentifier` and `teamIdentifier` from the base, sets `organizationName` to `German Emirates Club`, and sets `backgroundColor`, `labelColor` (accent) and `foregroundColor` from the design; the result has no `generic` key
- [X] T008 [P] [US1] Implement `scripts/wallet/lib/applePass.js` exporting `ASSET_SIZES`, `hexToRgb` and `buildPassJson`. Make T007 pass
- [X] T009 [US1] Implement `scripts/wallet/generate-apple-pass.js` per `contracts/cli.md`: parse `<design>`, `--out` (default `models/<design>.pass`), `--base` (default `models/membership.pass`) and `--root` (default repo root, used by tests). Load the design (T004), then inside `withTempOutput` (T006) render the strip at scale 1, 2 and 3 to `strip.png`, `strip@2x.png` and `strip@3x.png` (T005), copy only `icon.png`, `icon@2x.png`, `logo.png` and `logo@2x.png` from the base model, write `pass.json` built from the base `pass.json` (T008), and never copy `manifest.json` or `signature`. Print the written files, exit 1 with the contract's messages on failure
- [X] T010 [US1] Run the command for `corporate_card` and `family_card` to generate `models/corporate_card.pass/` and `models/family_card.pass/`. Open each `strip@2x.png` and confirm the correct background color (`#9d1d1d` and `#139038`), gold icons, GEC badge, no "Corporate Card" or "Family Membership Card" text, and the exact pixel sizes (`sips -g pixelWidth -g pixelHeight`)
- [X] T011 [US1] Verify issuing from a generated model without changing `services/applePassService.js`: use a throwaway script outside the repo tree (for example in the scratchpad) that calls `PKPass.from({ model: "models/family_card.pass", certificates })`, adds a name field and barcode, writes a `.pkpass`, then unzip it and confirm `manifest.json` and `signature` were created and `openssl smime -verify -inform DER -in signature -content manifest.json -noverify` succeeds

**Checkpoint**: User Story 1 works and is verifiable on its own (MVP)

---

## Phase 4: User Story 2 - Google Wallet generic class from a card design (Priority: P2)

**Goal**: A separate command produces the generic class JSON plus hero and logo images for a design

**Independent Test**: Run the command for `family_card` without running the Apple command, check the three files and their sizes, and confirm the JSON matches the class shape accepted by `services/googlePassService.js` (`quickstart.md` step 3)

### Implementation for User Story 2

- [X] T012 [P] [US2] Write `tests/wallet/googleClass.test.js`: `GOOGLE_SIZES` is hero 1032x336 and logo 660x660; `buildClass(design, { issuerId })` returns `id` of `<issuerId>.membership_<name>` and a `classTemplateInfo.cardTemplateOverride.cardRowTemplateInfos` with two `twoItems` rows using the field paths `cardnumber`, `partner`, `expiry` and `serialNumber` (same as the class in `services/googlePassService.js`); the issuer id defaults to the id used in `services/googlePassService.js` and can be overridden with `--issuer`
- [X] T013 [P] [US2] Implement `scripts/wallet/lib/googleClass.js` exporting `GOOGLE_SIZES` and `buildClass`. Copy the row-template structure from `services/googlePassService.js` (the `genericClass` object around lines 65-120) without importing that module, because it has side effects at load time. Make T012 pass
- [X] T014 [US2] Implement `scripts/wallet/generate-google-class.js` per `contracts/cli.md`: parse `<design>`, `--out` (default `wallet_assets/google/<design>`), `--issuer` and `--root`. Load the design (T004), then inside `withTempOutput` (T006) render `hero.png` (1032x336 at scale 1) and `logo.png` (660x660 at scale 1) using T005, and write `class.json` from `buildClass` (T013). Print the class id and the reminder that images must be hosted at a public URL before the class is registered. It must not import or call the Apple script
- [X] T015 [US2] Run the command for `corporate_card` and `family_card`. Confirm each folder has `class.json`, `hero.png` and `logo.png` at the exact sizes, that `hexBackgroundColor` matches the design, that the label text is absent from the hero, and that `class.json` parses as JSON

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - New card type with only one HTML file (Priority: P3)

**Goal**: Adding a design file needs no code changes, and wrong input gives clear help

**Independent Test**: Copy `family_card.html` to `blue_card.html` with a different `--red`, run both commands, confirm the new color appears and no script was edited (`quickstart.md` step 4)

### Implementation for User Story 3

- [X] T016 [US3] Add `tests/wallet/fixtures/blue_card.html` (a minimal conforming design with a blue `--red`) and `tests/wallet/newDesign.test.js`. The test runs `generate-apple-pass.js` and `generate-google-class.js` with `--root tests/wallet/fixtures` and `--out` pointing at a temp directory, then asserts that `pass.json` has the blue background as rgb, `class.json` has the blue hex, and no `manifest.json` or `signature` exists. Skip the test with a clear message when Chrome is not found
- [X] T017 [US3] In `scripts/wallet/generate-apple-pass.js` and `scripts/wallet/generate-google-class.js`, make running with no argument or with `--list` print a usage line plus the designs from `listDesigns`, and make an unknown design exit 1 listing the available designs. Confirm a failed run leaves an existing output folder unchanged
- [X] T018 [US3] Manually confirm US3 end to end: copy `family_card.html` to a temporary `blue_card.html` in the repo root, change `--red`, run both commands, view the results, then delete the temporary files and generated output. No script file may change during this check (`git status` shows only the temporary files)

**Checkpoint**: All three user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 [P] Add npm scripts to `package.json`: `wallet:apple` (`node scripts/wallet/generate-apple-pass.js`), `wallet:google` (`node scripts/wallet/generate-google-class.js`) and `test:wallet` (`node --test tests/wallet`)
- [X] T020 [P] Write `descriptions/Wallet-Card-Generators.md` describing the two commands, the HTML design contract (`--red`, `--gold`, `.cardLabel`, `.icons`), where output goes, the `CHROME_PATH` variable, and that signing and switching the live pass flow are separate steps
- [X] T021 Run all checks from `specs/018-wallet-card-generators/quickstart.md` and `npm run test:wallet`; fix any failures
- [X] T022 Confirm FR-012: `git status` shows no changes to `services/applePassService.js`, `services/googlePassService.js` or the existing `models/membership.pass/`, `models/membership-updated.pass/` and `models/family-membership.pass/` folders

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Phase 1 and blocks every user story
- **User Stories (Phases 3-5)**: all depend on Phase 2. US1 and US2 are independent of each other. US3 builds on the CLIs from US1 and US2 (T009 and T014)
- **Polish (Phase 6)**: after the stories you want to ship

### Within Each Story

- Tests first (they fail), then the module, then the CLI, then generate and verify
- T009 needs T004, T005, T006 and T008. T014 needs T004, T005, T006 and T013
- T011 needs T010. T015 needs T014. T017 needs T009 and T014. T018 needs T017

### Parallel Opportunities

- Phase 2: T003, T004, T005 and T006 touch different files and can run together (T003 passes once T004 exists)
- US1 and US2 can run in parallel after Phase 2: T007 with T008, and T012 with T013
- Polish: T019 and T020

---

## Parallel Example: Foundational Phase

```text
Task: "Write tests/wallet/design.test.js"           (T003)
Task: "Implement scripts/wallet/lib/design.js"      (T004)
Task: "Implement scripts/wallet/lib/render.js"      (T005)
Task: "Implement scripts/wallet/lib/atomicOutput.js" (T006)
```

## Parallel Example: User Stories 1 and 2

```text
Developer A: T007, T008, then T009, T010, T011   (Apple)
Developer B: T012, T013, then T014, T015         (Google)
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 (Setup), then Phase 2 (Foundational)
2. Phase 3 (US1): Apple model generation
3. Stop and validate: issue a pass from `models/family_card.pass` and open it in Wallet
4. Switching the live pass service to a generated model is a separate follow-up

### Incremental Delivery

1. Setup and Foundational give the shared helpers
2. Add US1 for Apple, validate, demo
3. Add US2 for Google, validate, demo
4. Add US3 for the no-code new design check and the error handling
5. Polish: npm scripts, documentation, final checks

---

## Notes

- Rendering uses the locally installed Chrome (no new npm dependency); see `research.md` decision 1
- Source HTML files are never rewritten by the generators; the label is hidden in a temporary copy
- Commit after each task or logical group, and do not commit the temporary `blue_card.html` from T018

---

## Implementation Notes (deviations found while building)

- **Strip height**: 144 pt (375x144, 750x288, 1125x432), the store card strip size, instead of the 98 pt prototype. Confirm on a device. The name field of a store card is drawn over the strip, so check that it does not clash with the icon row.
- **Google class**: `class.json` holds only valid GenericClass fields (`id`, `classTemplateInfo`). Colors and image names are in a new `look.json`, because Google keeps them on each object. The issuer id is a flag, not a new environment variable.
- **Output folder**: it is regenerated as a whole (stale signing files are removed), and the spec wording was updated to match.
- **Extra files**: `scripts/wallet/lib/args.js` and `atomicOutput.js` were added to the plan's tree.
- **Test command**: `node --test tests/wallet/*.test.js` (Node 22 does not accept a bare directory).
- **T018** was done with the `tests/wallet/fixtures/blue_card.html` fixture and `--root`, so the repo root stays clean.
