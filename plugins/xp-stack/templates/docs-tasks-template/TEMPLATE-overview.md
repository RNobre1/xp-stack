# {{Feature}} — Overview

**Date:** {{YYYY-MM-DD}}
**Objective:** {{One sentence with the problem and expected observable outcome. No process jargon.}}

> Tasks are functional increments. Base/candidate, behavior, expectation origin, RED/GREEN evidence, applicable guards, limits, and review use the **Delivery evidence contract** in `akita-xp-rules`. Record the resolved contract source in each T-file and dispatch briefing.

---

## Diagnosis

{{What exists today vs what needs to exist. Before/after tables help. Numbers > adjectives.}}

| Category | Today | Target | Current quality |
|---|---|---|---|
| {{e.g., hook coverage}} | {{0%}} | {{100%}} | {{Bad / Medium / Good}} |
| {{e.g., API integration}} | {{38%}} | {{85%+}} | {{Basic}} |

---

## Tasks (execution order)

| Task | Name | Dependency | Estimate | Status |
|------|------|------------|----------|--------|
| [T1](T1-{{slug}}.md) | {{short name}} | None | {{S/M/L}} | [ ] Pending |
| [T2](T2-{{slug}}.md) | {{short name}} | T1 | {{S/M/L}} | [ ] Pending |

> **Status syntax:** `[ ] Pending` -> `[ ] Ready to dispatch` -> `[x] Completed YYYY-MM-DD (#{PR} -> {hash})`.
> Tasks blocked by another task: `[ ] Pending — blocked by T{N}`.

---

## Sub-tasks identified

> Follow-ups discovered during execution or review. Stay here as backlog until they become formal T-files.

| Sub-task | Origin | Description |
|---|---|---|
| T{N}.1 | PR #{{NN}} review | {{what fell outside original scope}} |

---

## How to execute

**Parallel dispatch (when authorized):** the orchestrator selects a mechanism supported by the current session and Host. See `TEMPLATE-orchestrator-prompt.md` in this template for the prompt contract.

Para uma única task (sem paralelização), o orquestrador pode executar inline, conforme a autorização da sessão:
```
Read docs/tasks/{{feature-slug}}/T{N}-{{name}}.md and execute. Branch: feat/{{feature-slug}}-T{N}. Follow the TDD and evidence contract. When done, report the candidate; integrate or open a PR only when authorized.
```

**Parallelism allowed** (only include waves if you'll actually parallelize):

| Wave | Parallel tasks | Prerequisite |
|------|----------------|--------------|
| 1 | {{T1 + T2}} | None |
| 2 | {{T3 + T4 + T5}} | T1 complete |

Each wave row implies one orchestration turn using the selected mechanism, with isolation and model/profile choices taken from the current session/Host policy. Agent View, Sonnet, and `caveman:caveman` are optional examples.

---

## General rules

- **TDD absolute** — tests first, code after; choose test layers and guards by impact
- **One branch per task:** `feat/{{feature-slug}}-T{N}`
- **Conventional commits** matching the change type
- **Don't touch code outside declared scope**
- **Required project gates must pass** before integration
- **On completion:** update status here, update `PROGRESS.md`, and integrate/open a PR according to authorization
- **Checkpoints are explicit:** record WIP, pending changes, last verified point, and exact next step; do not force a clean commit

---

## On feature completion

When ALL tasks have `[x] Completed` and their evidence is accepted:

1. Update this file's header: `**Status:** COMPLETED on YYYY-MM-DD`.
2. Update `PROGRESS.md` with final metrics snapshot.
3. Add ADR to the project's CLAUDE.md or dedicated ADR file if relevant architectural decisions were made.
4. **DO NOT delete the folder.** See `docs/tasks/_template/README.md` > "Archival policy".
