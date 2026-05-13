# xp-stack

[![npm version](https://img.shields.io/npm/v/xp-stack.svg)](https://npmjs.com/package/xp-stack)

Stack metodológico **XP/Akita** para agentes de IA — TDD absoluto, pair programming, pesquisa formal triangulada, task decomposition rigorosa, conventional commits e **orquestração multi-agent nativa via Agent View** (Claude Code) com fallbacks opt-in.

> **Versão atual: v2.0.0** (2026-05-13). Status: estável, pronto pra adoção em qualquer stack (TypeScript, Python, Go, bash, etc.). Veja [CHANGELOG.md](CHANGELOG.md) pro migration guide v1.x → v2.0.

---

## O que mudou na v2.0.0

> **Breaking release.** Parallelization pattern shifts from manual `TERMINAL-PROMPTS.md` (N terminals + copy-paste) to Claude Code **Agent View** native. Mais detalhes em [CHANGELOG.md](CHANGELOG.md).

- ✅ **Novo template canônico** `TEMPLATE-orchestrator-prompt.md` (substitui `TEMPLATE-terminal-prompts.md` removido)
- ✅ **Padrão Sonnet+caveman+worktree** pra workers dispatched pelo orchestrator
- ✅ **Nova skill opt-in `debugging-discipline`** — instala PR template + PreToolUse hook + settings deep-merge pra forçar disciplina em commits `fix:`
- ✅ `akita-xp-rules`, `task-decomposition` atualizadas pra refletir Agent View
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
npx xp-stack add-skill debugging-discipline    # gates de fix-workflow (PR template + hook)
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
| `akita-xp-rules` | `/xp-stack:akita-xp-rules` | 6 regras metodológicas universais (sem alucinação arquitetural, TDD absoluto, AI jail, código detachment, ciclo em fases, conventional commits) + appendix com tabela de skills do superpowers obrigatórias em momentos específicos do ciclo, incluindo o padrão **Agent View** pra paralelização |
| `tdd-conventions` | `/xp-stack:tdd-conventions` | Pirâmide de testes (unit, integration, E2E, contract, regression, performance, security) + workflow RED → GREEN → REFACTOR |
| `task-decomposition` | `/xp-stack:task-decomposition` | Decomposição de features em `docs/tasks/{feature}/` com `00-overview.md` + `PROGRESS.md` + `T{N}-{slug}.md` por task + seção dedicada **Agent View workflow**. Inclui política de arquivamento (NUNCA apagar — `_archive/`) |
| `research-cycle` | `/xp-stack:research-cycle` | Ciclo de pesquisa formal com triangulação, fontes citadas, revisão adversarial. Saída em `docs/pesquisas/{slug}.md` |
| `optimizing-github-actions` | auto via `paths: .github/workflows/**` | 10-item pre-flight checklist (SHA pinning, OIDC, pull_request_target, concurrency, trigger eficiente, artifact v4, sharding+coverage, bash hardening, gate calibrado, persist-credentials) + audit script |

### Skills opt-in (invocadas via `xp-stack add-skill`)

| Skill | Aliases | Para que serve |
|-------|---------|----------------|
| `debugging-discipline` ⭐ NEW v2.0 | `debugging`, `debug-discipline`, `fix-gates` | Instala gates concretos pra workflow de `fix:` — PR template (Hypotheses ranked / Root cause / Regression test), PreToolUse hook lembrando `superpowers:systematic-debugging`, hook registration via deep-merge. Use quando projeto tem alta taxa de `fix:` commits (>30%) sem evidência de processo estruturado |
| `bootstrap` | — | Scaffolding de projeto novo (rodado uma vez via `init`) |
| `claude-md-bootstrap` | `claude-md`, `claudemd` | Lê codebase + docs e preenche CLAUDE.md a partir do template |
| `paperclip-orchestrator` | `paperclip` | Setup do pattern multi-agent **remoto async** (droplet + Postgres + cron + GitHub auto-merge gate). 8 templates anonimizados + 9 lições reais como referência |
| `local-waves` ⚠️ LEGACY | `waves`, `wave` | Setup do orquestrador **local sync** — N workers Sonnet headless em git worktrees. Sem infra. **Pré-Agent View** — mantido como fallback se Agent View regredir ou pra cenários headless/CI |
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

- `CLAUDE.md.template` — skeleton para CLAUDE.md de projeto novo, com nota sobre symlink AGENTS.md + seções pré-prontas pra "Mandatory skill integration" (refletindo Agent View pattern), "Optional multi-agent dispatch", "Archival policy".
- `claude-settings-project.json` — permissões razoáveis pra `.claude/settings.json`.
- `docs-tasks-template/` (5 arquivos): `README`, `TEMPLATE-overview`, `TEMPLATE-progress`, `TEMPLATE-task`, **`TEMPLATE-orchestrator-prompt`** (novo em v2.0 — substitui `TEMPLATE-terminal-prompts`).
- `docs-pesquisas-template/TEMPLATE-pesquisa.md`.

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

### 2. ⭐ Paralelização nativa via Agent View (padrão v2.0.0)

Pra waves com 2+ T-files independentes, o orquestrador dispara workers Sonnet via `Agent` tool nativo do Claude Code. Status em UI única (`claude agents`). Substitui completamente o `T*-PROMPT.md` manual.

```ts
// Dentro da sessão Claude Code orchestrator (Opus):
Agent({
  description: "T1 — feature-slug",
  subagent_type: "general-purpose",
  model: "sonnet",
  isolation: "worktree",
  prompt: `Antes de qualquer outra coisa, invoque a skill caveman:caveman pra ultra-compressar comunicação.

Leia e execute integralmente docs/tasks/{feature-slug}/T1-*.md.
Branch: feat/{feature-slug}-T1.
TDD absoluto. Conventional commits. Files ALLOWED/FORBIDDEN são lei.`,
})
```

Repita o tool call pra cada T independente na MESMA mensagem do orchestrator → correm em paralelo.

Padrão completo + coordination rules em `docs/tasks/_template/TEMPLATE-orchestrator-prompt.md` (instalado pelo `init`).

### 3. Instalar gates de fix-workflow

Pra projetos com alta taxa de `fix:` commits sem evidência de systematic-debugging:

```bash
npx xp-stack add-skill debugging-discipline
# Depois invoque a skill no Claude Code pra rodar o setup:
# /xp-stack:debugging-discipline
```

Instala:
- `.github/PULL_REQUEST_TEMPLATE.md` (seções obrigatórias pra `fix:` PRs)
- `.claude/hooks/pre-tool-use.sh` (lembra skill systematic-debugging em todo Edit/Write)
- Hook registrado em `.claude/settings.json` via deep-merge

### 4. Você + co-pilot async, ou multi-projeto, ou quer review queue 24/7

Use Paperclip orchestrator (remoto, droplet, async).

```bash
npx xp-stack add-skill paperclip-orchestrator
# /xp-stack:paperclip-setup
```

### 5. Headless / CI / fallback (Agent View ausente)

Use `local-waves` (worktrees + `claude -p` headless).

```bash
npx xp-stack add-skill local-waves
# /xp-stack:local-waves-setup
```

> **Note:** marcado como `[LEGACY — pré-Agent View 2026-05-11]`. Funcional, mas se você roda interativo no Claude Code, prefira o pattern Agent View (workflow 2 acima).

---

## Decisão de paralelização

| Critério | Agent View (v2.0+) | local-waves | Paperclip |
|---|---|---|---|
| Modelo | Native Claude Code, parallel sessions | Local sync, headless | Remote async, droplet |
| Latência | Segundos (parallel dispatch) | Minutos | Horas-dias |
| Persistência | Session-bound (Agent View UI) | Nenhuma | Sim (Postgres) |
| Multi-developer | Não (single Pilot) | Não | Sim |
| Infra adicional | Nenhuma | Nenhuma | VPS (~$10/mês) |
| Quando escolher | **Solo ou pair interativo — default** | Headless/CI, fallback | Async dev/review, multi-projeto |

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
