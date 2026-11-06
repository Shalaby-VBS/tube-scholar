#!/usr/bin/env python3
"""Build ONE long page for a whole playlist: a course header with an index of every video, then each
video's complete study guide (hero, TL;DR, chapters, explanation, quiz, resources, flashcards) in order.

Usage: build_course.py <course.html> "<playlist title>" <guide-dir> [<guide-dir> ...] [--standalone]

Each guide-dir is a finished guide folder (guide.json, guide.<lang>.md, cards, meta/). Every feature
works per video on the shared page: ids are prefixed v1-, v2-, ..., progress and flashcard reviews are
kept per video (the same browser keys as the video's own guide page), and one language switch flips
every video. Needs the `markdown` package: run it with the venv python from SKILL.md.
"""
import base64, html, json, shutil, subprocess, sys, tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guide  # noqa: E402
from build_guide import RTL, bidi, page_html, render_wraps  # noqa: E402

_TMP = Path(tempfile.mkdtemp(prefix='tube-course-'))
_full_uri = build_guide.uri


def uri(path, width=640):
    """build_guide.uri, but JPEGs scaled down to `width` px: a course embeds ~40 thumbnails, avatars and
    related-video images, and the 1100 px originals were 3 MB of the page."""
    p = Path(path)
    if not p.exists():
        return ''
    if p.suffix.lower() in ('.jpg', '.jpeg') and shutil.which('sips'):
        out = _TMP / f'{abs(hash(str(p)))}.jpg'
        r = subprocess.run(['sips', '-Z', str(width), '-s', 'format', 'jpeg', '-s', 'formatOptions', '72', str(p), '--out', str(out)], capture_output=True)
        if r.returncode == 0 and out.exists() and out.stat().st_size < p.stat().st_size:
            return 'data:image/jpeg;base64,' + base64.b64encode(out.read_bytes()).decode()
    return _full_uri(p)
# shortcut: sips is macOS-only; elsewhere the full-size images are kept. Upgrade trigger: building courses off macOS.

T = {
 'ar': dict(kicker='COURSE · FULL PLAYLIST', sub='البلاي ليست كلها في صفحة واحدة: كل فيديو ليه دليله الكامل بالترتيب، خلاصة وشرح لكل جزء وأسئلة سيناريو و Flashcards.',
            videos='فيديو', hours='ساعة فيديو', secs='قسم شرح', cards='كارت مراجعة', index='فهرس الفيديوهات', of='فيديو {i} من {n}'),
 'en': dict(kicker='COURSE · FULL PLAYLIST', sub='The whole playlist on one page: every video gets its complete guide, in order, with a summary, an explanation of each part, scenario questions and flashcards.',
            videos='videos', hours='hours of video', secs='guide sections', cards='flashcards', index='Video index', of='Video {i} of {n}'),
}

CSS = '''<style>
.course{display:block;max-width:1100px}
.course h1{margin-top:8px}
.course .facts{margin:10px 0 4px}
.cidx{list-style:none;padding:0;margin:18px 0 8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:12px}
.cidx a{display:grid;grid-template-columns:120px minmax(0,1fr);gap:12px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px;color:inherit;text-decoration:none;box-shadow:var(--shadow)}
.cidx a:hover,.cidx a:focus-visible{border-color:var(--accent)}
.cidx img{width:120px;aspect-ratio:16/9;object-fit:cover;border-radius:8px;display:block}
.cidx .n{font-family:var(--mono);font-size:12px;color:var(--accent);font-weight:600;display:block}
.cidx b{font-family:var(--display);font-size:14.5px;line-height:1.5;display:block;overflow-wrap:anywhere}
.cidx small{font-size:12px;color:var(--muted)}
.cvid{scroll-margin-top:12px;overflow-anchor:none}
.cph{min-height:150vh}
.csep{max-width:1100px;margin:56px auto 0;padding:14px 18px;border-top:3px solid var(--accent);font-family:var(--mono);font-size:13px;font-weight:600;color:var(--accent)}
</style>'''


def secs(s):
    """'1:26:12' / '50:13' -> seconds (fetch_meta.py keeps only duration_string)."""
    t = 0
    for part in s.split(':'):
        t = t * 60 + int(part) if part.isdigit() else t
    return t


