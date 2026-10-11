# Task: {{SHORT TITLE}}

> **Increment:** {{functional increment this task delivers}}
> **Task ID:** {{id from the task-status authority}}
> **Branch/worktree:** {{isolation selected by the current session/Host policy; shared feature branch when appropriate}}
> **Worktree:** {{path or workspace identifier}}
> **Base:** `{{base branch/commit}}`
> **Candidate:** `{{candidate branch/commit, or pending}}`
> **Checkpoint:** {{none | WIP and exact next step below}}
> **Task-status authority:** {{Traycer ticket | Autonomia controller | existing project tool | docs/tasks/{{feature-slug}}/tasks.json for a new flow}}
> **Contract source:** {{resolved path/URI supplied by the environment to `akita-xp-rules/SKILL.md`}}
> **Contract revision:** `2026-10-11.1`
> **Loaderless handoff:** {{exact canonical excerpt attached in the dispatch briefing, or `skill loader resolves source`}}
> **Delivery-flow source/revision:** {{resolved delivery-flow.md URI | 2026-10-11.1}}

> Evidence fields are defined once in the **Delivery evidence contract** section of `akita-xp-rules`; process and stage reuse are defined in `delivery-flow.md`. This file provides task-specific details, not another status source. A checkpoint or WIP tree is valid progress and does not claim an accepted candidate.

---

## Objective

{{One or two sentences saying exactly what this task delivers. No "also", no elastic scope.}}

---

## Required context

- **Larger feature:** [00-overview.md](00-overview.md)
- **What other sessions are doing:** {{short summary of parallel tasks and why they won't conflict — or "None" if this task is solo}}
- **Decisions already made:** {{relevant ADRs, patterns chosen in the overview — avoid re-deciding here}}
- **Relevant CLAUDE.md sections:** {{list of sections the session should consult before starting}}
- **Current authorization and policy:** {{already-granted scope and selected mechanism}}
- **Authorization reference:** {{concrete T-file/briefing/session-artifact section or decision ID}}

---

## Files ALLOWED to touch

```
{{exact/path/1}}
{{exact/path/2}}
```

> Be restrictive. An explicit list prevents scope creep during execution.

---

## Files FORBIDDEN (other sessions or critical files)

```
{{path/that/must/not/change}}
```

> If you need to touch something here, stop and report the scope change. Do not solve it by silently widening the diff.

---

## Observable behavior and limits

- **User or consumer action:** {{what initiates the behavior}}
- **Expected observable result:** {{output, state, response, or side effect a consumer can observe}}
- **Preserved behavior:** {{existing behavior that must remain true}}
- **Out of scope:** {{explicit exclusions and known pre-existing behavior}}

## Origin of the expectation

- **Source:** {{Pilot requirement | external contract | previously validated behavior | independent invariant}}
- **Reference:** {{link, section, issue, or test describing the expectation}}
- **Interpretation still open:** {{none, or the exact question to resolve before implementation}}

## Evidence and applicable guards

- **Affected consumers or boundaries:** {{paths, callers, routes, users, or services}}
- **Applicable test layers:** {{selected by impact/risk, with a short reason for each applicable or omitted layer}}
- **Other guards:** {{lint, typecheck, schema, static analysis, or project-specific checks}}
- [ ] **Coverage check (when applicable):** {{required, deferred, or omitted with reason}}
- **Omitted or pending checks:** {{what was not run and why; do not imply that it passed}}
- **Stage reuse:** {{prior evidence pointer + input manifest/environment/delta proof, or `rerun`/`not reusable`}}

---

## Execution and evidence

Follow the resolved `akita-xp-rules / references/delivery-flow.md` source at revision `2026-10-11.1` and the `tdd-conventions` skill. Record selected pressure scenarios and applicable guards; do not expand this template into a checklist of every test layer.

For behavior changes, write the selected assertion first, observe a causal RED, implement the smallest change to reach GREEN, then refactor when useful. Select test layers and guards by impact and risk; retain required project gates. When available, run type/static checks before an expensive stage that they can screen. Capture the commands, tested tree, exits, and output required by the evidence contract. Reuse prior stage results only with their manifest, environment, and delta proof.

---

## Optional triage pass

Use the **delivery flow** for the triage boundary and finding fields. When selected, record its status/findings, author correction and delta recheck; triage does not edit or approve the candidate. Record the independent reviewer identity, model choice when available, decision, and evidence under the shared contract. Unknown is not approval.

---

## Acceptance criteria

- [ ] {{observable criterion 1 — provable via the applicable test or a focused, cited check}}
- [ ] {{observable criterion 2}}
- [ ] {{observable criterion 3}}

---

## Pressure scenarios and oracles

List the concrete cases that pressure this increment and the observable result or oracle for each. Include the normal path, relevant refusal/error path, and fragile or historical boundary when applicable; do not add cases just to fill slots.

| Case | Expected observation/oracle | Check or evidence |
|---|---|---|
| {{pressure case}} | {{observable result}} | {{focused test or other evidence}} |

---

## Blockers — stop and report if you encounter

- Need to create a migration or alter infrastructure without the required authorization
- Need to touch a file outside the declared scope
- Pre-existing critical behavior blocking the task
- Any operation against a production environment
- Conflict with a parallel branch or worktree
- Missing evidence for a required behavior, or a RED failure caused only by setup/configuration
- A triage or review result that is inconclusive and cannot be resolved within the authorized scope

---

## Execution log

> Fill this during execution. Record evidence and deviations, not just commit labels. Commits are optional unless the project workflow requires them.

- **RED:** {{status; command; base/tree/commit; exit code; log; historical or retrospective label}}
- **GREEN:** {{implementation; candidate/tree/commit; command; exit code; log}}
- **REFACTOR:** {{meaningful changes and rechecked guards, or "not applicable"}}
- **VERIFICATION:** {{focused checks, applicable guards, outputs, and remaining pending checks}}
- **Review/triage:** {{self-inspection, optional triage delta, independent final review, and result}}

### Incidents / deviations

{{Anything non-obvious that came up. Examples: setup failure separated from behavior RED; pre-existing bug left outside scope; WIP checkpoint preserved; a guard was deferred with an explicit reason.}}

---

## State on pause

> Use this block for a checkpoint. It preserves resumability without pretending the candidate is complete or the tree is clean.

- **Done:** {{summary and last verified point}}
- **In progress:** {{summary}}
- **Pending changes/WIP:** {{exact files or "none"}}
- **Exact next step:** {{file to open or command to run}}
- **Evidence:** {{what is proven, what is pending, and links to logs}}
- **Authorization needed next:** {{none, or exact action}}

---

## Notes for review session

- **Trade-offs taken:** {{decision X vs Y and why}}
- **Deferred to other tasks:** {{what was deferred and where it's recorded}}
- **Known risks and limits:** {{what remains uncertain or outside the checks}}
- **Candidate for review:** {{base/candidate/worktree/diff reference}}
- **Independent review status:** {{pending | findings returned to author | approved according to the authorized policy}}
