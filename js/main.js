/* William Sorg — site script. No dependencies, no tracking. */

/* ── 1. Hero figures ──────────────────────────────────────────
   One is picked at random on each visit (never the same twice in a row).
   To add a figure: put an SVG in art/ and add an entry here.
   `wide: true` gives landscape figures a little more room.         */
const FIGURES = [
  { src: "art/galton.svg",          caption: "900 small decisions, one bell curve. The red one is me." },
  { src: "art/random-walk.svg",     caption: "A random walk, five thousand steps so far. The next one is a PhD.", cls: "walk-art" },
  { src: "art/heartbreak-hill.svg", caption: "Boston, mile 0 to 26.2. Everything worth doing has a hill around mile 20.", wide: true },
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
  const fig = pool[Math.floor(Math.random() * pool.length)];
  storage("fig", fig.src);
  cap.textContent = fig.caption;
  host.closest(".hero-art").classList.toggle("wide", !!fig.wide);
  if (fig.cls) host.classList.add(fig.cls);
  try {
    const res = await fetch(fig.src);
    if (!res.ok) throw new Error(res.status);
    host.innerHTML = await res.text();             // inline so the load animation can run
  } catch {
    host.innerHTML = `<img src="${fig.src}" alt="">`; // e.g. opened from file:// — still shows, just no animation
  }
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
    for (const part of n.nodeValue.split(/([mM])/)) {
      if (part === "M" || part === "m") {
        vis.append(Object.assign(document.createElement("span"), { className: "ox", textContent: part === "M" ? "X" : "x" }));
      } else if (part) vis.append(part);
    }
    wrap.append(sr, vis);
    n.replaceWith(wrap);
  }
  document.title = document.title.replace(/M/g, "X").replace(/m/g, "x");
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

  // drag to scroll with a mouse (touch already scrolls natively)
  let startX = 0, startLeft = 0, dragging = false;
  track.addEventListener("pointerdown", e => {
    if (e.pointerType !== "mouse") return;
    dragging = true; startX = e.clientX; startLeft = track.scrollLeft;
    track.classList.add("dragging"); track.setPointerCapture(e.pointerId);
  });
  track.addEventListener("pointermove", e => { if (dragging) track.scrollLeft = startLeft - (e.clientX - startX); });
  const end = () => {
    if (!dragging) return;
    dragging = false; track.classList.remove("dragging");
    go(0);  // settle onto the nearest photo
  };
  track.addEventListener("pointerup", end);
  track.addEventListener("pointercancel", end);
  update();
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
