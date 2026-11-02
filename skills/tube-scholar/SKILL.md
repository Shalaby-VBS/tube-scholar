---
name: tube-scholar
description: Turn any YouTube video into a bilingual (Arabic/English) study guide published as an interactive page — a 5-minute summary and decision table, an academic explanation with every section linked to its minute in the video, animated concept visuals, scenario quiz, glossary tooltips, spaced-repetition flashcards, an independent fact-check and a cheat-sheet PDF; a playlist gets a hub page. Also pulls plain subtitles/transcripts, audio or video for a video, playlist or channel. Use when the user pastes a YouTube link, wants a video explained, summarized for learning, turned into notes, a study guide, flashcards or a quiz ("اشرحلي الفيديو", "اعمل شرح للفيديو ده", "study guide", "لخصلي الفيديو للمذاكرة"), or asks for a transcript, subtitles, captions, audio or a download from YouTube ("هات الترجمة", "نزّل الـ subtitles", "عاوز الـ transcript", "نزّل البلاي ليست", "هات الصوت بس", "/tube-scholar").
---

# Tube Scholar

Turn a YouTube link into something to learn from: by default a full study-guide page (§7); on request, plain subtitles, audio or video in a tidy folder, with nothing dumped in the home directory.

**Paths.** `$SKILL` below is this skill's own folder: the "Base directory for this skill" shown when it loads (`~/.claude/skills/tube-scholar` for a manual install, a plugin-cache path when installed as a plugin). Expand it before running a command.

## 1. Read the request

| User wants | Mode |
|---|---|
| a single-video link with no other words, "اشرح", "شرح", "explain", "study guide", "flashcards", "quiz", "للمذاكرة" | **study** (default for one video; runs subs first, then §7) |
| "ترجمة", "subtitles", "transcript", "captions" only, or a playlist/channel link with no other words | **subs** |
| "صوت", "audio", "mp3", "podcast" | **audio** |
| "فيديو", "download the video", "نزّل الفيديو" | **video** |

Language: default `en`. Arabic-speaking request for Arabic content, or "عربي" → `ar`. Both asked → `en,ar`.

Scope: a URL with `list=` is a playlist. yt-dlp downloads the whole list by default. If the user's words point at one video ("الفيديو ده"), add `--no-playlist`; otherwise take the whole list and say so in the reply.

Strip markdown brackets/angle brackets the user may have wrapped around the URL. Always quote the URL (`&` breaks the shell).

## 2. Preflight

```bash
command -v yt-dlp >/dev/null || brew install yt-dlp
command -v ffmpeg >/dev/null || brew install ffmpeg   # audio/video modes only
yt-dlp --flat-playlist --print "%(playlist_index)s %(title)s" "<URL>" 2>&1 | head -60
```

The listing gives the item count and the playlist/video title to name the folder. Playlists over ~50 items in **video** mode: state the count and ask before downloading.

## 3. Output folder

`~/Downloads/tube-scholar/<Folder>/` where `<Folder>` is the playlist title (or video title for a single video), shortened to a readable name with filesystem-hostile characters removed. Output template:

- playlist: `-o "%(playlist_index)s - %(title)s.%(ext)s"`
- single video: `-o "%(title)s.%(ext)s"`

## 4. Run

Common flags for every mode: `--ignore-errors -P "<dir>" -o "<template>"`.

**subs**
```bash
yt-dlp --write-sub --write-auto-sub --sub-langs en --skip-download --ignore-errors \
  -P "<dir>" -o "<template>" "<URL>"
```
`--write-sub` takes human captions when they exist; auto-subs fill the rest.

**audio**
```bash
yt-dlp -x --audio-format mp3 --audio-quality 0 --ignore-errors -P "<dir>" -o "<template>" "<URL>"
```

**video**
```bash
yt-dlp -f "bv*[height<=1080]+ba/b[height<=1080]" --merge-output-format mp4 \
  --ignore-errors -P "<dir>" -o "<template>" "<URL>"
```

Run long jobs with a generous timeout (playlists take minutes). Filter the log to `ERROR|Writing|Destination` lines; never dump the full log.

## 5. Clean text (subs mode)

Auto-subs are `.vtt` with timestamps and rolling duplicate lines — unreadable as-is. When the user wants to read, summarize, or feed them to Claude, convert:

```bash
python3 -I $SKILL/scripts/vtt2txt.py "<dir>"
```

Writes a `.txt` next to each `.vtt`: no timestamps, no tags, no repeated lines, wrapped into paragraphs. Offer this in the reply when not asked.

## 6. Report

- Count downloaded and the folder path, plus `open "<dir>"` as the first line.
- Each failed item with yt-dlp's reason in a few words (removed, private, age-restricted, no subs in that language).
- If a language had no subs, name the languages that exist: `yt-dlp --list-subs "<URL>"`.

