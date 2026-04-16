#!/usr/bin/env bash
#
# Suite de testes puro bash para a skill bootstrap do xp-stack:
# - cenario 1: templates reais (T1)
# - cenarios 2-10: scaffold.sh com 5 args + 4 modos CLAUDE.md (T2)
# - cenario 11: description do SKILL.md cabe em 1536 chars (T3)
#
# Fase 1 (RED apos criar este arquivo): testes falham pois os templates reais
# e o scaffold.sh evoluido ainda nao existem. Cenarios 10 e 11 podem passar
# por acidente com o placeholder atual — nao tem problema.
#
set -uo pipefail

TEST_FILE="${BASH_SOURCE[0]}"
TEST_DIR="$(cd "$(dirname "$TEST_FILE")" && pwd)"
REPO_ROOT="$(cd "$TEST_DIR/.." && pwd)"

PLUGIN_DIR="$REPO_ROOT/plugins/xp-stack"
TEMPLATES_DIR="$PLUGIN_DIR/templates"
SCAFFOLD_SH="$PLUGIN_DIR/skills/bootstrap/scripts/scaffold.sh"
SKILL_MD="$PLUGIN_DIR/skills/bootstrap/SKILL.md"

PASS=0
FAIL=0
FAILED_NAMES=()

pass_case() {
  printf '  PASS: %s\n' "$1"
  PASS=$((PASS + 1))
}

fail_case() {
  printf '  FAIL: %s — %s\n' "$1" "$2"
  FAIL=$((FAIL + 1))
  FAILED_NAMES+=("$1")
}

run_test() {
  local name="$1"
  local fn="$2"
  printf '\nTEST %s\n' "$name"
  "$fn"
}

# Extrai valor de `description:` do frontmatter YAML de um arquivo .md
extract_description() {
  local file="$1"
  awk '
    /^---$/ { f++; next }
    f == 1 && /^description:/ {
      sub(/^description:[[:space:]]*/, "")
      print
      exit
    }
  ' "$file"
}

