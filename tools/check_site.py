#!/usr/bin/env python3
"""Check the static site before publishing.

- every local link / src / href in the HTML points to an existing file
- no image heavier than 1.5 MB (run tools/optimize_images.py first)
- every <img> has an alt attribute

Photos not added yet (missing files under img/) and the CV are only warnings,
so the site can go online while photos arrive. Use --strict before the final
publish to turn them into errors.

Usage: python3 tools/check_site.py [--strict]   (exit code 1 if something is wrong)
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parent.parent
MAX_IMG = 1.5 * 1024 * 1024
STRICT = "--strict" in sys.argv
SKIP_DIRS = {".git", "docs", "tools", "node_modules", ".github"}


class Refs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.no_alt = [], 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for key in ("href", "src"):
            if a.get(key):
                self.refs.append(a[key])
        if tag == "img" and "alt" not in a:
            self.no_alt += 1


def local_target(page, ref):
    u = urlparse(ref)
    if u.scheme or ref.startswith(("#", "//", "mailto:", "tel:", "data:")):
        return None
    path = unquote(u.path)
    if not path:
        return None
    base = ROOT if path.startswith("/") else page.parent
    t = (base / path.lstrip("/")).resolve()
    return t / "index.html" if t.is_dir() else t


def main():
    errors, warnings = [], []
    pages = [p for p in ROOT.rglob("*.html") if not SKIP_DIRS & set(p.relative_to(ROOT).parts)]
    for page in pages:
        parser = Refs()
        parser.feed(page.read_text(encoding="utf-8"))
        rel = page.relative_to(ROOT)
        if parser.no_alt:
            errors.append(f"{rel}: {parser.no_alt} <img> without alt")
        for ref in parser.refs:
            t = local_target(page, ref)
            if t and not t.exists():
                msg = f"{rel}: missing {ref}"
                pending = ref.endswith(".pdf") or ref.lstrip("./").startswith("img/")
                (warnings if pending and not STRICT else errors).append(msg)
    for img in (ROOT / "img").rglob("*"):
        if img.is_file() and img.stat().st_size > MAX_IMG:
            errors.append(f"{img.relative_to(ROOT)}: {img.stat().st_size // 1024} KB, run tools/optimize_images.py")
    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("error:", e)
    print(f"{len(pages)} pages checked, {len(errors)} errors, {len(warnings)} warnings")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
