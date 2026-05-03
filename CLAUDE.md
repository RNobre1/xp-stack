# xp-stack

> Marketplace Claude Code para distribuicao do stack metodologico XP/Akita — TDD absoluto, pair programming, pesquisa formal, task decomposition, conventional commits.

## Objetivo

Empacotar e distribuir o ferramental reusavel desenvolvido no projeto O Agente (Meteora Digital) como plugin Claude Code instalavel por qualquer pessoa via marketplace git. Dois comandos instalam tudo:

```
/plugin marketplace add RNobre1/xp-stack
/plugin install xp-stack@xp-stack
```

## Stack

- **Testes:** bash puro (tests/*.sh), zero dependencias externas
- **CI/CD:** GitHub Actions (.github/workflows/validate-plugins.yml)
- **Distribuicao:** Claude Code plugin system (>= outubro 2025)
- **Linguagem dos scripts:** bash (scaffold, validacao)

## Arquitetura

Repo = marketplace git. Contem um plugin unico (`xp-stack`) com skills, agents, templates e stubs MCP.

```
RNobre1/xp-stack/
├── .claude-plugin/marketplace.json     # registro do marketplace
├── .github/workflows/                  # CI: validacao JSON + frontmatter
├── plugins/
│   ├── xp-stack/                       # plugin principal
│   │   ├── .claude-plugin/plugin.json  # manifest v0.1.0
│   │   ├── skills/                     # 5 skills (invocaveis via /xp-stack:*)
│   │   ├── agents/                     # 4 agents (researcher, tdd, reviewer, research-critic)
│   │   ├── templates/                  # templates copiados por bootstrap
│   │   └── .mcp.json                   # stubs MCP opcionais
│   └── poc-bootstrap/                  # [historico] POC que validou !command + ${CLAUDE_SKILL_DIR}
├── tests/                              # testes puro bash
├── docs/tasks/                         # task decomposition por feature
├── CLAUDE.md                           # este arquivo
├── README.md                           # instrucoes de instalacao
└── LICENSE                             # MIT
```

## Variaveis de ambiente

Nenhuma obrigatoria. MCPs usam `userConfig` do plugin (preenchido ao habilitar).

## Como rodar testes

```bash
bash tests/marketplace_test.sh   # valida marketplace.json + plugin.json (9 cenarios)
bash tests/skeleton_test.sh      # valida skeleton do plugin xp-stack (12 cenarios)
bash tests/scaffold_test.sh      # testes do POC bootstrap (5 cenarios)
```

## Como testar plugin localmente

```bash
claude --plugin-dir ./plugins/xp-stack
```

## Decisoes tecnicas

### ADR-001: Marketplace + plugin como vetor de distribuicao
**Decisao:** usar o sistema oficial de plugins Claude Code (marketplace git + plugin.json) em vez de arquivo unico, script bash standalone, submodule, npm package, ou Copier.
**Razao:** versionamento SemVer nativo, cache imutavel, update diff-based, validate oficial, namespace de skills, userConfig com keychain, isolamento total do repo receptor.
**Ref:** pesquisa `replicar-stack-claude-code.md` (O Agente), secoes 6-10.

### ADR-002: !command + ${CLAUDE_SKILL_DIR} para bootstrap
**Decisao:** skill bootstrap usa shell injection pre-processado para copiar templates via script bash deterministico.
**Razao:** deterministico (vs modelo gerando arquivos), idempotente (cp -n), auditavel (diff do commit).
**Validacao:** POC `poc-bootstrap` em branch feat/poc-bootstrap, 5/5 testes + invocacao empirica.

### ADR-003: install-global-rules diferido
**Decisao:** nao implementar skill que escreve em ~/.claude/CLAUDE.md do receptor.
**Razao:** hipotese grade D (sem validacao empirica), risco de sobrescrever configs do usuario.
**Status:** diferido ate POC proprio. Regras globais ficam como skill content inline.

### ADR-004: Curadoria — extracao de conteudo portavel vs especifico
**Decisao:** extrair apenas conteudo portavel (metodologia universal) do O Agente; agents e skills dizem "read the project's CLAUDE.md" em vez de hardcodar convencoes.
**Razao:** o plugin deve ser instalavel em qualquer stack (TypeScript, Python, Go, bash). Refs a Supabase, WhatsApp, Evolution API, Vitest paths, entidades de dominio foram removidas.
**Excluidos:** agents strategist/antigravity-prompt/migration (especificos do workflow O Agente), memory files com refs a ADRs/PRs/pessoas/servicos especificos.
**Incluidos:** 4 agents (researcher, research-critic, tdd, reviewer) + 4 skills (akita-xp-rules, tdd-conventions, task-decomposition, research-cycle).
**Ref:** /tmp/claude-craft-curadoria.md (gerado em 2026-04-15 pelo orquestrador no repo O Agente).

### ADR-005: Bootstrap skill final — design e limite da validacao empirica
**Decisao:** a skill `bootstrap` usa `AskUserQuestion` batched (3 perguntas em 1 chamada: nome + stack + descricao) seguido de uma segunda chamada condicional (acao sobre CLAUDE.md existente: skip/backup/abort) e entao invoca `bash ${CLAUDE_SKILL_DIR}/scripts/scaffold.sh` com 5 argumentos posicionais. O script aceita 4 modos de `CLAUDE_MD_ACTION` (create, skip, backup, abort), substitui placeholders via `sed -e "s|{{PROJECT_NAME}}|...|g"` com pipe como delimitador, e usa loop manual `cp` + `test -e` (em vez de `cp -rn`) para portabilidade entre BSD e GNU coreutils.
**Razao:** batched questions economizam roundtrips; a pergunta condicional sobre CLAUDE.md existente reduz risco de sobrescrever trabalho do usuario; pipe como sed delimiter evita conflito com paths; loop manual e `cp -n` garantem idempotencia sem depender de flags GNU-especificas.
**Validacao empirica:** Fase 2 de T3 executou scaffold.sh via shell-direct nos 4 modos em dirs isolados `/tmp/bootstrap-empirical-{A,B,C,D}` (4/4 PASS em 2026-04-16). Cobertura estrutural: 11/11 em `bootstrap_test.sh`. Regressao: 37/37 (marketplace 9 + skeleton 12 + scaffold 5 + bootstrap 11).
**Limite conhecido:** a camada runtime/interativa (SKILL.md consumida pelo Claude Code + `AskUserQuestion` batched + resolucao de `${CLAUDE_SKILL_DIR}`) NAO foi validada nesta sessao — sera validada no primeiro teste de aceitacao em projeto real e registrada no MEMORY.md global. Autorizacao: T3 linha 92 + decisao do Piloto em 2026-04-16 (duplicaria teste de aceitacao imediato).

### ADR-006: v0.1.1 — fixes cosmeticos pos primeiro self-test empirico
**Decisao:** patch com 5 ajustes textuais/config apos self-test do v0.1.0 em projeto real (betflow, 2026-04-16). Todos fixes foram identificados na Parte 7 do self-test como WARN (nao FAIL).
**Mudancas:** (1) Rule 3 de akita-xp-rules reformulada de "Contained Environment" para "Isolated Execution Context (container OR host workspace)" — remove ambiguidade. (2) research-cycle esclarece distincao entre "5 skill flow steps" vs "7 researcher agent internal phases". (3) CLAUDE.md.template adiciona secao "Testing conventions" referenciando xp-stack:tdd-conventions (antes so mencionava 3 das 4 skills regulares). (4) .mcp.json esvaziado — stubs supabase/slack/notion removidos, causavam 3 errors cosmeticos em projetos sem essas creds. (5) README atualizado de "skeleton com placeholders" para "V0.1.1 funcional" + nota explicita sobre bootstrap ser one-shot manual.
**Validacao:** self-test completo em betflow (17 PASS / 5 WARN / 0 FAIL). Todos os WARNs viraram fixes nesta versao. Regressao esperada apos patch: 37/37 testes bash verdes (sem mudanca estrutural nos testes).
**Ref:** `/tmp/plugin-update-2026-04-16.md` (spec gerada no repo origem O Agente via `docs/update-plugin-prompt.md`). Primeiro uso real do fluxo de sync O-Agente → claude-craft.

### ADR-008: v0.3.0 — paperclip-orchestrator + local-waves + AGENTS.md symlinks

**Decisao:** v0.3.0 portar 3 capacidades validadas em producao no projeto upstream O Agente:

1. **`paperclip-orchestrator` skill** (opt-in, `disable-model-invocation: true`): copia 8 templates pra `local/paperclip/` (gitignored) + `.github/workflows/auto-merge.yml` + `scripts/check-{reviewer-approval,always-human}.sh`. Pattern multi-agent dispatch remoto via Paperclip CLI no droplet, reviewer Opus via cron Routine, gate B com 4 checks (CI fast-lane + always-human + reviewer APPROVE + cobertura). Comando `/xp-stack:paperclip-setup`.

2. **`local-waves` skill** (opt-in, `disable-model-invocation: true`): copia `orchestrate-wave.sh` + `README.md` pra `scripts/orchestrate/`. Alternativa local ao Paperclip: orquestrador Opus + N workers Sonnet headless (`claude -p`) em git worktrees isolados, com BLOCKERS.md discipline. Comando `/xp-stack:local-waves-setup`.

3. **`bootstrap` atualizado** (Camada A automatica): cria symlinks `AGENTS.md -> CLAUDE.md` (e `AGENTS.local.md -> CLAUDE.local.md` condicional), default-ON com opt-out via 6o arg `no-symlink`. Adiciona 3 entries reservadas no `.gitignore` (`local/`, `.claude/wave-runs/`, `scripts/orchestrate/`) idempotente, sem sobrescrever preexistente.

4. **`akita-xp-rules` ganha appendix** "Mandatory Skill Integration" com tabela de 5 skills do superpowers obrigatorias em momentos especificos do ciclo Akita/XP (brainstorming antes de Fase 1, systematic-debugging antes de qualquer fix, verification-before-completion antes de marcar `[x]`, dispatching-parallel-agents pra waves 2+ tasks, optimizing-github-actions auto-via-paths em workflows). Anti-pattern: invocar skill por nome em narracao nao eh invocar skill.

5. **`CLAUDE.md.template` ganha 3 secoes:** nota AGENTS.md symlink, "Mandatory skill integration" + "Optional multi-agent dispatch" + "Archival policy" (esta ultima ja existia em task-decomposition skill, agora visivel no CLAUDE.md).

**Razao:** Origem direta — Wave 1 piloto de Paperclip no upstream O Agente (2026-04-27, 9 licoes documentadas em `local/paperclip/licoes.md`). Padroes universais (multi-agent dispatch async/sync, gate auto-merge GitHub Actions, AGENTS.md ↔ CLAUDE.md sync, superpowers integration table) NAO dependem de stack TypeScript / Supabase / WhatsApp / etc. Empacotar via plugin reduz custo de adocao em qualquer projeto novo (1 comando vs 1700+ linhas markdown copiadas a mao).

**Templates anonimizados:** referencias hardcoded a stack-especifico (Vitest, Supabase, WhatsApp, Cohere, Resend, AssemblyAI, Hotmart, OpenRouter), nomes pessoais (Felipe, Rafael), IPs (209.97.x), tracker interno (gestao-ti), PR numbers e IDs Paperclip foram removidos. Deixados apenas como exemplo opt-in com prefixos "if you use", "e.g.", "or equivalent". As 9 licoes reais aparecem como case study em `references/licoes-do-piloto.md` (sem PR #s, sem IDs, sem hashes) — leitura recomendada antes da Wave 1.

**Decision tree Paperclip vs local-waves** documentado em ambos os SKILL.md: remote async com droplet + DB + cron (Paperclip) vs local sync com worktrees + claude -p headless (local-waves). Coexistem no mesmo projeto sem conflito (`local/paperclip/` vs `scripts/orchestrate/`).

**Validacao empirica T5:** 3 cenarios shell-direct em `/tmp/v030-{a,b,c}` + `/tmp/v030-a2`, todos PASS. Suite bash 53/53 verde (marketplace 9 + skeleton 12 + scaffold 5 + bootstrap 16 + paperclip 6 + local-waves 5).

**Limite conhecido:** mesmo padrao do ADR-005 v0.1.0 e ADR-006 v0.1.1 — camada runtime SKILL.md (`AskUserQuestion` + resolucao de `${CLAUDE_SKILL_DIR}`) das 2 skills novas fica pra primeiro uso real em projeto. Sera registrado em ADR de patch se aparecer issue.

**Ref:** `docs/tasks/v0.3.0-portable-orchestration/` — 6 T-files com decomposicao completa (T1 RED bash, T2 GREEN Camada A, T3 GREEN Camada B, T4 GREEN Camada C, T5 empirical, T6 release). Origem upstream: `local/paperclip/` (5 arquivos), `scripts/orchestrate/orchestrate-wave.sh`, `.github/workflows/auto-merge.yml`, `scripts/check-{reviewer-approval,always-human}.sh`. Terceiro uso do fluxo de sync O-Agente → claude-craft (apos v0.1.1 e v0.2.0).

### ADR-009 (v1.0.0, 2026-05-03) — Reversa-inspired hardening

**Decisao:** npm CLI primario (`xp-stack`) + plugin marketplace shim, dual mirror always-on (claude-code + antigravity), state machine per-feature (state.json) + global index, schemas estruturados (tasks/sources/claims/manifest/index), confidence markers, manifest SHA-256 com diff em update, RESUME.md auto-gen via hook Stop, doc level configuravel, 3 agents opt-in (db-archaeologist, screenshot-spec-writer, flowchart-extractor), persona PT-BR em 4 skills executoras, fallback headers pra engines sem skill loading, alias `/xp`. Trade-off aceito: sem self-test em projetos reais antes do release (validacao via 128 tests internos + smoke E2E). 24 tasks em 5 ondas, ~50 commits no branch feat/v1.0.0-ship.

**Ref:** `docs/tasks/v1.0.0-ship/` — decomposicao completa em 25 tasks (T0-T24).

### ADR-007: optimizing-github-actions skill — adicionada na v0.2.0
**Decisao:** adicionar 6a skill `optimizing-github-actions` extraida de trabalho validado no repo origem O Agente (pesquisa `docs/pesquisas/skill-ci-workflows-github-actions.md`, triangulacao 0.86 em 24 fontes, validada empiricamente reduzindo um workflow de 33min → 14min wall-clock e zerando 6 red flags detectados pela auditoria de SHA pin).

**Razao:** GitHub Actions evolui rapido (artifact v4 breaking change Dez/2023, ARM gratis Jan/2025, supply-chain incident tj-actions/changed-files Mar/2025, mudanca de pull_request_target Nov/2025). Sem uma skill que se ative automaticamente quando a IA edita `.github/workflows/*.yml`, cada edicao vira ato de memoria. O campo `paths` no frontmatter — descoberto durante revisao adversarial da pesquisa de origem — da ativacao deterministica sem poluir outros contextos.

**Escopo:**
- Inclui patterns universais + decision matrices + pre-flight checklist de 10 itens.
- Inclui audit script (`scripts/audit-action-pins.sh`) — util pra qualquer projeto.
- EXCLUI anti-patterns project-specific do upstream (incident-specific: corrupcao Docker cache de projeto particular, eval gate Licao 22, etc.). Esses ficam no CLAUDE.md / runbook do projeto upstream.

**Mecanismo de ativacao:** `paths: .github/workflows/**` no frontmatter (nao hook). E mais economico que hook em settings.json (que dispararia em qualquer edicao, mesmo trivial), e combinado com `description` matching da ativacao no sweet-spot.

**Update em akita-xp-rules:** Rule 6 ("Communication and Context") ganhou item explicito "Single-Author Commits (No Co-Authored-By)". Recupera preferencia que ja estava no `~/.claude/CLAUDE.md` global do user upstream Rule 6 mas que nao havia sido portada pra `akita-xp-rules` do plugin ainda.

**Ref:** `/tmp/plugin-update-2026-04-26.md` + arquivos staged em `/tmp/plugin-update-2026-04-26-files/`. Segundo uso do fluxo de sync O-Agente → claude-craft.

## Estado atual

- [x] POC bootstrap empirico (feat/poc-bootstrap)
- [x] Marketplace structure (feat/marketplace-structure) — manifests, CI, skeleton
- [x] extract-portable-skills (feat/extract-portable-skills) — conteudo curado substituiu placeholders em 4 agents + 4 skills
- [x] write-bootstrap-skill (feat/write-bootstrap-skill) — 2026-04-16 — 3 tasks (T1 templates, T2 scaffold.sh, T3 SKILL.md+empirico), 37/37 testes verdes, 4/4 cenarios empiricos PASS
- [x] v0.1.1 patch (feat/plugin-update-2026-04-16) — 2026-04-16 — 5 fixes cosmeticos pos self-test em betflow (ADR-006)
- [x] v0.2.0 minor (feat/plugin-update-2026-04-26) — 2026-04-26 — nova skill `optimizing-github-actions` (218-line SKILL.md + 7 references + 2 examples + audit script, auto-ativada via `paths` field) + `akita-xp-rules` Rule 6 ganha proibicao de Co-Authored-By trailers (ADR-007)
- [x] v0.3.0 minor (feat/v0.3.0-portable-orchestration) — 2026-04-29 — 2 novas skills opt-in (`paperclip-orchestrator` com 8 templates + 9 licoes anonimizadas, `local-waves` com orchestrate-wave.sh) + `bootstrap` ganha symlinks AGENTS.md + .gitignore autoupdate + `akita-xp-rules` ganha appendix "Mandatory Skill Integration" (ADR-008). Suite 53/53.
- [x] v1.0.0 (feat/v1.0.0-ship) — 2026-05-03 — Reversa-inspired hardening. npm CLI primario (`xp-stack`) + dual mirror always-on + state machine (state.json + index.json) + schemas estruturados (tasks/sources/claims/manifest/index) + RESUME.md auto-gen via hook Stop + manifest SHA-256 com diff + 3 agents opt-in + persona PT-BR em 4 skills + fallback headers + alias `/xp` + auto-check versao npm. Suite vitest 128/128. ADR-009.
- [ ] ~~poc-mcp-userconfig~~ — **DISPENSADO** na v0.1.1 ao remover stubs MCP do plugin. MCPs passam a ser configurados pelo usuario fora do plugin via `claude mcp add`, entao a validacao de `userConfig sensitive` no keychain Linux deixa de ser pre-requisito pro plugin. Se o plugin voltar a declarar MCPs com userConfig no futuro, este POC volta como pendente.

## Licoes aprendidas

- **Curadoria > copia-cola (2026-04-15):** na extract-portable-skills, separar "metodologia universal" de "convencoes do stack" exige decisao ativa. Regras puras (TDD, pair programming, YAGNI, conventional commits) foram para skills; convencoes de teste (Vitest paths, jsdom, portugues em describes) foram descartadas. Agents aprenderam a ler o `CLAUDE.md` do projeto receptor em vez de assumir stack.
- **disable-model-invocation oculta da listagem (2026-04-15):** skills com `disable-model-invocation: true` (ex: bootstrap) nao aparecem quando o modelo lista skills carregadas, mas sao carregadas pelo plugin — sao invocadas apenas via `/xp-stack:bootstrap` explicito pelo usuario. Validar contagem via `ls plugins/xp-stack/skills/`, nao pela listagem do modelo.
- **Validacao empirica shell-direct vs runtime-interativo (2026-04-16):** de dentro de uma sessao Claude Code nao e possivel spawnar outro `claude --plugin-dir` interativo para validar `AskUserQuestion`. O fallback legitimo e invocar o script alvo (scaffold.sh) via shell em dirs isolados — valida o mecanismo deterministico. A camada runtime (SKILL.md + AskUserQuestion + `${CLAUDE_SKILL_DIR}`) fica para o primeiro teste de aceitacao em projeto real; registrar outcome no MEMORY.md global. Documentar o desvio explicitamente no log de execucao da task e no ADR, nao esconder.
- **sed com pipe como delimitador (2026-04-16):** `sed -e "s|{{X}}|$VAR|g"` evita conflito com paths contendo `/`. Padrao adotado em scaffold.sh para placeholders de CLAUDE.md.template. Limitacao conhecida: se o valor contem `|` literal, quebra — documentar no T3 se aparecer na pratica.
- **Loop manual cp + test -e em vez de cp -rn (2026-04-16):** BSD coreutils nao suporta `cp -rn` com a mesma semantica de GNU. Para garantir idempotencia portavel em scaffold.sh, usar loop `for f in "$SRC"/*; do [ ! -e "$DST/$(basename $f)" ] && cp "$f" "$DST/"; done`. Mais verboso, mais portavel, e explicito sobre intencao.
- **Despersonalizacao de templates upstream eh trabalho real (2026-04-29):** ao trazer `local/paperclip/playbook.md` (~500 linhas, ~30 strings hardcoded) e `AGENTS-dev-primary.md` (~300 linhas) pro plugin na v0.3.0, mais de 50% do tempo de T3 foi grep+substitute de refs ao stack upstream (Vitest, Supabase, WhatsApp, Cohere, Resend, AssemblyAI, Hotmart) e nomes (Felipe, Rafael, IPs, Tailscale hostnames, gestao-ti, IDs Paperclip, PR numbers). Padrao de revisao adotado: `grep -rinE "(meteora|o-agente|209\.97|gestao-ti|RNobre|theagent_droplet|hotmart|Felipe|Vitest|Cohere|AssemblyAI|Resend|WhatsApp|Supabase)" templates/` deve retornar 0 matches OU so em comentarios prefixados com "if you use", "e.g.", "or equivalent", "Add your own". Pra v0.4.0+, considerar lint script `tests/no-upstream-refs.sh` que falha CI se algum match nao-prefixado. Validado empiricamente em T5 cenario B (anti-grep PASS).
- **Idempotencia de .gitignore exige read-modify-write atomico (2026-04-29):** scaffold ganhou autoupdate de 3 entries (`local/`, `.claude/wave-runs/`, `scripts/orchestrate/`). Implementacao naive (`echo entry >> file`) duplica em re-execucao. Solucao adotada: `grep -qxF` antes de cada append + flag `HEADER_NEEDED` pra so emitir o header de comentario se houver pelo menos 1 entry nova + check de newline final do arquivo (`tail -c1 | od -An -c`) pra evitar concatenacao em mesma linha. Validado em cenario A.3 (count=1 apos 2a execucao).
