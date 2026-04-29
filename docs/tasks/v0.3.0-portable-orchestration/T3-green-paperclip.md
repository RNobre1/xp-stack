# T3 — GREEN Camada B: skill paperclip-orchestrator

**Status:** [ ] Pendente
**Branch:** feat/v0.3.0-portable-orchestration
**Fase TDD:** GREEN
**Depende de:** T1, T2 (testes RED criados, scaffold ja sabe gitignore)

## Objetivo

Criar a skill `paperclip-orchestrator` (opt-in via `/xp-stack:paperclip-setup`). Fazer 6/6 cenarios do `paperclip_test.sh` passarem.

## Arquivos que PODE tocar

- `plugins/xp-stack/skills/paperclip-orchestrator/` (criar tudo)
  - `SKILL.md`
  - `scripts/setup-paperclip.sh`
  - `templates/AGENTS-dev-primary.md.template`
  - `templates/AGENTS-reviewer.md.template`
  - `templates/playbook.md.template`
  - `templates/dispatch-cheatsheet.md.template`
  - `templates/licoes.md.template`
  - `templates/auto-merge.yml.template`
  - `templates/check-reviewer-approval.sh.template`
  - `templates/check-always-human.sh.template`
  - `references/licoes-do-piloto.md`

## Arquivos PROIBIDOS

- Skills outras
- `tests/*.sh`

## Implementacao

### SKILL.md (sob 1536 chars na description, body livre)

```yaml
---
name: paperclip-orchestrator
description: Setup the Paperclip multi-agent orchestrator pattern in this project — copies AGENTS.md per-role templates (dev-primary, reviewer), playbook, dispatch cheatsheet, lessons template into local/paperclip/ (gitignored), and installs the GitHub Actions auto-merge gate B workflow with check scripts. Invoke explicitly via /xp-stack:paperclip-setup. Optional, opt-in. Decision tree comparing Paperclip (remote async, droplet, multi-project) vs xp-stack:local-waves (local sync, worktrees) included.
disable-model-invocation: true
allowed-tools:
  - Bash(bash *)
  - Bash(cp *)
  - Bash(mkdir *)
  - Bash(test *)
  - Bash(ls *)
  - Bash(pwd)
  - Bash(cat *)
  - AskUserQuestion
---
```

Body inclui:
- Decision tree Paperclip vs local-waves (uma tabela curta).
- Step 1: confirmar via `AskUserQuestion` que usuario quer prosseguir (com opcoes "yes"/"no, prefer local-waves"/"abort").
- Step 2: invocar `bash ${CLAUDE_SKILL_DIR}/scripts/setup-paperclip.sh "$(pwd)"`.
- Step 3: Report — listar arquivos criados, instruir sobre `references/licoes-do-piloto.md` pra ler antes de Wave 1.
- Limits: nao tocar fora de `$(pwd)`, nao instalar Paperclip CLI, nao criar agentes via API.

### setup-paperclip.sh

```bash
#!/usr/bin/env bash
# Copia templates do paperclip-orchestrator pro repo receptor.
# Idempotente.
#
# Uso: setup-paperclip.sh <target_dir>

set -euo pipefail

TARGET_DIR="${1:?target_dir obrigatorio}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES_DIR="$SKILL_ROOT/templates"

# 1. local/paperclip/ (gitignored)
mkdir -p "$TARGET_DIR/local/paperclip"
for tpl in playbook AGENTS-dev-primary AGENTS-reviewer dispatch-cheatsheet licoes; do
  src="$TEMPLATES_DIR/${tpl}.md.template"
  dst="$TARGET_DIR/local/paperclip/${tpl}.md"
  if [ -f "$src" ] && [ ! -e "$dst" ]; then
    cp "$src" "$dst"
    echo "Created: $dst"
  fi
done

# 2. .github/workflows/auto-merge.yml
mkdir -p "$TARGET_DIR/.github/workflows"
src="$TEMPLATES_DIR/auto-merge.yml.template"
dst="$TARGET_DIR/.github/workflows/auto-merge.yml"
if [ -f "$src" ] && [ ! -e "$dst" ]; then
  cp "$src" "$dst"
  echo "Created: $dst"
fi

# 3. scripts/check-{reviewer-approval,always-human}.sh
mkdir -p "$TARGET_DIR/scripts"
for s in check-reviewer-approval check-always-human; do
  src="$TEMPLATES_DIR/${s}.sh.template"
  dst="$TARGET_DIR/scripts/${s}.sh"
  if [ -f "$src" ] && [ ! -e "$dst" ]; then
    cp "$src" "$dst"
    chmod +x "$dst"
    echo "Created: $dst"
  fi
done

# 4. .gitignore: local/
GITIGNORE="$TARGET_DIR/.gitignore"
touch "$GITIGNORE"
if ! grep -qxF "local/" "$GITIGNORE"; then
  printf '\n# Paperclip orchestrator (gitignored)\nlocal/\n' >> "$GITIGNORE"
  echo "Updated: $GITIGNORE (added local/)"
fi

echo ""
echo "Paperclip setup complete. Read local/paperclip/playbook.md and references/licoes-do-piloto.md."
```

