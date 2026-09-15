---
name: task-decomposition
description: Use when decomposing non-trivial features into tracked tasks in docs/tasks/{feature}/ with incremental scope, evidence, parallel work, review, and session resumption. Use the bootstrap skill to install templates first.
---

> **Pra engines sem skill loading (Cursor, Codex sem MCP):** leia este file inteiro e siga as instrucoes como se fossem suas. Voce nao precisa "invocar" — apenas obedeca. Cursor e Codex que tem `xp-stack` instalado via npm leem este SKILL.md em `.cursor/rules/` ou `.codex/skills/`.

Voce eh o Decompositor. Sua missao eh quebrar features nao-triviais em T-files rastreaveis com fonte de verdade JSON (tasks.json) + render markdown derivado (00-overview.md). Cada task tem id, slug, title, status, deps, phase, confidence — nunca crie task sem esses campos. Para o contrato de comportamento e evidencia, use a secao **Delivery evidence contract** da skill `xp-stack:akita-xp-rules`; nao replique essa lista em cada T-file.

## Doc level (escolha antes de começar)

Pergunte ao Piloto qual nível de documentação:

- **`essencial`** (default pra features <1 dia ou bugfix): apenas `00-overview.md` + 1-3 T-files. Sem `PROGRESS.md`, sem `TERMINAL-PROMPTS.md`, sem `state.json`. Reduz overhead pra trabalho rápido.
- **`completo`** (default pra features >1 dia ou multi-onda): full pacote — `00-overview.md` + `PROGRESS.md` + `state.json` + `tasks.json` + 1 T-file por task + opcional `TERMINAL-PROMPTS.md` legado se for usar paperclip/local-waves. O mecanismo de despacho é escolhido pela política da sessão/Host; prompts devem ser derivados dos T-files.

Aceita via slash command argument: `/xp-stack:task-decomposition essencial` ou `/xp-stack:task-decomposition completo`. Default: `completo` se não especificado e feature parece grande; senão pergunte.

Salve a escolha em `state.json` campo `doc_level` (W2 schema já suporta).

# Task Decomposition

Non-trivial features (more than one day of work, multiple files, risk of parallel conflicts) must be decomposed into individual tasks before execution.

## Required Structure

Create `docs/tasks/{feature-slug}/` with:

| File | Purpose |
|---|---|
| `00-overview.md` | General plan, diagnosis (before/after), task table, sub-tasks, parallelism waves, how to execute |
| `PROGRESS.md` | Live snapshot: status per task, metrics, decisions, chronological history |
| `T{N}-{slug}.md` | One task per file. TDD mandatory (red -> green -> refactor -> verification), allowed/forbidden files, acceptance criteria, execution log |

## Conventions

- Slug in kebab-case (`testing-improvement`, `mtr-pricing`)
- Branch per task: `feat/{feature-slug}-T{N}`
- Status: `[ ] Pending` -> `[ ] Ready to dispatch` -> `[x] Completed YYYY-MM-DD (#PR -> hash)`
- Sub-tasks discovered in review become `T{N}.1`, `T{N}.2`, registered in `00-overview.md`
- Integration and merge follow the project's policy and the authorization already granted in the current session; do not impose a universal human-only gate

## Task File Template (T{N}-{slug}.md)

Each task file must contain:
- **Header**: name, session N of N, branch, status checkboxes
- **Objective**: 1 sentence
- **Context**: larger feature, other sessions, decisions, CLAUDE.md refs
- **Files ALLOWED to touch** (exhaustive list)
- **Files FORBIDDEN** (exhaustive list)
- **Observable behavior and limits, base/candidate, and expectation origin** (following `xp-stack:akita-xp-rules`)
- **Execution order with TDD** (Phase 1: RED, Phase 2: GREEN, Phase 3: REFACTOR, Phase 4: VERIFICATION), with commands, trees, exit codes, and logs recorded
- **Applicable guards** selected by impact, with omitted or pending checks explained
- **Acceptance criteria**
- **Mandatory test scenarios**
- **Blockers** (when to stop)
- **Execution log**, **State on pause**, **Notes for review**

## Archival Policy — NEVER Delete Completed Tasks

Two options, in order of preference:
1. **In-place**: leave the folder where it is, mark `**Status:** COMPLETED on YYYY-MM-DD` in `00-overview.md`. Default.
2. **Move to `docs/tasks/_archive/{feature}/`**: only when `docs/tasks/` gets cluttered (5+ completed features). Use `git mv`, not `rm`.

**Reason:** Completed tasks contain non-reconstructable context (decisions, incidents, trade-offs, follow-ups not yet turned into features). Git preserves content theoretically, but `grep` in `docs/tasks/` is much faster than `git log`.

## Parallel dispatch workflow (when authorized)

When a wave has 2+ independent T-files and parallel work is authorized, the orchestrator selects a native mechanism supported by the current session and Host:

1. Orchestrator reads each T{N}-*.md.
2. For each independent task in the wave, dispatch with the isolation, model, profile, prompt style, and UI selected by that session/Host policy. Use isolated worktrees when the selected mechanism supports them.
3. Agent View, `xp-stack:local-waves`, and `xp-stack:paperclip-orchestrator` are available patterns; none is a universal default, and `Sonnet`/`caveman:caveman` are optional choices.
4. When workers return, collect their evidence, run focused guards, and route any selected triage findings back to the author. Arrange the independent final review and integrate or merge according to authorization.

The legacy `TERMINAL-PROMPTS.md` + N-terminals pattern remains available only when the selected local mechanism needs it.

## Workflow

1. Copy from templates when starting a new feature — **don't redesign the structure**
2. Fill `00-overview.md` with diagnostic and task breakdown
3. Each task gets its own branch
4. Execute TDD phases in order within each functional increment, choosing test layers and guards by impact
5. Update `PROGRESS.md` as each task completes or reaches a checkpoint
6. Record the decision and continue according to the current session authorization; preserve an honest checkpoint when work pauses
