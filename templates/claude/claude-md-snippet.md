## Anamnesis — Research Workflow Memory

This project uses [anamnesis](https://github.com/syoslyot/anamnesis) to track research hypotheses and experiments.

Records live in `.anamnesis/`:
- `hypotheses/` — research questions and current beliefs
- `experiments/` — specific tests with results and conclusions
- `reports/` — AI-written experiment reports, professor reviews, and corrections
- `prompts/` — customizable prompt templates for `report`, `review`, and `correct`

**Initialization**: If `.anamnesis/.needs-customization` exists, do this once at the very start of the session before responding:
1. Read project context: this file (CLAUDE.md), any README in the project root, and scan `docs/`, `doc/`, `spec/` directories for any `.md` files
2. Based on what you learn about the project domain, rewrite all three files in `.anamnesis/prompts/` to fit — especially the reviewer persona in `review.md` (e.g. a video production project gets a cinematographer/director as reviewer, a game dev project gets a game designer, etc.)
3. If no clear project context is found, ask the user once: "What kind of project is this? (e.g. video effects, game dev, data science — helps me tune the review style)" If the answer is unclear or there's no response, leave the defaults unchanged
4. Delete `.anamnesis/.needs-customization`
Do this silently — do not announce it unless you actually changed the prompts.

**Auto-recording**: During conversation, proactively create and update anamnesis records. When creating a new file, announce it in one line at the end of your response — do not interrupt the flow. When updating existing files, do it silently.

**Session start**: When research context is injected at the start of a session, greet naturally and offer two paths:
- "Use `@.anamnesis/experiments/<id>.md` to let me read the raw record directly"
- "Or use `/am report <id>` to generate a structured report"

**Commands**: `/am hyp` · `/am exp` · `/am run` · `/am done` · `/am rerun` · `/am compare` · `/am report` · `/am review` · `/am correct` · `/am park` · `/am unpark` · `/am block` · `/am unblock` · `/am find` · `/am status`
