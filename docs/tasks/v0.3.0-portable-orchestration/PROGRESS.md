# v0.3.0 Portable Orchestration — PROGRESS

> Snapshot vivo do progresso. Atualizado a cada T-file completado.

## Status snapshot

| Task | Status | Commit | Notas |
|------|--------|--------|-------|
| T0 | [x] Concluida 2026-04-29 | `6218182` | Branch + decomposition criados |
| T1 | [x] Concluida 2026-04-29 | `19b5dc3` | RED — bootstrap 12/4, paperclip 0/6, local-waves 0/5 |
| T2 | [x] Concluida 2026-04-29 | `f857de3` | GREEN Camada A — bootstrap 16/16, regressao zero |
| T3 | [x] Concluida 2026-04-29 | `b9e1ebd` | GREEN Camada B — paperclip 6/6 + 8 templates anonimizados + 9 licoes |
| T4 | [x] Concluida 2026-04-29 | `a8f36af` | GREEN Camada C — local-waves 5/5 |
| T5 | [x] Concluida 2026-04-29 | `c25c172` | Empirical 3 cenarios PASS shell-direct, 53/53 verde |
| T6 | [x] Concluida 2026-04-29 | `43992e1` | Release v0.3.0 — PR https://github.com/RNobre1/claude-craft/pull/1 aberto pro Pilot revisar |

## Decisoes registradas

- 2026-04-29: estrutura de 6 tasks sequenciais aprovada pelo Pilot (sem paralelismo, todas tocam o plugin).
- 2026-04-29: templates Paperclip = formato vazio + 9 licoes anonimizadas em `references/licoes-do-piloto.md`.
- 2026-04-29: symlinks `AGENTS.md`/`AGENTS.local.md` sao default-ON no bootstrap (opt-out via flag).
- 2026-04-29: paperclip-orchestrator e local-waves sao 2 skills separadas, ambas `disable-model-invocation: true`.
- 2026-04-29 (T2 incidente): cenario 16 "no-symlink flag" ja passava em RED por acidente (scaffold ignorava 6o arg silenciosamente). Em T2 a logica foi implementada explicitamente — funciona corretamente agora.
- 2026-04-29 (T3 acabamento): "supabase" remanesce em 4 lugares dos templates Paperclip mas todos como exemplo opt-in ("if you use", "e.g.", "or equivalent"). Decisao: aceitar como didatico — usuario precisa de exemplo concreto pra entender. Anti-grep de T5 cenario B confirma que nenhuma referencia eh hardcoded.

## Cronologia

- 2026-04-29 (manha): T0 iniciada — branch + 8 arquivos decomposition.
- 2026-04-29 (manha): T1 — 5 cenarios novos em bootstrap_test.sh + 2 arquivos novos paperclip_test.sh + local_waves_test.sh, RED confirmado.
- 2026-04-29 (manha): T2 — scaffold.sh ganha 6o arg opcional, symlinks AGENTS.md, .gitignore autoupdate idempotente. SKILL.md + akita-xp-rules + CLAUDE.md.template atualizados. 16/16 verde + 27/27 regressao.
- 2026-04-29 (tarde): T3 — paperclip-orchestrator skill criada com 8 templates anonimizados + setup-paperclip.sh + 9 licoes em references/. 6/6 + 42/42 regressao.
- 2026-04-29 (tarde): T4 — local-waves skill criada com orchestrate-wave.sh.template + setup-local-waves.sh + README.md.template. 5/5 + 48/48 regressao.
- 2026-04-29 (tarde): T5 — 3 cenarios empiricos shell-direct PASS, 53/53 suite total.
- 2026-04-29 (tarde): T6 — release prep (plugin.json bump, marketplace.json update, ADR-008, CLAUDE.md Estado atual + 2 novas licoes aprendidas).
