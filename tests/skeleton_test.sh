#!/usr/bin/env bash
#
# Suite de testes puro bash para validacao estrutural do skeleton
# do plugin xp-stack (dirs, SKILL.md frontmatter, agents, templates, mcp).
#
# T2 RED: todos os 12 cenarios DEVEM falhar — skeleton ainda nao existe.
#
set -uo pipefail

TEST_FILE="${BASH_SOURCE[0]}"
TEST_DIR="$(cd "$(dirname "$TEST_FILE")" && pwd)"
REPO_ROOT="$(cd "$TEST_DIR/.." && pwd)"

PLUGIN_DIR="$REPO_ROOT/plugins/xp-stack"

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

# Helper: extrai frontmatter YAML entre os dois ---
extract_frontmatter() {
  local file="$1"
  sed -n '2,/^---$/p' "$file" | head -n -1
}

# ---------------------------------------------------------------------------
# Skills tests
# ---------------------------------------------------------------------------

EXPECTED_SKILLS=("akita-xp-rules" "tdd-conventions" "task-decomposition" "research-cycle" "bootstrap")

# 1. cada skill declarada tem diretorio
test_skills_dirs_exist() {
  local skill missing=()
  for skill in "${EXPECTED_SKILLS[@]}"; do
    if [ ! -d "$PLUGIN_DIR/skills/$skill" ]; then
      missing+=("$skill")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    fail_case "skills_dirs_exist" "diretorios ausentes: ${missing[*]}"
    return
  fi
  pass_case "skills_dirs_exist"
}

# 2. cada diretorio de skill contem SKILL.md
test_skills_have_skillmd() {
  local skill missing=()
  for skill in "${EXPECTED_SKILLS[@]}"; do
    if [ ! -f "$PLUGIN_DIR/skills/$skill/SKILL.md" ]; then
      missing+=("$skill")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    fail_case "skills_have_skillmd" "SKILL.md ausente em: ${missing[*]}"
    return
  fi
  pass_case "skills_have_skillmd"
}

# 3. cada SKILL.md comeca com --- e tem description no frontmatter
test_skillmd_has_frontmatter() {
  local skill fm
  for skill in "${EXPECTED_SKILLS[@]}"; do
    local skillmd="$PLUGIN_DIR/skills/$skill/SKILL.md"
    if [ ! -f "$skillmd" ]; then
      fail_case "skillmd_has_frontmatter" "SKILL.md nao encontrado: $skill"
      return
    fi
    if ! head -1 "$skillmd" | grep -q '^---$'; then
      fail_case "skillmd_has_frontmatter" "$skill/SKILL.md nao comeca com ---"
      return
    fi
    fm=$(extract_frontmatter "$skillmd")
    if ! printf '%s' "$fm" | grep -q 'description:'; then
      fail_case "skillmd_has_frontmatter" "$skill/SKILL.md sem 'description' no frontmatter"
      return
    fi
  done
  pass_case "skillmd_has_frontmatter"
}

# 4. bootstrap tem scripts/scaffold.sh executavel
test_bootstrap_has_scaffold_sh() {
  local scaffold="$PLUGIN_DIR/skills/bootstrap/scripts/scaffold.sh"
  if [ ! -f "$scaffold" ]; then
    fail_case "bootstrap_has_scaffold_sh" "scaffold.sh nao encontrado: $scaffold"
    return
  fi
  if [ ! -x "$scaffold" ]; then
    fail_case "bootstrap_has_scaffold_sh" "scaffold.sh nao e executavel"
    return
  fi
  pass_case "bootstrap_has_scaffold_sh"
}

# ---------------------------------------------------------------------------
# Agents tests
# ---------------------------------------------------------------------------

EXPECTED_AGENTS=("researcher.md" "research-critic.md" "tdd.md" "reviewer.md")

# 5. agents/ existe
test_agents_dir_exists() {
  if [ ! -d "$PLUGIN_DIR/agents" ]; then
    fail_case "agents_dir_exists" "diretorio agents/ nao encontrado"
    return
  fi
  pass_case "agents_dir_exists"
}

# 6. todos os agents existem
test_agents_files_exist() {
  local agent missing=()
  for agent in "${EXPECTED_AGENTS[@]}"; do
    if [ ! -f "$PLUGIN_DIR/agents/$agent" ]; then
      missing+=("$agent")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    fail_case "agents_files_exist" "arquivos ausentes: ${missing[*]}"
    return
  fi
  pass_case "agents_files_exist"
}

