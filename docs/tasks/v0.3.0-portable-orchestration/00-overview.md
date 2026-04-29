# v0.3.0 — Portable Orchestration

**Branch:** `feat/v0.3.0-portable-orchestration`
**Status:** em execucao
**Iniciado:** 2026-04-29
**Origem:** sync upstream do projeto O Agente (Meteora Digital), 3o uso do fluxo de sync (apos v0.1.1 e v0.2.0).

## Diagnostico

Apos v0.2.0 (`optimizing-github-actions` skill), o projeto O Agente validou empiricamente em producao:

1. **Paperclip orchestrator pattern** — Wave 1 piloto (3 dev-primary Sonnet 4.6 paralelos + 1 reviewer Opus 4.7 via cron Routine, gate auto-merge GitHub Actions, ~$21 USD-equivalent subscription_included). 9 licoes registradas em `local/paperclip/licoes.md` cobrindo auto-merge.yml strict YAML parser, gh CLI v2.x schema changes, GitHub Actions workflow snapshot caching, plugin Claude Code 4-element activation, label re-add post-comment trigger, fast-lane vs full CI scope mismatch, gestao-ti integration manual.

2. **`scripts/orchestrate/orchestrate-wave.sh`** — alternativa local pra waves: orquestrador Opus 4.7 + N workers Sonnet headless (`claude -p`) em git worktrees isolados, com BLOCKERS.md discipline. Custo ~$30-45/wave de 3 tasks. Trade-off vs Paperclip: local = sync + sem droplet + worktrees; Paperclip = async + persistencia + cron + multi-projeto.

3. **AGENTS.md ↔ CLAUDE.md symlink convention** — Antigravity/Codex/Cursor leem `AGENTS.md` por convencao; Claude Code le `CLAUDE.md`. Symlink garante que toda edicao em CLAUDE.md propaga instantaneamente, impossivel um ficar stale.

Esses 3 itens sao **universais** (nao dependem de stack TypeScript / Supabase / WhatsApp / etc.) e merecem virar capacidades do plugin xp-stack pra qualquer projeto novo conseguir adotar via `/plugin install`.

## Escopo

### Camada A — atualiza skills existentes (auto-aplicada via bootstrap)
- `bootstrap` SKILL.md + `scripts/scaffold.sh`: criar symlinks `AGENTS.md → CLAUDE.md` e `AGENTS.local.md → CLAUDE.local.md` (idempotente, opt-out via flag); adicionar entries no `.gitignore` (idempotente, sem sobrescrever).
- `akita-xp-rules` SKILL.md: appendix "Mandatory Skill Integration" listando 5 skills do superpowers como obrigatorias em momentos especificos do ciclo Akita/XP.
- `templates/CLAUDE.md.template`: secao placeholder "Mandatory Skill Integration" + "Archival Policy" + nota sobre AGENTS.md symlink.
- `task-decomposition` SKILL.md: ja tem secao "Archival Policy" desde v0.1.x (verificado).

### Camada B — nova skill `paperclip-orchestrator` (opt-in via comando)
- `disable-model-invocation: true` (igual ao bootstrap), invocada explicitamente via `/xp-stack:paperclip-setup`.
- Templates copiados pra `local/paperclip/` do repo receptor (gitignored):
  - `AGENTS-dev-primary.md.template`
  - `AGENTS-reviewer.md.template`
  - `playbook.md.template`
  - `dispatch-cheatsheet.md.template`
  - `licoes.md.template` (formato vazio)
- Arquivos copiados pro repo:
  - `.github/workflows/auto-merge.yml` (versao pos-fixes)
  - `scripts/check-reviewer-approval.sh`
  - `scripts/check-always-human.sh`
- `references/licoes-do-piloto.md`: 9 licoes anonimizadas como case study (sem PR #s, sem IDs Paperclip).
- Decision tree: quando usar Paperclip vs local-waves.

### Camada C — nova skill `local-waves` (opt-in via comando)
- `disable-model-invocation: true`, invocada via `/xp-stack:local-waves-setup`.
- Copia adaptada de `orchestrate-wave.sh` (paths despersonalizados).
- README descrevendo modelo mental (orquestrador Opus + workers Sonnet em worktrees).

## Tabela de tasks

| Task | Subject | Status |
|------|---------|--------|
| T1 | RED — testes bash de novos cenarios (bootstrap symlinks/.gitignore, paperclip, local-waves) | [ ] Pendente |
| T2 | GREEN Camada A — bootstrap + akita-xp-rules + CLAUDE.md.template | [ ] Pendente |
| T3 | GREEN Camada B — skill paperclip-orchestrator + 8 templates + setup script + licoes-do-piloto.md | [ ] Pendente |
| T4 | GREEN Camada C — skill local-waves + setup script + orchestrate-wave.sh.template | [ ] Pendente |
| T5 | Validacao empirica — 3 setups isolados em /tmp/v030-{a,b,c} | [ ] Pendente |
| T6 | Release — ADR-008 + bump 0.3.0 + atualiza CLAUDE.md + PR | [ ] Pendente |

Sequencial estrito: T1 → T2 → T3 → T4 → T5 → T6. Sem paralelismo (todas tocam estrutura compartilhada do plugin).

## Como executar

Sessao unica, single agent (Opus 4.7 local). Sem worktrees. Cada T-file: TDD red→green→verify, 1 commit por fase.

## Decisoes pre-tomadas

1. **Templates do Paperclip — formato vazio + 9 licoes em `references/`.** Razao: licoes reais tem contexto Meteora (PR #s, IDs Paperclip, refs feature `tech-debt-q1`). Valor pedagogico vai num case study anonimizado separado.
2. **Symlinks AGENTS.md sao default-ON.** Razao: 99% dos projetos novos nao tem AGENTS.md preexistente; symlink eh cheap. Opt-out via flag `--no-agents-symlink` no scaffold.sh.
3. **`.gitignore` autoupdate** — idempotente. Adiciona linhas `local/`, `.claude/wave-runs/`, `scripts/orchestrate/` so se nao estiverem ja. Pra nao surpresar quem ja tem um `.gitignore` proprio.
4. **Paperclip e local-waves sao skills separadas, NAO uma so com subcomandos.** Razao: sao fluxos diferentes (remoto async vs local sync), invocacao explicita via comando dedicado eh mais clara.
5. **Setup scripts rodam em `$(pwd)`.** Mesmo padrao do bootstrap — nunca tocam `~/.claude/` global.

## Lessons brought forward (origem upstream)

Anonimizadas pra `references/licoes-do-piloto.md`:

1. auto-merge.yml — GitHub Actions YAML parser strict (||  em concurrency, env intermediarias, etc.).
2. dev-primary que codou+pushou mas nao abriu PR (auto-loop + assigneeAgentId issue).
3. `gh pr list --base "feat/*"` glob nao funciona — filtro client-side com jq.
4. Caveman plugin precisa marketplace + known_marketplaces.json (alem do cache).
5. Workflow snapshot caching no GitHub Actions.
6. Plugin Claude Code 4-element activation requirement (cache + marketplace + 2 registries + settings.json enabledPlugins).
7. Reviewer agent nao re-aplicou label `auto-merge` apos APPROVE comment (instrucao tecnica nao seguida).
8. Fast-lane CI subset perde bugs em mocks indiretos (Account.test.tsx mocka GuidedTour, breakage indireto).
9. Sync manual com tracker externo (gestao-ti) post-merge.