### Templates anonimizados

**Despersonalizar:**
- Substituir `o-agente`, `meteora-digital/o-agente` por `<your-repo>` ou `{{PROJECT_NAME}}` (nao ha substituicao runtime — sao docs leitura humana, deixar como placeholder textual claro).
- Substituir `Pilot` (Rafael) / `architect` por roles genericos `Pilot` / `Architect` (mantem mental model, sem nome real).
- Substituir `Felipe` por `Other team member who does not use Paperclip`.
- Substituir `meteora-digital-site` (droplet name), `209.97.147.50` (IP), Tailscale hostname por `<droplet-host>`, `<droplet-ip>`, `<tailscale-hostname>`.
- Manter modelos LLM (`claude-sonnet-4-6`, `claude-opus-4-7`) — sao universais.
- Remover ADRs especificos (numericos), refs a Vitest/Supabase/WhatsApp/Cohere/Resend/AssemblyAI. Substituir por "your project's tech stack" ou exemplo generico.
- Caveman section: simplificar pra "optional cost-reduction skill" + link pra https://github.com/JuliusBrussee/caveman.
- Remover refs a `gestao-ti` (tracker interno). Substituir por "your team's task tracker (Linear/Jira/etc.)".
- Mudar PT-BR -> manter PT-BR mas ajustar tom pra tutorial generico.

**`auto-merge.yml.template`** — copia direta + 3 substituicoes:
- Remove header de `Paperclip orchestrator workflow`, deixa mais generico mas preserva creditos.
- O resto eh logica universal.

**`check-reviewer-approval.sh.template`** e **`check-always-human.sh.template`** — copia direta. Patterns de always-human path no segundo precisam ser revistos (no upstream incluem `supabase/migrations/`, etc.). Vou deixar como **template com comentario "edit this list per project"**:

```bash
ALWAYS_HUMAN_PATTERNS=(
  '^\.github/workflows/'
  '^CLAUDE\.md$'
  '^CLAUDE\.local\.md$'
  '^docs/adrs/'
  '^\.env'
  '^deploy/'
  # Add your own: e.g. '^db/migrations/', '^terraform/'
)
```

### `references/licoes-do-piloto.md`

Documento case study com as 9 licoes. Cada uma:
- **Title** (sem PR # / IDs).
- **Context** (1-2 linhas, anonimas).
- **Root cause** (essencia tecnica).
- **Mitigation** (acionavel, generico).
- **Tag**.

Header explicativo: "These 9 lessons come from a real Wave 1 pilot at the upstream project. They are NOT in your `local/paperclip/licoes.md` (which starts empty) — read them once before Wave 1, then write your own as you learn."

## Sequencia TDD

1. Criar dir + SKILL.md.
2. Criar setup-paperclip.sh.
3. Criar 8 templates (5 .md + 1 .yml + 2 .sh) anonimizando do upstream.
4. Criar references/licoes-do-piloto.md anonimizada.
5. Rodar `bash tests/paperclip_test.sh` -> 6/6 verde.
6. Verificar regressao: outros 4 tests files continuam verdes.
7. Commit: `feat(paperclip-orchestrator): nova skill com setup + 8 templates + 9 licoes anonimizadas`

## Criterios de aceite

- [ ] `bash tests/paperclip_test.sh` -> 6/6 verde.
- [ ] `bash tests/bootstrap_test.sh` -> 16/16 verde (regressao).
- [ ] Manual smoke test em `/tmp`: `bash setup-paperclip.sh /tmp/v030-pa-smoke` cria 5 .md + 1 .yml + 2 .sh + .gitignore com `local/`.
- [ ] Templates nao contem strings: `meteora-digital`, `o-agente`, `Felipe`, `Rafael`, IPs reais, `gestao-ti`, `Vitest`, `Supabase`, `WhatsApp`, `Cohere`, `Resend`, `AssemblyAI`. (grep -r esses padroes em templates/ retorna 0 matches OU so em comentarios "your project's X like Vitest").
- [ ] `description` em SKILL.md <= 1536 chars.
