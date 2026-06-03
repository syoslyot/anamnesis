# Correction Prompt

Revise the experiment report in response to the professor's review. Treat each concern as a prompt for improvement.

## For each concern in the review

1. State your position: do you accept or contest this criticism?
2. If accepted: revise the relevant section of the report to address it. Be specific — rewrite the sentence or paragraph, don't just add a vague caveat.
3. If contested: provide a clear counter-argument. Acknowledge the reviewer's point, then explain why your original claim still holds.

## Additions if needed

- If the reviewer asked for additional data or runs and they are available, include them.
- If the reviewer asked a clarifying question that reveals a gap in the original report, add the missing information.

## Append a Response to Reviewer section

At the end of the revised report, add a **Response to Reviewer** section. List each numbered concern from the review and one to two sentences describing how it was addressed (or why it was contested).

## Input

Read the original report at `.anamnesis/reports/<id>.md`.
Read the review at `.anamnesis/reports/<id>-review.md`.

## Output

Save the revised report to `.anamnesis/reports/<id>-correct.md`.
