/* William Sorg — site script. No dependencies, no tracking. */

/* ── 1. Hero figures ──────────────────────────────────────────
   One is picked at random on each visit (never the same twice in a row).
   To add a figure: put an SVG in art/ and add an entry here.
   `wide: true` gives landscape figures a little more room;
   `init` runs once the SVG is inlined (e.g. a scripted entrance).
   Force one with ?fig=<id>, e.g. ?fig=bogota.                      */
const FIGURES = [
  { id: "galton", src: "art/galton.svg",          caption: "900 small decisions, one bell curve. The red one is me." },
  { id: "walk",   src: "art/random-walk.svg",     caption: "A random walk, five thousand steps so far. The next one is a PhD.", cls: "walk-art" },
  { id: "hill",   src: "art/boston-marathon-map.svg", caption: "Boston, mile 0 to 26.2. Everything worth doing has a hill around mile 20.", wide: true, cls: "boston-art", init: drawBoston },
  { id: "bogota", src: "art/bogota-jobs.svg",     caption: "Job density in Bogotá.", cls: "map-art" },
];

/* ── 2. Game day ──────────────────────────────────────────────
   On Saturdays in football season every M becomes a scarlet X.
   Preview any day with ?gameday=1 ; turn it off with ?gameday=0.   */
function isGameDay(now = new Date()) {
  const q = new URLSearchParams(location.search).get("gameday");
  if (q !== null) return q === "1";
  const m = now.getMonth(), d = now.getDate();           // 0 = Jan
  const inSeason = m >= 8 || (m === 0 && d <= 20);       // Sep – Dec, plus bowls & playoff into mid-Jan
  return now.getDay() === 6 && inSeason;
}

function storage(key, value) {
  try {
    if (value === undefined) return sessionStorage.getItem(key);
    sessionStorage.setItem(key, value);
  } catch { return null; }
}

async function loadFigure() {
  const host = document.getElementById("art");
  const cap = document.getElementById("caption");
  if (!host) return;
  const last = storage("fig");
  const pool = FIGURES.length > 1 ? FIGURES.filter(f => f.src !== last) : FIGURES;
  const forced = FIGURES.find(f => f.id === new URLSearchParams(location.search).get("fig"));
  const fig = forced || pool[Math.floor(Math.random() * pool.length)];
  storage("fig", fig.src);
  cap.textContent = fig.caption;
  host.closest(".hero-art").classList.toggle("wide", !!fig.wide);
  if (fig.cls) host.classList.add(fig.cls);
  try {
    const res = await fetch(fig.src);
    if (!res.ok) throw new Error(res.status);
    host.innerHTML = await res.text();             // inline so the load animation can run
    const svg = host.querySelector("svg");
    if (fig.init && svg) fig.init(svg);
  } catch {
    host.innerHTML = `<img src="${fig.src}" alt="">`; // e.g. opened from file:// — still shows, just no animation
  }
}

/* Boston course map: tracts fade in, then the course draws itself
   Hopkinton → hills → Boylston as one line, then the labels fade in
   (the fades and the hidden start state are CSS: .boston-art).
   The ink .route holds two subpaths, before and after the hills; it is
   split into two <path>s (path data copied as is) so each can be dashed
   on its own, the same way in every browser.                        */
