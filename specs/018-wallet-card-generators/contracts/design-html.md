# Design HTML Contract

A conforming `<name>_card.html` in the repo root:
- Defines `--red` (card background) and `--gold` (accent) in `:root`.
- Has a `.card` element containing the artwork and an `.icons` row.
- May contain a `.cardLabel` element; it is hidden when rendering assets.
- Is self-contained (inline CSS and SVG, no remote assets).

Existing conforming files: `corporate_card.html`, `family_card.html`. `red_card.html` is a legacy prototype and not listed.
