# Installation Specification

**Entry point**: `setup.js`  
**Runtime**: Node.js >= 18, no additional dependencies

---

## CLI Interface

```
node setup.js [--platform <platform>] [--target <path>] [uninstall]
```

| Flag / Argument  | Values          | Default   | Description                                  |
|------------------|-----------------|-----------|----------------------------------------------|
| `--platform`     | `claude`, `codex` | prompted | Target AI agent platform                     |
| `--target`       | directory path  | `cwd`     | Project directory to install anamnesis into  |
| `uninstall`      | positional arg  | —         | Trigger uninstall flow instead of install    |

If `--platform` is not provided, the setup script prompts interactively.

---

## Install Flow

Given `--platform claude` and `--target /path/to/project`:

### Step 1 — Create `.anamnesis/` structure

Creates the following inside `<target>`:

```
.anamnesis/
  hooks/inject-context.js    (copied from templates/common)
  hypotheses/.gitkeep
  experiments/.gitkeep
  reports/.gitkeep
  prompts/
    report.md                (from templates/common)
    review.md                (from templates/common)
    correct.md               (from templates/common)
  config.yaml                (from templates/common)
  .needs-customization       (empty marker file)
```

**Skip rule**: existing files inside `.anamnesis/` are not overwritten. The skill is always regenerated (see step 3).

### Step 2 — Append snippet to `CLAUDE.md` / `AGENTS.md`

- **Claude**: appends the anamnesis snippet from `templates/claude/claude-md-snippet.md` to `<target>/CLAUDE.md`. Creates the file if it does not exist.
- **Codex**: appends from `templates/codex/agents-md-snippet.md` to `<target>/AGENTS.md`.

The snippet contains the AI instructions that enable auto-recording and first-session customization.

**Idempotency**: if the marker comment `<!-- anamnesis-snippet -->` already exists in the file, the snippet is not appended again.

### Step 3 — Generate the skill

Writes `.claude/skills/am/SKILL.md` (Claude) or the platform equivalent with the current section names from `config.yaml`. This file is always regenerated so section names stay in sync.

### Step 4 — Register the hook

**Claude Code**: reads `<target>/.claude/settings.json` (creates if missing) and adds the `UserPromptSubmit` hook entry for `inject-context.js`. Does not duplicate an existing entry.

**Codex**: copies `templates/codex/.anamnesis/hooks/sync-context.js` to `<target>/.anamnesis/hooks/sync-context.js`. Instructs the user to run it before each session.

---

## Uninstall Flow

```
node setup.js uninstall [--platform <platform>] [--target <path>]
```

1. Prompt for confirmation before deleting any data.
2. Remove the anamnesis snippet from `CLAUDE.md` / `AGENTS.md` (identified by marker comment).
3. Deregister the hook from `.claude/settings.json`.
4. Delete `.anamnesis/` recursively.

---

## npx Usage

```bash
npx anamnesis@github:syoslyot/anamnesis init --platform claude
npx anamnesis@github:syoslyot/anamnesis init --platform codex
```

`init` is an alias for the default install flow. The `--target` flag defaults to the current working directory.

---

## What Setup Does Not Do

- Does not modify global config files (`~/.bashrc`, `~/.zshrc`, etc.).
- Does not install any runtime npm packages — the hook uses only Node.js built-ins.
- Does not create or modify `.gitignore` (recommended: add `.anamnesis/.inject-cache.json`).
