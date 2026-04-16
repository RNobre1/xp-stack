# T2 — scaffold.sh evoluido (tests 2-10 GREEN)

> **Sessao:** unica (sequencial apos T1)
> **Branch:** `feat/write-bootstrap-skill`
> **Status:** `[ ] Planning` `[ ] In progress` `[ ] Tests passing` `[ ] Ready for review`

---

## Objetivo

Reescrever `plugins/xp-stack/skills/bootstrap/scripts/scaffold.sh` com signature de 5 args, 4 modos de CLAUDE.md action (create/skip/backup/abort), substituicao sed de placeholders, copia com cp + teste de existencia (idempotencia). Apos esta task, 10/10 cenarios de `bootstrap_test.sh` passam.

---

## Contexto necessario

- **Feature maior:** [00-overview.md](00-overview.md)
- **Task anterior:** [T1-templates.md](T1-templates.md) (templates criados, 9/10 ainda falhando)
- **Spec:** `/tmp/claude-craft-write-bootstrap.md`, bloco `## FILE: plugins/xp-stack/skills/bootstrap/scripts/scaffold.sh`
- **POC de referencia:** `plugins/poc-bootstrap/skills/scaffold/scripts/scaffold.sh` — padroes validados (cp -n, set -euo pipefail, exit codes)

---

## Files ALLOWED

```
plugins/xp-stack/skills/bootstrap/scripts/scaffold.sh            (reescrever)
```

## Files FORBIDDEN

```
plugins/poc-bootstrap/**                                         (historico intocavel)
plugins/xp-stack/skills/bootstrap/SKILL.md                       (e T3)
tests/**                                                         (ja criados em T1)
plugins/xp-stack/templates/**                                    (ja criados em T1)
```

---

## Ordem de execucao (TDD)

### Fase 1 — Tests first (RED, herdado de T1)

- [ ] `bash tests/bootstrap_test.sh` → 1 passa / 9 falham (estado apos T1)
- [ ] Nao escrever novos testes aqui — escopo e so implementacao

### Fase 2 — Implementation (GREEN)

- [ ] Reescrever `scripts/scaffold.sh` conforme spec:
  - Shebang `#!/usr/bin/env bash`, `set -euo pipefail`
  - Validacao: `if [ $# -lt 5 ]` → exit 1 com Usage em stderr
  - Args: `TARGET_DIR`, `PROJECT_NAME`, `PROJECT_STACK`, `PROJECT_DESCRIPTION`, `CLAUDE_MD_ACTION`
  - Derivar `SCRIPT_DIR` via `$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)`, `PLUGIN_ROOT="$SCRIPT_DIR/../../.."`, `TEMPLATES_DIR="$PLUGIN_ROOT/templates"`
  - Early return para `abort` (echo + exit 0)
  - `mkdir -p "$TARGET_DIR"` se nao existe
  - Case `$CLAUDE_MD_ACTION`:
    - `create`: se CLAUDE.md existe, skip (echo); senao sed + redirect pra CLAUDE.md
    - `skip`: echo "Skipped"
    - `backup`: `mv CLAUDE.md CLAUDE.md.bak` + sed + redirect pra CLAUDE.md (sempre cria novo)
    - `*`: exit 3 com erro
  - Copia recursiva portavel: `for f in "$SRC"/*; do test -e "$DST/$(basename $f)" || cp "$f" "$DST/$(basename $f)"; done`
  - Aplicar a `docs-tasks-template/` → `$TARGET_DIR/docs/tasks/_template/`
  - Aplicar a `docs-pesquisas-template/` → `$TARGET_DIR/docs/pesquisas/_template/`
  - `.claude/settings.json`: `mkdir -p "$TARGET_DIR/.claude"`, `test -e ... || cp`
  - Echo final "Bootstrap complete. Target: $TARGET_DIR"