## 7. Study mode

Turns one video into a guide someone can learn from without watching: an academic explanation per topic, each linked to its minute in the video, plus a 5-minute summary, quick mode, scenario quiz and flashcards, in Arabic and English, as one artifact page. Read `references/guide-format.md` before writing anything; it is the file contract and the quality bar.

A playlist gets one guide per video only when the user asks; otherwise ask which video. For a playlist or course series, build each video's guide in order (§7 per video, one folder each), then one hub page that links them all with per-video progress:
```bash
~/.cache/tube-scholar/venv/bin/python $SKILL/scripts/build_hub.py "<playlist-dir>/hub.html" "<playlist title>" "<video-dir-1>" "<video-dir-2>" ...
```
Preview it (step 7) and publish it like a guide.

1. **Subs + transcript** (§4 subs, §5 clean text) into the video's folder. That folder is `<dir>` below.
2. **Metadata and images.** Pick up to three related videos the description recommends; when it recommends none, search the speaker's own related videos instead (`--related-search "<speaker> <topic>"`, or list them with `yt-dlp --flat-playlist --print "%(id)s|%(title)s" "ytsearch8:<query>"` and pass the best three as `--related`, skipping re-uploads of this same course):
   ```bash
   python3 -I $SKILL/scripts/fetch_meta.py "<URL>" "<dir>" --related ID1,ID2,ID3
   ```
3. **Read the whole transcript** (`.txt`) and `meta/video.json` (description, chapters). Plan the sections around what the speaker actually teaches; the description's chapters are the skeleton when present.
4. **Write `guide.ar.md`**, then **`guide.en.md`** as its translation (same sections, numbers and anchors), then `cards.ar.txt` / `cards.en.txt` and `guide.json` (with `tags` when the video has none, and a `chapter_map` entry for every description chapter, pointing at the heading where it starts). Put `▶️ [[ts: exact spoken words]]` under every section and subsection heading.
5. **Resolve timestamps:**
   ```bash
   python3 -I $SKILL/scripts/resolve_ts.py "<dir>"
   ```
   Any phrase it reports was not said verbatim: copy the exact words from the transcript and rerun. Never hand-write a timestamp.
5b. **Independent fact-check** (required): send `references/fact-check-brief.md` to a fresh background `general-purpose` agent (not the one that wrote the guide). It writes `<dir>/audit.md`. Fix every `wrong` and `unsupported` finding in both languages (and the cards), mark `unclear` ones as explainer's notes, then rerun step 5.
6. **Build the page** (the builder needs `markdown`; the first line sets up a private venv once):
   ```bash
   [ -x ~/.cache/tube-scholar/venv/bin/python ] || { python3 -m venv ~/.cache/tube-scholar/venv && ~/.cache/tube-scholar/venv/bin/pip -q install markdown==3.7; }
   ~/.cache/tube-scholar/venv/bin/python $SKILL/scripts/build_guide.py "<dir>"
   ```
   It fails on any unfilled placeholder or a `chapter_map` heading with no ▶️ time. Then check: every section the reference guide has is present (header stats and hashtags, chapters, resources with related videos, socials), and `node --check` on the extracted `<script>`, no duplicate `id`s, every `href="#…"` has a target.
7. **Preview, then look** (required): screenshots of the top of the page at desktop and phone width and of every concept visual, plus a horizontal-overflow check at both widths:
   ```bash
   python3 -I $SKILL/scripts/preview_guide.py "<dir>/guide.html"
   ```
   Read the three PNGs in `<dir>/preview/`. Fix anything broken (overflow, clipped or overlapping text, wrong colours, an empty area) in the `.md`/`guide.json` or the skill's assets, rebuild, and preview once more. Never publish with the overflow check failing.
7b. **Cheat sheet PDF**: `python3 -I $SKILL/scripts/cheatsheet.py "<dir>"` writes `cheatsheet.<lang>.pdf` (summary, decision table, every calc/timeline/visual, glossary) next to the guide.
8. **Publish** `<dir>/guide.html` with the Artifact tool (quickstart `intent: "other"` first; on later rebuilds republish the same path). The page embeds its images, so it works from the link alone. Save the artifact link into `guide.json` as `"artifact_url"` (the playlist hub needs it).
9. **Report**: the link, the folder, what each file is, and which accuracy items are explainer additions.

Rebuilds after edits: change the `.md`/`.txt`/`guide.json`, rerun steps 5–8. Never edit `guide.html` by hand; it is regenerated.

## Gotchas

- `HTTP Error 429` / "Sign in to confirm you're not a bot": retry with `--cookies-from-browser chrome` and `--sleep-requests 1`.
- Old yt-dlp breaks often on YouTube changes: `brew upgrade yt-dlp` before debugging anything else.
- Auto-translated tracks (`en-ar` style codes) exist but are low quality — prefer the original language track.
