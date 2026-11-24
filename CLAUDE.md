# Notes for Claude Code

William Sorg's personal homepage: one static page on GitHub Pages. Statistics & math senior at Ohio State, applying to PhD programs, aiming at sports analytics. The audience is admissions committees and analytics employers, so the site should read as clean and serious, with personality coming through in the wit and the artwork.

## Design rules (keep these)
- Minimal and gallery-like, inspired by heydonworks.com and getcoleman.com, with a project index modeled on wodniack.dev. Avoid cards, pills, shadows, rounded boxes, gradients, and dashboard or template styling.
- Colors: background `#fafaf7`, ink `#111`, grey `#8b8b86`, with one accent only, Ohio State scarlet `#BA0C2F`. Don't add new colors.
- Type: Crimson Text (serif) for everything readable, and Inter at 12px only for small labels (`.small`). Fonts are self-hosted in `assets/fonts/`, so never link Google Fonts.
- Hero figures are original statistical artwork in thin ink lines with a single scarlet accent and a dry one-line caption ("Fig. 1 — ..."). Redraw William's real figures from their data in this style. Don't paste screenshots.

## Tech rules
- Plain HTML/CSS/JS, with no framework, bundler, or npm dependencies, and no analytics or tracking.
- Everything has to work when served statically from the repo root (GitHub Pages, `.nojekyll` present).
- Respect `prefers-reduced-motion`, keep the semantic HTML and alt text, and keep the mobile layout working (check at 390px).
- Easter egg: on Saturdays from September through Jan 20, `crossOutMs()` in `js/main.js` replaces every M and m with a scarlet X or x. Screen readers still get the original text. Preview it with `?gameday=1`.

## Workflow
- Preview with `python3 -m http.server 8000`.
- Commit with clear messages. Pushing to `main` deploys the site.
