# v1.0.0 — Ship (Reversa-inspired hardening)

**Branch:** `feat/v1.0.0-ship`
**Status:** EM ANDAMENTO
**Iniciado:** 2026-05-02
**Origem:** Análise comparativa do framework `sandeco/reversa` em uso no projeto `central-projetos` (Meteora). Reversa expôs 13 padrões de design que o claude-craft pode absorver sem mudar de propósito (forward methodology). Brainstorming Akita/XP em sessão única do Piloto, 6 perguntas (a 6ª consolidada com 8 sub-decisões), 13 decisões totais, todas aprovadas.

---

## Diagnóstico

| Categoria | claude-craft v0.3.0 | Target v1.0.0 | Gap |
|---|---|---|---|
| Distribuição | Plugin marketplace Claude Code only | npm primário (`xp-stack`) + plugin shim | Multi-engine inviável hoje sem cópia manual |
| Multi-engine | AGENTS.md symlink (simbólico) | Dual mirror real (`.claude/skills/` + `.agents/skills/`) instalado pelo CLI | 12 engines suportadas pelo Reversa, 1 efetiva no claude-craft |
| State persistence | `PROGRESS.md` em prosa, drifta | `state.json` per-feature + `index.json` global, schema versionado | Cold-start em nova sessão = reler tudo |
| Schemas estruturados | Markdown puro em todos os outputs | JSON em `tasks.json`, `sources.json`, `claims.json` (markdown como render) | Agents downstream re-parsam markdown, perdem fidelidade |
| Confidence markers | Ausentes | Estrutural em `claims.json` + `tasks.json`, opcional em prosa | Fato/inferência/lacuna confundem reviewer |
| Doc level | Único nível ("completo") | `essencial`/`completo` em task-decomposition, `L1/L2/L3` em research-cycle | Overhead em features pequenas |
| Update flow | `cp -n` no bootstrap, sem detecção de drift | Manifest SHA-256 + diff prompt em update | Sobrescrita silenciosa de customizações em update |
| Version check | Manual | Auto-check 1x/sessão via `akita-xp-rules` | Usuários ficam em versões antigas indefinidamente |
| RESUME.md | Inexistente | Auto-gerado por hook `Stop` + skill `/xp-stack:resume` | Cold-start exige re-explicação |
| Agents especializados | 4 generalistas (researcher, critic, tdd, reviewer) | + 3 opt-in (db-archaeologist, screenshot-spec-writer, flowchart-extractor) | Casos de uso comuns sem agent dedicado |
| Persona em skills | Descritivo neutro ("this skill...") | "Você é o X. Sua missão é..." em PT-BR (4 skills executoras) | Reduz fidelidade do agent ao papel |
| Slash command | `/xp-stack:bootstrap` (verboso) | + alias curto `/xp` opcional via settings.json | Friction em uso recorrente |
| Skill activation fallback | Assume `Skill` tool | Header de 1-2 linhas em cada SKILL.md ensinando engines sem skill loading | Cursor/Codex/etc. ficam sem instrução clara |

---

## Escopo

### Onda 0 — Fundação (sequencial)

| Task | Subject | Estimativa | Status |
|------|---------|------------|--------|
| [T0](T0-rename-repo.md) | Rename `claude-craft` → `xp-stack` (repo + marketplace.json + README + CLAUDE.md interno) | S | [x] Concluida 2026-05-03 (`6b12a28` + followup `b75b2da`) |
| [T1](T1-npm-package-skeleton.md) | npm package skeleton (`package.json`, `bin/xp-stack`, estrutura `src/`, primeiro `--version`) | M | [x] Concluida 2026-05-03 (`76cf4d6`) |
| [T2](T2-schema-definitions.md) | Schema definitions (`schemas/state.json`, `tasks.json`, `claims.json`, `sources.json`, `manifest.json`, `index.json`) com Ajv | M | [x] Concluida 2026-05-03 (`8bc12cb` + followup `756d221`) |

### Onda 1 — CLI core (paralelizável, 3 paralelos)

