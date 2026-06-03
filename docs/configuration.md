# Configuration Reference

Anamnesis reads `.anamnesis/config.yaml` in the user's project directory. All fields are optional; defaults are shown below.

```yaml
version: "0.1"

inject:
  max_concluded: 3       # how many recent concluded experiments to show
  include_planning: false # whether to show planning (not-yet-started) experiments

language: auto           # reserved — not yet used by the hook
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

## `language`

**Type**: string (`auto` | `en` | `zh`)  
**Default**: `auto`

Currently informational — not read by the hook at runtime. File format section headers (`## 結論` and `## Conclusion`) are detected automatically regardless of this setting.

The install-time language is set via `anamnesis init --language en|zh`, which controls which skill template is installed (Chinese or English section headers in `/am` command output).
