# T2 — GREEN Camada A: bootstrap + akita-xp-rules + CLAUDE.md.template

**Status:** [ ] Pendente
**Branch:** feat/v0.3.0-portable-orchestration
**Fase TDD:** GREEN
**Depende de:** T1

## Objetivo

Fazer cenarios 12-16 do `bootstrap_test.sh` passarem. Atualizar `akita-xp-rules` SKILL.md com appendix superpowers integration. Atualizar `CLAUDE.md.template` com placeholder.

## Arquivos que PODE tocar

- `plugins/xp-stack/skills/bootstrap/SKILL.md`
- `plugins/xp-stack/skills/bootstrap/scripts/scaffold.sh`
- `plugins/xp-stack/skills/akita-xp-rules/SKILL.md`
- `plugins/xp-stack/templates/CLAUDE.md.template`

## Arquivos PROIBIDOS

- Tudo em `plugins/xp-stack/skills/paperclip-orchestrator/`, `local-waves/` — vai ser tocado em T3/T4
- `tests/*.sh` — RED ja foi feito em T1

## Implementacao

### scaffold.sh — adicionar 2 secoes

1. **Symlinks AGENTS.md** (apos copia de CLAUDE.md, antes de copia de templates):
   - Aceitar 6o arg opcional `AGENTS_SYMLINK_OPT` ("no-symlink" pula). Default: cria.
   - Se CLAUDE.md existe e AGENTS.md nao existe: `ln -s CLAUDE.md "$TARGET_DIR/AGENTS.md"` (symlink relativo).
   - Se CLAUDE.local.md existe e AGENTS.local.md nao existe: idem.
   - Se symlink ja existe: skip.

2. **`.gitignore` autoupdate** (no fim):
   - 3 entries pra adicionar (se nao existirem ja): `local/`, `.claude/wave-runs/`, `scripts/orchestrate/`.
   - Read-modify-write: ler `.gitignore` (ou criar se nao existe), grep cada entry, append apenas as que faltam.
   - Idempotente: 2x execucao = mesma estrutura.

### bootstrap SKILL.md — atualizar Step 4 + descricao

- Step 4 (Report to user): mencionar que `AGENTS.md` foi criado como symlink pra `CLAUDE.md` (pra Antigravity/Codex/Cursor); `.gitignore` ganhou 3 entries pra orchestracao.
- `description` no frontmatter: ajustar pra refletir nova capacidade. Manter sob 1536 chars.

### akita-xp-rules SKILL.md — appendix

Apos a Rule 6 atual, adicionar secao:

