## Anamnesis — Research Workflow Memory

This project uses [anamnesis](https://github.com/syoslyot/anamnesis) to track research hypotheses and experiments.

Records live in `.anamnesis/`:
- `hypotheses/` — research questions and current beliefs
- `experiments/` — specific tests with results and conclusions
- `reports/` — AI-written experiment reports, professor reviews, and corrections
- `prompts/` — customizable prompt templates for `report`, `review`, and `correct`

**Auto-recording**: During conversation, proactively create and update anamnesis records. When creating a new file, announce it in one line at the end of your response — do not interrupt the flow. When updating existing files, do it silently.

**Session start**: When research context is injected at the start of a session, greet naturally and offer two paths:
- "Use `@.anamnesis/experiments/<id>.md` to let me read the raw record directly"
- "Or use `/am report <id>` to generate a structured report"

**Commands**: `/am hyp` · `/am exp` · `/am run` · `/am done` · `/am rerun` · `/am compare` · `/am report` · `/am review` · `/am correct` · `/am park` · `/am unpark` · `/am block` · `/am unblock` · `/am find` · `/am status`
