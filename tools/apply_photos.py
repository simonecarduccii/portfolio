#!/usr/bin/env python3
"""Turn the photos chosen in /admin into the files the pages use.

Run by the GitHub Action "Update site" after every push to main (see .github/workflows/update-site.yml).

- content/foto/<page>.json  (written by /admin, see admin/config.yml) lists the uploaded photos.
  When that list changes, the photos are optimised into img/<page>/cover.jpg, 01.jpg, 02.jpg ...
  (or the single file named in content/destinazioni.json, e.g. img/home/hero.jpg).
- Archive photos (uploaded in /admin, or sent by the Mac folder sync to content/caricate/archivio-mac/)
  are numbered after the last one, like tools/optimize_images.py does.
- Finally every JPEG under img/ that is too big or still carries metadata (GPS, camera) is re-saved,
  which also covers photos that the Mac folder sync (tools/mac/sync_cartelle.py) sends as they are.

What has already been applied is remembered in content/.stato/, so a photo is only processed when it
changes: the latest change wins, whether it comes from /admin or from the Mac folder.

Usage:  python3 tools/apply_photos.py      (needs Pillow; pillow-heif for HEIC is optional)
"""
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from optimize_images import (ARCHIVE, ARCHIVE_SIDE, MAX_SIDE, QUALITY, THUMB_SIDE,  # noqa: E402
                             Image, ImageOps, next_number, write_manifest)

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
STATE = CONTENT / ".stato"
MAC_ARCHIVE = CONTENT / "caricate" / "archivio-mac"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp", ".heic", ".heif", ".avif"}


def source(ref):
    """Path of an uploaded file from the value /admin stores ('/content/caricate/x.webp')."""
    p = ROOT / ref.lstrip("/")
    if not p.is_file():
        print(f"! missing upload {ref}, skipped")
        return None
    return p


def digest(paths):
    h = hashlib.sha1()
    for p in paths:
        h.update(str(p.relative_to(ROOT)).encode())
        h.update(p.read_bytes())
    return h.hexdigest()


def save(src, dest, side=MAX_SIDE):
    """Web-ready JPEG: rotated upright, long side <= side, no metadata (GPS, camera serial)."""
    with Image.open(src) as im:
        im.load()
        im = ImageOps.exif_transpose(im)
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        im.thumbnail((side, side), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    print(f"  {src.relative_to(ROOT)} -> {dest.relative_to(ROOT)} ({dest.stat().st_size // 1024} KB)")
    return im


def read_state(slug):
    f = STATE / f"{slug}.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}


def write_state(slug, data):
    STATE.mkdir(parents=True, exist_ok=True)
    (STATE / f"{slug}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def apply_page(slug, kind, dest, entry):
    cover = source(entry["copertina"]) if entry.get("copertina") else None
    photos = [p for p in (source(x) for x in entry.get("foto") or [] if x) if p]
    if not cover and not photos:
        return
    key = digest(([cover] if cover else []) + photos)
    state = read_state(slug)
    if state.get("caricate") == key:
        return
    print(f"{slug}: photos from /admin")
    if kind == "singola":
        save(cover, ROOT / dest)
    else:
        folder = ROOT / dest
        if cover:
            save(cover, folder / "cover.jpg")
        if photos:
            for n, p in enumerate(photos, 1):
                save(p, folder / f"{n:02d}.jpg")
            # photos removed from the list disappear from the page
            for old in folder.glob("[0-9][0-9]*.jpg"):
                if old.stem.isdigit() and int(old.stem) > len(photos):
                    old.unlink()
                    print(f"  removed {old.relative_to(ROOT)}")
    state["caricate"] = key
    write_state(slug, state)


def apply_archive(entry):
    srcs = [p for p in (source(x) for x in entry.get("foto") or [] if x) if p]
    if MAC_ARCHIVE.is_dir():
        srcs += sorted(p for p in MAC_ARCHIVE.iterdir() if p.suffix.lower() in IMAGE_EXTS)
    state = read_state("archivio")
    done = state.setdefault("importate", {})
    new = [p for p in srcs if done.get(str(p.relative_to(ROOT))) != digest([p])]
    if not new:
        return
    print(f"archivio: {len(new)} new photos")
    thumbs = ARCHIVE / "thumbs"
    n = next_number()
    for p in new:
        im = save(p, ARCHIVE / f"{n:04d}.jpg", ARCHIVE_SIDE)
        thumbs.mkdir(parents=True, exist_ok=True)
        im.thumbnail((THUMB_SIDE, THUMB_SIDE), Image.LANCZOS)
        im.save(thumbs / f"{n:04d}.jpg", "JPEG", quality=QUALITY, optimize=True, progressive=True)
        done[str(p.relative_to(ROOT))] = digest([p])
        n += 1
    write_manifest()
    write_state("archivio", state)


def normalise():
    """Re-save JPEGs under img/ that are oversized or carry metadata."""
    for f in sorted((ROOT / "img").rglob("*.jpg")):
        side = THUMB_SIDE if f.parent.name == "thumbs" else ARCHIVE_SIDE if f.parent == ARCHIVE else MAX_SIDE
        with Image.open(f) as im:
            needs = max(im.size) > side or "exif" in im.info or im.format != "JPEG"
        if needs:
            print(f"normalise {f.relative_to(ROOT)}")
            save(f, f, side)


def main():
    targets = json.loads((CONTENT / "destinazioni.json").read_text(encoding="utf-8"))
    for slug, t in targets.items():
        f = CONTENT / "foto" / f"{slug}.json"
        if not f.exists():
            continue
        entry = json.loads(f.read_text(encoding="utf-8"))
        if t["tipo"] == "archivio":
            apply_archive(entry)
        else:
            apply_page(slug, t["tipo"], t["destinazione"], entry)
    normalise()


if __name__ == "__main__":
    main()
