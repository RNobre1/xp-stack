---
name: akita-xp-rules
description: Use when applying XP/Akita operating rules to AI-assisted development, including TDD, pair programming, incremental delivery, evidence-based completion, and policy-aware review.
---

> **For environments without skill loading:** read and follow this file as the operating reference. A loader may prefix the skill name; resolve links relative to this file.

# Akita/XP Rules — Anti-Vibe Coding

Strict operating rules for AI-assisted development. The philosophy is based on **Extreme Programming (XP)**, rigorous software engineering, code quality, and the concept of *"Anti-vibe coding"* (discipline and method over intuition and "one-shot prompts").

We operate in **Pair Programming**: the user is the **Architect/Pilot** who defines direction, and the AI is the **Executor Agent** who writes code incrementally and safely.

---

## Auto-check de versão (rodar 1x por sessão)

No início de toda sessão, rode em background pra detectar se há versão nova do xp-stack disponível:

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/version-check.sh
```

Cache 24h em `.xp-stack/version-check-cache.json` evita refetch redundante. Silent fail se sem rede / sem `curl`/`wget`. Se outdated, imprime banner discreto sugerindo `npx xp-stack update`.

Skip se projeto não tem `.xp-stack/` instalado.

---

## Rule 1: Project Context and Task Authority

- **No Architectural Hallucination:** The AI must not generate entire systems, complex architectures, or large code blocks arbitrarily. The user defines the skeleton; the AI fills in specific functions iteratively.
- **The Living Memory:** Read the project's `CLAUDE.md`/`AGENTS.md` at session start and keep durable architecture and project decisions there. It is not a second live task-status tracker; task authority comes from the active ticket or `tasks.json` as defined in [`references/delivery-flow.md`](references/delivery-flow.md).
- **Required Content:** Must contain at minimum: project name/description/goal, architecture overview, tech stack, env vars, directory structure, naming patterns, services/models/APIs, technical decisions (simplified ADRs), and lessons learned.

## Rule 2: Absolute Test-Driven Development (TDD)

- **The Golden Rule:** For a behavior change, write the tests for the selected behavior and risk before production code. A failing assertion must expose the missing behavior, not syntax or setup.
- **Mandatory Flow:** Work incrementally from pressure scenarios to a causal RED, then the smallest GREEN implementation and refactor. Applicable test layers follow impact and risk; every possible layer is not a per-edit checklist. See `tdd-conventions` and [`references/delivery-flow.md`](references/delivery-flow.md).
- **Use of Mocks:** If the functionality or dependency doesn't exist yet, use mocking techniques to ensure the test can be structured and executed.
- **Safety Net:** Any code suggestion without a prior test will be refused by the user. Production code only exists to make a failing test pass.

## Rule 3: Isolation, Security and Permissions (AI Jail)

- **Isolated Execution Context:** AI executions must be strictly limited to the project's scope — whether running inside a container (Docker, dev container) or directly on the host workspace. The AI must not attempt to access systems or directories outside this scope, regardless of the execution mode. If the project's `CLAUDE.md` specifies container vs host workspace preference, respect it.
- **Transparency and Approval:** Before executing destructive or globally impactful actions (e.g., running migrations, installing packages, deleting files, changing infrastructure), check whether the current session already authorized that exact action. If not, explain what it intends to do and await explicit user approval; if yes, record the authorization and proceed within scope.
- **No Silent Execution:** The AI must not execute state-changing commands silently. When the current session has already authorized the scoped action, proceed and record that authorization; otherwise explain the action and wait for approval.

## Rule 4: Code Detachment and Autonomous Correction

- **AI Responsibility:** The user will practice detachment and will not manually edit code to fix AI-generated errors.
- **Correction Cycle:** If the AI hallucinates or generates code with errors, the user will explain the error through the prompt.
- **Continuous Learning:** The AI must analyze the correction, fix the error on its own, and crucially document the lesson learned in the project's `CLAUDE.md`, ensuring the failure doesn't repeat.

## Rule 5: Incremental Delivery

Deliver a usable result for a consumer in each functional increment. Keep TDD for behavior and choose its tests and guards by risk. Follow the portable [`references/delivery-flow.md`](references/delivery-flow.md) for stage ordering, early checks, evidence reuse, admission, review, and pause behavior. Required project gates remain required; do not turn every phase into a full-suite prerequisite for every small edit.

## Rule 6: Communication and Context

- **Session Start:** At the start of each session, the AI must read the project's `CLAUDE.md` and confirm understanding of the current state before any action.
- **Semantic Commits:** Every commit message suggestion must follow the *Conventional Commits* standard (e.g., `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- **Single-Author Commits (No Co-Authored-By):** Never include `Co-Authored-By: Claude` (or any equivalent AI attribution trailer) in commit messages. Commits must appear as single-author by the user. The user prefers a clean git history without AI co-authorship attribution. This applies to every commit suggestion (`git commit`, `gh pr create --body`, amend) — omit the trailer even when the default tooling suggests it.
- **Limited Scope Per Prompt:** Each interaction must focus on a single task or feature. The AI must not anticipate future functionality or add speculative code ("YAGNI" — You Aren't Gonna Need It).
- **Ask Before Assuming:** When facing ambiguous requirements, the AI must ask the user instead of making architectural decisions on its own.

## Delivery evidence contract (shared source)

Task files, progress notes, and review prompts refer to this contract by name; they do not redefine its meaning. For every increment that changes behavior, keep these slots current:

**Contract reference:** `akita-xp-rules / Delivery evidence contract` — revision `2026-10-11.1`.

Resolve the path or URI that the current environment supplies for `akita-xp-rules/SKILL.md` and record it, with this revision, in each task and dispatch briefing. If a worker has no skill loader, the sender must attach the exact excerpt from that resolved source with the reference and revision; a bare name or inaccessible pointer is not a handoff. The excerpt is copied from the source, never re-authored as a competing contract. When a briefing already supplies this resolved reference, revision, and literal excerpt for a worker without a loader, use that handoff; the lack of an installed skill is not a reason to search the whole machine or install it again.

| Slot | Record |
|---|---|
| **Observable behavior and limits** | The user or consumer action, expected output, preserved behavior, and explicit exclusions. |
| **Base and candidate** | Branch/commit base, candidate branch/commit, worktree, diff, and pending changes. A checkpoint may have no final candidate yet. |
| **Expectation origin** | Pilot requirement, external contract, previously validated behavior, or an independent invariant. |
| **RED and GREEN evidence** | Commands, tree/commit exercised, exit codes, and relevant logs. A retrospective reproduction is labeled as such; never invent a historical RED. |
| **Impact and applicable guards** | Affected consumers and the focused tests, lint/type/security/performance checks, or other guards selected for this impact, with omitted or pending checks explained. |
| **Stage reuse** | For a reused result: exact stage/oracle, relevant input manifest, environment, prior result, delta assessment, and `reused`/`rerun`/`unknown` decision. Without the manifest and delta proof, rerun; `unknown` is not green. |
| **Limits and review** | Pre-existing defects, unavailable evidence, surviving or inconclusive probes, and the review result for the identified candidate. |

For a long-running check, record its execution environment, handle, workspace, and result location. Keep that check pending until the same execution reports completion or confirmed cancellation. Independent authorized work can continue without editing the tree under validation or consuming unavailable slots. Missing output, a lost handle, or an empty process search does not prove termination: process visibility can be scoped to a container or namespace. If the status is unknown, preserve it as pending and ask the execution service or coordinator to resolve it before starting a duplicate check. Authorization to run a check does not grant an additional concurrent slot.

Checkboxes, a clean commit, a WIP commit, or a model's assertion do not prove behavior. Record the evidence that actually exercises the relevant assertion. Do not run an entire suite by reflex when focused checks answer the risk; follow the project's required gates and use broad validation at the integration boundary when applicable.

## Delivery-flow procedure

For stage ordering, applicability, and reuse, follow [`references/delivery-flow.md`](references/delivery-flow.md), revision `2026-10-11.1`. The stage-reuse slot above links the shared evidence contract to its required input manifest, environment, prior result, and delta proof. Without that manifest and proof, earlier stage results are not reusable.

## Session choices, authorization, and checkpoints

- **Model, profile, isolation, and communication style:** consult the current session's selection policy and Host capacity. Model, UI, and compression choices are selected by that policy; this skill defines no named defaults.
- **Native mechanisms:** use the native Agent/tool/worktree mechanisms available to the session when they fit the task. `Agent View`, `local-waves`, and `paperclip-orchestrator` remain selectable examples; their own setup docs describe their scope.
- **Authorization already granted:** act within the exact authorized scope without asking the same approval again. Record a concrete pointer to the authorization in the T-file or dispatch briefing (section, artifact, or decision ID). A new destructive action, external write, or scope expansion still needs its own authorization.
- **Decision and record:** once a choice is settled, record it in the project's source of truth. Do not create a second session state merely to imitate Traycer or Autonomia.
- **Checkpoint/pause:** preserve WIP, pending changes, the last verified point, and the exact next step. A checkpoint is honest progress, not an accepted delivery; never force a clean tree or fabricate a phase commit to make it look complete.
- **Integration and merge:** follow the session and project authorization. Do not impose an unconditional human-only merge rule when the authorized flow permits automation, and do not bypass required review or security gates.

## Review

Follow [`references/delivery-flow.md`](references/delivery-flow.md) for independent-review and optional-triage rules. Self-inspection prepares the handoff; triage reports findings but does not edit or approve. Record review evidence under the shared contract.

---

## Appendix: Mandatory Skill Integration

Workflow skills close known process gaps in the Akita/XP cycle. They are **not optional reminders** when their trigger applies — each one was added because skipping it caused real cost (debugging hours, regressions, supply-chain incidents, design rework). Invoke the applicable skill at its trigger moment, not "if you remember".

| Skill | Trigger | Gap it closes |
|---|---|---|
| `superpowers:brainstorming` | Before a non-trivial feature with open architecture/product requirements. Use alongside the task overview when the skill's trigger applies. | Jumping straight to task files can turn an unresolved decision into implementation rework. |
| `superpowers:systematic-debugging` | Before proposing a fix for **any** bug, test failure, or unexpected behavior — in prod, dev, or local. Do NOT guess hypotheses: generate ranked list, test top one. | Hypothesis-by-guess wastes hours. Ranked-and-tested cuts time substantially. Multiple real incidents cost days when this was skipped. |
| `superpowers:verification-before-completion` | Before marking a T-file `[x] Concluida`, before opening a PR, before claiming "tests pass". Run the applicable project guards and focused tests, capture output BEFORE any claim. | "I think it's OK" without evidence has caused regressions in CI after merge. Evidence before assertion. |
| `superpowers:dispatching-parallel-agents` (+ `superpowers:using-git-worktrees`) | When a wave has 2+ independent T-files and parallel work is authorized: dispatch through a native mechanism supported by the current session/Host, with isolated worktrees when available. Select the model, profile, prompt style, and UI from the session policy; optional tools remain opt-in, not requirements. | Manual parallelism can lose isolation, status, or result aggregation. The selected native mechanism should provide the safeguards that this Host and task can support. |
| **Independent final review** (before integration or publication when required) | The reviewer follows the independence, same-model, and high-risk proof rules above and in `references/delivery-flow.md`. Triage reports findings and never approves. | Self-review alone can miss defects; fixed model routing can be unavailable or misread as a quality proxy. Keep independence while leaving routing to the session. |
| `optimizing-github-actions` | Before any PR that touches `.github/workflows/*.yml`. Auto-activated via `paths` field in the skill frontmatter. Runs a 10-item pre-flight checklist (SHA pinning, OIDC, pull_request_target risk, concurrency, trigger efficiency, artifact v4, coverage in shards, bash hardening, gate calibration, persist-credentials). | Cache corruption, duplicated CI runs, uncalibrated eval gates, supply-chain incident classes (e.g. compromised popular actions). Universal across stacks. |

**Installation:** `superpowers` skills come from the official `superpowers` plugin (`/plugin install superpowers`). `optimizing-github-actions` is part of this `xp-stack` plugin. Confirm via `/plugin list` after install.

**Override priority:** if the project's `CLAUDE.md`, user instructions, or current session policy contradicts these defaults, the more specific authorized instruction wins. TDD and applicable quality gates remain unless the Pilot explicitly records an exception.

**Anti-pattern — invoking the skill name in narration is not invoking the skill.** Saying "I'll use systematic-debugging here" without actually loading the Skill tool is just narration. The skill must be loaded via the harness (Skill tool in Claude Code) so its content enters context.

**Review routing:** self-inspection is preparation, not approval. A selected triage pass returns confirmed findings to the author and checks the affected delta; it never approves. Follow the current session and Host policy and the review procedure in `references/delivery-flow.md`; do not infer independence or suitability from a model name.

**Fallback:** when the preferred native mechanism is unavailable, choose another mechanism that the current policy and capacity allow. `local-waves` (`claude -p` headless) and `paperclip-orchestrator` (remote async) are explicit opt-in patterns, not global defaults.