| Task | Subject | Estimativa | Status |
|------|---------|------------|--------|
| [T3](T3-cli-init.md) | `xp-stack init` — detect engines, dual mirror, idempotente, manifest writer | L | [ ] Pendente — bloqueada por T2 |
| [T4](T4-cli-update.md) | `xp-stack update` — diff manifest, prompt per-arquivo (keep/take/merge/abort) | L | [ ] Pendente — bloqueada por T2 |
| [T5](T5-cli-status.md) | `xp-stack status` — lê manifest + index, imprime estado atual + drift | S | [ ] Pendente — bloqueada por T2 |
| [T6](T6-cli-add-engine.md) | `xp-stack add-engine <name>` — instala dual mirror em path adicional | S | [ ] Pendente — bloqueada por T3 |
| [T7](T7-cli-add-skill.md) | `xp-stack add-skill <name>` — habilita skill opt-in (paperclip, local-waves, agents B5) | S | [ ] Pendente — bloqueada por T3 |
| [T8](T8-cli-uninstall.md) | `xp-stack uninstall` — remove só arquivos do manifest, preserva user-modified, prompt antes de cada delete | M | [ ] Pendente — bloqueada por T3 |
| [T9](T9-cli-resume.md) | `xp-stack resume [feature]` — lê index, lista features ativas, retoma com state.json | M | [ ] Pendente — bloqueada por T2 |

### Onda 2 — State machine (paralelizável, 2 paralelos)

| Task | Subject | Estimativa | Status |
|------|---------|------------|--------|
| [T10](T10-state-writer.md) | `state.json` writer + reader (skill `task-decomposition` atualizada, regra "JSON wins pra estrutural, markdown wins pra prosa") | M | [ ] Pendente — bloqueada por T2 |
| [T11](T11-index-tracker.md) | `.xp-stack/index.json` global tracker + auto-update via hook `Stop` | M | [ ] Pendente — bloqueada por T10 |
| [T12](T12-resume-md-generator.md) | RESUME.md auto-generator (hook `Stop` + skill `/xp-stack:resume`) | M | [ ] Pendente — bloqueada por T10 + T11 |
| [T13](T13-reconcile-skill.md) | Skill `/xp-stack:reconcile` — quando JSON/markdown divergem, regenera markdown ou pergunta | S | [ ] Pendente — bloqueada por T10 |

### Onda 3 — Schemas + agents (paralelizável, 5 paralelos)

| Task | Subject | Estimativa | Status |
|------|---------|------------|--------|
| [T14](T14-tasks-json-render.md) | `tasks.json` em `task-decomposition` + render markdown derivado | M | [ ] Pendente — bloqueada por T10 |
| [T15](T15-research-schemas.md) | `sources.json` + `claims.json` em `research-cycle` + render markdown derivado + confidence estrutural | L | [ ] Pendente — bloqueada por T2 |
| [T16](T16-agent-db-archaeologist.md) | Agent `db-archaeologist` (analisa Supabase migrations + RLS + schemas, output `database/{schema.json, rls-matrix.json, migrations-timeline.md}`) | L | [ ] Pendente — bloqueada por T2 |
| [T17](T17-agent-screenshot-spec.md) | Agent `screenshot-spec-writer` (recebe screenshot, gera `docs/specs/ui/{screen}.md`) | M | [ ] Pendente — bloqueada por T2 |
| [T18](T18-agent-flowchart.md) | Agent `flowchart-extractor` (recebe arquivo + função, gera Mermaid em `docs/specs/flowcharts/`) | M | [ ] Pendente — bloqueada por T2 |

### Onda 4 — Polish + release (sequencial no fim)

