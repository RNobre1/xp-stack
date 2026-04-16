#!/usr/bin/env bash
#
# xp-stack bootstrap scaffold — placeholder
#
# NOTA: este scaffold.sh sera evoluido a partir do POC em
# plugins/poc-bootstrap/skills/scaffold/scripts/scaffold.sh
# na task write-bootstrap-skill. O POC validou o padrao
# !command + ${CLAUDE_SKILL_DIR} (5/5 testes, invocacao empirica).
#
# Contrato (mesmo do POC — manter compatibilidade):
#   $1 = target dir (cwd do projeto receptor)
#   Exit 0 = sucesso
#   Exit 1 = erro (com mensagem de Usage)
#
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: scaffold.sh <target_dir>" >&2
  exit 1
fi

TARGET_DIR="$1"

echo "[xp-stack:bootstrap] scaffold.sh placeholder — real implementation pending"
echo "[xp-stack:bootstrap] target: $TARGET_DIR"
echo "[xp-stack:bootstrap] ver task write-bootstrap-skill para implementacao real"

exit 0
