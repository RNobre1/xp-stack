---
name: local-waves
description: Set up a local parallel-wave orchestrator in this project — copies orchestrate-wave.sh and README to scripts/orchestrate/. The orchestrator dispatches N headless workers (claude -p Sonnet) in isolated git worktrees per task, blocks on BLOCKERS.md discipline, and aggregates a summary. Alternative to remote orchestrators like Paperclip when you want sync local execution without infrastructure. Invoke explicitly via /xp-stack:local-waves-setup. Opt-in.
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

# Local Waves Orchestrator — Setup

Set up a local parallel-wave orchestrator in your project. Optional, opt-in. Invoke explicitly when you decide you want this — the regular `bootstrap` does NOT install it.

## Mental model

- **Orchestrator** = the Claude Code session you're running (Opus-class, auto mode). It's the brain.
- **Script** = mechanical hand. The orchestrator invokes it via the Bash tool.
- **Workers** = N instances of `claude -p` running Sonnet-class headless in separate git worktrees. They execute 1 task each in parallel.

Worker permissions: `--permission-mode acceptEdits` + `--allowedTools` with specific allowlist (no `--dangerously-skip-permissions`). If a worker hits something outside the allowlist OR needs a credential / business decision not provided, it **stops, writes `BLOCKERS.md` in the worktree, commits WIP, and exits without opening a PR**. The orchestrator collects this and presents to the Pilot.

## Trade-off vs `xp-stack:paperclip-orchestrator`

| Criterion | local-waves (this) | Paperclip |
|---|---|---|
| Execution model | Local sync, blocks until done | Remote async, droplet-hosted |
| Latency | Minutes (block-and-summarize) | Hours-days (heartbeat cycle, async review) |
| Persistence | None (session-bound) | Yes (DB-backed) |
| Multi-developer | No | Yes |
| Infrastructure | None | VPS (~$10/mo) + Anthropic OAuth subscription |
| When to choose | You're solo, want isolated execution per task without infra | You want a 24/7 review queue or async dev/review separation |

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
