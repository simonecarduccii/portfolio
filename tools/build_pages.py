#!/usr/bin/env python3
"""Build the site's HTML pages from the texts in docs/.

The texts live in docs/CONTENUTI.md and docs/progetti/*.md (written by the copy team).
This script turns them into the static pages at the repository root, so that the
header, footer and layouts stay identical everywhere.

Usage:  python3 tools/build_pages.py

Phrases marked [DA VERIFICARE ...] in the docs are shown highlighted on the page,
so they are easy to spot in the preview. Remove the marker in the docs once checked.
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

SITE = "Simone Carducci"
EMAIL = "simone.carducci01@gmail.com"
INSTAGRAM = "https://instagram.com/simonecarduccii"
LOMO = "https://www.lomography.com/homes/simonecarduccii"
LINKEDIN = None  # URL still to come from Simone; the footer shows LinkedIn only once this is set
CV = "assets/cv-simone-carducci.pdf"
FONTS = "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"

CULTURE = [
    {"slug": "boheme", "doc": "boheme-magazine", "title": "Bohème Magazine", "year": "2024",
     "visit": "https://instagram.com/bohememag", "visit_label": "Instagram"},
    {"slug": "modi", "doc": "colectivo-modi", "title": "Colectivo modì", "year": "2026",
     "visit": None, "two_col": ["Una serata, ripresa per intero", "Le serie"]},
]
PHOTO = [
    {"slug": "siculo", "title": "Siculo", "year": "2025"},
    {"slug": "papa-che-fanno-i-papa", "title": "Papà che fanno i papà", "year": "2025"},
    {"slug": "place-of-freedom", "title": "Place of Freedom", "year": "2025"},
    {"slug": "faccioni", "title": "Faccioni", "year": "2025"},
]
AI = [
    {"slug": "vedetta", "doc": "ai-boheme-vedetta", "title": "Bohème Vedetta",
     "what": "Trova, legge e verifica i bandi per artisti.", "tools": "Python · Supabase · Claude",
     "year": "2026", "status": "Attivo"},
    {"slug": "coaching", "doc": "ai-coaching-corsa", "title": "Running Coach",
     "what": "Prepara e corregge il mio piano di corsa, io approvo.", "tools": "Claude · Intervals.icu",
     "year": "2026", "status": "In sviluppo"},
    {"slug": None, "title": "Lettura",
     "what": "Uno strumento di lettura per una persona della mia famiglia.", "tools": "—",
     "year": "2026", "status": "private"},
]
# Home "Ricerca visiva": order, visibility, title and year of each photo project, edited in /admin.
HOME = __import__("json").loads((ROOT / "content" / "home.json").read_text(encoding="utf-8"))
RESEARCH = HOME["ricerca_visiva"]
ON = HOME.get("sezioni", {})  # home sections switched on/off in /admin; missing = on


def on(key):
    return ON.get(key, True) is not False
for _p in PHOTO:  # one name everywhere: the home card, the page title, "Altri progetti"
    _h = next((r for r in RESEARCH if r.get("pagina") == _p["slug"]), None)
    if _h:
        _p.update(title=_h["titolo"], year=_h["anno"])
PHOTO.sort(key=lambda q: next((i for i, r in enumerate(RESEARCH) if r.get("pagina") == q["slug"]), 99))

PHOTO_SLOTS = 12  # sequence slots per photo project; missing files are hidden by main.js


def slots(slug, default):
    """Number of numbered photos (01.jpg, 02.jpg ...) to show for a page.

    When photos are on disk (from /admin, the Mac folder sync or optimize_images.py) the page
    shows exactly those; until then it keeps `default` placeholder slots."""
    nums = [int(f.stem) for f in (ROOT / "img" / slug).glob("[0-9][0-9]*.jpg") if f.stem.isdigit()]
    return max(nums) if nums else default


# ---------------------------------------------------------------- markdown

def inline(text):
    text = html.escape(text, quote=False)
    text = re.sub(r"\[DA VERIFICARE[^\]]*\]", lambda m: f'<mark class="verify">{m.group(0)}</mark>', text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2" target="_blank" rel="noopener">\1</a>', text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w*])_(.+?)_(?!\w)", r"<em>\1</em>", text)
    return text


def strip_verify(text):
    return re.sub(r"\s*\[DA VERIFICARE[^\]]*\]", "", text).strip()


def plain(text):
    text = strip_verify(text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    return text.replace("**", "")


def parse_sheet(name):
    """Return (meta, notes, sections). sections: list of (title, blocks)."""
    meta, notes, sections = {}, [], []
    current = None
    blocks = None
    para = []

    def flush():
        if para and blocks is not None:
            blocks.append(("p", " ".join(para)))
        elif para:
            notes.append(" ".join(para))
        para.clear()

    for line in (DOCS / "progetti" / f"{name}.md").read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if s.startswith("# "):
            continue
        if s.startswith("## "):
            flush()
            blocks = []
            current = s[3:].strip()
            sections.append((current, blocks))
            continue
        m = re.match(r"- \*\*(.+?):\*\*\s*(.*)", s)
        if m and current is None:
            meta[m.group(1)] = m.group(2)
            continue
        if s.startswith("- ") and blocks is not None:
            flush()
            if blocks and blocks[-1][0] == "ul":
                blocks[-1][1].append(s[2:])
            else:
                blocks.append(("ul", [s[2:]]))
            continue
        if not s:
            flush()
            continue
        para.append(s)
    flush()
    return meta, notes, sections


def section(sections, title):
    for t, b in sections:
        if t.lower().startswith(title.lower()):
            return b
    return []


def first_text(blocks):
    for kind, val in blocks:
        if kind == "p":
            return val
    return ""


def render_blocks(blocks):
    out = []
    for kind, val in blocks:
        if kind == "p":
            out.append(f"<p>{inline(val)}</p>")
        else:
            out.append("<ul>" + "".join(f"<li>{inline(i)}</li>" for i in val) + "</ul>")
    return "\n".join(out)


def contenuti():
    return (DOCS / "CONTENUTI.md").read_text(encoding="utf-8")


def field(text, label):
    m = re.search(r"\*\*" + re.escape(label) + r"[^*]*:\*\*\s*(.+)", text)
    return m.group(1).strip() if m else ""


# ---------------------------------------------------------------- layout

NAV = [("about", "about.html", "about")]
# kept for the footer of older layouts
SECTIONS = [("Cultura", "index.html#cultura"), ("Archivio", "archivio.html"), ("Ricerca visiva", "index.html#ricerca-visiva"),
            ("AI", "ai.html"), ("About", "about.html")]


def page(*, file, title, description, body, current=None, header="", body_class="", main_class=""):
    full_title = f"{title} — {SITE}" if title != SITE else f"{SITE} — Editorial, Events & Cultural Projects"
    nav = "".join(
        f'<a href="{href}"{" aria-current=\"page\"" if key == current else ""}>{label}</a>'
        for label, href, key in NAV)
    hc = " ".join(c for c in ["site-header", header] if c)
    out = f"""<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(full_title)}</title>
