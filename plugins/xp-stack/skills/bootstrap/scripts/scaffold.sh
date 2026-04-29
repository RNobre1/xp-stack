#!/usr/bin/env bash
#
# XP Stack Bootstrap Scaffold
# Copies templates from the plugin to the target project directory.
# Idempotent via no-clobber copies (loop + test -e, portable across GNU/BSD).
#
# Usage:
#   scaffold.sh <target_dir> <project_name> <project_stack> <project_description> <claude_md_action> [agents_symlink]
#
# claude_md_action: create | skip | backup | abort
# agents_symlink (optional, 6th arg): "no-symlink" to skip AGENTS.md/AGENTS.local.md
#                                     symlink creation. Default (any other value
#                                     or omitted): create symlinks.
#
# Exit codes:
#   0 — success (including graceful abort)
#   1 — missing arguments
#   2 — plugin templates directory not found
#   3 — invalid claude_md_action value

set -euo pipefail

# ---- Arg parsing ----

if [ $# -lt 5 ]; then
    echo "Usage: $0 <target_dir> <project_name> <project_stack> <project_description> <claude_md_action> [agents_symlink]" >&2
    echo "  claude_md_action: create | skip | backup | abort" >&2
    echo "  agents_symlink:   no-symlink (optional; default = create symlinks)" >&2
    exit 1
fi

TARGET_DIR="$1"
PROJECT_NAME="$2"
PROJECT_STACK="$3"
PROJECT_DESCRIPTION="$4"
CLAUDE_MD_ACTION="$5"
AGENTS_SYMLINK_OPT="${6:-create}"

# ---- Derive SCRIPT_DIR and TEMPLATES_DIR ----

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# scripts/ -> bootstrap/ -> skills/ -> plugin root
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TEMPLATES_DIR="$PLUGIN_ROOT/templates"

if [ ! -d "$TEMPLATES_DIR" ]; then
    echo "ERROR: templates directory not found at $TEMPLATES_DIR" >&2
    exit 2
fi

# ---- Handle abort early (no side effects) ----

if [ "$CLAUDE_MD_ACTION" = "abort" ]; then
    echo "Bootstrap aborted by user. Nothing done."
    exit 0
fi

# ---- Validate and prepare target_dir ----

if [ ! -d "$TARGET_DIR" ]; then
    mkdir -p "$TARGET_DIR"
fi

# ---- Handle CLAUDE.md based on action ----

CLAUDE_MD_PATH="$TARGET_DIR/CLAUDE.md"
CLAUDE_MD_TEMPLATE="$TEMPLATES_DIR/CLAUDE.md.template"

case "$CLAUDE_MD_ACTION" in
    create)
        if [ -f "$CLAUDE_MD_PATH" ]; then
            echo "CLAUDE.md already exists; skipping (use 'backup' action to force)."
        else
            sed -e "s|{{PROJECT_NAME}}|$PROJECT_NAME|g" \
                -e "s|{{PROJECT_STACK}}|$PROJECT_STACK|g" \
                -e "s|{{PROJECT_DESCRIPTION}}|$PROJECT_DESCRIPTION|g" \
                "$CLAUDE_MD_TEMPLATE" > "$CLAUDE_MD_PATH"
            echo "Created: $CLAUDE_MD_PATH"
        fi
        ;;
    skip)
        echo "Skipped: CLAUDE.md (kept existing)"
        ;;
    backup)
        if [ -f "$CLAUDE_MD_PATH" ]; then
            mv "$CLAUDE_MD_PATH" "${CLAUDE_MD_PATH}.bak"
            echo "Backup: $CLAUDE_MD_PATH -> ${CLAUDE_MD_PATH}.bak"
        fi
        sed -e "s|{{PROJECT_NAME}}|$PROJECT_NAME|g" \
            -e "s|{{PROJECT_STACK}}|$PROJECT_STACK|g" \
            -e "s|{{PROJECT_DESCRIPTION}}|$PROJECT_DESCRIPTION|g" \
            "$CLAUDE_MD_TEMPLATE" > "$CLAUDE_MD_PATH"
        echo "Created: $CLAUDE_MD_PATH"
        ;;
    *)
        echo "ERROR: Invalid claude_md_action '$CLAUDE_MD_ACTION'. Must be: create | skip | backup | abort" >&2
        exit 3
        ;;
esac

# ---- Copy docs/tasks/_template/ (portable no-clobber loop) ----

TASKS_TEMPLATE_SRC="$TEMPLATES_DIR/docs-tasks-template"
TASKS_TEMPLATE_DST="$TARGET_DIR/docs/tasks/_template"

