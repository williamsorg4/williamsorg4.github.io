"""Generate the hero figures in art/.

Run from the repo root:  python3 tools/generate_art.py

Each figure is plain SVG in the site's ink-and-scarlet style. Class names
(.walk, .ball, .bar) are hooks for the load animations in css/style.css.
To add your own figure, write an SVG into art/ and register it in js/main.js.
"""
import math
import os
import random

INK = "#111"
RED = "#BA0C2F"
GREY = "#8b8b86"
OUT = os.path.join(os.path.dirname(__file__), "..", "art")


def svg(w, h, body, label):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'role="img" aria-label="{label}">\n{body}\n</svg>\n')


def write(name, text):
    with open(os.path.join(OUT, name), "w") as f:
        f.write(text)


def galton():
    """Galton board: 900 balls fall through 16 rows of pegs into a bell curve."""
    random.seed(7)
    W, H = 760, 760
    rows, top, gap, cx, R, per = 16, 60, 26, 380, 3.0, 4
    bin_y = top + rows * gap * 0.9 + 30
    floor = bin_y + 262
    out, counts, paths = [], [0] * (rows + 1), []
    for _ in range(900):
        k, pts = 0, [(cx, top - 30)]
        for r in range(rows):
            pts.append((cx + (k - r / 2) * gap + random.uniform(-2, 2), top + r * gap * 0.9 - 6))
            k += random.random() < 0.5
        paths.append((pts, k))
        counts[k] += 1
    for pts, k in paths[:60]:
        d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        d += f" L{cx + (k - rows / 2) * gap:.1f},{bin_y:.1f}"
        out.append(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width=".5" opacity=".18"/>')
    for r in range(rows):
        for k in range(r + 1):
            out.append(f'<circle cx="{cx + (k - r / 2) * gap:.1f}" cy="{top + r * gap * 0.9:.1f}" r="1.6" fill="{INK}"/>')
    balls, red = [], None
    for b in range(rows + 1):
        bx = cx + (b - rows / 2) * gap
        for j in range(counts[b]):
            x = bx + (j % per - 1.5) * R * 2.05 + random.uniform(-.4, .4)
            y = floor - (j // per) * R * 1.9
            balls.append((j // per, x, y))
            if b == 11 and j == counts[b] - 1:
                red = (x, y)
    for i, (_, x, y) in enumerate(sorted(balls)):
        out.append(f'<circle class="ball" style="--i:{i // 8}" cx="{x:.1f}" cy="{y:.1f}" r="{R}" fill="{INK}"/>')
    rx, ry = red[0], red[1] - R * 2.2
    out.append(f'<line class="late" x1="{cx + (11 - rows / 2) * gap:.1f}" y1="{bin_y + 10:.1f}" x2="{rx:.1f}" y2="{ry - 8:.1f}" '
               f'stroke="{RED}" stroke-width="1" stroke-dasharray="2 4"/>')
    out.append(f'<circle class="late" cx="{rx:.1f}" cy="{ry:.1f}" r="4.4" fill="{RED}"/>')
    write("galton.svg", svg(W, H, "\n".join(out), "A Galton board: hundreds of balls pile into a bell curve, one in scarlet"))


def random_walk():
    """5,000-step planar random walk; picks the seed that travels farthest."""
    best = None
    for seed in range(40):
        random.seed(seed)
        x = y = 0.0
        pts = [(0.0, 0.0)]
        for _ in range(5000):
            a = random.random() * 2 * math.pi
            x += math.cos(a)
            y += math.sin(a)
            pts.append((x, y))
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        score = math.hypot(x, y) / max(max(xs) - min(xs), max(ys) - min(ys))
        if best is None or score > best[0]:
            best = (score, pts)
    pts = best[1]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    W = H = 760
    m = 60
    s = (W - 2 * m) / max(max(xs) - min(xs), max(ys) - min(ys))
    ox = (W - (max(xs) - min(xs)) * s) / 2
    oy = (H - (max(ys) - min(ys)) * s) / 2
    P = [(ox + (px - min(xs)) * s, oy + (py - min(ys)) * s) for px, py in pts]
    d = "M" + " L".join(f"{a:.1f},{b:.1f}" for a, b in P)
    (sx, sy), (ex, ey) = P[0], P[-1]
    body = (f'<path class="walk" pathLength="1" d="{d}" fill="none" stroke="{INK}" stroke-width=".7" stroke-linejoin="round" opacity=".9"/>\n'
            f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="5" fill="#fafaf7" stroke="{INK}" stroke-width="1.2"/>'
            f'<text x="{sx + 10:.1f}" y="{sy + 4:.1f}" font-size="11" fill="{GREY}">start</text>\n'
            f'<g class="late"><circle cx="{ex:.1f}" cy="{ey:.1f}" r="7" fill="{RED}"/>'
            f'<text x="{ex + 13:.1f}" y="{ey + 4:.1f}" font-size="11" fill="{RED}">you are here</text></g>')
    write("random-walk.svg", svg(W, H, body, "A random walk from start to a scarlet dot labelled you are here"))


def heartbreak_hill():
    """Stylised Boston Marathon elevation profile (feet). Replace KEY with real
    GPX elevations from Strava for the true course."""
    KEY = [(0, 490), (2, 330), (4, 250), (6, 190), (8, 170), (10, 150), (12, 135), (14, 110), (16, 50),
           (17.5, 120), (19, 105), (20.2, 150), (20.9, 235), (21.5, 190), (23, 110), (24.5, 60), (26.2, 15)]

    def elev(mi):
        for (a, ea), (c, ec) in zip(KEY, KEY[1:]):
            if a <= mi <= c:
                t = (mi - a) / (c - a)
                t = t * t * (3 - 2 * t)
                return ea + (ec - ea) * t
        return KEY[-1][1]

    W, H = 900, 530
    X = lambda mi: 40 + mi / 26.2 * 820
    Y = lambda e: 470 - e * 0.72
    out = []
    n = 330
    for i in range(n + 1):
        mi = i / n * 26.2
        e = elev(mi) + math.sin(i * 1.7) * 2
        col = RED if 19.9 <= mi <= 21.2 else INK
        out.append(f'<line class="bar" style="--i:{i}" x1="{X(mi):.1f}" y1="470" x2="{X(mi):.1f}" y2="{Y(e):.1f}" '
                   f'stroke="{col}" stroke-width=".9" opacity="{1 if col == RED else .85}"/>')
    for mi in (0, 5, 10, 15, 20, 25, 26.2):
        out.append(f'<text x="{X(mi):.1f}" y="494" font-size="11" fill="{GREY}" text-anchor="middle">{mi:g}</text>')
    hx, hy = X(20.9), Y(elev(20.9))
    out.append(f'<g class="late"><line x1="{hx:.1f}" y1="{hy - 10:.1f}" x2="{hx:.1f}" y2="{hy - 70:.1f}" stroke="{RED}" stroke-width="1"/>'
               f'<text x="{hx:.1f}" y="{hy - 80:.1f}" font-size="11" fill="{RED}" text-anchor="middle">heartbreak hill</text></g>')
    out.append(f'<text x="{X(0):.1f}" y="514" font-size="11" fill="{GREY}">Hopkinton</text>'
               f'<text x="{X(26.2):.1f}" y="514" font-size="11" fill="{GREY}" text-anchor="end">Boylston St.</text>')
    write("heartbreak-hill.svg", svg(W, H, "\n".join(out), "Elevation profile of the Boston Marathon with Heartbreak Hill in scarlet"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    galton()
    random_walk()
    heartbreak_hill()
    print("wrote", sorted(os.listdir(OUT)))