<meta name="description" content="{html.escape(description)}">
<meta property="og:title" content="{html.escape(full_title)}">
<meta property="og:description" content="{html.escape(description)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#fbfbfb">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS}" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css">
</head>
<body{f' class="{body_class}"' if body_class else ""}>
<a class="skip" href="#main">Vai al contenuto</a>
<header class="{hc}">
  <a class="brand" href="index.html">Simone Carducci</a>
  <span class="tag">Creative development</span>
  <nav class="nav" aria-label="Menu principale">{nav}</nav>
</header>

<main id="main"{f' class="{main_class}"' if main_class else ""}>
{body}
</main>
{footer()}
<script src="assets/main.js"></script>
</body>
</html>
"""
    (ROOT / file).write_text(out, encoding="utf-8")
    print("wrote", file)


def footer():
    linkedin = f'<li><a href="{LINKEDIN}" target="_blank" rel="noopener">LinkedIn</a></li>' if LINKEDIN else ""
    return f"""<footer class="site-footer">
  <a class="footer-cta" href="mailto:{EMAIL}">Scrivimi</a>
  <a class="footer-email" href="mailto:{EMAIL}">{EMAIL}</a>
  <div class="footer-cols">
    <div><h2>Contatti</h2><ul><li><a class="lower" href="mailto:{EMAIL}">{EMAIL}</a></li></ul></div>
    <div><h2>Altrove</h2><ul><li><a class="ig" href="{INSTAGRAM}" target="_blank" rel="noopener">Instagram</a></li><li><a href="{LOMO}" target="_blank" rel="noopener">Lomography</a></li>{linkedin}</ul></div>
    <div><h2>Sezioni</h2><ul><li><a href="index.html#cultura">Cultura</a></li><li><a href="index.html#ricerca-visiva">Ricerca visiva</a></li><li><a href="archivio.html">Archivio</a></li><li><a href="about.html">About</a></li></ul></div>
    <div><h2>CV</h2><ul><li><a href="{CV}" target="_blank">Scarica il CV (PDF)</a></li></ul></div>
  </div>
  <div class="footer-legal"><span>© 2025-2026 Simone Carducci. Tutti i diritti riservati.</span><span>Developed by me</span><span>P.Iva 18337621009</span></div>
