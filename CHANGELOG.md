# Changelog

All notable changes to Tube Scholar. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-02

First public release.

### Added
- **Study mode** (default for a single video link): a bilingual Arabic/English study guide published as one interactive page.
- 5-minute summary with linked points, a decision table, and quick mode that reduces every section to its key takeaways.
- Section-by-section explanation with key-takeaways and common-mistakes boxes, explainer's notes for anything added.
- Timestamps resolved from word-level caption timings (`resolve_ts.py`), and description chapters re-anchored to the speech (`chapter_map`).
- Concept visuals: `loop`, `matrix`, `spectrum`, `timeline` and `calc`, plus Mermaid diagrams.
- Scenario quiz with score and difficulty levels, open questions, glossary tooltips, in-page search, per-section progress.
- Flashcards with topic and level filters and Leitner spaced repetition; Anki decks per language.
- Independent fact-check step (`references/fact-check-brief.md`) that writes `audit.md`.
- Pre-publish preview (`preview_guide.py`): desktop, phone and visuals screenshots, horizontal-overflow check, Mermaid syntax check.
- A4 cheat-sheet PDF per language (`cheatsheet.py`) and a playlist hub page (`build_hub.py`).
- `--standalone` build for hosting a guide outside claude.ai.
- Subtitles, audio and video download modes.
- Claude Code plugin and marketplace manifests, CI, and an end-to-end test suite on a synthetic fixture.

[1.0.0]: https://github.com/Shalaby-VBS/tube-scholar/releases/tag/v1.0.0
