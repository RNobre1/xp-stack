# Changelog

All notable changes to `xp-stack` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.1] — 2026-05-14

### Fixed

- **`code-review-automation` setup script**: when target project already had a `.claude/hooks/pre-tool-use.sh` ending with `exit 0` (typical when `debugging-discipline` was installed first), the new `gh pr (create|merge)` matcher was being **appended AFTER `exit 0`**, making it unreachable. Setup script now uses `awk` to insert the new matcher block **before** the first `exit 0` line. Fallback to EOF append if no `exit 0` present.

> Bug was discovered via orchestrator self-review of the v2.1.0 install in the downstream consumer `meteora-digital/meteora-ai-platform` — the very pattern the skill is designed to enable found a bug introduced by a Sonnet worker. Self-review works.

### Migration from 2.1.0

If you installed `code-review-automation@2.1.0` and have `debugging-discipline` already present, your `.claude/hooks/pre-tool-use.sh` likely has the new matcher unreachable. Fix manually by moving the `# code-review-automation` block above the `exit 0` line, or re-run `npx xp-stack@2.1.1 add-skill code-review-automation` then `bash .claude/skills/code-review-automation/scripts/setup-code-review-automation.sh "$(pwd)"` (but only after deleting the broken matcher manually — the script detects `"review-pr reminder"` string and would SKIP). Quick verification: `grep -c "review-pr reminder" .claude/hooks/pre-tool-use.sh` should be `1`, and the line should be ABOVE `exit 0`.

---

## [2.1.0] — 2026-05-13

> **Minor release.** New opt-in skill `code-review-automation` enforces **orchestrator self-review** (NOT subagent dispatch) before `gh pr create` / `gh pr merge`. Combats family bias via different-capacity reviewer (Opus reviews Sonnet) + adversarial persona prompting. Zero extra cost — runs inside active Claude Code session.

### Added

- **`code-review-automation`** opt-in skill (in `templates/opt-in-skills/code-review-automation/`):
  - Installs `.claude/commands/review-pr.md` (slash command guiding the **active orchestrator** through structured adversarial self-review — NOT a subagent dispatch)
  - Appends "Orchestrator self-review findings" section to `.github/PULL_REQUEST_TEMPLATE.md` (idempotent — grep before append)
  - Adds `gh pr (create|merge)` matcher to `.claude/hooks/pre-tool-use.sh` reminding to run `/review-pr` first
  - Registers in `.claude/settings.json` via deep-merge if hook PreToolUse not registered yet
  - Aliases: `review-auto`, `pr-review-gate`, `self-review`, `review`
  - Rationale doc explaining anti-bias via different-capacity reviewer + Couch 2025 study reference

### Changed

- **`akita-xp-rules/SKILL.md`** Mandatory Skill Integration table: new row "Orchestrator self-review (before `gh pr create` / `gh pr merge`)" — explicit guidance that reviewer is the active orchestrator, not a dispatched subagent. New paragraph "Self-review vs subagent dispatch" explaining trade-offs (subagent reviewer = Sonnet = same family blind spots; orchestrator = Opus = different capacity within family).
- **`TEMPLATE-orchestrator-prompt.md`** "Sequência típica de uma wave" section: new Step 5 ("Orchestrator self-review (NÃO dispatch reviewer subagent)") inserted between worker-complete and PR-open. Old steps 5-7 renumbered to 6-8. New row in "Por que cada campo" table: "Reviewer = orquestrador atual".

### Why orchestrator-as-reviewer, not subagent reviewer?

The intuitive choice would be `Agent({subagent_type: "reviewer", model: "sonnet"})` after each wave completes. We deliberately **do not** recommend this for code review. Reasons:

1. **Same family blind spots:** workers are Sonnet, a Sonnet reviewer subagent shares the same blind spots — particularly around SDK shape drift (cf. lições L14/L17/L19 in agentes-internos), mock-vs-reality divergence, and convention-vs-implementation gaps that emerge from same-family pattern matching.
2. **Different capacity within family:** Opus orchestrator reviewing Sonnet workers gets the benefits of model heterogeneity (more nuanced analysis, longer-context reasoning) without leaving the Claude family.
3. **Context already loaded:** the orchestrator has the full plan, worker reports, T-file constraints, and wave history in context. Re-prompting a subagent costs tokens with no analytical gain.
4. **Pilot oversight:** self-review unfolds in real time in the Pilot's session. Pilot can interrupt and redirect. Subagent dispatch is opaquer.
5. **Adversarial persona prompting** (Simon Couch, Jan 2025) is documented to mitigate self-leniency when reviewing model output — the slash command bakes this in: "assume code is WRONG until proven otherwise."

For **research review** (an output the orchestrator did not author), the `research-critic` subagent pattern remains correct — that is the inverse case.

### Migration

No breaking changes. Existing projects on v2.0.x can adopt by:

```bash
npx xp-stack@2.1.0 add-skill code-review-automation
# Then invoke the skill in Claude Code to run the setup script:
# /xp-stack:code-review-automation (or just describe what you want — auto-trigger on PT-BR phrase)
```

The setup script is idempotent: detects existing `.github/PULL_REQUEST_TEMPLATE.md` (from `debugging-discipline` v2.0.0) and appends section only if header absent; same for hook entries.

---

## [2.0.1] — 2026-05-13

### Docs

