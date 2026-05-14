---
name: code-review-automation
description: Install orchestrator self-review gates for PR workflow — slash command /review-pr (structured adversarial self-review), PR template section, PreToolUse hook reminding before `gh pr create`/`gh pr merge`. Opt-in. Use when orchestrator dispatches Sonnet workers and wants Opus-level self-review BEFORE opening PR (without dispatching subagent reviewer — orchestrator IS the reviewer). Auto-trigger phrases (PT-BR) "instala code-review-automation", "self-review automation", "gate de PR", "review automation" e (EN) "install code review automation", "orchestrator self-review gates".
allowed-tools:
  - Bash(bash *)
  - Bash(cp *)
  - Bash(mkdir *)
  - Bash(chmod *)
  - Bash(test *)
  - Bash(jq *)
  - Read
  - Write
  - Edit
---

> **Pra engines sem skill loading:** leia este file inteiro e siga as instruções como se fossem suas.

# Code Review Automation — Orchestrator Self-Review Gates

Instala gates concretos que tornam orchestrator self-review **automático e estruturado** antes de cada PR. NÃO dispatcha subagent — o **orquestrador atual** (Opus) revisa código gerado pelos workers (Sonnet). Modelo combate viés família via capacidade diferente + adversarial persona.

## Why orchestrator-as-reviewer (not subagent)

### Anti-viés família

Pesquisa Simon Couch (2025) mostra: generator e reviewer do mesmo modelo/família compartilham blind spots sistemáticos. Workaround mais eficaz documentado: **adversarial persona prompting** ("assuma código errado até prova") + diferença de capacidade entre reviewer e generator.

Neste workflow:
- Workers = Sonnet (geração rápida, iterativa)
- Reviewer = Opus (sessão principal, maior capacidade raciocínio)

Opus revisando output Sonnet não elimina viés completamente, mas cria assimetria suficiente para capturar classes de erro que Sonnet-revisa-Sonnet não pega.

### Zero custo extra

Sessão Claude Code subscription já cobre. Nenhum Agent tool call adicional — orchestrator executa o review na própria thread.

### Contexto rico

Orchestrator já viu: plano original, T-files, reports dos workers, contexto de arquitetura (CLAUDE.md). Review não começa do zero — começa com contexto que nenhum subagent teria sem passar todo esse contexto de novo.

### Pilot interrompe em tempo real

Review acontece na thread principal. Pilot vê findings em tempo real, pode interromper, redirecionar, questionar. Subagent review seria assíncrono e opaco.

## When to install

Auditar repo target antes:

```bash
# Ratio de PRs sem evidência de self-review
git log --oneline -30 | grep -c 'feat:\|fix:\|refactor:'

# Verifica se PR template tem seção self-review
grep -l "self-review\|Orchestrator" .github/PULL_REQUEST_TEMPLATE.md 2>/dev/null

# Procura evidência de /review-pr em commits ou PRs
git log --oneline -30 | grep -i "review\|self-review"
```

Instalar quando:
- Projeto usa Agent View pattern (dispatcha workers Sonnet)
- Alta taxa de PR merge sem review documentado
- Pilot quer gate estruturado antes de `gh pr create`
- `superpowers:requesting-code-review` ou similar está no CLAUDE.md mas sem enforcement concreto

Não instalar se:
- Projeto não usa multi-agent (sem workers para revisar)
- Pilot já tem CI reviewer externo (CodeRabbit, etc.) e quer manter

## What gets installed

| Artifact | Path in target repo | What it does |
|---|---|---|
| Slash command | `.claude/commands/review-pr.md` | `/review-pr` — orchestrator executa self-review estruturado com adversarial persona |
| PR template patch | `.github/PULL_REQUEST_TEMPLATE.md` | Append seção "## Orchestrator self-review findings" |
| PreToolUse hook patch | `.claude/hooks/pre-tool-use.sh` | Matcher novo: lembra de `/review-pr` antes de `gh pr create`/`gh pr merge` |
| Hook registration | `.claude/settings.json` | Garante hook PreToolUse registrado (idempotente se debugging-discipline já instalou) |

## Steps as the agent running this skill

