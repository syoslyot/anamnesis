# Configuration Reference

Anamnesis reads `.anamnesis/config.yaml` in the user's project directory. All fields are optional; defaults are shown below.

```yaml
version: "0.2"

inject:
  max_concluded: 3        # how many recent concluded experiments to show
  include_planning: false # whether to show planning (not-yet-started) experiments

reports:
  auto: false             # true: generate report automatically after /am done

sections:
  question:    "Research Question"    # hypothesis: core research question
  belief:      "Current Belief"       # hypothesis: current belief
  related:     "Related Experiments"  # hypothesis: related experiments list
  hypothesis:  "Testable Claim"       # experiment: specific testable claim
  design:      "Design"               # experiment: how to test
  results:     "Results"              # experiment: what happened
  runs:        "Run Log"              # experiment: individual run log
  conclusion:  "Conclusion"           # experiment: what was learned
```

---

## `inject.max_concluded`

**Type**: integer  
**Default**: `3`

Controls how many recently concluded experiments appear in the `<anamnesis>` context block. Experiments are sorted by `updated` date descending.

Set to `0` to suppress concluded experiments from context entirely.

---

## `inject.include_planning`

**Type**: boolean  
**Default**: `false`

When `true`, experiments with `status: planning` are included in the injected context under a `Planned Experiments` section. By default, planning experiments are not injected — they haven't started and add noise.

---

## `reports.auto`

**Type**: boolean  
**Default**: `false`

When `false` (default), the AI asks once after `/am done` whether to write a report. When `true`, `/am report` runs automatically as part of the conclusion flow.

---

## `sections`

**Type**: map of string → string  
**Default**: English headers (see above)

Controls the markdown section header names used in all `.anamnesis/` files. The hook reads `sections.conclusion` at runtime to locate conclusions; the `/am` skill uses all names when creating new files.

To use a different language or terminology, edit the values in `config.yaml` after install. For example, to use Chinese headers:

```yaml
sections:
  question:    "核心問題"
  belief:      "目前認為"
  related:     "相關實驗"
  hypothesis:  "假說"
  design:      "設計"
  results:     "結果"
  runs:        "執行記錄"
  conclusion:  "結論"
```

Then regenerate the skill to match:

```bash
node /path/to/anamnesis/setup.js --platform claude --target .
```

Setup skips existing files in `.anamnesis/` but always regenerates the skill, so section names in the generated `SKILL.md` stay in sync with your config.

Any key not specified falls back to the default English value.
