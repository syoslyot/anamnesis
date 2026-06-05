# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
# Run all tests
npm test

# Run a single test file
node --test test/inject-context.test.js
node --test test/setup.test.js

# Run setup locally (install into a target project)
node setup.js --platform claude --target /path/to/project
node setup.js --platform codex --target /path/to/project

# Uninstall from a target project
node setup.js uninstall --target /path/to/project
```

No build step — the project is plain Node.js with no compilation.

---

## Architecture

This repo is an **installer** that deploys files into user projects. The code here is not the runtime; the files under `templates/` become the runtime once copied into a user's project.

### Two independently-testable modules

**`setup.js`** — the CLI installer/uninstaller. When `require.main !== module`, it exports all its functions so `test/setup.test.js` can exercise them without spawning a child process.

**`templates/common/.anamnesis/hooks/inject-context.js`** — the Claude Code `UserPromptSubmit` hook that runs in the user's project. Same pattern: exports all logic when required as a module, so `test/inject-context.test.js` can call `buildContext`, `parseFrontmatter`, etc. directly.

### `DEFAULT_SECTIONS` is the single source of truth

`inject-context.js` defines `DEFAULT_SECTIONS` (the eight section header names). `setup.js` imports it via `require()`. This means all section name defaults live in one place; `readInstalledSections()` in setup.js reads the user's `config.yaml` and overrides only the keys present there.

### Templates directory layout

```
templates/
  common/         copied verbatim to <target>/.anamnesis/ on install
  claude/
    claude-md-snippet.md      appended to user's CLAUDE.md
    skills/am/SKILL.template.md   generated (not copied) — see below
  codex/
    agents-md-snippet.md
    skills/am/SKILL.template.md
    .anamnesis/hooks/sync-context.js   copied for Codex pre-session sync
```

### Skill generation vs. file copying

`SKILL.template.md` contains `{{section_name}}` placeholders (e.g. `{{conclusion}}`, `{{design}}`). During install, `generateSkill()` reads the already-installed `config.yaml`, substitutes the placeholders, and writes `SKILL.md`. The skill is **always regenerated** on install so section names in the skill stay in sync with the config. All other files in `templates/common/` are copied only if the destination doesn't exist (skip-existing policy).

### Snippet idempotency

The installer wraps the snippet it appends to `CLAUDE.md` / `AGENTS.md` with `<!-- anamnesis:start -->` / `<!-- anamnesis:end -->` markers. Uninstall removes content between those markers. A legacy fallback removes from `## Anamnesis — Research Workflow Memory` to end-of-file for pre-marker installs.

### Hook stdin/stdout contract

Claude Code calls the hook before each user message, passing JSON on stdin:
```json
{ "cwd": "...", "session_id": "...", "prompt": "..." }
```

The hook outputs JSON on stdout if it has something to inject:
```json
{ "additionalContext": "<anamnesis>...</anamnesis>" }
```

Silent exit (no stdout) means no injection. The dedup cache at `.anamnesis/.inject-cache.json` stores `{ session_id: md5_hash }` — if the hash matches the last injection for this session, the hook exits silently.

### YAML parsing

`inject-context.js` uses a hand-rolled line-by-line frontmatter parser (no yaml library). Only keys listed in `NESTED_KEYS = new Set(['metrics'])` are parsed as nested maps. Adding a new nested frontmatter field requires updating `NESTED_KEYS`.
