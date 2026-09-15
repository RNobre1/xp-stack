# xp-stack

Stack completo de metodologia XP/Akita para Claude Code, com contrato de
evidências de entrega e roteamento de agentes conforme a sessão/Host.

## O que inclui

### Skills

| Skill | Invocacao | Descricao |
|-------|-----------|-----------|
| akita-xp-rules | `/xp-stack:akita-xp-rules` | Regras metodologicas universais + contrato canônico de evidências, autorização, checkpoints e revisão |
| tdd-conventions | `/xp-stack:tdd-conventions` | Convencoes de TDD absoluto |
| task-decomposition | `/xp-stack:task-decomposition` | Guia do ciclo de tasks |
| research-cycle | `/xp-stack:research-cycle` | Guia do ciclo de pesquisa formal |
| optimizing-github-actions | auto via `paths: .github/workflows/**` | Pre-flight checklist + decision matrices pra otimizar workflows GitHub Actions (cache, sharding, security, observabilidade, anti-patterns supply-chain) |
| claude-md-bootstrap | `/xp-stack:claude-md-bootstrap` | Preenche CLAUDE.md a partir de evidências da codebase |
| bootstrap | `/xp-stack:bootstrap` | Scaffold de projeto novo |

Os padrões `paperclip-orchestrator` e `local-waves` são skills opt-in deste
plugin. Os lembretes `debugging-discipline` e `code-review-automation` vivem
em `templates/opt-in-skills/` para instalação explícita no projeto receptor;
eles não são defaults universais.

| Padrão opt-in | Uso |
|---|---|
| `paperclip-orchestrator` | Orquestração remota assíncrona com seus gates configurados |
| `local-waves` | Orquestração local headless em worktrees |
| `debugging-discipline` | Lembretes de evidência para investigação de `fix:` |
| `code-review-automation` | Lembretes de revisão e comando `/review-pr` |

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

**V0.6.0** — manifest do plugin com skills core e opt-in de orquestração, contrato de evidências de entrega e revisão orientada por política. O modelo, perfil, mecanismo de despacho e estilo de comunicação vêm da sessão/Host; Agent View, Sonnet e caveman são escolhas opt-in. A skill `bootstrap` é one-shot manual e as skills Paperclip/local-waves/code-review-automation/debugging-discipline permanecem opt-in.

Skills e agents carregam conteudo real curado — metodologia generica universal, sem acoplamento a stack especifico. Agents (researcher, research-critic, tdd, reviewer) leem o `CLAUDE.md` do projeto receptor em runtime para aplicar convencoes especificas do stack. Em T-files e briefings transferidos, use o nome portável `akita-xp-rules`, registre o caminho/URI resolvido e a revisão do contrato; workers sem skill loader recebem o trecho literal da fonte.

A skill `bootstrap` e **one-shot manual**: nao aparece no listing automatico de skills carregadas (comportamento por design via `disable-model-invocation: true`), so executa quando invocada explicitamente via `/xp-stack:bootstrap`. Isso evita que o modelo invoque bootstrap por engano em um projeto ja scaffoldado.

## Licenca

MIT
