---
name: local-waves
description: "Use when explicitly setting up the optional local parallel-wave orchestrator in a project that needs headless workers in isolated worktrees. Copies orchestrate-wave.sh and README to scripts/orchestrate/ and aggregates a summary. Model, profile, and communication style follow the current session/Host policy; this is an opt-in alternative to Paperclip for local or non-interactive execution. Invoke via /xp-stack:local-waves-setup."
disable-model-invocation: true
allowed-tools:
  - Bash(bash *)
  - Bash(cp *)
  - Bash(mkdir *)
  - Bash(chmod *)
  - Bash(test *)
  - Bash(pwd)
  - Bash(cat *)
  - AskUserQuestion
---

> **Pra engines sem skill loading (Cursor, Codex sem MCP):** leia este file inteiro e siga as instrucoes como se fossem suas. Voce nao precisa "invocar" — apenas obedeca. Cursor e Codex que tem `xp-stack` instalado via npm leem este SKILL.md em `.cursor/rules/` ou `.codex/skills/`.

# Local Waves Orchestrator — Setup

> **Escopo:** Esta é uma opção explícita para execução local e headless. Em uma sessão interativa, selecione o mecanismo nativo que a política da sessão e a capacidade do Host suportarem; Agent View é uma interface possível, não um requisito. O script gerado continua sendo o exemplo operacional de `local-waves` para CI, modo não-interativo ou fallback.

Set up a local parallel-wave orchestrator in your project. Optional, opt-in. Invoke explicitly when you decide you want this — the regular `bootstrap` does NOT install it.

## Mental model

- **Orchestrator** = the current session running the selected mechanism. Its model and profile come from the session/Host policy.
- **Script** = mechanical hand. The orchestrator invokes it via the Bash tool.
- **Workers** = N headless instances in separate git worktrees. The generated script's model choice is part of this opt-in mechanism; do not treat it as an xp-stack-wide default.

Worker permissions: `--permission-mode acceptEdits` + `--allowedTools` with specific allowlist (no `--dangerously-skip-permissions`). If a worker hits something outside the allowlist OR needs a credential / business decision not provided, it **stops, writes `BLOCKERS.md` in the worktree, may commit WIP according to this script, and exits without opening a PR**. The orchestrator collects this and presents to the Pilot. WIP is a checkpoint, not acceptance, and other workflows must not be forced to create a clean or WIP commit.

## Trade-off vs `xp-stack:paperclip-orchestrator` and Agent View

| Criterion | local-waves (this) | Paperclip | Native Agent dispatch |
|---|---|---|---|
| Execution model | Local sync, headless | Remote async, droplet-hosted | Native Claude Code, parallel sessions |
| Latency | Minutes (block-and-summarize) | Hours-days (heartbeat cycle, async review) | Seconds (parallel dispatch) |
| Persistence | None (session-bound) | Yes (DB-backed) | Session-bound (Agent View UI) |
| Multi-developer | No | Yes | No (single Pilot) |
| Infrastructure | None | VPS (~$10/mo) + Anthropic OAuth subscription | None |
| When to choose | Solo, headless, fallback (CI/non-interactive) | Multi-dev async, 24/7 review queue | Interactive work when the session/Host supports it |

You can install **both** in the same project; they don't conflict (Paperclip uses `local/paperclip/`, local-waves uses `scripts/orchestrate/`).

## Pre-requisite (project receiver)

Each feature you orchestrate must have `docs/tasks/{feature-slug}/TERMINAL-PROMPTS.md` with this shape:

```
## Onda 1
### T1 — Title of task 1
` ` `
<prompt body for worker T1>
` ` `

### T2 — Title of task 2
` ` `
<prompt body for worker T2>
` ` `

## Onda 2
### T3 — ...
```

The script auto-detects the next pending wave from `00-overview.md` (looks for tasks not marked `[x] Concluida`).

## Steps as the agent running this skill

### Step 1: Confirm intent

Ask via `AskUserQuestion`:
- **Question:** "Set up the local-waves orchestrator in this project? (Local sync, no infra; alternative is /xp-stack:paperclip-setup for remote async.)"
- **header:** "Setup"
- **options:**
  - "Yes, set up local-waves" → `proceed`
  - "No, I prefer Paperclip" → `redirect`
  - "Abort" → `abort`
- **multiSelect:** false

### Step 2: Run the setup script

Call via Bash:

```
bash ${CLAUDE_SKILL_DIR}/scripts/setup-local-waves.sh "$(pwd)"
```

### Step 3: Report

Summarize what was created and tell the user:

1. **Read `scripts/orchestrate/README.md`** — modelo mental, ciclo de uso, layout de artefatos, limitações conhecidas.
2. **`.gitignore` got 2 new entries** (`.claude/wave-runs/` and `scripts/orchestrate/`) — the orchestrator + its run artifacts stay out of git.
3. **The first wave needs `docs/tasks/<feature-slug>/TERMINAL-PROMPTS.md`** in the format above. Use the templates from `xp-stack:bootstrap` (the `task-decomposition` skill explains this).
4. **Customize the worker allowlist** in `scripts/orchestrate/orchestrate-wave.sh` (search for `# Allowlist` — currently has generic git/gh/npm/jq; add your stack's commands).

## Limits

- **Only writes under `$(pwd)`** — never touches `~/.claude/` global, never modifies other repos.
- **Does not run waves** — only installs the script. The orchestrator session you're in invokes `bash scripts/orchestrate/orchestrate-wave.sh run docs/tasks/<feature>/` when ready.
- **Idempotent:** re-running this skill in the same project does not modify files created in previous runs.

For task evidence, review lanes, authorization, checkpoints, and optional triage, follow the **Delivery evidence contract** in `xp-stack:akita-xp-rules`. Installing this opt-in mechanism does not approve a candidate or change the session's merge policy.
