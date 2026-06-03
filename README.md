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
        └── report → review → correct
```

At every session start, the AI reads the current state of your research and picks up where you left off.

---

## Quick Start

```bash
# Install into your project (writes CLAUDE.md automatically)
npx anamnesis@github:syoslyot/anamnesis init --platform claude

# Start a new Claude Code session and say what you're researching.
# The AI will note it as a hypothesis automatically.
# Or explicitly:
/am hyp
```

---

## Commands

No commands required for routine use — the AI proactively creates and updates records during normal conversation.

### Research lifecycle

| Command | What it does |
|---------|-------------|
| `/am hyp` | Record a new research question (hypothesis) |
| `/am exp` | Design a new experiment |
| `/am run` | Mark an experiment as started |
| `/am done` | Record results and conclusion |
| `/am rerun` | Append a run to an experiment's run log |
| `/am compare` | Compare metrics across concluded experiments under a hypothesis |

### Reports

| Command | What it does |
|---------|-------------|
| `/am report <id>` | Write a structured experiment report |
| `/am review <id>` | Generate a professor-style critique of the report |
| `/am correct <id>` | Revise the report based on the review |

### Workflow management

| Command | What it does |
|---------|-------------|
| `/am park` | Deprioritize a hypothesis without rejecting it |
| `/am unpark` | Bring a parked hypothesis back to active |
| `/am block` | Mark an experiment as blocked (with optional reason) |
| `/am unblock` | Resume a blocked experiment |
| `/am find <keyword>` | Search past hypotheses and experiments |
| `/am status` | Overview of all hypotheses and experiments |

---

## How It Works

### Files

Everything is stored as plain markdown in your project repo:

```
.anamnesis/
  hypotheses/        one .md file per hypothesis
  experiments/       one .md file per experiment
  reports/           AI-written reports, reviews, and corrections
  prompts/           customizable prompt templates (report, review, correct)
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
  • [calibration-test] 測試 L2 logit 是否能作為連續分數 (n=2)

Blocked Experiments:
  ⏸ [gpu-sweep] GPU 並行是否加速訓練 — waiting for cluster access

Recent Conclusions:
  [loss-masking-fix] ✅ 成立，loss masking 是最關鍵的訓練 bug (n=3)

</anamnesis>
```

Token-efficient: only injects active work. Parked hypotheses, planning experiments, and full history are excluded.

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
## Research Question
Is Parallel Fusion better than Sequential architecture?

## Current Belief
ft L2 outputs extreme values; α perturbation has no effect — output layer needs redesign

## Related Experiments
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
## Testable Claim
Does computing loss only on assistant tokens significantly improve F1?

## Design
Modify collate_fn, keep all other hyperparameters fixed, re-run 3 epochs

## Results
F1 69% → 93%, Epoch 3 loss 0.0163

## Run Log
| Date | Result |
|------|--------|
| 2026-05-30 | F1 0.91, loss 0.021 |
| 2026-05-31 | F1 0.93, loss 0.0163 |
| 2026-06-01 | F1 0.93, loss 0.0161 |

## Conclusion
✅ Confirmed — loss masking was the most critical training bug
```

---

## Configuration

Settings live in `.anamnesis/config.yaml` inside your project:

```yaml
inject:
  max_concluded: 3        # recent concluded experiments to show in context
  include_planning: false # show not-yet-started experiments in context

reports:
  auto: false             # true: write report automatically after /am done

sections:
  question:   "Research Question"  # rename to any language or terminology
  belief:     "Current Belief"
  related:    "Related Experiments"
  hypothesis: "Testable Claim"
  design:     "Design"
  results:    "Results"
  runs:       "Run Log"
  conclusion: "Conclusion"
```

The hook reads `sections.conclusion` at runtime to locate conclusions. All other section names are used by the AI skill when creating files. Change any value and the whole system adapts — no code changes needed.

See [docs/configuration.md](docs/configuration.md) for the full reference.

---

## Platform Support

| Platform | Hook | Skill | Notes |
|----------|------|-------|-------|
| Claude Code | ✅ | ✅ | Real-time `UserPromptSubmit` hook |
| Codex | ✅ | ✅ | Pre-session sync via `sync-context.js` |
| OpenCode | 🔜 | 🔜 | Planned |

Codex doesn't support real-time hooks. Run `node .anamnesis/hooks/sync-context.js` before each session to update `.anamnesis/context.md`.

To add support for a new platform, see [docs/platforms.md](docs/platforms.md).

---

## Installation

**Requirements**: Node.js >= 18

```bash
# Recommended: via npx (no clone needed)
npx anamnesis@github:syoslyot/anamnesis init --platform claude

# Or clone and run directly
git clone https://github.com/syoslyot/anamnesis
node setup.js --platform claude --target /path/to/your/project
```

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--platform` | `claude`, `codex` | prompted | Target AI agent platform |
| `--target` | path | cwd | Project directory to install into |

Setup writes the anamnesis snippet into `CLAUDE.md` (or `AGENTS.md`) and registers the hook. Start a new session when done.

---

## License

MIT
