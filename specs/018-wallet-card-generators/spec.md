# Feature Specification: Wallet Card Asset Generators

**Feature Branch**: `018-wallet-card-generators`

**Created**: 2026-11-19

**Status**: Draft

**Input**: User description: "Scripts that generate wallet card assets from the HTML card designs in the repo root (corporate_card.html and family_card.html; red_card.html was the earlier prototype). (1) An Apple script that renders a card HTML design into the Apple Wallet .pass model assets (background/strip images at 1x/2x/3x, pass.json colors, no 'Corporate Card' label baked in) in a models/<name>.pass folder, leaving signing to passkit-generator at runtime. (2) A separate Google Wallet script that generates the genericClass definition (and hero/logo images) for the new design. Two card types are supported now: corporate_card and family_card, and adding a new type should only need a new HTML file."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate an Apple Wallet pass model from a card design (Priority: P1)

A developer or designer updates a card design in an HTML file in the repo root and runs one command naming that design. The command produces a ready-to-use Apple pass model folder under `models/` whose artwork matches the HTML design, so the existing pass service can issue member cards with the new look without hand-editing images.

**Why this priority**: Apple passes are the primary member card today and the artwork is currently produced by hand (screenshots, resizing, copying files). Automating this is the core value.

**Independent Test**: Run the Apple command for `corporate_card` and `family_card`; confirm each produces a model folder, then issue a test pass from each and confirm it opens in Wallet showing the design.

**Acceptance Scenarios**:

1. **Given** `corporate_card.html` exists in the repo root, **When** the developer runs the Apple generator for `corporate_card`, **Then** a `models/<name>.pass/` folder is created containing the card artwork at 1x, 2x and 3x resolutions, the logo and icon images, and a `pass.json` whose colors match the design.
2. **Given** a design contains a descriptive label such as "Corporate Card", **When** the pass artwork is generated, **Then** that label is not part of the artwork, so the pass can show its own text.
3. **Given** the model folder already exists, **When** the generator is run again, **Then** the folder is regenerated with the same artwork and colors, and any stale files (such as an old signature or manifest) are removed.
4. **Given** a generated model, **When** a pass is issued from it, **Then** the folder also contains a `manifest.json` (SHA1 of every file) and a `signature` made with the signing certificate, and issuing a pass still works because signing is repeated at issue time. With an expired certificate the command stops with a clear message (or can be run with `--no-sign`).

---

### User Story 2 - Generate a Google Wallet generic class from a card design (Priority: P2)

A developer runs a separate command for a card design and gets the Google Wallet generic class definition and its images (logo and hero) for that design, ready to register with Google Wallet, so Android members get the same look as Apple members.

**Why this priority**: Gives Android parity, but Apple is the main channel and this builds on the same designs.

**Independent Test**: Run the Google command for `family_card`; confirm it produces a class definition and images, and that the definition is accepted by Google Wallet when registered.

**Acceptance Scenarios**:

1. **Given** `family_card.html` exists, **When** the developer runs the Google generator for `family_card`, **Then** a generic class definition and hero and logo images matching the design are produced.
2. **Given** the generator has run, **When** the class is registered with Google Wallet, **Then** it is accepted without validation errors and a pass of that class shows the design. (Registering the class is a manual follow-up; the generator output is checked against the GenericClass structure.)
3. **Given** the Apple generator has not been run, **When** the Google generator is run, **Then** it still works (the two commands are independent).

---

### User Story 3 - Add a new card type by adding one HTML file (Priority: P3)

A designer adds a new card design HTML file following the same conventions and both generators can produce assets for it with no code changes.

**Why this priority**: Keeps future card types cheap, but only matters once the two existing types work.

**Independent Test**: Copy `family_card.html` to a new name with different colors, run both generators for it, and confirm assets reflect the new colors.

**Acceptance Scenarios**:

1. **Given** a new HTML design in the repo root, **When** either generator is run with its name, **Then** assets are produced without modifying any script.
2. **Given** a name with no matching HTML file, **When** a generator is run, **Then** it stops with a clear message naming the missing file and the available designs.

---

### Edge Cases

- Design file missing, unreadable, or not valid HTML: clear error, no partial output left behind.
- Design lacks a recognizable background color: generator reports it rather than guessing silently.
- Output folder exists with extra files (for example the old `signature` or `manifest.json`): stale signing files are not copied into the model.
- Image dimensions differ from what the wallet requires: output is always produced at the exact required sizes.
- Browser or renderer needed for rendering is unavailable: clear message on what is missing.
- Google class identifier already exists in Google Wallet: the generator works offline, so it prints the class id and leaves create-or-update to the person registering it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an Apple command that takes a card design name and produces a pass model folder under `models/` from the matching HTML file in the repo root.
- **FR-002**: The Apple command MUST render the design's artwork at 1x, 2x and 3x resolutions at the sizes Apple Wallet requires, including the logo and icon images.
- **FR-003**: The Apple command MUST set the pass colors (background, foreground, label) from the design.
- **FR-004**: Descriptive labels in the design (such as "Corporate Card") MUST NOT appear in the generated artwork.
- **FR-005**: The Apple command MUST write `manifest.json` and a `signature` for the model (SHA1 manifest, PKCS#7 signature with the certificates in `certs/`), MUST refuse to sign with an expired certificate unless told otherwise, and MUST offer a way to skip signing.
- **FR-006**: The system MUST provide a separate Google command that takes a card design name and produces a Google Wallet generic class definition for it.
- **FR-007**: The Google command MUST also produce the hero and logo images for the class, at the sizes Google Wallet requires.
- **FR-008**: The two commands MUST be runnable independently of each other.
- **FR-009**: Both commands MUST support `corporate_card` and `family_card`, and any additional design added as a conforming HTML file, without code changes.
- **FR-010**: Both commands MUST fail with a clear, actionable message when the design is missing or invalid, and MUST NOT leave partial output.
- **FR-011**: Re-running a command MUST be safe and produce the same output for the same design.
- **FR-012**: Existing pass models and the issuing flow MUST keep working until a design is explicitly switched to a generated model.

### Key Entities

- **Card Design**: An HTML file in the repo root defining one card look (colors, icon set, brand mark). Identified by its file name without the extension.
- **Apple Pass Model**: The folder under `models/` holding the artwork, images and base definition that the issuing flow uses to create member passes.
- **Google Generic Class**: The Google Wallet class definition and its hero and logo images for one card design.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A card design can go from edited HTML to a usable Apple pass model with a single command in under 1 minute.
- **SC-002**: A card design can go from edited HTML to a Google class definition with images with a single command in under 1 minute.
- **SC-003**: 100% of passes issued from generated models open in Apple Wallet without being rejected.
- **SC-004**: A new card type is produced for both wallets by adding one HTML file and running the two commands, with no code changes.
- **SC-005**: Generated artwork matches the HTML design on visual review for both existing types, with no stray labels.

## Assumptions

- The design HTML files live in the repo root and follow the existing red card structure (background color, icon row, GEC badge).
- Apple artwork uses a full-width strip image on a store-card style pass, as already prototyped in `models/membership-updated.pass`, because Apple only shows the background image on event tickets and blurs it.
- A locally installed Chrome or Chromium is available for rendering.
- Google Wallet credentials and the registering of the class are handled by existing or manual steps; this feature produces the definition and images.
- Switching the live pass flow to a generated model is a separate follow-up from generating it.
- `red_card.html` is the earlier prototype and is not a supported card type.
