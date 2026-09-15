---
name: code-review-automation
description: Install opt-in review reminders for a PR workflow — slash command /review-pr (structured adversarial review), PR template section, and a PreToolUse reminder before `gh pr create`/`gh pr merge`. Use when a project wants review evidence visible before integration; the current session/Host policy selects the reviewer, model, and mechanism. Auto-trigger phrases (PT-BR) "instala code-review-automation", "self-review automation", "gate de PR", "review automation" e (EN) "install code review automation", "orchestrator review reminders".
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

# Code Review Automation — PR Review Reminders

Instala lembretes visíveis para registrar revisão antes de um PR. A autoinspeção do autor prepara o handoff; a revisão final segue a política, o risco e as autorizações da sessão. O mecanismo pode usar o orquestrador, um revisor filho ou outro contexto independente; esta skill não escolhe modelo, perfil, UI ou estilo de comunicação. O hook lembra, mas não bloqueia.

Use the **Delivery evidence contract** in `akita-xp-rules` for the candidate's observable behavior, base, evidence, applicable guards, limits, and review result. Resolve the source path supplied by the environment and record it in each task or briefing. Do not create a parallel review state.

## Review lanes and independence

### Author self-inspection

The author can run `/review-pr` as a preparatory pass, recording concrete findings and verified evidence before handoff. This pass does not become the final decision when the session policy or risk requires an independent reviewer.

### Optional triage

If the current session explicitly selects a triage pass, provide the accepted scope, criteria, base/candidate, diff, consumer references, and available evidence. Triage reports location, case, expected versus observed, evidence, severity, and confirmation; it does not edit or approve. The author corrects confirmed findings, the pass rechecks the changed delta, and the independent final reviewer evaluates the candidate.

### Independent final review

The final reviewer is selected by the current session/Host policy. The author
and reviewer agent identities and models must both differ. A child reviewer is
allowed when authorized and useful; a coordinator may review only when it did
not author the implementation and the policy permits the distinct identity and
model. A renamed context or new thread alone does not qualify. Unknown or
inconclusive evidence is not approval.

### Anti-viés família

Uma referência de pesquisa discute que generator e reviewer do mesmo modelo/família podem compartilhar blind spots sistemáticos. **Adversarial persona prompting** ("assuma código errado até prova") e diferença de capacidade são hipóteses de mitigação a avaliar, não garantias.

Neste workflow, a sessão pode escolher modelos distintos para executor, triagem e revisão final quando isso melhora a avaliação. Sonnet no passe experimental e Opus na revisão final são exemplos de uma escolha da sessão, não um requisito desta skill. Registre o consumo, latência e contexto usados; não assuma custo zero.

### Contexto rico

Orchestrator já viu: plano original, T-files, reports dos workers, contexto de arquitetura (CLAUDE.md). Review não começa do zero — começa com contexto que nenhum subagent teria sem passar todo esse contexto de novo.

### Visibility for the session

The selected review mechanism should leave findings and evidence visible to the session. The Pilot can redirect or question it when the current workflow permits; visibility does not remove the independent-review requirement.

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
- Projeto tem PRs que precisam de revisão registrada antes da integração
- Alta taxa de PR merge sem review documentado
- Pilot quer um lembrete estruturado antes de `gh pr create`
- `superpowers:requesting-code-review` ou similar está no CLAUDE.md mas sem evidência visível

Não instalar se:
- Projeto não usa multi-agent (sem workers para revisar)
- Pilot já tem CI reviewer externo (CodeRabbit, etc.) e quer manter

## What gets installed

| Artifact | Path in target repo | What it does |
|---|---|---|
| Slash command | `.claude/commands/review-pr.md` | `/review-pr` — registra uma autoinspeção ou revisão estruturada com persona adversarial |
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

Quando uma implementação tem candidato e se prepara para abrir PR:

1. Antes de `gh pr create`, rodar `/review-pr` (ou `/review-pr <branch>` se branch específico), quando o fluxo selecionado pedir essa evidência
2. Slash command guia o responsável pelo diff completo com adversarial persona
3. Findings categorizados: Block / Must Fix / Suggestion / Nit
4. Block present → não integre o candidato. Corrija ou encaminhe ao autor responsável
5. Colar findings em `## Orchestrator self-review findings` no PR body
6. Quando a política exigir, encaminhar o candidato a uma revisão final independente
7. Integração e merge seguem a autorização da sessão/projeto; este lembrete não fixa o ator

## Adversarial persona

### Por que persona adversarial

Generator e reviewer do mesmo contexto tendem a validar em vez de questionar. Uma referência de pesquisa descreve position bias e family bias e discute adversarial persona prompting como uma hipótese de mitigação; trate a eficácia como algo a verificar no contexto da sessão.

Persona embutida no slash command `/review-pr`:

> "Você é senior engineer cético. Sua função NÃO é validar — é achar bugs, falhas de segurança, problemas de performance, violações de convenção. **Assuma que o código está ERRADO até prova em contrário.** Seja específico, cite arquivos e linhas. Não elogie. Não diga 'parece bom' sem justificativa técnica concreta."

Anti-bias adicional aplicável ao projeto:
- Procure: hasty SDK choices, mocked-vs-real shape drift, missing cross-tenant safety, RLS bypasses, unhandled error paths, missing regression tests
- Trate atalhos, mocks internos, erros silenciosos e edge cases como hipóteses a verificar, independentemente do modelo selecionado

## Limits

- Só escreve sob `$(pwd)` — nunca toca `~/.claude/` global
- Idempotente: detecta arquivos existentes, faz append ou abort sem destruir
- Hook e PR template lembram e tornam a evidência visível; não são enforcement semântico
- Slash command ESTRUTURA o review; o papel (autoinspeção, triagem ou revisão final) vem da sessão e da política
- Complementa `debugging-discipline`: se já instalado, apenas appenda matcher novo ao hook existente e seção nova ao PR template
