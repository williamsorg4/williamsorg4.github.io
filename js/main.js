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
    peek.style.left = `${e.clientX - r.left + 150}px`;
    peek.style.top = `${e.clientY - r.top}px`;
  });
}

/* ── 4. Photo carousel ────────────────────────────────────────
   Native horizontal scroll with snap; arrows, counter, and mouse drag. */
function setupCarousel() {
  const track = document.querySelector(".carousel");
  if (!track) return;
  const figs = [...track.children];
  const pos = document.querySelector(".off .pos");
  const prev = document.querySelector(".off .prev");
  const next = document.querySelector(".off .next");
  const pad = n => String(n).padStart(2, "0");

  const current = () => {
    const left = track.scrollLeft + 1;
    let idx = 0;
    figs.forEach((f, i) => { if (f.offsetLeft - figs[0].offsetLeft <= left) idx = i; });
    return idx;
  };
  // room at the end so the last photo can line up with the left edge too
  const fitEnd = () => {
    const last = figs[figs.length - 1];
    const padL = parseFloat(getComputedStyle(track).paddingLeft);
    track.style.paddingRight = `${Math.max(padL, track.clientWidth - last.offsetWidth - padL)}px`;
  };
  const update = () => {
    const i = current();
    pos.textContent = `${pad(i + 1)} / ${pad(figs.length)}`;
    prev.disabled = i === 0;
    next.disabled = i === figs.length - 1;
  };
  const go = d => {
    const i = Math.max(0, Math.min(figs.length - 1, current() + d));
    track.scrollTo({ left: figs[i].offsetLeft - figs[0].offsetLeft, behavior: "smooth" });
  };
  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));
  track.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  });
  track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  addEventListener("resize", () => { fitEnd(); update(); });
  addEventListener("load", fitEnd);
  fitEnd();

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

document.addEventListener("DOMContentLoaded", async () => {
  setupIndex();
  setupCarousel();
  await loadFigure();
  if (isGameDay()) crossOutMs();
});
