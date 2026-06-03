# Anamnesis — Design Document

Date: 2026-06-03

---

## Problem

AI coding agents have no memory across sessions. Researchers using Claude Code or similar tools face three compounding problems:

1. **Memory loss** — every session starts from scratch; the AI doesn't know what experiments were run or what was concluded
2. **No workflow discipline** — work jumps straight to implementation without defining a hypothesis; conclusions aren't written down
3. **No knowledge accumulation** — insights from past experiments don't inform future ones

Existing tools (claude-mem, agentmemory) solve only problem 1, and are designed for feature-development workflows, not research/experiment cycles.

---

## Solution

Anamnesis is a research workflow memory layer for AI coding agents. It structures work around **hypotheses** and **experiments**, injects relevant context at session start, and encourages the AI to proactively maintain records during conversation.

---

## Target Users

Researchers using AI coding agents — ML engineers, data scientists, academics, anyone whose work unit is "hypothesis → experiment → conclusion" rather than "ticket → feature → done".

---

## Data Model

```
hypothesis
  ├── id
  ├── status: open | confirmed | rejected
  ├── core question
  ├── current belief
  └── linked experiments

experiment
  ├── id
  ├── hypothesis (parent)
  ├── status: planning | running | concluded
  ├── hypothesis (specific testable claim)
  ├── design (how to test)
  ├── results
  └── conclusion
```

Stored as markdown files with YAML frontmatter in `.anamnesis/` inside the user's project repo. Human-readable, version-controllable, no database required.

---

## Architecture

### Files installed into user's project

```
user-project/
├── .anamnesis/
│   ├── hooks/
│   │   └── inject-context.js   # UserPromptSubmit hook (Node.js)
│   ├── hypotheses/             # One .md file per hypothesis
│   ├── experiments/            # One .md file per experiment
│   └── config.yaml             # Anamnesis configuration
└── .claude/
    ├── settings.json           # Hook registration (Claude Code)
    └── skills/
        └── am/
            └── SKILL.md        # /am slash command
```

### Hook behaviour (UserPromptSubmit, Node.js)

Runs before every Claude message. Reads `.anamnesis/` and injects a compact context block:

- All `open` hypotheses (full first line)
- All `running` experiments (full first line)
- Last 3 `concluded` experiments (one-line summary + icon)
- `planning` experiments: not injected (not started yet)

This keeps token usage proportional to active work, not total project history.

### Auto-recording

The installed CLAUDE.md snippet instructs the AI to proactively create and update `.anamnesis/` files during conversation — no user action required for routine record-keeping. Slash commands are the escape hatch for explicit control.

### Slash commands (`/am`)

| Command | Action |
|---------|--------|
| `/am hyp` | Create new hypothesis file |
| `/am exp` | Create new experiment file (status: planning) |
| `/am run` | Set experiment status → running |
| `/am done` | Fill conclusion, set status → concluded |
| `/am find` | Search across hypotheses and experiments |

---

## Platform Support

### v0.1
- **Claude Code** — full support (hook + skill + CLAUDE.md snippet)
- **Codex** — skill only (hook support deferred)

### Future
- OpenCode, Cursor, Gemini CLI

---

## Distribution

MVP: manual install via `setup.js` script.

```bash
node setup.js --platform claude   # install for Claude Code
node setup.js --platform codex    # install for Codex
```

Future: `npx anamnesis init --platform claude`

---

## File Format

### Hypothesis

```markdown
---
id: parallel-fusion
status: open
created: 2026-06-03
updated: 2026-06-03
---
## 核心問題
Parallel Fusion 是否優於 Sequential 架構？

## 目前認為
ft L2 輸出極端值導致 α 擾動無效，需重設計輸出層

## 相關實驗
- fusion-alpha-sweep (concluded)
- calibration-test (planning)
```

### Experiment

```markdown
---
id: loss-masking-fix
hypothesis: fine-tune-vs-l1
status: concluded
created: 2026-05-30
updated: 2026-05-30
---
## 假說
只對 assistant token 計算 loss 是否顯著提升 F1？

## 設計
修改 collate_fn，其他超參數不變，重跑 3 epochs

## 結果
F1 69% → 93%，Epoch 3 loss 0.0163

## 結論
✅ 成立，loss masking 是最關鍵的訓練 bug
```
