# v1.0.0-ship — Progress Final

**Status:** CONCLUIDA on 2026-05-03
**Branch:** `feat/v1.0.0-ship` (mergeada em main após PR)
**Tag:** `v1.0.0` (criada após npm publish)

## Métricas finais

| Métrica | Valor |
|---|---|
| Tasks totais | 25 (T0-T24, T3 expandido em T3.1-T3.4 helpers) |
| Ondas | 5 (W0 fundação, W1 CLI core, W2 state machine, W3 schemas+agents, W4 polish+release) |
| Commits no branch | ~50 (incluindo plans, closures, fixes, ruidosos T17) |
| Tests vitest | 128 |
| Tests bash | 53 (preservados, sem regression) |
| Subcomandos CLI | 10 (init, update, status, add-engine, add-skill, uninstall, resume, hook-stop, regenerate-resume, reconcile) + version flag |
| Helpers JS | 9 (engines, manifest, installer, index-tracker, state, resume-generator, markdown-tasks, tasks, research, research-renderer) |
| Schemas JSON | 6 (state, tasks, sources, claims, manifest, index) |
| Agents opt-in | 3 (db-archaeologist, screenshot-spec-writer, flowchart-extractor) |
| Skills com persona PT-BR | 4 (bootstrap, task-decomposition, research-cycle, optimizing-github-actions) |
| Skills total no plugin | 8 |

## Highlights

- npm CLI multi-engine (`xp-stack` no npm registry)
- Plugin marketplace mantido como shim backward-compat
- State machine + RESUME auto-gen + reconcile JSON↔markdown
- 3 agents opt-in instaláveis via `xp-stack add-skill <name>`
- Manifest SHA-256 + diff em update (sem sobrescrever customizações silently)
- Auto check de versão npm (1x/sessão via akita-xp-rules)
- Fallback headers pra engines sem skill loading

## Riscos materializados (pos-release)

(preencher se houver issues abertas no GitHub apos release v1.0.0)

## Lessons brought forward (pra v1.1+)

- Working tree instability com templates (subagents persistem deletes em sandbox próprio) — workaround `git checkout HEAD -- ...`
- 3 commits ruidosos T17 — ao fazer revert de commit que toca múltiplas paths, verificar exatamente o que foi revertido antes de re-criar
- DRY violations em research.js (read/write pairs) — candidato a `makeJsonCollection(fileName, schemaName)` em refactor v1.1
- Sync tasks.json ↔ state.json deferido pra refactor v1.1
- `setTaskStatus` error message vague (depende de schema rejection — fix trivial v1.1)