- **`README.md`** reescrito pra refletir v2.0.0:
  - Versão atualizada de v1.0.0 (desatualizada) pra v2.0.0
  - Nova seção "O que mudou na v2.0.0" no topo
  - Workflow 2 (Agent View nativo) adicionado como padrão recomendado, com exemplo de `Agent` tool call (model=sonnet + isolation=worktree + caveman prefix)
  - Workflow 3 (debugging-discipline) adicionado pra projetos com alta `fix:` ratio
  - `local-waves` marcado `⚠️ LEGACY` na tabela de skills opt-in
  - Skills opt-in expandidas (debugging-discipline, claude-md-bootstrap)
  - Templates: 5 arquivos (TEMPLATE-orchestrator-prompt em vez de terminal-prompts)
  - Tabela de decisão de paralelização expandida pra 3 colunas (Agent View / local-waves / Paperclip)
  - Histórico de versões com v1.1-1.4 + v2.0.0 incluídos
  - Aviso sobre issue #35989 do claude-code recomendando npm sobre plugin marketplace

No code changes — patch release apenas pra atualizar README publicado no npm registry.

---

## [2.0.0] — 2026-05-13

> **Breaking release.** Parallelization pattern shifts from manual `TERMINAL-PROMPTS.md` (N terminals + copy-paste) to Claude Code **Agent View** native (single orchestrator dispatching N `Agent` tool calls). `local-waves` retained as legacy fallback. New opt-in skill `debugging-discipline` for projects with high `fix:` commit ratios.

### Added

- **`TEMPLATE-orchestrator-prompt.md`** in `docs-tasks-template/` — canonical pattern for Agent View dispatch. Documents:
  - `Agent` tool call signature (`model: "sonnet"`, `isolation: "worktree"`, prompt invoking `caveman:caveman`)
  - Coordination rules (no mid-flight rebases, PROGRESS.md updated by orchestrator on merge, pre-flight `bun run check`)
  - Fallback chain (`local-waves` → `paperclip-orchestrator` → legacy terminal-prompts)
- **`debugging-discipline`** opt-in skill (in `templates/opt-in-skills/`) — installs:
  - `.github/PULL_REQUEST_TEMPLATE.md` with mandatory sections for `fix:` PRs (Hypotheses ranked / Root cause / Regression test)
  - `.claude/hooks/pre-tool-use.sh` reminding `superpowers:systematic-debugging` invocation on every Edit/Write
  - `.claude/settings.json` hook registration via deep-merge
  - Aliases: `debugging`, `debug-discipline`, `fix-gates`
  - Rationale doc citing real diagnostic (48% fix-commit ratio with zero systematic-debugging evidence)
- **Agent View workflow section** added to `task-decomposition` skill — explicit step-by-step on how the orchestrator dispatches workers.

### Changed

- **`akita-xp-rules` Mandatory Skill Integration table:** `dispatching-parallel-agents` row rewritten — Agent View is now the execution path; `superpowers:dispatching-parallel-agents` remains useful as process reference for designing independent waves. Fallback note added (Research Preview, links to blog post).
- **`local-waves` skill marked `[LEGACY — pré-Agent View 2026-05-11]`** in description. Body keeps full functionality (still useful in headless/CI contexts). Trade-off table expanded to 3 columns to include Agent View as the recommended default for solo/pair interactive work.
- **`CLAUDE.md.template` line 62:** parallelism guidance updated to Agent View + `model="sonnet"` + `isolation="worktree"` + `caveman:caveman` prompt prefix.
- **`task-decomposition` `completo` doc level:** `TERMINAL-PROMPTS.md` demoted to legacy-only mention.
- **`TEMPLATE-overview.md` "How to execute" section:** removed "new terminal" copy-paste guidance, points to `TEMPLATE-orchestrator-prompt.md` instead. Wave table retained.

### Removed

- **`TEMPLATE-terminal-prompts.md`** removed from `docs-tasks-template/`. Replaced by `TEMPLATE-orchestrator-prompt.md`.

### Migration guide (1.x → 2.0.0)

For projects that already ran `xp-stack init` on `1.x`:

1. **Re-run `npx xp-stack@2.0.0 init`** in a worktree branch to inspect the new template diff before adopting.
2. **Delete** `docs/tasks/_template/TEMPLATE-terminal-prompts.md` and adopt `TEMPLATE-orchestrator-prompt.md` (copy from `node_modules/xp-stack/plugins/xp-stack/templates/docs-tasks-template/`).
3. **Update** `CLAUDE.md` "Mandatory skill integration" section — replace the `dispatching-parallel-agents` line with the Agent View dispatch pattern.
4. **Optional:** install `debugging-discipline` via `npx xp-stack add-skill debugging-discipline` if your project shows high `fix:` commit ratio (audit with `git log --oneline -50 | grep -c '^[a-f0-9]\+ fix:'` — >15 is a signal).
5. **For existing in-flight waves** that already have a `TERMINAL-PROMPTS.md`: finish them in legacy mode, no need to migrate mid-flight. New waves use the Agent View pattern.

### Backward compatibility

- `local-waves` and `paperclip-orchestrator` skills remain fully functional. Projects using them don't need to change anything.
- `superpowers:dispatching-parallel-agents` skill (external, in `superpowers` plugin) is still referenced as process guidance, even though execution moves to Agent tool / Agent View.
- `xp-stack:optimizing-github-actions` unchanged.
- `xp-stack:research-cycle` unchanged.
- `xp-stack:tdd-conventions` unchanged.

---

## [1.4.0] — 2026-05-04

- `init` prompts `doc_level` (essencial vs completo)
- New `config get/doc-level` command
- See git history for details

## [1.3.0] — 2026-05-04

- `add-skill` unified registry of opt-in skills
- New skill `claude-md-bootstrap`

## [1.2.0] — 2026-05-03

- Interactive engine prompts (replaces blind auto-detect)

## [1.1.0] — 2026-05-03

- `init` ships 5 core skills + 4 agents + CLAUDE.md + AGENTS.md symlink + docs templates + .claude/settings.json + .gitignore

## [1.0.x] — 2026-04 / early 2026-05

- Initial public release.
