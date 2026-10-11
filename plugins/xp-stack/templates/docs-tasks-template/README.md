# Task Decomposition Template

Use `docs/tasks/{feature-slug}/` for new task tracking when there are multiple usable outcomes, dependencies, owners, or coordination risks and the project has no existing status tool. One outcome that touches several files can remain one task; a T-file is not created for every implementation phase or internal micro-step. If a project already has an active task-status tool, preserve it until a separate authorized migration.

Use the portable `akita-xp-rules / references/delivery-flow.md` (revision `2026-10-11.1`) for increment, evidence-reuse, risk, and review rules. Follow its status-source rule: a ticket without Autonomia is the authority; with an active Autonomia controller, the controller is the authority and the ticket points to it. For a new outside-Traycer docs/tasks flow without an existing status tool, `tasks.json` is the authority and Markdown is derived.

## Usage

```bash
FEATURE=my-feature
mkdir -p "docs/tasks/$FEATURE"
# New docs/tasks flow with no existing status tool; otherwise follow the active source of status.
cp docs/tasks/_template/TEMPLATE-tasks.json "docs/tasks/$FEATURE/tasks.json"
cp docs/tasks/_template/TEMPLATE-overview.md  "docs/tasks/$FEATURE/00-overview.md"
cp docs/tasks/_template/TEMPLATE-task.md      "docs/tasks/$FEATURE/T1-first-task.md"
# Complete layout only: dated, derived snapshot (uncomment when selected)
# cp docs/tasks/_template/TEMPLATE-progress.md "docs/tasks/$FEATURE/PROGRESS.md"
# Optional: copy only when the selected dispatch mechanism needs a separate prompt.
# cp docs/tasks/_template/TEMPLATE-orchestrator-prompt.md "docs/tasks/$FEATURE/ORCHESTRATOR-PROMPT.md"
```

## Files

| File | Required | Purpose |
|---|---|---|
| `tasks.json` | New outside-Traycer flow with no existing status tool | Canonical task status and dependencies; omit when a ticket, Autonomia controller, or existing tool is the source |
| `00-overview.md` | Yes | Derived view: diagnosis, outcomes, consumers, task references, and execution plan |
| `T{N}-{slug}.md` | Yes (1+) | Task specification keyed by ID in the authority source; TDD, scope, acceptance, execution evidence |
| `PROGRESS.md` | Optional, complete layout | Dated metrics/decisions snapshot derived from the authority source; never live status |
| `ORCHESTRATOR-PROMPT.md` | Optional | Copy of `TEMPLATE-orchestrator-prompt.md` only when the selected mechanism requires a separate dispatch prompt |

## Conventions

- **Feature slug** in kebab-case: `user-auth`, `payment-integration`, `search-feature`
- **Task number** sequential from 1. Sub-tasks discovered in review become `T{N}.1`, `T{N}.2`, etc.
- **Isolation:** use the branch/worktree selected by the session and Host policy; do not create a new branch for each internal micro-step.
- **Status authority:** follow the source-of-status rule in `delivery-flow.md`; update only that source and do not create a parallel tracker for an existing tool.
- **Documentation level:** follow the essential/complete file-set rules in `delivery-flow.md`. Do not create a `state.json` just to save `doc_level`.
- **Conventional commits** matching the change type (`test:`, `feat:`, `refactor:`, `fix:`, `docs:`, `chore:`)

## Lifecycle

1. **Planning**: identify one usable consumer outcome and its pressure scenarios. Select the authority defined in `delivery-flow.md`. Copy the `tasks.json` manifest only for a new outside-Traycer docs/tasks flow with no existing status tool; otherwise link task documents to the active ticket, Autonomia controller, or existing tool.
2. **Execution**: each increment follows TDD and the selected risk gates in `delivery-flow.md`; record the source/revision, candidate, commands, inputs, environment, exits, and logs in the task evidence.
3. **Completion**: after the required independent review and project gates accept the candidate, integrate or open a PR according to the current session authorization. Update the one status authority, then refresh Markdown views; never edit status in multiple places.
4. **Archival** (when ALL tasks in the feature are completed): see section below.

## Archival policy — NEVER delete

Completed tasks **are not deleted**. Two options, in preference order:

- **Option A (default): in-place**. Leave the folder where it is and retain the completed task source and dated evidence snapshots. `grep` still finds it, git blame preserves history.
- **Option B: move to `_archive/`**. Only when `docs/tasks/` root gets cluttered (5+ completed features competing with active ones). `git mv docs/tasks/{feature} docs/tasks/_archive/{feature}`.

**Never `rm -rf`.** Reasons:

- **Non-reconstructable context**: non-obvious decisions, trade-offs, incidents, workarounds that became hacks in the code. If someone deletes the T-file that explains why a specific hack exists, the next developer will "simplify" it and break things.
- **Onboarding**: new devs (or Claude in future sessions) read `docs/tasks/{completed-feature}/` to understand how we did that feature. Faster than reading 30 commits with `git log`.
- **Pending follow-ups**: sub-tasks discovered during execution stay registered in the feature's `00-overview.md`. Deleting the folder loses the tech debt list.
- **Audit**: when something breaks 3 months later, the first instinct should be "which feature touched this area?". A live folder answers in 1 second; git log takes 10+ minutes.
- **Context preservation**: markdown is durable context. Keep completed task records available so decisions, incidents, and follow-ups remain discoverable.

Git preserves content theoretically — but `CLAUDE.md` doesn't read `git log`, and neither do you, most of the time.
