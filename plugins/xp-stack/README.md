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

### MCPs

O plugin **nao declara MCPs por padrao**. Se o seu projeto usa MCPs especificos (Supabase, Slack, GitHub, etc.), configure-os separadamente via `claude mcp add` no proprio projeto ou globalmente. Isso mantem o plugin agnostico de servicos externos e evita warnings de credenciais faltando em projetos que nao usam esses servicos.

## Status

**V0.1.1** — funcional, validado empiricamente em projeto real em 2026-04-16 (self-test: 17 PASS / 5 WARN / 0 FAIL; v0.1.1 aplica fix dos 5 WARNs).

Skills e agents carregam conteudo real curado — metodologia generica universal, sem acoplamento a stack especifico. Agents (researcher, research-critic, tdd, reviewer) leem o `CLAUDE.md` do projeto receptor em runtime para aplicar convencoes especificas do stack.

A skill `bootstrap` e **one-shot manual**: nao aparece no listing automatico de skills carregadas (comportamento por design via `disable-model-invocation: true`), so executa quando invocada explicitamente via `/xp-stack:bootstrap`. Isso evita que o modelo invoque bootstrap por engano em um projeto ja scaffoldado.

## Licenca

MIT
