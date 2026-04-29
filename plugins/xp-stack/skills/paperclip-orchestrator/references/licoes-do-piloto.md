# 9 Lessons from a Real Wave 1 Pilot (Anonymized Case Study)

> These 9 lessons come from a real Wave 1 pilot at the upstream project that
> created this skill. They are **NOT** in your `local/paperclip/licoes.md`
> (which starts empty) — read them once before your Wave 1, then fill yours
> as you learn.
>
> All lessons are anonymized: no PR numbers, no Paperclip Issue IDs, no
> commit hashes, no IPs, no project-specific stack details. The technical
> root cause + mitigation pattern is what's portable.

---

## Lesson 1 — `auto-merge.yml` took 6 fixes before the first PR merged

**Context:** After completing setup (steps 1-7 of the playbook), a trivial test PR
was opened to validate the auto-merge.yml end-to-end (a 1-line note in PROGRESS.md,
expected to merge automatically in <2 min). Took 6 fixes over several hours.

**Root cause (multiple):**
1. **Phantom failures on push events:** GitHub generates "validation runs" cosmetic
   when push touches `.github/workflows/*.yml` without trigger match. `yaml.safe_load` +
   `actionlint` locally do NOT catch it — strict GitHub Actions parser behavior.
2. **`||` operator in `concurrency.group`:** undocumented quirk. `${{ A || B }}` in
   `concurrency.group` produces "An expression was expected" error.
3. **`gh pr checks --json conclusion`** removed in gh CLI v2.x — schema changed:
   valid fields now are `bucket` (pass/fail/pending/cancel/skip) + `state` + `workflow`.
4. **Insufficient permissions:** built-in `secrets.GITHUB_TOKEN` has limited
   default permissions. For `gh pr checks` GraphQL, needs `checks: read` + `statuses: read`.
   For `gh run download`, needs `actions: read`.
5. **Workflow file from DEFAULT branch (main) is the active one:** even pushing
   the fix to a PR head, GitHub uses the YAML from main for PR triggers. Forces
   cherry-pick + merge dev->main + re-trigger.
6. **`pull_request_review: submitted` fires on formal review, NOT on comment:**
   the tag-based comment flow (`[REVIEWER-AGENT] APPROVE`) requires re-applying
   the `auto-merge` label (`pull_request: labeled` event) to dispatch gate B
   after the comment.

**Mitigation:**
- AGENTS-reviewer.md instructs to re-apply label `auto-merge` after commenting APPROVE.
- auto-merge.yml simplified from 121 lines -> 31 lines + complete permissions + `bucket` field.
- The shipped template in this skill already has these 6 fixes baked in.

**Tag:** [gate | tooling | github-actions]

---

## Lesson 2 — dev-primary coded + pushed but did NOT open PR (auto-loop blocked it)

**Context:** Wave 1, T2. dev-primary assigned. After ~10min, agent pushed 2 valid
commits (test + impl, correct scope, 4 files) to its branch BUT did NOT execute
`gh pr create`. Paperclip Issue marked `blocked`. Pilot had to open PR manually.
After Pilot flipped Issue back to `in_review`, the agent woke up at the next tick
(120s heartbeat) and re-marked `blocked` — auto-claim loop even with PR already open.

**Root cause (multiple):**
1. **`gh pr create` failure:** agent likely tried, failed (lockfile artifact in
   worktree confused it about clean state? `gh` not in PATH? token issue?),
   reported `blocked`. T2 worktree had a stray lockfile from running the wrong
   package manager — stray file confused agent about clean state.
2. **Auto-loop on `assigneeAgentId`:** Paperclip schedule re-wakes agent that
   iterates assigned Issues WITHOUT filtering status. As long as `in_review` +
   assignee agent -> re-claim.
3. **No accessible run logs via API:** `GET /api/agents/<id>/runs` returned 404.
   `GET /api/companies/<id>/runs` returned a string instead of array. Without
   audit, becomes guesswork.

