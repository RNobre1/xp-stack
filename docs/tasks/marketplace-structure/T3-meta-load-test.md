# T3 — CLAUDE.md + README + LICENSE + validacao empirica (load test)

**Status:** [ ]
**Dependencia:** T2 (skeleton completo deve existir)
**Estimativa:** P (~30min)

---

## Objetivo

Criar os meta-arquivos do projeto (CLAUDE.md, README.md raiz, LICENSE raiz) e validar empiricamente que o marketplace e o plugin carregam corretamente via `claude --plugin-dir`.

---

## Parte A: Meta-arquivos do projeto

### `CLAUDE.md` (raiz do repo)

Fonte da verdade do projeto claude-craft, conforme Regra 1 do CLAUDE.md global. Conteudo minimo obrigatorio:

- **Nome e objetivo:** claude-craft — marketplace Claude Code para distribuicao do stack metodologico XP/Akita.
- **Arquitetura:** repo = marketplace git, plugin unico `xp-stack` em `plugins/xp-stack/`, CI em `.github/workflows/`, testes puro bash em `tests/`.
- **Stack:** bash (testes + scaffold), GitHub Actions (CI), Claude Code plugin system (distribuicao).
- **Estrutura de diretorios:** arvore simplificada com descricao de cada componente.
- **Decisoes tecnicas:**
  - ADR-001: marketplace + plugin como vetor de distribuicao (ref pesquisa `replicar-stack-claude-code.md`).
  - ADR-002: `!command` + `${CLAUDE_SKILL_DIR}` para bootstrap (validado por POC `poc-bootstrap`).
  - ADR-003: `install-global-rules` diferido (grade D, precisa de POC proprio).
- **Estado atual:** marketplace-structure em andamento, proximas tasks na secao 11 da pesquisa.
- **Variaveis de ambiente:** nenhuma por enquanto. MCPs usam `userConfig` do plugin.
- **Como rodar testes:** `bash tests/marketplace_test.sh && bash tests/skeleton_test.sh && bash tests/scaffold_test.sh`.
- **Como testar localmente:** `claude --plugin-dir ./plugins/xp-stack`.

### `README.md` (raiz do repo)

Documento publico para usuarios do marketplace. Conteudo:

- Descricao curta do que e o claude-craft.
- Pre-requisitos: Claude Code >= outubro 2025 com suporte a plugins.
- Instalacao em 2 comandos: `/plugin marketplace add RNobre1/claude-craft`, `/plugin install xp-stack@claude-craft`.
- O que esta incluido: lista de skills, agents, templates.
- Status: em desenvolvimento (V0 — skeleton, conteudo pendente).
- Link para a pesquisa de fundamentacao (quando o repo for publico).
- Licenca: MIT.

### `LICENSE` (raiz do repo)

MIT license, copyright 2026 Meteora Digital.

Nota: `plugins/xp-stack/LICENSE` (criado em T2) e identico. Redundancia intencional — o marketplace e o plugin sao unidades independentes de distribuicao.

---

## Parte B: Validacao empirica (load test)

Mesma abordagem de T2 do POC `poc-bootstrap` — invocacao real do Claude Code para verificar que o plugin e reconhecido.

### Cenarios de validacao

1. **plugin_loads** — `claude --plugin-dir ./plugins/xp-stack -p "list plugins" --dangerously-skip-permissions` reconhece `xp-stack` (verificar via debug log ou output).
2. **skills_discoverable** — Skills aparecem com namespace `xp-stack:` (ex: `xp-stack:bootstrap`, `xp-stack:akita-xp-rules`).
3. **no_poc_interference** — Plugin `poc-bootstrap` NAO e carregado (so `xp-stack` via `--plugin-dir`).

### Metodo

Nao e teste automatizado — e validacao empirica manual com comandos verbatim documentados, similar a T2 do POC. Os resultados sao registrados neste arquivo (in-place) com output bruto, debug log, e analise.

**Comando base:**
```bash
CLAUDE_CODE_DEBUG=1 claude --plugin-dir ./plugins/xp-stack \
  -p "/xp-stack:bootstrap" \
  --dangerously-skip-permissions 2>debug.log
```

**Verificacoes no debug.log:**
- `Loaded N skills from plugin xp-stack` (N >= 5)
- Sem erros de parsing de frontmatter
- `${CLAUDE_SKILL_DIR}` resolvido corretamente pro path do plugin

---

## Escopo de arquivos

### Cria
- `CLAUDE.md` (raiz)
- `README.md` (raiz)
- `LICENSE` (raiz)

### Nao toca
- `plugins/` (nada — T1 e T2 ja terminaram)
- `tests/` (nada)
- `.claude-plugin/` (nada)
- `.github/` (nada)
- Qualquer arquivo em `~/.claude/`

---

## Criterios de sucesso

- [ ] `CLAUDE.md` existe na raiz com todos os campos obrigatorios da Regra 1
- [ ] `README.md` existe com instrucoes de instalacao
- [ ] `LICENSE` existe com texto MIT
- [ ] `claude --plugin-dir ./plugins/xp-stack` carrega o plugin sem erros
- [ ] Debug log mostra skills carregadas com namespace `xp-stack:`
- [ ] Nenhuma regressao: `bash tests/marketplace_test.sh && bash tests/skeleton_test.sh` continuam green
- [ ] Output bruto e debug log documentados neste arquivo

## Criterios de falha

- CLAUDE.md nao segue Regra 1 (campos obrigatorios ausentes)
- Plugin nao carrega via `--plugin-dir`
- Skills nao aparecem namespaced
- Erros de frontmatter no debug log
- Qualquer alteracao em `plugins/poc-bootstrap/`

---

## Commits esperados

1. `docs(marketplace): CLAUDE.md + README + LICENSE do projeto`
2. `docs(marketplace): T3 load test — resultados empiricos`

---

## Resultados empiricos (preenchido durante execucao)

_Pendente — sera preenchido com output verbatim apos execucao._
