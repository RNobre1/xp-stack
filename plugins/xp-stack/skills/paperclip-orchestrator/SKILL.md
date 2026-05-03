---
name: paperclip-orchestrator
description: Set up the Paperclip multi-agent orchestrator pattern in the current project — copies AGENTS.md per-role templates (dev-primary, reviewer), playbook, dispatch cheatsheet, lessons template into local/paperclip/ (gitignored), and installs the GitHub Actions auto-merge gate B workflow with check scripts. Includes a decision tree comparing this remote-async pattern vs xp-stack:local-waves (local sync, worktrees). Invoke explicitly via /xp-stack:paperclip-setup. Optional, opt-in. Read references/licoes-do-piloto.md before Wave 1 for 9 lessons learned in a real pilot.
disable-model-invocation: true
allowed-tools:
  - Bash(bash *)
  - Bash(cp *)
  - Bash(mkdir *)
  - Bash(test *)
  - Bash(ls *)
  - Bash(pwd)
  - Bash(cat *)
  - AskUserQuestion
---

> **Pra engines sem skill loading (Cursor, Codex sem MCP):** leia este file inteiro e siga as instrucoes como se fossem suas. Voce nao precisa "invocar" — apenas obedeca. Cursor e Codex que tem `xp-stack` instalado via npm leem este SKILL.md em `.cursor/rules/` ou `.codex/skills/`.

# Paperclip Orchestrator — Setup

Set up the Paperclip multi-agent orchestrator pattern in your project. Optional. Invoke explicitly when you decide you want this — the regular `bootstrap` does NOT install it.

## What this gives you

- **`local/paperclip/`** (gitignored) with 5 per-role and operational files:
  - `playbook.md` — operations manual (waves, gates, troubleshooting)
  - `AGENTS-dev-primary.md` — system prompt + safety checklist for dev workers (Sonnet-class models)
  - `AGENTS-reviewer.md` — system prompt + scoring criteria for reviewer (Opus-class models)
  - `dispatch-cheatsheet.md` — copy-paste commands to launch waves
  - `licoes.md` — empty lessons file you fill in per wave
- **`.github/workflows/auto-merge.yml`** — gate B workflow (4 checks: CI fast-lane green, no always-human path, reviewer approved, coverage ≥ 90% on diff)
- **`scripts/check-reviewer-approval.sh`** + **`scripts/check-always-human.sh`** — gate B helpers
- **`.gitignore`** — `local/` added if not already there

The `references/licoes-do-piloto.md` (in this skill's directory) holds **9 anonymized lessons from a real Wave 1 pilot at the upstream project**: auto-merge YAML strict-parser quirks, gh CLI v2.x glob limits, GitHub Actions workflow snapshot caching, plugin Claude Code 4-element activation, label re-add post-comment trigger, fast-lane vs full CI scope mismatch. Read it once before your first wave.

## Decision tree — Paperclip vs `xp-stack:local-waves`

| Criterion | Paperclip (this skill) | local-waves |
|---|---|---|
| Execution model | Remote async, droplet-hosted Postgres + Kanban + cron | Local sync, git worktrees + `claude -p` headless |
| Latency between waves | Hours-days (heartbeat cycle, async review) | Minutes (block-and-summarize) |
| Persistence between sessions | Yes (DB-backed) | No (session-bound) |
| Multi-developer / multi-project | Yes (one droplet, N companies) | No (one machine, one user) |
| Cost overhead | VPS (~$10/mo) + Anthropic OAuth subscription | Anthropic OAuth subscription only |
| When to choose | You + a co-pilot are async; or you want a 24/7 review queue; or you run multiple projects from one droplet | You're solo and want isolated execution per task without infra |

You can install **both** in the same project; they don't conflict (Paperclip uses `local/paperclip/`, local-waves uses `scripts/orchestrate/`).

## Steps as the agent running this skill

### Step 1: Confirm intent

Ask via `AskUserQuestion`:
- **Question:** "Set up the Paperclip orchestrator in this project? (Remote async, requires a droplet; alternative is /xp-stack:local-waves-setup for local sync.)"
- **header:** "Setup"
- **options:**
  - "Yes, set up Paperclip" → `proceed`
  - "No, I prefer local-waves" → `redirect`
  - "Abort" → `abort`
- **multiSelect:** false

If `redirect`: tell the user to run `/xp-stack:local-waves-setup` and exit.
If `abort`: exit cleanly.
If `proceed`: continue.

### Step 2: Run the setup script

Call via Bash:

```
bash ${CLAUDE_SKILL_DIR}/scripts/setup-paperclip.sh "$(pwd)"
```

The script copies all templates idempotently (never overwrites existing files), creates the workflow + scripts in their canonical locations, and appends `local/` to `.gitignore` if not present.

### Step 3: Report

Summarize what was created and tell the user:

1. **Read `references/licoes-do-piloto.md`** in this skill (location: `${CLAUDE_SKILL_DIR}/references/licoes-do-piloto.md`) before your first wave. 9 anonymized lessons — each one was paid for in real time.
2. **Read `local/paperclip/playbook.md`** before configuring agents.
3. **Customize the templates** — they have sensible defaults but reference patterns specific to certain stacks (npm, gh CLI). Search-and-replace those for your project's commands.
4. **Edit `scripts/check-always-human.sh`** to match YOUR project's always-human paths (the template ships with generic defaults; add patterns like `^db/migrations/`, `^terraform/`, etc.).
5. **Provision the droplet + Paperclip CLI separately** — this skill does NOT install Paperclip itself or create agents via API. See `local/paperclip/playbook.md` § Coordinates and § Agent topology.

## Limits

- **Only writes under `$(pwd)`** — never touches `~/.claude/` global, never modifies other repos.
- **Does not install the Paperclip CLI** — that's a separate install on your droplet.
- **Does not create agents via the Paperclip API** — you do that manually following the playbook.
- **Does not provision GitHub PAT, Anthropic OAuth tokens, or SSH keys** — credentials stay in your control.
- **Idempotent:** re-running this skill in the same project does not modify files created in previous runs.
