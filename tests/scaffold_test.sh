#!/usr/bin/env bash
#
# Suite de testes puro bash para
# plugins/poc-bootstrap/skills/scaffold/scripts/scaffold.sh
#
# Fase 1 (RED) de T1: todos os 5 cenarios DEVEM falhar, porque scaffold.sh
# ainda nao existe. O objetivo desta fase e garantir que o harness de teste
# esta correto (sem erros de sintaxe), que as asserts cobrem os contratos
# certos, e que o RED aparece pelos motivos certos — nao por bug do test runner.
#
set -uo pipefail

TEST_FILE="${BASH_SOURCE[0]}"
TEST_DIR="$(cd "$(dirname "$TEST_FILE")" && pwd)"
REPO_ROOT="$(cd "$TEST_DIR/.." && pwd)"
SCAFFOLD_SH="$REPO_ROOT/plugins/poc-bootstrap/skills/scaffold/scripts/scaffold.sh"

PASS=0
FAIL=0
FAILED_NAMES=()
TMP_DIRS=()

cleanup() {
  local d
  for d in "${TMP_DIRS[@]:-}"; do
    [ -d "$d" ] && rm -rf "$d"
  done
}
trap cleanup EXIT

make_target() {
  local d
  d=$(mktemp -d -t scaffold-test-XXXXXX)
  TMP_DIRS+=("$d")
  printf '%s' "$d"
}

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

# -----------------------------------------------------------------------------
# 1. happy path: target vazio recebe SENTINEL.md com conteudo esperado
# -----------------------------------------------------------------------------
test_happy_path_copies_sentinel() {
  local target output code
  target=$(make_target)

  output=$(bash "$SCAFFOLD_SH" "$target" 2>&1)
  code=$?

  if [ "$code" -ne 0 ]; then
    fail_case "happy_path_copies_sentinel" "exit code $code (output: $output)"
    return
  fi
  if [ ! -f "$target/SENTINEL.md" ]; then
    fail_case "happy_path_copies_sentinel" "SENTINEL.md nao foi criado em $target"
    return
  fi
  if ! grep -q "POC_SENTINEL_FILE" "$target/SENTINEL.md"; then
    fail_case "happy_path_copies_sentinel" "SENTINEL.md nao contem POC_SENTINEL_FILE"
    return
  fi
  pass_case "happy_path_copies_sentinel"
}

# -----------------------------------------------------------------------------
# 2. idempotencia: segunda execucao nao altera mtime do arquivo existente
# -----------------------------------------------------------------------------
test_idempotent_no_clobber() {
  local target mtime1 mtime2
  target=$(make_target)

  if ! bash "$SCAFFOLD_SH" "$target" >/dev/null 2>&1; then
    fail_case "idempotent_no_clobber" "primeira execucao falhou"
    return
  fi
  if [ ! -f "$target/SENTINEL.md" ]; then
    fail_case "idempotent_no_clobber" "SENTINEL.md ausente apos primeira execucao"
    return
  fi
  mtime1=$(stat -c '%Y' "$target/SENTINEL.md")

  sleep 1

  if ! bash "$SCAFFOLD_SH" "$target" >/dev/null 2>&1; then
    fail_case "idempotent_no_clobber" "segunda execucao falhou"
    return
  fi
  mtime2=$(stat -c '%Y' "$target/SENTINEL.md")

  if [ "$mtime1" != "$mtime2" ]; then
    fail_case "idempotent_no_clobber" "mtime mudou entre execucoes ($mtime1 -> $mtime2)"
    return
  fi
  pass_case "idempotent_no_clobber"
}

# -----------------------------------------------------------------------------
# 3. preserva arquivo pre-existente no target (cp -n nao sobrescreve)
# -----------------------------------------------------------------------------
test_preserves_existing_file() {
  local target
  target=$(make_target)

  printf 'USER_MODIFIED_CONTENT_XYZ\n' > "$target/SENTINEL.md"

  if ! bash "$SCAFFOLD_SH" "$target" >/dev/null 2>&1; then
    fail_case "preserves_existing_file" "scaffold.sh falhou em presenca de arquivo pre-existente"
    return
  fi
  if ! grep -q "USER_MODIFIED_CONTENT_XYZ" "$target/SENTINEL.md"; then
    fail_case "preserves_existing_file" "conteudo do usuario foi perdido"
    return
  fi
  if grep -q "POC_SENTINEL_FILE" "$target/SENTINEL.md"; then
    fail_case "preserves_existing_file" "template sobrescreveu arquivo do usuario"
    return
  fi
  pass_case "preserves_existing_file"
}

# -----------------------------------------------------------------------------
# 4. scaffold.sh sem argumento falha com exit != 0 e mensagem "Usage"
# -----------------------------------------------------------------------------
test_missing_arg_fails() {
  local output code

  output=$(bash "$SCAFFOLD_SH" 2>&1)
  code=$?

  if [ "$code" -eq 0 ]; then
    fail_case "missing_arg_fails" "scaffold.sh retornou 0 sem argumento"
    return
  fi
  if ! printf '%s' "$output" | grep -qi "usage"; then
    fail_case "missing_arg_fails" "stderr nao contem 'Usage' (output bruto: $output)"
    return
  fi
  pass_case "missing_arg_fails"
}

# -----------------------------------------------------------------------------
# 5. path com espacos no nome: aspas corretas em todo o pipeline
#    Motivo: o O Agente vive em /home/rnobre/Área de trabalho/Meteora/o-agente,
#    entao qualquer bootstrap real em projeto receptor vai bater nisso.
# -----------------------------------------------------------------------------
test_path_with_spaces() {
  local parent target
  parent=$(make_target)
  target="$parent/dir with spaces/target"

  if ! bash "$SCAFFOLD_SH" "$target" >/dev/null 2>&1; then
    fail_case "path_with_spaces" "scaffold.sh falhou em path com espacos"
    return
  fi
  if [ ! -f "$target/SENTINEL.md" ]; then
    fail_case "path_with_spaces" "SENTINEL.md nao criado em '$target'"
    return
  fi
  if ! grep -q "POC_SENTINEL_FILE" "$target/SENTINEL.md"; then
    fail_case "path_with_spaces" "SENTINEL.md em path com espacos nao contem POC_SENTINEL_FILE"
    return
  fi
  pass_case "path_with_spaces"
}

# -----------------------------------------------------------------------------
# Runner
# -----------------------------------------------------------------------------
printf 'Running scaffold.sh tests\n'
printf '=========================\n'
printf 'SCAFFOLD_SH: %s\n' "$SCAFFOLD_SH"

if [ ! -f "$SCAFFOLD_SH" ]; then
  printf '\nWARNING: scaffold.sh not found at above path.\n'
  printf '         Expected during Fase 1 (RED) of T1 — all 5 tests should fail.\n'
fi

if command -v shellcheck >/dev/null 2>&1; then
  printf '\nshellcheck: %s\n' "$(shellcheck --version 2>/dev/null | awk '/^version:/ {print $2}')"
else
  printf '\nshellcheck not installed, skipping static analysis\n'
fi

run_test "1. happy_path_copies_sentinel" test_happy_path_copies_sentinel
run_test "2. idempotent_no_clobber" test_idempotent_no_clobber
run_test "3. preserves_existing_file" test_preserves_existing_file
run_test "4. missing_arg_fails" test_missing_arg_fails
run_test "5. path_with_spaces" test_path_with_spaces

printf '\n=========================\n'
printf 'Results: %d passed, %d failed\n' "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf 'Failed tests: %s\n' "${FAILED_NAMES[*]}"
  exit 1
fi
exit 0
