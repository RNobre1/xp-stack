# claude-craft

Marketplace Claude Code com o stack metodológico **XP/Akita** — TDD absoluto, pair programming, pesquisa formal triangulada, task decomposition rigorosa, conventional commits, e (v0.3.0) orquestração multi-agent opt-in.

> **Versão atual: v0.3.0** (2026-04-29). Status: estável, pronto pra adoção em qualquer stack (TypeScript, Python, Go, bash, etc.).

---

## Pré-requisitos

- Claude Code com suporte a plugins (>= outubro 2025).

## Instalação

Dois comandos. Depois invoque o `bootstrap` na raiz do seu projeto:

```
/plugin marketplace add RNobre1/claude-craft
/plugin install xp-stack@claude-craft
/xp-stack:bootstrap
```

O bootstrap pergunta o nome / stack / descrição do projeto, cria `CLAUDE.md` (com placeholders prontos pra você preencher), `docs/tasks/_template/`, `docs/pesquisas/_template/`, `.claude/settings.json`, um symlink `AGENTS.md → CLAUDE.md` (pra Antigravity / Codex / Cursor lerem o mesmo arquivo), e adiciona 3 entries reservadas no `.gitignore`. Nunca sobrescreve nada que já exista.

## Atualizando

```
/plugin marketplace update RNobre1/claude-craft
/plugin install xp-stack@claude-craft
```

---

## O que está incluído

### Skills regulares (auto-disponíveis após install)

| Skill | Invocação | Para que serve |
|-------|-----------|----------------|
| `akita-xp-rules` | `/xp-stack:akita-xp-rules` | 6 regras metodológicas universais (sem alucinação arquitetural, TDD absoluto, AI jail, código detachment, ciclo em fases, conventional commits) + appendix com tabela de 5 skills do superpowers obrigatórias em momentos específicos do ciclo |
| `tdd-conventions` | `/xp-stack:tdd-conventions` | Pirâmide de testes (unit, integration, E2E, contract, regression, performance, security) + workflow RED → GREEN → REFACTOR |
| `task-decomposition` | `/xp-stack:task-decomposition` | Decomposição de features em `docs/tasks/{feature}/` com `00-overview.md` + `PROGRESS.md` + `T{N}-{slug}.md` por task. Inclui política de arquivamento (NUNCA apagar — `_archive/`) |
| `research-cycle` | `/xp-stack:research-cycle` | Ciclo de pesquisa formal com triangulação, fontes citadas, revisão adversarial. Saída em `docs/pesquisas/{slug}.md` |
| `optimizing-github-actions` | auto via `paths: .github/workflows/**` | 10-item pre-flight checklist (SHA pinning, OIDC, pull_request_target, concurrency, trigger eficiente, artifact v4, sharding+coverage, bash hardening, gate calibrado, persist-credentials) + audit script |

### Skills opt-in (invocadas explicitamente)

| Skill | Comando | Para que serve |
|-------|---------|----------------|
| `bootstrap` | `/xp-stack:bootstrap` | Scaffolding de projeto novo (rodado uma vez) |
| `paperclip-orchestrator` | `/xp-stack:paperclip-setup` | Setup do pattern multi-agent **remoto async** (droplet + Postgres + cron + GitHub auto-merge gate). 8 templates anonimizados + 9 lições reais como referência. **Opt-in.** |
| `local-waves` | `/xp-stack:local-waves-setup` | Setup do orquestrador **local sync** — N workers Sonnet headless em git worktrees. Sem infra. **Opt-in.** |

### Agents

| Agent | Para que serve |
|-------|----------------|
| `researcher` | Pesquisa formal em 7 fases com triangulação |
| `research-critic` | Revisão adversarial independente do output do researcher |
| `tdd` | Ciclo RED-GREEN-REFACTOR estrito |
| `reviewer` | Code review com foco em correctness, security, conventions, test coverage |

### Templates

