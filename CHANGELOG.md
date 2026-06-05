# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.6] — 2026-06-05

No new features. Version bump accompanying the dedup-cache documentation updates from 0.2.5.

---

## [0.2.5] — 2026-06-04

### Added

- **Session-aware injection deduplication** — the hook now tracks a per-session MD5 hash of the injected context block. If the research state hasn't changed since the last message in the same session, the hook exits silently (no output, no token cost). On the first message of a new session the full context is always injected.
- **`.inject-cache.json` cache file** — written to `.anamnesis/` at runtime; tracks up to 20 sessions, pruning oldest entries automatically. Recommended to add to `.gitignore`.

### Changed

- Hook output is now completely silent on cache hits — previous behaviour always injected the block.
- `docs/design.md` and `docs/platforms.md` updated to document dedup cache behaviour and Codex input format.

---

## [0.2.4] — 2026-06-03

### Added

- **`anamnesis uninstall` command** — removes the anamnesis snippet from `CLAUDE.md` / `AGENTS.md`, deregisters the hook from `.claude/settings.json`, and deletes `.anamnesis/`. Prompts for confirmation before deleting data.
- Test coverage for `uninstall`, `removeSnippet`, and `removeHook` edge cases.

### Fixed

- Customization question in setup was shown even when the target project already had enough context to auto-customize. Now only asked when context is genuinely missing.

---

## [0.2.3] — 2026-06-02

### Added

- **Standalone experiments** — `hypothesis:` field in experiment frontmatter is now optional. Experiments can exist without a parent hypothesis; they appear in context injection and `/am status` just like hypothesis-linked ones.
- **Auto-customization on first session** — after install, `setup.js` creates `.anamnesis/.needs-customization`. On the first session, the AI reads project context (CLAUDE.md / AGENTS.md, README, `docs/`, `doc/`, `spec/`) and rewrites `.anamnesis/prompts/` to match the project domain. The marker is deleted after customization completes.
- Test coverage for standalone experiment injection and auto-customization detection.

### Changed

- `templates/experiment.md` — `hypothesis:` line marked as optional with a comment.
- `templates/common/.anamnesis/prompts/report.md` — prompt updated to handle experiments without a parent hypothesis.

---

## [0.2.2] — 2026-06-01

### Added

- MIT license (`LICENSE`).
- GitHub community files: `CONTRIBUTING.md`, `PULL_REQUEST_TEMPLATE.md`, `SECURITY.md`, bug-report and feature-request issue templates.

---

## [0.2.1] — 2026-05-31

### Changed

- Default section names changed from Chinese to English (`Research Question`, `Current Belief`, `Testable Claim`, etc.). Chinese names remain fully supported via `config.yaml`.
- Updated all template files and tests to match the new English defaults.

---

## [0.2.0] — 2026-05-30

### Added

- **Full research lifecycle commands** — `/am hyp`, `/am exp`, `/am run`, `/am done`, `/am rerun`, `/am compare`, `/am park`, `/am unpark`, `/am block`, `/am unblock`, `/am find`, `/am status`.
- **Report workflow** — `/am report`, `/am review`, `/am correct` with customizable prompt templates in `.anamnesis/prompts/`.
- **Codex support** — pre-session sync hook (`sync-context.js`) and `AGENTS.md` snippet.
- **Config-driven section names** — all markdown section headers read from `.anamnesis/config.yaml`; the hook reads `sections.conclusion` at runtime, the skill uses all names when creating files.
- **`inject.include_planning` config option** — opt in to showing planning experiments in context (off by default).
- **`inject.max_concluded` config option** — controls how many recent concluded experiments appear in context (default 3).
- **`reports.auto` config option** — when `true`, runs `/am report` automatically after `/am done`.
- **Auto-write `CLAUDE.md` / `AGENTS.md`** — setup appends the anamnesis snippet if the file exists, or creates it if not.
- **Test suite** — 56+ tests using `node:test`, zero new runtime dependencies.
- **`--platform` and `--target` CLI flags** for `setup.js`.
- Run log (`## Run Log` table) and `n:` counter in experiment files, managed by `/am rerun`.
- `metrics:` structured key-value field in experiment frontmatter, set by `/am done`.
- `blocked_by:` field in experiment frontmatter for blocked experiments.
- `parent:` field in hypothesis frontmatter for hypothesis hierarchies.

### Changed

- Hook now injects a structured `<anamnesis>` block with separate sections for open hypotheses, running experiments, blocked experiments, and recent conclusions.
- Parked hypotheses and planning experiments excluded from injection by default.
- Context injection is token-proportional to active work only.

### Removed

- Hardcoded Chinese section headers — all headers now config-driven.

---

[0.2.6]: https://github.com/syoslyot/anamnesis/compare/v0.2.5...release/0.2.6
[0.2.5]: https://github.com/syoslyot/anamnesis/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/syoslyot/anamnesis/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/syoslyot/anamnesis/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/syoslyot/anamnesis/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/syoslyot/anamnesis/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/syoslyot/anamnesis/releases/tag/v0.2.0
