# T1 — Templates reais + bootstrap_test.sh RED

> **Sessao:** unica (sequencial no terminal atual)
> **Branch:** `feat/write-bootstrap-skill`
> **Status:** `[ ] Planning` `[ ] In progress` `[ ] Tests passing` `[ ] Ready for review`

---

## Objetivo

Criar `tests/bootstrap_test.sh` com 10 cenarios (todos em RED inicialmente) e reescrever/criar os 8 arquivos de templates do plugin. Apos esta task, o cenario 1 (templates_exist) passa; cenarios 2-10 ainda falham (dependem do scaffold.sh, que e task T2).

---

## Contexto necessario

- **Feature maior:** [00-overview.md](00-overview.md)
- **Spec:** `/tmp/claude-craft-write-bootstrap.md` (conteudo integral dos templates em blocos ```markdown/json/bash)
- **Decisoes ja tomadas:** placeholders padronizados `{{PROJECT_NAME}}`/`{{PROJECT_STACK}}`/`{{PROJECT_DESCRIPTION}}`; renomear `00-overview.md.template` → `TEMPLATE-overview.md`; renomear `pesquisa.md.template` → `TEMPLATE-pesquisa.md`
- **CLAUDE.md sections:** ADR-002 (!command + CLAUDE_SKILL_DIR), ADR-003 (install-global-rules diferido)

---

## Files ALLOWED

```
tests/bootstrap_test.sh                                          (criar)
plugins/xp-stack/templates/CLAUDE.md.template                    (reescrever)
plugins/xp-stack/templates/claude-settings-project.json          (reescrever)
plugins/xp-stack/templates/docs-tasks-template/README.md         (criar)
plugins/xp-stack/templates/docs-tasks-template/TEMPLATE-overview.md       (criar)
plugins/xp-stack/templates/docs-tasks-template/TEMPLATE-progress.md       (criar)
plugins/xp-stack/templates/docs-tasks-template/TEMPLATE-task.md           (criar)
plugins/xp-stack/templates/docs-tasks-template/TEMPLATE-terminal-prompts.md (criar)
plugins/xp-stack/templates/docs-pesquisas-template/TEMPLATE-pesquisa.md    (criar)
plugins/xp-stack/templates/docs-tasks-template/00-overview.md.template  (DELETAR — substituido)
plugins/xp-stack/templates/docs-pesquisas-template/pesquisa.md.template (DELETAR — substituido)
```

## Files FORBIDDEN

```
plugins/poc-bootstrap/**
plugins/xp-stack/skills/**
plugins/xp-stack/agents/**
tests/{marketplace,skeleton,scaffold}_test.sh
```

---

## Ordem de execucao (TDD)

### Fase 1 — Tests first (RED)

- [ ] Criar `tests/bootstrap_test.sh` com 10 funcoes test_*, harness igual aos outros testes (PASS/FAIL counters, run_test, exit code 1 se falha)
- [ ] Rodar: `bash tests/bootstrap_test.sh` → esperar 10 FAIL (todos ruidosos: templates nao existem, scaffold nao aceita 5 args)
- [ ] `git commit -m "test(bootstrap): cenarios em RED 10/10"`

### Fase 2 — Templates (GREEN parcial)

- [ ] Reescrever `CLAUDE.md.template` conforme spec (usar `{{PROJECT_NAME}}`, `{{PROJECT_STACK}}`, `{{PROJECT_DESCRIPTION}}`)
- [ ] Reescrever `claude-settings-project.json` conforme spec (allow + deny)
- [ ] Criar `docs-tasks-template/README.md` conforme spec
- [ ] Criar `docs-tasks-template/TEMPLATE-overview.md` conforme spec
- [ ] Criar `docs-tasks-template/TEMPLATE-progress.md` conforme spec
- [ ] Criar `docs-tasks-template/TEMPLATE-task.md` conforme spec
- [ ] Criar `docs-tasks-template/TEMPLATE-terminal-prompts.md` conforme spec
- [ ] Criar `docs-pesquisas-template/TEMPLATE-pesquisa.md` conforme spec
- [ ] Remover `docs-tasks-template/00-overview.md.template` (substituido por 5 arquivos + README)
- [ ] Remover `docs-pesquisas-template/pesquisa.md.template` (substituido por TEMPLATE-pesquisa.md)
- [ ] Rodar: `bash tests/bootstrap_test.sh` → cenario 1 passa, 2-10 ainda falham (scaffold.sh nao existe ainda)
- [ ] Rodar: `bash tests/{marketplace,skeleton,scaffold}_test.sh` → 26/26 passam (regressao zero)
- [ ] `git commit -m "feat(templates): CLAUDE.md + docs-tasks + docs-pesquisas genericos"`

### Fase 4 — Verificacao

- [ ] `bash tests/bootstrap_test.sh` = 1 passa / 9 falham (esperado apos T1)
- [ ] `bash tests/marketplace_test.sh` = 9/9 (regressao zero)
- [ ] `bash tests/skeleton_test.sh` = 12/12 (regressao zero)
- [ ] `bash tests/scaffold_test.sh` = 5/5 (regressao zero, POC intocado)
- [ ] `git diff --stat main..HEAD` so toca arquivos listados em ALLOWED

---

## Criterios de aceitacao

- [ ] `tests/bootstrap_test.sh` existe, e executavel, tem 10 funcoes test_*
- [ ] Apos T1: cenario 1 (templates_exist) passa; cenarios 2-10 falham por razoes corretas (not found, not JSON, etc.)
- [ ] `CLAUDE.md.template` contem literalmente `{{PROJECT_NAME}}`, `{{PROJECT_STACK}}`, `{{PROJECT_DESCRIPTION}}`
- [ ] `claude-settings-project.json` tem `permissions.allow` (array nao vazio) e `permissions.deny` (array nao vazio), e JSON valido
- [ ] `docs-tasks-template/` tem 5 arquivos `.md` (README + 4 TEMPLATE-*.md)
- [ ] `docs-pesquisas-template/` tem `TEMPLATE-pesquisa.md` com frontmatter contendo `source_diversity`, `primary_source_ratio`, `citation_density`, `triangulation_coverage`
- [ ] Skeleton tests (12/12) continuam verdes — os checks por CLAUDE.md.template e claude-settings-project.json nao quebram

---

## Cenarios de teste obrigatorios (do spec)

```
1. test_templates_exist
   - CLAUDE.md.template existe + contem {{PROJECT_NAME}}, {{PROJECT_STACK}}, {{PROJECT_DESCRIPTION}}
   - claude-settings-project.json existe + e JSON valido
   - docs-tasks-template/README.md + 4 TEMPLATE-*.md existem
   - docs-pesquisas-template/TEMPLATE-pesquisa.md existe

2-9. Cenarios de scaffold.sh (dependem de T2 — so testes de existencia de templates passam em T1)

10. test_scaffold_missing_args_fails_cleanly
    - scaffold.sh sem args → exit != 0 + stderr contem "Usage" ou "Missing argument"
    - NOTA: o placeholder atual ja falha com "Usage: scaffold.sh <target_dir>" se chamado sem args, pode passar por acidente em T1
```

---

## Blockers — parar e alertar

- `skeleton_test.sh` quebrar apos renomear 00-overview.md.template / pesquisa.md.template (se checar paths especificos) — ler o teste antes, ajustar se necessario
- `AskUserQuestion` ferramenta nao disponivel no escopo do plugin (descobrir em T3, nao agora)

---

## Log de execucao

> Preenchido durante execucao.

- **Fase 1 (red):** {{testes escritos, hash commit}}
- **Fase 2 (green parcial):** {{templates criados, hash commit}}
- **Fase 4 (verificacao):** {{resultado de todos os testes}}

### Incidentes / desvios

{{preencher}}

---

## Notas para revisao

- **Trade-off:** optei por NAO manter os arquivos antigos (00-overview.md.template e pesquisa.md.template) como compatibilidade. Razao: nao ha consumidor externo ainda, plugin esta na v0.1.0, a spec explicita os nomes novos.
- **Renomeacao:** convention nova e `TEMPLATE-<role>.md` (prefix). A antiga era `<role>.md.template` (suffix). Spec usa prefix.