- `CLAUDE.md.template` — skeleton para CLAUDE.md de projeto novo, com nota sobre symlink AGENTS.md + seções pré-prontas pra "Mandatory skill integration", "Optional multi-agent dispatch", "Archival policy".
- `claude-settings-project.json` — permissões razoáveis pra `.claude/settings.json`.
- `docs-tasks-template/` (4 arquivos: README, TEMPLATE-overview, TEMPLATE-progress, TEMPLATE-task, TEMPLATE-terminal-prompts).
- `docs-pesquisas-template/TEMPLATE-pesquisa.md`.

---

## Workflows típicos

### 1. Projeto novo, sem orquestração

Cobre 80% dos casos. É o que o bootstrap entrega de cara.

```bash
cd meu-projeto-novo
# (no Claude Code:)
/plugin marketplace add RNobre1/claude-craft
/plugin install xp-stack@claude-craft
/xp-stack:bootstrap

# Você ganha CLAUDE.md, AGENTS.md (symlink), .claude/settings.json,
# docs/tasks/_template/, docs/pesquisas/_template/, .gitignore atualizado.
# Edite CLAUDE.md preenchendo a stack do seu projeto.

# Daí em diante:
# - features não-triviais → /xp-stack:task-decomposition (instrui como)
# - decisões arquiteturais → /xp-stack:research-cycle
# - bug → invoque superpowers:systematic-debugging antes de propor fix
# - PR pronto → invoque superpowers:verification-before-completion
# - workflow CI → optimizing-github-actions auto-roda
```

### 2. Você + co-pilot async, ou multi-projeto, ou quer review queue 24/7

Use Paperclip orchestrator (remoto, droplet, async).

```bash
# (após bootstrap acima)
/xp-stack:paperclip-setup

# Você ganha:
# - local/paperclip/{playbook,AGENTS-dev-primary,AGENTS-reviewer,dispatch-cheatsheet,licoes}.md
# - .github/workflows/auto-merge.yml (gate B com 4 checks)
# - scripts/check-{reviewer-approval,always-human}.sh

# LEIA references/licoes-do-piloto.md (na skill) ANTES da Wave 1 — 9 lições
# anonimizadas que economizam dias de tropeços conhecidos.

# LEIA local/paperclip/playbook.md pra provisionar o droplet + criar agentes
# via API (este passo não é automatizado pela skill — você controla credenciais).
```

### 3. Você é solo, quer execução isolada por task sem infra

Use local-waves (worktrees + claude -p headless).

```bash
# (após bootstrap acima)
/xp-stack:local-waves-setup

# Você ganha:
# - scripts/orchestrate/orchestrate-wave.sh (executável)
# - scripts/orchestrate/README.md (modelo mental + ciclo de uso)

# Pra cada feature, decomponha em docs/tasks/{feature}/ com TERMINAL-PROMPTS.md
# (template já vem do bootstrap). Daí:

bash scripts/orchestrate/orchestrate-wave.sh run docs/tasks/{feature}/
# script bloqueia até N workers terminarem em paralelo + imprime summary
```

### 4. Quer ambos

Sim, você pode. `local/paperclip/` e `scripts/orchestrate/` não conflitam — alterne caso a caso.

---

## Decisão Paperclip vs local-waves

| Critério | local-waves | Paperclip |
|---|---|---|
| Modelo | Local sync, blocks until done | Remote async, droplet-hosted |
| Latência | Minutos | Horas-dias (heartbeat cycle) |
| Persistência entre sessões | Não | Sim (Postgres) |
| Multi-developer / multi-projeto | Não | Sim |
| Infra adicional | Nada | VPS (~$10/mês) |
| Quando escolher | Solo, isolated execution sem infra | Async dev/review, ou >1 projeto rodando paralelo |

---

## Convenção AGENTS.md ↔ CLAUDE.md

Antigravity, Codex e Cursor leem `AGENTS.md` por convenção. Claude Code lê `CLAUDE.md`. O bootstrap cria um **symlink relativo** `AGENTS.md → CLAUDE.md` (e `AGENTS.local.md → CLAUDE.local.md` se você tiver o `.local`). Como são o mesmo arquivo no disco, **drift entre os dois é impossível** — toda edição em `CLAUDE.md` propaga instantaneamente.

