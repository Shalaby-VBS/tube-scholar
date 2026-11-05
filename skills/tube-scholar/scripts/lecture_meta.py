#!/usr/bin/env python3
"""Write meta/video.json by hand for a lecture yt-dlp cannot read (Coursera, a DRM Udemy course).

Usage: lecture_meta.py <guide-dir> --url URL --title TITLE [--channel NAME] [--duration MM:SS]
                       [--chapters "0 Intro|95 Setup|..."] [--thumb IMAGE_URL] [--lang en]

The subtitles come separately: save the lecture's .vtt into <guide-dir> (SKILL.md, §7d).
The site name (Coursera, Udemy, ...) is taken from the URL, so the page says where the video is.
"""
import argparse, json, re, urllib.request
from pathlib import Path
from urllib.parse import urlparse

ap = argparse.ArgumentParser()
ap.add_argument('dir'); ap.add_argument('--url', required=True); ap.add_argument('--title', required=True)
ap.add_argument('--channel', default=''); ap.add_argument('--duration', default=''); ap.add_argument('--chapters', default='')
ap.add_argument('--thumb', default=''); ap.add_argument('--lang', default='en')
a = ap.parse_args()

host = urlparse(a.url).hostname or ''
if not host:
    raise SystemExit(f'not a URL: {a.url}')
site = host.removeprefix('www.').split('.')[0].capitalize()
path = urlparse(a.url).path.rstrip('/')
chapters = [{'start_time': int(t), 'title': n.strip()} for t, _, n in (c.strip().partition(' ') for c in a.chapters.split('|') if c.strip())]
info = {'id': re.sub(r'\W+', '-', path.split('/')[-1] or host).strip('-'), 'title': a.title, 'channel': a.channel, 'duration_string': a.duration,
        'chapters': chapters, 'language': a.lang, 'webpage_url': a.url, 'extractor_key': site, 'platform': site}
meta = Path(a.dir).expanduser() / 'meta'
meta.mkdir(parents=True, exist_ok=True)
(meta / 'video.json').write_text(json.dumps(info, ensure_ascii=False, indent=1))
(meta / 'related.json').write_text('[]')
if a.thumb:
    try:
        with urllib.request.urlopen(a.thumb, timeout=30) as r:
            (meta / 'thumb.jpg').write_bytes(r.read())
    except OSError as e:
        print(f'skip thumb: {e}')
print(f'meta ready: {a.title} · {site} · {len(chapters)} chapters')
