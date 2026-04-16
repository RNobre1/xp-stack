# xp-stack

Stack completo de metodologia XP/Akita para Claude Code.

## O que inclui

### Skills

| Skill | Invocacao | Descricao |
|-------|-----------|-----------|
| akita-xp-rules | `/xp-stack:akita-xp-rules` | Regras metodologicas universais |
| tdd-conventions | `/xp-stack:tdd-conventions` | Convencoes de TDD absoluto |
| task-decomposition | `/xp-stack:task-decomposition` | Guia do ciclo de tasks |
| research-cycle | `/xp-stack:research-cycle` | Guia do ciclo de pesquisa formal |
| bootstrap | `/xp-stack:bootstrap` | Scaffold de projeto novo |

### Agents

| Agent | Descricao |
|-------|-----------|
| researcher | Pesquisa formal com 7 etapas e triangulacao |
| research-critic | Revisao adversarial independente |
| tdd | Ciclo RED-GREEN-REFACTOR estrito |
| reviewer | Code review com foco em qualidade e seguranca |

### Templates

- `CLAUDE.md.template` — skeleton para CLAUDE.md de projeto novo
- `claude-settings-project.json` — permissoes razoaveis para .claude/settings.json
- `docs-tasks-template/` — template de task decomposition
- `docs-pesquisas-template/` — template de pesquisa formal

### MCPs (opcionais)

Stubs para Supabase, Slack, Notion. Configurados via `userConfig` ao habilitar o plugin.

## Status

V0.1.0 — skeleton com placeholders. Conteudo real pendente (tasks `extract-portable-skills` e `write-bootstrap-skill`).

## Licenca

MIT
