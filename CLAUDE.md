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

## Estado atual

- [x] POC bootstrap empirico (feat/poc-bootstrap)
- [x] Marketplace structure (feat/marketplace-structure) — manifests, CI, skeleton
- [x] extract-portable-skills (feat/extract-portable-skills) — conteudo curado substituiu placeholders em 4 agents + 4 skills
- [ ] write-bootstrap-skill — evoluir scaffold.sh a partir do POC
- [ ] poc-mcp-userconfig — validar userConfig sensitive no Linux

## Licoes aprendidas

- **Curadoria > copia-cola (2026-04-15):** na extract-portable-skills, separar "metodologia universal" de "convencoes do stack" exige decisao ativa. Regras puras (TDD, pair programming, YAGNI, conventional commits) foram para skills; convencoes de teste (Vitest paths, jsdom, portugues em describes) foram descartadas. Agents aprenderam a ler o `CLAUDE.md` do projeto receptor em vez de assumir stack.
- **disable-model-invocation oculta da listagem (2026-04-15):** skills com `disable-model-invocation: true` (ex: bootstrap) nao aparecem quando o modelo lista skills carregadas, mas sao carregadas pelo plugin — sao invocadas apenas via `/xp-stack:bootstrap` explicito pelo usuario. Validar contagem via `ls plugins/xp-stack/skills/`, nao pela listagem do modelo.
