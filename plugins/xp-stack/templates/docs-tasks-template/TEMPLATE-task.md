# Task: {{SHORT TITLE}}

> **Increment:** {{functional increment this task delivers}}
> **Session:** {{session or run identifier, if applicable}}
> **Branch:** `feat/{{feature-slug}}-T{{N}}`
> **Worktree:** {{path or workspace identifier}}
> **Base:** `{{base branch/commit}}`
> **Candidate:** `{{candidate branch/commit, or pending}}`
> **Checkpoint:** {{none | WIP and exact next step below}}
> **Contract source:** {{resolved path/URI supplied by the environment to `akita-xp-rules/SKILL.md`}}
> **Contract revision:** `<revision read from the resolved contract source>`
> **Loaderless handoff:** {{exact canonical excerpt attached in the dispatch briefing, or `skill loader resolves source`}}
> **Status:** `[ ] Planning` `[ ] In progress` `[ ] Evidence captured` `[ ] Ready for review`

> Field meanings are defined once in the **Delivery evidence contract** section of `akita-xp-rules`. This file provides slots for that contract; it is not a second contract. A checkpoint or WIP tree is valid progress and does not claim an accepted candidate.

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
- **Applicable test layers:** {{unit/component/contract/integration/E2E/regression/performance/security, with a short reason for each}}
- **Other guards:** {{lint, typecheck, schema, static analysis, or project-specific checks}}
- [ ] **Coverage check (when applicable):** {{required, deferred, or omitted with reason}}
- **Omitted or pending checks:** {{what was not run and why; do not imply that it passed}}

---

## Execution order (TDD mandatory per functional increment)

### Phase 1 — Tests first (RED)

- [ ] Create or expand the test/observation for the expected behavior above before production code.
- [ ] Run the focused command against the intended base/tree and record the command, tree or commit, exit code, and relevant log.
- [ ] Confirm the failure is the missing behavior, not a syntax or configuration error.
- [ ] If no historical RED exists, write `RED not recorded` and optionally run a later reproduction labeled **retrospective reproduction**. Never invent a past command, commit, or chronology.

### Phase 2 — Implementation (GREEN)

- [ ] {{concrete implementation step 1}}
- [ ] {{concrete implementation step 2}}
- [ ] Run the focused command against the candidate and record the tree/commit, exit code, and log.
- [ ] Confirm the assertion exercises the behavior rather than only a mock, snapshot, or file-presence signal.

### Phase 3 — Refactoring (REFACTOR)

- [ ] Remove duplication or improve structure only when the change is supported by the evidence and scope.
- [ ] Re-run the affected checks after each meaningful refactor.
- [ ] Record a commit only when the project workflow calls for one and there is a real change; do not create an empty phase commit.

### Phase 4 — Verification and handoff

- [ ] Re-check base, candidate, worktree, pending changes, and diff against the allowed paths.
- [ ] Run the focused tests and other guards selected by impact. Run broader validation at the integration boundary or when project policy requires it.
- [ ] Capture output before marking evidence ready or claiming completion.
- [ ] Perform author self-inspection to prepare the handoff; it is not a substitute for an independent final review when required by policy or risk.

---

## Optional triage pass

Run this section only when the current session explicitly selects and authorizes the pass. Use the **Delivery evidence contract** in `akita-xp-rules` for the full boundary and finding semantics.

- **Triage mechanism/profile:** {{selected by current session/Host policy, or not selected}}
- **Input checked:** {{scope, criteria, base/candidate, diff, consumers, and available evidence}}
- **Findings:** {{none, or one row per finding with location; concrete case; expected vs observed; evidence; severity; confirmation}}
- **Triage status:** {{not run | confirmed findings returned to author | inconclusive | out-of-scope}}
- **Author correction:** {{reference to the reproduction and correction, or not applicable}}
- **Delta recheck:** {{command/log/property rechecked after correction, or not applicable}}
- **Author identity/model:** {{concrete agent identity and model}}
- **Final independent review:** {{Opus or another policy-selected reviewer/context and result, or pending}}
- **Reviewer identity/model:** {{must differ from the author identity/model; record the concrete selection}}
- **Checks now or fresh external evidence:** {{commands + timestamp + exit codes, or artifact/run + timestamp + candidate}}

Triage reports facts and gaps; it does not edit the implementation or approve the candidate. Unknown is not approved, and triage does not justify running the entire suite by reflex.

---

## Acceptance criteria

- [ ] {{observable criterion 1 — provable via the applicable test or a focused, cited check}}
- [ ] {{observable criterion 2}}
- [ ] {{observable criterion 3}}

---

## Mandatory test scenarios for applicable layers

```
{{component or function under test}}
  - {{scenario 1 — happy path and expected observation}}
  - {{scenario 2 — error/refusal and expected observation}}
  - {{scenario 3 — edge case, preserved behavior, or known fragile boundary}}
```

> Select test layers by impact, but once a scenario is selected it is part of the TDD contract. A skipped layer needs a reason in **Evidence and applicable guards**.

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
