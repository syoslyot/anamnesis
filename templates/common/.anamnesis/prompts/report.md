# Experiment Report Prompt

Write a structured experiment report based on the experiment file and its parent hypothesis.

## Structure

1. **Background** — What question or goal motivated this experiment? If there is a linked hypothesis, summarize it and the current belief at the time. For standalone experiments, describe the motivation directly from the experiment record.
2. **Method** — How was the experiment designed? What was changed, held constant, and measured?
3. **Results** — Quantitative outcomes and key observations. Include run-by-run data if a run log exists.
4. **Discussion** — What do the results mean? Note any confounds, limitations, or surprising findings.
5. **Conclusion** — Was the hypothesis supported? What does this change about the current belief? What is the logical next step?

## Style

Precise and factual, like a lab notebook entry. Avoid vague language ("it seems", "maybe"). Target length: 400–600 words.

## Input

Read `.anamnesis/experiments/<id>.md` for the structured record.
If the experiment has a linked hypothesis, also read `.anamnesis/hypotheses/<hypothesis-id>.md` for context.
If a run log exists in the experiment, use it to support the Results section.

## Output

Save to `.anamnesis/reports/<id>.md`.
