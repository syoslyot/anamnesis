# Configuration Reference

Anamnesis reads `.anamnesis/config.yaml` in the user's project directory. All fields are optional; defaults are shown below.

```yaml
version: "0.1"

inject:
  max_concluded: 3        # how many recent concluded experiments to show
  include_planning: false  # whether to show planning (not-yet-started) experiments

sections:
  question:    "核心問題"   # hypothesis: core research question
  belief:      "目前認為"   # hypothesis: current belief
  related:     "相關實驗"   # hypothesis: related experiments list
  hypothesis:  "假說"      # experiment: specific testable claim
  design:      "設計"      # experiment: how to test
  results:     "結果"      # experiment: what happened
  conclusion:  "結論"      # experiment: what was learned
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

## `sections`

**Type**: map of string → string  
**Default**: Chinese headers (see above)

Controls the markdown section header names used in all `.anamnesis/` files. The hook reads this at runtime to locate the conclusion section; the `/am` skill uses these names when creating new files.

To use a different language or terminology, edit the values in `config.yaml` after install:

```yaml
sections:
  question:    "Research Question"
  belief:      "Current Belief"
  related:     "Related Experiments"
  hypothesis:  "Testable Claim"
  design:      "Design"
  results:     "Results"
  conclusion:  "Conclusion"
```

Then regenerate the skill to match:

```bash
node /path/to/anamnesis/setup.js --platform claude --target .
```

(Setup skips existing files in `.anamnesis/` but always regenerates the skill.)

Any key not specified falls back to the default Chinese value. Only `conclusion` is used by the hook; the rest are used by the AI skill for file creation.
