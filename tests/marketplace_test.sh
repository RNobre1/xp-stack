#!/usr/bin/env bash
#
# Suite de testes puro bash para validacao estrutural do marketplace
# (.claude-plugin/marketplace.json) e do plugin xp-stack
# (plugins/xp-stack/.claude-plugin/plugin.json).
#
# T1 RED: todos os 9 cenarios DEVEM falhar — manifests ainda nao existem.
#
set -uo pipefail

TEST_FILE="${BASH_SOURCE[0]}"
TEST_DIR="$(cd "$(dirname "$TEST_FILE")" && pwd)"
REPO_ROOT="$(cd "$TEST_DIR/.." && pwd)"

MARKETPLACE_JSON="$REPO_ROOT/.claude-plugin/marketplace.json"
PLUGIN_DIR="$REPO_ROOT/plugins/xp-stack"
PLUGIN_JSON="$PLUGIN_DIR/.claude-plugin/plugin.json"

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

# ---------------------------------------------------------------------------
# Marketplace.json tests
# ---------------------------------------------------------------------------

# 1. marketplace.json é JSON válido
test_marketplace_json_syntax() {
  if [ ! -f "$MARKETPLACE_JSON" ]; then
    fail_case "marketplace_json_syntax" "arquivo nao encontrado: $MARKETPLACE_JSON"
    return
  fi
  if ! jq empty "$MARKETPLACE_JSON" 2>/dev/null; then
    fail_case "marketplace_json_syntax" "JSON invalido"
    return
  fi
  pass_case "marketplace_json_syntax"
}

# 2. marketplace.json tem campos obrigatorios: name, owner.name, plugins (array)
test_marketplace_required_fields() {
  if [ ! -f "$MARKETPLACE_JSON" ]; then
    fail_case "marketplace_required_fields" "arquivo nao encontrado"
    return
  fi
  local name owner_name plugins_type
  name=$(jq -r '.name // empty' "$MARKETPLACE_JSON" 2>/dev/null)
  owner_name=$(jq -r '.owner.name // empty' "$MARKETPLACE_JSON" 2>/dev/null)
  plugins_type=$(jq -r '.plugins | type' "$MARKETPLACE_JSON" 2>/dev/null)

  if [ -z "$name" ]; then
    fail_case "marketplace_required_fields" "campo 'name' ausente ou vazio"
    return
  fi
  if [ -z "$owner_name" ]; then
    fail_case "marketplace_required_fields" "campo 'owner.name' ausente ou vazio"
    return
  fi
  if [ "$plugins_type" != "array" ]; then
    fail_case "marketplace_required_fields" "'plugins' nao e array (tipo: $plugins_type)"
    return
  fi
  pass_case "marketplace_required_fields"
}

# 3. cada entrada em plugins[] tem name, description, source
test_plugin_entry_valid() {
  if [ ! -f "$MARKETPLACE_JSON" ]; then
    fail_case "plugin_entry_valid" "arquivo nao encontrado"
    return
  fi
  local count i entry_name entry_desc entry_source
  count=$(jq '.plugins | length' "$MARKETPLACE_JSON" 2>/dev/null)
  if [ "$count" -eq 0 ]; then
    fail_case "plugin_entry_valid" "plugins[] esta vazio"
    return
  fi
  for ((i = 0; i < count; i++)); do
    entry_name=$(jq -r ".plugins[$i].name // empty" "$MARKETPLACE_JSON")
    entry_desc=$(jq -r ".plugins[$i].description // empty" "$MARKETPLACE_JSON")
    entry_source=$(jq -r ".plugins[$i].source // empty" "$MARKETPLACE_JSON")
    if [ -z "$entry_name" ] || [ -z "$entry_desc" ] || [ -z "$entry_source" ]; then
      fail_case "plugin_entry_valid" "plugins[$i] falta name/description/source (name='$entry_name', desc='$entry_desc', source='$entry_source')"
      return
    fi
  done
  pass_case "plugin_entry_valid"
}

