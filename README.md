# anamnesis

> *Greek: ἀνάμνησις — the recollection of things past*

Research workflow memory for AI coding agents. Structures work around **hypotheses** and **experiments**, injects relevant context at every session, and encourages the AI to proactively maintain records during conversation.

---

## Why

AI coding agents forget everything between sessions. Tools like `claude-mem` solve this for feature development, but researchers have a different problem: they need to remember *what was concluded*, not just *what was done*.

Anamnesis structures research work as:

```
hypothesis (open research question)
  └── experiment (specific testable claim + design + result + conclusion)
```

At every session start, the AI reads the current state of your research and picks up where you left off.

---

## Quick Start

```bash
# Install into your project (writes CLAUDE.md automatically)
npx anamnesis@github:syoslyot/anamnesis init --platform claude

# Start a new Claude Code session — the AI will suggest creating a hypothesis
# Or explicitly:
/am hyp
```

---

## Commands

| Command | What it does |
|---------|-------------|
| `/am hyp` | Record a new research question (hypothesis) |
| `/am exp` | Design a new experiment |
| `/am run` | Mark an experiment as started |
| `/am done` | Record results and conclusion |
| `/am find <keyword>` | Search past hypotheses and experiments |
| `/am status` | Overview of all hypotheses and experiments |
| `/am rerun` | Append a run to an experiment's run log |
| `/am compare` | Compare metrics across concluded experiments under a hypothesis |
| `/am park` | Deprioritize a hypothesis without rejecting it |
| `/am unpark` | Bring a parked hypothesis back to active |
| `/am block` | Mark an experiment as blocked (with optional reason) |
| `/am unblock` | Resume a blocked experiment |

No commands required for routine use — the AI proactively creates and updates records during normal conversation.

---

## How It Works

### Files

Everything is stored as plain markdown in your project repo:

```
.anamnesis/
  hypotheses/parallel-fusion.md
  experiments/loss-masking-fix.md
  config.yaml
```

Human-readable, version-controlled, diff-friendly.

### Context Injection

A Node.js hook runs before every Claude message and injects active research state:

```
<anamnesis>

Open Hypotheses:
  • [parallel-fusion] Parallel Fusion 是否優於 Sequential 架構？

Running Experiments:
  • [calibration-test] 測試 L2 logit 是否能作為連續分數

Recent Conclusions:
  [loss-masking-fix] ✅ 成立，loss masking 是最關鍵的訓練 bug
  [fusion-alpha-sweep] ❌ α 無法改變 Fusion 結果

</anamnesis>
```

Token-efficient: only injects active work, not the full history.

---

## File Format

Section names are configurable. The defaults are shown below.

### Hypothesis

```markdown
---
id: parallel-fusion
status: open          # open | parked | confirmed | rejected
parent: fine-tune-vs-l1  # optional — omit if no parent hypothesis
created: 2026-06-03
updated: 2026-06-03
---
## 核心問題
Parallel Fusion 是否優於 Sequential 架構？

## 目前認為
ft L2 輸出極端值，α 擾動無效，需重設計輸出層

## 相關實驗
- fusion-alpha-sweep (concluded)
```

### Experiment

```markdown
---
id: loss-masking-fix
hypothesis: fine-tune-vs-l1
status: concluded     # planning | running | blocked | concluded
n: 3                  # optional — run count, managed by /am rerun
metrics:              # optional — structured key-value results
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

## 執行記錄
| Date | Result |
|------|--------|
| 2026-05-30 | F1 0.91, loss 0.021 |
| 2026-05-31 | F1 0.93, loss 0.0163 |
| 2026-06-01 | F1 0.93, loss 0.0161 |

## 結論
✅ 成立，loss masking 是最關鍵的訓練 bug
```

---

## Configuration

Settings live in `.anamnesis/config.yaml` inside your project:

```yaml
inject:
  max_concluded: 3        # recent concluded experiments to show in context
  include_planning: false # show not-yet-started experiments in context

sections:
  question:   "核心問題"  # rename to any language or terminology
  belief:     "目前認為"
  related:    "相關實驗"
  hypothesis: "假說"
  design:     "設計"
  results:    "結果"
  conclusion: "結論"
```

The hook reads `sections.conclusion` at runtime to locate the conclusion in each experiment file. All other section names are used by the AI skill when creating new files. Change any value and the whole system adapts — no code changes needed.

See [docs/configuration.md](docs/configuration.md) for the full reference.

---

## Platform Support

| Platform | Hook | Skill |
|----------|------|-------|
| Claude Code | ✅ | ✅ |
| Codex | ✅ (pre-session sync) | ✅ |
| OpenCode | 🔜 | 🔜 |

Codex doesn't support real-time hooks. Instead, run `node .anamnesis/hooks/sync-context.js` before each session to update `.anamnesis/context.md`.

To add support for a new platform, see [docs/platforms.md](docs/platforms.md).

---

## Installation

### Requirements
- Node.js >= 18

### Steps

```bash
# Recommended: via npx (no clone needed)
npx anamnesis@github:syoslyot/anamnesis init --platform claude

# Or clone and run directly
git clone https://github.com/syoslyot/anamnesis
cd anamnesis
node setup.js --platform claude --target /path/to/your/project
```

Options:

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--platform` | `claude`, `codex` | prompted | Target AI agent platform |
| `--target` | path | cwd | Project directory to install into |

Setup automatically writes the anamnesis snippet into `CLAUDE.md` (or `AGENTS.md`). Start a new session when done.

---

## License

MIT
