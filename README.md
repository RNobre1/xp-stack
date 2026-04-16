# claude-craft

Marketplace Claude Code com o stack metodologico XP/Akita — TDD absoluto, pair programming, pesquisa formal com triangulacao, task decomposition rigorosa, conventional commits.

## Pre-requisitos

- Claude Code >= outubro 2025 (com suporte a plugins)

## Instalacao

```
/plugin marketplace add RNobre1/claude-craft
/plugin install xp-stack@claude-craft
```

## O que esta incluido

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
- Templates de task decomposition e pesquisa formal

### MCPs (opcionais)

Stubs para Supabase, Slack, Notion — configurados via `userConfig` ao habilitar o plugin. Preencha apenas os que seu projeto usa.

## Status

**V0.1.0** — skeleton com placeholders. Conteudo real dos skills e agents em desenvolvimento.

## Licenca

MIT — ver [LICENSE](LICENSE).
