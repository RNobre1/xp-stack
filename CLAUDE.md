# claude-craft

> Marketplace Claude Code para distribuicao do stack metodologico XP/Akita — TDD absoluto, pair programming, pesquisa formal, task decomposition, conventional commits.

## Objetivo

Empacotar e distribuir o ferramental reusavel desenvolvido no projeto O Agente (Meteora Digital) como plugin Claude Code instalavel por qualquer pessoa via marketplace git. Dois comandos instalam tudo:

```
/plugin marketplace add RNobre1/claude-craft
/plugin install xp-stack@claude-craft
```

## Stack

- **Testes:** bash puro (tests/*.sh), zero dependencias externas
- **CI/CD:** GitHub Actions (.github/workflows/validate-plugins.yml)
- **Distribuicao:** Claude Code plugin system (>= outubro 2025)
- **Linguagem dos scripts:** bash (scaffold, validacao)

## Arquitetura

Repo = marketplace git. Contem um plugin unico (`xp-stack`) com skills, agents, templates e stubs MCP.

```
RNobre1/claude-craft/
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

## Estado atual

- [x] POC bootstrap empirico (feat/poc-bootstrap)
- [x] Marketplace structure (feat/marketplace-structure) — manifests, CI, skeleton
- [x] extract-portable-skills (feat/extract-portable-skills) — conteudo curado substituiu placeholders em 4 agents + 4 skills
- [x] write-bootstrap-skill (feat/write-bootstrap-skill) — 2026-04-16 — 3 tasks (T1 templates, T2 scaffold.sh, T3 SKILL.md+empirico), 37/37 testes verdes, 4/4 cenarios empiricos PASS
- [ ] poc-mcp-userconfig — validar userConfig sensitive no Linux

## Licoes aprendidas

- **Curadoria > copia-cola (2026-04-15):** na extract-portable-skills, separar "metodologia universal" de "convencoes do stack" exige decisao ativa. Regras puras (TDD, pair programming, YAGNI, conventional commits) foram para skills; convencoes de teste (Vitest paths, jsdom, portugues em describes) foram descartadas. Agents aprenderam a ler o `CLAUDE.md` do projeto receptor em vez de assumir stack.
- **disable-model-invocation oculta da listagem (2026-04-15):** skills com `disable-model-invocation: true` (ex: bootstrap) nao aparecem quando o modelo lista skills carregadas, mas sao carregadas pelo plugin — sao invocadas apenas via `/xp-stack:bootstrap` explicito pelo usuario. Validar contagem via `ls plugins/xp-stack/skills/`, nao pela listagem do modelo.
- **Validacao empirica shell-direct vs runtime-interativo (2026-04-16):** de dentro de uma sessao Claude Code nao e possivel spawnar outro `claude --plugin-dir` interativo para validar `AskUserQuestion`. O fallback legitimo e invocar o script alvo (scaffold.sh) via shell em dirs isolados — valida o mecanismo deterministico. A camada runtime (SKILL.md + AskUserQuestion + `${CLAUDE_SKILL_DIR}`) fica para o primeiro teste de aceitacao em projeto real; registrar outcome no MEMORY.md global. Documentar o desvio explicitamente no log de execucao da task e no ADR, nao esconder.
- **sed com pipe como delimitador (2026-04-16):** `sed -e "s|{{X}}|$VAR|g"` evita conflito com paths contendo `/`. Padrao adotado em scaffold.sh para placeholders de CLAUDE.md.template. Limitacao conhecida: se o valor contem `|` literal, quebra — documentar no T3 se aparecer na pratica.
- **Loop manual cp + test -e em vez de cp -rn (2026-04-16):** BSD coreutils nao suporta `cp -rn` com a mesma semantica de GNU. Para garantir idempotencia portavel em scaffold.sh, usar loop `for f in "$SRC"/*; do [ ! -e "$DST/$(basename $f)" ] && cp "$f" "$DST/"; done`. Mais verboso, mais portavel, e explicito sobre intencao.
