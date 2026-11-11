#!/usr/bin/env python3
"""Mac folder sync: send the photos of the folders chosen in /admin to the site.

In /admin -> Foto, each page can have a "Cartella sul Mac" (e.g. 01home/03ricerca_visiva/01faccini,
inside ~/porfolio/information_architecture). This script, run every few minutes by macOS
(installed by installa-sync.command), looks at those folders and, when a photo is new or changed,
commits it to GitHub:

  cover.jpg (a file named cover / copertina / hero / bg_ / ritratto, otherwise the first one)
  01.jpg, 02.jpg ... (the other photos, in name order; also those in an "images" subfolder)

The GitHub Action "Update site" then strips GPS/camera data, sizes the photos and rebuilds the pages.
Only the standard library is used; photos are shrunk with macOS `sips` before upload.

Usage:  python3 sync_cartelle.py [--dry-run] [--force]
Token:  read from the macOS Keychain (service "portfolio-sync"), saved there by the installer.
"""
import base64
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

REPO = os.environ.get("PORTFOLIO_REPO", "simonecarduccii/simonecarducci")
BRANCH = os.environ.get("PORTFOLIO_BRANCH", "main")
BASE = Path(os.environ.get("PORTFOLIO_FOTO", "~/porfolio/information_architecture")).expanduser()
HOME_DIR = Path("~/Library/Application Support/portfolio-sync").expanduser()
STATE_FILE = HOME_DIR / "stato.json"
LOCK = HOME_DIR / "sync.lock"
API = "https://api.github.com"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp", ".heic", ".heif"}
COVER_NAMES = ("cover", "copertina", "hero", "bg_", "ritratto")
MAX_SIDE = 2600   # px before upload; the Action makes the final 2000 px JPEG
DRY = "--dry-run" in sys.argv
FORCE = "--force" in sys.argv


def log(msg):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), msg, flush=True)


def token():
    t = os.environ.get("GITHUB_TOKEN")
    if t:
        return t
    try:
        return subprocess.run(["security", "find-generic-password", "-s", "portfolio-sync", "-a", "github", "-w"],
                              check=True, capture_output=True, text=True).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        sys.exit("Token GitHub non trovato nel Portachiavi: riapri installa-sync.command")


TOKEN = None


def api(method, path, body=None, raw=False):
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Accept", "application/vnd.github.raw" if raw else "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", "portfolio-sync")
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    return data if raw else json.loads(data or b"null")


def resolve_repo():
    """Follow a repository rename: GitHub answers the old name with a redirect on GET,
    but not on the POST/PATCH calls used to commit, so use the current full name."""
    global REPO
    try:
        REPO = api("GET", f"/repos/{REPO}")["full_name"]
    except urllib.error.HTTPError:
        if REPO.endswith("/simonecarducci"):  # repo not renamed yet
            REPO = REPO.rsplit("/", 1)[0] + "/portfolio"
            REPO = api("GET", f"/repos/{REPO}")["full_name"]
        else:
            raise


def read_repo_json(path):
    return json.loads(api("GET", f"/repos/{REPO}/contents/{path}?ref={BRANCH}", raw=True))


def nfc(s):
    return unicodedata.normalize("NFC", s)


def resolve(rel):
    """Find a folder under BASE, whatever the accents' Unicode form (macOS often uses NFD)."""
    p = Path(rel).expanduser()
    if p.is_absolute() and p.is_dir():
        return p
    cur = p if p.is_absolute() else BASE
    for part in ([] if p.is_absolute() else Path(rel).parts):
        nxt = cur / part
        if not nxt.exists() and cur.is_dir():
            nxt = next((c for c in cur.iterdir() if nfc(c.name) == nfc(part)), nxt)
        cur = nxt
    return cur if cur.is_dir() else None


def natural(p):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", nfc(p.name))]


def images(folder):
    found = []
    for d in (folder, folder / "images"):
        if d.is_dir():
            found += [f for f in d.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_EXTS and not f.name.startswith(".")]
    return sorted(found, key=natural)


def split_cover(files):
    covers = [f for f in files if nfc(f.name).lower().startswith(COVER_NAMES)]
    cover = covers[0] if covers else files[0]
    return cover, [f for f in files if f is not cover]


def sha1(path):
    return hashlib.sha1(path.read_bytes()).hexdigest()


def jpeg_bytes(src):
    """JPEG of the photo, long side at most MAX_SIDE (macOS sips; the original is never touched)."""
    if src.suffix.lower() in (".jpg", ".jpeg") and src.stat().st_size < 2_500_000:
        return src.read_bytes()
    if not shutil.which("sips"):
        return src.read_bytes()
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "out.jpg"
        cmd = ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "90"]
        dims = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(src)], capture_output=True, text=True).stdout
        sizes = [int(x) for x in re.findall(r"pixel(?:Width|Height): (\d+)", dims)]
        if sizes and max(sizes) > MAX_SIDE:
            cmd += ["-Z", str(MAX_SIDE)]
        subprocess.run(cmd + [str(src), "--out", str(out)], check=True, capture_output=True)
        return out.read_bytes()