function drawBoston(svg) {
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const route = svg.querySelector(".route"), hills = svg.querySelector(".hills");
  if (!route || !hills) return;
  const [before, after] = route.getAttribute("d").split(/(?=M)/).map(s => s.trim()).filter(Boolean);
  const pieces = [route, hills];
  if (after) {
    const rest = route.cloneNode();
    route.setAttribute("d", before);
    rest.setAttribute("d", after);
    route.after(rest);                              // keeps the paint order: ink under the scarlet hills
    pieces.push(rest);
  }
  const lens = pieces.map(p => p.getTotalLength());
  const total = lens.reduce((a, b) => a + b, 0);
  const DELAY = 400, DUR = 2200;                    // keep in step with .boston-art in css/style.css
  const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  const t0 = performance.now();
  const frame = now => {
    const t = Math.min(Math.max((now - t0 - DELAY) / DUR, 0), 1);
    let at = ease(t) * total;                       // distance drawn along the whole course
    pieces.forEach((p, i) => {
      const f = Math.min(Math.max(at / lens[i], 0), 1);
      at -= lens[i];
      p.style.strokeDashoffset = 1 - f;
      p.style.opacity = f > 0 ? 1 : 0;              // no stray round cap before a piece starts
    });
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function crossOutMs(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentElement;
      if (!p || p.closest("script,style,svg,noscript,.sr-only") || !/m/i.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const wrap = document.createElement("span");
    const sr = Object.assign(document.createElement("span"), { className: "sr-only", textContent: n.nodeValue });
    const vis = document.createElement("span");
    vis.setAttribute("aria-hidden", "true");
    // keep each word with an X in one unbreakable piece, so the X never strands on the line above
    for (const word of n.nodeValue.split(/(\s+)/)) {
      if (!/m/i.test(word)) { if (word) vis.append(word); continue; }
      const w = Object.assign(document.createElement("span"), { className: "ox-w" });
      for (const part of word.split(/([mM])/)) {
        if (part === "M" || part === "m") {
          w.append(Object.assign(document.createElement("span"), { className: "ox" }));  // drawn in CSS as a bold scarlet ❌
        } else if (part) w.append(part);
      }
      vis.append(w);
    }
    wrap.append(sr, vis);
    n.replaceWith(wrap);
  }
  document.title = document.title.replace(/m/gi, "X");
}

/* ── 3. Index of work ─────────────────────────────────────────
   Numbers entries (№ 001/006) and shows a preview that follows the cursor. */
function setupIndex() {
  const list = document.querySelector(".projects");
  if (!list) return;
  const items = [...list.querySelectorAll("a")];
  const pad = n => String(n).padStart(3, "0");
  items.forEach((a, i) => { a.querySelector(".code").textContent = `№ ${pad(i + 1)}/${pad(items.length)}`; });
  const label = document.querySelector(".count-label");
  if (label) label.textContent = `${String(items.length).padStart(2, "0")} entries`;

  const peek = document.querySelector(".peek");
  const section = list.closest(".index");
  if (!peek || !matchMedia("(hover: hover)").matches) return;
  items.forEach(a => {
    a.addEventListener("mouseenter", () => { peek.src = a.dataset.thumb; peek.classList.add("on"); });
    a.addEventListener("mouseleave", () => peek.classList.remove("on"));
  });
  section.addEventListener("mousemove", e => {
    const r = section.getBoundingClientRect();
    peek.style.left = `${e.clientX - r.left + 210}px`;
    peek.style.top = `${e.clientY - r.top}px`;
  });
}

/* ── 4. Photo carousel ────────────────────────────────────────
   Native horizontal scroll with snap; arrows, counter, and mouse drag.
   Loops seamlessly: a copy of the photos sits on each side of the real
   set, and once scrolling stops we jump (invisibly) back to the same
   photo in the middle set, so the first photo always follows the last. */
function setupCarousel() {
  const track = document.querySelector(".carousel");
  if (!track) return;
  const real = [...track.children];
  const n = real.length;
  const pos = document.querySelector(".off .pos");
  const prev = document.querySelector(".off .prev");
  const next = document.querySelector(".off .next");
  const pad = n => String(n).padStart(2, "0");

  // copies for the loop, hidden from screen readers (nothing in them is focusable)
  const copy = () => real.map(f => {
    const c = f.cloneNode(true);
    c.setAttribute("aria-hidden", "true");
    return c;
  });
  // pin each photo's size before copying, so copies match their originals exactly
  real.forEach((f, i) => { if (i % 3) f.classList.add(i % 3 === 1 ? "short" : "medium"); });
  track.prepend(...copy());
  track.append(...copy());
  track.classList.add("looped");
  const figs = [...track.children];                       // copies, real set, copies
  const x = i => figs[i].offsetLeft - figs[0].offsetLeft;  // scroll position of photo i
  const setWidth = () => x(n);                             // width of one full set

  const current = () => {
    const left = track.scrollLeft + 1;
    let idx = 0;
    figs.forEach((f, i) => { if (x(i) <= left) idx = i; });
    return idx;
  };
  // jump to the same photo in the middle set without animating
  const recenter = () => {
    const i = current();
    if (i >= n && i < 2 * n) return;
    const w = setWidth();
    track.scrollLeft += i < n ? w : -w;
  };
  const update = () => { pos.textContent = `${pad(current() % n + 1)} / ${pad(n)}`; };
  const go = d => {
    recenter();
    track.scrollTo({ left: x(current() + d), behavior: "smooth" });
  };
  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));
  track.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  });

  // recenter once scrolling settles (scrollend where supported, else a short pause)
  let settle;
  const settled = () => { if (!dragging) recenter(); };
  track.addEventListener("scroll", () => {
    requestAnimationFrame(update);
    clearTimeout(settle);
    if (!("onscrollend" in window)) settle = setTimeout(settled, 150);
  }, { passive: true });
  track.addEventListener("scrollend", settled);

  // start on the first real photo; keep it there as images load or the window resizes
  const home = () => { track.scrollLeft = x(n + current() % n); update(); };
  track.scrollLeft = setWidth();
  addEventListener("load", home);
  addEventListener("resize", home);

  // drag to scroll with a mouse (touch already scrolls natively).
  // The drag only starts once the mouse has moved a few px, so a plain click still opens the photo.
  let startX = 0, startLeft = 0, down = false, dragging = false;
  track.addEventListener("pointerdown", e => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    down = true; startX = e.clientX; startLeft = track.scrollLeft;
  });
  track.addEventListener("pointermove", e => {
    if (!down) return;
    if (!(e.buttons & 1)) { down = false; return; }       // released outside the window
    if (!dragging && Math.abs(e.clientX - startX) > 5) {
      dragging = true;
      track.classList.add("dragging"); track.setPointerCapture(e.pointerId);  // captured, so no click lands on a photo
    }
    if (dragging) track.scrollLeft = startLeft - (e.clientX - startX);
  });
  const end = () => {
    down = false;
    if (!dragging) return;
    dragging = false; track.classList.remove("dragging");
    go(0);  // settle onto the nearest photo
  };

  // click (or Enter on) a photo to enlarge it; closing leaves the carousel on the last photo viewed
  const box = setupLightbox(real, i => track.scrollTo({ left: x(n + i), behavior: "smooth" }));
  real.forEach(f => {
    const img = f.querySelector("img");
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.setAttribute("aria-haspopup", "dialog");
  });
  track.addEventListener("click", e => {
    const f = e.target.closest("figure");
    if (f && track.contains(f)) box.open(figs.indexOf(f) % n);
  });
  track.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("img")) {
      e.preventDefault();
      box.open(figs.indexOf(e.target.closest("figure")) % n);
    }
  });
  track.addEventListener("pointerup", end);
  track.addEventListener("pointercancel", end);
  update();
}

