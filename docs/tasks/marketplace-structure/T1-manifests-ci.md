# T1 — Manifests (marketplace.json + plugin.json) + CI + testes de validacao

**Status:** [x] Concluida 2026-04-15 (d5771aa RED, 4eab597 GREEN)
**Dependencia:** Nenhuma
**Estimativa:** P (~40min)

---

## Objetivo

Criar os dois manifestos obrigatorios (marketplace.json e plugin.json) que transformam o repo num marketplace Claude Code funcional, com CI para validacao automatica e testes locais para TDD.

---

## TDD: Testes primeiro

Criar `tests/marketplace_test.sh` (puro bash, mesmo padrao do `scaffold_test.sh`) com os seguintes cenarios:

### Cenarios de marketplace.json

1. **json_syntax** — `.claude-plugin/marketplace.json` e JSON valido (parseable por `jq`).
2. **required_fields** — Contem campos obrigatorios: `name`, `owner.name`, `plugins` (array).
3. **plugin_entry_valid** — Cada entrada em `plugins[]` tem `name`, `description`, `source`.
4. **source_dir_exists** — Para cada plugin com source local (`./plugins/...`), o diretorio existe e contem `.claude-plugin/plugin.json`.
5. **no_duplicate_names** — Nenhum nome de plugin duplicado em `plugins[]`.

### Cenarios de plugin.json

6. **plugin_json_syntax** — `plugins/xp-stack/.claude-plugin/plugin.json` e JSON valido.
7. **plugin_required_fields** — Contem campos obrigatorios: `name`, `version`, `description`, `author.name`.
8. **plugin_name_matches** — O `name` em plugin.json bate com o nome declarado em marketplace.json.
9. **version_semver** — O campo `version` segue padrao SemVer basico (X.Y.Z).

### Runner

Mesmo padrao do `scaffold_test.sh`: PASS/FAIL counters, cleanup trap, exit 1 se qualquer falha.

---

## Implementacao (apos RED)

### `.claude-plugin/marketplace.json`

```json
{
  "name": "claude-craft",
  "description": "Marketplace do stack metodologico XP/Akita para Claude Code — TDD absoluto, pair programming, pesquisa formal, task decomposition, conventional commits.",
  "owner": {
    "name": "Meteora Digital",
    "email": "vinicius@meteoradigital.com.br"
  },
  "plugins": [
    {
      "name": "xp-stack",
      "description": "Stack completo de metodologia XP/Akita para Claude Code: agents (researcher, tdd, reviewer), skills (bootstrap, research-cycle, task-decomposition), templates de projeto, e stubs MCP.",
      "source": "./plugins/xp-stack",
      "category": "developer-tools",
      "tags": ["methodology", "tdd", "xp", "pair-programming", "bootstrap"]
    }
  ]
}
```

### `plugins/xp-stack/.claude-plugin/plugin.json`

```json
{
  "name": "xp-stack",
  "version": "0.1.0",
  "description": "Stack completo de metodologia XP/Akita para Claude Code. TDD absoluto, pair programming, pesquisa formal com triangulacao, task decomposition rigorosa, conventional commits. Inclui agents (researcher, research-critic, tdd, reviewer), skills (bootstrap, akita-xp-rules, tdd-conventions, task-decomposition, research-cycle), templates de projeto, e stubs MCP opcionais.",
  "author": {
    "name": "Meteora Digital",
    "email": "vinicius@meteoradigital.com.br"
  },
  "repository": "https://github.com/RNobre1/claude-craft",
  "license": "MIT"
}
```

### `.github/workflows/validate-plugins.yml`

CI workflow com 3 jobs:

1. **validate-marketplace** — Valida JSON syntax de marketplace.json, campos obrigatorios, sem duplicatas, sort order.
2. **validate-plugins** — Para cada plugin local, valida plugin.json syntax e campos obrigatorios.
3. **validate-frontmatter** — Valida YAML frontmatter de arquivos em `skills/*/SKILL.md`, `agents/*.md`, `commands/*.md`.

Triggers: push para `main` e `feat/*`, PRs para `main`.

Runner: `ubuntu-latest`, `jq` para JSON parsing, `yq` ou grep para YAML frontmatter.

Nota: o workflow pode referenciar os mesmos testes de `tests/marketplace_test.sh` para DRY, ou reimplementar validacoes com `jq` inline. Decisao pragmatica na implementacao — comecar com inline `jq`, refatorar se ficar grande.

---

## Escopo de arquivos

### Cria
- `tests/marketplace_test.sh`
- `.claude-plugin/marketplace.json`
- `plugins/xp-stack/.claude-plugin/plugin.json`
- `.github/workflows/validate-plugins.yml`

### Nao toca
- `plugins/poc-bootstrap/` (nenhum arquivo)
- `tests/scaffold_test.sh`
- `docs/tasks/poc-bootstrap/`
- `.gitignore`
- Qualquer arquivo em `~/.claude/`

---

## Criterios de sucesso

- [ ] `bash tests/marketplace_test.sh` exit 0, 9/9 cenarios verdes
- [ ] `jq . .claude-plugin/marketplace.json` sem erro
- [ ] `jq . plugins/xp-stack/.claude-plugin/plugin.json` sem erro
- [ ] `.github/workflows/validate-plugins.yml` e YAML valido

## Criterios de falha

- Qualquer teste falha apos implementacao
- marketplace.json lista `poc-bootstrap`
- Alteracao em qualquer arquivo fora do escopo

---

## Commits esperados

1. `test(marketplace): cenarios de validacao marketplace.json + plugin.json em RED`
2. `feat(marketplace): marketplace.json + plugin.json + CI — N/N green`
