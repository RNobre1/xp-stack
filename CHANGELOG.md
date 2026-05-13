# Changelog

All notable changes to `xp-stack` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