**Mitigation:**
- Pause agent's schedule immediately when `blocked`.
- `assigneeAgentId: null` on Issue to prevent re-claim even if schedule re-enabled.
- AGENTS-dev-primary.md (this skill's template) includes explicit exit checklist
  BEFORE `gh pr create`:
  - `git status --porcelain` should show only scope files (no stray lockfiles)
  - Confirm `gh --version` returns success
  - Confirm `gh auth status` returns logged-in
- AGENTS-dev-primary.md specifies which package manager the project uses
  (avoid stray lockfiles from using the wrong one).

**Tag:** [agents-md | paperclip-api | tooling]

---

## Lesson 3 — `gh pr list --base "feat/*"` does not work with glob

**Context:** Routine `review-pending-prs` fired on schedule. Reviewer Opus woke up.
After ~1min, returned idle WITHOUT commenting on any of the 3 open PRs that had
label `auto-merge`. Investigation: the filter `gh pr list --state open --base
"feat/*" --search "-label:review-done"` returns `[]` — gh CLI v2.91.0 does NOT
support glob in `--base`. Reviewer ran the command, saw empty list, exited
(programmed behavior if no PRs pending).

**Root cause:**
1. **`--base` in `gh pr list` requires exact branch name**, not glob. Documented
   but easy to miss in initial setup.
2. **`--search "-label:review-done"`** alone also returns nothing in this CLI
   version — search query syntax differs.
3. The pipeline appeared to "work" on the trivial first PR because Pilot had
   commented `[REVIEWER-AGENT] APPROVE` manually — never tested via the Routine
   path until Wave 1.

**Mitigation:**
- AGENTS-reviewer.md (this skill's template) uses client-side jq filter:
  ```
  gh pr list --state open --limit 30 --json number,headRefName,baseRefName,title,labels,url,body \
    --jq '[.[] | select(.baseRefName | startswith("feat/")) | select([.labels[].name] | contains(["review-done"]) | not)]'
  ```
- Routine description (the API-side prompt that creates the wakeup Issue) uses
  the same filter wording.
- Re-upload AGENTS-reviewer.md to reviewer agent via Paperclip API after any update.

**Tag:** [agents-md | tooling | gh-cli]

---

## Lesson 4 — Caveman plugin installed but does not work without marketplace + correct skill name

**Context:** Wave 1 pilot ran the 3 dev-primary with `Skill superpowers:caveman`
in AGENTS-dev-primary.md. Logs showed 3 invocations that received `<tool_use_error>
Unknown skill: superpowers:caveman</tool_use_error>`. Cost of Wave 1 without compression:
~$21 USD-equivalent subscription. Estimate with compression active: ~$5-10 (~75% savings).

When trying to reinstall:
1. Correct skill name is `caveman:caveman` (standalone plugin <https://github.com/JuliusBrussee/caveman>).
   NOT `superpowers:caveman` — caveman is not in the superpowers plugin (verifiable
   in the cache directory of an installed superpowers).
2. After rsyncing the plugin cache from a laptop where it works + creating
   `installed_plugins.json`, dev-primary still received `Unknown skill`. Missing
   the marketplace dir + `known_marketplaces.json`.

**Root cause:** Claude Code plugin discovery requires 3 elements (later found to be 4 — see Lesson 6):
- `installed_plugins.json` (registry of installed plugin)
- `~/.claude/plugins/marketplaces/<name>/` (marketplace clone, contains the skill source)
- `~/.claude/plugins/known_marketplaces.json` (registry of marketplace + its GitHub origin)

Without marketplace + known_marketplaces, the registry alone is not enough. Plugin
source in `cache/` is not discovered.

**Mitigation:**
- rsync of `~/.claude/plugins/marketplaces/<plugin>/` to droplet
- Create `~/.claude/plugins/known_marketplaces.json` with entry pointing to the GitHub origin
- Verify correct skill names before referencing them in AGENTS.md. Don't assume
  a skill belongs to a particular plugin without checking.
- Before any new wave, validate plugin install via test trivial Issue.

**Tag:** [tooling | plugin]

---

## Lesson 5 — `auto-merge.yml` workflow cached by GitHub Actions

**Context:** After identifying that gate B was rejecting on `coverage_status=unavailable`
(coverage artifact not yet published by fast-lane), pushed a fix to fix the gate to
treat `unavailable` as informational. Re-applying label `auto-merge` to PRs dispatched
auto-merge.yml, but the run log showed it was still using the OLD workflow YAML
(without the fix). Even with base branch updated and several cache invalidation
attempts (label cycle, multiple re-applies), workflow did not update.

**Root cause (hypothesis — not fully confirmed):** GitHub Actions caches the workflow
YAML for some period (perhaps in PR ref cache). For `pull_request` events, workflow
source is typically the `merge` ref (computed dynamically from PR head + base), but
in attempts the run used a stale snapshot.

**Mitigation:**
- Manual squash-merge with `--admin` on the affected PRs. Bypasses the problematic
  gate workflow.
- Reviewer had already approved + fast-lane CI green — bypass was a calibrated
  decision (false-positive gate, not real risk).
- Before changing `.github/workflows/auto-merge.yml`, create a proof-of-concept PR
  that breaks the cache (e.g. rename of workflow file, or minor change in trigger
  line).
- Or: ensure ALL task branches have the updated workflow YAML BEFORE creating PR.
  Cost: extra commit per task; benefit: gate runs current YAML.

**Tag:** [github-actions | workflow-cache | gate]

---

## Lesson 6 — Claude Code plugin needs 4 elements to be active

**Context:** After Lesson 4 installed caveman plugin on droplet via rsync (cache + marketplace)
+ creating `installed_plugins.json` + `known_marketplaces.json`, dev-primary STILL
received `Unknown skill: caveman:caveman`. 4 elements are mandatory — the 4th was missing.

**Root cause (sequential discovery):**

Claude Code plugin activation requires **ALL** 4 below:

1. **Plugin cache** — `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` (full source).
2. **Marketplace dir** — `~/.claude/plugins/marketplaces/<marketplace>/` (catalog,
   contains `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json`).
3. **`~/.claude/plugins/installed_plugins.json`** + **`~/.claude/plugins/known_marketplaces.json`**
   (registries).
4. **`~/.claude/settings.json`** with `enabledPlugins.<plugin>@<marketplace>: true` —
   **CRITICAL, activates at runtime**.

Without element 4, plugin is "installed" but Claude does not inject it into the next run.

**Mitigation:**
- Create `/home/paperclip/.claude/settings.json`:
  ```json
  {"enabledPlugins": {"<plugin>@<marketplace>": true}}
  ```
- Validate via trivial test Issue: agent comments `Skill <plugin>:<skill>` succeeded
  in the run.
- Before creating new Paperclip agents, run install checklist:
  - [ ] cache exists?
  - [ ] marketplace dir exists?
  - [ ] known_marketplaces.json + installed_plugins.json point to correct paths?
  - [ ] settings.json has `enabledPlugins.<plugin>: true`?
  - [ ] Trivial test confirmed loading?

**Tag:** [tooling | plugin | settings]

---

## Lesson 7 — Reviewer did not follow instruction to re-apply `auto-merge` label

**Context:** AGENTS-reviewer.md explicitly instructed: after APPROVE comment, execute
`gh pr edit --remove-label auto-merge && sleep 2 && gh pr edit --add-label auto-merge`
to re-trigger auto-merge.yml (because `pull_request_review: submitted` does not fire
on a comment). In Wave 1, reviewer Opus approved 2 PRs but ONLY removed `auto-merge`
(without re-add). Result: label stays as just `review-done` after APPROVE — auto-merge.yml
did not re-trigger. Pilot had to manually re-apply on both PRs.

**Root cause (hypothesis):**
- AGENTS.md instruction is technical and detailed (3 commands with `&& sleep 2 &&`).
  Opus model interpreted `--remove-label auto-merge` plus the `review-done` add as
  "completion step" instead of following the full sequence.
- Perhaps the Routine description prompt that triggered the reviewer reinforced the
  short version without `sleep 2 + add` re-cycle.

**Mitigation:**
- AGENTS-reviewer.md (this skill's template): made the re-add **more imperative**
  with numbered checklist + explicit warning "if you don't re-apply, PR doesn't
  merge automatically".
- Routine description: same sequence with the same level of detail.
- Add post-comment verification: reviewer runs `gh pr view --json labels --jq
  '.labels[].name | contains("auto-merge")'` before closing task. If false and
  verdict=APPROVE, does add.
- Consider extracting to a script `scripts/reviewer-finalize-approve.sh` with the
  atomic sequence + calling from AGENTS.md.

**Tag:** [agents-md | reviewer | label-cycle]

---

## Lesson 8 — Fast-lane CI covers subset; full CI catches bugs the agent missed

**Context:** A task PR passed fast-lane CI (lint + typecheck + unit subset path-filtered).
Reviewer approved (after agent fix). But when the `feat/<slug> -> dev` PR was opened
and full CI ran, **shard 1/3 of Unit + Component Tests FAILED** with 6 tests in a file
the task did not touch:

```
Error: [vitest] No "<exportName>" export is defined on the "@/components/<X>" mock.
```

Root cause: agent added a new export to a component (correct for the task), but a
test file that mocks that component returned only `default` — without the new export.
When the dependent file renders the new feature, it fails. Bug NOT caught by fast-lane
because path-filter did not include the dependent test file (file was not modified by
the task).

**Root cause:**
- Fast-lane has aggressive path-filter that skips tests whose path was not modified.
- Agent followed T-file allowlist (the test file for the touched component) but the
  allowlist did not anticipate **indirect dependencies** (other tests mocking the
  touched component).
- Fast-lane does not run full test suite, only subset.
- Reviewer agent does not run tests, only reads diff and infers — did not catch this bug.

**Mitigation:**
- AGENTS-dev-primary.md (this skill's template): adds **before PR**, "run COMPLETE
  test suite (not just tests in scope). If a test file not listed in T-file allowlist
  fails, pause and comment Issue — likely indirect dependency (stale mock, type guard, etc.)."
- T-file template: field "dependent tests" with auto-grep of imports of modified file.
- Consider: Vitest 2.x `--changed` flag picks tests AFFECTED by changes, not just
  tests in path. Non-trivial but worth research.
- Alternative: have auto-merge.yml gate B require full CI's "Unit + Component Tests
  (merge)" check, not just fast-lane. Cost: more CI minutes; benefit: catches bugs
  like this.

**Tag:** [ci | fast-lane | test-scope | mock-dependencies]

---

## Lesson 9 — External tracker integration is manual; cards do not move automatically

**Context:** After Wave 1 merged, architect created 1 task summary in the team's
external task tracker. But 2 cards ALREADY EXISTED in the tracker for the individual
items that merged. Both stayed in `in_progress` after merge. Architect did not move
them in the first pass — discovered only when Pilot asked "are you moving the cards
and creating any that weren't there?".

**Root cause:**
- Architect (orchestrator session) decomposes feature into T-files but does NOT
  sync with external tracker pre-Wave.
- Tracker exists parallel to codebase — no automatic bridge.
- Paperclip agents have NO access to tracker MCP (and shouldn't — not part of their context).

**Mitigation:**
- **Pre-Wave (architect):** decompose feature into T-files + list related tracker
  cards in `00-overview.md` (field "tracker cards"). Move cards to `in_progress`
  when dispatching.
- **Post-Wave (architect):** when merging `feat -> dev` PR, move listed cards to
  `done` + create card "Wave N pilot" as summary.
- T-file template: optional field "associated tracker card ID" for traceability.

**Tag:** [external-tracker | architect-process | sync]

---

## How to use these lessons

1. **Read all 9 once before Wave 1.** Time investment: ~15 min. Saves days.
2. **Configure your Wave 1 against the lessons:**
   - Lesson 1: the `auto-merge.yml` template in this skill already has the 6 fixes baked in. Don't re-derive.
   - Lesson 2: fill exit checklist explicitly in AGENTS-dev-primary.md (the template ships with one — adapt for your stack).
   - Lesson 3: the AGENTS-reviewer.md template uses jq client-side filter — don't switch to `--base feat/*`.
   - Lesson 4 + 6: validate plugin install via trivial test Issue before Wave 1.
   - Lesson 5: when changing `auto-merge.yml`, do it via dev->main first; or merge the workflow change into the wave's feat branch BEFORE opening task PRs.
   - Lesson 7: AGENTS-reviewer.md template has the imperative checklist + verification.
   - Lesson 8: AGENTS-dev-primary.md asks for FULL test run before PR.
   - Lesson 9: list tracker card IDs in `00-overview.md` of each feature (field optional in T-file).
3. **As you find new lessons:** write them in YOUR `local/paperclip/licoes.md` with
   the format suggested there. Don't expect them to be portable — they likely aren't.
   That's fine. The point is internal calibration.

The 9 above were portable (anyone using Paperclip is likely to hit them). Yours
likely won't be — but they're worth more to YOU than these 9 because they're real
to YOUR project.
