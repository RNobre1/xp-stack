#!/usr/bin/env bash
#
# Suite de testes puro bash para a skill local-waves do xp-stack.
# RED: testes falham ate T4 criar a skill.
#
set -uo pipefail

TEST_FILE="${BASH_SOURCE[0]}"
TEST_DIR="$(cd "$(dirname "$TEST_FILE")" && pwd)"
REPO_ROOT="$(cd "$TEST_DIR/.." && pwd)"

PLUGIN_DIR="$REPO_ROOT/plugins/xp-stack"
SKILL_DIR="$PLUGIN_DIR/skills/local-waves"
SKILL_MD="$SKILL_DIR/SKILL.md"
SETUP_SH="$SKILL_DIR/scripts/setup-local-waves.sh"
TEMPLATES_DIR="$SKILL_DIR/templates"

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
# Cenario 1 — SKILL.md existe + description cabe em 1536 chars
# ---------------------------------------------------------------------------
test_skill_md_description_fits() {
  if [ ! -f "$SKILL_MD" ]; then
    fail_case "skill_md_description_fits" "SKILL.md nao encontrado: $SKILL_MD"
    return
  fi
  local desc
  desc=$(extract_description "$SKILL_MD")
  if [ -z "$desc" ]; then
    fail_case "skill_md_description_fits" "description vazio no frontmatter"
    return
  fi
  local len=${#desc}
  if [ "$len" -gt 1536 ]; then
    fail_case "skill_md_description_fits" "description tem $len chars (limite 1536)"
    return
  fi
  pass_case "skill_md_description_fits"
}

# ---------------------------------------------------------------------------
# Cenario 2 — setup-local-waves.sh existe + executavel + sintaxe ok
# ---------------------------------------------------------------------------
test_setup_script_exists() {
  if [ ! -f "$SETUP_SH" ]; then
    fail_case "setup_script_exists" "$SETUP_SH nao encontrado"
    return
  fi
  if [ ! -x "$SETUP_SH" ]; then
    fail_case "setup_script_exists" "$SETUP_SH nao eh executavel"
    return
  fi
  if ! bash -n "$SETUP_SH" 2>/dev/null; then
    fail_case "setup_script_exists" "$SETUP_SH tem erro de sintaxe"
    return
  fi
  pass_case "setup_script_exists"
}

# ---------------------------------------------------------------------------
# Cenario 3 — orchestrate-wave.sh.template + README.md.template existem
# ---------------------------------------------------------------------------
test_templates_exist() {
  local missing=()
  if [ ! -f "$TEMPLATES_DIR/orchestrate-wave.sh.template" ]; then
    missing+=("orchestrate-wave.sh.template")
  fi
  if [ ! -f "$TEMPLATES_DIR/README.md.template" ]; then
    missing+=("README.md.template")
  fi
  if [ ${#missing[@]} -gt 0 ]; then
    fail_case "templates_exist" "templates ausentes: ${missing[*]}"
    return
  fi
  # Syntax do orchestrate-wave.sh template precisa ser bash valido
  if ! bash -n "$TEMPLATES_DIR/orchestrate-wave.sh.template" 2>/dev/null; then
    fail_case "templates_exist" "orchestrate-wave.sh.template tem erro de sintaxe"
    return
  fi
  pass_case "templates_exist"
}

# ---------------------------------------------------------------------------
# Cenario 4 — setup cria scripts/orchestrate/ + .gitignore entries
# ---------------------------------------------------------------------------
test_setup_creates_files() {
  if [ ! -x "$SETUP_SH" ]; then
    fail_case "setup_creates_files" "setup-local-waves.sh nao executavel — depende do cenario 2"
    return
  fi
  local target
  target=$(mktemp -d)

  bash "$SETUP_SH" "$target" >/dev/null 2>&1

  if [ ! -x "$target/scripts/orchestrate/orchestrate-wave.sh" ]; then
    fail_case "setup_creates_files" "scripts/orchestrate/orchestrate-wave.sh ausente ou nao executavel"
    rm -rf "$target"
    return
  fi
  if [ ! -f "$target/scripts/orchestrate/README.md" ]; then
    fail_case "setup_creates_files" "scripts/orchestrate/README.md ausente"
    rm -rf "$target"
    return
  fi
  if ! grep -qxF ".claude/wave-runs/" "$target/.gitignore" 2>/dev/null; then
    fail_case "setup_creates_files" ".claude/wave-runs/ nao adicionado ao .gitignore"
    rm -rf "$target"
    return
  fi

  rm -rf "$target"
  pass_case "setup_creates_files"
}

# ---------------------------------------------------------------------------
# Cenario 5 — Idempotencia (2x execucao nao muda mtimes)
# ---------------------------------------------------------------------------
test_setup_idempotent() {
  if [ ! -x "$SETUP_SH" ]; then
    fail_case "setup_idempotent" "setup-local-waves.sh nao executavel — depende do cenario 2"
    return
  fi
  local target
  target=$(mktemp -d)

  bash "$SETUP_SH" "$target" >/dev/null 2>&1
  if [ ! -f "$target/scripts/orchestrate/orchestrate-wave.sh" ]; then
    fail_case "setup_idempotent" "orchestrate-wave.sh nao criado na 1a execucao"
    rm -rf "$target"
    return
  fi

  local mtime_before
  mtime_before=$(stat -c '%Y' "$target/scripts/orchestrate/orchestrate-wave.sh" 2>/dev/null)
  sleep 1
  bash "$SETUP_SH" "$target" >/dev/null 2>&1
  local mtime_after
  mtime_after=$(stat -c '%Y' "$target/scripts/orchestrate/orchestrate-wave.sh" 2>/dev/null)

  if [ "$mtime_before" != "$mtime_after" ]; then
    fail_case "setup_idempotent" "orchestrate-wave.sh mtime mudou ($mtime_before -> $mtime_after)"
    rm -rf "$target"
    return
  fi

  # .gitignore sem duplicatas
  local count
  count=$(grep -cxF ".claude/wave-runs/" "$target/.gitignore")
  if [ "$count" != "1" ]; then
    fail_case "setup_idempotent" ".claude/wave-runs/ duplicado em .gitignore (count=$count)"
    rm -rf "$target"
    return
  fi

  rm -rf "$target"
  pass_case "setup_idempotent"
}

# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
printf 'Running xp-stack local-waves skill tests\n'
printf '=========================================\n'
printf 'PLUGIN_DIR: %s\n' "$PLUGIN_DIR"
printf 'SKILL_DIR:  %s\n' "$SKILL_DIR"

run_test "1. skill_md_description_fits" test_skill_md_description_fits
run_test "2. setup_script_exists" test_setup_script_exists
run_test "3. templates_exist" test_templates_exist
run_test "4. setup_creates_files" test_setup_creates_files
run_test "5. setup_idempotent" test_setup_idempotent

printf '\n=========================================\n'
printf 'Results: %d passed, %d failed\n' "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf 'Failed tests: %s\n' "${FAILED_NAMES[*]}"
  exit 1
fi
exit 0
