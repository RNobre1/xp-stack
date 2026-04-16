# T2 — Skeleton completo do plugin xp-stack

**Status:** [ ]
**Dependencia:** T1 (manifests + CI devem existir)
**Estimativa:** M (~40min)

---

## Objetivo

Criar a arvore completa de diretorios e arquivos placeholder do plugin `xp-stack`, seguindo a estrutura da secao 10 da pesquisa. Cada skill tera SKILL.md com frontmatter valido e corpo minimo. Cada agent tera frontmatter valido. Templates serao placeholders. O objetivo NAO e escrever conteudo real — e garantir que a estrutura esta correta, validavel e pronta para receber conteudo nas tasks `extract-portable-skills` e `write-bootstrap-skill`.

---

## TDD: Testes primeiro

Criar `tests/skeleton_test.sh` (puro bash) com os seguintes cenarios:

### Cenarios de skills

1. **skills_dirs_exist** — Cada skill declarada na secao 10 tem diretorio em `plugins/xp-stack/skills/`: `akita-xp-rules`, `tdd-conventions`, `task-decomposition`, `research-cycle`, `bootstrap`.
2. **skills_have_skillmd** — Cada diretorio de skill contem `SKILL.md`.
3. **skillmd_has_frontmatter** — Cada `SKILL.md` comeca com `---` e tem campo `description` no frontmatter YAML.
4. **bootstrap_has_scaffold_sh** — `plugins/xp-stack/skills/bootstrap/scripts/scaffold.sh` existe e e executavel.

### Cenarios de agents

5. **agents_dir_exists** — `plugins/xp-stack/agents/` existe.
6. **agents_files_exist** — Contem `researcher.md`, `research-critic.md`, `tdd.md`, `reviewer.md`.
7. **agents_have_frontmatter** — Cada agent .md comeca com `---` e tem campos `name` e `description` no frontmatter YAML.

### Cenarios de templates

8. **templates_dir_exists** — `plugins/xp-stack/templates/` existe.
9. **templates_core_files** — Contem `CLAUDE.md.template`, `claude-settings-project.json`, `docs-tasks-template/`, `docs-pesquisas-template/`.

### Cenarios de MCP e meta-files

10. **mcp_json_valid** — `plugins/xp-stack/.mcp.json` e JSON valido.
11. **readme_exists** — `plugins/xp-stack/README.md` existe.
12. **license_exists** — `plugins/xp-stack/LICENSE` existe.

---

## Implementacao (apos RED)

### Skills (5 dirs, cada com SKILL.md placeholder)

Todas as skills terao frontmatter valido seguindo schema oficial [ref 5 da pesquisa]. Corpo minimo com `TODO: conteudo real vem de extract-portable-skills`.

Exemplo de placeholder SKILL.md:
```yaml
---
name: akita-xp-rules
description: Regras metodologicas universais do metodo Akita/XP — TDD absoluto, pair programming, conventional commits, YAGNI, planejamento estrito. Carregada automaticamente como contexto quando o usuario invoca /xp-stack:akita-xp-rules.
---

# Akita/XP Rules

TODO: conteudo real sera extraido do ~/.claude/CLAUDE.md global e memory portavel
do O Agente na task extract-portable-skills.
```

**`bootstrap/scripts/scaffold.sh`** — placeholder executavel que imprime mensagem e sai com 0. Conteudo real vem de `write-bootstrap-skill`. O placeholder deve:
- Aceitar `$1` como target dir (mesmo contrato do POC)
- Imprimir `[xp-stack:bootstrap] scaffold.sh placeholder — real implementation pending`
- Exit 0

### Agents (4 arquivos .md)

Frontmatter valido seguindo schema oficial de agents. Corpo placeholder.

Exemplo:
```yaml
---
name: researcher
description: Subagent de pesquisa formal com 7 etapas, triangulacao obrigatoria, citacao inline, e auto-review adversarial. Usado via skill /xp-stack:research-cycle.
model: sonnet
---

# Researcher Agent

TODO: conteudo real sera extraido de .claude/agents/researcher.md
do O Agente na task extract-portable-skills.
```