def repo_numbered(folder):
    try:
        items = api("GET", f"/repos/{REPO}/contents/{folder}?ref={BRANCH}")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return []
        raise
    return [i["path"] for i in items if re.fullmatch(r"\d{2,}\.jpg", i["name"])]


def plan(targets, entries):
    """Return {repo_path: source_file} to upload and [repo_path] to delete."""
    uploads, deletes = {}, []
    for slug, t in targets.items():
        rel = (entries.get(slug) or {}).get("cartella", "").strip()
        if not rel:
            continue
        folder = resolve(rel)
        if not folder:
            log(f"! {slug}: cartella non trovata: {BASE / rel}")
            continue
        files = images(folder)
        if not files:
            continue
        dest = t["destinazione"]
        if t["tipo"] == "archivio":
            for f in files:
                name = re.sub(r"[^a-z0-9]+", "-", nfc(f.stem).lower()).strip("-") or "foto"
                uploads[f"content/caricate/archivio-mac/{name}.jpg"] = f
            continue
        cover, rest = split_cover(files)
        if t["tipo"] == "singola":
            uploads[dest] = cover
            continue
        uploads[f"{dest}/cover.jpg"] = cover
        if rest:
            for n, f in enumerate(rest, 1):
                uploads[f"{dest}/{n:02d}.jpg"] = f
            deletes += [p for p in repo_numbered(dest) if int(Path(p).stem) > len(rest)]
    return uploads, deletes


def commit(changes, deletes, message):
    for attempt in range(4):
        ref = api("GET", f"/repos/{REPO}/git/ref/heads/{BRANCH}")
        head = ref["object"]["sha"]
        base_tree = api("GET", f"/repos/{REPO}/git/commits/{head}")["tree"]["sha"]
        tree = [{"path": p, "mode": "100644", "type": "blob", "sha": sha} for p, sha in changes.items()]
        tree += [{"path": p, "mode": "100644", "type": "blob", "sha": None} for p in deletes]
        new_tree = api("POST", f"/repos/{REPO}/git/trees", {"base_tree": base_tree, "tree": tree})["sha"]
        new_commit = api("POST", f"/repos/{REPO}/git/commits",
                         {"message": message, "tree": new_tree, "parents": [head]})["sha"]
        try:
            api("PATCH", f"/repos/{REPO}/git/refs/heads/{BRANCH}", {"sha": new_commit})
            return new_commit
        except urllib.error.HTTPError as e:
            if e.code != 422 or attempt == 3:
                raise
            time.sleep(3)


def notify(text):
    if shutil.which("osascript"):
        subprocess.run(["osascript", "-e", f'display notification "{text}" with title "Portfolio"'], capture_output=True)


def main():
    global TOKEN
    HOME_DIR.mkdir(parents=True, exist_ok=True)
    if LOCK.exists() and time.time() - LOCK.stat().st_mtime < 900:
        return
    LOCK.write_text(str(os.getpid()))
    try:
        TOKEN = token()
        resolve_repo()
        state = {} if FORCE or not STATE_FILE.exists() else json.loads(STATE_FILE.read_text())
        targets = read_repo_json("content/destinazioni.json")
        entries = {slug: read_repo_json(f"content/foto/{slug}.json") for slug in targets}
        uploads, deletes = plan(targets, entries)
        todo = {p: f for p, f in uploads.items() if state.get(p) != sha1(f)}
        # only remove photos this sync sent itself: extra photos added from /admin stay
        deletes = [p for p in deletes if p not in uploads and p in state]
        if not todo and not deletes:
            return
        names = sorted({p.split("/")[1] if p.startswith("img/") else "archivio" for p in [*todo, *deletes]})
        for p, f in todo.items():
            log(f"{'(prova) ' if DRY else ''}{f} -> {p}")
        for p in deletes:
            log(f"{'(prova) ' if DRY else ''}rimuovo {p}")
        if DRY:
            return
        blobs = {}
        for p, f in todo.items():
            data = base64.b64encode(jpeg_bytes(f)).decode()
            blobs[p] = api("POST", f"/repos/{REPO}/git/blobs", {"content": data, "encoding": "base64"})["sha"]
        sha = commit(blobs, deletes, "Sync photos from Mac folder: " + ", ".join(names))
        for p, f in todo.items():
            state[p] = sha1(f)
        for p in deletes:
            state.pop(p, None)
        STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2))
        log(f"commit {sha[:7]}: {len(todo)} foto, {len(deletes)} rimosse ({', '.join(names)})")
        notify(f"Foto inviate al sito: {', '.join(names)}. Online tra 2-3 minuti.")
    except urllib.error.HTTPError as e:
        log(f"! GitHub ha risposto {e.code}: {e.read()[:300]!r}")
        if e.code == 401:
            notify("Il token GitHub non funziona più: riapri installa-sync.command")
        sys.exit(1)
    except urllib.error.URLError as e:
        log(f"! rete non disponibile ({e.reason}), riprovo più tardi")
    finally:
        LOCK.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