| Task | Subject | Estimativa | Status |
|------|---------|------------|--------|
| [T19](T19-persona-revision.md) | Persona PT-BR em 4 skills executoras (bootstrap, task-decomposition, research-cycle, optimizing-github-actions) | S | [ ] Pendente |
| [T20](T20-doc-level.md) | Doc level configurável: `task-decomposition --level=essencial\|completo`, `research-cycle --level=L1\|L2\|L3` | M | [ ] Pendente — bloqueada por T10 |
| [T21](T21-dual-mirror-detect.md) | Auto-detecção de engines em `init` + `--engine` flag + `--no-dual-mirror` opt-out | S | [ ] Pendente — bloqueada por T3 |
| [T22](T22-version-check.md) | Auto-check de versão npm 1x/sessão via `akita-xp-rules` (cache em `.xp-stack/version-check-cache`) | S | [ ] Pendente — bloqueada por T1 |
| [T23](T23-skill-fallback-headers.md) | Header de 2 linhas em cada SKILL.md ensinando fallback pra engines sem skill loading + alias `/xp` opcional via settings.json template | S | [ ] Pendente |
| [T24](T24-release.md) | Release: ADR-009 + bump 1.0.0 + atualiza CLAUDE.md + npm publish + GitHub release + PR `feat/v1.0.0-ship` → `main` | M | [ ] Pendente — bloqueada por TODAS |

---

## Resumo de paralelismo

| Onda | Tasks | Paralelizável? | Pré-requisito |
|------|-------|----------------|---------------|
| W0 | T0 → T1 → T2 | Não (sequencial estrito) | Nenhum |
| W1 | T3, T4, T5 paralelos; T6/T7/T8 dependem de T3; T9 paralelo a T3 | Sim, 3 em paralelo via paperclip ou local-waves | T2 done |
| W2 | T10 → (T11, T13 paralelos) → T12 | T11 + T13 paralelos | T2 done |
| W3 | T14, T15, T16, T17, T18 todos paralelos | Sim, 5 em paralelo via paperclip | T10 (T14) ou T2 (T15-T18) |
| W4 | T19, T20, T21, T22, T23 paralelos; T24 sequencial no fim | Sim, 5 em paralelo, T24 sequencial | Várias deps cruzadas |

**Estimativa total:** 25 tasks (T0 + T1-T24) em 5 ondas. ~19 dias de trabalho real assumindo paralelismo via paperclip ou local-waves; ~30 dias calendar com revisões + ondas sequenciais entre si.

---

## Como executar

**Por task individual (sessão local):**
```
Read the file docs/tasks/v1.0.0-ship/T{N}-{name}.md and execute the task described in it.
Branch: task/v1.0.0-ship-T{N} (NÃO main, NÃO feat/v1.0.0-ship direto).
TDD obrigatório (red → green → refactor → verify).
Quando done, abrir PR pra feat/v1.0.0-ship (NÃO pra main).
```

**Por onda (paralelismo via paperclip):**
- Atribuir cada T-file da onda a um dev-primary diferente (Sonnet 4.6).
- Reviewer Opus 4.7 valida cada PR.
- Auto-merge gate B aprovado → merge em `feat/v1.0.0-ship`.
- Quando todos PRs da onda merged, próxima onda dispatch.

**Por onda (paralelismo local via local-waves):**
- Decompor T-files da onda em `TERMINAL-PROMPTS.md` (template já no claude-craft).
- `bash scripts/orchestrate/orchestrate-wave.sh run docs/tasks/v1.0.0-ship/`.
- Workers Sonnet headless em git worktrees, BLOCKERS.md discipline.

**PR final v1.0.0:** `feat/v1.0.0-ship` → `main` (não self-merge — Piloto revisa e merga).

---

## Decisões pré-tomadas

Travadas via brainstorming Akita/XP em 2026-05-02 (6 perguntas, 8 decisões):

