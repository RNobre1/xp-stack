# xp-stack

[![npm version](https://img.shields.io/npm/v/xp-stack.svg)](https://npmjs.com/package/xp-stack)

Stack metodológico **XP/Akita** para agentes de IA — TDD absoluto, pair programming, pesquisa formal triangulada, task decomposition rigorosa, evidências de entrega, revisão orientada por política, conventional commits e mecanismos opcionais de orquestração.

> **Versão publicada: v2.1.1** (2026-05-14). Esta árvore contém ajustes de contrato ainda não publicados; veja a seção **Unreleased** em [CHANGELOG.md](CHANGELOG.md). O pacote segue adotável em qualquer stack (TypeScript, Python, Go, bash, etc.).

---

## O que mudou na v2.0.0 (histórico)

> **Breaking release.** Parallelization pattern shifts from manual `TERMINAL-PROMPTS.md` (N terminals + copy-paste) to Claude Code **Agent View** native. Mais detalhes em [CHANGELOG.md](CHANGELOG.md).

> As escolhas abaixo descrevem a release v2.0.0. Hoje, o modelo, perfil, mecanismo de despacho, UI e estilo de comunicação vêm da política da sessão/Host; Agent View, Sonnet e caveman permanecem opções explícitas.

- ✅ **Novo template canônico** `TEMPLATE-orchestrator-prompt.md` (substitui `TEMPLATE-terminal-prompts.md` removido)
- ✅ **Exemplo Sonnet+caveman+worktree** pra workers dispatched pelo orchestrator
- ✅ **Nova skill opt-in `debugging-discipline`** — instala PR template + PreToolUse hook + settings deep-merge pra lembrar disciplina em commits `fix:`
- ✅ `akita-xp-rules`, `task-decomposition` atualizadas pra refletir despacho orientado pela política da sessão
- ✅ `local-waves` marcada como `[LEGACY]` (segue funcional como fallback)

---

## Instalação

### Forma primária — npm CLI

```bash
npx xp-stack init
```

Detecta engines disponíveis (Claude Code, Antigravity, Cursor, Codex, etc.), instala dual mirror em `.claude/skills/` + `.agents/skills/`, cria manifest SHA-256, scaffolda `CLAUDE.md`, `AGENTS.md` (symlink), `docs/tasks/_template/`, `docs/pesquisas/_template/`, `.claude/settings.json` e `.gitignore` atualizado. Nunca sobrescreve nada que já exista.

### Forma alternativa — plugin marketplace (backward compat)

```
/plugin marketplace add RNobre1/xp-stack
/plugin install xp-stack@xp-stack
/xp-stack:bootstrap
```

> **Recomendação:** prefira a forma npm. O plugin marketplace está sujeito ao [issue #35989 do claude-code](https://github.com/anthropics/claude-code/issues/35989) — skills somem do cache de plugins em algumas versões do CLI.

### Quick start

```bash
cd meu-projeto
npx xp-stack init                              # scaffold + dual mirror
npx xp-stack status                            # estado atual (engines, features ativas, drift)
npx xp-stack add-skill db-archaeologist        # agent opt-in pra análise de DB
npx xp-stack add-skill debugging-discipline    # lembretes de fix-workflow (PR template + hook)
```

### Subcomandos disponíveis (10 + version flag)

| Comando | O que faz |
|---------|-----------|
| `xp-stack init` | Scaffold inicial: manifest, dual mirror, templates, AGENTS.md symlink |
| `xp-stack update` | Diff manifest SHA-256, prompt por arquivo (keep/take/merge/abort) |
| `xp-stack status` | Estado atual: engines, features, drift |
| `xp-stack add-engine <name>` | Instala dual mirror em path adicional |
| `xp-stack add-skill <name>` | Habilita skill opt-in (debugging-discipline, paperclip, local-waves, db-archaeologist, etc.) |
| `xp-stack config get [key]` | Lê config (doc_level, etc.) |
| `xp-stack config doc-level <essencial\|completo>` | Define nível de documentação por feature |
| `xp-stack uninstall` | Remove arquivos do manifest, preserva user-modified, prompt antes de cada delete |
| `xp-stack resume [feature]` | Lê index + state.json, resume sessão de uma feature |
| `xp-stack hook-stop` | Executado pelo hook `Stop` — atualiza index.json + regenera RESUME.md |
| `xp-stack regenerate-resume [feature]` | Regenera RESUME.md manualmente |
| `xp-stack reconcile [feature]` | Reconcilia JSON↔markdown quando divergem (JSON wins, dry-run default) |
| `xp-stack --version` | Mostra versão instalada |

## Atualizando

```bash
npx xp-stack update
# ou plugin marketplace:
/plugin marketplace update RNobre1/xp-stack
/plugin install xp-stack@xp-stack
```

---

## O que está incluído

### Skills regulares (auto-disponíveis após install)

| Skill | Invocação | Para que serve |
|-------|-----------|----------------|
| `akita-xp-rules` | `/xp-stack:akita-xp-rules` | 6 regras metodológicas universais + contrato canônico de evidências de entrega, autorização/checkpoint e revisão por política; o namespace `/xp-stack:` vale quando este plugin é o loader |
| `tdd-conventions` | `/xp-stack:tdd-conventions` | Pirâmide de testes (unit, integration, E2E, contract, regression, performance, security) + workflow RED → GREEN → REFACTOR |
| `task-decomposition` | `/xp-stack:task-decomposition` | Decomposição de features em `docs/tasks/{feature}/` com `00-overview.md` + `PROGRESS.md` + `T{N}-{slug}.md` por task e despacho conforme política da sessão. Inclui política de arquivamento (NUNCA apagar — `_archive/`) |
| `research-cycle` | `/xp-stack:research-cycle` | Ciclo de pesquisa formal com triangulação, fontes citadas, revisão adversarial. Saída em `docs/pesquisas/{slug}.md` |
| `optimizing-github-actions` | auto via `paths: .github/workflows/**` | 10-item pre-flight checklist (SHA pinning, OIDC, pull_request_target, concurrency, trigger eficiente, artifact v4, sharding+coverage, bash hardening, gate calibrado, persist-credentials) + audit script |

### Skills opt-in (invocadas via `xp-stack add-skill`)

| Skill | Aliases | Para que serve |
|-------|---------|----------------|
| `debugging-discipline` ⭐ NEW v2.0 | `debugging`, `debug-discipline`, `fix-gates` | Instala lembretes para workflow de `fix:` — PR template (Hypotheses ranked / Root cause / Regression test), PreToolUse reminder de `superpowers:systematic-debugging`, hook registration via deep-merge. Use quando projeto tem alta taxa de `fix:` commits (>30%) sem evidência de processo estruturado |
| `bootstrap` | — | Scaffolding de projeto novo (rodado uma vez via `init`) |
| `claude-md-bootstrap` | `claude-md`, `claudemd` | Lê codebase + docs e preenche CLAUDE.md a partir do template |
| `paperclip-orchestrator` | `paperclip` | Setup do pattern multi-agent **remoto async** (droplet + Postgres + cron + GitHub auto-merge gate). 8 templates anonimizados + 9 lições reais como referência |
| `local-waves` ⚠️ LEGACY | `waves`, `wave` | Setup do orquestrador **local sync** — N workers headless em git worktrees, com modelo selecionado pelo mecanismo/política opt-in. Sem infra; útil em cenários headless/CI |
| `code-review-automation` | `review-auto`, `pr-review-gate`, `self-review`, `review` | Lembrete `/review-pr`, seção de evidências no PR e reminder PreToolUse; autoinspeção, triagem e revisão final seguem a política da sessão |
| `db-archaeologist` | `db` | Análise de schema PostgreSQL/Supabase, RLS policies, histórico de migrations |
| `screenshot-spec-writer` | `screenshot`, `spec-writer` | Transforma screenshot de UI em spec markdown |
| `flowchart-extractor` | `flowchart` | Gera Mermaid flowchart fiel ao fluxo de uma função |

### Agents

| Agent | Para que serve |
|-------|----------------|
| `researcher` | Pesquisa formal em 7 fases com triangulação |
| `research-critic` | Revisão adversarial independente do output do researcher |
| `tdd` | Ciclo RED-GREEN-REFACTOR estrito |
| `reviewer` | Code review com foco em correctness, security, conventions, test coverage |

### Templates

- `CLAUDE.md.template` — skeleton para CLAUDE.md de projeto novo, com nota sobre symlink AGENTS.md + seções pré-prontas pra integração de skills, despacho conforme política, contrato de evidências e política de arquivamento.
- `claude-settings-project.json` — permissões razoáveis pra `.claude/settings.json`.
- `docs-tasks-template/` (5 arquivos): `README`, `TEMPLATE-overview`, `TEMPLATE-progress`, `TEMPLATE-task`, **`TEMPLATE-orchestrator-prompt`** (novo em v2.0 — substitui `TEMPLATE-terminal-prompts`).
- `docs-pesquisas-template/TEMPLATE-pesquisa.md`.

### Contrato de evidências

`akita-xp-rules` é o nome portátil do contrato canônico de entrega. O ambiente
de execução fornece o caminho/URI real de `akita-xp-rules/SKILL.md`; cada T-file
e briefing registra essa fonte e a revisão `2026-09-15`. Se o worker não tiver
skill loader, o remetente transfere o trecho canônico literal com sua referência
e revisão, em vez de enviar apenas um ponteiro.

Autoinspeção prepara o handoff; a revisão final exige agente e modelo distintos
do autor e declara checks executados agora ou evidência externa fresca. Uma
triagem estática reporta achados, mas não aprova.

---

## Workflows típicos

### 1. Projeto novo, sem orquestração paralela

Cobre 80% dos casos. É o que o `init` entrega de cara.

```bash
cd meu-projeto-novo
npx xp-stack init

# Você ganha CLAUDE.md, AGENTS.md (symlink), .claude/settings.json,
# docs/tasks/_template/, docs/pesquisas/_template/, .gitignore atualizado.
# Edite CLAUDE.md preenchendo a stack do seu projeto.

# Daí em diante:
# - features não-triviais → /xp-stack:task-decomposition (instrui como)
# - decisões arquiteturais → /xp-stack:research-cycle
# - bug → invoque superpowers:systematic-debugging antes de propor fix
# - PR pronto → invoque superpowers:verification-before-completion
# - workflow CI → optimizing-github-actions auto-roda
```

### 2. Paralelização conforme a sessão

Pra waves com 2+ T-files independentes, o orquestrador consulta a política da
sessão e a capacidade do Host e escolhe um mecanismo nativo compatível. Agent
View, `local-waves` e Paperclip são opções; o modelo, perfil, isolamento, UI e
estilo de comunicação não são defaults do pacote.

O prompt deve registrar a fonte e revisão do **Delivery evidence contract** e,
para workers sem skill loader, anexar o trecho canônico literal. O padrão
completo e as regras de coordenação estão em
`docs/tasks/_template/TEMPLATE-orchestrator-prompt.md` (instalado pelo `init`).

### 3. Instalar lembretes de fix-workflow

Pra projetos com alta taxa de `fix:` commits sem evidência de systematic-debugging:

```bash
npx xp-stack add-skill debugging-discipline
# Depois invoque a skill no Claude Code pra rodar o setup:
# /xp-stack:debugging-discipline
```

Instala:
- `.github/PULL_REQUEST_TEMPLATE.md` (seção para evidências aplicáveis em `fix:` PRs)
- `.claude/hooks/pre-tool-use.sh` (lembra skill systematic-debugging em todo Edit/Write)
- Hook registrado em `.claude/settings.json` via deep-merge

### 4. Você + co-pilot async, ou multi-projeto, ou quer review queue 24/7

Use Paperclip orchestrator (remoto, droplet, async).

```bash
npx xp-stack add-skill paperclip-orchestrator
# /xp-stack:paperclip-setup
```

### 5. Headless / CI com mecanismo opt-in

Use `local-waves` (worktrees + `claude -p` headless).

```bash
npx xp-stack add-skill local-waves
# /xp-stack:local-waves-setup
```

> **Note:** `local-waves` é um mecanismo opt-in para execução headless/CI ou fallback. Em sessões interativas, escolha o mecanismo nativo que a política e o Host suportarem.

---

## Decisão de paralelização

| Critério | Native Agent/Agent View | local-waves | Paperclip |
|---|---|---|---|
| Modelo | Native Claude Code, parallel sessions | Local sync, headless | Remote async, droplet |
| Latência | Segundos (parallel dispatch) | Minutos | Horas-dias |
| Persistência | Conforme sessão | Nenhuma | Sim (Postgres) |
| Multi-developer | Conforme mecanismo | Não | Sim |
| Infra adicional | Nenhuma | Nenhuma | VPS (~$10/mês) |
| Quando escolher | Quando a sessão/Host suportarem | Headless/CI, fallback | Async dev/review, multi-projeto |

---

## Convenção AGENTS.md ↔ CLAUDE.md

Antigravity, Codex e Cursor leem `AGENTS.md` por convenção. Claude Code lê `CLAUDE.md`. O `init` cria um **symlink relativo** `AGENTS.md → CLAUDE.md` (e `AGENTS.local.md → CLAUDE.local.md` se você tiver o `.local`). Como são o mesmo arquivo no disco, **drift entre os dois é impossível** — toda edição em `CLAUDE.md` propaga instantaneamente.

Não edite `AGENTS.md` diretamente. Não quebre o symlink. Pra desabilitar (caso seu projeto tenha um `AGENTS.md` próprio que conflita), passe `"no-symlink"` como 6º argumento ao `scaffold.sh`.

---

## .gitignore reservado

O `init` adiciona entries no `.gitignore` do seu projeto (idempotente, sem sobrescrever):

```
# xp-stack
.xp-stack/state/
local/
.claude/wave-runs/
scripts/orchestrate/
```

Mesmo se você não usar Paperclip ou local-waves agora, essas pastas ficam reservadas — caso um agente futuro escreva lá por engano (ou você ative depois), nada vaza pra git.

---

## Testes

```bash
npm test                          # vitest — 185 tests (28 files)
npm run test:bash                 # bash suite — 55+ tests across 6 scripts
```

CI roda em PRs (`.github/workflows/validate-plugins.yml`). 100% verde em `main` desde v1.0.0.

## Testar localmente em outro projeto

```bash
# Via npm (recomendado — sempre versão publicada):
cd /caminho/para/outro-projeto
npx xp-stack@2.0.0 init

# Via plugin marketplace (backward compat):
claude --plugin-dir /caminho/para/xp-stack/plugins/xp-stack
```

---

## Histórico de versões

| Versão | Data | Mudanças principais |
|--------|------|--------------------|
| **v2.0.0** | 2026-05-13 | **BREAKING** — `TEMPLATE-terminal-prompts.md` removido, substituído por **`TEMPLATE-orchestrator-prompt.md`** (Agent View pattern: Sonnet+caveman+worktree). Nova skill opt-in `debugging-discipline` (PR template + PreToolUse hook + deep-merge settings). `akita-xp-rules`/`task-decomposition` atualizadas. `local-waves` marcada `[LEGACY]`. Plugin marketplace bumped 0.3.0 → 0.4.0. Migration guide em CHANGELOG.md |
| v1.4.0 | 2026-05-04 | `init` pergunta `doc_level` (essencial vs completo) + novo comando `config get/doc-level` |
| v1.3.0 | 2026-05-04 | `add-skill` unified registry de opt-in skills + nova skill `claude-md-bootstrap` |
| v1.2.0 | 2026-05-03 | Prompt interativo de engines (substitui auto-detect cego) |
| v1.1.0 | 2026-05-03 | `init` ship 5 skills core + 4 agents + CLAUDE.md + AGENTS.md symlink + docs templates + `.claude/settings.json` + `.gitignore` |
| v1.0.0 | 2026-05-03 | npm CLI primário + dual mirror always-on + state machine + schemas + RESUME.md auto-gen + manifest SHA-256 |
| v0.3.0 | 2026-04-29 | 2 skills opt-in (`paperclip-orchestrator`, `local-waves`) + AGENTS.md symlinks + `.gitignore` autoupdate + akita-xp-rules appendix |
| v0.2.0 | 2026-04-26 | Skill `optimizing-github-actions` auto-ativada via `paths` + proibição `Co-Authored-By` |
| v0.1.x | 2026-04-16 | Release inicial — bootstrap + 4 skills + 4 agents + templates |

Detalhes completos em [CHANGELOG.md](CHANGELOG.md). ADRs em [`CLAUDE.md`](CLAUDE.md) (raiz do repo).

---

## Princípios

O pacote transporta **metodologia universal** — TDD, pair programming, pesquisa formal, decomposição de tasks, conventional commits, multi-agent dispatch. **Não transporta** convenções de stack (frameworks específicos, paths de teste, entidades de domínio). Os agents lêem o `CLAUDE.md` do projeto receptor pra entender a stack.

Origem: extraído iterativamente do ecossistema **Meteora Digital** conforme padrões se mostram universais. Cada release passa por:

1. Validação empírica em projeto real upstream (TDD red → green → empirical → release).
2. Anonimização de templates (remoção de refs hardcoded a stack-específico, nomes, IPs, IDs).
3. Self-test em projeto receptor antes de release.

Veja `CLAUDE.md` (raiz) seção "ADRs" pra trilha completa de decisões.

---

## Contribuindo

PRs bem-vindos. O fluxo do próprio repo segue o método Akita/XP — veja `docs/tasks/` (decomposição das releases) e `CLAUDE.md` (raiz) pra entender o ciclo. Cada release segue 6 fases (T0 setup → T1 RED → T2-N GREEN → T(N+1) empirical → T(N+2) release).

## Licença

MIT — ver [LICENSE](LICENSE).
