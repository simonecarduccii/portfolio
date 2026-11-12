"""Find the YouTube videos linked in content/ and docs/ that are private or removed, so the site hides them.

Asks YouTube's oEmbed endpoint about each video: 200 = public (or unlisted), 401/403/404 = private or removed.
Writes content/video-status.json {"unavailable": [ids]}, read by tools/build_pages.py. A video that cannot be
checked (no network, YouTube down) keeps its last known state, so a failed check never hides or shows anything.
Run by the "Update site" Action before the build, and every day, so a video made public comes back on its own.
"""

import json
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "content" / "video-status.json"
YT = re.compile(r"(?:youtube\.com/(?:watch\?(?:[^\s\"']*&)?v=|shorts/|embed/|live/)|youtu\.be/)([\w-]{6,})")


def video_ids():
    ids = set()
    for folder, pattern in (("content", "**/*.json"), ("docs", "**/*.md")):
        for f in (ROOT / folder).glob(pattern):
            if f != OUT:
                ids.update(YT.findall(f.read_text(encoding="utf-8", errors="ignore")))
    return sorted(ids)


def available(vid):
    """True / False, or None when YouTube could not be asked."""
    url = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(f"https://www.youtube.com/watch?v={vid}")
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "portfolio-site-check"}), timeout=15):
            return True
    except urllib.error.HTTPError as e:
        return False if e.code in (401, 403, 404) else None
    except (urllib.error.URLError, OSError):
        return None


def main():
    try:
        before = set(json.loads(OUT.read_text(encoding="utf-8")).get("unavailable", []))
    except (OSError, ValueError, AttributeError):
        before = set()
    hidden = set()
    for vid in video_ids():
        ok = available(vid)
        if ok is False or (ok is None and vid in before):
            hidden.add(vid)
        print(vid, {True: "ok", False: "private/removed", None: "not checked"}[ok])
    OUT.write_text(json.dumps({"unavailable": sorted(hidden)}, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
