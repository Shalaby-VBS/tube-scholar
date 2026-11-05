"""End-to-end checks for the study-guide pipeline, run on a small synthetic fixture.

    python -m unittest discover -s tests -v

Needs the `markdown` package (`pip install markdown==3.7`). The JavaScript syntax check runs
only when `node` is on PATH.
"""
import collections
import json
import py_compile
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL = ROOT / 'skills' / 'tube-scholar'
SCRIPTS = SKILL / 'scripts'
FIXTURE = Path(__file__).resolve().parent / 'fixture'


def run(*args):
    return subprocess.run([sys.executable, *map(str, args)], capture_output=True, text=True)


class Pipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp())
        cls.dir = cls.tmp / 'guide'
        shutil.copytree(FIXTURE, cls.dir)
        cls.resolve = run(SCRIPTS / 'resolve_ts.py', cls.dir)
        cls.build = run(SCRIPTS / 'build_guide.py', cls.dir)
        cls.page = (cls.dir / 'guide.html').read_text() if (cls.dir / 'guide.html').exists() else ''

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_scripts_compile(self):
        for script in SCRIPTS.glob('*.py'):
            py_compile.compile(str(script), doraise=True)

    def test_timestamps_resolve_from_spoken_words(self):
        self.assertEqual(self.resolve.returncode, 0, self.resolve.stdout + self.resolve.stderr)
        md = (self.dir / 'guide.en.md').read_text()
        self.assertNotIn('[[ts:', md)
        self.assertIn('▶️ [00:30](https://www.youtube.com/watch?v=TESTVIDEO01&t=30s)', md)

    def test_unknown_phrase_fails(self):
        bad = self.tmp / 'bad'
        shutil.copytree(FIXTURE, bad)
        (bad / 'guide.en.md').write_text('## x\n\n▶️ [[ts: words the speaker never said]]\n')
        (bad / 'guide.ar.md').unlink()
        result = run(SCRIPTS / 'resolve_ts.py', bad)
        self.assertEqual(result.returncode, 1)
        self.assertIn('words the speaker never said', result.stdout)

    def test_build_succeeds_with_no_placeholders(self):
        self.assertEqual(self.build.returncode, 0, self.build.stderr)
        self.assertTrue(self.page)
        self.assertEqual(re.findall(r'%%[A-Za-z0-9_]+%%', self.page), [])
        self.assertNotIn('warning', self.build.stderr)

    def test_ids_unique_and_anchors_resolve(self):
        ids = re.findall(r'(?<![\w-])id="([^"]+)"', self.page)
        dupes = [k for k, v in collections.Counter(ids).items() if v > 1]
        self.assertEqual(dupes, [])
        broken = {h for h in re.findall(r'href="#([^"]+)"', self.page) if '+' not in h} - set(ids)
        self.assertEqual(broken, set())

    def test_both_editions_and_features_render(self):
        self.assertIn('data-lang="ar"', self.page)
        self.assertIn('data-lang="en" hidden', self.page)
        for marker in ('class="kt"', 'class="mx"', 'class="mcq"', 'class="mcq-exp"', 'class="ans"', 'class="done"',
                       'class="gt"', 'class="qlv', 'class="note"', 'class="ts"', 'pre class="mermaid"', 'id="q-search"'):
            self.assertIn(marker, self.page, marker)
        for visual in ('diagram loopfig', 'class="matrix"', 'class="spectrum"', 'class="timeline"', 'class="calc"'):
            self.assertEqual(self.page.count(visual), 2, visual)  # once per language

    def test_chapter_map_uses_caption_time(self):
        self.assertIn('&amp;t=30s" target="_blank" rel="noopener"><time>00:30</time><span class="en">Cache Basics', self.page)

    def test_latin_terms_isolated_in_arabic(self):
        arabic = self.page.split('data-lang="en"')[0]
        self.assertIn('<span class="lat" dir="ltr">Caching</span>', arabic)

    def test_markup_balanced(self):
        for tag in ('div', 'span', 'section', 'dfn'):
            self.assertEqual(len(re.findall(rf'<{tag}\b', self.page)), self.page.count(f'</{tag}>'), tag)

    @unittest.skipUnless(shutil.which('node'), 'node not installed')
    def test_page_script_parses(self):
        script = re.findall(r'<script>\n(.*?)</script>', self.page, re.S)[-1]
        js = self.tmp / 'page.js'
        js.write_text(script)
        result = subprocess.run(['node', '--check', str(js)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_standalone_build_adds_skeleton_and_mermaid(self):
        out = self.tmp / 'standalone.html'
        result = run(SCRIPTS / 'build_guide.py', self.dir, '--out', out, '--standalone')
        self.assertEqual(result.returncode, 0, result.stderr)
        page = out.read_text()
        self.assertTrue(page.startswith('<!doctype html>'))
        self.assertIn('mermaid.min.js', page)

    def test_hub_builds(self):
        guide = self.tmp / 'hub-guide'
        shutil.copytree(self.dir, guide)
        data = json.loads((guide / 'guide.json').read_text())
        data['artifact_url'] = 'https://example.com/guide'
        (guide / 'guide.json').write_text(json.dumps(data))
        out = self.tmp / 'hub.html'
        result = run(SCRIPTS / 'build_hub.py', out, 'Test path', guide)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('https://example.com/guide', out.read_text())


class OtherSites(unittest.TestCase):
    """A guide for a lecture outside YouTube: links open the site's own page, labels name the site."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.dir = self.tmp / 'guide'
        shutil.copytree(FIXTURE, self.dir)

    def build(self, *meta_args):
        result = run(SCRIPTS / 'lecture_meta.py', self.dir, *meta_args)
        self.assertEqual(result.returncode, 0, result.stderr)
        for step in ('resolve_ts.py', 'build_guide.py'):
            result = run(SCRIPTS / step, self.dir)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return (self.dir / 'guide.en.md').read_text(), (self.dir / 'guide.html').read_text()

    def test_coursera_lecture_links_to_its_page(self):
        url = 'https://www.coursera.org/learn/ml/lecture/iYR2y/welcome'
        md, page = self.build('--url', url, '--title', 'Welcome', '--chapters', '0 Intro|30 Cache Basics')
        self.assertIn(f'▶️ [00:30]({url})', md)
        self.assertNotIn('youtube.com/watch', page)  # the fixture's socials still link a YouTube channel
        self.assertIn('Play the video on Coursera', page)
        self.assertNotIn('>—</b><span>Views', page)  # no counts from the site, so no empty stat tiles

    def test_vimeo_link_jumps_to_the_minute(self):
        md, _ = self.build('--url', 'https://vimeo.com/76979871', '--title', 'Talk', '--chapters', '0 Intro|30 Cache Basics')
        meta = json.loads((self.dir / 'meta/video.json').read_text())
        self.assertEqual(meta['platform'], 'Vimeo')
        self.assertIn('▶️ [00:30](https://vimeo.com/76979871#t=30s)', md)


if __name__ == '__main__':
    unittest.main()