### Step 1: Confirm intent

Perguntar ao usuário:
- "Instalar code-review-automation? Instala /review-pr slash command + seção no PR template + hook reminder antes de gh pr create/merge."
- Se "Sim" → prosseguir
- Se "Auditar primeiro" → mostrar evidências, perguntar de novo
- Se "Não" → abort

### Step 2: Check conflicts

Verificar antes de escrever:

```bash
# Slash command
test -f "$(pwd)/.claude/commands/review-pr.md" && echo "EXISTS" || echo "OK"

# PR template
test -f "$(pwd)/.github/PULL_REQUEST_TEMPLATE.md" && echo "EXISTS" || echo "MISSING"

# Hook
test -f "$(pwd)/.claude/hooks/pre-tool-use.sh" && echo "EXISTS" || echo "OK"

# PR reminder já no hook?
grep -q "review-pr reminder" "$(pwd)/.claude/hooks/pre-tool-use.sh" 2>/dev/null && echo "ALREADY_PATCHED" || echo "NEEDS_PATCH"
```

- `review-pr.md` existe → SKIP com mensagem
- PR template MISSING → criar do zero (apenas a seção, script faz isso)
- hook MISSING → criar minimal com matcher
- hook EXISTS + não tem "review-pr reminder" → append matcher
- hook EXISTS + já tem "review-pr reminder" → SKIP (idempotente)

### Step 3: Run setup script

Localizar SKILL_DIR como diretório que contém este SKILL.md.

```bash
bash "${SKILL_DIR}/scripts/setup-code-review-automation.sh" "$(pwd)"
```

### Step 4: Report next steps

Informar ao usuário:
1. `/review-pr` instalado em `.claude/commands/review-pr.md` — usar antes de `gh pr create`
2. PR template atualizado com seção self-review
3. Hook reminder ativo para `gh pr create` e `gh pr merge`
4. Smoke test: digitar `/review-pr` no Claude Code → deve ver structured review prompt

## How orchestrator uses /review-pr

Quando orchestrator termina wave de workers e quer abrir PR:

1. Antes de `gh pr create`, rodar `/review-pr` (ou `/review-pr <branch>` se branch específico)
2. Slash command guia orchestrator pelo diff completo com adversarial persona
3. Findings categorizados: Block / Must Fix / Suggestion / Nit
4. Block present → NÃO abrir PR. Corrigir ou pedir ao worker que gerou o código
5. Apenas Suggestion/Nit → abrir PR com findings no body
6. Colar findings em `## Orchestrator self-review findings` no PR body
7. Pilot decide merge no GitHub — orchestrator NÃO auto-merga (regra Akita)

## Adversarial persona

### Por que persona adversarial

Generator e reviewer do mesmo contexto tendem a validar em vez de questionar. Pesquisa Couch 2025: "position bias dominates; family bias smaller but real; adversarial persona prompting é mitigação mais eficaz documentada".

Persona embutida no slash command `/review-pr`:

> "Você é senior engineer cético. Sua função NÃO é validar — é achar bugs, falhas de segurança, problemas de performance, violações de convenção. **Assuma que o código está ERRADO até prova em contrário.** Seja específico, cite arquivos e linhas. Não elogie. Não diga 'parece bom' sem justificativa técnica concreta."

Anti-bias adicional específico Meteora/xp-stack:
- Procure: hasty SDK choices, mocked-vs-real shape drift, missing cross-tenant safety, RLS bypasses, unhandled error paths, missing regression tests
- Workers Sonnet tendem a: swallow errors silently, mock internals em vez de boundaries, pular edge cases em condições de tempo
- Opus reviewer deve: ser cético exatamente nesses pontos

## Limits

- Só escreve sob `$(pwd)` — nunca toca `~/.claude/` global
- Idempotente: detecta arquivos existentes, faz append ou abort sem destruir
- Hook lembra (não bloqueia) — gate semântico é o PR template
- Slash command ESTRUTURA o review mas orchestrator executa (skill não dispatcha subagent)
- Complementa `debugging-discipline`: se já instalado, apenas appenda matcher novo ao hook existente e seção nova ao PR template
