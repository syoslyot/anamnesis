# Adding Platform Support

This document explains how to add anamnesis support for a new AI coding agent platform.

## What needs to be implemented

Each platform requires two components:

| Component | Purpose |
|-----------|---------|
| **Hook** | Runs before every AI message; injects `.anamnesis/` state into context |
| **Skill** | Slash command (`/am`) for explicit hypothesis/experiment management |

---

## 1. Hook

The hook reads `.anamnesis/` and outputs a context block that the platform injects into the AI's context window before each user message.

### Input

Platforms should pass a JSON object to the hook via stdin:

```json
{
  "cwd": "/path/to/user/project"
}
```

`cwd` tells the hook where to find `.anamnesis/`. If omitted, the hook falls back to `process.cwd()`.

### Output

The hook writes a JSON object to stdout:

```json
{
  "additionalContext": "<anamnesis>\n\nOpen Hypotheses:\n  • [id] ...\n\n</anamnesis>"
}
```

If there is nothing to inject (no active hypotheses or experiments), the hook exits without writing to stdout.

### Reference implementation

The Node.js hook in `templates/common/.anamnesis/hooks/inject-context.js` is the canonical implementation. It is platform-agnostic: the only platform-specific part is how it is invoked (see below).

### Claude Code registration

The hook is registered in `.claude/settings.json` as a `UserPromptSubmit` hook:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "node .anamnesis/hooks/inject-context.js" }]
      }
    ]
  }
}
```

### Codex: pre-session sync approach

Codex does not support real-time hooks. Instead, anamnesis installs a sync script:

```
.anamnesis/hooks/sync-context.js
```

Running this script before a Codex session writes the current research state to `.anamnesis/context.md`. The AGENTS.md snippet references this file so Codex reads it at session start.

```bash
node .anamnesis/hooks/sync-context.js
codex  # start session
```

### Adding a new platform

1. Determine whether the target platform supports pre-message hooks and what their invocation format is.
2. If the platform can invoke a shell command and pipe JSON to stdin, the existing `inject-context.js` can be reused as-is.
3. If it uses a file-based context approach (like Codex), reuse `sync-context.js` — it produces the same `<anamnesis>` block but writes it to a file instead of stdout.
4. If neither, port the context-building logic. The core algorithm:
   - Read `.anamnesis/config.yaml` for settings
   - Read all `.md` files from `.anamnesis/hypotheses/` and `.anamnesis/experiments/`
   - Parse YAML frontmatter to get `status`, `id`, `updated`
   - Extract `firstLine` (first non-heading body line) and `conclusion` (content under `## Conclusion` or `## 結論`)
   - Emit the `<anamnesis>` block

---

## 2. Skill

The skill is a markdown file that instructs the AI how to respond to `/am` subcommands. It is platform-specific only in its invocation syntax.

### Subcommands

All platforms implement the same subcommands:

| Subcommand | Action |
|------------|--------|
| `hyp` | Create a new hypothesis file |
| `exp` | Create a new experiment file |
| `run` | Set experiment status → `running` |
| `done` | Fill results/conclusion, set status → `concluded` |
| `find [keyword]` | Search across all anamnesis files |
| `status` | Print overview of all hypotheses and experiments |

### File format

Hypotheses and experiments use the same markdown + YAML frontmatter format regardless of platform. See `README.md` for the full format specification.

Section headers may be in English or Chinese — the hook detects both. Skills should use whichever language fits the platform's typical user base, or use English for broader compatibility.

### Template locations

```
templates/
  claude/skills/am/SKILL.md   # Claude Code (/am slash command)
  codex/skills/am/SKILL.md    # OpenAI Codex
```

### Adding a new platform

1. Create `templates/<platform>/skills/am/SKILL.md`.
2. Copy the structure from `templates/claude/skills/am/SKILL.en.md` (English) or `SKILL.md` (Chinese).
3. Adjust the invocation syntax for the target platform (e.g. remove the leading `/` if the platform doesn't use it).
4. Add the platform to `setup.js`: `PLATFORMS` array, `skillsDir()` mapping, and any platform-specific install steps.
5. Update the platform support table in `README.md`.

---

## Platform support status

| Platform | Hook | Skill | Notes |
|----------|------|-------|-------|
| Claude Code | ✅ | ✅ | Real-time `UserPromptSubmit` hook |
| Codex | ✅ | ✅ | Pre-session sync via `sync-context.js` |
| OpenCode | — | — | Planned |
