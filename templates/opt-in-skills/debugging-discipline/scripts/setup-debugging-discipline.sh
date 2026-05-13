#!/usr/bin/env bash
# setup-debugging-discipline.sh
# Installs fix-workflow gates in a target project.
# Usage: bash setup-debugging-discipline.sh <target-project-path>
# Idempotent: aborts cleanly if artifacts already exist.

set -euo pipefail

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "ERROR: target path required. Usage: bash setup-debugging-discipline.sh <project-path>" >&2
  exit 1
fi

if [[ ! -d "$TARGET" ]]; then
  echo "ERROR: target path does not exist: $TARGET" >&2
  exit 1
fi

# Resolve templates dir relative to this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/../templates"

CONFLICTS=0

# --- PR template ---
PR_TEMPLATE_DEST="$TARGET/.github/PULL_REQUEST_TEMPLATE.md"
if [[ -f "$PR_TEMPLATE_DEST" ]]; then
  echo "SKIP  $PR_TEMPLATE_DEST — already exists. Merge manually from templates/PULL_REQUEST_TEMPLATE.md.template." >&2
  CONFLICTS=$((CONFLICTS + 1))
else
  mkdir -p "$TARGET/.github"
  cp "$TEMPLATES_DIR/PULL_REQUEST_TEMPLATE.md.template" "$PR_TEMPLATE_DEST"
  echo "OK    $PR_TEMPLATE_DEST"
fi

# --- Hook script ---
HOOK_DEST="$TARGET/.claude/hooks/pre-tool-use.sh"
if [[ -f "$HOOK_DEST" ]]; then
  echo "SKIP  $HOOK_DEST — already exists. Merge manually from templates/pre-tool-use.sh.template." >&2
  CONFLICTS=$((CONFLICTS + 1))
else
  mkdir -p "$TARGET/.claude/hooks"
  cp "$TEMPLATES_DIR/pre-tool-use.sh.template" "$HOOK_DEST"
  chmod +x "$HOOK_DEST"
  echo "OK    $HOOK_DEST"
fi

# --- settings.json hook registration ---
SETTINGS_PATH="$TARGET/.claude/settings.json"
FRAGMENT="$TEMPLATES_DIR/settings-hook-fragment.json.template"

if [[ ! -f "$SETTINGS_PATH" ]]; then
  # Create minimal settings.json from fragment
  mkdir -p "$TARGET/.claude"
  cp "$FRAGMENT" "$SETTINGS_PATH"
  echo "OK    $SETTINGS_PATH (created from fragment)"
else
  # Check if PreToolUse hook already registered
  if jq -e '.hooks.PreToolUse' "$SETTINGS_PATH" > /dev/null 2>&1; then
    echo "SKIP  $SETTINGS_PATH — hooks.PreToolUse already present. Merge manually from templates/settings-hook-fragment.json.template." >&2
    CONFLICTS=$((CONFLICTS + 1))
  else
    # Merge fragment into existing settings.json
    MERGED=$(jq -s '.[0] * .[1]' "$SETTINGS_PATH" "$FRAGMENT")
    echo "$MERGED" > "$SETTINGS_PATH"
    echo "OK    $SETTINGS_PATH (hook merged)"
  fi
fi

# --- Summary ---
echo ""
echo "debugging-discipline install complete."
if [[ $CONFLICTS -gt 0 ]]; then
  echo "  $CONFLICTS artifact(s) skipped (conflicts above). Merge manually."
fi
echo ""
echo "Next steps:"
echo "  1. Verify .github/PULL_REQUEST_TEMPLATE.md on next PR"
echo "  2. Smoke test hook: open Edit on any .ts file in Claude Code → should see [hook] line"
echo "  3. Add regression test policy note to CLAUDE.md (each fix: commit must include regression test)"
