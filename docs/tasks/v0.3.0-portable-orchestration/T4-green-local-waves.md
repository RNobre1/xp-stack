# T4 — GREEN Camada C: skill local-waves

**Status:** [ ] Pendente
**Branch:** feat/v0.3.0-portable-orchestration
**Fase TDD:** GREEN
**Depende de:** T1

## Objetivo

Criar a skill `local-waves` (opt-in via `/xp-stack:local-waves-setup`). Fazer 5/5 cenarios do `local_waves_test.sh` passarem.

## Arquivos que PODE tocar

- `plugins/xp-stack/skills/local-waves/` (criar tudo)
  - `SKILL.md`
  - `scripts/setup-local-waves.sh`
  - `templates/orchestrate-wave.sh.template`
  - `templates/README.md.template`

## Arquivos PROIBIDOS

- Skills outras
- `tests/*.sh`

## Implementacao

### SKILL.md

```yaml
---
name: local-waves
description: Setup a local parallel-wave orchestrator in this project — copies orchestrate-wave.sh and README to scripts/orchestrate/. The orchestrator dispatches N headless workers (claude -p Sonnet) in isolated git worktrees per task, blocks on BLOCKERS.md discipline, and aggregates summary. Alternative to remote orchestrators like Paperclip when you want sync local execution without a droplet. Invoke via /xp-stack:local-waves-setup. Opt-in.
disable-model-invocation: true
allowed-tools:
  - Bash(bash *)
  - Bash(cp *)
  - Bash(mkdir *)
  - Bash(chmod *)
  - Bash(test *)
  - Bash(pwd)
  - AskUserQuestion
---
```

Body inclui:
- Mental model (orquestrador Opus 4.7 + N workers Sonnet headless em worktrees).
- Pre-requisito do projeto receptor: ter `docs/tasks/{feature}/TERMINAL-PROMPTS.md` com headers `## Onda N` + `### T{X}` + bloco de codigo.
- Trade-off vs paperclip-orchestrator (sync vs async; local vs remoto; sem droplet vs persistencia).
- Step 1: AskUserQuestion confirmar.
- Step 2: invocar setup script.
- Step 3: Report onde os arquivos foram instalados + link pra README.

### setup-local-waves.sh

Mesma logica do setup-paperclip mas mais simples:

```bash
#!/usr/bin/env bash
set -euo pipefail
TARGET_DIR="${1:?target_dir obrigatorio}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES_DIR="$SKILL_ROOT/templates"

mkdir -p "$TARGET_DIR/scripts/orchestrate"

src="$TEMPLATES_DIR/orchestrate-wave.sh.template"
dst="$TARGET_DIR/scripts/orchestrate/orchestrate-wave.sh"
if [ -f "$src" ] && [ ! -e "$dst" ]; then
  cp "$src" "$dst"
  chmod +x "$dst"
  echo "Created: $dst"
fi

src="$TEMPLATES_DIR/README.md.template"
dst="$TARGET_DIR/scripts/orchestrate/README.md"
if [ -f "$src" ] && [ ! -e "$dst" ]; then
  cp "$src" "$dst"
  echo "Created: $dst"
fi

# .gitignore: .claude/wave-runs/
GITIGNORE="$TARGET_DIR/.gitignore"
touch "$GITIGNORE"
if ! grep -qxF ".claude/wave-runs/" "$GITIGNORE"; then
  printf '\n# Local wave orchestrator runs (gitignored)\n.claude/wave-runs/\nscripts/orchestrate/\n' >> "$GITIGNORE"
  echo "Updated: $GITIGNORE"
fi

echo ""
echo "Local waves orchestrator installed. Read scripts/orchestrate/README.md."
```

### orchestrate-wave.sh.template

Copia adaptada de upstream `scripts/orchestrate/orchestrate-wave.sh`. Mudancas:
- Remover refs hardcoded a `o-agente`, `Meteora`, `dev` (branch base).
- Permitir BASE_BRANCH via env var ou default `dev`.
- Worker prompt prefix: remover refs a `CLAUDE.local.md`, `supabase/.env.local` — substituir por "credentials your project uses" + nota generica.
- Allowlist de tools: manter generica + nota "edit per project's tech stack".

### README.md.template

Copia adaptada do upstream. Substituir refs especificas por placeholders. Manter "Modelo mental", "Convencao de feature", "Ciclo de uso", "Layout de artefatos", "Limitacoes conhecidas", "Evolucao sugerida".

## Sequencia TDD

1. Criar dir + SKILL.md.
2. Criar setup-local-waves.sh.
3. Criar orchestrate-wave.sh.template (adaptado do upstream).
4. Criar README.md.template (adaptado).
5. Rodar `bash tests/local_waves_test.sh` -> 5/5 verde.
6. Verificar regressao: outros 5 tests files continuam verdes.
7. Commit: `feat(local-waves): nova skill com orchestrate-wave.sh template + setup script`

## Criterios de aceite

- [ ] `bash tests/local_waves_test.sh` -> 5/5 verde.
- [ ] `bash tests/paperclip_test.sh` -> 6/6 verde (regressao).
- [ ] `bash tests/bootstrap_test.sh` -> 16/16 verde.
- [ ] Manual smoke: `bash setup-local-waves.sh /tmp/v030-lw-smoke` cria `scripts/orchestrate/` com 2 arquivos + `.gitignore` com 2 entries.
- [ ] orchestrate-wave.sh.template nao contem `o-agente`, `meteora`, `Vitest`, `Supabase`, `tsconfig.app.json`, `CLAUDE.local.md`, `supabase/.env.local`.
- [ ] `bash -n templates/orchestrate-wave.sh.template` (syntax check) passa.
- [ ] `description` em SKILL.md <= 1536 chars.
