---
name: bootstrap
description: Scaffold a new project with the XP stack — creates CLAUDE.md, docs/tasks/_template/, docs/pesquisas/_template/, .claude/settings.json without overwriting existing files. Also creates AGENTS.md symlink to CLAUDE.md (for Antigravity/Codex/Cursor compatibility) and adds 3 reserved paths to .gitignore (idempotent, preserves existing entries). Asks before touching an existing CLAUDE.md. Invoke explicitly with /xp-stack:bootstrap.
disable-model-invocation: true
allowed-tools:
  - Bash(bash *)
  - Bash(cp *)
  - Bash(cp -n *)
  - Bash(cp -rn *)
  - Bash(mkdir *)
  - Bash(mkdir -p *)
  - Bash(test *)
  - Bash(ls *)
  - Bash(pwd)
  - Bash(cat *)
  - Bash(ln *)
  - AskUserQuestion
---

Voce eh o Bootstrap. Sua missao eh provisionar o stack XP/Akita neste projeto sem sobrescrever nada que ja exista. Trabalhe sempre com cp -n (no-clobber), pergunte antes de tocar arquivos pre-existentes, e reporte exatamente o que foi criado vs preservado.

# XP Stack Bootstrap

Scaffold a project with the XP stack. Never overwrites existing files silently.

## Environment detection (preprocessed)

**Current directory:** !`pwd`

**CLAUDE.md status:** !`test -f "$(pwd)/CLAUDE.md" && echo "EXISTS" || echo "ABSENT"`

**Existing structure:**
!`ls -la "$(pwd)/.claude" 2>/dev/null || echo "No .claude directory"`
!`ls -la "$(pwd)/docs" 2>/dev/null || echo "No docs directory"`

## Your task as the agent running this skill

Follow these steps IN ORDER. Don't skip ahead.

### Step 1: Collect project info

Use `AskUserQuestion` with these 3 questions (in one batched call):

1. **Question**: "What is the project name?" (the user will likely answer via Other with a kebab-case name)
   - **header**: "Name"
   - **options**: "my-api", "acme-web", "data-pipeline" — plus the automatic Other
   - **multiSelect**: false

2. **Question**: "What is the primary tech stack?"
   - **header**: "Stack"
   - **options**: "React + TypeScript + Vite", "Python + FastAPI", "Node.js + Express", "Go" — plus Other
   - **multiSelect**: false

3. **Question**: "Describe the project in one sentence."
   - **header**: "Description"
   - **options**: "General-purpose web app", "API service", "CLI tool", "Library/SDK" — plus Other for custom text
   - **multiSelect**: false

Store the answers as `$project_name`, `$project_stack`, `$project_description` (conceptually — use the values in the bash call below).

### Step 2: Handle existing CLAUDE.md

Look at the **CLAUDE.md status** from the environment detection above.

**If ABSENT**: set `$claude_md_action = "create"` and skip to Step 3.

**If EXISTS**: Ask via `AskUserQuestion`:
- **Question**: "A CLAUDE.md already exists in this directory. What should we do?"
- **header**: "Existing"
- **options**:
  - "Keep existing and skip CLAUDE.md creation (Recommended)" -> `skip`
  - "Rename existing to CLAUDE.md.bak and create new" -> `backup`
  - "Abort the bootstrap entirely" -> `abort`
- **multiSelect**: false

Store the chosen action as `$claude_md_action`.

### Step 3: Run the scaffold script

Call via Bash tool (replace the variables with the collected values):

```
bash ${CLAUDE_SKILL_DIR}/scripts/scaffold.sh "$(pwd)" "PROJECT_NAME_HERE" "PROJECT_STACK_HERE" "PROJECT_DESCRIPTION_HERE" "CLAUDE_MD_ACTION_HERE"
```

The script handles the 4 CLAUDE.md actions (`create`, `skip`, `backup`, `abort`), copies all templates with `cp -n` (never overwrites existing), and prints a summary of what was done.

### Step 4: Report to the user

Summarize what was created / skipped. Tell them:
1. Read the new `CLAUDE.md` — it's the canonical source of truth for the project.
2. `AGENTS.md` is a symlink to `CLAUDE.md` (so Antigravity/Codex/Cursor read the same file). Don't edit `AGENTS.md` directly — edit `CLAUDE.md` and the symlink propagates.
3. `.gitignore` got 3 reserved entries (`local/`, `.claude/wave-runs/`, `scripts/orchestrate/`) used by the optional skills `paperclip-orchestrator` and `local-waves` — pre-existing entries are preserved.
4. Fill in the stack-specific sections (tech stack details, env vars, directory structure, lessons learned).
5. Start their first task with the `task-decomposition` skill.

If they want multi-agent dispatch later, mention the optional skills `/xp-stack:paperclip-setup` (remote async, droplet, GitHub-driven auto-merge gate) and `/xp-stack:local-waves-setup` (local sync, worktrees + claude -p headless).

## What the scaffold script does

- Creates `CLAUDE.md` from the template, substituting `{{PROJECT_NAME}}`, `{{PROJECT_STACK}}`, `{{PROJECT_DESCRIPTION}}` with the collected values
- Copies `templates/docs-tasks-template/` to `docs/tasks/_template/` (recursive, no-clobber)
- Copies `templates/docs-pesquisas-template/` to `docs/pesquisas/_template/` (recursive, no-clobber)
- Creates `.claude/settings.json` from the template (no-clobber)
- Creates `AGENTS.md -> CLAUDE.md` symlink (and `AGENTS.local.md -> CLAUDE.local.md` if `CLAUDE.local.md` exists). Skipped when 6th arg passed as `"no-symlink"`.
- Appends `local/`, `.claude/wave-runs/`, `scripts/orchestrate/` to `.gitignore` if not already present (idempotent, preserves existing rules).
- Uses `cp -n` / `cp -rn` throughout — **never overwrites existing files**

## Idempotency guarantee

Running this skill multiple times in the same directory does not modify files created in previous runs. The script always uses no-clobber copies. If the user wants to reset, they delete the files manually first.

## Limits

- **Only writes under `$(pwd)`** — never touches `~/.claude/` global, never touches other repos.
- **Never modifies `$(pwd)/.git`** — the scaffold only creates source files, git is untouched.
- **Never installs dependencies** — if the stack needs `npm install` or equivalent, the user runs it after.