if [ -d "$TASKS_TEMPLATE_SRC" ]; then
    mkdir -p "$TASKS_TEMPLATE_DST"
    for f in "$TASKS_TEMPLATE_SRC"/*; do
        name="$(basename "$f")"
        if [ ! -e "$TASKS_TEMPLATE_DST/$name" ]; then
            cp "$f" "$TASKS_TEMPLATE_DST/$name"
            echo "Created: $TASKS_TEMPLATE_DST/$name"
        fi
    done
fi

# ---- Copy docs/pesquisas/_template/ ----

PESQUISAS_TEMPLATE_SRC="$TEMPLATES_DIR/docs-pesquisas-template"
PESQUISAS_TEMPLATE_DST="$TARGET_DIR/docs/pesquisas/_template"

if [ -d "$PESQUISAS_TEMPLATE_SRC" ]; then
    mkdir -p "$PESQUISAS_TEMPLATE_DST"
    for f in "$PESQUISAS_TEMPLATE_SRC"/*; do
        name="$(basename "$f")"
        if [ ! -e "$PESQUISAS_TEMPLATE_DST/$name" ]; then
            cp "$f" "$PESQUISAS_TEMPLATE_DST/$name"
            echo "Created: $PESQUISAS_TEMPLATE_DST/$name"
        fi
    done
fi

# ---- Copy .claude/settings.json ----

SETTINGS_SRC="$TEMPLATES_DIR/claude-settings-project.json"
SETTINGS_DST="$TARGET_DIR/.claude/settings.json"

if [ -f "$SETTINGS_SRC" ]; then
    mkdir -p "$TARGET_DIR/.claude"
    if [ ! -e "$SETTINGS_DST" ]; then
        cp "$SETTINGS_SRC" "$SETTINGS_DST"
        echo "Created: $SETTINGS_DST"
    fi
fi

# ---- Create AGENTS.md / AGENTS.local.md symlinks ----
#
# Antigravity / Codex / Cursor read AGENTS.md by convention; Claude Code reads
# CLAUDE.md. Making them the same file via symlink prevents drift.
# Skipped when 6th arg is "no-symlink".

if [ "$AGENTS_SYMLINK_OPT" != "no-symlink" ]; then
    # AGENTS.md -> CLAUDE.md (when CLAUDE.md exists and AGENTS.md not yet)
    if [ -f "$TARGET_DIR/CLAUDE.md" ] && [ ! -e "$TARGET_DIR/AGENTS.md" ]; then
        ( cd "$TARGET_DIR" && ln -s CLAUDE.md AGENTS.md )
        echo "Created symlink: $TARGET_DIR/AGENTS.md -> CLAUDE.md"
    fi
    # AGENTS.local.md -> CLAUDE.local.md (only if CLAUDE.local.md exists)
    if [ -f "$TARGET_DIR/CLAUDE.local.md" ] && [ ! -e "$TARGET_DIR/AGENTS.local.md" ]; then
        ( cd "$TARGET_DIR" && ln -s CLAUDE.local.md AGENTS.local.md )
        echo "Created symlink: $TARGET_DIR/AGENTS.local.md -> CLAUDE.local.md"
    fi
fi

# ---- Update .gitignore with orchestration entries (idempotent) ----
#
# These 3 paths are reserved by xp-stack:paperclip-setup and
# xp-stack:local-waves-setup. Adding them up-front avoids accidental commits
# of secrets (local/) or run artifacts (.claude/wave-runs/) when the user
# opts into either skill later. Pre-existing entries are preserved.

GITIGNORE="$TARGET_DIR/.gitignore"
GITIGNORE_HEADER="# xp-stack reserved paths (paperclip-orchestrator + local-waves)"
GITIGNORE_ENTRIES=("local/" ".claude/wave-runs/" "scripts/orchestrate/")

if [ ! -e "$GITIGNORE" ]; then
    : > "$GITIGNORE"
fi

GITIGNORE_HEADER_NEEDED=0
for entry in "${GITIGNORE_ENTRIES[@]}"; do
    if ! grep -qxF "$entry" "$GITIGNORE"; then
        if [ "$GITIGNORE_HEADER_NEEDED" = "0" ]; then
            # Ensure file ends with newline before appending
            if [ -s "$GITIGNORE" ] && [ "$(tail -c1 "$GITIGNORE" | od -An -c | tr -d ' ')" != "\\n" ]; then
                printf '\n' >> "$GITIGNORE"
            fi
            printf '%s\n' "$GITIGNORE_HEADER" >> "$GITIGNORE"
            GITIGNORE_HEADER_NEEDED=1
        fi
        printf '%s\n' "$entry" >> "$GITIGNORE"
        echo "Updated: $GITIGNORE (added $entry)"
    fi
done

echo ""
echo "Bootstrap complete. Target: $TARGET_DIR"