/* Lightbox: one photo at a time, full screen, caption below.
   ← → (buttons, arrow keys, or a swipe) cycle and wrap around; Esc, Close,
   or a click on the empty space closes it. Built on <dialog>, so focus is
   trapped while open and returns to the photo afterwards.           */
function setupLightbox(photos, onClose) {
  const n = photos.length;
  const pad = k => String(k).padStart(2, "0");
  const dlg = document.createElement("dialog");
  dlg.className = "lightbox";
  dlg.setAttribute("aria-label", "Photo viewer");
  dlg.innerHTML = `
    <div class="lb-bar"><span class="lb-pos"></span><button type="button" class="lb-close">Close</button></div>
    <button type="button" class="lb-prev" aria-label="Previous photo">←</button>
    <figure class="lb-fig"><img alt=""><figcaption></figcaption></figure>
    <button type="button" class="lb-next" aria-label="Next photo">→</button>`;
  document.body.append(dlg);
  const img = dlg.querySelector(".lb-fig img"), cap = dlg.querySelector("figcaption"), pos = dlg.querySelector(".lb-pos");
  const fig = dlg.querySelector(".lb-fig");
  let i = 0;

  const show = k => {
    i = (k + n) % n;
    const src = photos[i].querySelector("img"), text = photos[i].querySelector("figcaption");
    img.src = src.currentSrc || src.src;
    img.alt = src.alt;
    cap.innerHTML = text ? text.innerHTML : "";      // copies the caption as shown (game-day Xs included)
    pos.textContent = `${pad(i + 1)} / ${pad(n)}`;
    [i - 1, i + 1].forEach(j => { new Image().src = photos[(j + n) % n].querySelector("img").src; });  // preload neighbours
  };
  const open = k => { show(k); if (!dlg.open) dlg.showModal(); };

  dlg.querySelector(".lb-prev").addEventListener("click", () => show(i - 1));
  dlg.querySelector(".lb-next").addEventListener("click", () => show(i + 1));
  dlg.querySelector(".lb-close").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => { if (e.target === dlg || e.target === fig) dlg.close(); });
  dlg.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") { e.preventDefault(); show(i - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); show(i + 1); }
  });
  // swipe on touch screens
  let sx = null;
  dlg.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") sx = e.clientX; });
  dlg.addEventListener("pointerup", e => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
  });
  dlg.addEventListener("close", () => onClose(i));
  return { open };
}

/* ── 5. Crosshair cursor over the index ───────────────────────
   Thin scarlet crosshairs across the whole index with a live (x, y)
   readout, like reading a value off a plot. Mouse/trackpad only.   */
function setupCrosshair() {
  const section = document.querySelector(".projects");
  if (!section || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const h = Object.assign(document.createElement("li"), { className: "xh xh-h" });
  const v = Object.assign(document.createElement("li"), { className: "xh xh-v" });
  const dot = Object.assign(document.createElement("li"), { className: "xh-dot" });
  const out = Object.assign(document.createElement("li"), { className: "xh-out" });
  [h, v, dot, out].forEach(el => el.setAttribute("aria-hidden", "true"));
  section.append(h, v, dot, out);
  section.classList.add("has-xh");
  section.addEventListener("mousemove", e => {
    const r = section.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    h.style.transform = `translateY(${y}px)`;
    v.style.transform = `translateX(${x}px)`;
    dot.style.transform = out.style.transform = `translate(${x}px, ${y}px)`;
    out.textContent = `(${(x / r.width).toFixed(2)}, ${(1 - y / r.height).toFixed(2)})`;
    section.classList.add("xh-on");
  });
  section.addEventListener("mouseleave", () => section.classList.remove("xh-on"));
}

document.addEventListener("DOMContentLoaded", async () => {
  setupIndex();
  setupCrosshair();
  setupCarousel();
  await loadFigure();
  if (isGameDay()) crossOutMs();
});
