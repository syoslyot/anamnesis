---
description: Anamnesis research workflow — manage hypotheses and experiments (/am hyp | exp | run | done | rerun | compare | report | review | correct | park | unpark | block | unblock | find | status)
---

# Anamnesis (`/am`)

Research workflow memory for AI agents. Manages hypotheses and experiments stored in `.anamnesis/`.

## Subcommands

Arguments are passed after `/am`. Examples: `/am hyp`, `/am done`, `/am report loss-masking-fix`.

---

### `/am hyp` — New hypothesis

Infer as much as possible from the current conversation:
- **ID**: derive from key terms (kebab-case, max 3 words, e.g. `loss-masking`)
- **Question**: use the research question the user expressed
- **Belief**: infer from expressed expectations; default to "未確定" if unclear
- **Parent**: if this follows from another hypothesis, note its ID

Draft a preview and ask once to confirm:

> Recording this hypothesis:
>
> **`loss-masking`** — Does applying loss only on assistant tokens significantly improve F1?
> Current belief: Likely yes, but magnitude unknown
>
> Save this, or anything to adjust?

Save on approval (or if the user doesn't object). **Do not ask each field as a separate question** if context allows inference.

Create `.anamnesis/hypotheses/<id>.md`. Include `parent: <id>` only if a parent was identified.

```markdown
---
id: <id>
status: open
parent: <parent-id>   ← omit this line if no parent
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
---
## {{question}}
<question>

## {{belief}}
<belief>

## {{related}}
(none yet)
```

---

### `/am exp` — New experiment

Ask the user:
1. A short ID (kebab-case)
2. Which hypothesis this experiment belongs to (list existing hypotheses if needed)
3. The specific testable claim
4. The design (how will this be tested)

Create `.anamnesis/experiments/<id>.md`:

```markdown
---
id: <id>
hypothesis: <hypothesis_id>
status: planning
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
---
## {{hypothesis}}
<testable claim>

## {{design}}
<how to test>

## {{results}}
(not yet run)

## {{runs}}
(none yet)

## {{conclusion}}
(pending)
```

Also add this experiment to the parent hypothesis file under `## {{related}}`.

---

### `/am run` — Start experiment

Ask which experiment to start (list `planning` experiments).

Update its `status` from `planning` → `running` and `updated` date.

---

### `/am done` — Conclude experiment

Ask which experiment to conclude (list `running` and `blocked` experiments).

Fill in:
- `## {{results}}`: what actually happened
- `## {{conclusion}}`: what was learned (start with ✅ confirmed / ❌ rejected / 🔄 partial)
- Update `status` → `concluded` and `updated` date
- Remove `blocked_by` from frontmatter if present
- Ask: "Any numeric metrics to record? (e.g. `f1: 0.93, loss: 0.016` — press enter to skip)"
  - If provided, add a `metrics:` block to frontmatter with the key-value pairs

Then ask: should this conclusion update the parent hypothesis's `## {{belief}}`? If yes, update it.

Finally, read `.anamnesis/config.yaml` and check `reports.auto`:
- If `true`: automatically run `/am report <id>`
- If `false` (default): ask once — "Want me to write a report for this experiment? (You can also do it later with `/am report <id>`)"

---

### `/am rerun <id>` — Add a run to an experiment

Ask which experiment to add a run to (list `running` and `concluded` experiments).

Ask for:
1. The result of this run (free text, e.g. "F1 0.93, loss 0.016")
2. The date (default: today)

Append a row to the `## {{runs}}` section. If the section only contains "(none yet)" or doesn't exist, replace/create it with a markdown table:

```
| Date | Result |
|------|--------|
| <date> | <result> |
```

Add subsequent runs as new rows after the last `|` row.

Update `n: <count>` in frontmatter (increment by 1, or add `n: 1` if absent).

If the experiment was `concluded`, ask: does this run change the overall conclusion? If yes, update `## {{conclusion}}`.

---

### `/am compare <hypothesis-id>` — Compare experiments

Read all `concluded` experiments under the given hypothesis.

Print a comparison table:
- Columns: experiment ID, conclusion icon (✅/❌/🔄), `n` (if any experiment has it), then one column per metric key found across all experiments (alphabetical)
- Rows sorted by `updated` date descending

Example:

```
Comparing experiments under [fine-tune-vs-l1]
─────────────────────────────────────────────────────
experiment        icon  n   f1     loss
loss-masking-fix  ✅    3   0.93   0.0163
baseline-run      ❌    —   0.69   0.45
```

If no experiments have metrics, show a plain summary (id, updated, conclusion). Do not modify any files.

---

### `/am report <id>` — Write experiment report

Read:
- `.anamnesis/experiments/<id>.md`
- The parent hypothesis at `.anamnesis/hypotheses/<hypothesis-id>.md`
- The prompt template at `.anamnesis/prompts/report.md`

Write the report following the prompt's structure. Save to `.anamnesis/reports/<id>.md`.

Tell the user: "Report saved to `.anamnesis/reports/<id>.md`. Use `@.anamnesis/reports/<id>.md` to reference it directly, or `/am review <id>` for a professor-style critique."

---

### `/am review <id>` — Professor review

Read:
- `.anamnesis/reports/<id>.md`
- `.anamnesis/experiments/<id>.md`
- The prompt template at `.anamnesis/prompts/review.md`

Write the review following the prompt's structure. Save to `.anamnesis/reports/<id>-review.md`.

Tell the user: "Review saved to `.anamnesis/reports/<id>-review.md`. Use `/am correct <id>` to revise the report based on the feedback."

---

### `/am correct <id>` — Revise based on review

Read:
- `.anamnesis/reports/<id>.md`
- `.anamnesis/reports/<id>-review.md`
- The prompt template at `.anamnesis/prompts/correct.md`

Write the revised report following the prompt's structure. Save to `.anamnesis/reports/<id>-correct.md`.

Tell the user: "Revised report saved to `.anamnesis/reports/<id>-correct.md`."

---

### `/am park <id>` — Park a hypothesis

Ask which open hypothesis to park (list `open` hypotheses).

Update its `status` from `open` → `parked` and `updated` date.

Parked hypotheses are deprioritized but not abandoned. They do not appear in context injection until unparked.

---

### `/am unpark <id>` — Unpark a hypothesis

Ask which parked hypothesis to resume (list `parked` hypotheses).

Update its `status` from `parked` → `open` and `updated` date.

---

### `/am block <id>` — Block an experiment

Ask which running experiment is blocked (list `running` experiments).

Ask for a reason (optional — e.g. "waiting for cluster access", "blocked by calibration-test").

Update its `status` from `running` → `blocked` and `updated` date. If a reason is given, add or update `blocked_by: <reason>` in the frontmatter.

Blocked experiments continue to appear in context injection so the AI is aware of the stall.

---

### `/am unblock <id>` — Unblock an experiment

Ask which blocked experiment to resume (list `blocked` experiments).

Remove `blocked_by` from frontmatter (if present). Update `status` from `blocked` → `running` and `updated` date.

---

### `/am find <keyword>` — Search

Search across all `.anamnesis/hypotheses/*.md` and `.anamnesis/experiments/*.md` for the keyword.

Show matching files with their status and first meaningful line. If no keyword is given, list all hypotheses and their open/running experiment counts.

---

### `/am status` — Research overview

Read all files in `.anamnesis/hypotheses/` and `.anamnesis/experiments/` and print a summary:

```
Research Status
───────────────────────────────
Hypotheses  open: 2  confirmed: 1  rejected: 0  parked: 1

  [parallel-fusion] open
    running:  calibration-test
    blocked:  gpu-sweep (waiting for cluster access)
    planning: fusion-v2

  [fine-tune-vs-l1] confirmed
    concluded: loss-masking-fix ✅, fusion-alpha-sweep ❌

Parked
  [old-baseline] parked

Experiments
  running:  calibration-test
  blocked:  gpu-sweep (waiting for cluster access)
  planning: fusion-v2
```

Do not modify any files. Do not start any work.

---

## Auto-recording (no command needed)

During normal conversation, proactively maintain anamnesis records when:

- A new research question emerges → create a hypothesis file
- Work begins on testing something → create or update an experiment file
- An experiment produces results or a conclusion → update the experiment file
- A conclusion changes understanding of a hypothesis → update the hypothesis

**Creating new files**: Draft from context — infer the ID, question, and belief without asking upfront. Announce at the end of your response in one line:
> (Noted hypothesis `loss-masking`: Does loss masking significantly improve F1?)

Do NOT interrupt the conversation with questions before creating. The user can correct with `/am` commands later.

**Updating existing files**: Do silently, no announcement needed unless the change is significant (e.g. status change).

Do not wait to be asked. If the conversation implies a new hypothesis or a concluded experiment, act on it.
