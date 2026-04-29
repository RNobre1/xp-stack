#!/usr/bin/env bash
#
# Suite de testes puro bash para a skill paperclip-orchestrator do xp-stack.
# RED: testes falham ate T3 criar a skill.
#
set -uo pipefail

TEST_FILE="${BASH_SOURCE[0]}"
TEST_DIR="$(cd "$(dirname "$TEST_FILE")" && pwd)"
REPO_ROOT="$(cd "$TEST_DIR/.." && pwd)"

PLUGIN_DIR="$REPO_ROOT/plugins/xp-stack"
SKILL_DIR="$PLUGIN_DIR/skills/paperclip-orchestrator"
SKILL_MD="$SKILL_DIR/SKILL.md"
SETUP_SH="$SKILL_DIR/scripts/setup-paperclip.sh"
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
# Cenario 2 — setup-paperclip.sh existe + executavel
# ---------------------------------------------------------------------------
test_setup_script_exists_and_executable() {
  if [ ! -f "$SETUP_SH" ]; then
    fail_case "setup_script_exists_and_executable" "$SETUP_SH nao encontrado"
    return
  fi
  if [ ! -x "$SETUP_SH" ]; then
    fail_case "setup_script_exists_and_executable" "$SETUP_SH nao eh executavel"
    return
  fi
  # Syntax valido
  if ! bash -n "$SETUP_SH" 2>/dev/null; then
    fail_case "setup_script_exists_and_executable" "$SETUP_SH tem erro de sintaxe"
    return
  fi
  pass_case "setup_script_exists_and_executable"
}

# ---------------------------------------------------------------------------
# Cenario 3 — 8 templates existem (5 .md + 1 .yml + 2 .sh)
# ---------------------------------------------------------------------------
test_templates_exist() {
  local missing=()
  for t in playbook AGENTS-dev-primary AGENTS-reviewer dispatch-cheatsheet licoes; do
    if [ ! -f "$TEMPLATES_DIR/${t}.md.template" ]; then
      missing+=("${t}.md.template")
    fi
  done
  if [ ! -f "$TEMPLATES_DIR/auto-merge.yml.template" ]; then
    missing+=("auto-merge.yml.template")
  fi
  for s in check-reviewer-approval check-always-human; do
    if [ ! -f "$TEMPLATES_DIR/${s}.sh.template" ]; then
      missing+=("${s}.sh.template")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    fail_case "templates_exist" "templates ausentes: ${missing[*]}"
    return
  fi
  pass_case "templates_exist"
}

# ---------------------------------------------------------------------------
# Cenario 4 — setup em diretorio limpo cria todos os arquivos esperados
# ---------------------------------------------------------------------------
test_setup_creates_files_in_clean_dir() {
  if [ ! -x "$SETUP_SH" ]; then
    fail_case "setup_creates_files_in_clean_dir" "setup-paperclip.sh nao executavel — depende do cenario 2"
    return
  fi
  local target
  target=$(mktemp -d)

  bash "$SETUP_SH" "$target" >/dev/null 2>&1

  local missing=()
  for f in playbook AGENTS-dev-primary AGENTS-reviewer dispatch-cheatsheet licoes; do
    if [ ! -f "$target/local/paperclip/${f}.md" ]; then
      missing+=("local/paperclip/${f}.md")
    fi
  done
  if [ ! -f "$target/.github/workflows/auto-merge.yml" ]; then
    missing+=(".github/workflows/auto-merge.yml")
  fi
  for s in check-reviewer-approval check-always-human; do
    if [ ! -x "$target/scripts/${s}.sh" ]; then
      missing+=("scripts/${s}.sh (nao existe ou nao executavel)")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    fail_case "setup_creates_files_in_clean_dir" "arquivos ausentes: ${missing[*]}"
    rm -rf "$target"
    return
  fi

  rm -rf "$target"
  pass_case "setup_creates_files_in_clean_dir"
}

# ---------------------------------------------------------------------------
# Cenario 5 — Idempotencia (2x execucao nao muda mtimes)
# ---------------------------------------------------------------------------
test_setup_idempotent() {
  if [ ! -x "$SETUP_SH" ]; then
    fail_case "setup_idempotent" "setup-paperclip.sh nao executavel — depende do cenario 2"
    return
  fi
  local target
  target=$(mktemp -d)

  bash "$SETUP_SH" "$target" >/dev/null 2>&1
  if [ ! -f "$target/local/paperclip/playbook.md" ]; then
    fail_case "setup_idempotent" "playbook.md nao criado na 1a execucao"
    rm -rf "$target"
    return
  fi

  local mtime_before
  mtime_before=$(stat -c '%Y' "$target/local/paperclip/playbook.md" 2>/dev/null)
  sleep 1
  bash "$SETUP_SH" "$target" >/dev/null 2>&1
  local mtime_after
  mtime_after=$(stat -c '%Y' "$target/local/paperclip/playbook.md" 2>/dev/null)

  if [ "$mtime_before" != "$mtime_after" ]; then
    fail_case "setup_idempotent" "playbook.md mtime mudou ($mtime_before -> $mtime_after)"
    rm -rf "$target"
    return
  fi

  rm -rf "$target"
  pass_case "setup_idempotent"
}

# ---------------------------------------------------------------------------
# Cenario 6 — setup adiciona local/ no .gitignore
# ---------------------------------------------------------------------------
test_setup_adds_local_to_gitignore() {
  if [ ! -x "$SETUP_SH" ]; then
    fail_case "setup_adds_local_to_gitignore" "setup-paperclip.sh nao executavel — depende do cenario 2"
    return
  fi
  local target
  target=$(mktemp -d)

  # Sem .gitignore preexistente
  bash "$SETUP_SH" "$target" >/dev/null 2>&1

  if [ ! -f "$target/.gitignore" ]; then
    fail_case "setup_adds_local_to_gitignore" ".gitignore nao criado"
    rm -rf "$target"
    return
  fi
  if ! grep -qxF "local/" "$target/.gitignore"; then
    fail_case "setup_adds_local_to_gitignore" "local/ nao adicionado no .gitignore"
    rm -rf "$target"
    return
  fi

  # Idempotencia: 2a execucao nao duplica
  bash "$SETUP_SH" "$target" >/dev/null 2>&1
  local count
  count=$(grep -cxF "local/" "$target/.gitignore")
  if [ "$count" != "1" ]; then
    fail_case "setup_adds_local_to_gitignore" "local/ duplicado (count=$count)"
    rm -rf "$target"
    return
  fi

  rm -rf "$target"
  pass_case "setup_adds_local_to_gitignore"
}

# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
printf 'Running xp-stack paperclip-orchestrator skill tests\n'
printf '====================================================\n'
printf 'PLUGIN_DIR: %s\n' "$PLUGIN_DIR"
printf 'SKILL_DIR:  %s\n' "$SKILL_DIR"

run_test "1. skill_md_description_fits" test_skill_md_description_fits
run_test "2. setup_script_exists_and_executable" test_setup_script_exists_and_executable
run_test "3. templates_exist" test_templates_exist
run_test "4. setup_creates_files_in_clean_dir" test_setup_creates_files_in_clean_dir
run_test "5. setup_idempotent" test_setup_idempotent
run_test "6. setup_adds_local_to_gitignore" test_setup_adds_local_to_gitignore

printf '\n====================================================\n'
printf 'Results: %d passed, %d failed\n' "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf 'Failed tests: %s\n' "${FAILED_NAMES[*]}"
  exit 1
fi
exit 0
