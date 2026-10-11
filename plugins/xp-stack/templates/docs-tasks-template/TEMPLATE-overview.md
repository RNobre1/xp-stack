# {{Feature}} — Overview

**Date:** {{YYYY-MM-DD}}
**Objective:** {{One sentence with the problem and expected observable outcome. No process jargon.}}
**Task-status authority:** {{Traycer ticket | Autonomia controller | existing project tool | docs/tasks/{{feature-slug}}/tasks.json for a new flow}}
**Evidence-contract source/revision:** {{resolved URI for `akita-xp-rules/SKILL.md`}} | `2026-10-11.1`
**Delivery-flow revision:** `2026-10-11.1`

> Tasks are functional increments. Follow `akita-xp-rules / references/delivery-flow.md` for the flow and the **Delivery evidence contract** for evidence fields. The task table is a rendered view of the status authority above; do not edit a competing status here. Record both sources/revisions in each T-file and dispatch briefing.

---

## Diagnosis

{{What exists today vs what needs to exist. Before/after tables help. Numbers > adjectives.}}

| Behavior/consumer | Observed today | Usable result | Evidence/oracle |
|---|---|---|---|
| {{consumer action}} | {{measured or concrete current behavior}} | {{observable expected behavior}} | {{test, artifact, or contract}} |

---

## Tasks (execution order)

| Task ID | Name | Dependency | Estimate | Status snapshot |
|------|------|------------|----------|-----------------|
| [T1](T1-{{slug}}.md) | {{short name}} | None | {{S/M/L}} | {{read from authority source}} |
| [T2](T2-{{slug}}.md) | {{short name}} | T1 | {{S/M/L}} | {{read from authority source}} |

> Render status from the authority source. Tasks blocked by another task link the dependency; do not maintain a second live status in this table.

---

## Sub-tasks identified

> Follow-ups discovered during execution or review. Stay here as backlog until they become formal T-files.

| Sub-task | Origin | Description |
|---|---|---|
| T{N}.1 | PR #{{NN}} review | {{what fell outside original scope}} |

---

## How to execute

**Parallel dispatch (when authorized):** the coordinator selects a mechanism supported by the current session and Host. The default batch is up to two usable increments; a larger batch needs a capacity/risk justification, and a ready result does not wait to fill the batch. See `TEMPLATE-orchestrator-prompt.md` for briefing requirements.

Para uma única task (sem paralelização), o orquestrador pode executar inline, conforme a autorização da sessão:
```
Read docs/tasks/{{feature-slug}}/T{N}-{{name}}.md and execute in the worktree or branch selected by the task and session policy. Do not create a branch solely for a task number or internal step. Follow TDD and the evidence contract. When done, report the candidate; integrate or open a PR only when authorized.
```

**Parallelism allowed** (only include waves if you'll actually parallelize):

| Wave | Parallel tasks | Prerequisite |
|------|----------------|--------------|
| 1 | {{T1 + T2}} | None |
| 2 | {{T3 + T4}} | T1 complete |
| 3 | {{T5}} | T3 + T4 complete |

Each wave row implies one orchestration turn using the selected mechanism, with isolation, model/profile, and UI choices taken from current session/Host policy. No named model or mechanism is a portable default.

---

## General rules

- **TDD absolute** — tests first, code after; choose test layers and guards by impact
- **Candidate isolation:** use the worktree/branch selected by the task and session policy; a branch per task is not required for prose-only or tightly coupled internal work.
- **Conventional commits** matching the change type
- **Don't touch code outside declared scope**
- **Required project gates must pass** before integration
- **On completion:** update the authority source once, then refresh derived views; integrate/open a PR only according to authorization
- **Checkpoints are explicit:** record WIP, pending changes, last verified point, and exact next step; do not force a clean commit

---

## On feature completion

When all tasks are complete in the status authority and their evidence is accepted:

1. Update the task-status authority and its delivery evidence; the status table above is refreshed from that source.
2. Refresh a derived `PROGRESS.md` snapshot only when the complete layout uses it.
3. Add an ADR to project memory or a dedicated ADR file if a durable architectural decision was made.
4. **DO NOT delete the folder.** See `docs/tasks/_template/README.md` > "Archival policy".
