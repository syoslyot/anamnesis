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
  ├── status: open | parked | confirmed | rejected
  ├── parent (optional — id of the hypothesis this one stems from)
  ├── core question
  ├── current belief
  └── linked experiments

experiment
  ├── id
  ├── hypothesis (parent)
  ├── status: planning | running | blocked | concluded
  ├── blocked_by (optional — reason or blocking experiment id)
  ├── n (optional — number of runs recorded via /am rerun)
  ├── metrics (optional — structured key-value pairs recorded via /am done)
  ├── hypothesis (specific testable claim)
  ├── design (how to test)
  ├── results
  ├── runs (individual run log, one row per /am rerun call)
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
- `parked` hypotheses: not injected (deprioritized, visible only in `/am status`)
- All `running` experiments (full first line)
- All `blocked` experiments (first line + blocked_by reason if set)
- Last 3 `concluded` experiments (one-line summary + icon)
- `planning` experiments: not injected by default (configurable)

This keeps token usage proportional to active work, not total project history.

### Auto-recording

The installed CLAUDE.md snippet instructs the AI to proactively create and update `.anamnesis/` files during conversation — no user action required for routine record-keeping. Slash commands are the escape hatch for explicit control.

### Slash commands (`/am`)

| Command | Action |
|---------|--------|
| `/am hyp` | Create new hypothesis file (optional parent link) |
| `/am exp` | Create new experiment file (status: planning) |
| `/am run` | Set experiment status → running |
| `/am done` | Fill conclusion, set status → concluded |
| `/am find` | Search across hypotheses and experiments |
| `/am rerun` | Append a run to an experiment's run log; update `n:` counter |
| `/am compare` | Print metrics comparison table for all concluded experiments under a hypothesis |
| `/am park` | Set hypothesis status → parked (deprioritize without rejecting) |
| `/am unpark` | Set hypothesis status → open |
| `/am block` | Set experiment status → blocked (with optional reason) |
| `/am unblock` | Set experiment status → running |

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
parent: fine-tune-vs-l1        # optional — omit if no parent
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
status: concluded              # planning | running | blocked | concluded
blocked_by:                    # optional — set when status is blocked
n: 3                           # optional — number of runs (managed by /am rerun)
metrics:                       # optional — structured results (set by /am done)
  f1: 0.93
  loss: 0.0163
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