# ---------------------------------------------------------------------------
# Cenario 1 — Templates reais existem com conteudo esperado
# ---------------------------------------------------------------------------
test_templates_exist() {
  # CLAUDE.md.template
  if [ ! -f "$TEMPLATES_DIR/CLAUDE.md.template" ]; then
    fail_case "templates_exist" "CLAUDE.md.template nao encontrado"
    return
  fi
  if ! grep -q '{{PROJECT_NAME}}' "$TEMPLATES_DIR/CLAUDE.md.template"; then
    fail_case "templates_exist" "CLAUDE.md.template sem {{PROJECT_NAME}}"
    return
  fi
  if ! grep -q '{{PROJECT_STACK}}' "$TEMPLATES_DIR/CLAUDE.md.template"; then
    fail_case "templates_exist" "CLAUDE.md.template sem {{PROJECT_STACK}}"
    return
  fi
  if ! grep -q '{{PROJECT_DESCRIPTION}}' "$TEMPLATES_DIR/CLAUDE.md.template"; then
    fail_case "templates_exist" "CLAUDE.md.template sem {{PROJECT_DESCRIPTION}}"
    return
  fi

  # claude-settings-project.json — JSON valido
  if [ ! -f "$TEMPLATES_DIR/claude-settings-project.json" ]; then
    fail_case "templates_exist" "claude-settings-project.json nao encontrado"
    return
  fi
  if ! jq empty "$TEMPLATES_DIR/claude-settings-project.json" 2>/dev/null; then
    fail_case "templates_exist" "claude-settings-project.json nao e JSON valido"
    return
  fi

  # docs-tasks-template/*  (README + 4 TEMPLATE-*.md)
  local missing=()
  local f
  for f in README.md TEMPLATE-overview.md TEMPLATE-progress.md TEMPLATE-task.md TEMPLATE-terminal-prompts.md; do
    if [ ! -f "$TEMPLATES_DIR/docs-tasks-template/$f" ]; then
      missing+=("docs-tasks-template/$f")
    fi
  done

  # docs-pesquisas-template/TEMPLATE-pesquisa.md
  if [ ! -f "$TEMPLATES_DIR/docs-pesquisas-template/TEMPLATE-pesquisa.md" ]; then
    missing+=("docs-pesquisas-template/TEMPLATE-pesquisa.md")
  fi

  if [ ${#missing[@]} -gt 0 ]; then
    fail_case "templates_exist" "arquivos ausentes: ${missing[*]}"
    return
  fi
  pass_case "templates_exist"
}

# ---------------------------------------------------------------------------
# Cenario 2 — scaffold.sh cria CLAUDE.md com substituicao de placeholders
# ---------------------------------------------------------------------------
test_scaffold_creates_claude_md_with_substitution() {
  local target
  target=$(mktemp -d)

  bash "$SCAFFOLD_SH" "$target" "my-api" "Python + FastAPI" "API de exemplo" "create" >/dev/null 2>&1

  if [ ! -f "$target/CLAUDE.md" ]; then
    fail_case "scaffold_creates_claude_md_with_substitution" "$target/CLAUDE.md nao criado"
    rm -rf "$target"
    return
  fi
  if ! grep -q "my-api" "$target/CLAUDE.md"; then
    fail_case "scaffold_creates_claude_md_with_substitution" "valor 'my-api' nao substituido"
    rm -rf "$target"
    return
  fi
  if ! grep -q "Python + FastAPI" "$target/CLAUDE.md"; then
    fail_case "scaffold_creates_claude_md_with_substitution" "valor 'Python + FastAPI' nao substituido"
    rm -rf "$target"
    return
  fi
  if ! grep -q "API de exemplo" "$target/CLAUDE.md"; then
    fail_case "scaffold_creates_claude_md_with_substitution" "valor 'API de exemplo' nao substituido"
    rm -rf "$target"
    return
  fi
  if grep -q "{{PROJECT_NAME}}" "$target/CLAUDE.md"; then
    fail_case "scaffold_creates_claude_md_with_substitution" "placeholder {{PROJECT_NAME}} ainda literal"
    rm -rf "$target"
    return
  fi

  rm -rf "$target"
  pass_case "scaffold_creates_claude_md_with_substitution"
}

# ---------------------------------------------------------------------------
# Cenario 3 — scaffold.sh copia docs/tasks/_template/ recursivamente
# ---------------------------------------------------------------------------
test_scaffold_copies_tasks_template() {
  local target
  target=$(mktemp -d)

  bash "$SCAFFOLD_SH" "$target" "foo" "bar" "baz" "create" >/dev/null 2>&1

  if [ ! -f "$target/docs/tasks/_template/TEMPLATE-task.md" ]; then
    fail_case "scaffold_copies_tasks_template" "TEMPLATE-task.md nao copiado"
    rm -rf "$target"
    return
  fi
  if [ ! -f "$target/docs/tasks/_template/README.md" ]; then
    fail_case "scaffold_copies_tasks_template" "README.md nao copiado"
    rm -rf "$target"
    return
  fi

  rm -rf "$target"
  pass_case "scaffold_copies_tasks_template"
}

# ---------------------------------------------------------------------------
# Cenario 4 — scaffold.sh copia docs/pesquisas/_template/
# ---------------------------------------------------------------------------
test_scaffold_copies_pesquisas_template() {
  local target
  target=$(mktemp -d)

  bash "$SCAFFOLD_SH" "$target" "foo" "bar" "baz" "create" >/dev/null 2>&1

  if [ ! -f "$target/docs/pesquisas/_template/TEMPLATE-pesquisa.md" ]; then
    fail_case "scaffold_copies_pesquisas_template" "TEMPLATE-pesquisa.md nao copiado"
    rm -rf "$target"
    return
  fi

  rm -rf "$target"
  pass_case "scaffold_copies_pesquisas_template"
}

# ---------------------------------------------------------------------------
# Cenario 5 — scaffold.sh cria .claude/settings.json valido
# ---------------------------------------------------------------------------
test_scaffold_creates_claude_settings() {
  local target
  target=$(mktemp -d)

  bash "$SCAFFOLD_SH" "$target" "foo" "bar" "baz" "create" >/dev/null 2>&1

  if [ ! -f "$target/.claude/settings.json" ]; then
    fail_case "scaffold_creates_claude_settings" ".claude/settings.json nao criado"
    rm -rf "$target"
    return
  fi
  if ! jq empty "$target/.claude/settings.json" 2>/dev/null; then
    fail_case "scaffold_creates_claude_settings" ".claude/settings.json nao e JSON valido"
    rm -rf "$target"
    return
  fi

  rm -rf "$target"
  pass_case "scaffold_creates_claude_settings"
}

# ---------------------------------------------------------------------------
# Cenario 6 — Idempotencia (2 execucoes nao mudam mtime de arquivos criados)
# ---------------------------------------------------------------------------
test_scaffold_idempotent() {
  local target
  target=$(mktemp -d)

  bash "$SCAFFOLD_SH" "$target" "foo" "bar" "baz" "create" >/dev/null 2>&1

  # Garantir que a primeira execucao criou os arquivos antes de medir mtime
  if [ ! -f "$target/CLAUDE.md" ]; then
    fail_case "scaffold_idempotent" "CLAUDE.md nao criado na 1a execucao"
    rm -rf "$target"
    return
  fi
  if [ ! -f "$target/docs/tasks/_template/TEMPLATE-task.md" ]; then
    fail_case "scaffold_idempotent" "TEMPLATE-task.md nao criado na 1a execucao"
    rm -rf "$target"
    return
  fi

  local mtime_claude mtime_task
  mtime_claude=$(stat -c '%Y' "$target/CLAUDE.md" 2>/dev/null)
  mtime_task=$(stat -c '%Y' "$target/docs/tasks/_template/TEMPLATE-task.md" 2>/dev/null)

  # Dorme 1s pra garantir diferenca de mtime se houvesse reescrita
  sleep 1

  # 2a execucao com valores DIFERENTES — nao deve re-tocar nenhum arquivo
  bash "$SCAFFOLD_SH" "$target" "other-name" "other-stack" "other-desc" "create" >/dev/null 2>&1

  local mtime_claude_2 mtime_task_2
  mtime_claude_2=$(stat -c '%Y' "$target/CLAUDE.md" 2>/dev/null)
  mtime_task_2=$(stat -c '%Y' "$target/docs/tasks/_template/TEMPLATE-task.md" 2>/dev/null)

  if [ "$mtime_claude" != "$mtime_claude_2" ]; then
    fail_case "scaffold_idempotent" "CLAUDE.md mtime mudou ($mtime_claude -> $mtime_claude_2)"
    rm -rf "$target"
    return
  fi
  if [ "$mtime_task" != "$mtime_task_2" ]; then
    fail_case "scaffold_idempotent" "TEMPLATE-task.md mtime mudou ($mtime_task -> $mtime_task_2)"
    rm -rf "$target"
    return
  fi

  rm -rf "$target"
  pass_case "scaffold_idempotent"
}

# ---------------------------------------------------------------------------
# Cenario 7 — Modo skip preserva CLAUDE.md existente
# ---------------------------------------------------------------------------
test_scaffold_skip_preserves_claude_md() {
  local target
  target=$(mktemp -d)

  echo "PRE_EXISTING_CONTENT" > "$target/CLAUDE.md"

  bash "$SCAFFOLD_SH" "$target" "foo" "bar" "baz" "skip" >/dev/null 2>&1

  if ! grep -q "PRE_EXISTING_CONTENT" "$target/CLAUDE.md"; then
    fail_case "scaffold_skip_preserves_claude_md" "CLAUDE.md foi modificado (PRE_EXISTING perdido)"
    rm -rf "$target"
    return
  fi

  rm -rf "$target"
  pass_case "scaffold_skip_preserves_claude_md"
}

# ---------------------------------------------------------------------------
# Cenario 8 — Modo backup renomeia existente e cria novo
# ---------------------------------------------------------------------------
test_scaffold_backup_renames_and_creates() {
  local target
  target=$(mktemp -d)

  echo "PRE_EXISTING_CONTENT" > "$target/CLAUDE.md"

  bash "$SCAFFOLD_SH" "$target" "new-name" "new-stack" "new-desc" "backup" >/dev/null 2>&1

  if [ ! -f "$target/CLAUDE.md.bak" ]; then
    fail_case "scaffold_backup_renames_and_creates" "CLAUDE.md.bak nao criado"
    rm -rf "$target"
    return
  fi
  if ! grep -q "PRE_EXISTING_CONTENT" "$target/CLAUDE.md.bak"; then
    fail_case "scaffold_backup_renames_and_creates" ".bak nao contem PRE_EXISTING"
    rm -rf "$target"
    return
  fi
  if grep -q "PRE_EXISTING_CONTENT" "$target/CLAUDE.md"; then
    fail_case "scaffold_backup_renames_and_creates" "CLAUDE.md ainda tem PRE_EXISTING (nao foi recriado)"
    rm -rf "$target"
    return
  fi
  if ! grep -q "new-name" "$target/CLAUDE.md"; then
    fail_case "scaffold_backup_renames_and_creates" "CLAUDE.md novo nao tem 'new-name' substituido"
    rm -rf "$target"
    return
  fi

  rm -rf "$target"
  pass_case "scaffold_backup_renames_and_creates"
}

# ---------------------------------------------------------------------------
# Cenario 9 — Modo abort nao faz nada (exit 0 graceful)
# ---------------------------------------------------------------------------
test_scaffold_abort_does_nothing() {
  local target
  target=$(mktemp -d)

  local exit_code
  bash "$SCAFFOLD_SH" "$target" "foo" "bar" "baz" "abort" >/dev/null 2>&1
  exit_code=$?

  if [ "$exit_code" -ne 0 ]; then
    fail_case "scaffold_abort_does_nothing" "exit code != 0 (got $exit_code)"
    rm -rf "$target"
    return
  fi
  if [ -f "$target/CLAUDE.md" ]; then
    fail_case "scaffold_abort_does_nothing" "CLAUDE.md foi criado (abort nao respeitado)"
    rm -rf "$target"
    return
  fi
  if [ -d "$target/docs" ]; then
    fail_case "scaffold_abort_does_nothing" "docs/ foi criado (abort nao respeitado)"
    rm -rf "$target"
    return
  fi
  if [ -d "$target/.claude" ]; then
    fail_case "scaffold_abort_does_nothing" ".claude/ foi criado (abort nao respeitado)"
    rm -rf "$target"
    return
  fi

  rm -rf "$target"
  pass_case "scaffold_abort_does_nothing"
}

# ---------------------------------------------------------------------------
# Cenario 10 — Falha limpa sem args
# ---------------------------------------------------------------------------
test_scaffold_missing_args_fails_cleanly() {
  local output exit_code
  output=$(bash "$SCAFFOLD_SH" 2>&1)
  exit_code=$?

  if [ "$exit_code" -eq 0 ]; then
    fail_case "scaffold_missing_args_fails_cleanly" "exit code 0 (esperado != 0)"
    return
  fi
  if ! printf '%s' "$output" | grep -qiE "usage|missing"; then
    fail_case "scaffold_missing_args_fails_cleanly" "output sem 'Usage' ou 'Missing': $output"
    return
  fi
  pass_case "scaffold_missing_args_fails_cleanly"
}

# ---------------------------------------------------------------------------
# Cenario 11 — description do SKILL.md cabe em 1536 chars (limite docs)
# ---------------------------------------------------------------------------
test_bootstrap_description_fits_1536() {
  if [ ! -f "$SKILL_MD" ]; then
    fail_case "bootstrap_description_fits_1536" "SKILL.md nao encontrado: $SKILL_MD"
    return
  fi
  local desc
  desc=$(extract_description "$SKILL_MD")
  if [ -z "$desc" ]; then
    fail_case "bootstrap_description_fits_1536" "description vazio no frontmatter"
    return
  fi
  local len=${#desc}
  if [ "$len" -gt 1536 ]; then
    fail_case "bootstrap_description_fits_1536" "description tem $len chars (limite 1536)"
    return
  fi
  pass_case "bootstrap_description_fits_1536"
}

# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
printf 'Running xp-stack bootstrap skill tests\n'
printf '=======================================\n'
printf 'PLUGIN_DIR: %s\n' "$PLUGIN_DIR"
printf 'SCAFFOLD_SH: %s\n' "$SCAFFOLD_SH"

if ! command -v jq >/dev/null 2>&1; then
  printf '\nFATAL: jq nao encontrado. Instale com: sudo dnf install jq\n'
  exit 2
fi

run_test "1.  templates_exist" test_templates_exist
run_test "2.  scaffold_creates_claude_md_with_substitution" test_scaffold_creates_claude_md_with_substitution
run_test "3.  scaffold_copies_tasks_template" test_scaffold_copies_tasks_template
run_test "4.  scaffold_copies_pesquisas_template" test_scaffold_copies_pesquisas_template
run_test "5.  scaffold_creates_claude_settings" test_scaffold_creates_claude_settings
run_test "6.  scaffold_idempotent" test_scaffold_idempotent
run_test "7.  scaffold_skip_preserves_claude_md" test_scaffold_skip_preserves_claude_md
run_test "8.  scaffold_backup_renames_and_creates" test_scaffold_backup_renames_and_creates
run_test "9.  scaffold_abort_does_nothing" test_scaffold_abort_does_nothing
run_test "10. scaffold_missing_args_fails_cleanly" test_scaffold_missing_args_fails_cleanly
run_test "11. bootstrap_description_fits_1536" test_bootstrap_description_fits_1536

printf '\n=======================================\n'
printf 'Results: %d passed, %d failed\n' "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf 'Failed tests: %s\n' "${FAILED_NAMES[*]}"
  exit 1
fi
exit 0
