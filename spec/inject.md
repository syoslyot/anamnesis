# Inject Hook Specification

**File**: `.anamnesis/hooks/inject-context.js`  
**Trigger**: Claude Code `UserPromptSubmit` event (fires before every user message)

---

## Responsibilities

1. Read `.anamnesis/` and build a compact context block summarising active research state.
2. Check whether the content has changed since the last injection in this session (dedup cache).
3. If unchanged: exit silently with no output.
4. If changed (or first message of the session): write the block to stdout so Claude Code prepends it to the user's prompt.

---

## Context Block Format

The hook emits a fenced `<anamnesis>` block. Sections are included only when there is content to show.

```
<anamnesis>

Open Hypotheses:
  • [<id>] <first line of Research Question>
  ...

Running Experiments:
  • [<id>] <first line of Testable Claim> (n=<N>)
  ...

Blocked Experiments:
  ⏸ [<id>] <first line of Testable Claim> — <blocked_by>
  ...

Recent Conclusions:
  [<id>] ✅/❌ <first line of Conclusion> (n=<N>)
  ...

</anamnesis>
```

**Notes:**
- `(n=<N>)` is appended only when the `n:` field is set and ≥ 1.
- `— <blocked_by>` is appended only when the `blocked_by:` field is non-empty.
- The `✅` or `❌` icon is read from the first character of the conclusion line.

---

## Inclusion Rules

| State                   | Included | Section              |
|-------------------------|----------|----------------------|
| hypothesis `open`       | yes      | Open Hypotheses      |
| hypothesis `parked`     | no       | —                    |
| hypothesis `confirmed`  | no       | —                    |
| hypothesis `rejected`   | no       | —                    |
| experiment `running`    | yes      | Running Experiments  |
| experiment `blocked`    | yes      | Blocked Experiments  |
| experiment `concluded`  | last N   | Recent Conclusions   |
| experiment `planning`   | no *     | Planned Experiments  |

\* When `inject.include_planning: true` in `config.yaml`, planning experiments are included under a `Planned Experiments` section.

`N` for concluded experiments is controlled by `inject.max_concluded` (default 3). Experiments are sorted by `updated` date descending; only the most recent N are shown.

---

## Dedup Cache

**Path**: `.anamnesis/.inject-cache.json`

The hook computes an MD5 hash of the context block it would emit and compares it to the hash stored for the current session. The session is identified by the `CLAUDE_SESSION_ID` environment variable (set by Claude Code on `UserPromptSubmit`).

**Cache schema:**

```json
{
  "<session_id>": {
    "hash": "<md5-hex>",
    "ts": "<ISO-8601 timestamp>"
  }
}
```

**Behaviour:**
- If the session's stored hash matches the current hash: the hook writes nothing to stdout and exits.
- If they differ (or no entry exists for this session): the hook emits the block, updates the cache entry, and writes the file.
- Up to 20 sessions are tracked. When this limit is exceeded, the oldest entry (by `ts`) is pruned.
- The cache file is a transient runtime artifact — add `.anamnesis/.inject-cache.json` to `.gitignore`.

---

## Configuration Read at Runtime

The hook reads the following fields from `.anamnesis/config.yaml`:

| Field                   | Used for                                                  |
|-------------------------|-----------------------------------------------------------|
| `inject.max_concluded`  | Number of concluded experiments to include                |
| `inject.include_planning` | Whether to include planning experiments                 |
| `sections.conclusion`   | Header name to locate the conclusion section in files     |

All other `sections.*` values are used only by the AI skill, not by the hook.

---

## Error Handling

- If `.anamnesis/` does not exist: hook exits silently (nothing to inject).
- If `config.yaml` is missing or malformed: hook uses default values and continues.
- If an individual `.md` file has malformed frontmatter: that file is skipped; the hook continues processing the remaining files.
- Hook must not crash the Claude Code session — all errors are caught and suppressed.

---

## Platform Variants

### Claude Code

The hook is registered in `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "node .anamnesis/hooks/inject-context.js" }
        ]
      }
    ]
  }
}
```

### Codex

Codex does not support real-time hooks. A separate `sync-context.js` script writes the context block to `.anamnesis/context.md` before each session. The `AGENTS.md` snippet instructs the AI to read this file at session start.

**Usage:**
```bash
node .anamnesis/hooks/sync-context.js
```