1. **Release monolítica v1.0.0** — todas as 13 melhorias num único milestone. Razão: coerência interna garantida (state.json + manifest + schemas evoluem casados); decomposição interna em 5 ondas mitiga risco de PR-monstro.
2. **Distribuição: npm primário (`xp-stack`) + plugin marketplace shim** — `npx xp-stack init` é a forma canônica; plugin marketplace continua como atalho fino que chama npm por baixo. Backward compat preservada.
3. **Naming: `xp-stack`** — coerência total: repo, marketplace, plugin, npm, CLI todos com mesmo nome. Inclui rename `claude-craft` → `xp-stack` (T0). GitHub mantém 301 redirect automático.
4. **State location: híbrido per-feature + index global** — `docs/tasks/{feature}/state.json` (fonte de verdade da feature, suporta paralelismo) + `.xp-stack/index.json` (active features, atualizado por hook).
5. **Schemas estruturados em tasks + pesquisas** — `tasks.json`, `sources.json`, `claims.json` viram fonte de verdade pra dados estruturais; markdown vira render humano. **Regra:** JSON wins pra estrutural (status, deps, confidence), markdown wins pra prosa (descrição, reasoning, code snippets).
6. **Confidence markers — escopo controlado** — estrutural em `claims.json` + `tasks.json` (decisões não-óbvias) + outputs de B5 (db-archaeologist etc.); opcional em prosa de `00-overview.md`; **não** globalmente em afirmação de assistente. Glossário copia Reversa (🟢 CONFIRMADO / 🟡 INFERIDO / 🔴 LACUNA).
7. **Agents novos: 3 priorizados** — `db-archaeologist` (Supabase/Postgres analyzer), `screenshot-spec-writer` (UI doc generator), `flowchart-extractor` (Mermaid per função). Critério: utilidade real demonstrada em O Agente e central-projetos.
8. **Doc level por skill** — `task-decomposition` aceita `essencial`/`completo`; `research-cycle` aceita `L1`/`L2`/`L3` (já existe esse pattern em `docs/pesquisas/README.md` do O Agente). Outras skills não aceitam level.
9. **CLI subcommands** — copia Reversa: `init`, `update`, `status`, `add-engine`, `add-skill`, `uninstall` + adiciona `resume`.
10. **Dual mirror always-on** — sempre instala em `.claude/skills/` + `.agents/skills/` mesmo em projeto Claude-only. Override via `--no-dual-mirror`. Razão: custo trivial (cp duplo), ganho de zero-friction quando user adiciona segunda engine.
11. **RESUME.md gerado por hook + skill** — hook `Stop` regenera silenciosamente no fim de cada sessão; skill `/xp-stack:resume` regenera explicitamente. Per-feature em `docs/tasks/{feature}/RESUME.md`.
12. **Manifest scope: tudo do instalador** — trackear skills, templates, settings.json, AGENTS.md symlink, `.gitignore` entries managed. **Não** trackear `state.json`/`index.json`/RESUME.md (mudam toda hora).
13. **Persona PT-BR em 4 skills executoras** — bootstrap, task-decomposition, research-cycle, optimizing-github-actions. `akita-xp-rules` e `tdd-conventions` ficam neutras (doutrina, não ação).

---

## Riscos aceitos

1. **Sem self-test em projetos reais (O Agente, central-projetos) antes do release v1.0.0.** Decisão Piloto 2026-05-02. Validação acontece via testes internos (unit + integration + contract + e2e em fixtures temp). Se quebrar pós-release, hotfix v1.0.1 imediato. Trade-off: velocidade de release vs garantia empírica. Justificativa: regressão tardia barata (single mantenedor, base de usuários atual reduzida).

2. **Plugin marketplace shim depende de Node disponível na máquina.** Já é true na prática hoje pra Claude Code (Node em deps), mas adiciona dep formal pro plugin v1.0+. Mitigação: shim detecta ausência de `npx`, oferece fallback manual com instruções claras.

3. **Migração v0.3.0 → v1.0.0 envolve `state.json` novo + manifest novo.** Usuários atuais que rodarem `update` vão ver ~5-10 prompts (CLAUDE.md modificado? skills modificadas? .gitignore modificado?). Se respondidas hostilemente, pode quebrar projeto. Mitigação: documentação clara de "rode `init --upgrade-from-v0.3` em vez de `update`" pra primeira migração.

4. **JSON↔markdown sync em `tasks.json` é nova convenção.** Pode causar drift se reviewer humano editar markdown sem rodar `/xp-stack:reconcile`. Mitigação: skill `reconcile` é trivial (lê JSON, regera markdown), e PROGRESS.md atual já tem o mesmo problema.

