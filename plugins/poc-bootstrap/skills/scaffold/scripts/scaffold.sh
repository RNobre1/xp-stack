#!/usr/bin/env bash
#
# scaffold.sh — copia arquivos de ../templates/ para o target dir passado como $1.
#
# Standalone-testavel: deriva seu proprio dir via $BASH_SOURCE, nao depende de
# ${CLAUDE_SKILL_DIR}. O uso real pelo Claude Code vem atraves do preamble
# `!command` de SKILL.md, que executa este script passando "$(pwd)" como target.
#
# Fase 2 (GREEN) de T1 — minimo necessario pra passar os 5 cenarios em tests/scaffold_test.sh.
#
set -euo pipefail

if [ "$#" -lt 1 ] || [ -z "${1:-}" ]; then
  printf 'Usage: scaffold.sh <target-dir>\n' >&2
  exit 64
fi

TARGET="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/../templates"

if [ ! -d "$TEMPLATES_DIR" ]; then
  printf 'scaffold.sh: templates dir not found: %s\n' "$TEMPLATES_DIR" >&2
  exit 65
fi

mkdir -p "$TARGET"
cp -rn "$TEMPLATES_DIR/." "$TARGET/"

file_count=$(find "$TEMPLATES_DIR" -type f | wc -l | tr -d ' ')
printf 'POC scaffold: copied %s file(s) to %s\n' "$file_count" "$TARGET"