</footer>"""


def band_archive():
    # The whole photo band is one link to the archive.
    return f"""  <a class="band band-bw" href="archivio.html">
    <div class="media bw has-photo"><img src="img/home/archivio.jpg" alt="" loading="lazy"></div>
    <span class="band-text">Archivio</span>
    {chev()}
  </a>"""


def chev(tag="span", attrs=' aria-hidden="true"'):
    svg = '<svg viewBox="0 0 9 43" width="9" height="43" aria-hidden="true"><path d="M.5.5l8 21-8 21" fill="none" stroke="currentColor"/></svg>'
    return f'<{tag} class="chev"{attrs}>{svg}</{tag}>'


_FILM = ["", " f-b", " f-c", " f-d"]
_film_i = [0]


def img(src, alt, label=None, eager=False):
    label = label or f"Foto in arrivo · {src}"
    loading = "" if eager else ' loading="lazy"'
    film = _FILM[_film_i[0] % 4]
    _film_i[0] += 1
    return (f'<div class="media{film}"><span class="ph">{html.escape(label)}</span>'
            f'<img src="{src}" alt="{html.escape(alt)}"{loading} onerror="this.remove()"></div>')


def facts(meta, skip=()):
    items = []
    for k, v in meta.items():
        if k in skip or k.startswith("Immagine"):
            continue
        items.append(f'<div class="fact"><dt>{html.escape(k)}</dt><dd>{inline(v)}</dd></div>')
    return '<dl class="p-facts">' + "".join(items) + "</dl>"


def draft_note(text="Bozza: le parti evidenziate vanno verificate con Simone prima della pubblicazione."):
    return f'<p class="draft-note">{text}</p>'


# ---------------------------------------------------------------- pages

def mockup_sheet(blocks):
    """Parse the 'Testo pagina' section: a 'LABEL value · LABEL value' line, then paragraphs."""
    facts_html, paras = "", []
    for kind, val in blocks:
        if kind != "p" or val.startswith("Scheda") or val.startswith("("):
            if kind == "p" and val.startswith("Scheda") and "\n" not in val:
                # the facts line follows "Scheda (...):" in the same paragraph
                rest = val.split(":", 1)[1].strip() if ":" in val else ""
                if rest and rest.startswith(tuple("ABCDEFGHIJKLMNOPQRSTUVWXYZ")):
                    facts_html = parse_facts_line(rest)
            continue
        if not facts_html and re.match(r"^[A-Z][A-Z &]+ ", val) and " · " in val:
            facts_html = parse_facts_line(val)
            continue
        paras.append(val)
    return facts_html, paras


def parse_facts_line(line):
    items = []
    for part in line.split(" · "):
        m = re.match(r"^([A-Z][A-Z &]*[A-Z])\s+(.+)$", part.strip())
        if m:
            value = re.sub(r"\s*\(.*$", "", m.group(2)).strip()
            if value.startswith("@"):
                value = f"[{value}](https://instagram.com/{value[1:]})"
            items.append(f'<div class="fact"><dt>{html.escape(m.group(1).title())}</dt><dd>{inline(value)}</dd></div>')
    return '<dl class="p-facts">' + "".join(items) + "</dl>"


def build_culture(i, p):
    meta, notes, secs = parse_sheet(p["doc"])
    nxt = CULTURE[(i + 1) % len(CULTURE)]
    lead = first_text(section(secs, "In breve"))
    facts_html, paras = mockup_sheet(section(secs, "Testo pagina"))
    if not facts_html:
        facts_html = facts(meta)
    s = p["slug"]
    body = f"""  <section class="p-hero bw">
    {img(f"img/{s}/cover.jpg", p["title"], eager=True)}
  </section>
  <div class="p-title-row"><h1 class="p-title">{html.escape(p["title"])}<sup class="yr">{p["year"]}</sup></h1></div>
  <div class="p-facts-wrap">{facts_html}</div>
  <section class="p-body">
    {draft_note() if "DA VERIFICARE" in " ".join(paras) else ""}
    <div class="prose">
{chr(10).join(f"<p>{inline(x)}</p>" for x in paras)}
    </div>
    <div class="gallery col" aria-label="Immagini del progetto">{"".join(img(f"img/{s}/{n:02d}.jpg", f"{p['title']}, immagine {n}") for n in range(1, slots(s, 6) + 1))}</div>
  </section>
  <a class="next-project" href="{nxt["slug"]}.html"><span>Progetto successivo</span><span>{html.escape(nxt["title"])} ›</span></a>
{band_archive()}"""
    page(file=f"{s}.html", title=p["title"], description=plain(lead), body=body, header="overlay", main_class="flush")


def build_photo(i, p):
    meta, notes, secs = parse_sheet(p["slug"])
    s = p["slug"]
    intro = first_text(section(secs, "Intro"))
    long_text = section(secs, "Testo")
    credits = first_text(section(secs, "Crediti"))
    place = strip_verify(meta.get("Luogo", ""))
    year = meta.get("Anno", p["year"]).replace(" – ", " — ")
    meta_lines = [x for x in [place, f"Progetto: {year}"] if x]
    tech = [f"{k}: {inline(v)}" for k, v in meta.items() if k in ("Supporto", "Fotocamera", "Pellicola")]
    total = slots(s, PHOTO_SLOTS)
    seq = "".join(
        f'<li data-src="img/{s}/{n:02d}.jpg">{img(f"img/{s}/{n:02d}.jpg", f"{p["title"]}, fotografia {n}")}<span class="count label">{n:02d}/{total:02d}</span></li>'
        for n in range(1, total + 1))
    shown = {r["pagina"] for r in RESEARCH if r.get("visibile", True) and r.get("pagina")}
    others = [q for q in PHOTO if q["slug"] != s and q["slug"] in shown]
    related = "".join(
        f'<a class="tile" href="{q["slug"]}.html">{img(f"img/{q["slug"]}/cover.jpg", q["title"], " ")}'
        f'<span class="fig-cap"><span>{html.escape(q["title"])}</span><span>{q["year"]}</span></span></a>'
        for q in others[:3])
    note = draft_note(inline(notes[0])) if notes else (draft_note() if "DA VERIFICARE" in str(secs) else "")
    body = f"""  <div class="p-title-row page-head"><h1 class="p-title">{html.escape(p["title"])}<sup class="yr">{html.escape(year)}</sup></h1></div>
  <div class="photo-intro">
    <p>{inline(intro)}</p>
    <p class="meta">{" · ".join(html.escape(x) for x in meta_lines)}</p>
  </div>
  <div class="photo-first">{img(f"img/{s}/cover.jpg", p["title"], eager=True)}</div>
  <ol class="photo-seq" aria-label="Fotografie del progetto">{seq}</ol>
  <section class="photo-text">
    {note}
    {render_blocks(long_text)}
    <div class="credits label">{"".join(f"<span>{t}</span>" for t in tech)}</div>
    <p class="copy label">{inline(credits) if credits else f"© {p['year']} Simone Carducci. Fotografie su pellicola, non riproducibili senza autorizzazione."}</p>
  </section>
  <section class="related" aria-label="Altri progetti">
    <h2 class="small-title">Altri progetti</h2>
    <div class="related-row">{related}</div>
  </section>
{band_archive()}"""
    page(file=f"{s}.html", title=p["title"], description=plain(intro), body=body, main_class="flush")


def ai_rows():
    out = []
    for p in AI:
        if p["slug"]:
            out.append(f'<li><a href="{p["slug"]}.html"><span class="t">{html.escape(p["title"])}</span>'
                       f'<span class="what">{html.escape(p["what"])}</span><span class="s">{html.escape(p["status"])} · {p["year"]}</span></a></li>')
        else:
            out.append(f'<li class="is-private"><span class="t">{html.escape(p["title"])}</span>'
                       f'<span class="what">{html.escape(p["what"])}</span><span class="s badge-private">Privato</span></li>')
    return f'<ul class="index-list">{"".join(out)}</ul>'


def build_ai_index():
    c = contenuti()
    block = c[c.index("### Progetti con l'intelligenza artificiale"):]
    lead = field(block, "Lead")
    body = f"""  <div class="p-title-row page-head"><h1 class="p-title">Progetti con l'AI</h1></div>
  <section class="list-wrap">
    <p>{inline(lead)}</p>
    {ai_rows()}
    <p class="note">Lettura è un progetto privato: esiste, ma non lo mostro qui.</p>
  </section>
{band_archive()}"""
    page(file="ai.html", title="Progetti con l'AI", description=plain(lead), body=body, current="ai", main_class="flush")


def build_ai_detail(p):
    meta, notes, secs = parse_sheet(p["doc"])
    lead = first_text(section(secs, "In breve"))
    parts = [f"<h2>{inline(t)}</h2>\n{render_blocks(b)}" for t, b in secs if not t.startswith("In breve")]
    s = p["slug"]
    year = re.sub(r"\s*[–-].*$", "", meta.get("Anno", "2026"))
    body = f"""  <section class="p-hero short bw">
    {img(f"img/{s}/cover.jpg", p["title"], eager=True)}
  </section>
  <div class="p-title-row"><h1 class="p-title">{html.escape(p["title"])}<sup class="yr">{html.escape(year)}</sup></h1></div>
  <div class="p-facts-wrap">{facts(meta)}</div>
  <section class="p-body">
    {draft_note() if "DA VERIFICARE" in str(secs) + str(meta) + str(notes) else ""}
    <div class="prose">