---

## Sub-tasks identificadas

> Follow-ups descobertos durante execução ou review. Ficam aqui como backlog até virarem T-files formais.

| Sub-task | Origem | Descrição |
|---|---|---|
| T{N}.1 | (vazio até começarmos) | — |

---

## Lessons brought forward (origem upstream)

Análise comparativa do Reversa em 2026-05-02 (sessão de brainstorming Piloto):

1. **State machine como JSON com schema versionado** — Reversa usa `.reversa/state.json` com checkpoint por agente, fases ordenadas, retomada via `phase` field. claude-craft adapta pra `docs/tasks/{feature}/state.json` per-feature + index global pra suportar paralelismo.
2. **Plan editável humano** — Reversa tem `.reversa/plan.md` com tarefas marcáveis (✅/[ ]) que o Pilot pode editar antes de aprovar. claude-craft já tem isso via `00-overview.md` na pasta da feature, basta padronizar a "tabela de tasks editável" em todo overview.
3. **Schema-driven structured outputs** — Reversa documenta schemas em `references/{name}-schema.md` (ex: surface-schema, modules-schema). claude-craft adota: cada `*.json` tem schema versionado em `schemas/`, validado por Ajv no CLI.
4. **Confidence markers com glossário fixo** — Reversa: 🟢 CONFIRMADO / 🟡 INFERIDO / 🔴 LACUNA. Copia exata, mesmo glossário, mesma semântica.
5. **SHA-256 manifest pra updates seguros** — Reversa rastreia hashes de cada arquivo criado pelo instalador. Update detecta drift. Uninstall sabe exatamente o que remover.
6. **Configuração em camadas** — Reversa tem `config.toml` (managed) + `config.user.toml` (user, gitignored). claude-craft adapta pra `.xp-stack/config.json` (managed) + `.xp-stack/config.user.json` (gitignored).
7. **Verificação automática de versão** — Reversa compara `.reversa/version` com npm registry e avisa de update. claude-craft replica via `akita-xp-rules` skill (auto-loaded).
8. **RESUME.md auto-gerado** — Reversa mantém um snapshot vivo. claude-craft replica per-feature, gerado por hook `Stop` + skill explícita.
9. **Output isolado em pasta dedicada (`_reversa_sdd/`)** — claude-craft NÃO replica essa decisão (integrar com `docs/` nativo é decisão consciente). Decisão validada no brainstorming.
10. **Slash command nativo + fallback de palavra solta** — Reversa: `/reversa` ou só "reversa". claude-craft adota alias curto `/xp` opcional via settings.json template (T23).
11. **Skills como persona explícita** — Reversa abre cada SKILL.md com "Você é o X. Sua missão é...". claude-craft adota em 4 skills executoras (T19).
12. **Fallback para engines sem skill loading** — Reversa: "Se a engine não suportar ativação direta, leia este arquivo inteiro." claude-craft replica como header em cada SKILL.md (T23).
13. **Agentes independentes composáveis** — Reversa tem Visor/Data Master/Design System rodando em qualquer fase. claude-craft adota 3 análogos: db-archaeologist (T16), screenshot-spec-writer (T17), flowchart-extractor (T18).

---

## Ao concluir a feature

Quando TODAS as tasks tiverem `[x] Concluída`:

1. Atualizar header deste arquivo: `**Status:** CONCLUIDA on YYYY-MM-DD`.
2. Atualizar `PROGRESS.md` com snapshot final de métricas (tempo total, # PRs, tamanho do diff, # bugs descobertos pós-release).
3. Adicionar **ADR-009** ao CLAUDE.md raiz: "Reversa-inspired hardening — npm CLI + state machine + schemas + agents independentes". Incluir trade-offs validados (sem self-test pré-release, JSON wins pra estrutural).
4. **NÃO apagar a pasta.** Ver `docs/tasks/_template/README.md` > "Archival policy". Quando `docs/tasks/` poluir, mover pra `docs/tasks/_archive/v1.0.0-ship/` via `git mv`.
