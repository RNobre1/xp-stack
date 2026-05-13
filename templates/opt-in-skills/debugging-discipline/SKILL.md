---
name: debugging-discipline
description: Install fix-workflow discipline gates in the project — PR template (Hypotheses ranked / Root cause / Regression test), PreToolUse hook reminding systematic-debugging skill invocation, regression test policy. Opt-in. Use when project has high fix: commit ratio (>30%) or no evidence of structured debug process. Auto-trigger phrases (PT-BR) "instala debugging-discipline", "disciplina de debug", "gate de fix" e (EN) "install debugging discipline", "fix workflow gates".
allowed-tools:
  - Bash(bash *)
  - Bash(cp *)
  - Bash(mkdir *)
  - Bash(chmod *)
  - Bash(test *)
  - Bash(jq *)
  - Read
  - Write
  - Edit
---

> **Pra engines sem skill loading:** leia este file inteiro e siga as instruções como se fossem suas.

# Debugging Discipline — Install fix-workflow gates

Installs concrete gates that make `superpowers:systematic-debugging` invocation visible and verifiable, instead of "documented but not practiced".

## When to install

Auditar o repo target antes:
- `git log --oneline -50 | grep -c '^[a-f0-9]\+ fix:'` — se >15 (30%+) é sintoma forte
- Procurar evidência de "hypotheses ranked" / "root cause" em commits ou PRs recentes — se zero, instalar
- Conferir se `superpowers:systematic-debugging` está listada no CLAUDE.md como mandatory — se sim, esta skill enforça

Não instalar se:
- Projeto tem menos de 10 commits (early stage)
- Pilot já tem sistema próprio de fix workflow (pergunte primeiro)

## What gets installed

| Artifact | Path in target repo | What it does |
|---|---|---|
| PR template | `.github/PULL_REQUEST_TEMPLATE.md` | Section "Hypotheses ranked / Root cause / Regression test" mandatory if `Type: fix` |
| PreToolUse hook | `.claude/hooks/pre-tool-use.sh` | Bash script printing reminder to invoke systematic-debugging when Edit/Write triggered |
| Hook registration | `.claude/settings.json` (merge) | Registers the hook with matcher `Edit\|Write` |
| Coverage policy | Note in CLAUDE.md | Reviewer verifies each `fix:` has regression test |

## Steps as the agent running this skill

### Step 1: Confirm intent + audit

Ask the user (3 options): "Install debugging-discipline gates?"
- Yes — proceed
- Audit first (run grep + git log) — show findings, ask again
- No — abort

If "Audit first": run the checks above, present numbers, then ask again.

### Step 2: Check for conflicts

Verify before writing:
- `.github/PULL_REQUEST_TEMPLATE.md` exists? If yes, append section instead of overwrite (ask user).
- `.claude/hooks/pre-tool-use.sh` exists? If yes, abort with message — user must merge manually.
- `.claude/settings.json` has `hooks.PreToolUse`? If yes, append matcher.

### Step 3: Run setup script

Locate SKILL_DIR as the directory containing this SKILL.md file.

```bash
bash "${SKILL_DIR}/scripts/setup-debugging-discipline.sh" "$(pwd)"
```

### Step 4: Report

Tell the user:
1. PR template installed at `.github/PULL_REQUEST_TEMPLATE.md` — verify on next PR
2. Hook installed at `.claude/hooks/pre-tool-use.sh` — runs on every Edit/Write
3. `.claude/settings.json` updated with hook registration
4. Smoke test: open Edit on any `.ts` file in Claude Code → should see `[hook]` reminder line

## Limits

- Only writes under `$(pwd)` — never touches `~/.claude/` global.
- Idempotent: re-running detects existing files and aborts cleanly.
- Hook does NOT block — only reminds (echoes to stdout).
- PR template is GitHub-specific. For GitLab/Bitbucket, copy the markdown manually.
