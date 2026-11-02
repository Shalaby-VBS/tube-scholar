# Contributing to Tube Scholar

Thanks for helping make video learning better. Bug reports, ideas and pull requests are all welcome.

## Before you start

- **Bugs and ideas:** open an [issue](https://github.com/Shalaby-VBS/tube-scholar/issues/new/choose) first, with the video link when the problem is in a generated guide.
- **Bigger changes** (a new page feature, a new visual component, a change to the file contract): describe the idea in an issue before writing code, so we can agree on the shape.

## Project layout

| Path | What lives there |
|---|---|
| `skills/tube-scholar/SKILL.md` | The steps Claude follows |
| `skills/tube-scholar/references/` | The file contract and quality bar (`guide-format.md`), the fact-check brief |
| `skills/tube-scholar/scripts/` | The pipeline scripts |
| `skills/tube-scholar/assets/` | The page template, styles and behaviour |
| `tests/` | End-to-end tests on a synthetic bilingual fixture |
| `docs/` | README images and the live demo |

## Development setup

```bash
git clone https://github.com/Shalaby-VBS/tube-scholar.git
cd tube-scholar
python3 -m venv .venv && . .venv/bin/activate
pip install markdown==3.7
python -m unittest discover -s tests -v
```

To try your working copy inside Claude Code, link it as a skill:

```bash
ln -s "$PWD/skills/tube-scholar" ~/.claude/skills/tube-scholar
```

## Ground rules

1. **Accuracy first.** Anything a guide states must come from the transcript or be labelled as an explainer's note. Changes that weaken a check (`resolve_ts.py`, the fact-check, the preview) need a strong reason.
2. **Both languages.** Every user-facing string exists in Arabic and English, and every layout works right-to-left and left-to-right.
3. **No new runtime dependencies** without discussion. The page is a single self-contained HTML file; scripts use the standard library plus `markdown`.
4. **Keep the contract in sync.** If you change a marker, a fence or a `guide.json` key, update `references/guide-format.md` and the fixture in `tests/fixture/`.
5. **Look before you ship.** For page changes, build a guide, run `preview_guide.py`, and read the screenshots.

## Pull requests

- One topic per pull request, with a short description of what changed and why.
- Tests pass (`python -m unittest discover -s tests -v`); CI runs them on every push.
- Add an entry under an `Unreleased` heading in `CHANGELOG.md`.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
