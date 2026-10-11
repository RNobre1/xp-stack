# Delivery flow

**Revision:** `2026-10-11.1`
**Evidence contract:** `akita-xp-rules / Delivery evidence contract`, revision `2026-10-11.1`.

This portable reference explains how to apply the shared evidence contract across a functional increment. It describes process and evidence; it does not grant authorization, choose a model/provider, or change a project, Host, package, or active Autonomia contract. Skills and templates point here rather than copying the flow.

## Source of task state

- **Traycer without an active Autonomia controller:** the active ticket is the sole source of status, owner, blocker, and next action. Task files, progress notes, and handoff summaries point to it; they are not competing live status lists.
- **Traycer with an active Autonomia controller:** the controller is the source of status, owner, blocker, and next action; the ticket points to that controller. Task files and receipts link to the controller, not to a second status authority.
- **New `docs/tasks` flow outside Traycer:** use `docs/tasks/<feature>/tasks.json` as the sole status source when the project has no existing task-status tool. `00-overview.md`, T-files, and optional `PROGRESS.md` are derived views/specifications. The current schema does not store `doc_level`; choose the file set at decomposition time instead of creating a `state.json` just to persist that choice.
- **Existing project task-status tool:** preserve its active source and contract. Do not create a parallel `tasks.json` tracker or migrate the runtime state as part of task documentation; migration requires separate authorization.
- **Choose a layout:** use essential by default; add the complete layout only when multiple increments or coordination make a dated progress snapshot useful. For a new `docs/tasks` flow without an existing status tool, essential contains `tasks.json`, one overview, and only the task details needed for the increment. If a current tool already owns status, link to it instead of adding `tasks.json`. Complete adds an optional derived progress snapshot. Terminal prompts exist only when the selected mechanism requires them.
- `CLAUDE.md`/`AGENTS.md` remains project memory for durable project decisions; it is not a second live task tracker. This flow does not migrate, delete, or rewrite an existing runtime state machine. If a current project tool still requires a legacy state file, keep its active contract and do not dual-write task status; migration is a separate authorized change.

## Deliver a usable increment

Start with one user/consumer outcome: who acts, what observable result they receive, and what must remain true. Group internal work until it produces that usable result. Avoid splitting implementation into status-only microtasks. The coordinator's default batch contains up to two usable increments; a larger batch needs an explicit capacity/risk reason from the coordinator. Do not delay a ready result just to fill a batch.

For each increment, state the accepted behavior, exclusions, dependencies, and pressure scenarios before implementation. Define expensive interfaces, data shapes, and type contracts early enough for cheap static checks to catch errors before browser, system, or broad integration stages.

TDD remains mandatory for behavior: write the assertion for the selected behavior first, observe a causal RED, implement the smallest change, then refactor. The required test layers and existing project gates remain selected by impact and risk; do not require every test type for every edit or invent a target test count. Preserve security, transaction, rollback, concurrency, and historical-regression checks when reducing duplication.

## Select and run guards

Order checks by information gained and cost: focused syntax/type/static checks and relevant unit or contract tests first; wider integration, browser, load, and security checks at the boundary their risk requires. A type/static check supported by the stack runs before an expensive stage when it can catch the same failure sooner. A failed blocking check stops later expensive checks by default; preserve its output and repair the cause before continuing. The coordinator may authorize a diagnostic continuation when it has a distinct purpose.

Use one logical admission gate on the existing Host queue for each heavy validation window; this is not a new queue or scheduler. Announce the drain and let registered concurrent loads finish; never kill resident processes or services indiscriminately. The coordinator admits the next load from the Host's measured current capacity and explicit headroom. This reference sets no Host numbers or worker counts. If capacity is unknown, do not start the heavy stage.

Shards must preserve the same selected test IDs and oracles as the unsharded run. Partition without overlap or omission; retain browsers, scenes, skipped cases, and visual checks. Isolate mutable data, caches, ports, temporary paths, and cleanup. Aggregate every required shard; missing or failed output is not green.

