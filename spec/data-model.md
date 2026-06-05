# Data Model Specification

Anamnesis stores research state as plain markdown files with YAML frontmatter in `.anamnesis/` inside the user's project directory.

---

## Directory Layout

```
.anamnesis/
  hypotheses/          one .md file per hypothesis
  experiments/         one .md file per experiment
  reports/             AI-written reports, reviews, corrections
  prompts/
    report.md          prompt template for /am report
    review.md          prompt template for /am review
    correct.md         prompt template for /am correct
  config.yaml          runtime configuration
  .inject-cache.json   transient — per-session dedup cache (add to .gitignore)
  .needs-customization marker file — deleted after first-session customization
```

---

## Hypothesis File

**Path**: `.anamnesis/hypotheses/<id>.md`

### Frontmatter Schema

| Field     | Type   | Required | Values                              | Description                                      |
|-----------|--------|----------|-------------------------------------|--------------------------------------------------|
| `id`      | string | yes      | kebab-case, unique across all files | Stable identifier; matches the filename stem     |
| `status`  | string | yes      | `open`, `parked`, `confirmed`, `rejected` | Lifecycle state                         |
| `parent`  | string | no       | id of another hypothesis            | Parent hypothesis in a hierarchy                 |
| `created` | date   | yes      | `YYYY-MM-DD`                        | Creation date                                    |
| `updated` | date   | yes      | `YYYY-MM-DD`                        | Date of last meaningful edit                     |

### Body Sections

Section names are configurable in `config.yaml`. The defaults are:

| Config key  | Default header        | Purpose                          |
|-------------|----------------------|----------------------------------|
| `question`  | `Research Question`  | The core research question       |
| `belief`    | `Current Belief`     | Current working belief or state  |
| `related`   | `Related Experiments`| Bulleted list of experiment ids  |

### Example

```markdown
---
id: parallel-fusion
status: open
parent: fine-tune-vs-l1
created: 2026-06-03
updated: 2026-06-03
---
## Research Question
Is Parallel Fusion better than Sequential architecture?

## Current Belief
ft L2 outputs extreme values; α perturbation has no effect — output layer needs redesign

## Related Experiments
- fusion-alpha-sweep (concluded)
- calibration-test (planning)
```

---

## Experiment File

**Path**: `.anamnesis/experiments/<id>.md`

### Frontmatter Schema

| Field        | Type    | Required | Values                                         | Description                                         |
|--------------|---------|----------|------------------------------------------------|-----------------------------------------------------|
| `id`         | string  | yes      | kebab-case, unique across all files            | Stable identifier; matches the filename stem        |
| `hypothesis` | string  | no       | id of a hypothesis                             | Parent hypothesis; omit for standalone experiments  |
| `status`     | string  | yes      | `planning`, `running`, `blocked`, `concluded`  | Lifecycle state                                     |
| `blocked_by` | string  | no       | free text or experiment id                     | Reason or blocker; present when status is `blocked` |
| `n`          | integer | no       | ≥ 1                                            | Number of runs; managed by `/am rerun`              |
| `metrics`    | map     | no       | string → number                                | Structured key-value results; set by `/am done`     |
| `created`    | date    | yes      | `YYYY-MM-DD`                                   | Creation date                                       |
| `updated`    | date    | yes      | `YYYY-MM-DD`                                   | Date of last meaningful edit                        |

### Body Sections

| Config key   | Default header  | Purpose                                |
|--------------|----------------|----------------------------------------|
| `hypothesis` | `Testable Claim`| The specific, falsifiable claim        |
| `design`     | `Design`        | How the experiment tests the claim     |
| `results`    | `Results`       | What was observed                      |
| `runs`       | `Run Log`       | Markdown table; one row per `/am rerun`|
| `conclusion` | `Conclusion`    | What was learned; starts with ✅ or ❌ |

**Run Log format**: a markdown table with at minimum a `Date` column and a `Result` column. Additional columns are allowed.

**Conclusion format**: a single line beginning with `✅ Confirmed —` or `❌ Rejected —` followed by a summary. This prefix is used by the hook to locate conclusions. The exact text after the icon is free-form.

### Example

```markdown
---
id: loss-masking-fix
hypothesis: fine-tune-vs-l1
status: concluded
n: 3
metrics:
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

## Report Files

**Path**: `.anamnesis/reports/<experiment-id>-report.md` (and `-review.md`, `-corrected.md`)

Reports are AI-generated free-form markdown. No frontmatter schema is enforced. The three stages:

| Filename suffix  | Produced by    | Contents                            |
|------------------|---------------|-------------------------------------|
| `-report.md`     | `/am report`  | Structured lab-report style document |
| `-review.md`     | `/am review`  | Critique of the report              |
| `-corrected.md`  | `/am correct` | Revised report responding to review |

---

## Configuration File

**Path**: `.anamnesis/config.yaml`

See [configuration.md](../docs/configuration.md) for the full field reference.

---

## Constraints

- `id` values must be unique across both `hypotheses/` and `experiments/`.
- `id` values must match the filename stem (e.g. `id: foo` → `foo.md`).
- Files in `hypotheses/` and `experiments/` that do not end in `.md` are ignored by the hook and the skill.
- The `sections.conclusion` config value is read at runtime by the hook to locate the conclusion section header. All other section names are used only by the AI skill when creating files.
