# T1 — RED: testes bash de novos cenarios

**Status:** [ ] Pendente
**Branch:** feat/v0.3.0-portable-orchestration
**Fase TDD:** RED

## Objetivo

Adicionar/criar testes bash que falham hoje, descrevendo o comportamento esperado das mudancas das Camadas A, B, C. Garante que T2, T3, T4 tem rede de seguranca.

## Arquivos que PODE tocar

- `tests/bootstrap_test.sh` (estender com cenarios 12-16)
- `tests/paperclip_test.sh` (criar)
- `tests/local_waves_test.sh` (criar)

## Arquivos PROIBIDOS

- Tudo em `plugins/xp-stack/skills/` — vai ser tocado em T2/T3/T4
- `tests/marketplace_test.sh`, `tests/skeleton_test.sh`, `tests/scaffold_test.sh` (regressao — nao mexer)

## Cenarios a adicionar/criar

### `bootstrap_test.sh` (extends — cenarios 12-16)

12. **scaffold cria AGENTS.md como symlink pra CLAUDE.md** quando ambos existem.
13. **scaffold cria AGENTS.local.md symlink** so se CLAUDE.local.md existe (no-op caso contrario).
14. **scaffold adiciona `local/`, `.claude/wave-runs/`, `scripts/orchestrate/` no .gitignore** se ainda nao estao.
15. **scaffold preserva .gitignore preexistente** — entries existentes nao mudam, append no final.
16. **scaffold com `--no-agents-symlink` (6o arg opcional)** nao cria os symlinks.

### `paperclip_test.sh` (novo, ~6 cenarios)

1. **SKILL.md descricao cabe em 1024 chars.**
2. **scripts/setup-paperclip.sh existe + executavel.**
3. **8 templates existem em `plugins/xp-stack/skills/paperclip-orchestrator/templates/`** (5 .md + auto-merge.yml + 2 .sh).
4. **setup-paperclip.sh em diretorio limpo cria** `local/paperclip/{playbook,AGENTS-dev-primary,AGENTS-reviewer,dispatch-cheatsheet,licoes}.md` + `.github/workflows/auto-merge.yml` + `scripts/check-{reviewer-approval,always-human}.sh`.
5. **Idempotencia** — 2 execucoes em mesmo dir, mtimes inalterados.
6. **Setup adiciona `local/` no .gitignore** se ainda nao tem.

### `local_waves_test.sh` (novo, ~5 cenarios)

1. **SKILL.md descricao cabe em 1024 chars.**
2. **scripts/setup-local-waves.sh existe + executavel.**
3. **orchestrate-wave.sh.template + README.md.template existem em templates/.**
4. **setup-local-waves.sh em diretorio limpo cria** `scripts/orchestrate/orchestrate-wave.sh` (executavel) + `scripts/orchestrate/README.md` + adiciona `.claude/wave-runs/` no .gitignore.
5. **Idempotencia.**

## Sequencia TDD

1. Editar `bootstrap_test.sh` adicionando os 5 cenarios novos no runner final.
2. Criar `paperclip_test.sh` com os 6 cenarios. Modelo: copiar header/runner do bootstrap_test.sh.
3. Criar `local_waves_test.sh` com os 5 cenarios.
4. Rodar todos: confirmar que falham com erros apropriados (paths nao existem, skills nao existem). NAO falhar por bug no test.
5. Commit: `test(v0.3.0): cenarios RED pra symlinks + paperclip-orchestrator + local-waves`

## Criterios de aceite

- [ ] `bash tests/bootstrap_test.sh` mostra `Results: 11 passed, 5 failed` (cenarios 12-16 falhando).
- [ ] `bash tests/paperclip_test.sh` mostra `Results: 0 passed, 6 failed` (skill ainda nao existe).
- [ ] `bash tests/local_waves_test.sh` mostra `Results: 0 passed, 5 failed`.
- [ ] Falhas sao "esperadas" (skill nao existe, template nao existe), nao bug do test.
- [ ] `marketplace_test.sh`, `skeleton_test.sh`, `scaffold_test.sh` continuam 100% verde (regressao zero).

## Verificacao final

`bash tests/marketplace_test.sh && bash tests/skeleton_test.sh && bash tests/scaffold_test.sh` -> 26/26 verde.
Os 3 novos: 11/22 falhas esperadas.
