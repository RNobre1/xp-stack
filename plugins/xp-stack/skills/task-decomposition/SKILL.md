---
name: task-decomposition
description: Use when decomposing non-trivial features into tracked tasks in docs/tasks/{feature}/ with incremental scope, evidence, parallel work, review, and session resumption. Use the bootstrap skill to install templates first.
---

> **For engines without skill loading:** follow this file and its linked portable references. A plugin loader may prefix the skill name; resolve the path from the current skill location.

Voce eh o Decompositor. Quebre o trabalho em incrementos rastreáveis que resultem em um outcome utilizável pelo consumidor. Quando um fluxo novo usar `docs/tasks/tasks.json`, cada task deve ter `id`, `slug`, `title`, `status`, `deps`, `phase` e `confidence` conforme `schemas/tasks.schema.json`. Siga o [delivery flow](../akita-xp-rules/references/delivery-flow.md), revisão `2026-10-11.1`, e o **Delivery evidence contract** compartilhado. Não replique seus significados nos T-files. Cada task e briefing registra as fontes/revisões; para workers sem loader, o remetente anexa os trechos literais relevantes.

## Layout and status source

Choose `essencial` or `completo` using the single source-of-status and file-set rules in [`delivery-flow.md`](../akita-xp-rules/references/delivery-flow.md). Decide the layout at decomposition time; do not create a second state file for `doc_level` or migrate an existing runtime state contract as part of documentation work.

# Task Decomposition

Use this skill when a feature has multiple usable outcomes, dependencies, owners, or risk that benefits from explicit tracking. A feature does not need extra tasks just because it touches multiple files or takes more than one day. Each task represents a usable outcome or a necessary dependency, not a phase or internal micro-step.

## Task folder and T-files

For a new `docs/tasks` flow, use `docs/tasks/_template/README.md` and `schemas/tasks.schema.json`. Preserve any existing status tool as described in the delivery flow. Create task files only for usable outcomes or necessary dependencies, not for file groups, workflow phases, or implementation microsteps. Start each T-file from `TEMPLATE-task.md`; fill only the applicable scope, pressure scenarios, acceptance, evidence, and handoff slots.

## Conventions

- Slug in kebab-case (`testing-improvement`, `mtr-pricing`)
- `phase` classifies a task for the existing schema; it does not define a task boundary. Do not create one task for each workflow phase.
- Isolation: use the worktree/branch selected by the session and Host policy. Separate branches only when outcomes can be reviewed/integrated independently or isolation is required; do not branch per micro-step.
- Sub-tasks discovered in review become `T{N}.1`, `T{N}.2`, registered in `00-overview.md`
- Integration and merge follow the project's policy and the authorization already granted in the current session; do not impose a universal human-only gate

## Archival Policy — NEVER Delete Completed Tasks

Two options, in order of preference:
1. **In-place**: leave the folder where it is and retain the task authority plus dated evidence views. Default.
2. **Move to `docs/tasks/_archive/{feature}/`**: only when `docs/tasks/` gets cluttered (5+ completed features). Use `git mv`, not `rm`.

**Reason:** Completed tasks contain non-reconstructable context (decisions, incidents, trade-offs, follow-ups not yet turned into features). Git preserves content theoretically, but `grep` in `docs/tasks/` is much faster than `git log`.

## Parallel dispatch (when authorized)

Follow the delivery flow's batch and review rules. The coordinator uses a mechanism and isolation supported by the current session/Host policy, gives each worker the relevant T-file and exact source revisions, then checks returned evidence and routes review findings. No mechanism or model is a portable default.

The legacy `TERMINAL-PROMPTS.md` + N-terminals pattern remains available only when the selected local mechanism needs it.

## Workflow

1. Start from the task templates and schema; do not redesign their structure.
2. Describe the current behavior, consumer outcome, dependencies, and pressure scenarios in `00-overview.md` and needed T-files.
3. Follow the canonical delivery flow for TDD, selected guards, evidence, review, and checkpoints.
4. Update the single status source; refresh derived Markdown views only when used.
