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
CV = "assets/cv-simone-carducci.pdf"
FONTS = "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"

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
PHOTO_SLOTS = 12  # sequence slots per photo project; missing files are hidden by main.js


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

NAV = [("Cultura", "index.html#cultura", "cultura"), ("Archivio", "archivio.html", "archivio"),
       ("Fotografia", "index.html#fotografia", "fotografia"), ("AI", "ai.html", "ai"),
       ("About", "about.html", "about")]


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
<meta name="theme-color" content="#f2f1ee">
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
  <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav">Menu</button>
  <nav class="nav" id="nav" aria-label="Menu principale">{nav}</nav>
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
    return f"""<footer class="site-footer">
  <div class="footer-cta">
    <p class="p-title">Scrivimi</p>
    <a class="h3" href="mailto:{EMAIL}">{EMAIL}</a>
  </div>
  <div class="footer-cols">
    <div><h2 class="label">Contatti</h2><ul><li><a href="mailto:{EMAIL}">Email</a></li></ul></div>
    <div><h2 class="label">Altrove</h2><ul><li><a href="{INSTAGRAM}" target="_blank" rel="noopener">Instagram</a></li><li><a href="{LOMO}" target="_blank" rel="noopener">Lomography</a></li></ul></div>
    <div><h2 class="label">Sezioni</h2><ul>{"".join(f'<li><a href="{h}">{l}</a></li>' for l, h, _ in NAV)}</ul></div>
    <div><h2 class="label">CV</h2><ul><li><a class="link-arrow" href="{CV}" target="_blank">Scarica il CV (PDF)</a></li></ul></div>
  </div>
  <div class="legal label">
    <span>© 2025–2026 Simone Carducci. Tutti i diritti riservati. Testi e fotografie non possono essere riprodotti senza autorizzazione.</span>
    <span>P.Iva 18337621009</span>
  </div>
</footer>"""


