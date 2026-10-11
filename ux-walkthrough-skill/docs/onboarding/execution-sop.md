# Execution SOP

This file exists as a compatibility bridge for workflows that still reference
the old `docs/onboarding/execution-sop.md` path.

The current open-source `ux-walkthrough` execution contract is defined by:

- [`SKILL.md`](../../SKILL.md)
- [`gates.md`](./gates.md)
- [`references/mode.md`](../../references/mode.md)

## Execution Order

1. Complete the user-answered design review brief in `references/review-brief.md`; do not infer missing answers.
2. After `review_brief.status=confirmed`, run `precheck_walkthrough.py` to determine mode, evidence gate, and runtime probe results.
3. Build the structured task contract in `references/task-contract.md`, inventory all in-scope PC surfaces, require runtime tasks to reuse the same IDs and names, record the inventory basis and completeness per `references/scope-inventory-completeness.md`, then activate the mandatory and applicable conditional packs.
4. Record the primary PC review environment per `references/pc-environment-validation.md`, review every surface there, then compare all in-scope surfaces per `references/cross-page-consistency.md`. For each critical task, build and validate its applicable state inventory per `references/task-state-coverage.md`, then review flow and PC accessibility.
5. Build the per-surface and per-task matrix in `references/target-coverage-matrix.md`, separate confirmed issues from the validation backlog, apply `references/claim-evidence-boundary.md`, then generate `report.json` and run `validate_checklist_coverage.py`.
6. Run `validate_report_annotations.py` when the source mode requires annotated evidence.
7. Only after the required validation gates pass, run `generate_docx.py`.

For a user-requested design follow-up, reuse the confirmed brief from the baseline report, read `references/follow-up-review.md`, verify each original acceptance criterion, and run visual and task regression checks for the affected scope before steps 5–7.

## Formal UX Closure

When this skill is used for a formal UX walkthrough, "full SOP" means:

- follow the complete A0 -> A1 -> B -> C flow in `SKILL.md`
- satisfy the gates in `docs/onboarding/gates.md`
- produce both the final report and the local `.docx`

If this compatibility document conflicts with `SKILL.md`, `SKILL.md` wins.