# 7. cada agent .md tem frontmatter com name e description
test_agents_have_frontmatter() {
  local agent fm
  for agent in "${EXPECTED_AGENTS[@]}"; do
    local agentmd="$PLUGIN_DIR/agents/$agent"
    if [ ! -f "$agentmd" ]; then
      fail_case "agents_have_frontmatter" "$agent nao encontrado"
      return
    fi
    if ! head -1 "$agentmd" | grep -q '^---$'; then
      fail_case "agents_have_frontmatter" "$agent nao comeca com ---"
      return
    fi
    fm=$(extract_frontmatter "$agentmd")
    if ! printf '%s' "$fm" | grep -q 'name:'; then
      fail_case "agents_have_frontmatter" "$agent sem 'name' no frontmatter"
      return
    fi
    if ! printf '%s' "$fm" | grep -q 'description:'; then
      fail_case "agents_have_frontmatter" "$agent sem 'description' no frontmatter"
      return
    fi
  done
  pass_case "agents_have_frontmatter"
}

# ---------------------------------------------------------------------------
# Templates tests
# ---------------------------------------------------------------------------

# 8. templates/ existe
test_templates_dir_exists() {
  if [ ! -d "$PLUGIN_DIR/templates" ]; then
    fail_case "templates_dir_exists" "diretorio templates/ nao encontrado"
    return
  fi
  pass_case "templates_dir_exists"
}

# 9. templates contem arquivos core
test_templates_core_files() {
  local missing=()
  [ ! -f "$PLUGIN_DIR/templates/CLAUDE.md.template" ] && missing+=("CLAUDE.md.template")
  [ ! -f "$PLUGIN_DIR/templates/claude-settings-project.json" ] && missing+=("claude-settings-project.json")
  [ ! -d "$PLUGIN_DIR/templates/docs-tasks-template" ] && missing+=("docs-tasks-template/")
  [ ! -d "$PLUGIN_DIR/templates/docs-pesquisas-template" ] && missing+=("docs-pesquisas-template/")
  if [ ${#missing[@]} -gt 0 ]; then
    fail_case "templates_core_files" "ausentes: ${missing[*]}"
    return
  fi
  pass_case "templates_core_files"
}

# ---------------------------------------------------------------------------
# MCP + meta-files tests
# ---------------------------------------------------------------------------

# 10. .mcp.json e JSON valido
test_mcp_json_valid() {
  local mcpfile="$PLUGIN_DIR/.mcp.json"
  if [ ! -f "$mcpfile" ]; then
    fail_case "mcp_json_valid" ".mcp.json nao encontrado"
    return
  fi
  if ! jq empty "$mcpfile" 2>/dev/null; then
    fail_case "mcp_json_valid" ".mcp.json nao e JSON valido"
    return
  fi
  pass_case "mcp_json_valid"
}

# 11. README.md do plugin existe
test_readme_exists() {
  if [ ! -f "$PLUGIN_DIR/README.md" ]; then
    fail_case "readme_exists" "README.md nao encontrado em $PLUGIN_DIR"
    return
  fi
  pass_case "readme_exists"
}

# 12. LICENSE do plugin existe
test_license_exists() {
  if [ ! -f "$PLUGIN_DIR/LICENSE" ]; then
    fail_case "license_exists" "LICENSE nao encontrado em $PLUGIN_DIR"
    return
  fi
  pass_case "license_exists"
}

# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
printf 'Running xp-stack skeleton validation tests\n'
printf '===========================================\n'
printf 'PLUGIN_DIR: %s\n' "$PLUGIN_DIR"

if ! command -v jq >/dev/null 2>&1; then
  printf '\nFATAL: jq nao encontrado. Instale com: sudo dnf install jq\n'
  exit 2
fi

run_test "1.  skills_dirs_exist" test_skills_dirs_exist
run_test "2.  skills_have_skillmd" test_skills_have_skillmd
run_test "3.  skillmd_has_frontmatter" test_skillmd_has_frontmatter
run_test "4.  bootstrap_has_scaffold_sh" test_bootstrap_has_scaffold_sh
run_test "5.  agents_dir_exists" test_agents_dir_exists
run_test "6.  agents_files_exist" test_agents_files_exist
run_test "7.  agents_have_frontmatter" test_agents_have_frontmatter
run_test "8.  templates_dir_exists" test_templates_dir_exists
run_test "9.  templates_core_files" test_templates_core_files
run_test "10. mcp_json_valid" test_mcp_json_valid
run_test "11. readme_exists" test_readme_exists
run_test "12. license_exists" test_license_exists

printf '\n===========================================\n'
printf 'Results: %d passed, %d failed\n' "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf 'Failed tests: %s\n' "${FAILED_NAMES[*]}"
  exit 1
fi
exit 0