def img(src, alt, label=None, eager=False):
    label = label or f"Foto in arrivo · {src}"
    loading = "" if eager else ' loading="lazy"'
    return (f'<div class="media"><span class="ph">{html.escape(label)}</span>'
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

def build_culture(i, p):
    meta, notes, secs = parse_sheet(p["doc"])
    nxt = CULTURE[(i + 1) % len(CULTURE)] if i + 1 < len(CULTURE) else {"slug": PHOTO[0]["slug"], "title": PHOTO[0]["title"]}
    lead = first_text(section(secs, "In breve"))
    body_parts, two = [], []
    for title, blocks in secs:
        if title.startswith("In breve"):
            continue
        if title.startswith("I numeri"):
            stats = []
            for kind, val in blocks:
                if kind == "ul":
                    for item in val:
                        m = re.match(r"\*\*(.+?)\*\*\s*(.*)", item)
                        if m:
                            stats.append(f'<div class="stat"><b>{inline(m.group(1))}</b><span class="label">{inline(m.group(2))}</span></div>')
            src = "".join(f'<p class="label" style="color:var(--ink-2)">{inline(v)}</p>' for k, v in blocks if k == "p")
            body_parts.append(f'</div>\n<div class="stat-row">{"".join(stats)}</div>\n<div class="prose">{src}')
            continue
        chunk = f"<h2>{inline(title)}</h2>\n{render_blocks(blocks)}"
        if title in p.get("two_col", []):
            two.append(f"<div>{chunk}</div>")
            if len(two) == 2:
                body_parts.append(f'</div>\n<div class="two-col">{"".join(two)}</div>\n<div class="prose">')
            continue
        body_parts.append(chunk)
    visit = (f'<a class="link-arrow visit" href="{p["visit"]}" target="_blank" rel="noopener">Visita</a>'
             if p.get("visit") else "")
    s = p["slug"]
    body = f"""  <section class="p-hero">
    {img(f"img/{s}/cover.jpg", p["title"], eager=True)}
    <span class="caption">{html.escape(p["title"])}</span>
  </section>
  <div class="p-title-row"><h1 class="p-title">{html.escape(p["title"])}</h1>{img(f"img/{s}/01.jpg", "", " ").replace('class="media"', 'class="media thumb" aria-hidden="true"')}</div>
  <div class="p-facts-wrap">{visit}{facts(meta)}</div>
  <section class="p-body offset">
    {draft_note() if "DA VERIFICARE" in str(secs) + str(meta) else ""}
    <div class="prose">
<p class="lead">{inline(lead)}</p>
{chr(10).join(body_parts)}
    </div>
    <div class="gallery col" aria-label="Immagini del progetto">{"".join(img(f"img/{s}/{n:02d}.jpg", f"{p['title']}, immagine {n}") for n in range(1, 7))}</div>
  </section>
  <a class="next-project" href="{nxt["slug"]}.html">
    <span class="eyebrow">Progetto successivo</span>
    <span class="h2">{html.escape(nxt["title"])} →</span>
  </a>"""
    page(file=f"{s}.html", title=p["title"], description=plain(lead), body=body, current="cultura")


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
    seq = "".join(
        f'<li data-src="img/{s}/{n:02d}.jpg">{img(f"img/{s}/{n:02d}.jpg", f"{p["title"]}, fotografia {n}")}<span class="count label">{n:02d}/{PHOTO_SLOTS:02d}</span></li>'
        for n in range(1, PHOTO_SLOTS + 1))
    others = [q for q in PHOTO if q["slug"] != s] + [CULTURE[0]]
    related = "".join(
        f'<a class="tile" href="{q["slug"]}.html">{img(f"img/{q["slug"]}/cover.jpg", q["title"], " ")}'
        f'<span class="fig-cap label"><span>{html.escape(q["title"])}</span><span>{q["year"]}</span></span></a>'
        for q in others[:4])
    note = draft_note(inline(notes[0])) if notes else (draft_note() if "DA VERIFICARE" in str(secs) else "")
    body = f"""  <header class="photo-head">
    <div>
      <h1>{html.escape(p["title"])}</h1>
      <p class="meta mono">{"<br>".join(html.escape(x) for x in meta_lines)}</p>
      <p class="intro mono">{inline(intro)}</p>
      <p class="dash mono">—</p>
    </div>
  </header>
  <div class="photo-first">{img(f"img/{s}/cover.jpg", p["title"], eager=True)}</div>
  <ol class="photo-seq" aria-label="Fotografie del progetto">{seq}</ol>
  <section class="photo-text">
    {note}
    {render_blocks(long_text)}
    <div class="credits label">{"".join(f"<span>{t}</span>" for t in tech)}</div>
    <p class="copy label">{inline(credits) if credits else f"© {p['year']} Simone Carducci. Fotografie su pellicola, non riproducibili senza autorizzazione."}</p>
  </section>
  <section class="related" aria-label="Altri progetti">
    <span class="eyebrow">Altri progetti</span>
    <div class="related-row">{related}</div>
  </section>"""
    page(file=f"{s}.html", title=p["title"], description=plain(intro), body=body, current="fotografia")


def ai_table(compact=False):
    rows = []
    for n, p in enumerate(AI, 1):
        private = p["status"] == "private"
        status = '<span class="badge-private">Privato</span>' if private else html.escape(p["status"])
        title = f'<span class="h3">{html.escape(p["title"])}</span>'
        if not private:
            title = f'<a class="h3" href="{p["slug"]}.html">{html.escape(p["title"])}</a>'
        cls = "is-private" if private else "row-link"
        thumb = "" if private else f' data-thumb="img/{p["slug"]}/cover.jpg"'
        rows.append(
            f'<tr class="{cls}"{thumb}><td class="n">{n:02d}</td><td class="proj">{title}</td>'
            f'<td class="what">{html.escape(p["what"])}</td><td class="tools">{html.escape(p["tools"])}</td>'
            f'<td class="yr">{p["year"]}</td><td class="st">{status}</td></tr>')
    head = ('<thead><tr><th>N.</th><th>Progetto</th><th>Cosa fa</th><th>Strumenti</th><th>Anno</th><th>Stato</th></tr></thead>')
    return f'<table class="index-table">{head}<tbody>{"".join(rows)}</tbody></table>'


def build_ai_index():
    c = contenuti()
    block = c[c.index("### Progetti con l'intelligenza artificiale"):]
    eyebrow = field(block, "Eyebrow") or "Progetti con l'AI"
    title = field(block, "Titolo") or "Strumenti su misura"
    lead = field(block, "Lead")
    body = f"""  <section class="page-intro">
    <p class="eyebrow">{inline(eyebrow)}</p>
    <h1 class="h2">{inline(title)}</h1>
    <p class="lead">{inline(lead)}</p>
  </section>
  <section style="padding:0 var(--pad)">
    {ai_table()}
    <p class="label" style="color:var(--ink-2); margin-top:20px">Lettura è un progetto privato: esiste, ma non lo mostro qui.</p>
  </section>"""
    page(file="ai.html", title="Progetti con l'AI", description=plain(lead), body=body, current="ai")


def build_ai_detail(p):
    meta, notes, secs = parse_sheet(p["doc"])
    lead = first_text(section(secs, "In breve"))
    parts = [f"<h2>{inline(t)}</h2>\n{render_blocks(b)}" for t, b in secs if not t.startswith("In breve")]
    s = p["slug"]
    year = meta.get("Anno", "")
    body = f"""  <section class="p-hero short">
    {img(f"img/{s}/cover.jpg", p["title"], eager=True)}
  </section>
  <header class="article-head offset">
    <p class="eyebrow">Progetti con l'AI · {inline(year)}</p>
    <h1 class="display-title">{html.escape(p["title"])}</h1>
  </header>
  <div class="p-facts-wrap">{facts(meta)}</div>
  <section class="p-body offset">
    {draft_note() if "DA VERIFICARE" in str(secs) + str(meta) + str(notes) else ""}
    <div class="prose">
<p class="lead">{inline(lead)}</p>
{chr(10).join(parts)}
    </div>
    <div class="gallery col shots" aria-label="Schermate">{"".join(img(f"img/{s}/{n:02d}.jpg", f"{p['title']}, schermata {n}", "Schermata in arrivo") for n in range(1, 4))}</div>
  </section>
  <a class="next-project" href="ai.html">
    <span class="eyebrow">Progetti con l'AI</span>
    <span class="h2">Tutti gli strumenti →</span>
  </a>"""
    page(file=f"{s}.html", title=p["title"], description=plain(lead), body=body, current="ai")


def build_home():
    c = contenuti()
    manifesto = field(c, "Manifesto")
    desc = field(c, "Description home")
    tagline = field(c, "Tagline") or "Editorial, Events & Cultural Projects"
    sec = lambda name: c[c.index(f"### {name}"):]
    cult, arch, foto, ai = sec("Progetti culturali"), sec("Archivio fotografico"), sec("Progetti fotografici"), sec("Progetti con l'intelligenza artificiale")
    cards = []
    for p in CULTURE:
        m = re.search(r"\*\*" + re.escape(p["title"]) + r"\*\* · ([^—]+) — (.+)", cult)
        years, text = (m.group(1).strip(), m.group(2).strip()) if m else (p["year"], "")
        cards.append(f"""<a class="card" href="{p["slug"]}.html">
      {img(f"img/{p['slug']}/cover.jpg", p["title"], f"Foto in arrivo · img/{p['slug']}/cover.jpg")}
      <span class="fig-cap label"><span>{html.escape(p["title"])}</span><span>{html.escape(years)}</span></span>
      <span class="card-title h3">{html.escape(p["title"])}</span>
      <p class="card-desc">{inline(text)}</p>
    </a>""")
    tiles = "".join(
        f'<a class="tile" href="{p["slug"]}.html">{img(f"img/{p["slug"]}/cover.jpg", p["title"])}'
        f'<span class="fig-cap label"><span>{html.escape(p["title"])}</span><span>{p["year"]}</span></span></a>'
        for p in PHOTO)
    hero_items = "".join(
        f'<li><a class="display-xl" href="{p["slug"]}.html" data-cover="img/{p["slug"]}/cover.jpg">{html.escape(p["title"])}<sup class="yr">{p["year"]}</sup></a></li>'
        for p in CULTURE + PHOTO)
    body = f"""  <section class="hero" aria-label="Progetti">
    <div class="media" data-random-photo><span class="ph">Foto dall'archivio</span></div>
    <p class="hero-tag label">Creative development — {inline(tagline)}</p>
    <h1 class="sr-only">Simone Carducci, creative development</h1>
    <ul class="hero-list">{hero_items}</ul>
    <a class="hero-down" href="#manifesto" aria-label="Scorri giù">↓</a>
  </section>

  <section class="manifesto" id="manifesto">
    <p class="h2">Simone Carducci</p>
    <p class="label manifesto-text">{inline(manifesto)}</p>
  </section>

  <section class="section" id="cultura">
    <div class="section-head">
      <h2 class="h2">{inline(field(cult, "Titolo"))}</h2>
      <p class="lead">{inline(field(cult, "Lead"))}</p>
    </div>
    <div class="grid-2">
    {"".join(cards)}
    </div>
  </section>

  <section class="band-archive" id="archivio" aria-label="{html.escape(plain(field(arch, "Eyebrow")))}">
    <div class="media" data-random-photo data-click-next title="Clicca per un'altra foto"><span class="ph">Le foto dell'archivio arrivano a breve</span></div>
    <div class="band-text">
      <p class="eyebrow">{inline(field(arch, "Eyebrow"))}</p>
      <h2 class="h2">{inline(field(arch, "Titolo"))}.</h2>
      <p class="links"><a class="link-arrow" href="archivio.html">Apri l'archivio</a><a class="link-arrow" href="{LOMO}" target="_blank" rel="noopener">Tutto su Lomography</a></p>
    </div>
  </section>

  <section class="section" id="fotografia">
    <div class="section-head">
      <h2 class="h2">{inline(field(foto, "Titolo"))}</h2>
      <p class="lead">{inline(field(foto, "Lead"))}</p>
    </div>
    <div class="stagger">{tiles}</div>
  </section>

  <section class="section" id="ai">
    <div class="section-head">
      <h2 class="h2">{inline(field(ai, "Titolo"))}</h2>
      <p class="lead">{inline(field(ai, "Lead"))}</p>
    </div>
    {ai_table(compact=True)}
    <p class="links"><a class="link-arrow" href="ai.html">Tutti i progetti con l'AI</a></p>
  </section>"""
    page(file="index.html", title=SITE, description=plain(desc), body=body, header="on-hero", main_class="flush")


def build_archive():
    c = contenuti()
    a = c[c.index("## Archivio (pagina)"):]
    body = f"""  <div class="archive">
    <div class="archive-top">
      <h1 class="eyebrow">{inline(field(a, "Titolo"))}</h1>
      <p class="lead">{inline(field(a, "Lead"))}</p>
    </div>
    <div class="archive-stage" data-random-photo data-click-next title="Clicca per un'altra foto">
      <div class="media"><span class="ph">Le foto dell'archivio arrivano a breve</span></div>
    </div>
    <div class="archive-bar">
      <span class="archive-info label" data-photo-info aria-live="polite">Clicca la foto, o premi lo spazio</span>
      <span class="actions">
        <button class="btn" type="button" data-next-photo>{inline(field(a, "Bottone"))}</button>
        <a class="link-arrow" href="{LOMO}" target="_blank" rel="noopener">Lomography</a>
      </span>
    </div>
  </div>
  <div class="contact-sheet" data-contact-sheet aria-label="Provino a contatto"></div>"""
    page(file="archivio.html", title="Archivio", description="Archivio di fotografia analogica di Simone Carducci. Una foto a caso a ogni clic.",
         body=body, current="archivio", header="dark", body_class="night")


def build_about():
    c = contenuti()
    a = c[c.index("## About"):c.index("## Archivio (pagina)")]
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
    note = draft_note(inline(" ".join(verify))) if verify else ""
    body = f"""  <section class="about-statement">
    <p class="eyebrow">About · Simone Carducci</p>
    <h1 class="display-xl">{inline(statement)}</h1>
  </section>
  <section class="about">
    <figure class="about-portrait">{img("img/about/ritratto.jpg", "Ritratto di Simone Carducci", "Ritratto in arrivo · img/about/ritratto.jpg")}<figcaption class="fig-cap label"><span>Simone Carducci</span><span>Pellicola</span></figcaption></figure>
    <div class="about-text">
      {note}
      {chr(10).join(html_blocks)}
    </div>
  </section>
  <section class="about-data">
    <dl>{"".join(f'<div><dt class="label">{k}</dt><dd class="mono">{inline(v)}</dd></div>' for k, v in rows)}</dl>
  </section>
  <section class="about-links">
    <a class="h2" href="{CV}" target="_blank">↗ CV (PDF)</a>
    <a class="h2" href="mailto:{EMAIL}">↗ Scrivimi</a>
  </section>"""
    page(file="about.html", title="About", description=plain(field(c, "Description About") or bio_short), body=body, current="about")


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
