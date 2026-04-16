# write-bootstrap-skill — Overview

**Data:** 2026-04-15
**Status:** EM ANDAMENTO
**Objetivo:** Evoluir a skill `bootstrap` de placeholder pra implementacao real que coleta info via AskUserQuestion, detecta CLAUDE.md existente, e copia templates com cp -n (idempotente).

---

## Diagnostico

**Estado atual (pos extract-portable-skills):**
- `plugins/xp-stack/skills/bootstrap/SKILL.md` aponta pro POC ({{!`bash ${CLAUDE_SKILL_DIR}/scripts/scaffold.sh "$(pwd)"`}}), sem AskUserQuestion
- `scripts/scaffold.sh` e placeholder (1 arg, so echo + exit 0, nao cria nada)
- `templates/CLAUDE.md.template` minimalista (`{{PROJECT_NAME}}`, `{{PROJECT_DESCRIPTION}}`, `{{STACK}}` — note `STACK` nao `PROJECT_STACK`)
- `templates/docs-tasks-template/` tem so `00-overview.md.template` (esqueleto de 30 linhas)
- `templates/docs-pesquisas-template/pesquisa.md.template` tem esqueleto de 14 secoes sem conteudo
- `templates/claude-settings-project.json` tem so `allow` generico (git, npm, Read, Glob, Grep)
- Nenhum teste valida bootstrap alem do skeleton_test (so checa existencia)

**Estado alvo:**
- SKILL.md completa com fluxo de 4 steps (detect -> ask 3 questions -> ask CLAUDE.md action if exists -> bash scaffold.sh)
- scaffold.sh com 5 args, 4 modos CLAUDE.md (create/skip/backup/abort), substituicao sed de placeholders, cp -n em tudo
- CLAUDE.md.template rico (metodologia, TODOs do Pilot, ADRs, Do Not)
- docs-tasks-template com 5 files (README, TEMPLATE-overview, TEMPLATE-progress, TEMPLATE-task, TEMPLATE-terminal-prompts)
- docs-pesquisas-template/TEMPLATE-pesquisa.md com frontmatter de metricas + 13 secoes + version log
- claude-settings-project.json com allow + deny minimos (git status/diff/log/branch, ls, cat, pwd ; deny push --force, reset --hard, rm -rf /, sudo)
- `tests/bootstrap_test.sh` com 10 cenarios cobrindo templates existem + scaffold cria arquivos + idempotencia + 4 modos CLAUDE.md + falha limpa sem args

---

## Tasks (ordem de execucao)

| Task | Nome | Dependencia | Estimativa | Status |
|------|------|-------------|------------|--------|
| T1 | Templates reais + bootstrap_test.sh RED | Nenhuma | M (30min) | [ ] Pending |
| T2 | scaffold.sh evoluido (tests 2-10 GREEN) | T1 | M (40min) | [ ] Pending |
| T3 | SKILL.md + validacao empirica | T2 | M (30min) | [ ] Pending |

**Status syntax:** `[ ] Pending` → `[ ] In progress` → `[x] Completed YYYY-MM-DD (hash)`.

---

## Criterios de sucesso

- [ ] 10/10 cenarios de `bootstrap_test.sh` passam
- [ ] 9+12+5 = 26 testes preexistentes continuam passando (regressao zero)
- [ ] Validacao empirica: `claude --plugin-dir` carrega `xp-stack:bootstrap` (oculto por `disable-model-invocation`)
- [ ] Invocacao `/xp-stack:bootstrap` em dir vazio cria CLAUDE.md + docs/tasks/_template/ + docs/pesquisas/_template/ + .claude/settings.json
- [ ] 4 modos CLAUDE.md validados empiricamente: create (dir vazio), skip (preserva existente), backup (renomeia .bak + cria novo), abort (nao faz nada)
- [ ] 3 commits com conventional commits (1 por task)

## Criterios de falha