```markdown
## Appendix: Mandatory Skill Integration (Akita/XP gaps)

Five superpowers skills close known process gaps and must be invoked at specific
moments. Not optional — the project history demonstrates real cost when skipped.

| Skill | Trigger | Gap |
|-------|---------|-----|
| `superpowers:brainstorming` | Phase 1 of any non-trivial feature (>1 day, multiple files, open requirements) | Skipping straight to T-files = design rework |
| `superpowers:systematic-debugging` | Before proposing ANY fix for a bug, test failure, or unexpected behavior | Hypothesis-by-guess wastes hours; ranked hypotheses cut time |
| `superpowers:verification-before-completion` | Before marking task `[x] completed`, before opening PR, before claiming "tests pass" | Evidence before assertion — past regressions came from "I think it's OK" |
| `superpowers:dispatching-parallel-agents` (+ `using-git-worktrees`) | When a wave has 2+ independent T-files | Manual N-terminal pattern is fragile; worktrees give FS isolation |
| `xp-stack:optimizing-github-actions` | Before any PR that touches `.github/workflows/*.yml` (auto-activated via `paths` field) | Supply-chain CVEs, broken CI artifacts, unpinned actions |

These skills are part of the official `superpowers` plugin (or this `xp-stack` plugin
in the case of `optimizing-github-actions`). Install via `/plugin install superpowers`
and confirm they appear in `/plugin list`.

If your project's CLAUDE.md says "do not use TDD" or otherwise contradicts these
defaults, the project CLAUDE.md wins — user instructions take priority over skills.
```

### CLAUDE.md.template — adicionar 2 secoes

Apos "Research cycle":

```markdown
### Mandatory skill integration

Five workflow skills are mandatory at specific moments. See `xp-stack:akita-xp-rules`
appendix for the full table. Highlights:

- Phase 1 design -> `superpowers:brainstorming`
- Any bug/test failure -> `superpowers:systematic-debugging`
- Before "done" claim -> `superpowers:verification-before-completion`
- 2+ independent tasks -> `superpowers:dispatching-parallel-agents`
- `.github/workflows/*.yml` edits -> `xp-stack:optimizing-github-actions` (auto)

### Archival policy

Never delete completed task folders. Two options:
1. Keep in-place with `**Status:** COMPLETED on YYYY-MM-DD` (default).
2. `git mv` to `docs/tasks/_archive/{feature}/` once `docs/tasks/` gets cluttered.

Reason: completed tasks contain non-reconstructable context (decisions, incidents,
trade-offs) that `git log` does not surface quickly.
```

E atualizar a secao "Project" pra incluir nota:

```markdown
## Project

- **Name:** {{PROJECT_NAME}}
- **Stack:** {{PROJECT_STACK}}
- **Description:** {{PROJECT_DESCRIPTION}}

> Note: `AGENTS.md` (and `AGENTS.local.md` if present) are symlinks to this file
> so that Antigravity/Codex/Cursor read the same source of truth as Claude Code.
> Do not edit AGENTS.md directly — edit CLAUDE.md and the symlink propagates.
```

## Sequencia TDD

1. Atualizar `scaffold.sh` (symlinks + gitignore).
2. Rodar `bash tests/bootstrap_test.sh` -> esperar 16/16 verde.
3. Atualizar `akita-xp-rules/SKILL.md` (appendix).
4. Atualizar `bootstrap/SKILL.md` (description e Step 4).
5. Atualizar `templates/CLAUDE.md.template` (2 secoes + nota AGENTS.md).
6. Rodar suite completa de tests bash: `for f in tests/*.sh; do bash "$f" || echo "FAIL: $f"; done` -> tudo verde nos 4 arquivos existentes (bootstrap 16/16, marketplace 9/9, skeleton 12/12, scaffold 5/5). paperclip e local-waves continuam vermelhos (T3/T4).
7. Commit: `feat(bootstrap): symlinks AGENTS.md + .gitignore autoupdate + superpowers appendix`

## Criterios de aceite

- [ ] `bash tests/bootstrap_test.sh` -> 16/16 verde.
- [ ] `bash tests/marketplace_test.sh` -> 9/9 verde (regressao).
- [ ] `bash tests/skeleton_test.sh` -> 12/12 verde (regressao).
- [ ] `bash tests/scaffold_test.sh` -> 5/5 verde (regressao).
- [ ] Manual smoke test em `/tmp`: `bash scaffold.sh /tmp/v030-smoke "x" "y" "z" "create"` cria CLAUDE.md + AGENTS.md symlink + .gitignore com 3 entries.
- [ ] `description` em `bootstrap/SKILL.md` ainda <= 1536 chars (test cenario 11).
- [ ] `description` em `akita-xp-rules/SKILL.md` ainda <= 1536 chars (manter compatibilidade).

## Verificacao final

```bash
cd /home/rnobre/dev/claude-craft
for f in tests/*.sh; do
  echo "=== $f ==="
  bash "$f" 2>&1 | tail -3
done
```

Esperado: bootstrap 16/16, marketplace 9/9, skeleton 12/12, scaffold 5/5, paperclip 0-1/6 (description test pode passar se ja criou SKILL.md, mas resto falha), local-waves 0-1/5.
