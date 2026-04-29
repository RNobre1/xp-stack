# T5 — Empirical Validation Results

**Status:** [x] Concluida 2026-04-29
**Branch:** feat/v0.3.0-portable-orchestration
**Method:** shell-direct in isolated `/tmp` directories (no Claude Code runtime)

## Summary

All 3 scenarios PASS. Camada A + B + C funcionam fim-a-fim em diretórios limpos isolados. Plugin pronto pra release v0.3.0.

## Cenario A — bootstrap normal + symlinks + .gitignore

**Setup:** mktemp `/tmp/v030-a` + `/tmp/v030-a2`, run `scaffold.sh` from plugin path.

| Check | Result |
|---|---|
| A.1 — `AGENTS.md` is a symlink | PASS (`readlink` returns `CLAUDE.md`) |
| A.1 — symlink resolves to a file | PASS (`test -f` on symlink succeeds) |
| A.2 — `.gitignore` has `local/` | PASS |
| A.2 — `.gitignore` has `.claude/wave-runs/` | PASS |
| A.2 — `.gitignore` has `scripts/orchestrate/` | PASS |
| A.3 — 2nd run does not duplicate entries | PASS (count=1 for each of the 3 entries) |
| A.4 — `--no-agents-symlink` flag respected | PASS (`AGENTS.md` not created with flag) |

## Cenario B — paperclip-orchestrator setup

**Setup:** mktemp `/tmp/v030-b`, run `scaffold.sh` first, then `setup-paperclip.sh`.

| Check | Result |
|---|---|
| B.1 — `local/paperclip/playbook.md` created | PASS |
| B.1 — `local/paperclip/AGENTS-dev-primary.md` created | PASS |
| B.1 — `local/paperclip/AGENTS-reviewer.md` created | PASS |
| B.1 — `local/paperclip/dispatch-cheatsheet.md` created | PASS |
| B.1 — `local/paperclip/licoes.md` created | PASS |
| B.2 — `.github/workflows/auto-merge.yml` created | PASS |
| B.2 — `scripts/check-reviewer-approval.sh` created + executable | PASS |
| B.2 — `scripts/check-always-human.sh` created + executable | PASS |
| B.3 — `.gitignore` has `local/` (from scaffold; setup-paperclip is idempotent) | PASS |
| B.4 — anti-grep upstream-specific strings | PASS (only documented examples remain: "if you use Supabase", "e.g. supabase functions serve" etc.) |

## Cenario C — local-waves setup

**Setup:** mktemp `/tmp/v030-c`, run `scaffold.sh` first, then `setup-local-waves.sh`.

| Check | Result |
|---|---|
| C.1 — `scripts/orchestrate/orchestrate-wave.sh` created + executable | PASS |
| C.1 — `scripts/orchestrate/README.md` created | PASS |
| C.2 — `.gitignore` has `.claude/wave-runs/` | PASS |
| C.3 — `bash -n` shell syntax check on orchestrate-wave.sh | PASS |

## Limit known (same as ADR-005 in v0.1.0)

The **runtime/interactive layer** of the new skills (`paperclip-orchestrator` and `local-waves`) — i.e. SKILL.md being loaded by Claude Code + `AskUserQuestion` interaction + resolution of `${CLAUDE_SKILL_DIR}` — is **NOT** validated in this T5. Same fallback pattern used in v0.1.0: validation will happen at the first `/xp-stack:paperclip-setup` and `/xp-stack:local-waves-setup` invocations in a real project, with the outcome registered in MEMORY.md global.

This is a calibrated trade-off: spawning another `claude --plugin-dir` interactively from inside a Claude Code session to test `AskUserQuestion` is not feasible. Shell-direct invocation of the underlying scripts validates the deterministic mechanism (which is most of the surface area). The interactive prompts are 3 questions per skill (proceed/redirect/abort) — low surface area, low risk.

## Test suite (regression)

Confirmed 53/53 verde in the pre-T5 run:

| Suite | Pass/Fail |
|---|---|
| `tests/marketplace_test.sh` | 9/9 |
| `tests/skeleton_test.sh` | 12/12 |
| `tests/scaffold_test.sh` | 5/5 |
| `tests/bootstrap_test.sh` | 16/16 |
| `tests/paperclip_test.sh` | 6/6 |
| `tests/local_waves_test.sh` | 5/5 |
| **Total** | **53/53** |

## Cleanup

`/tmp/v030-{a,a2,b,c}` removed at end of validation run. No leftover artifacts.
