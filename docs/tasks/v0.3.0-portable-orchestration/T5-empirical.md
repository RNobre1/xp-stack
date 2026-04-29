# T5 — Validacao empirica

**Status:** [ ] Pendente
**Branch:** feat/v0.3.0-portable-orchestration
**Fase TDD:** VERIFY
**Depende de:** T2, T3, T4

## Objetivo

Validar shell-direct (sem invocacao via `/xp-stack:*` que requer Claude Code rodando) que os 3 setups funcionam fim-a-fim em diretorios isolados.

Mesma estrategia do ADR-005 v0.1.0 (camada interativa SKILL.md + AskUserQuestion fica pra primeiro teste de aceitacao em projeto real).

## Arquivos que PODE tocar

- `docs/tasks/v0.3.0-portable-orchestration/T5-empirical-results.md` (criar com resultados)

## Arquivos PROIBIDOS

- Tudo no plugin (T2/T3/T4 ja foi)

## Cenarios

### Cenario A — bootstrap com symlinks + .gitignore

```bash
mkdir -p /tmp/v030-a && cd /tmp/v030-a
bash /home/rnobre/dev/claude-craft/plugins/xp-stack/skills/bootstrap/scripts/scaffold.sh \
  /tmp/v030-a "demo-api" "Python + FastAPI" "Demo API" "create"

# Validar
ls -la /tmp/v030-a/CLAUDE.md /tmp/v030-a/AGENTS.md   # AGENTS.md deve ser symlink
test -L /tmp/v030-a/AGENTS.md && echo "PASS: AGENTS.md eh symlink"
readlink /tmp/v030-a/AGENTS.md   # esperado: CLAUDE.md
grep -q '^local/$' /tmp/v030-a/.gitignore && echo "PASS: local/ no .gitignore"
grep -q '^\.claude/wave-runs/$' /tmp/v030-a/.gitignore && echo "PASS: wave-runs no .gitignore"
grep -q '^scripts/orchestrate/$' /tmp/v030-a/.gitignore && echo "PASS: orchestrate no .gitignore"

# Idempotencia: rodar 2a vez
bash .../scaffold.sh /tmp/v030-a "x" "y" "z" "create"
# .gitignore nao deve ter linhas duplicadas:
[ "$(grep -c '^local/$' /tmp/v030-a/.gitignore)" = "1" ] && echo "PASS: gitignore sem dup"

# Cenario A.2 — flag --no-agents-symlink
mkdir -p /tmp/v030-a2 && bash .../scaffold.sh /tmp/v030-a2 "x" "y" "z" "create" "no-symlink"
[ ! -e /tmp/v030-a2/AGENTS.md ] && echo "PASS: no-symlink respeitado"

rm -rf /tmp/v030-a /tmp/v030-a2
```

### Cenario B — paperclip-setup

```bash
mkdir -p /tmp/v030-b && cd /tmp/v030-b
# Pre-req: scaffold normal primeiro (cria .gitignore base)
bash /home/rnobre/dev/claude-craft/plugins/xp-stack/skills/bootstrap/scripts/scaffold.sh \
  /tmp/v030-b "paperclip-test" "Generic" "Test" "create"

# Setup paperclip
bash /home/rnobre/dev/claude-craft/plugins/xp-stack/skills/paperclip-orchestrator/scripts/setup-paperclip.sh \
  /tmp/v030-b

# Validar 5 .md
for f in playbook AGENTS-dev-primary AGENTS-reviewer dispatch-cheatsheet licoes; do
  [ -f /tmp/v030-b/local/paperclip/$f.md ] && echo "PASS: $f.md" || echo "FAIL: $f.md"
done
# 1 yml + 2 sh
[ -f /tmp/v030-b/.github/workflows/auto-merge.yml ] && echo "PASS: auto-merge.yml"
[ -x /tmp/v030-b/scripts/check-reviewer-approval.sh ] && echo "PASS: check-reviewer-approval.sh exec"
[ -x /tmp/v030-b/scripts/check-always-human.sh ] && echo "PASS: check-always-human.sh exec"
# .gitignore tem local/
grep -qxF "local/" /tmp/v030-b/.gitignore && echo "PASS: gitignore local/"

# Verificar despersonalizacao
! grep -rE "(meteora-digital|o-agente|Felipe|Rafael|209\\.97|gestao-ti|Vitest|Supabase|WhatsApp|Cohere|Resend|AssemblyAI)" \
  /tmp/v030-b/local/paperclip/ /tmp/v030-b/.github/workflows/auto-merge.yml /tmp/v030-b/scripts/ \
  && echo "PASS: nenhuma string upstream-specific encontrada" \
  || echo "REVIEW: encontrou string upstream-specific (ver acima)"

rm -rf /tmp/v030-b
```

### Cenario C — local-waves-setup

```bash
mkdir -p /tmp/v030-c && cd /tmp/v030-c
bash /home/rnobre/dev/claude-craft/plugins/xp-stack/skills/bootstrap/scripts/scaffold.sh \
  /tmp/v030-c "local-waves-test" "Generic" "Test" "create"

bash /home/rnobre/dev/claude-craft/plugins/xp-stack/skills/local-waves/scripts/setup-local-waves.sh \
  /tmp/v030-c

[ -x /tmp/v030-c/scripts/orchestrate/orchestrate-wave.sh ] && echo "PASS: orchestrate-wave.sh exec"
[ -f /tmp/v030-c/scripts/orchestrate/README.md ] && echo "PASS: README.md"
grep -qxF ".claude/wave-runs/" /tmp/v030-c/.gitignore && echo "PASS: gitignore wave-runs"

# Syntax check
bash -n /tmp/v030-c/scripts/orchestrate/orchestrate-wave.sh && echo "PASS: shell syntax"

rm -rf /tmp/v030-c
```

### Limite conhecido

A camada **runtime/interativa** das skills `paperclip-orchestrator` e `local-waves` (SKILL.md sendo carregada por Claude Code + AskUserQuestion + resolucao de `${CLAUDE_SKILL_DIR}`) NAO eh validada nesta task. Sera validada no primeiro `/xp-stack:paperclip-setup` em projeto real e registrada em ADR-008 + MEMORY.md global. Mesmo padrao do ADR-005 v0.1.0.

## Criterios de aceite

- [ ] T5-empirical-results.md criado com output dos 3 cenarios.
- [ ] Cenarios A, B, C: todos os PASS confirmados.
- [ ] Limite conhecido documentado em T5-empirical-results.md.
- [ ] /tmp/v030-* limpos pos-teste.