def main():
    args = [a for a in sys.argv[1:] if a != '--standalone']
    if len(args) < 3:
        sys.exit(__doc__)
    out, title, dirs = Path(args[0]).expanduser(), args[1], [Path(d).expanduser().resolve() for d in args[2:]]
    vids, datas, langs = [], [], None
    build_guide.uri = uri  # render_wraps embeds the hero, avatar, banner and related images through this
    for i, d in enumerate(dirs, 1):
        wraps, data, G, gl = render_wraps(d, f'v{i}-')
        data['box'] = f'v{i}'
        V = json.loads((d / 'meta/video.json').read_text())
        n_cards = len(data[gl[0]]['cards'])
        n_secs = sum(1 for l in (d / f'guide.{gl[0]}.md').read_text().splitlines() if l.startswith('## ') and l[3:4].isdigit())
        vids.append(dict(wraps=wraps, G=G, V=V, cards=n_cards, secs=n_secs, thumb=uri(d / 'meta/thumb.jpg')))
        datas.append(data)
        langs = [l for l in (langs or gl) if l in gl]
    langs = langs or ['en']
    e, n = html.escape, len(vids)
    hours = sum(secs(v['V'].get('duration_string', '')) for v in vids) / 3600
    heads = []
    for ix, lang in enumerate(langs):
        t = T.get(lang, T['en']); iso = bidi if lang in RTL else (lambda h: h)
        facts = (f'<span><b>{n}</b> {t["videos"]}</span><span><b>{hours:.1f}</b> {t["hours"]}</span>'
                 f'<span><b>{sum(v["secs"] for v in vids)}</b> {t["secs"]}</span><span><b>{sum(v["cards"] for v in vids)}</b> {t["cards"]}</span>')
        idx = ''.join(
            f'<li><a href="#v{i}"><img src="{v["thumb"]}" alt="" loading="lazy"><span><span class="n">{i:02d} · {e(v["V"].get("duration_string", ""))}</span>'
            f'<b>{iso(e(v["G"]["h1"].get(lang, v["V"]["title"])))} {iso(e(v["G"].get("h1_em", {}).get(lang, "")))}</b>'
            f'<small>{v["secs"]} {t["secs"]} · {v["cards"]} {t["cards"]}</small></span></a></li>' for i, v in enumerate(vids, 1))
        heads.append(f'<div class="wrap course" dir="{"rtl" if lang in RTL else "ltr"}" lang="{lang}" data-course-lang="{lang}"{" hidden" if ix else ""}>'
                     f'<header class="top"><div class="eyebrow"><span class="pill">{t["kicker"]}</span></div><h1>{e(title)}</h1>'
                     f'<p class="sub">{iso(t["sub"])}</p><div class="facts">{facts}</div></header>'
                     f'<nav aria-label="{t["index"]}"><ol class="cidx">{idx}</ol></nav></div>')
    seps = lambda i, v: ''.join(  # noqa: E731  one divider line per language, switched with the course header
        f'<div class="csep" data-course-lang="{l}" dir="{"rtl" if l in RTL else "ltr"}"{" hidden" if k else ""}>{T.get(l, T["en"])["of"].format(i=i, n=n)} · '
        f'<bdi>{e(v["V"]["title"])}</bdi></div>' for k, l in enumerate(langs))
    body = CSS + '\n' + '\n'.join(heads) + '\n' + '\n'.join(
        # each video stays inert in a <template> until guide.js mounts it near the viewport
        f'<section class="cvid" id="v{i}">{seps(i, v)}\n<div class="cph" aria-hidden="true"></div><template class="lazy">' + '\n'.join(v['wraps']) + '</template></section>'
        for i, v in enumerate(vids, 1))
    page = page_html(title, langs, body, datas, '--standalone' in sys.argv)
    out.write_text(page)
    mb = len(page.encode()) / 1e6
    # shortcut: every video embeds its own thumbnail/avatar/banner copies; dedupe images past ~15 MB (artifact cap is 16 MB)
    print(f'{out}  {mb:.1f} MB  {n} videos  langs={",".join(langs)}' + ('  WARNING: over 15 MB, the artifact cap is 16 MB' if mb > 15 else ''))


if __name__ == '__main__':
    main()