- Regressao em algum dos 26 testes preexistentes
- scaffold.sh sobrescreve arquivo existente silenciosamente (viola cp -n)
- Modo "abort" cria arquivos ou nao retorna exit 0
- SKILL.md nao usa AskUserQuestion batched em 1 chamada

---

## Escopo

**Arquivos ALLOWED:**
- `plugins/xp-stack/skills/bootstrap/SKILL.md`
- `plugins/xp-stack/skills/bootstrap/scripts/scaffold.sh`
- `plugins/xp-stack/templates/CLAUDE.md.template`
- `plugins/xp-stack/templates/claude-settings-project.json`
- `plugins/xp-stack/templates/docs-tasks-template/*` (substituir 00-overview.md.template por 5 TEMPLATE-*.md + README.md)
- `plugins/xp-stack/templates/docs-pesquisas-template/*` (substituir pesquisa.md.template por TEMPLATE-pesquisa.md)
- `tests/bootstrap_test.sh` (novo)
- `docs/tasks/write-bootstrap-skill/*` (este dir)
- `CLAUDE.md` do projeto (registrar ADR-005 ao final)

**Arquivos FORBIDDEN:**
- `plugins/poc-bootstrap/**` (registro historico intacto)
- `plugins/xp-stack/agents/*` (extract-portable-skills concluido)
- `plugins/xp-stack/skills/{akita-xp-rules,tdd-conventions,task-decomposition,research-cycle}/*`
- `tests/{marketplace,skeleton,scaffold}_test.sh` (regressao zero)
- `~/.claude/` global, `/home/rnobre/Área de trabalho/Meteora/o-agente/**`

---

## Decisoes ja tomadas (da spec)

- **Signature do scaffold.sh:** `scaffold.sh <target_dir> <project_name> <project_stack> <project_description> <claude_md_action>` (5 args obrigatorios)
- **4 modos de CLAUDE.md action:** `create` (usa sed pra substituir placeholders), `skip` (nao toca), `backup` (mv pra .bak e cria novo), `abort` (exit 0 sem fazer nada)
- **Substituicao de placeholders:** `sed -e "s|{{PROJECT_NAME}}|$PROJECT_NAME|g"` etc. (pipe `|` como delimitador evita conflito com paths que tem `/`)
- **Idempotencia:** loop manual com `cp` + `test -e` em vez de `cp -rn` (portabilidade entre BSD cp e GNU cp)
- **Placeholders padronizados:** `{{PROJECT_NAME}}`, `{{PROJECT_STACK}}` (nao `{{STACK}}`), `{{PROJECT_DESCRIPTION}}`
- **AskUserQuestion batched:** as 3 perguntas (nome, stack, descricao) em UMA chamada via `questions` array; pergunta de CLAUDE.md action e segunda chamada (so se ABSENT=false)
- **Arquivos de template renomeados:** `00-overview.md.template` → `TEMPLATE-overview.md` (prefixo em vez de sufixo). `pesquisa.md.template` → `TEMPLATE-pesquisa.md`.

---

## Como executar

**Terminal unico (sessao atual), ordem sequencial estrita:**

```
T1: bash tests/bootstrap_test.sh   # deve dar RED 10/10 apos criar arquivo de testes
    → criar 7 templates            # apos isso, teste 1 (templates_exist) passa
    → commit: test + feat(templates)

T2: reescrever scripts/scaffold.sh # apos isso, testes 2-10 passam
    → bash tests/bootstrap_test.sh # deve dar 10/10 GREEN
    → commit: feat(scaffold)

T3: reescrever SKILL.md            # conteudo novo com AskUserQuestion + bash call
    → validacao empirica           # claude --plugin-dir + /xp-stack:bootstrap em /tmp
    → documentar log empirico em T3
    → commit: feat(skill) + docs(ADR-005 no CLAUDE.md projeto)
```

Regressao preexistente checada antes de cada commit (26 testes + bootstrap_test).