- [ ] `chmod +x plugins/xp-stack/skills/bootstrap/scripts/scaffold.sh` (ja deveria estar por herdar do placeholder, verificar)
- [ ] Rodar: `bash tests/bootstrap_test.sh` → 10/10 verde
- [ ] `git commit -m "feat(scaffold): 5 args + 4 modos CLAUDE.md + cp -n"`

### Fase 3 — Refactoring (opcional)

- [ ] Avaliar extrair funcao `copy_templates_dir()` se duplicacao for real — so fazer se testes continuam passando
- [ ] Nao forcar commit vazio

### Fase 4 — Verificacao

- [ ] `bash tests/bootstrap_test.sh` = 10/10
- [ ] `bash tests/marketplace_test.sh` = 9/9
- [ ] `bash tests/skeleton_test.sh` = 12/12 (inclui check de scaffold.sh executavel)
- [ ] `bash tests/scaffold_test.sh` = 5/5 (POC intocado)
- [ ] `git diff --stat main..HEAD` — scaffold.sh tocado, nada mais

---

## Criterios de aceitacao

- [ ] scaffold.sh aceita 5 args, valida arity, printa Usage em stderr se faltar
- [ ] Sem args → exit != 0, stderr menciona "Usage"
- [ ] `abort` → exit 0, nao cria nada (nem mkdir)
- [ ] `create` em dir vazio → cria CLAUDE.md, docs/tasks/_template/, docs/pesquisas/_template/, .claude/settings.json
- [ ] `create` em dir com CLAUDE.md → preserva (nao sobrescreve, apenas skip dele; outros templates so criam se nao existem)
- [ ] `skip` com CLAUDE.md existente → preserva CLAUDE.md, outros templates sao copiados se nao existem
- [ ] `backup` com CLAUDE.md existente → move pra CLAUDE.md.bak, cria novo
- [ ] `backup` sem CLAUDE.md existente → so cria (sem .bak)
- [ ] Idempotencia: rodar 2x → mtime dos arquivos criados na 1a run nao muda
- [ ] Substituicao sed: `{{PROJECT_NAME}}` nao aparece literal em CLAUDE.md final (foi substituido por valor real)

---

## Cenarios de teste cobertos (herdados de T1)

```
2. test_scaffold_creates_claude_md_with_substitution
3. test_scaffold_copies_tasks_template
4. test_scaffold_copies_pesquisas_template
5. test_scaffold_creates_claude_settings
6. test_scaffold_idempotent
7. test_scaffold_skip_preserves_claude_md
8. test_scaffold_backup_renames_and_creates
9. test_scaffold_abort_does_nothing
10. test_scaffold_missing_args_fails_cleanly (ja passava parcialmente em T1)
```

---

## Blockers — parar e alertar

- Teste de substituicao sed falhar porque `{{PROJECT_STACK}}` tem char especial no valor de input — escolher valores de teste sem `|` ou `$`
- `cp -rn` nao-portavel se alguem mudar pra BSD — por isso loop manual com `test -e`
- scaffold.sh perder permissao de executavel → ajustar no final com chmod

---

## Log de execucao

> Preenchido durante execucao.

- **Fase 2 (green):** {{hash commit, resultado bash tests}}
- **Fase 3 (refactor):** {{aplicou-se? o que mudou}}
- **Fase 4 (verificacao):** {{todos os 4 suites rodados}}

### Incidentes / desvios

{{preencher}}

---

## Notas para revisao

- **Trade-off:** loop manual `for f in ...` + `test -e` em vez de `cp -rn`. Razao: `cp -n` existe em GNU cp mas comportamento de `cp -rn` difere em BSD (macOS). Loop garante portabilidade sem sacrificar idempotencia.
- **Sed com pipe:** `sed "s|...|...|g"` em vez de `sed "s/../../g"` evita escape de `/` em paths caso o stack contenha algo como `Node.js/Express`.
- **Exit codes:** 0 (sucesso ou abort graceful), 1 (args insuficientes), 2 (templates dir nao encontrado), 3 (claude_md_action invalido).
