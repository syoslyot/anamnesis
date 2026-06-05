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
  "cwd": "/path/to/user/project",
  "session_id": "abc123"
}
```

`cwd` tells the hook where to find `.anamnesis/`. If omitted, the hook falls back to `process.cwd()`.

`session_id` is used for per-session injection deduplication — the hook skips output if the context hasn't changed since it was last injected for this session. If omitted, all requests share a single `"default"` session bucket (dedup still works, but multiple simultaneous sessions may interfere with each other).

### Output

The hook writes a JSON object to stdout:

```json
{
  "additionalContext": "<anamnesis>\n\nOpen Hypotheses:\n  • [id] ...\n\n</anamnesis>"
}
```

If there is nothing to inject (no active hypotheses or experiments), the hook exits without writing to stdout.

### Context block structure

```
<anamnesis>

Open Hypotheses:
  • [<id>] <first line of research question>

Running Experiments:
  • [<id>] <first line of testable claim> (n=X if run count is set)

Blocked Experiments:
  ⏸ [<id>] <first line> — <blocked_by reason>

Planned Experiments:          ← only when include_planning: true
  • [<id>] <first line>

Recent Conclusions:
  [<id>] <conclusion first line> (n=X if run count is set)

</anamnesis>
```

Parked hypotheses and concluded experiments beyond `max_concluded` are not injected.

### Reference implementation

`templates/common/.anamnesis/hooks/inject-context.js` is the canonical implementation. It is platform-agnostic: the only platform-specific part is how it is invoked.

### Claude Code registration

Registered in `.claude/settings.json` as a `UserPromptSubmit` hook:

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

Codex does not support real-time hooks. Instead, anamnesis installs a sync script at `.anamnesis/hooks/sync-context.js`. Running it before a session writes the current research state to `.anamnesis/context.md`, which the AGENTS.md snippet references.

```bash
node .anamnesis/hooks/sync-context.js
codex  # start session
```

### Adding a new platform

1. Determine whether the target platform supports pre-message hooks and what their invocation format is.
2. If the platform can invoke a shell command and pipe JSON to stdin, `inject-context.js` can be reused as-is.
3. If it uses a file-based context approach (like Codex), reuse `sync-context.js` — it produces the same `<anamnesis>` block but writes to a file instead of stdout.
4. If neither, port the context-building logic:
   - Read `.anamnesis/config.yaml` for settings
   - Read all `.md` files from `.anamnesis/hypotheses/` and `.anamnesis/experiments/`
   - Parse YAML frontmatter: `status`, `id`, `updated`, `n`, `blocked_by`
   - Extract `firstLine` (first non-heading body line) and `conclusion` (content under the configured conclusion header)
   - Emit the `<anamnesis>` block following the structure above

---

## 2. Skill

The skill is a markdown file that instructs the AI how to respond to `/am` subcommands. It is platform-specific only in its invocation syntax (e.g. `/am` vs `am`).

### Subcommands

All platforms implement the same subcommands:

| Subcommand | Action |
|------------|--------|
| `hyp` | Create a new hypothesis (infers from context, draft+confirm) |
| `exp` | Create a new experiment file |
| `run` | Set experiment status → `running` |
| `done` | Fill conclusion, set status → `concluded`; offer report |
| `rerun` | Append a run to the run log; update `n:` counter |
| `compare` | Metrics comparison table for concluded experiments under a hypothesis |
| `report` | Write experiment report using `prompts/report.md` |
| `review` | Professor critique using `prompts/review.md` |
| `correct` | Revised report using `prompts/correct.md` |
| `park` | Set hypothesis status → `parked` |
| `unpark` | Set hypothesis status → `open` |
| `block` | Set experiment status → `blocked` (with optional reason) |
| `unblock` | Set experiment status → `running` |
| `find [keyword]` | Search across all anamnesis files |
| `status` | Full research overview |

### Skill generation

Skills are generated from `SKILL.template.md` by `setup.js`, which substitutes `{{section_name}}` placeholders with the values from `config.yaml`. This ensures the generated skill uses the correct section headers for each project.

Template locations:

```
templates/
  claude/skills/am/SKILL.template.md
  codex/skills/am/SKILL.template.md
```

### Adding a new platform

1. Create `templates/<platform>/skills/am/SKILL.template.md`.
2. Copy the structure from `templates/claude/skills/am/SKILL.template.md`.
3. Adjust the invocation syntax (e.g. remove the leading `/` if the platform doesn't use slash commands).
4. Add the platform to `setup.js`: `PLATFORMS` array, `skillsDir()` mapping, and any platform-specific install steps.
5. Update the platform support table in `README.md` and this file.

---

## Platform support status

| Platform | Hook | Skill | Notes |
|----------|------|-------|-------|
| Claude Code | ✅ | ✅ | Real-time `UserPromptSubmit` hook |
| Codex | ✅ | ✅ | Pre-session sync via `sync-context.js` |
| OpenCode | — | — | Planned |
| Cursor | — | — | Planned |
| Gemini CLI | — | — | Planned |
