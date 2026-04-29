# T6 — Release v0.3.0

**Status:** [ ] Pendente
**Branch:** feat/v0.3.0-portable-orchestration
**Fase:** Release
**Depende de:** T2, T3, T4, T5

## Objetivo

Empacotar v0.3.0 como release: bump version, ADR, atualizar CLAUDE.md do plugin, atualizar marketplace.json description, push branch + abrir PR pro `origin/main`.

## Arquivos que PODE tocar

- `plugins/xp-stack/.claude-plugin/plugin.json` (bump 0.3.0 + descricao atualizada)
- `.claude-plugin/marketplace.json` (descricao atualizada se mencionar skills)
- `CLAUDE.md` (raiz do claude-craft — adicionar ADR-008 + atualizar "Estado atual" + "Licoes aprendidas" se cabivel)
- `docs/tasks/v0.3.0-portable-orchestration/PROGRESS.md` (atualizar pra concluida)
- `docs/tasks/v0.3.0-portable-orchestration/00-overview.md` (marcar Status: CONCLUIDA on YYYY-MM-DD)

## Arquivos PROIBIDOS

- Skills (T2/T3/T4 ja foi)

## Implementacao

### plugin.json

```json
{
  "name": "xp-stack",
  "version": "0.3.0",
  "description": "Complete XP/Akita methodology stack for Claude Code. Absolute TDD, pair programming, formal research with triangulation, rigorous task decomposition, conventional commits. Includes agents (researcher, research-critic, tdd, reviewer), skills (bootstrap, akita-xp-rules, tdd-conventions, task-decomposition, research-cycle, optimizing-github-actions, paperclip-orchestrator, local-waves), project templates with AGENTS.md symlink convention.",
  ...
}
```

### marketplace.json

Adicionar tags se relevante: `["methodology", "tdd", "xp", "pair-programming", "bootstrap", "orchestration", "multi-agent"]`.

### CLAUDE.md (raiz claude-craft) — ADR-008

```markdown
### ADR-008: v0.3.0 — paperclip-orchestrator + local-waves + AGENTS.md symlinks

**Decisao:** v0.3.0 portar 3 capacidades validadas em producao no projeto upstream O Agente:
1. **paperclip-orchestrator skill** (opt-in, `disable-model-invocation: true`): copia templates AGENTS.md per-role + playbook + auto-merge.yml + check scripts pra projeto receptor.
2. **local-waves skill** (opt-in): alternativa local ao Paperclip via worktrees + claude -p headless.
3. **bootstrap atualizado**: cria symlinks AGENTS.md/AGENTS.local.md (default-ON, opt-out via flag) + autoupdate de .gitignore com 3 entries de orquestracao.
4. **akita-xp-rules ganha appendix** "Mandatory Skill Integration" com 5 skills do superpowers obrigatorias em momentos especificos do ciclo.

**Razao:** Origem: Wave 1 piloto de Paperclip no upstream (2026-04-27, 9 licoes documentadas). Padroes universais (multi-agent dispatch, gate auto-merge GitHub Actions, AGENTS.md ↔ CLAUDE.md sync) NAO dependem de stack — valem em qualquer projeto. Empacotar via plugin reduz custo de adocao (1 comando vs 1700+ linhas markdown copiadas a mao).

**Templates anonimizados:** referencias a stack-especifico (Vitest, Supabase, WhatsApp, etc.), nomes pessoais, IPs, IDs, PR numbers e tracker interno foram removidos. 9 licoes reais aparecem como case study em `references/licoes-do-piloto.md` (sem PR #s, sem IDs).

**Validacao:** test bash 11/16 + 6/6 + 5/5 (bootstrap + paperclip + local-waves) verde. Cenarios A/B/C empiricos shell-direct PASS. Camada runtime SKILL.md (AskUserQuestion + ${CLAUDE_SKILL_DIR}) fica pra primeiro uso real.

**Limite conhecido:** assim como v0.1.0 / v0.2.0, validacao da camada interativa fica pra primeiro teste de aceitacao em projeto real.

**Ref:** `docs/tasks/v0.3.0-portable-orchestration/` — 6 T-files com decomposicao completa. Origem upstream: `local/paperclip/` (5 arquivos), `scripts/orchestrate/orchestrate-wave.sh`, `.github/workflows/auto-merge.yml`, `scripts/check-{reviewer-approval,always-human}.sh`.
```

### CLAUDE.md (raiz claude-craft) — atualizar "Estado atual"

```markdown
- [x] v0.3.0 minor (feat/v0.3.0-portable-orchestration) — 2026-04-29 — 2 novas skills (paperclip-orchestrator, local-waves) + bootstrap ganha symlinks AGENTS.md + akita-xp-rules ganha appendix superpowers integration (ADR-008)
```

### CLAUDE.md (raiz claude-craft) — Licoes aprendidas (append)

Adicionar (se valor real for capturado durante T1-T5):

```markdown
- **Despersonalizacao de templates upstream eh trabalho real (2026-04-29):** ao trazer `local/paperclip/playbook.md` (~500 linhas, ~30 strings hardcoded) e `AGENTS-dev-primary.md` (~300 linhas) pro plugin, mais de 50% do tempo de T3 foi grep+substitute de refs ao stack upstream (Vitest, Supabase, WhatsApp, Cohere, etc.) e nomes (Felipe, Rafael, IPs). Padrao de revisao: `grep -rE "(meteora|o-agente|Felipe|Vitest|Supabase|WhatsApp|Cohere|Resend|AssemblyAI|Hotmart|209\\.97)" templates/` deve retornar 0 matches OU so em comentarios "// adapt for your stack: e.g. Vitest". Pra v0.4.0+, considerar lint script `tests/no-upstream-refs.sh` que falha CI se algum match.
```

### PROGRESS.md + 00-overview.md

Atualizar status pra `[x] Concluida 2026-04-29 (#PR -> hash)` (preencher PR e hash apos abrir PR).

## Sequencia

1. Bump plugin.json version 0.3.0.
2. Atualizar plugin.json description.
3. Atualizar marketplace.json description (se necessario).
4. Adicionar ADR-008 + atualizar Estado atual em CLAUDE.md (raiz claude-craft).
5. Adicionar licao aprendida em CLAUDE.md (raiz).
6. Atualizar PROGRESS.md + 00-overview.md.
7. Rodar suite completa: `for f in tests/*.sh; do bash $f; done` -> tudo verde.
8. `git status` review.
9. Commit final: `chore(release): v0.3.0 — paperclip-orchestrator + local-waves + AGENTS.md symlinks (ADR-008)`
10. `git push -u origin feat/v0.3.0-portable-orchestration`
11. `gh pr create --base main --title "..." --body "..."`
12. Atualizar PROGRESS com PR # final.
13. Postar URL pro Pilot.

## Criterios de aceite

- [ ] plugin.json version = 0.3.0.
- [ ] CLAUDE.md tem ADR-008 + Estado atual atualizado.
- [ ] Suite completa de tests bash: 11+5+6+9+12+5 = 48 verde, 0 vermelho.
- [ ] PR aberto pro `origin/main` com descricao completa.
- [ ] PROGRESS.md tem PR # final + commit hash.
