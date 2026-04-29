#!/usr/bin/env bash
#
# xp-stack:paperclip-orchestrator — setup script
#
# Copies the 8 paperclip templates from the plugin to the receiving project.
# Idempotent (no-clobber via test -e). Never overwrites existing files.
#
# Usage:
#   setup-paperclip.sh <target_dir>
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

mkdir -p "$TARGET_DIR"

# ---- 1. local/paperclip/ — 5 markdown files (gitignored content) ----

mkdir -p "$TARGET_DIR/local/paperclip"
for tpl in playbook AGENTS-dev-primary AGENTS-reviewer dispatch-cheatsheet licoes; do
    src="$TEMPLATES_DIR/${tpl}.md.template"
    dst="$TARGET_DIR/local/paperclip/${tpl}.md"
    if [ -f "$src" ] && [ ! -e "$dst" ]; then
        cp "$src" "$dst"
        echo "Created: $dst"
    fi
done

# ---- 2. .github/workflows/auto-merge.yml ----

mkdir -p "$TARGET_DIR/.github/workflows"
src="$TEMPLATES_DIR/auto-merge.yml.template"
dst="$TARGET_DIR/.github/workflows/auto-merge.yml"
if [ -f "$src" ] && [ ! -e "$dst" ]; then
    cp "$src" "$dst"
    echo "Created: $dst"
fi

# ---- 3. scripts/check-{reviewer-approval,always-human}.sh ----

mkdir -p "$TARGET_DIR/scripts"
for s in check-reviewer-approval check-always-human; do
    src="$TEMPLATES_DIR/${s}.sh.template"
    dst="$TARGET_DIR/scripts/${s}.sh"
    if [ -f "$src" ] && [ ! -e "$dst" ]; then
        cp "$src" "$dst"
        chmod +x "$dst"
        echo "Created: $dst"
    fi
done

# ---- 4. .gitignore: ensure local/ is present (idempotent) ----

GITIGNORE="$TARGET_DIR/.gitignore"
if [ ! -e "$GITIGNORE" ]; then
    : > "$GITIGNORE"
fi
if ! grep -qxF "local/" "$GITIGNORE"; then
    if [ -s "$GITIGNORE" ] && [ "$(tail -c1 "$GITIGNORE" | od -An -c | tr -d ' ')" != "\\n" ]; then
        printf '\n' >> "$GITIGNORE"
    fi
    printf '# Paperclip orchestrator (gitignored)\nlocal/\n' >> "$GITIGNORE"
    echo "Updated: $GITIGNORE (added local/)"
fi

echo ""
echo "Paperclip setup complete. Target: $TARGET_DIR"
echo ""
echo "Next steps:"
echo "  1. Read this skill's references/licoes-do-piloto.md (9 anonymized lessons)."
echo "  2. Read local/paperclip/playbook.md before provisioning agents."
echo "  3. Edit scripts/check-always-human.sh to match YOUR project's always-human paths."
echo "  4. Provision droplet + Paperclip CLI + agents per playbook (this script does NOT do that)."
