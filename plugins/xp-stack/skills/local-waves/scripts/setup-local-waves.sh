#!/usr/bin/env bash
#
# xp-stack:local-waves — setup script
#
# Copies orchestrate-wave.sh + README from the plugin to the receiving project.
# Idempotent (no-clobber via test -e).
#
# Usage:
#   setup-local-waves.sh <target_dir>
#
# Exit codes:
#   0 — success
#   1 — missing arguments

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <target_dir>" >&2
    exit 1
fi

TARGET_DIR="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES_DIR="$SKILL_ROOT/templates"

if [ ! -d "$TEMPLATES_DIR" ]; then
    echo "ERROR: templates directory not found at $TEMPLATES_DIR" >&2
    exit 2
fi

mkdir -p "$TARGET_DIR/scripts/orchestrate"

# orchestrate-wave.sh
src="$TEMPLATES_DIR/orchestrate-wave.sh.template"
dst="$TARGET_DIR/scripts/orchestrate/orchestrate-wave.sh"
if [ -f "$src" ] && [ ! -e "$dst" ]; then
    cp "$src" "$dst"
    chmod +x "$dst"
    echo "Created: $dst"
fi

# README.md
src="$TEMPLATES_DIR/README.md.template"
dst="$TARGET_DIR/scripts/orchestrate/README.md"
if [ -f "$src" ] && [ ! -e "$dst" ]; then
    cp "$src" "$dst"
    echo "Created: $dst"
fi

# .gitignore: ensure .claude/wave-runs/ and scripts/orchestrate/ are present
GITIGNORE="$TARGET_DIR/.gitignore"
if [ ! -e "$GITIGNORE" ]; then
    : > "$GITIGNORE"
fi

GITIGNORE_HEADER="# Local wave orchestrator (gitignored)"
GITIGNORE_ENTRIES=(".claude/wave-runs/" "scripts/orchestrate/")
HEADER_NEEDED=0

for entry in "${GITIGNORE_ENTRIES[@]}"; do
    if ! grep -qxF "$entry" "$GITIGNORE"; then
        if [ "$HEADER_NEEDED" = "0" ]; then
            if [ -s "$GITIGNORE" ] && [ "$(tail -c1 "$GITIGNORE" | od -An -c | tr -d ' ')" != "\\n" ]; then
                printf '\n' >> "$GITIGNORE"
            fi
            printf '%s\n' "$GITIGNORE_HEADER" >> "$GITIGNORE"
            HEADER_NEEDED=1
        fi
        printf '%s\n' "$entry" >> "$GITIGNORE"
        echo "Updated: $GITIGNORE (added $entry)"
    fi
done

echo ""
echo "Local-waves orchestrator installed. Target: $TARGET_DIR"
echo ""
echo "Next steps:"
echo "  1. Read scripts/orchestrate/README.md (mental model + usage cycle + limits)."
echo "  2. Customize worker allowlist in scripts/orchestrate/orchestrate-wave.sh for your stack."
echo "  3. Each feature you orchestrate needs docs/tasks/<feature>/TERMINAL-PROMPTS.md."
echo "  4. From the orchestrator session: bash scripts/orchestrate/orchestrate-wave.sh run docs/tasks/<feature>/"