### Templates (4 arquivos/dirs)

- `CLAUDE.md.template` — skeleton com placeholders `{{PROJECT_NAME}}`, `{{PROJECT_DESCRIPTION}}`, `{{STACK}}`. Conteudo real vem de `write-bootstrap-skill`.
- `claude-settings-project.json` — JSON minimo com `permissions.allow` razoaveis.
- `docs-tasks-template/00-overview.md.template` — skeleton de 00-overview.
- `docs-pesquisas-template/pesquisa.md.template` — skeleton de pesquisa.

### `.mcp.json`

Stubs MCP com `userConfig` para Supabase, Slack, Notion (conforme secao 10 da pesquisa). Todos opcionais — receptor so preenche o que usa.

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "${user_config.SUPABASE_MCP_URL}",
      "description": "Supabase MCP — preencha SUPABASE_MCP_URL ao habilitar o plugin."
    }
  }
}
```

Nota: formato exato depende da docs de `.mcp.json` em plugins [ref 2]. Validar syntax, nao funcionalidade (funcionalidade e task `poc-mcp-userconfig`).

### README.md do plugin

Descricao curta, lista de skills/agents incluidos, instrucoes de instalacao, link pro marketplace.

### LICENSE

MIT license, copyright Meteora Digital 2026.

---

## Escopo de arquivos

### Cria
- `tests/skeleton_test.sh`
- `plugins/xp-stack/skills/akita-xp-rules/SKILL.md`
- `plugins/xp-stack/skills/tdd-conventions/SKILL.md`
- `plugins/xp-stack/skills/task-decomposition/SKILL.md`
- `plugins/xp-stack/skills/research-cycle/SKILL.md`
- `plugins/xp-stack/skills/bootstrap/SKILL.md`
- `plugins/xp-stack/skills/bootstrap/scripts/scaffold.sh`
- `plugins/xp-stack/agents/researcher.md`
- `plugins/xp-stack/agents/research-critic.md`
- `plugins/xp-stack/agents/tdd.md`
- `plugins/xp-stack/agents/reviewer.md`
- `plugins/xp-stack/templates/CLAUDE.md.template`
- `plugins/xp-stack/templates/claude-settings-project.json`
- `plugins/xp-stack/templates/docs-tasks-template/00-overview.md.template`
- `plugins/xp-stack/templates/docs-pesquisas-template/pesquisa.md.template`
- `plugins/xp-stack/.mcp.json`
- `plugins/xp-stack/README.md`
- `plugins/xp-stack/LICENSE`

### Nao toca
- `plugins/poc-bootstrap/` (nenhum arquivo)
- `tests/scaffold_test.sh`
- `tests/marketplace_test.sh` (criado em T1)
- `.claude-plugin/marketplace.json` (criado em T1)
- `plugins/xp-stack/.claude-plugin/plugin.json` (criado em T1)
- `.github/workflows/validate-plugins.yml` (criado em T1)
- Qualquer arquivo em `~/.claude/`

---

## Criterios de sucesso

- [ ] `bash tests/skeleton_test.sh` exit 0, 12/12 cenarios verdes
- [ ] `bash tests/marketplace_test.sh` continua 9/9 green (nao quebrou T1)
- [ ] Cada SKILL.md tem frontmatter YAML valido com `description`
- [ ] Cada agent .md tem frontmatter YAML valido com `name` e `description`
- [ ] `scaffold.sh` placeholder e executavel e aceita `$1`
- [ ] `.mcp.json` e JSON valido

## Criterios de falha

- Qualquer teste falha apos implementacao
- Testes de T1 regridem
- Alteracao em arquivo fora do escopo
- Conteudo real (nao-placeholder) em skills/agents/templates — isso e scope creep, pertence a `extract-portable-skills`

---

## Commits esperados

1. `test(skeleton): cenarios de validacao do skeleton xp-stack em RED`
2. `feat(skeleton): plugin xp-stack skeleton completo — N/N green`
