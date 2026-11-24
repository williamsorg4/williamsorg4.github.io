# William Sorg — personal site

A single hand-built page: plain HTML, CSS and JavaScript. No framework, no build step, no tracking.

```
index.html            the whole page
css/style.css         all styles (colors and spacing are tokens at the top)
js/main.js            hero figure rotation, project index, photo carousel, game-day easter egg
art/                  hero figures (SVG) — one is picked at random on each visit
tools/generate_art.py regenerates the figures in art/
projects/             preview images for the Index of work (shown on hover)
photos/               images for the "Off the clock" carousel
cv/                   william-sorg-cv.pdf (placeholder — replace with the real one)
assets/               self-hosted fonts (Crimson Text, Inter — SIL OFL) and favicon
```

## Preview locally (Ubuntu)

```bash
cd ~/projects/william-sorg-site
python3 -m http.server 8000
# open http://localhost:8000
```

Use a local server rather than opening `index.html` directly: the hero figures are loaded with `fetch`, which browsers block on `file://` (the page still works, just without the figure animation).

Easter egg preview: `http://localhost:8000/?gameday=1` (every M becomes a scarlet X — it turns on by itself on Saturdays, September through mid-January).

## Publish on GitHub Pages (one time)

1. Create an empty **public** repo on GitHub. Naming it `YOUR-USERNAME.github.io` gives you the address `https://YOUR-USERNAME.github.io`; any other name gives `https://YOUR-USERNAME.github.io/REPO-NAME/`.
2. From this folder:
   ```bash
   git init -b main
   git add .
   git commit -m "Initial site"
   git remote add origin git@github.com:YOUR-USERNAME/YOUR-REPO.git   # or the https URL
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save.** The site is live a minute or two later.

After that, every `git push` to `main` updates the site. (A custom domain can be added later under the same Pages settings.)

## Filling in placeholders

Search the code for these:

| What | Where |
|---|---|
| Projects (title, tags, year, link, preview) | `<ol class="projects">` in `index.html`; preview images in `projects/` (about 460×580) |
| Past roles and years | `.roles` section in `index.html` (`— role, years`) |
| CV | replace `cv/william-sorg-cv.pdf`, same filename |
| Photos and captions | `.carousel` in `index.html`; images in `photos/` (JPG/WebP, about 1200px tall, under ~300 KB) |
| Strava, Letterboxd, Beli, Instagram | `.elsewhere` paragraph (`YOUR-...` URLs) |
| Email, LinkedIn, GitHub | `<footer>` (`you@example.com`, `YOUR-...`) |

The project numbering (№ 001/006) and the entry count are generated automatically.

## Adding a hero figure

1. Make an SVG in the house style: ink `#111`, one accent in Ohio State scarlet `#BA0C2F`, thin strokes, lots of space, off-white `#fafaf7` background left transparent.
2. Save it to `art/`.
3. Add it to the `FIGURES` list at the top of `js/main.js` with a one-line caption.

Optional load animations: give elements `class="walk"` with `pathLength="1"` (line draws itself), `class="ball"` / `class="bar"` with `style="--i:N"` (staggered entrance), or `class="late"` (fades in last).

The Boston profile is currently stylised; to use your real course, export the GPX from Strava and replace `KEY` in `tools/generate_art.py`.
