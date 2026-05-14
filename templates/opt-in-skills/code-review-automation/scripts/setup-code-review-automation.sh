#!/usr/bin/env bash
# setup-code-review-automation.sh
# Installs orchestrator self-review gates in a target project.
# Usage: bash setup-code-review-automation.sh <target-project-path>
# Idempotent: detects existing artifacts and appends/skips cleanly.

set -euo pipefail

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "ERROR: target path required. Usage: bash setup-code-review-automation.sh <project-path>" >&2
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
PATCHED=0

# --- Slash command: .claude/commands/review-pr.md ---
REVIEW_CMD_DEST="$TARGET/.claude/commands/review-pr.md"
if [[ -f "$REVIEW_CMD_DEST" ]]; then
  echo "SKIP  $REVIEW_CMD_DEST — already exists. Verify content matches templates/review-pr.md.template." >&2
  CONFLICTS=$((CONFLICTS + 1))
else
  mkdir -p "$TARGET/.claude/commands"
  cp "$TEMPLATES_DIR/review-pr.md.template" "$REVIEW_CMD_DEST"
  echo "OK    $REVIEW_CMD_DEST"
fi

# --- PR template: append self-review section ---
PR_TEMPLATE_DEST="$TARGET/.github/PULL_REQUEST_TEMPLATE.md"
if [[ ! -f "$PR_TEMPLATE_DEST" ]]; then
  # Create minimal PR template with self-review section only
  mkdir -p "$TARGET/.github"
  cat "$TEMPLATES_DIR/PR_TEMPLATE_self-review-section.md.template" > "$PR_TEMPLATE_DEST"
  echo "OK    $PR_TEMPLATE_DEST (created with self-review section)"
else
  # Check if self-review section already present
  if grep -q "Orchestrator self-review findings" "$PR_TEMPLATE_DEST" 2>/dev/null; then
    echo "SKIP  $PR_TEMPLATE_DEST — self-review section already present." >&2
    CONFLICTS=$((CONFLICTS + 1))
  else
    # Append section
    cat "$TEMPLATES_DIR/PR_TEMPLATE_self-review-section.md.template" >> "$PR_TEMPLATE_DEST"
    echo "PATCH $PR_TEMPLATE_DEST (appended self-review section)"
    PATCHED=$((PATCHED + 1))
  fi
fi

# --- PreToolUse hook: .claude/hooks/pre-tool-use.sh ---
HOOK_DEST="$TARGET/.claude/hooks/pre-tool-use.sh"
if [[ ! -f "$HOOK_DEST" ]]; then
  # Create minimal hook with pr reminder matcher
  mkdir -p "$TARGET/.claude/hooks"
  cp "$TEMPLATES_DIR/pre-tool-use-pr-reminder.sh.template" "$HOOK_DEST"
  chmod +x "$HOOK_DEST"
  echo "OK    $HOOK_DEST (created with pr-reminder matcher)"
else
  # Check if review-pr reminder already present
  if grep -q "review-pr reminder" "$HOOK_DEST" 2>/dev/null; then
    echo "SKIP  $HOOK_DEST — review-pr reminder already present." >&2
    CONFLICTS=$((CONFLICTS + 1))
  else
    # Append matcher block to existing hook
    cat "$TEMPLATES_DIR/pre-tool-use-pr-reminder.sh.template" >> "$HOOK_DEST"
    echo "PATCH $HOOK_DEST (appended review-pr reminder matcher)"
    PATCHED=$((PATCHED + 1))
  fi
fi

# --- settings.json: ensure PreToolUse hook registered ---
SETTINGS_PATH="$TARGET/.claude/settings.json"
FRAGMENT="$TEMPLATES_DIR/settings-hook-fragment.json.template"

if [[ ! -f "$SETTINGS_PATH" ]]; then
  mkdir -p "$TARGET/.claude"
  cp "$FRAGMENT" "$SETTINGS_PATH"
  echo "OK    $SETTINGS_PATH (created from fragment)"
else
  if jq -e '.hooks.PreToolUse' "$SETTINGS_PATH" > /dev/null 2>&1; then
    echo "SKIP  $SETTINGS_PATH — hooks.PreToolUse already registered (debugging-discipline or prior run)." >&2
    # No conflict count — this is expected when debugging-discipline already installed
  else
    MERGED=$(jq -s '.[0] * .[1]' "$SETTINGS_PATH" "$FRAGMENT")
    echo "$MERGED" > "$SETTINGS_PATH"
    echo "OK    $SETTINGS_PATH (hook merged)"
  fi
fi

# --- Summary ---
echo ""
echo "code-review-automation install complete."
if [[ $CONFLICTS -gt 0 ]]; then
  echo "  $CONFLICTS artifact(s) skipped (already present — idempotent)."
fi
if [[ $PATCHED -gt 0 ]]; then
  echo "  $PATCHED artifact(s) patched (appended to existing files)."
fi
echo ""
echo "Next steps:"
echo "  1. Use /review-pr in Claude Code BEFORE running gh pr create"
echo "  2. Paste findings in PR body under '## Orchestrator self-review findings'"
echo "  3. Pilot reviews + merges on GitHub — orchestrator does NOT self-merge"
echo "  4. Smoke test hook: run 'gh pr create' in Claude Code → should see [review-pr reminder] line"
