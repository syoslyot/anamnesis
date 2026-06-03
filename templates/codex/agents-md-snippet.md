## Anamnesis — Research Workflow Memory

This project uses [anamnesis](https://github.com/syoslyot/anamnesis) to track research hypotheses and experiments.

Records live in `.anamnesis/`:
- `hypotheses/` — research questions and current beliefs
- `experiments/` — specific tests with results and conclusions

**Current research state** is in `.anamnesis/context.md` (update it before each session by running `node .anamnesis/hooks/sync-context.js`).

**Auto-recording**: During conversation, proactively create and update anamnesis records when new hypotheses emerge, experiments begin or conclude, or conclusions change your understanding. Use the `am` skill for explicit control.

**Commands**: `am hyp` · `am exp` · `am run` · `am done` · `am find` · `am status`
