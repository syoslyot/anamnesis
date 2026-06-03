---
description: Anamnesis research workflow — manage hypotheses and experiments (/am hyp | exp | run | done | find | status)
---

# Anamnesis (`/am`)

Research workflow memory for AI agents. Manages hypotheses and experiments stored in `.anamnesis/`.

## Subcommands

Arguments are passed after `/am`. Examples: `/am hyp`, `/am done`, `/am find calibration`.

---

### `/am hyp` — New hypothesis

Ask the user:
1. A short ID (kebab-case, e.g. `parallel-fusion`)
2. The core research question
3. What they currently believe (their working hypothesis)

Then create `.anamnesis/hypotheses/<id>.md` using this format:

```markdown
---
id: <id>
status: open
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

Confirm the file was created. Do NOT start any implementation work.

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

Ask which experiment to conclude (list `running` experiments).

Fill in:
- `## {{results}}`: what actually happened
- `## {{conclusion}}`: what was learned (start with ✅ confirmed / ❌ rejected / 🔄 partial)
- Update `status` → `concluded` and `updated` date

Then ask: should this conclusion update the parent hypothesis's `## {{belief}}`? If yes, update it.

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
Hypotheses  open: 2  confirmed: 1  rejected: 0

  [parallel-fusion] open
    running:  calibration-test
    planning: fusion-v2

  [fine-tune-vs-l1] confirmed
    concluded: loss-masking-fix ✅, fusion-alpha-sweep ❌

Experiments
  running:  calibration-test
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

Always confirm with the user before creating new files. Updating existing files (adding results, updating status) can be done silently unless the change is significant.

Do not wait to be asked. If you notice the conversation implies a new hypothesis or experiment conclusion, act on it.