Pausing, handoff, or compaction records the current authority, candidate/tree, pending changes, active execution handle, owner, environment, result location, and next action. Those lifecycle events do not by themselves authorize tests, type checks, commits, pushes, cleanup, or publication. A separately authorized lifecycle procedure remains governed by its own contract; this flow neither grants nor overrides it. Do not mutate the Git index or tree while an execution depends on it. Keep a running check pending until that same execution reports completion or confirmed cancellation.

## Stage evidence reuse

Reuse is allowed only when the stage has a manifest of its relevant inputs and environment and the assessed delta proves those inputs are unchanged. Without a manifest, the prior result is not reusable. Unknown or transitive impact invalidates reuse.

For each stage result that may be reused, link the shared evidence-contract record and add only this stage-specific proof:

| Stage reuse field | Record |
|---|---|
| Stage and oracle | The exact focused check and behavior it exercises |
| Input manifest | Paths/globs and external inputs that the check reads, including test configuration, fixtures, schemas, dependencies, and relevant infrastructure |
| Environment | Runtime/tool versions and the environment components that can affect this oracle |
| Prior result | Candidate/tree, command or execution handle, exit/result, and durable output location |
| Delta assessment | Changed paths and a reason each declared input and environment component is unchanged, or the reason the result is invalidated |
| Decision | `reused` with provenance, `rerun`, or `unknown` (which blocks a green claim) |

Do not infer reuse from a small diff, a documentation label, or the author's confidence. A change to any declared input or relevant environment requires a rerun of that stage. A change outside the manifest may preserve the stage only after the diff-to-manifest comparison is recorded.

## Review and risk

The author performs self-inspection to prepare the handoff. When an independent final review is required by policy or risk, the reviewer must have a different agent identity and receive the candidate, diff, criteria, and evidence in a separate review context; the author's reasoning is not a substitute. Model/provider diversity is recommended, not a proxy for review quality; routing belongs to the current Agent Selection policy, never this portable reference. Use of the same model is allowed only when the Pilot explicitly selects it and that choice is recorded; when the active briefing already contains that choice, do not ask again. For high-risk work reviewed with the same model, require an independent mechanical counterproof (for example, focused property/adversarial/mutation checks) or an additional reviewer using a different model. The author never approves their own change.

One independent correction review is enough for an increment. A reviewer checks the changed delta and the property fixed. After repeated deltas or a change to a shared invariant, review the candidate against the base as a whole; do not require a fixed number of review passes.

Every final review records either **Checks executed now** (commands, timestamp, and exits) or **Fresh external evidence** (artifact/run, timestamp, and candidate). Without either, the review result is inconclusive.

### Optional triage

Use a triage pass only when selected and authorized. Give it the accepted scope and criteria, base/candidate, diff, consumer references, and available evidence. It may read or run focused probes when authorized, but does not edit, publish, or approve the candidate. Each finding records **location, concrete case, expected versus observed, evidence, severity, and confirmation** (`confirmed`, `inconclusive`, or `out-of-scope`). Unknown is not approval. Return confirmed findings to the author; recheck the changed delta and property, then send the candidate to the independent final reviewer. Triage does not justify a full suite by itself.

The low-risk path applies only to objectively confirmed formatting-only changes or prose edits with no semantic, contract, policy, or agent-instruction effect. Applicable format/link checks still run. Changes to methodology, task authority, agent instructions, permissions, security, schemas, migrations, or automation are not low-risk merely because they edit Markdown; use the impact and risk gates.

The flow revision must be named in the task/dispatch briefing and delivery receipt alongside the evidence-contract revision. Updating this reference alone does not widen an active authorization or Autonomia task. An active controller changes its adopted methodology only through the `autoridade` command with the Pilot's literal authorization and a refreshed briefing to participants; use the revision current at the next authorized unit.

For the focused test-suite cost/value audit, use [`test-cost-audit.md`](test-cost-audit.md) and its [reusable prompt](test-cost-audit-prompt.md).
