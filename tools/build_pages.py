#!/usr/bin/env python3
"""Build the site's HTML pages from the texts in docs/.

The texts live in docs/CONTENUTI.md and docs/progetti/*.md (written by the copy team).
This script turns them into the static pages at the repository root, so that the
header, footer and layouts stay identical everywhere.

Usage:  python3 tools/build_pages.py

Phrases marked [DA VERIFICARE ...] in the docs are shown highlighted on the page,
so they are easy to spot in the preview. Remove the marker in the docs once checked.
"""
import hashlib
import json
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

SITE = "Simone Carducci"
# Site settings edited in /admin ("Impostazioni"): contacts, footer, culture and AI titles and years.
_f = ROOT / "content" / "sito.json"
SITO = __import__("json").loads(_f.read_text(encoding="utf-8")) if _f.exists() else {}
_k = SITO.get("contatti", {})
EMAIL = _k.get("email") or "simone.carducci01@gmail.com"
INSTAGRAM = _k.get("instagram") or "https://instagram.com/simonecarduccii"
LOMO = _k.get("lomography") or "https://www.lomography.com/homes/simonecarduccii"
LINKEDIN = _k.get("linkedin") or None  # the footer shows LinkedIn only once this is set
# Pages switched to "in costruzione" in /admin: they keep header and footer, the content is replaced by a notice.
BUILDING = {s for s in SITO.get("in_costruzione", []) if isinstance(s, str) and s != "index"}
FOOT = {"copyright": "© 2025-2026 Simone Carducci. Tutti i diritti riservati.", "credito": "Developed by me",
        "piva": "P.Iva 18337621009", **{k: v for k, v in SITO.get("footer", {}).items() if isinstance(v, str)}}
CV = "assets/cv-simone-carducci.pdf"
CREDITS_DEFAULT = "FOTOGRAFIE E TESTO: SIMONE CARDUCCI · [ANNO] · © [ANNO] SIMONE CARDUCCI. TUTTI I DIRITTI RISERVATI."
CREDITS = SITO["crediti"] if isinstance(SITO.get("crediti"), str) else CREDITS_DEFAULT
# Global style from /admin -> Impostazioni -> Stile (content/sito.json "stile"); empty = the Figma design.
# Only fonts that have 400-700 and an italic 400 on Google Fonts, so the same weights load for each.
FONT_CHOICES = ["Hanken Grotesk", "Inter", "Work Sans", "DM Sans", "Instrument Sans", "Public Sans"]  # list agreed with 1 · Designer
STYLE = SITO.get("stile") if isinstance(SITO.get("stile"), dict) else {}
FONT = STYLE.get("font") if STYLE.get("font") in FONT_CHOICES else "Hanken Grotesk"
FONTS = f"https://fonts.googleapis.com/css2?family={FONT.replace(' ', '+')}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
STYLE_COLORS = {"sfondo": "--paper", "testo": "--ink", "testo_secondario": "--ink-2", "linee": "--rule",
                "footer_sfondo": "--footer-bg"}
SPACE_VARS = ("--pad", "--space-section", "--space-stagger", "--gutter", "--pad-band", "--pad-grid", "--pad-header")


def _scale(value, k):
    """'clamp(30px, 4.1vw, 56px)' * k -> every px / vw number scaled."""
    return re.sub(r"(\d+(?:\.\d+)?)(px|vw)", lambda m: f"{round(float(m.group(1)) * k, 2):g}{m.group(2)}", value)


def _pct(v, lo, hi):
    try:
        v = float(v)
    except (TypeError, ValueError):
        return None
    return v / 100 if lo <= v <= hi and v != 100 else None


