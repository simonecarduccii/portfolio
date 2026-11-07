#!/usr/bin/env python3
"""Prepare photos for the site.

Resizes, fixes rotation, strips metadata (including GPS) and saves web-ready
JPEGs into img/<section>/. For the archive it numbers photos 0001.jpg, 0002.jpg ... (1800 px), writes
900 px thumbnails to img/archivio/thumbs/ and rebuilds img/archivio/archivio.json.

Usage (from the repo root):
    pip3 install pillow
    python3 tools/optimize_images.py ~/Desktop/foto-archivio archivio
    python3 tools/optimize_images.py ~/Desktop/siculo siculo
    python3 tools/optimize_images.py --manifest-only      # just rebuild archivio.json

New archive photos are numbered after the last one, so import each batch once.
Project photos are renamed cover.jpg,
01.jpg, 02.jpg ... as the pages expect (a file named "cover..." becomes the cover).

Sections: archivio, boheme, modi, siculo, faccioni, place-of-freedom,
papa-che-fanno-i-papa, about. Originals are never modified.
"""
import argparse
import json
import re
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is missing: run  pip3 install pillow")

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "img"
ARCHIVE = IMG / "archivio"
MANIFEST = ARCHIVE / "archivio.json"
EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp", ".heic"}
MAX_SIDE = 2000      # px, long side (project pages)
ARCHIVE_SIDE = 1800  # px, archive photos
THUMB_SIDE = 900     # px, archive thumbnails in img/archivio/thumbs/
QUALITY = 82



def process(src, dest_dir, name, side=MAX_SIDE, thumb_dir=None):
    dest = dest_dir / (name + ".jpg")
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        im.thumbnail((side, side), Image.LANCZOS)
        # No exif/icc passed -> metadata (camera serial, GPS) is dropped.
        im.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        if thumb_dir:
            im.thumbnail((THUMB_SIDE, THUMB_SIDE), Image.LANCZOS)
            im.save(thumb_dir / dest.name, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    return dest


def read_manifest():
    if not MANIFEST.exists():
        return {}
    try:
        return {p["file"]: p for p in json.loads(MANIFEST.read_text(encoding="utf-8")) if p.get("file")}
    except (json.JSONDecodeError, TypeError):
        sys.exit("img/archivio/archivio.json is not valid JSON: fix it before re-running")


def next_number():
    nums = [int(p.stem) for p in ARCHIVE.glob("*.jpg") if p.stem.isdigit()]
    return max(nums, default=0) + 1


def write_manifest():
    """Format agreed with Design (docs/DESIGN.md):
    [{"n": "0001", "file": "0001.jpg", "film": "", "luogo": "", "anno": null}]
    Hand-written film / luogo / anno are kept."""
    old = read_manifest()
    photos = []
    for f in sorted(ARCHIVE.glob("*.jpg")):
        entry = old.get(f.name, {})
        photos.append({"n": f.stem, "file": f.name, "film": entry.get("film", ""),
                       "luogo": entry.get("luogo", ""), "anno": entry.get("anno"),
                       **{k: v for k, v in entry.items() if k not in {"n", "file", "film", "luogo", "anno"}}})
    MANIFEST.write_text(json.dumps(photos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"img/archivio/archivio.json: {len(photos)} photos")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", nargs="?", help="folder (or single file) with the original photos")
    ap.add_argument("section", nargs="?", default="archivio", help="destination folder inside img/")
    ap.add_argument("--manifest-only", action="store_true")
    args = ap.parse_args()

    if not args.manifest_only:
        if not args.source:
            ap.error("source folder is required")
        src = Path(args.source).expanduser()
        items = [src] if src.is_file() else sorted(
            p for p in src.rglob("*") if p.suffix.lower() in EXTS and not p.name.startswith("."))
        if not items:
            sys.exit(f"No photos found in {src}")
        dest_dir = IMG / args.section
        dest_dir.mkdir(parents=True, exist_ok=True)
        total = 0
        # Project pages expect cover.jpg + 01.jpg, 02.jpg ... (in name order).
        # A file whose name starts with "cover" becomes the cover; otherwise the first one.
        archive = args.section == "archivio"
        thumb_dir = None
        if archive:
            # Archive: 0001.jpg, 0002.jpg ... continuing after the last one, + thumbnail.
            thumb_dir = ARCHIVE / "thumbs"
            thumb_dir.mkdir(parents=True, exist_ok=True)
            start = next_number()
            names = [(p, f"{start + i:04d}") for i, p in enumerate(items)]
        else:
            covers = [p for p in items if p.stem.lower().startswith("cover")]
            cover = covers[0] if covers else items[0]
            rest = [p for p in items if p is not cover]
            names = [(cover, "cover")] + [(p, f"{i:02d}") for i, p in enumerate(rest, 1)]
        for p, name in names:
            try:
                out = process(p, dest_dir, name, ARCHIVE_SIDE if archive else MAX_SIDE, thumb_dir)
            except Exception as e:  # unreadable file (e.g. HEIC without plugin)
                print(f"! skipped {p.name}: {e}")
                continue
            kb = out.stat().st_size // 1024
            total += kb
            print(f"  {p.name} -> {out.relative_to(ROOT)} ({kb} KB)")
        print(f"{len(items)} photos, {total / 1024:.1f} MB total")

    if args.manifest_only or args.section == "archivio":
        write_manifest()


if __name__ == "__main__":
    main()
