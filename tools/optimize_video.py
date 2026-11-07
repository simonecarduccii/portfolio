#!/usr/bin/env python3
"""Prepare a hero video: MP4 H.264, muted, max 1920 px wide, under ~4 MB, plus a poster JPG.

Needs ffmpeg (on the Mac:  brew install ffmpeg).
Usage: python3 tools/optimize_video.py ~/Desktop/modi.mov modi [--seconds 15]
Writes img/<section>/hero.mp4 and img/<section>/hero-poster.jpg.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET_MB = 3.8

if not shutil.which("ffmpeg"):
    sys.exit("ffmpeg is missing: run  brew install ffmpeg")

ap = argparse.ArgumentParser()
ap.add_argument("source")
ap.add_argument("section")
ap.add_argument("--seconds", type=float, default=15, help="max length (default 15)")
a = ap.parse_args()

src = Path(a.source).expanduser()
out_dir = ROOT / "img" / a.section
out_dir.mkdir(parents=True, exist_ok=True)
mp4, poster = out_dir / "hero.mp4", out_dir / "hero-poster.jpg"

probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(src)],
                       capture_output=True, text=True, check=True)
duration = min(float(json.loads(probe.stdout)["format"]["duration"]), a.seconds)
kbps = int(TARGET_MB * 8 * 1024 / duration)  # bitrate that fits the size budget
scale = "scale='min(1920,iw)':-2"
common = ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-t", str(duration), "-an",
          "-vf", scale, "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-pix_fmt", "yuv420p",
          "-b:v", f"{kbps}k", "-maxrate", f"{kbps}k", "-bufsize", f"{kbps * 2}k"]
null = "NUL" if sys.platform == "win32" else "/dev/null"
subprocess.run(common + ["-pass", "1", "-f", "mp4", null], check=True, cwd=out_dir)
subprocess.run(common + ["-pass", "2", "-movflags", "+faststart", str(mp4)], check=True, cwd=out_dir)
for f in out_dir.glob("ffmpeg2pass*"):
    f.unlink()
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mp4), "-frames:v", "1", "-q:v", "3", str(poster)], check=True)
print(f"{mp4.relative_to(ROOT)} {mp4.stat().st_size / 1048576:.1f} MB, {duration:.0f}s, no audio")
print(f"{poster.relative_to(ROOT)}")