def style_overrides():
    """The :root variables that /admin changes, '' when the style is the Figma one."""
    root = (ROOT / "assets" / "style.css").read_text(encoding="utf-8")
    base = dict(re.findall(r"^\s*(--[\w-]+):\s*([^;]+);", root.split("}", 1)[0], re.M))
    out = []
    if FONT != "Hanken Grotesk":
        out.append(f'--font-sans: "{FONT}", "Helvetica Neue", Arial, sans-serif')
    for key, var in STYLE_COLORS.items():
        c = (STYLE.get("colori") or {}).get(key) if isinstance(STYLE.get("colori"), dict) else None
        if isinstance(c, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", c.strip()):
            out.append(f"{var}: {c.strip().lower()}")
    k = _pct(STYLE.get("testo"), 85, 125)
    if k:
        out += [f"{v}: {_scale(base[v], k)}" for v in base if v.startswith("--fs-")]
    k = _pct(STYLE.get("spazi"), 75, 150)
    if k:
        out += [f"{v}: {_scale(base[v], k)}" for v in SPACE_VARS if v in base]
    return f"\n<style>:root {{ {'; '.join(out)}; }}</style>" if out else ""


STYLE_CSS = style_overrides()
THEME = next((c.strip().lower() for c in [((STYLE.get("colori") or {}) if isinstance(STYLE.get("colori"), dict) else {}).get("sfondo")]
              if isinstance(c, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", c.strip())), "#fbfbfb")

CULTURE = [
    {"slug": "boheme", "doc": "boheme-magazine", "title": "Bohème Magazine", "year": "2024", "home_year": "since 2023"},
    {"slug": "modi", "doc": "colectivo-modi", "title": "Colectivo modì", "year": "2026", "home_year": "2025-2026"},
]
AI = [
    {"key": "vedetta", "slug": "vedetta", "doc": "ai-boheme-vedetta", "title": "Bohème Vedetta",
     "what": "Trova, legge e verifica i bandi per artisti.", "year": "2026", "status": "Attivo"},
    {"key": "coaching", "slug": "coaching", "doc": "ai-coaching-corsa", "title": "Running Coach",
     "what": "Prepara e corregge il mio piano di corsa, io approvo.", "year": "2026", "status": "In sviluppo"},
    {"key": "lettura", "slug": None, "title": "Lettura",
     "what": "Uno strumento di lettura per una persona della mia famiglia.", "year": "2026", "status": "private"},
]
# same keys in content/sito.json (Italian names, as in /admin)
for _p in CULTURE:
    for _a, _b in (("titolo", "title"), ("anno", "year"), ("anno_home", "home_year")):
        _v = SITO.get("cultura", {}).get(_p["slug"], {}).get(_a)
        if isinstance(_v, str) and _v.strip():
            _p[_b] = _v.strip()
for _p in AI:
    for _a, _b in (("titolo", "title"), ("cosa", "what"), ("anno", "year"), ("stato", "status")):
        _v = SITO.get("ai", {}).get(_p["key"], {}).get(_a)
        if isinstance(_v, str) and _v.strip() and (_p["slug"] or _b != "status"):  # private tools keep their badge
            _p[_b] = _v.strip()
# Home "Ricerca visiva": order, visibility, title and year of each photo project, edited in /admin.
HOME = __import__("json").loads((ROOT / "content" / "home.json").read_text(encoding="utf-8"))
RESEARCH = HOME["ricerca_visiva"]
ON = HOME.get("sezioni", {})  # home sections switched on/off in /admin; missing = on
# Order of the home sections under the hero, edited in /admin; unknown keys are dropped, missing ones go last.
HOME_SECTIONS = ["pellicole", "ricerca-visiva", "ia", "banda-archivio"]
ORDER = [k for k in HOME.get("ordine", []) if k in HOME_SECTIONS]
ORDER += [k for k in HOME_SECTIONS if k not in ORDER]


def on(key):
    return ON.get(key, True) is not False
# Photo projects ("Ricerca visiva"): every entry of content/home.json with a page and a sheet in docs/progetti/
# gets its page, in the home order, with one name everywhere (home card, page title, "Altri progetti").
# New projects are created (and deleted) in /admin.
def project_year(r):
    """Year of a photo project: the page's own "Anno" (edited in /admin), else the home list value."""
    if r.get("pagina"):
        f = ROOT / "docs" / "progetti" / f'{r["pagina"]}.md'
        if f.exists():
            m = re.search(r"^- \*\*Anno:\*\*\s*(.+)$", f.read_text(encoding="utf-8"), re.M)
            if m and m.group(1).strip():
                return m.group(1).strip()
    return r.get("anno", "")


PHOTO = [{"slug": r["pagina"], "title": r["titolo"], "year": project_year(r)} for r in RESEARCH
         if r.get("pagina") and (ROOT / "docs" / "progetti" / f'{r["pagina"]}.md').exists()]

PHOTO_SLOTS = 12  # sequence slots per photo project; missing files are hidden by main.js


LAYOUTS = ("colonna", "alternato", "griglia", "grande", "ritmo")  # same list as admin/admin.js


def mine():
    """Layouts Simone generated in /admin and kept: content/layout/_layouts.json [{id, name, schema}]."""
    f = ROOT / "content" / "layout" / "_layouts.json"
    return {l["id"]: l for l in __import__("json").loads(f.read_text(encoding="utf-8"))} if f.exists() else {}


def schema_of(lay):
    """Rows of [start column, width] on 12 columns for a random or saved layout, else None."""
    sc = lay.get("schema") if lay.get("layout") == "casuale" else mine().get(lay.get("layout"), {}).get("schema")
    ok = isinstance(sc, list) and sc and all(isinstance(r, list) and r and all(
        isinstance(c, list) and len(c) == 2 and all(isinstance(v, int) for v in c) and 1 <= c[0] and c[1] >= 1 and c[0] + c[1] <= 13
        for c in r) for r in sc)
    return sc if ok else None


def grid_places(schema, n):
    out, r = [], 0
    while len(out) < n:
        for s, w in schema[r % len(schema)]:
            if len(out) < n:
                out.append((s, w, r + 1))
        r += 1
    return out


def layout(slug):
    """Layout chosen in /admin for a photo page, content/layout/<slug>.json:
    {"copertina": false} hides the big cover; "layout" is one of LAYOUTS (default: colonna)."""
    f = ROOT / "content" / "layout" / f"{slug}.json"
    return __import__("json").loads(f.read_text(encoding="utf-8")) if f.exists() else {}



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


def header_parts():
    """Name, subtitle and menu of the header, as edited in /admin -> Header e footer ("testata" in sito.json)."""
    t = SITO.get("testata") if isinstance(SITO.get("testata"), dict) else {}
    menu = _rows(t.get("menu"))
    menu = [(_str(r.get("testo")), _str(r.get("link"))) for r in menu if _str(r.get("testo"))] if menu is not None \
        else [(label, href) for label, href, _ in NAV]
    tag = t.get("sottotitolo") if isinstance(t.get("sottotitolo"), str) else "Creative development"
    return _str(t.get("nome")) or "Simone Carducci", tag.strip(), menu
# kept for the footer of older layouts
SECTIONS = [("Cultura", "index.html#cultura"), ("Archivio", "archivio.html"), ("Ricerca visiva", "index.html#ricerca-visiva"),
            ("AI", "ai.html"), ("About", "about.html")]


def asset_version(name):
    """Short content hash, so browsers fetch the new CSS/JS after every change."""
    data = (Path(__file__).resolve().parent.parent / "assets" / name).read_bytes()
    return hashlib.sha1(data).hexdigest()[:8]


_MEDIA_V = {}
MEDIA_REF = re.compile(r'="((?:img|media)/[^"?#]+\.(?:jpe?g|png|webp|gif|svg|mp4|webm|mov|m4v))"', re.I)


def version_media(markup):
    """Photos keep their file name when they are replaced (img/about/ritratto.jpg): a content hash in the URL
    makes browsers fetch the new photo instead of showing the old one from their cache."""
    def add(m):
        path = m.group(1)
        if path not in _MEDIA_V:
            f = ROOT / path
            _MEDIA_V[path] = hashlib.sha1(f.read_bytes()).hexdigest()[:8] if f.is_file() else None
        return f'="{path}?v={_MEDIA_V[path]}"' if _MEDIA_V[path] else m.group(0)
    return MEDIA_REF.sub(add, markup)


def building(title):
    return f"""  <p class="eyebrow">Pagina in costruzione</p>
  <h1 class="p-title">{html.escape(title)}</h1>
  <p>Ci sto ancora lavorando: torna a trovarmi presto.</p>
  <p class="links"><a class="link-arrow" href="./">Torna alla home</a></p>"""


# SEO and sharing from /admin (content/seo.json): {"<page>": {titolo, descrizione, immagine}}; empty = automatic.
SITE_URL = "https://bohememag.it/simonecarducci/"
_seo_f = ROOT / "content" / "seo.json"
try:
    SEO = json.loads(_seo_f.read_text(encoding="utf-8")) if _seo_f.is_file() else {}
except ValueError:
    SEO = {}


def share_image(key):
    """Photo shown when the page is shared: chosen in /admin, else the page cover, else the home hero."""
    chosen = _str((SEO.get(key) or {}).get("immagine")) if isinstance(SEO.get(key), dict) else ""
    for src in [chosen, f"img/{key}/cover.jpg", f"img/{CULTURE[0]['slug']}/cover.jpg"]:
        if src and re.fullmatch(r"img/[\w./-]+\.(jpe?g|png|webp)", src) and "/../" not in src and exists(src):
            return SITE_URL + src
    return ""


# Browser tab (/admin -> Impostazioni -> Scheda del browser): home title in content/sito.json "scheda.titolo",
# icon uploaded as content/icona/icona.png (square PNG); without it the black SC monogram in assets/.
_tab = SITO.get("scheda") if isinstance(SITO.get("scheda"), dict) else {}
HOME_TITLE = (_tab.get("titolo") or "").strip() if isinstance(_tab.get("titolo"), str) else ""
HOME_TITLE = HOME_TITLE or f"{SITE} — Creative Development"


def icon_links(prefix=""):
    custom = ROOT / "content" / "icona" / "icona.png"
    if custom.is_file():
        v = hashlib.sha1(custom.read_bytes()).hexdigest()[:8]
        src = f"{prefix}content/icona/icona.png?v={v}"
        return (f'<link rel="icon" href="{src}" type="image/png">\n'
                f'<link rel="apple-touch-icon" href="{src}">')
    return (f'<link rel="icon" href="{prefix}assets/favicon.svg?v={asset_version('favicon.svg')}" type="image/svg+xml">\n'
            f'<link rel="icon" href="{prefix}assets/favicon-32.png?v={asset_version('favicon-32.png')}" type="image/png" sizes="32x32">\n'
            f'<link rel="apple-touch-icon" href="{prefix}assets/apple-touch-icon.png?v={asset_version('apple-touch-icon.png')}">')


# Characters people type to "leave a field empty" in /admin (Hangul filler, zero-width, braille blank, nbsp).
_INVISIBLE = "\u3164\u115f\u1160\u200b\u200c\u200d\u2060\ufeff\u2800\u00a0"
_EMPTY_TEXT = re.compile(r'<(p|h2|h3|figcaption|blockquote|dd|dt|span class="[^"]*")(?:\s[^>]*)?>[\s' + _INVISIBLE + r']*</(?:p|h2|h3|figcaption|blockquote|dd|dt|span)>')
_EMPTY_BOX = re.compile(r'<(div|section|figure|dl) class="(?:photo-intro|photo-text[^"]*|prose|credits[^"]*|quote|p-facts-wrap|p-facts|fact)"[^>]*>\s*</(?:div|section|figure|dl)>')


def drop_empty(out):
    """Remove text blocks left empty in /admin, and the boxes around them, so no blank gap stays on the page."""
    out = re.sub("[" + _INVISIBLE + "]+(?=\\s*<)", "", out)
    prev = None
    while prev != out:
        prev = out
        out = _EMPTY_TEXT.sub("", out)
        out = _EMPTY_BOX.sub("", out)
    return out


def page(*, file, title, description, body, current=None, header="", body_class="", main_class=""):
    robots = ""
    key = file[:-5]
    seo = SEO.get(key) if isinstance(SEO.get(key), dict) else {}
    description = _str(seo.get("descrizione")) or description
    image = share_image(key)
    if file[:-5] in BUILDING:
        body, header, main_class = building(title), "", "notfound"
        robots = '\n<meta name="robots" content="noindex">'
    full_title = f"{title} — {SITE}" if title != SITE else HOME_TITLE
    full_title = _str(seo.get("titolo")) or full_title
    url = SITE_URL + ("" if key == "index" else file)
    header_name, header_tag, header_menu = header_parts()
    nav = "".join(
        f'<a{_link_attrs(href)}{" aria-current=\"page\"" if href.replace(".html", "") == current else ""}>{html.escape(label)}</a>'
        for label, href in header_menu)
    hc = " ".join(c for c in ["site-header", header] if c)
    out = f"""<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(full_title)}</title>
<meta name="description" content="{html.escape(description)}">{robots}
<meta property="og:title" content="{html.escape(full_title)}">
<meta property="og:description" content="{html.escape(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<link rel="canonical" href="{url}">{f"""
<meta property="og:image" content="{html.escape(image)}">
<meta name="twitter:card" content="summary_large_image">""" if image else ""}
<meta name="theme-color" content="{THEME}">
{icon_links()}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS}" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css?v={asset_version('style.css')}">{STYLE_CSS}
</head>
<body{f' class="{body_class}"' if body_class else ""}>
<a class="skip" href="#main">Vai al contenuto</a>
<header class="{hc}">
  <a class="brand" href="index.html">{html.escape(header_name)}</a>
  {f'<span class="tag">{html.escape(header_tag)}</span>' if header_tag else ""}
  <nav class="nav" aria-label="Menu principale">{nav}</nav>
</header>

<main id="main"{f' class="{main_class}"' if main_class else ""}>
{body}
</main>
{footer()}
<script src="assets/main.js?v={asset_version('main.js')}"></script>
</body>
</html>
"""
    (ROOT / file).write_text(version_media(drop_empty(out)), encoding="utf-8")
    print("wrote", file)


def _link_attrs(link):
    """href (+ new tab for other sites) of a link typed in /admin: https://..., a page, a mail, @name."""
    href = fact_href(link)
    if not href:
        return ""
    local = href.endswith(".html") or ".html#" in href or href.startswith(("/", "#", "mailto:", "tel:", "assets/"))
    blank = "" if local and not href.endswith(".pdf") else ' target="_blank"' + ("" if href.endswith(".pdf") else ' rel="noopener"')
    return f' href="{html.escape(href)}"{blank}'


def _link(text, link, cls=""):
    c = f' class="{cls}"' if cls else ""
    attrs = _link_attrs(link)
    return f"<a{c}{attrs}>{html.escape(text)}</a>" if attrs else f"<span{c}>{html.escape(text)}</span>"


# /admin -> Header e footer (content/sito.json "testata" and "footer"): missing = the design below.
def _rows(v):
    return [r for r in v if isinstance(r, dict)] if isinstance(v, list) else None


def footer_columns():
    cols = _rows(SITO.get("footer", {}).get("colonne"))
    if cols is not None:
        return [(_str(c.get("titolo")), [(_str(r.get("testo")), _str(r.get("link"))) for r in _rows(c.get("voci")) or []]) for c in cols]
    altrove = [("Instagram", INSTAGRAM), ("Lomography", LOMO)] + ([("LinkedIn", LINKEDIN)] if LINKEDIN else [])
    sezioni = [("Cultura", "index.html#cultura"), ("Ricerca visiva", "index.html#ricerca-visiva")] + \
        ([] if "archivio" in BUILDING else [("Archivio", "archivio.html")]) + [("About", "about.html")]
    return [("Contatti", [(EMAIL, f"mailto:{EMAIL}")]), ("Altrove", altrove), ("Sezioni", sezioni), ("CV", [("Scarica il CV (PDF)", CV)])]


def footer():
    f = SITO.get("footer", {})
    cta = f.get("invito") if isinstance(f.get("invito"), str) else "Scrivimi"
    cta_link = _str(f.get("invito_link")) or f"mailto:{EMAIL}"
    big = f.get("indirizzo") if isinstance(f.get("indirizzo"), str) else EMAIL
    big_link = _str(f.get("indirizzo_link")) or (f"mailto:{big}" if "@" in big else "")
    cols = []
    for title, rows in footer_columns():
        items = "".join(f"<li>{_link(t, l, 'lower' if '@' in t else 'ig' if t.lower() == 'instagram' else '')}</li>" for t, l in rows if t)
        if title or items:
            cols.append(f"    <div><h2>{html.escape(title)}</h2><ul>{items}</ul></div>")
    return f"""<footer class="site-footer" id="footer">
  {_link(cta, cta_link, "footer-cta") if cta.strip() else ""}
  {_link(big, big_link, "footer-email") if big.strip() else ""}
  <div class="footer-cols">
{chr(10).join(cols)}
  </div>
  <div class="footer-legal">{"".join(f"<span>{html.escape(FOOT[k])}</span>" for k in ("copyright", "credito", "piva") if FOOT[k].strip())}</div>
</footer>"""


def band_color():
    next_btn = chev("button", ' type="button" data-band-next aria-label="Un\'altra foto a caso"')
    # While the archive is offline the two archive labels point to Lomography like the rest of the band.
    arch = f'href="{LOMO}" target="_blank" rel="noopener"' if "archivio" in BUILDING else 'href="archivio.html"'
    return f"""  <section class="band band-color">
    <div class="media has-photo" data-random-photo data-keep><img src="img/home/pellicole.jpg" alt="Fotografia a colori su pellicola di Simone Carducci" loading="lazy"{focus("img/home/pellicole.jpg")}></div>
    <a class="band-link" href="{LOMO}" target="_blank" rel="noopener" aria-label="Tutte le mie pellicole su Lomography"></a>
    <ul class="band-list">
      <li><a {arch}>Tutto ciò che mi sta intorno</a></li>
      <li><a href="{LOMO}" target="_blank" rel="noopener">Tutte le mie pellicole</a></li>
      <li><a {arch}>Tutta la mia vita</a></li>
    </ul>
    {next_btn}
  </section>"""


def band_archive():
    if "archivio" in BUILDING or not on("banda-archivio"):
        return ""
    # The whole photo band is one link to the archive.
    return f"""  <a class="band band-bw" href="archivio.html">
    <div class="media bw has-photo"><img src="img/home/archivio.jpg" alt="" loading="lazy"{focus("img/home/archivio.jpg")}></div>
    <span class="band-text">Archivio</span>
    {chev()}
  </a>"""


def chev(tag="span", attrs=' aria-hidden="true"'):
    svg = '<svg viewBox="0 0 9 43" width="9" height="43" aria-hidden="true"><path d="M.5.5l8 21-8 21" fill="none" stroke="currentColor"/></svg>'
    return f'<{tag} class="chev"{attrs}>{svg}</{tag}>'


_FILM = ["", " f-b", " f-c", " f-d"]
_film_i = [0]


def exists(src):
    """True when a local photo is on disk (external URLs count as present)."""
    return "://" in src or (ROOT / src).is_file()


def _load_foci():
    f = ROOT / "content" / "fuochi.json"
    try:
        data = json.loads(f.read_text(encoding="utf-8")) if f.is_file() else {}
    except ValueError:
        data = {}
    out = {}
    for k, v in data.items():
        if isinstance(v, list) and len(v) == 2 and all(isinstance(x, (int, float)) for x in v):
            out[k] = (max(0, min(100, round(v[0]))), max(0, min(100, round(v[1]))))
    return out


FOCI = _load_foci()  # photo -> focal point in %, set in /admin -> Libreria foto


def focus(src):
    """' style="object-position: x% y%"' for a photo with a focal point (where a cropped photo stays centred)."""
    p = FOCI.get(src)
    return f' style="object-position: {p[0]}% {p[1]}%"' if p and p != (50, 50) else ""


def img(src, alt, label=None, eager=False):
    # No photo yet: leave the space blank, no placeholder texture or label (Simone, 2026-11-11).
    if not exists(src):
        return '<div class="media empty"></div>'
    loading = "" if eager else ' loading="lazy"'
    film = _FILM[_film_i[0] % 4]
    _film_i[0] += 1
    return (f'<div class="media{film}">'
            f'<img src="{src}" alt="{html.escape(alt)}"{loading}{focus(src)} onerror="this.remove()"></div>')


def facts(meta, skip=()):
    items = []
    for k, v in meta.items():
        if k in skip or k.startswith("Immagine"):
            continue
        items.append(f'<div class="fact"><dt>{html.escape(k)}</dt><dd>{inline(v)}</dd></div>')
    return '<dl class="p-facts">' + "".join(items) + "</dl>"


def fact_href(link):
    """Link of a facts row as typed in /admin: https://..., a page (boheme.html), a mail, or @name (Instagram)."""
    link = link.strip()
    if not link:
        return ""
    if link.startswith("@") and " " not in link:
        return f"https://instagram.com/{link[1:]}"
    if re.match(r"^(https?:|mailto:|tel:|/|#|assets/|img/|media/)", link) or re.match(r"^[\w-]+\.html(#.*)?$", link):
        return link
    if "@" in link and "/" not in link:
        return f"mailto:{link}"
    return "https://" + link


def fact_rows_html(rows):
    """rows: [(label, value, link)] -> <dl class="p-facts">; a value with a link becomes a link."""
    items = []
    for k, v, link in rows:
        if not (k or v):
            continue
        items.append(f'<div class="fact"><dt>{html.escape(k)}</dt><dd>{fact_value_html(v, link)}</dd></div>')
    return '<dl class="p-facts">' + "".join(items) + "</dl>" if items else ""


def sheet_rows(slug):
    """Rows [(label, value, link)] of the facts at the top of a page as edited in /admin
    (content/schede/<slug>.json), or None if the page has never been edited there."""
    f = ROOT / "content" / "schede" / f"{slug}.json"
    if not f.is_file():
        return None
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
    except ValueError:
        return None
    return [(_str(r.get("etichetta")), _str(r.get("valore")), _str(r.get("link")))
            for r in data.get("righe") or [] if isinstance(r, dict)]


def sheet_override(slug):
    """Facts at the top of a page as edited in /admin, as HTML, or None."""
    rows = sheet_rows(slug)
    return None if rows is None else fact_rows_html(rows)


def fact_value_html(v, link):
    val = inline(v)
    href = fact_href(link)
    if href:
        ext = "" if href.endswith(".html") or ".html#" in href or href.startswith(("/", "#", "mailto:", "tel:")) else ' target="_blank" rel="noopener"'
        val = f'<a href="{html.escape(href)}"{ext}>{val or html.escape(link)}</a>'
    return val


VIDEO_FILE = re.compile(r"media/[a-z0-9][a-z0-9-]*/[\w.-]+\.(mp4|webm|mov|m4v)")


def video_embed(src):
    """YouTube / Vimeo link -> embeddable player URL (YouTube without cookies), else None."""
    m = re.search(r"(?:youtube\.com/(?:watch\?(?:.*&)?v=|shorts/|embed/|live/)|youtu\.be/)([\w-]{6,})", src)
    if m:
        return f"https://www.youtube-nocookie.com/embed/{m.group(1)}"
    m = re.search(r"vimeo\.com/(?:video/|channels/[\w-]+/)?(\d+)", src)
    if m:
        return f"https://player.vimeo.com/video/{m.group(1)}"
    return None


def video_html(src, title):
    """A video set in /admin: a YouTube/Vimeo link or a file uploaded to media/<page>/; "" if neither."""
    src = (src or "").strip() if isinstance(src, str) else ""
    e = video_embed(src)
    if e:
        return (f'<div class="video"><iframe src="{html.escape(e)}" title="{html.escape(title)}" loading="lazy" '
                f'allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>')
    if VIDEO_FILE.fullmatch(src) and exists(src):
        return f'<div class="video file"><video src="{src}" controls playsinline preload="metadata" aria-label="{html.escape(title)}"></video></div>'
    return ""


def back(fallback):
    """Small back arrow before a project title: previous page, or the home section if opened directly."""
    return (f'<a class="back-link" href="{fallback}" aria-label="Torna indietro" '
            f'onclick="if (document.referrer.indexOf(location.host) > -1) {{ history.back(); return false; }}">&larr;</a>')


def draft_note(text=""):
    # Internal notes (placeholder texts, facts to verify) stay in docs/, never on the site (Simone, 2026-11-11).
    return ""


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


_IG = re.compile(r"https?://(?:www\.)?instagram\.com/(?:[\w.]+/)?(p|reel|tv)/([\w-]+)")


def instagram_posts(slug):
    """Instagram posts under a culture page: content/instagram/<slug>.json
    {"titolo": "Su Instagram", "post": [{"url": "https://www.instagram.com/p/…/", "immagine": "img/<slug>/ig-01.jpg", "testo": ""}]}.
    A post with its own image is a tile linking to Instagram; without one it is Instagram's embed of the post."""
    f = ROOT / "content" / "instagram" / f"{slug}.json"
    if not f.is_file():
        return ""
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
    except ValueError:
        return ""
    items = []
    for post in data.get("post", []):
        url = str(post.get("url", "")).strip()
        m = _IG.match(url)
        if not m or post.get("visibile") is False:
            continue
        kind, code = m.groups()
        link = f"https://www.instagram.com/{kind}/{code}/"
        text = str(post.get("testo", "")).strip()
        pic = str(post.get("immagine", "")).strip()
        if pic and exists(pic):
            items.append(f'<a class="ig-post" href="{link}" target="_blank" rel="noopener">'
                         f'<div class="media"><img src="{pic}" alt="{html.escape(text or "Post su Instagram")}" loading="lazy"{focus(pic)}></div>'
                         f'<span class="ig-caption">{html.escape(text) or "Apri su Instagram"} &#8599;</span></a>')
        else:
            items.append(f'<div class="ig-post ig-embed"><iframe src="https://www.instagram.com/{kind}/{code}/embed/" title="{html.escape(text or "Post su Instagram")}" loading="lazy" scrolling="no" allowtransparency="true"></iframe>'
                         + (f'<span class="ig-caption">{html.escape(text)}</span>' if text else "") + '</div>')
    if not items:
        return ""
    title = str(data.get("titolo", "")).strip() or "Su Instagram"
    return (f'<section class="ig-posts" aria-label="{html.escape(title)}"><h2 class="small-title">{html.escape(title)}</h2>'
            f'<div class="ig-grid">{"".join(items)}</div></section>')


def _video_items(raw, fallback):
    """[{"src": embed url or local file, "title": text}] from a list of {"url", "testo"} set in /admin."""
    out = []
    for v in raw or []:
        if not isinstance(v, dict):
            continue
        url, text = _str(v.get("url")), _str(v.get("testo"))
        src = video_embed(url) or (url if VIDEO_FILE.fullmatch(url) and exists(url) else None)
        if src:
            out.append({"src": src, "title": plain(text) or fallback})
    return out


def _numbered(d):
    return sorted((x for x in d.glob("[0-9][0-9]*.jpg") if x.stem.isdigit()), key=lambda x: int(x.stem)) if d.is_dir() else []


def event_categories(slug):
    """content/locandine/<slug>.json {"dimensione", "categorie": [{"nome", "cartella", "video": [{"url", "testo"}], "scarica"}]}
    with what is on disk: posters img/<slug>/<cartella>/01.jpg ..., event photos img/<slug>/<cartella>/foto/01.jpg ..."""
    f = ROOT / "content" / "locandine" / f"{slug}.json"
    if not f.is_file():
        return {}, []
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
    except ValueError:
        return {}, []
    cats = []
    for cat in data.get("categorie") or []:
        if not isinstance(cat, dict):
            continue
        name, folder = _str(cat.get("nome")), _str(cat.get("cartella"))
        if not folder or "/" in folder or ".." in folder:
            continue
        base = f"img/{slug}/{folder}"
        cats.append({"name": name, "folder": folder, "base": base, "scarica": cat.get("scarica") is not False,
                     "posters": _numbered(ROOT / base), "photos": [f"{base}/foto/{x.name}" for x in _numbered(ROOT / base / "foto")],
                     "videos": _video_items(cat.get("video"), name or "Video")})
    return data, cats


def _random_player(videos, cls=""):
    """One video at a time: the page picks one at random (assets/main.js), "Un altro video" picks another."""
    first = videos[0]
    more = '<button type="button" class="vr-next">Un altro video &#8635;</button>' if len(videos) > 1 else ""
    if first["src"].startswith("http"):
        player = (f'<div class="video"><iframe src="{html.escape(first["src"])}" title="{html.escape(first["title"])}" loading="lazy" '
                  f'allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>')
    else:
        player = f'<div class="video file"><video src="{first["src"]}" controls playsinline preload="metadata"></video></div>'
    return (f'<div class="video-random{cls}" data-videos="{html.escape(json.dumps(videos, ensure_ascii=False))}">{player}'
            f'<div class="vr-foot"><p class="vr-caption">{html.escape(first["title"])}</p>{more}</div></div>')


def page_videos(slug):
    """The video section under a culture page: the videos of content/video/<slug>.json {"titolo", "video": [{"url", "testo"}]}
    and those of every event category, one at a time, picked at random; no videos = no section."""
    f = ROOT / "content" / "video" / f"{slug}.json"
    data = {}
    if f.is_file():
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except ValueError:
            data = {}
    videos = _video_items(data.get("video"), "Video")
    for cat in event_categories(slug)[1]:
        videos += cat["videos"]
    if not videos:
        return ""
    title = _str(data.get("titolo")) or "Video"
    return (f'<section class="page-videos" aria-label="{html.escape(title)}"><h2 class="small-title">{html.escape(title)}</h2>'
            f'{_random_player(videos)}</section>')


def poster_rows(slug):
    """Event posters: one row with a deck of cards per category (arrows or a swipe bring the poster behind to the front),
    centred in its column; under each deck the download link and the "Foto" / "Video" buttons of that event, which open
    a window with its photos (one at a time) or one of its videos at random. A category without posters has no deck."""
    data, cats = event_categories(slug)
    decks = []
    for cat in cats:
        posters, name, base, folder = cat["posters"], cat["name"], cat["base"], cat["folder"]
        if not posters:
            continue
        n = len(posters)

        def download(x):
            # print-quality original sent from /admin (stampa/...), else the web version
            raw = next((f"stampa/{slug}/{folder}/{x.stem}{e}" for e in (".jpg", ".png") if (ROOT / "stampa" / slug / folder / f"{x.stem}{e}").is_file()), f"{base}/{x.name}")
            return raw, f"{slug}-{folder}-{x.stem}{Path(raw).suffix}"

        dl = [download(x) for x in posters]
        cards = "".join(
            f'<figure class="card{" far" if k > 3 else ""}" style="--d: {k}" data-dl="{dl[k][0]}" data-name="{dl[k][1]}"{"" if k == 0 else " aria-hidden=\"true\""}>'
            f'{img(f"{base}/{x.name}", f"{name}, locandina {k + 1}")}</figure>' for k, x in enumerate(posters))
        nav = ("" if n < 2 else
               f'<div class="poster-nav"><button type="button" data-step="-1" aria-label="Locandina precedente">&larr;</button>'
               f'<span class="poster-count" aria-live="polite">1 / {n}</span>'
               f'<button type="button" data-step="1" aria-label="Locandina successiva">&rarr;</button></div>')
        link = ("" if not cat["scarica"] else
                f'<a class="poster-dl" href="{dl[0][0]}" download="{dl[0][1]}">Scarica<span class="dl-long"> la locandina</span> &darr;</a>')
        photos = json.dumps([{"src": p, "alt": f"{name}, foto {k}"} for k, p in enumerate(cat["photos"], 1)], ensure_ascii=False)
        buttons = "".join([
            f'<button type="button" class="ev-btn" data-kind="foto" data-title="{html.escape(name)}" data-items="{html.escape(photos)}">Foto</button>' if cat["photos"] else "",
            f'<button type="button" class="ev-btn" data-kind="video" data-title="{html.escape(name)}" data-items="{html.escape(json.dumps(cat["videos"], ensure_ascii=False))}">Video</button>' if cat["videos"] else ""])
        decks.append(f'<div class="deck-col"><h2 class="small-title">{html.escape(name)}</h2>'
                     f'<div class="deck" tabindex="0" style="--n: {n}" aria-label="{html.escape(name)}: locandine, frecce per sfogliare">{cards}</div>'
                     f'<div class="deck-foot">{nav}{link}</div>'
                     + (f'<div class="ev-btns">{buttons}</div>' if buttons else "") + "</div>")
    if not decks:
        return ""
    # poster size from /admin: "dimensione" piccole / medie / grandi = max width of each deck
    width = {"piccole": 220, "medie": 300, "grandi": 420}.get(_str(data.get("dimensione")), 300)
    dialog = ('<dialog class="ev-dialog" aria-label="Foto e video dell\'evento"><div class="ev-dialog-head"><p class="ev-dialog-title">Evento</p>'
              '<button type="button" class="ev-close" aria-label="Chiudi">&times;</button></div><div class="ev-dialog-body"></div></dialog>')
    return (f'<section class="poster-cats" aria-label="Eventi"><div class="deck-row" style="--cols: {len(decks)}; --deck-w: {width}px">'
            f'{"".join(decks)}</div>{dialog}</section>')


def page_gallery(slug, title):
    """The photos of "Foto della pagina" in /admin (img/<slug>/01.jpg ...), as a "Galleria" of five columns, plus the event
    photos of categories that have no posters (so they have no "Foto" button); none = no section."""
    photos = [f"img/{slug}/{n:02d}.jpg" for n in range(1, slots(slug, 0) + 1) if exists(f"img/{slug}/{n:02d}.jpg")]
    for cat in event_categories(slug)[1]:
        if not cat["posters"]:
            photos += cat["photos"]
    if not photos:
        return ""
    return ('<section class="page-gallery" aria-label="Galleria"><h2 class="small-title">Galleria</h2><div class="gallery-grid">'
            + "".join(img(src, f"{title}, foto {k}") for k, src in enumerate(photos, 1)) + "</div></section>")


def build_culture(i, p):
    meta, notes, secs = parse_sheet(p["doc"])
    nxt = CULTURE[(i + 1) % len(CULTURE)]
    lead = first_text(section(secs, "In breve"))
    facts_html, paras = mockup_sheet(section(secs, "Testo pagina"))
    if not facts_html:
        facts_html = facts(meta)
    override = sheet_override(p["slug"])
    if override is not None:
        facts_html = override
    s = p["slug"]
    body = f"""  <section class="p-hero bw">
    {img(f"img/{s}/cover.jpg", p["title"], eager=True)}
  </section>
  <div class="p-title-row">{back("index.html#cultura")}<h1 class="p-title">{html.escape(p["title"])}<sup class="yr">{html.escape(p["year"])}</sup></h1></div>
  <div class="p-facts-wrap">{facts_html}</div>
  <section class="p-body">
    {draft_note() if "DA VERIFICARE" in " ".join(paras) else ""}
    <div class="prose">
{chr(10).join(f"<p>{inline(x)}</p>" for x in paras)}
    </div>
  </section>
  {poster_rows(s)}
  {instagram_posts(s)}
  {page_videos(s)}
  {page_gallery(s, p["title"])}
  <a class="next-project" href="{nxt["slug"]}.html"><span>Progetto successivo</span><span>{html.escape(nxt["title"])} ›</span></a>
{band_archive()}"""
    page(file=f"{s}.html", title=p["title"], description=plain(lead), body=body, header="overlay", main_class="flush")


def grid_spot(spots, n):
    if not spots:
        return ""
    s, w, r = spots[n - 1]
    return f' style="--c: {s} / span {w}; --r: {r}"'


def build_photo(i, p):
    meta, notes, secs = parse_sheet(p["slug"])
    s = p["slug"]
    intro = first_text(section(secs, "Intro"))
    long_text = section(secs, "Testo")
    credits = first_text(section(secs, "Crediti"))
    place = strip_verify(meta.get("Luogo", ""))
    year = re.sub(r"\s*[–—]\s*", " - ", meta.get("Anno", p["year"]))  # short hyphen, as typed in /admin
    # label before the year: content/sito.json "etichette" {"ricerca_visiva": …}; empty = just the year
    label = str(SITO.get("etichette", {}).get("ricerca_visiva", "Ricerca visiva")).strip()
    meta_lines = [x for x in [place, f"{label}: {year}" if label else year] if x]
    # credits: the project's own, or the standard text of /admin -> Impostazioni ("crediti" in sito.json);
    # [ANNO] becomes the project year, "–" hides them
    if not credits.strip():
        credits = CREDITS
    credits = "" if not strip_verify(credits).strip(" –—-") else credits.replace("[ANNO]", year)
    blank = lambda v: not strip_verify(v).strip(" –—-")  # noqa: E731  an empty field or "–" is not shown
    digital = "digital" in meta.get("Supporto", "").lower()
    tech = [f"{k}: {inline(meta[k])}" for k in ("Supporto", "Fotocamera", "Pellicola", "Lente")
            if k in meta and not blank(meta[k]) and not (k == "Pellicola" and digital)]
    total = slots(s, PHOTO_SLOTS)
    lay = layout(s)
    schema = schema_of(lay)
    seq_class = "custom" if schema else (lay.get("layout") if lay.get("layout") in LAYOUTS else "colonna")
    have = [n for n in range(1, total + 1) if exists(f"img/{s}/{n:02d}.jpg")]
    # texts between the photos (/admin): {"dopo": photos before it, "testo"}; each run of photos starts the layout again
    # (and videos: {"dopo", "video": YouTube/Vimeo link or media/<page>/file.mp4})
    between = {}
    for t in lay.get("testi") or []:
        if not isinstance(t, dict):
            continue
        if isinstance(t.get("video"), str):
            part = video_html(t["video"], f'{p["title"]}, video')
            part = f'  <div class="seq-video">{part}</div>' if part else ""
        elif isinstance(t.get("testo"), str) and t["testo"].strip():
            part = f'  <div class="seq-text">{paras(t["testo"].strip())}</div>'
        else:
            continue
        if not part:
            continue
        try:
            at = max(0, min(len(have), int(t.get("dopo", 0))))
        except (TypeError, ValueError):
            continue
        between.setdefault(at, []).append(part)
    parts, start = [], 0
    for cut in sorted(set(between) | {len(have)}):
        run = list(enumerate(have, 1))[start:cut]
        if run:
            spots = grid_places(schema, len(run)) if schema else []
            lis = "".join(
                f'<li data-src="img/{s}/{n:02d}.jpg"{grid_spot(spots, j)}>{img(f"img/{s}/{n:02d}.jpg", f"{p["title"]}, fotografia {k}")}<span class="count label">{k:02d}/{len(have):02d}</span></li>'
                for j, (k, n) in enumerate(run, 1))
            parts.append(f'  <ol class="photo-seq layout-{seq_class}" aria-label="Fotografie del progetto">{lis}</ol>')
        parts += between.get(cut, [])
        start = cut
    seq = "\n".join(parts) + "\n" if parts else ""
    shown = {r["pagina"] for r in RESEARCH if r.get("visibile", True) and r.get("pagina")}
    others = [q for q in PHOTO if q["slug"] != s and q["slug"] in shown]
    related = "".join(
        f'<a class="tile" href="{q["slug"]}.html">{img(f"img/{q["slug"]}/cover.jpg", q["title"], " ")}'
        f'<span class="fig-cap"><span>{html.escape(q["title"])}</span><span>{q["year"]}</span></span></a>'
        for q in others)
    first = f'  <div class="photo-first">{img(f"img/{s}/cover.jpg", p["title"], eager=True)}</div>\n' if lay.get("copertina", True) is not False else ""
    note = draft_note(inline(notes[0])) if notes else (draft_note() if "DA VERIFICARE" in str(secs) else "")
    body = f"""  <div class="p-title-row page-head">{back("index.html#ricerca-visiva")}<h1 class="p-title">{html.escape(p["title"])}<sup class="yr">{html.escape(year)}</sup></h1></div>
  <div class="photo-intro">
    <p>{inline(intro)}</p>
    <p class="meta">{" · ".join(html.escape(x) for x in meta_lines)}</p>
  </div>
{first}{seq}  <section class="photo-text">
    {note}
    {render_blocks(long_text)}
    <div class="credits label">{"".join(f"<span>{t}</span>" for t in tech)}</div>
    {f'<p class="copy label">{inline(credits)}</p>' if credits else ""}
  </section>
  <section class="related" aria-label="Altri progetti">
    <div class="related-head"><h2 class="small-title">Altri progetti</h2><span class="related-nav" hidden><button type="button" data-rel-step="-1" aria-label="Progetti precedenti">&larr;</button><button type="button" data-rel-step="1" aria-label="Progetti successivi">&rarr;</button></span></div>
    <div class="related-row">{related}</div>
  </section>
{band_archive()}"""
    page(file=f"{s}.html", title=p["title"], description=plain(intro), body=body, main_class="flush")


def ai_rows():
    out = []
    for p in AI:
        if p["slug"]:
            out.append(f'<li><a href="{p["slug"]}.html"><span class="t">{html.escape(p["title"])}</span>'
                       f'<span class="what">{html.escape(p["what"])}</span><span class="s">{html.escape(p["status"])} · {html.escape(p["year"])}</span></a></li>')
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
  <div class="p-title-row">{back("ai.html")}<h1 class="p-title">{html.escape(p["title"])}<sup class="yr">{html.escape(year)}</sup></h1></div>
  <div class="p-facts-wrap">{sheet_override(s) if sheet_override(s) is not None else facts(meta)}</div>
  <section class="p-body">
    {draft_note() if "DA VERIFICARE" in str(secs) + str(meta) + str(notes) else ""}
    <div class="prose">
<p class="lead">{inline(lead)}</p>
{chr(10).join(parts)}
    </div>
    <div class="gallery col shots" aria-label="Schermate">{"".join(img(f"img/{s}/{n:02d}.jpg", f"{p['title']}, schermata {n}", "Schermata in arrivo") for n in range(1, slots(s, 3) + 1) if exists(f"img/{s}/{n:02d}.jpg"))}</div>
  </section>
  <a class="next-project" href="ai.html"><span>Progetti con l'AI</span><span>Tutti gli strumenti ›</span></a>
{band_archive()}"""
    page(file=f"{s}.html", title=p["title"], description=plain(lead), body=body, header="overlay", main_class="flush")


def fmt_style(fmt):
    """Shape of a project's cover in the home grid, chosen in /admin ("4:3", "1:1" ...); empty = the design's own."""
    m = re.fullmatch(r"(\d{1,2}):(\d{1,2})", fmt or "")
    return f' style="aspect-ratio: {m.group(1)} / {m.group(2)}"' if m else ""


def build_home():
    c = contenuti()
    desc = field(c, "Description home")
    hero = [(p["slug"], p["title"], p["home_year"]) for p in CULTURE if on(p["slug"])]
    hero_items = "".join(
        f'<li><a href="{sl}.html" data-cover="img/{sl}/cover.jpg"{focus(f"img/{sl}/cover.jpg").replace(" style=", " data-pos=").replace("object-position: ", "")}>{html.escape(t)}<sup class="yr">{html.escape(y)}</sup></a></li>'
        for sl, t, y in hero)
    # Figma "Portfolio · v2": six cards; the ones without a page or photo yet are placeholders.
    cards = [(r["titolo"], project_year(r), r.get("pagina"), fmt_style(r.get("formato"))) for r in RESEARCH if r.get("visibile", True)]
    tiles = ""
    for n, (title, year, sl, st) in enumerate(cards, 1):
        cap = f'<span class="fig-cap"><span>{html.escape(title)}</span><span>{year}</span></span>'
        row = f' style="--row: {n}"' if n > 6 else ""  # after the sixth, each project gets its own row below
        if sl:
            tiles += f'<a class="tile" href="{sl}.html"{row}>{img(f"img/{sl}/cover.jpg", title).replace("<div ", f"<div{st} ", 1)}{cap}</a>'
        else:
            tiles += f'<div class="tile is-soon"{row}><div{st} class="media empty"></div>{cap}</div>'
    parts = []
    if on("hero") and hero:
        parts.append(f"""  <section class="hero hero-full bw" id="cultura" aria-label="Progetti culturali">
    <div class="media bw has-photo"><img src="img/{hero[0][0]}/cover.jpg" alt=""{focus(f"img/{hero[0][0]}/cover.jpg")}></div>
    <h1 class="sr-only">Simone Carducci, creative development</h1>
    <ul class="hero-list">{hero_items}</ul>
  </section>""")
    else:
        parts.append('  <h1 class="sr-only">Simone Carducci, creative development</h1>')
    sec = {}
    if on("pellicole"):
        sec["pellicole"] = band_color()
    if on("ricerca-visiva") and tiles:
        sec["ricerca-visiva"] = (f"""  <section class="research zigzag-wrap" id="ricerca-visiva">
    <h2 class="research-title">Ricerca visiva</h2>
    <div class="zigzag">{tiles}</div>
  </section>""")
    if on("ia"):
        sec["ia"] = (f"""  <section class="list-wrap" id="ai">
    <h2 class="small-title"><a href="ai.html">Progetti con l'AI</a></h2>
    {ai_rows()}
  </section>""")
    if on("banda-archivio"):
        sec["banda-archivio"] = band_archive()
    parts += [sec[k] for k in ORDER if k in sec]
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
      <div class="media"><span class="ph"></span></div>
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
    # every section in the same body text, whatever its position (the last one used to be bigger)
    for title, paras in blocks:
        html_blocks.append(f'<div class="about-block"><h2 class="label">{inline(title)}</h2>'
                           + "".join(f"<p>{inline(x)}</p>" for x in paras) + "</div>")
    rows = re.findall(r"^\| (Ambiti|Competenze|Strumenti|Lingue|Formazione) \| (.+?) \|$", a, re.M)
    rows = [(k, "<br>".join(inline(x) for x in v.split(" · ")) if k == "Formazione" else inline(v)) for k, v in rows]
    langs = dict(rows).get("Lingue", "").lower()
    portrait = img("img/about/ritratto.jpg", "Ritratto di Simone Carducci", "Ritratto in arrivo", eager=True)
    # the details next to the portrait: edited in /admin -> About (content/schede/about.json), these until then
    fact_rows = sheet_rows("about")
    if fact_rows is None:
        fact_rows = [("Base", "Torino", ""), ("Ambiti", "editoria, eventi, progetti culturali, fotografia analogica", ""),
                     ("Contatti", EMAIL, f"mailto:{EMAIL}"), ("Lingue", langs, "")]
    facts = "\n".join(f"      <div><dt>{html.escape(k)}</dt><dd>{fact_value_html(v, link)}</dd></div>"
                      for k, v, link in fact_rows if k or v)
    body = f"""  <h1 class="sr-only">Simone Carducci</h1>
  <section class="about-intro">
    <div class="about-portrait">{portrait.replace('class="media', 'class="media soon', 1)}</div>
    <dl class="about-facts">
{facts}
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


# ---------------------------------------------------------------- pages made of blocks (/admin "Pagine")
# content/pagine/<slug>.json = {"titolo", "descrizione", "blocchi": [{"tipo": ..., ...}]}; photos in img/<slug>/.
# The blocks are the components of the Figma page "Componenti" (docs/COMPONENTI.md).

def free_pages():
    out = []
    for f in sorted((ROOT / "content" / "pagine").glob("*.json")):
        try:
            d = __import__("json").loads(f.read_text(encoding="utf-8"))
        except ValueError:
            print("skip (not valid JSON):", f.name)
            continue
        if isinstance(d, dict) and re.fullmatch(r"[a-z0-9][a-z0-9-]*", f.stem):
            out.append({"slug": f.stem, "title": str(d.get("titolo") or f.stem), **d})
    return out


FREE = free_pages()


def page_targets():
    """Pages a "Progetto successivo" block can point to: slug -> title."""
    t = {p["slug"]: p["title"] for p in PHOTO + CULTURE + [a for a in AI if a["slug"]] + FREE}
    t.update({"index": "Home", "about": "About", "archivio": "Archivio", "ai": "Progetti con l'AI"})
    return t


def _str(v):
    return v.strip() if isinstance(v, str) else ""


def _photo(src, slug):
    return isinstance(src, str) and src.startswith(f"img/{slug}/") and src.endswith(".jpg") and "/../" not in src


def paras(text):
    return "\n".join(f"<p>{inline(x.strip())}</p>" for x in re.split(r"\n\s*\n", text) if x.strip())


def block_html(b, p, i):
    s, kind = p["slug"], b.get("tipo")
    if kind == "titolo":
        t, y = _str(b.get("titolo")) or p["title"], _str(b.get("anno"))
        tag = "h1" if i == p["_h1"] else "h2"
        sup = f'<sup class="yr">{html.escape(y)}</sup>' if y else ""
        arrow = back("index.html#ricerca-visiva") if tag == "h1" else ""
        return f'  <div class="p-title-row page-head">{arrow}<{tag} class="p-title">{html.escape(t)}{sup}</{tag}></div>'
    if kind == "foto":
        src = b.get("foto")
        if not _photo(src, s):
            return ""
        alt = _str(b.get("alt")) or p["title"]
        if b.get("piena"):
            return f'  <section class="p-hero">\n    {img(src, alt, eager=i == 0)}\n  </section>'
        return f'  <div class="photo-first">{img(src, alt, eager=i < 2)}</div>'
    if kind == "testo":
        t, nota = _str(b.get("testo")), _str(b.get("nota"))
        if not t and not nota:
            return ""
        note = f'\n    <p class="meta label">{inline(nota)}</p>' if nota else ""
        return f'  <section class="photo-text block-text">\n    {paras(t)}{note}\n  </section>'
    if kind == "citazione":
        t, a = _str(b.get("testo")), _str(b.get("autore"))
        if not t:
            return ""
        return (f'  <figure class="quote"><blockquote><p>{inline(t)}</p></blockquote>'
                f'{f"<figcaption>{inline(a)}</figcaption>" if a else ""}</figure>')
    if kind == "scheda":
        rows = [(_str(r[0]), _str(r[1]), _str(r[2]) if len(r) > 2 else "")
                for r in b.get("righe") or [] if isinstance(r, list) and len(r) >= 2]
        dl = fact_rows_html(rows)
        return f'  <div class="p-facts-wrap">{dl}</div>' if dl else ""
    if kind == "video":
        v = video_html(b.get("video"), plain(_str(b.get("didascalia"))) or p["title"])
        if not v:
            return ""
        cap = _str(b.get("didascalia"))
        return (f'  <figure class="block-video{" wide" if b.get("larga") else ""}">{v}'
                f'{f"<figcaption>{inline(cap)}</figcaption>" if cap else ""}</figure>')
    if kind == "sequenza":
        photos = [f for f in b.get("foto") or [] if (_photo(f, s) and exists(f)) or (isinstance(f, str) and video_html(f, ""))]
        if not photos:
            return ""
        lay = b.get("layout")
        schema = schema_of({"layout": lay, "schema": b.get("schema")}) if lay == "casuale" or lay not in LAYOUTS else None
        spots = grid_places(schema, len(photos)) if schema else []
        cls = "custom" if schema else (lay if lay in LAYOUTS else "colonna")
        n = len(photos)
        lis = "".join(f'<li{grid_spot(spots, k)}>{video_html(f, f"{p["title"]}, video {k}") or img(f, f"{p["title"]}, fotografia {k}")}'
                      f'<span class="count label">{k:02d}/{n:02d}</span></li>'
                      for k, f in enumerate(photos, 1))
        return f'  <ol class="photo-seq layout-{cls}" aria-label="Fotografie">{lis}</ol>'
    if kind == "altri":
        shown = {r["pagina"] for r in RESEARCH if r.get("visibile", True) and r.get("pagina")}
        others = [q for q in PHOTO if q["slug"] != s and q["slug"] in shown]
        if not others:
            return ""
        tiles = "".join(
            f'<a class="tile" href="{q["slug"]}.html">{img(f"img/{q["slug"]}/cover.jpg", q["title"], " ")}'
            f'<span class="fig-cap"><span>{html.escape(q["title"])}</span><span>{html.escape(q["year"])}</span></span></a>'
            for q in others)
        return (f'  <section class="related" aria-label="Altri progetti">\n    <div class="related-head"><h2 class="small-title">Altri progetti</h2><span class="related-nav" hidden><button type="button" data-rel-step="-1" aria-label="Progetti precedenti">&larr;</button><button type="button" data-rel-step="1" aria-label="Progetti successivi">&rarr;</button></span></div>\n'
                f'    <div class="related-row">{tiles}</div>\n  </section>')
    if kind == "successivo":
        to, targets = _str(b.get("pagina")), page_targets()
        if to not in targets or to == s:
            return ""
        label = _str(b.get("testo")) or "Progetto successivo"
        return f'  <a class="next-project" href="{to}.html"><span>{html.escape(label)}</span><span>{html.escape(targets[to])} ›</span></a>'
    if kind == "fascia":
        return band_color() if b.get("variante") == "pellicole" else band_archive()
    return ""


def build_free(p):
    blocks = [b for b in p.get("blocchi") or [] if isinstance(b, dict)]
    p["_h1"] = next((i for i, b in enumerate(blocks) if b.get("tipo") == "titolo"), -1)
    parts = [] if p["_h1"] >= 0 else [f'  <h1 class="sr-only">{html.escape(p["title"])}</h1>']
    parts += [x for x in (block_html(b, p, i) for i, b in enumerate(blocks)) if x]
    over = bool(blocks) and blocks[0].get("tipo") == "foto" and blocks[0].get("piena") and _photo(blocks[0].get("foto"), p["slug"])
    page(file=f'{p["slug"]}.html', title=p["title"], description=plain(_str(p.get("descrizione"))),
         body="\n".join(parts), header="overlay" if over else "", main_class="flush")


def git_blob_sha(path):
    data = path.read_bytes()
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()


def version_admin():
    """admin/index.html loads its files as ?v=<git blob sha>, so a browser never keeps an old panel:
    admin.js compares that version with the one on GitHub and offers a reload when they differ."""
    f = ROOT / "admin" / "index.html"
    s = f.read_text(encoding="utf-8")
    for name in ("admin.css", "struttura.js", "admin.js"):
        s = re.sub(rf'(["\']){re.escape(name)}(\?v=[0-9a-f]+)?\1', rf'\g<1>{name}?v={git_blob_sha(ROOT / "admin" / name)[:12]}\1', s)
    # the tab icon of the site, also for the admin
    s = re.sub(r'(<link rel="(?:icon|apple-touch-icon)"[^>]*>\n)+', lambda m: icon_links("../") + "\n", s, count=1)
    f.write_text(s, encoding="utf-8")


def main():
    version_admin()
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
    taken = {"index", "about", "archivio", "ai", "404"} | {p["slug"] for p in PHOTO + CULTURE + AI if p.get("slug")}
    for p in FREE:
        if p["slug"] in taken:
            print("skip page (name already used):", p["slug"])
            continue
        build_free(p)


if __name__ == "__main__":
    main()