# 4. para cada plugin com source local, o diretorio existe e contem plugin.json
test_source_dir_exists() {
  if [ ! -f "$MARKETPLACE_JSON" ]; then
    fail_case "source_dir_exists" "arquivo nao encontrado"
    return
  fi
  local count i source resolved_path
  count=$(jq '.plugins | length' "$MARKETPLACE_JSON" 2>/dev/null)
  for ((i = 0; i < count; i++)); do
    source=$(jq -r ".plugins[$i].source // empty" "$MARKETPLACE_JSON")
    # sources que comecam com ./ sao locais
    if [[ "$source" == ./* ]]; then
      resolved_path="$REPO_ROOT/${source#./}"
      if [ ! -d "$resolved_path" ]; then
        fail_case "source_dir_exists" "diretorio nao encontrado: $resolved_path"
        return
      fi
      if [ ! -f "$resolved_path/.claude-plugin/plugin.json" ]; then
        fail_case "source_dir_exists" "plugin.json nao encontrado em $resolved_path/.claude-plugin/"
        return
      fi
    fi
  done
  pass_case "source_dir_exists"
}

# 5. sem nomes duplicados em plugins[]
test_no_duplicate_names() {
  if [ ! -f "$MARKETPLACE_JSON" ]; then
    fail_case "no_duplicate_names" "arquivo nao encontrado"
    return
  fi
  local duplicates
  duplicates=$(jq -r '.plugins[].name' "$MARKETPLACE_JSON" 2>/dev/null | sort | uniq -d)
  if [ -n "$duplicates" ]; then
    fail_case "no_duplicate_names" "nomes duplicados: $duplicates"
    return
  fi
  pass_case "no_duplicate_names"
}

# ---------------------------------------------------------------------------
# Plugin.json tests
# ---------------------------------------------------------------------------

# 6. plugin.json é JSON válido
test_plugin_json_syntax() {
  if [ ! -f "$PLUGIN_JSON" ]; then
    fail_case "plugin_json_syntax" "arquivo nao encontrado: $PLUGIN_JSON"
    return
  fi
  if ! jq empty "$PLUGIN_JSON" 2>/dev/null; then
    fail_case "plugin_json_syntax" "JSON invalido"
    return
  fi
  pass_case "plugin_json_syntax"
}

# 7. plugin.json tem campos obrigatorios: name, version, description, author.name
test_plugin_required_fields() {
  if [ ! -f "$PLUGIN_JSON" ]; then
    fail_case "plugin_required_fields" "arquivo nao encontrado"
    return
  fi
  local name version description author_name
  name=$(jq -r '.name // empty' "$PLUGIN_JSON" 2>/dev/null)
  version=$(jq -r '.version // empty' "$PLUGIN_JSON" 2>/dev/null)
  description=$(jq -r '.description // empty' "$PLUGIN_JSON" 2>/dev/null)
  author_name=$(jq -r '.author.name // empty' "$PLUGIN_JSON" 2>/dev/null)

  if [ -z "$name" ]; then
    fail_case "plugin_required_fields" "campo 'name' ausente"
    return
  fi
  if [ -z "$version" ]; then
    fail_case "plugin_required_fields" "campo 'version' ausente"
    return
  fi
  if [ -z "$description" ]; then
    fail_case "plugin_required_fields" "campo 'description' ausente"
    return
  fi
  if [ -z "$author_name" ]; then
    fail_case "plugin_required_fields" "campo 'author.name' ausente"
    return
  fi
  pass_case "plugin_required_fields"
}

# 8. name no plugin.json bate com name no marketplace.json
test_plugin_name_matches() {
  if [ ! -f "$PLUGIN_JSON" ] || [ ! -f "$MARKETPLACE_JSON" ]; then
    fail_case "plugin_name_matches" "arquivo(s) nao encontrado(s)"
    return
  fi
  local plugin_name marketplace_name
  plugin_name=$(jq -r '.name' "$PLUGIN_JSON" 2>/dev/null)
  # pega o name do primeiro plugin que aponta pra ./plugins/xp-stack
  marketplace_name=$(jq -r '.plugins[] | select(.source == "./plugins/xp-stack") | .name' "$MARKETPLACE_JSON" 2>/dev/null)

  if [ -z "$marketplace_name" ]; then
    fail_case "plugin_name_matches" "nenhum plugin com source ./plugins/xp-stack no marketplace.json"
    return
  fi
  if [ "$plugin_name" != "$marketplace_name" ]; then
    fail_case "plugin_name_matches" "nome diverge: plugin.json='$plugin_name' vs marketplace.json='$marketplace_name'"
    return
  fi
  pass_case "plugin_name_matches"
}

# 9. version segue SemVer basico (X.Y.Z)
test_version_semver() {
  if [ ! -f "$PLUGIN_JSON" ]; then
    fail_case "version_semver" "arquivo nao encontrado"
    return
  fi
  local version
  version=$(jq -r '.version // empty' "$PLUGIN_JSON" 2>/dev/null)
  if [ -z "$version" ]; then
    fail_case "version_semver" "campo 'version' ausente"
    return
  fi
  if ! printf '%s' "$version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    fail_case "version_semver" "version '$version' nao segue SemVer (X.Y.Z)"
    return
  fi
  pass_case "version_semver"
}

# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
printf 'Running marketplace validation tests\n'
printf '=====================================\n'
printf 'MARKETPLACE_JSON: %s\n' "$MARKETPLACE_JSON"
printf 'PLUGIN_JSON:      %s\n' "$PLUGIN_JSON"

if ! command -v jq >/dev/null 2>&1; then
  printf '\nFATAL: jq nao encontrado. Instale com: sudo dnf install jq\n'
  exit 2
fi

if [ ! -f "$MARKETPLACE_JSON" ]; then
  printf '\nWARNING: marketplace.json not found.\n'
  printf '         Expected during Fase 1 (RED) — all tests should fail.\n'
fi

run_test "1. marketplace_json_syntax" test_marketplace_json_syntax
run_test "2. marketplace_required_fields" test_marketplace_required_fields
run_test "3. plugin_entry_valid" test_plugin_entry_valid
run_test "4. source_dir_exists" test_source_dir_exists
run_test "5. no_duplicate_names" test_no_duplicate_names
run_test "6. plugin_json_syntax" test_plugin_json_syntax
run_test "7. plugin_required_fields" test_plugin_required_fields
run_test "8. plugin_name_matches" test_plugin_name_matches
run_test "9. version_semver" test_version_semver

printf '\n=====================================\n'
printf 'Results: %d passed, %d failed\n' "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf 'Failed tests: %s\n' "${FAILED_NAMES[*]}"
  exit 1
fi
exit 0