<p class="lead">{inline(lead)}</p>
{chr(10).join(parts)}
    </div>
    <div class="gallery col shots" aria-label="Schermate">{"".join(img(f"img/{s}/{n:02d}.jpg", f"{p['title']}, schermata {n}", "Schermata in arrivo") for n in range(1, slots(s, 3) + 1))}</div>
  </section>
  <a class="next-project" href="ai.html"><span>Progetti con l'AI</span><span>Tutti gli strumenti ›</span></a>
{band_archive()}"""
    page(file=f"{s}.html", title=p["title"], description=plain(lead), body=body, header="overlay", main_class="flush")


def build_home():
    c = contenuti()
    desc = field(c, "Description home")
    hero = [h for h in [("boheme", "Bohème Magazine", "since 2023"), ("modi", "Colectivo modì", "2025-2026")] if on(h[0])]
    hero_items = "".join(
        f'<li><a href="{sl}.html" data-cover="img/{sl}/cover.jpg">{html.escape(t)}<sup class="yr">{y}</sup></a></li>'
        for sl, t, y in hero)
    # Figma "Portfolio · v2": six cards; the ones without a page or photo yet are placeholders.
    cards = [(r["titolo"], r["anno"], r.get("pagina")) for r in RESEARCH if r.get("visibile", True)]
    tiles = ""
    for title, year, sl in cards:
        cap = f'<span class="fig-cap"><span>{html.escape(title)}</span><span>{year}</span></span>'
        if sl:
            tiles += f'<a class="tile" href="{sl}.html">{img(f"img/{sl}/cover.jpg", title)}{cap}</a>'
        else:
            tiles += f'<div class="tile is-soon"><div class="media soon"><span class="ph">foto in arrivo</span></div>{cap}</div>'
    next_btn = chev("button", ' type="button" data-band-next aria-label="Un\'altra foto a caso"')
    parts = []
    if on("hero") and hero:
        parts.append(f"""  <section class="hero hero-full bw" id="cultura" aria-label="Progetti culturali">
    <div class="media bw has-photo"><img src="img/{hero[0][0]}/cover.jpg" alt=""></div>
    <h1 class="sr-only">Simone Carducci, creative development</h1>
    <ul class="hero-list">{hero_items}</ul>
  </section>""")
    else:
        parts.append('  <h1 class="sr-only">Simone Carducci, creative development</h1>')
    if on("pellicole"):
        parts.append(f"""  <section class="band band-color">
    <div class="media has-photo" data-random-photo data-keep><img src="img/home/pellicole.jpg" alt="Fotografia a colori su pellicola di Simone Carducci" loading="lazy"></div>
    <a class="band-link" href="{LOMO}" target="_blank" rel="noopener" aria-label="Tutte le mie pellicole su Lomography"></a>
    <ul class="band-list">
      <li><a href="archivio.html">Tutto ciò che mi sta intorno</a></li>
      <li><a href="{LOMO}" target="_blank" rel="noopener">Tutte le mie pellicole</a></li>
      <li><a href="archivio.html">Tutta la mia vita</a></li>
    </ul>
    {next_btn}
  </section>""")
    if on("ricerca-visiva") and tiles:
        parts.append(f"""  <section class="research zigzag-wrap" id="ricerca-visiva">
    <h2 class="research-title">Ricerca visiva</h2>
    <div class="zigzag">{tiles}</div>
  </section>""")
    if on("ia"):
        parts.append(f"""  <section class="list-wrap" id="ai">
    <h2 class="small-title"><a href="ai.html">Progetti con l'AI</a></h2>
    {ai_rows()}
  </section>""")
    if on("banda-archivio"):
        parts.append(band_archive())
    body = "\n\n".join(parts)
    page(file="index.html", title=SITE, description=plain(desc), body=body, header="overlay", main_class="flush", body_class="home")


ARCHIVE_INDEX = [
    ["Viaggi", "Libri", "Exhibitions", "Film", "Musica", "Album", "Outfit"],
    ["Pellicole", "Fotografie", "Fotocamere", "Tatuaggi", "Personal media", "Podcast", "Note"],
    ["Concerti", "Montagne", "Mappamondo", "Calcio", "Pesi", "Poster", "Ragazzi"],
]
ARCHIVE_LINKS = {"Pellicole": LOMO, "Fotografie": "#fotografie"}


def index_item(x):
    if x not in ARCHIVE_LINKS:
        return f'<li><span title="In arrivo" aria-label="{x}, in arrivo">{x}</span></li>'
    href = ARCHIVE_LINKS[x]
    ext = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
    return f'<li><a href="{href}"{ext}>{x}</a></li>'


def build_archive():
    c = contenuti()
    a = c[c.index("## Archivio (versione precedente)"):] if "## Archivio (versione precedente)" in c else c[c.index("## Archivio (pagina"):]
    cols = "".join(
        "<ul>" + "".join(
            index_item(x)
            for x in col) + "</ul>"
        for col in ARCHIVE_INDEX)
    body = f"""  <section class="archive-cover bw">
    <div class="media" data-random-photo data-cover-stage><span class="ph"></span></div>
    <h1 class="sr-only">Archivio</h1>
    {chev("button", ' type="button" data-cover-prev aria-label="Foto precedente"').replace('class="chev"', 'class="chev chev-left"', 1)}
    {chev("button", ' type="button" data-cover-next aria-label="Un\'altra foto a caso"')}
    <nav class="archive-index" aria-label="Indice dell'archivio">{cols}</nav>
  </section>
  <section class="archive" id="fotografie">
    <div class="archive-top">
      <h2 class="small-title">Fotografie</h2>
      <p>{inline(field(a, "Lead"))}</p>
    </div>
    <div class="archive-stage" data-random-photo data-click-next title="Clicca per un'altra foto">
      <div class="media"><span class="ph">Le foto dell'archivio arrivano a breve</span></div>
    </div>
    <div class="archive-bar">
      <span class="archive-info" data-photo-info aria-live="polite">Clicca la foto, o premi lo spazio</span>
      <span class="actions">
        <button class="btn" type="button" data-next-photo>{inline(field(a, "Bottone"))}</button>
        <a class="link-arrow" href="{LOMO}" target="_blank" rel="noopener">Lomography</a>
      </span>
    </div>
  </section>
  <div class="contact-sheet" data-contact-sheet aria-label="Provino a contatto"></div>"""
    page(file="archivio.html", title="Archivio", description="Archivio di Simone Carducci: pellicole, fotografie, viaggi, musica. Una foto a caso a ogni clic.",
         body=body, current="archivio", header="overlay", main_class="flush", body_class="archive-page")


def build_about():
    c = contenuti()
    a = c[c.index("\n## About"):c.index("\n## Archivio")]
    sub = lambda start, end: a[a.index(start):a.index(end)].split("\n", 1)[1].strip()
    bio_short = sub("### Bio breve", "### Frase")
    statement = sub("### Frase", "### Bio estesa")
    bio = sub("### Bio estesa", "### Ambiti")
    blocks, verify = [], []
    for chunk in [x.strip().replace("\n", " ") for x in bio.split("\n\n") if x.strip()]:
        m = re.fullmatch(r"\*\*(.+?)\*\*", chunk)
        if m:
            blocks.append([m.group(1), []])
        elif chunk.startswith("[DA VERIFICARE"):
            verify.append(chunk)
        elif blocks:
            blocks[-1][1].append(chunk)
    html_blocks = []
    for n, (title, paras) in enumerate(blocks):
        cls = ' class="lead"' if n == len(blocks) - 1 else ""
        html_blocks.append(f'<div class="about-block"><h2 class="label">{inline(title)}</h2>'
                           + "".join(f"<p{cls}>{inline(x)}</p>" for x in paras) + "</div>")
    rows = re.findall(r"^\| (Ambiti|Competenze|Strumenti|Lingue|Formazione) \| (.+?) \|$", a, re.M)
    rows = [(k, "<br>".join(inline(x) for x in v.split(" · ")) if k == "Formazione" else inline(v)) for k, v in rows]
    langs = dict(rows).get("Lingue", "").lower()
    portrait = img("img/about/ritratto.jpg", "Ritratto di Simone Carducci", "Ritratto in arrivo", eager=True)
    body = f"""  <h1 class="sr-only">Simone Carducci</h1>
  <section class="about-intro">
    <div class="about-portrait">{portrait.replace('class="media', 'class="media soon', 1)}</div>
    <dl class="about-facts">
      <div><dt>Base</dt><dd>Torino</dd></div>
      <div><dt>Ambiti</dt><dd>editoria, eventi, progetti culturali, fotografia analogica</dd></div>
      <div><dt>Contatti</dt><dd><a href="mailto:{EMAIL}">{EMAIL}</a></dd></div>
      <div><dt>Lingue</dt><dd>{langs}</dd></div>
    </dl>
  </section>
  <section class="about-text">
    <p class="about-statement">{inline(statement)}</p>
    {chr(10).join(html_blocks)}
  </section>
  <section class="about-data">
    <dl>{"".join(f'<div><dt class="label">{k}</dt><dd>{v}</dd></div>' for k, v in rows)}</dl>
  </section>
  <section class="about-links">
    <a href="{CV}" target="_blank">CV (PDF)</a>
    <a href="mailto:{EMAIL}">Scrivimi</a>
  </section>
{band_archive()}"""
    page(file="about.html", title="About", description=plain(field(c, "Description About") or bio_short), body=body, current="about", main_class="flush", body_class="about-page")


def main():
    build_home()
    for i, p in enumerate(CULTURE):
        build_culture(i, p)
    for i, p in enumerate(PHOTO):
        build_photo(i, p)
    build_archive()
    build_ai_index()
    for p in AI:
        if p.get("doc"):
            build_ai_detail(p)
    build_about()


if __name__ == "__main__":
    main()
