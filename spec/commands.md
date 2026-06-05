# Slash Command Specification — `/am`

The `/am` skill is installed at `.claude/skills/am/SKILL.md` (Claude Code) or the equivalent for other platforms. Commands are invoked as `/am <subcommand> [argument]`.

---

## Research Lifecycle

### `/am hyp`

Creates a new hypothesis file.

1. Infer the research question from the current conversation context.
2. Draft the hypothesis frontmatter and body using the section names from `config.yaml`.
3. Show a draft and ask for confirmation or edits.
4. Write `.anamnesis/hypotheses/<id>.md` with `status: open`.
5. Announce the file path at the end of the response.

**Initial status**: `open`

---

### `/am exp`

Creates a new experiment file.

1. Infer or ask for the testable claim and design.
2. If an open hypothesis is active in context, offer to link via `hypothesis: <id>`.
3. Write `.anamnesis/experiments/<id>.md` with `status: planning`.
4. Announce the file path.

**Initial status**: `planning`

---

### `/am run`

Marks an experiment as started.

1. Identify the target experiment from context (or ask).
2. Set `status: planning → running` and update `updated:`.

---

### `/am done`

Records results and conclusion for a running experiment.

1. Ask for results and conclusion if not evident from context.
2. Fill `## Results` and `## Conclusion` sections.
3. Set `status: running → concluded` and update `updated:`.
4. If `metrics:` values were mentioned, write the structured `metrics:` block to frontmatter.
5. If `reports.auto: true` in config, run `/am report` automatically. Otherwise offer once.

---

### `/am rerun`

Appends a new run to an existing experiment's run log.

1. Identify the target experiment.
2. Append a row to the `## Run Log` table with today's date and the result.
3. Increment `n:` in frontmatter (set to 1 if not present).
4. Update `updated:`.

---

### `/am compare`

Generates a metrics comparison table for concluded experiments under a hypothesis.

1. Identify the target hypothesis from context or argument.
2. Collect all `concluded` experiments linked to that hypothesis.
3. Emit a markdown table with experiment id, conclusion icon, and any `metrics:` values.

---

## Reports

### `/am report <id>`

Writes a structured lab report for experiment `<id>`.

1. Read `.anamnesis/prompts/report.md` for the prompt template.
2. Read the experiment file at `.anamnesis/experiments/<id>.md`.
3. Generate a report following the template.
4. Write to `.anamnesis/reports/<id>-report.md`.

---

### `/am review <id>`

Generates a reviewer critique of an existing report.

1. Read `.anamnesis/prompts/review.md` for the prompt template.
2. Read `.anamnesis/reports/<id>-report.md`.
3. Generate a critique following the template.
4. Write to `.anamnesis/reports/<id>-review.md`.

---

### `/am correct <id>`

Produces a revised report that responds to the review.

1. Read `.anamnesis/prompts/correct.md` for the prompt template.
2. Read both `<id>-report.md` and `<id>-review.md`.
3. Generate a corrected report.
4. Write to `.anamnesis/reports/<id>-corrected.md`.

---

## Workflow Management

### `/am park`

Deprioritises a hypothesis without rejecting it.

- Sets `status: open → parked`.
- Parked hypotheses are excluded from context injection and from `/am status` active view, but visible via `/am find`.

---

### `/am unpark`

Brings a parked hypothesis back to active.

- Sets `status: parked → open`.

---

### `/am block`

Marks an experiment as blocked.

- Sets `status: running → blocked`.
- Optionally writes a reason to `blocked_by:` frontmatter.

---

### `/am unblock`

Resumes a blocked experiment.

- Sets `status: blocked → running`.
- Clears `blocked_by:`.

---

### `/am find <keyword>`

Searches across all hypothesis and experiment files.

- Case-insensitive substring match on `id`, section headers, and body text.
- Returns a list of matching files with their id and status.

---

### `/am status`

Prints a full research overview.

**Sections shown:**
1. Open hypotheses (with linked experiment counts by status)
2. Running experiments
3. Blocked experiments (with reason)
4. Parked hypotheses
5. Recent concluded experiments

Planning experiments are shown under their parent hypothesis or as standalone.

---

## Auto-Recording Behaviour

The installed `CLAUDE.md` / `AGENTS.md` snippet instructs the AI to proactively create and update `.anamnesis/` files during normal conversation — no explicit command required. New files are created silently and announced at the end of the response. Slash commands are the explicit escape hatch for control.

---

## First-Session Customization

When `.anamnesis/.needs-customization` exists:

1. The AI reads project context: `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/`, `doc/`, `spec/`.
2. It rewrites `.anamnesis/prompts/` to match the project domain (e.g. `report.md` uses "cinematographer" instead of "professor" for a film project).
3. If no context is found, the AI asks the user once for a domain description. Academic defaults apply if still unclear.
4. Deletes `.anamnesis/.needs-customization`.