Não edite `AGENTS.md` diretamente. Não quebre o symlink. Pra desabilitar (caso seu projeto tenha um `AGENTS.md` próprio que conflita), passe `"no-symlink"` como 6º argumento ao `scaffold.sh`.

---

## .gitignore reservado

O bootstrap adiciona 3 entries no `.gitignore` do seu projeto (idempotente, sem sobrescrever):

```
# xp-stack reserved paths (paperclip-orchestrator + local-waves)
local/
.claude/wave-runs/
scripts/orchestrate/
```

Mesmo se você não usar Paperclip ou local-waves agora, essas pastas ficam reservadas — caso um agente futuro escreva lá por engano (ou você ative depois), nada vaza pra git.

---

## Testes do plugin

```bash
bash tests/marketplace_test.sh   # 9 cenarios — manifests + ci
bash tests/skeleton_test.sh      # 12 cenarios — estrutura xp-stack
bash tests/scaffold_test.sh      # 5 cenarios — POC bootstrap
bash tests/bootstrap_test.sh     # 16 cenarios — scaffold real (templates, modos CLAUDE.md, symlinks, .gitignore)
bash tests/paperclip_test.sh     # 6 cenarios — paperclip-orchestrator
bash tests/local_waves_test.sh   # 5 cenarios — local-waves
```

Total: 53/53 verde em `main`. CI roda em PRs (`.github/workflows/validate-plugins.yml`).

## Testar plugin localmente (em outro projeto)

```bash
claude --plugin-dir /caminho/para/claude-craft/plugins/xp-stack
```

---

## Histórico de versões

| Versão | Data | Mudanças principais |
|--------|------|--------------------|
| **v0.3.0** | 2026-04-29 | 2 novas skills opt-in (`paperclip-orchestrator` com 8 templates + 9 lições anonimizadas, `local-waves` com `orchestrate-wave.sh`) + `bootstrap` ganha symlinks AGENTS.md + `.gitignore` autoupdate + `akita-xp-rules` ganha appendix "Mandatory Skill Integration" (ADR-008) |
| v0.2.0 | 2026-04-26 | Nova skill `optimizing-github-actions` auto-ativada via `paths` field + `akita-xp-rules` ganha proibição de `Co-Authored-By` (ADR-007) |
| v0.1.1 | 2026-04-16 | 5 fixes cosméticos pós self-test em projeto real (ADR-006) |
| v0.1.0 | 2026-04-16 | Release inicial — bootstrap funcional + 4 skills + 4 agents + templates (ADR-005) |

ADRs completos em [`CLAUDE.md`](CLAUDE.md) (raiz do repo).

---

## Princípios

O plugin transporta **metodologia universal** — TDD, pair programming, pesquisa formal, decomposição de tasks, conventional commits, multi-agent dispatch. **Não transporta** convenções de stack (frameworks específicos, paths de teste, entidades de domínio). Os agents lêem o `CLAUDE.md` do projeto receptor pra entender a stack.

Origem: extraído iterativamente do projeto **O Agente** (Meteora Digital) conforme padrões se mostram universais. Cada release passa por:

1. Validação empírica em projeto real upstream (TDD red → green → empirical → release).
2. Anonimização de templates (remoção de refs hardcoded a stack-específico, nomes, IPs, IDs).
3. Self-test em projeto receptor antes de release.

Veja `CLAUDE.md` (raiz) seção "ADRs" pra trilha completa de decisões.

---

## Contribuindo

PRs bem-vindos. O fluxo do próprio repo segue o método Akita/XP — veja `docs/tasks/` (decomposição das releases) e `CLAUDE.md` (raiz) pra entender o ciclo. Cada release segue 6 fases (T0 setup → T1 RED → T2-N GREEN → T(N+1) empirical → T(N+2) release).

## Licença

MIT — ver [LICENSE](LICENSE).
