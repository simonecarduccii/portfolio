#!/usr/bin/env python3
"""Write sitemap.xml and robots.txt for the published domain.

Usage: python3 tools/build_sitemap.py https://simonecarducci.it
"""
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
base = (sys.argv[1] if len(sys.argv) > 1 else "").rstrip("/")
if not base.startswith("http"):
    sys.exit("Usage: python3 tools/build_sitemap.py https://your-domain.it")

pages = sorted(p.name for p in ROOT.glob("*.html") if p.name != "404.html")
today = date.today().isoformat()
urls = "\n".join(
    f"  <url><loc>{base}/{'' if p == 'index.html' else p}</loc><lastmod>{today}</lastmod></url>"
    for p in pages)
(ROOT / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    f"{urls}\n</urlset>\n", encoding="utf-8")
(ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {base}/sitemap.xml\n", encoding="utf-8")
print(f"sitemap.xml ({len(pages)} pages) and robots.txt written for {base}")
