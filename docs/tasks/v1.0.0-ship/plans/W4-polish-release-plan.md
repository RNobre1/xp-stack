# W4 — Polish + Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish final do xp-stack v1.0.0 — persona PT-BR em 4 skills executoras, doc level configurável, refinement de dual mirror, auto check de versão npm, fallback headers em todos SKILL.md + alias `/xp`, e release público (npm publish + GitHub release + PR pra main).

**Architecture:** Maioria de W4 é edits em arquivos existentes (`plugins/xp-stack/skills/*/SKILL.md`, `src/cli/commands/init.js`). T24 é release final crítico — afeta estado público (npm registry + GitHub release + main branch). Cada task tem TDD onde aplicável; tasks de skill (markdown) têm sanity check via grep + suite regression.

**Tech Stack:** Mesma do W0+W1+W2+W3. Sem novas deps. T22 introduz dependência opcional em runtime de fetch HTTPS (Node 18+ tem `fetch` global, sem polyfill).

---

## File Structure

| Path | Tipo | Responsabilidade |
|------|------|------------------|
| `plugins/xp-stack/skills/bootstrap/SKILL.md` | Modify (T19) | Adicionar persona "Você é o Bootstrap" no início + manter conteúdo |
| `plugins/xp-stack/skills/task-decomposition/SKILL.md` | Modify (T19, T20) | Persona + secção "Doc level" (essencial/completo) |
| `plugins/xp-stack/skills/research-cycle/SKILL.md` | Modify (T19, T20) | Persona + secção "Tier do ciclo" (L1/L2/L3) |
| `plugins/xp-stack/skills/optimizing-github-actions/SKILL.md` | Modify (T19) | Persona "Você é o Auditor de CI" |
| `src/cli/commands/init.js` | Modify (T21) | Refinement: warning se múltiplas engines detectadas + sugestão de --engine explicit |
| `tests/cli/init.test.js` | Modify (T21) | Test do warning |
| `plugins/xp-stack/skills/akita-xp-rules/SKILL.md` | Modify (T22) | Adicionar secção "Version check" (instruções pro agent) |
| `plugins/xp-stack/skills/akita-xp-rules/scripts/version-check.sh` | Create (T22) | Script bash: compara `.xp-stack/version` com npm registry, escreve cache, imprime banner |
| Todos `plugins/xp-stack/skills/*/SKILL.md` | Modify (T23) | Adicionar header de 2 linhas no topo: "Engines sem skill loading: leia este file e siga instruções" |
| `templates/settings.json.template` | Modify (T23) | Adicionar `aliases.xp` apontando pra `xp-stack` |
| `CLAUDE.md` (do próprio repo xp-stack) | Modify (T24) | ADR-009 final + atualizar status pra v1.0.0 |
| `package.json` | Modify (T24) | bump version `1.0.0-alpha.0` → `1.0.0` |
| `README.md` | Modify (T24) | Atualizar pra v1.0.0 (links, badges, instructions) |
| `docs/tasks/v1.0.0-ship/00-overview.md` | Modify (T24) | Status: CONCLUIDA + commits T19-T24 |
| `docs/tasks/v1.0.0-ship/PROGRESS.md` | Create (T24) | Snapshot final de métricas |

---

## Convenções gerais (W4)

- TDD em T21 (única task com lógica JS nova). Outras tasks são edit de markdown + sanity check (grep + suite regression).
- Mensagens commit em PT-BR sem `Co-Authored-By`. Subjects ≤72 chars.
- T19-T23 podem rodar em qualquer ordem (não há dependência); por convenção mantenho sequencial.
- T24 é **sequencial estrito** no fim — depende de T19-T23 todos done.
- Workflow de subagent permanece: cada task → implementer → consolidated review no fim de W4.

---

## Task 19: persona PT-BR em 4 skills executoras

**Files:**
- Modify: `plugins/xp-stack/skills/bootstrap/SKILL.md` (adiciona persona após frontmatter)
- Modify: `plugins/xp-stack/skills/task-decomposition/SKILL.md` (idem)
- Modify: `plugins/xp-stack/skills/research-cycle/SKILL.md` (idem)
- Modify: `plugins/xp-stack/skills/optimizing-github-actions/SKILL.md` (idem)

> **Skills NÃO afetadas:** `akita-xp-rules` e `tdd-conventions` permanecem neutras (são doutrina/regras, não personas executoras). Isso foi decisão pré-tomada (decisão #13 do brainstorming).

- [ ] **Step 1: Adicionar persona em `bootstrap/SKILL.md`**

Read o file primeiro pra ver onde está a primeira `## Heading` após o frontmatter. Insert ANTES dela:

```markdown
Voce eh o Bootstrap. Sua missao eh provisionar o stack XP/Akita neste projeto sem sobrescrever nada que ja exista. Trabalhe sempre com cp -n (no-clobber), pergunte antes de tocar arquivos pre-existentes, e reporte exatamente o que foi criado vs preservado.

```

(linha em branco ao final). A persona vai DEPOIS do frontmatter `---` e ANTES de `# XP Stack Bootstrap` (ou primeira `##`).

- [ ] **Step 2: Adicionar persona em `task-decomposition/SKILL.md`**

Read primeiro. Insert após frontmatter:

```markdown
Voce eh o Decompositor. Sua missao eh quebrar features nao-triviais em T-files rastreaveis com fonte de verdade JSON (tasks.json) + render markdown derivado (00-overview.md). Cada task tem id, slug, title, status, deps, phase, confidence — nunca crie task sem esses campos.

```

- [ ] **Step 3: Adicionar persona em `research-cycle/SKILL.md`**

Read primeiro. Insert após frontmatter:

```markdown
Voce eh o Pesquisador. Sua missao eh triangular fontes (minimo 3), marcar confidence (🟢/🟡/🔴) em cada claim, e produzir trilha auditavel em sources.json + claims.json + pesquisa.md. Nunca afirme sem cite. Nunca cite sem fonte verificavel.

```

- [ ] **Step 4: Adicionar persona em `optimizing-github-actions/SKILL.md`**

Read primeiro. Insert após frontmatter:

```markdown
Voce eh o Auditor de CI. Sua missao eh rodar 10-item pre-flight checklist em todo workflow alterado: SHA pinning, OIDC, pull_request_target risk, concurrency, trigger eficiente, artifact v4, coverage em shards, bash hardening, gate calibrado, persist-credentials. Bloqueie merge se algum item criticar falhar.

```

- [ ] **Step 5: Sanity check + suite regression**

```bash
cd /home/rnobre/dev/xp-stack
for f in plugins/xp-stack/skills/{bootstrap,task-decomposition,research-cycle,optimizing-github-actions}/SKILL.md; do
  echo "=== $f ==="
  grep -A 1 "Voce eh" "$f" | head -3
done
npx vitest run
```

Esperado:
- 4 skills com linha "Voce eh o X. Sua missao..."
- Suite 127/127 verde (não há test que toca SKILL.md content — não deve quebrar)

- [ ] **Step 6: Commit T19**

```bash
cd /home/rnobre/dev/xp-stack
git add plugins/xp-stack/skills/bootstrap/SKILL.md plugins/xp-stack/skills/task-decomposition/SKILL.md plugins/xp-stack/skills/research-cycle/SKILL.md plugins/xp-stack/skills/optimizing-github-actions/SKILL.md
git commit -m "feat(skills): adiciona persona PT-BR em 4 skills executoras (T19 W4)

Persona explicita (estilo Reversa) em skills com role de execucao:
- bootstrap: 'Voce eh o Bootstrap. Sua missao eh provisionar...'
- task-decomposition: 'Voce eh o Decompositor. Sua missao eh quebrar...'
- research-cycle: 'Voce eh o Pesquisador. Sua missao eh triangular...'
- optimizing-github-actions: 'Voce eh o Auditor de CI. Sua missao eh rodar...'

akita-xp-rules e tdd-conventions ficam neutras (sao doutrina, nao
acao). Decisao #13 do brainstorming v1.0.0.

Suite: 127 verde (sem regression)."
git push origin feat/v1.0.0-ship
```

---

## Task 20: doc level configurável em task-decomposition + research-cycle

**Files:**
- Modify: `plugins/xp-stack/skills/task-decomposition/SKILL.md` (adicionar secção)
- Modify: `plugins/xp-stack/skills/research-cycle/SKILL.md` (adicionar secção)

> **Skill é markdown, não código.** "Doc level configurável" = instrução textual no SKILL.md ditando comportamento condicional. O agent que invoca a skill perguntar level no início (ou aceita via argumento de slash command) e ajusta output conforme.

- [ ] **Step 1: Adicionar secção em `task-decomposition/SKILL.md`**

Read file pra ver estrutura. Adicionar nova `##` secção apropriada (recomendo no início, depois da persona de T19, ou em "Antes de começar"):

```markdown
## Doc level (escolha antes de começar)

Pergunte ao Piloto qual nível de documentação:

- **`essencial`** (default pra features <1 dia ou bugfix): apenas `00-overview.md` + 1-3 T-files. Sem `PROGRESS.md`, sem `TERMINAL-PROMPTS.md`, sem `state.json`. Reduz overhead pra trabalho rápido.
- **`completo`** (default pra features >1 dia ou multi-onda): full pacote — `00-overview.md` + `PROGRESS.md` + `state.json` + `tasks.json` + 1 T-file por task + opcional `TERMINAL-PROMPTS.md` se for paralelizar via paperclip/local-waves.

Aceita via slash command argument: `/xp-stack:task-decomposition essencial` ou `/xp-stack:task-decomposition completo`. Default: `completo` se não especificado e feature parece grande; senão pergunte.

Salve a escolha em `state.json` campo `doc_level` (W2 schema já suporta).

```

- [ ] **Step 2: Adicionar secção em `research-cycle/SKILL.md`**

Read file. Adicionar nova `##` secção:

```markdown
## Tier do ciclo (escolha antes de começar)

Três níveis de profundidade:

- **`L1` quick** (<5min, sem critic): WebSearch direto, 1-2 fontes, sem `sources.json` estruturado. Use pra dúvidas pontuais ou validação rápida de fato.
- **`L2` standard** (<15min, com critic): researcher principal + research-critic adversarial, 3+ fontes trianguladas, `sources.json` + `claims.json` + `pesquisa.md`. **Default**.
- **`L3` deep** (<30min, com 2-4 researchers paralelos): pra decisão arquitetural P0 ou trade-off complexo. Múltiplos researchers concorrentes + critic + sintetizador final.

Aceita via slash command argument: `/xp-stack:research-cycle L1` ou `L2` ou `L3`. Default: `L2`.

Salve qual tier foi usado no header de `pesquisa.md`.

```

- [ ] **Step 3: Sanity check + commit**

```bash
cd /home/rnobre/dev/xp-stack
grep -A 2 "## Doc level" plugins/xp-stack/skills/task-decomposition/SKILL.md
grep -A 2 "## Tier do ciclo" plugins/xp-stack/skills/research-cycle/SKILL.md
npx vitest run

git add plugins/xp-stack/skills/task-decomposition/SKILL.md plugins/xp-stack/skills/research-cycle/SKILL.md
git commit -m "feat(skills): adiciona doc level configuravel (T20 W4)

task-decomposition aceita level:
- essencial: 00-overview + 1-3 T-files (features <1 dia)
- completo: full pacote (default pra multi-onda)
- Slash arg: /xp-stack:task-decomposition <level>

research-cycle aceita tier:
- L1 quick (<5min, sem critic)
- L2 standard (<15min, com critic — default)
- L3 deep (<30min, multi-researcher paralelo)
- Slash arg: /xp-stack:research-cycle <tier>

Salva escolha em state.json (W2 schema) ou header pesquisa.md.

Suite: 127 verde."
git push origin feat/v1.0.0-ship
```

---

## Task 21: dual mirror auto-detect refinement em init

**Files:**
- Modify: `src/cli/commands/init.js` (adicionar warning + suggest --engine)
- Modify: `tests/cli/init.test.js` (adicionar test do warning)

> **Comportamento atual (W1+W2):** init detecta engines via filesystem markers. Se claude-code detectado, adiciona antigravity automaticamente (dual mirror always-on, exceto com `--no-dual-mirror`). Refinement em T21: se >1 engine "real" detectada (não só dual mirror), warn user que --engine explicit pode ser melhor pra evitar surpresas.

- [ ] **Step 1: Escrever teste falho do warning**

Adicionar ao `tests/cli/init.test.js` (no final, antes do último `});` do describe `xp-stack init`):

```javascript
  it('com 2+ engines reais detectadas, imprime warning sugerindo --engine explicit', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    mkdirSync(join(tmp, '.cursor'), { recursive: true });
    writeFileSync(join(tmp, 'AGENTS.md'), '# AGENTS\n');
    const out = execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    expect(out).toMatch(/multiplas engines detectadas|multiple engines/i);
    expect(out).toMatch(/--engine/);
  });
```

- [ ] **Step 2: Verificar FAIL** — `npx vitest run tests/cli/init.test.js`. Esperado: 1 fail (warning não existe).

- [ ] **Step 3: Adicionar warning em `runInit` de `init.js`**

Read o file. Antes do `console.log(`xp-stack v${pkgJson.version} instalado em ${projectRoot}`);`, adicionar:

```javascript
  // Warning se >=2 engines reais (não só dual-mirror automatic) detectadas
  if (!opts.engine) {
    const detected = detectEngines(projectRoot);
    if (detected.length >= 2) {
      console.log(`xp-stack init: WARN — multiplas engines detectadas (${detected.join(', ')}). Pra evitar instalacao em todas, use --engine <csv> pra forcar lista explicita.`);
    }
  }
```

- [ ] **Step 4: Verificar PASS** — `npx vitest run tests/cli/init.test.js`. Esperado: todos verde (incluindo o novo).

Suite total esperada: 127 + 1 = 128 verde.

- [ ] **Step 5: Commit T21**

```bash
cd /home/rnobre/dev/xp-stack
git add src/cli/commands/init.js tests/cli/init.test.js
git commit -m "feat(cli): warning quando init detecta multiplas engines (T21 W4)

Refinement do auto-detect: quando >=2 engines reais detectadas
(via detectEngines, antes do dual-mirror automatic), imprime warning
sugerindo --engine <csv> pra forcar lista explicita.

Evita surpresa quando user tem .claude + .cursor + AGENTS.md no
projeto e nao percebe que init vai instalar templates em todos 3.

Sem warning: --engine flag ja foi passado (user explicit).
Sem warning: 0 ou 1 engine detectada (sem ambiguidade).

Tests: 1 novo cenario. Suite: 128 verde."
git push origin feat/v1.0.0-ship
```

---

## Task 22: auto check de versão npm em akita-xp-rules

**Files:**
- Modify: `plugins/xp-stack/skills/akita-xp-rules/SKILL.md` (adicionar secção)
- Create: `plugins/xp-stack/skills/akita-xp-rules/scripts/version-check.sh` (helper bash)

> **Comportamento:** akita-xp-rules é skill auto-loaded em toda sessão. Adicionar instrução: no início, rodar `bash version-check.sh` que compara `.xp-stack/version` (local) com `https://registry.npmjs.org/xp-stack/latest` (remote) — se outdated, imprime banner. Cache: `.xp-stack/version-check-cache.json` com timestamp pra evitar refazer no mesmo dia.

- [ ] **Step 1: Criar `scripts/version-check.sh`**

```bash
mkdir -p /home/rnobre/dev/xp-stack/plugins/xp-stack/skills/akita-xp-rules/scripts
cat > /home/rnobre/dev/xp-stack/plugins/xp-stack/skills/akita-xp-rules/scripts/version-check.sh <<'EOF'
#!/usr/bin/env bash
# version-check.sh — compara versao local de xp-stack com npm registry.
# Imprime banner se outdated. Cache 24h em .xp-stack/version-check-cache.json.
# Silent fail se sem rede ou jq ausente — nao trava session.

set -euo pipefail

PROJECT_ROOT="${1:-$(pwd)}"
CACHE_FILE="$PROJECT_ROOT/.xp-stack/version-check-cache.json"
LOCAL_VERSION_FILE="$PROJECT_ROOT/.xp-stack/version"
NPM_URL="https://registry.npmjs.org/xp-stack/latest"
CACHE_TTL_HOURS=24

# Skip if no local install
[ -f "$LOCAL_VERSION_FILE" ] || exit 0

LOCAL_VERSION=$(cat "$LOCAL_VERSION_FILE" 2>/dev/null || echo "unknown")

# Check cache freshness (skip if checked in last CACHE_TTL_HOURS)
if [ -f "$CACHE_FILE" ]; then
  if command -v jq >/dev/null 2>&1; then
    CACHE_TS=$(jq -r '.checked_at // ""' "$CACHE_FILE" 2>/dev/null || echo "")
    if [ -n "$CACHE_TS" ]; then
      NOW_EPOCH=$(date +%s)
      CACHE_EPOCH=$(date -d "$CACHE_TS" +%s 2>/dev/null || echo 0)
      AGE_HOURS=$(( (NOW_EPOCH - CACHE_EPOCH) / 3600 ))
      if [ "$AGE_HOURS" -lt "$CACHE_TTL_HOURS" ]; then
        # Cache fresh — read remote from cache instead of refetching
        REMOTE_VERSION=$(jq -r '.remote_version // ""' "$CACHE_FILE" 2>/dev/null || echo "")
        if [ -n "$REMOTE_VERSION" ] && [ "$LOCAL_VERSION" != "$REMOTE_VERSION" ]; then
          echo ""
          echo "xp-stack: nova versao disponivel ($REMOTE_VERSION). Voce esta em $LOCAL_VERSION."
          echo "Update: npx xp-stack update --yes --take-theirs"
          echo ""
        fi
        exit 0
      fi
    fi
  fi
fi

# Fetch remote version (silent fail)
if command -v curl >/dev/null 2>&1; then
  REMOTE_VERSION=$(curl -fsS --max-time 3 "$NPM_URL" 2>/dev/null | sed -n 's/.*"version":"\([^"]*\)".*/\1/p' | head -1)
elif command -v wget >/dev/null 2>&1; then
  REMOTE_VERSION=$(wget -qO- --timeout=3 "$NPM_URL" 2>/dev/null | sed -n 's/.*"version":"\([^"]*\)".*/\1/p' | head -1)
else
  exit 0  # Silent: nao tem fetcher
fi

[ -n "$REMOTE_VERSION" ] || exit 0  # Silent: sem rede

# Update cache
mkdir -p "$(dirname "$CACHE_FILE")"
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > "$CACHE_FILE" <<JSON
{
  "checked_at": "$NOW_ISO",
  "local_version": "$LOCAL_VERSION",
  "remote_version": "$REMOTE_VERSION"
}
JSON

# Compare + banner
if [ "$LOCAL_VERSION" != "$REMOTE_VERSION" ]; then
  echo ""
  echo "xp-stack: nova versao disponivel ($REMOTE_VERSION). Voce esta em $LOCAL_VERSION."
  echo "Update: npx xp-stack update --yes --take-theirs"
  echo ""
fi
EOF
chmod +x /home/rnobre/dev/xp-stack/plugins/xp-stack/skills/akita-xp-rules/scripts/version-check.sh
```

- [ ] **Step 2: Modificar `akita-xp-rules/SKILL.md` adicionando instrução**

Read file primeiro. Adicionar nova `##` secção (recomendo no início, antes das 6 regras):

```markdown
## Auto-check de versão (rodar 1x por sessão)

No início de toda sessão, rode em background pra detectar se há versão nova do xp-stack disponível:

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/version-check.sh
```

Cache 24h em `.xp-stack/version-check-cache.json` evita refetch redundante. Silent fail se sem rede / sem `curl`/`wget`. Se outdated, imprime banner discreto sugerindo `npx xp-stack update`.

Skip se projeto não tem `.xp-stack/` instalado.

```

- [ ] **Step 3: Sanity check + commit**

```bash
cd /home/rnobre/dev/xp-stack
ls plugins/xp-stack/skills/akita-xp-rules/scripts/
test -x plugins/xp-stack/skills/akita-xp-rules/scripts/version-check.sh && echo "executable OK"
grep "Auto-check de versao" plugins/xp-stack/skills/akita-xp-rules/SKILL.md
npx vitest run

git add plugins/xp-stack/skills/akita-xp-rules/
git commit -m "feat(skills): auto-check de versao npm via version-check.sh (T22 W4)

akita-xp-rules (auto-loaded em toda sessao) ganhou instrucao pra rodar
scripts/version-check.sh que:
- Compara .xp-stack/version local com registry.npmjs.org/xp-stack/latest
- Cache 24h em .xp-stack/version-check-cache.json (evita refetch)
- Silent fail se sem rede ou sem curl/wget (nao trava session)
- Banner discreto se outdated, sugere 'npx xp-stack update'

Skip se projeto nao tem .xp-stack/ instalado.

Suite: 127 verde."
git push origin feat/v1.0.0-ship
```

---

## Task 23: fallback headers em todos SKILL.md + alias `/xp` opcional

**Files:**
- Modify: TODOS `plugins/xp-stack/skills/*/SKILL.md` (adicionar header de 2 linhas)
- Modify: `templates/settings.json.template` (adicionar `aliases.xp`)

> **Fallback header:** engines sem skill loading (Cursor, Codex via fallback) não invocam skill via comando — leem o markdown inteiro. Header explica o pattern: "se sua engine não tem skill loading, leia este file na íntegra e siga as instruções."
>
> **Alias `/xp`:** atalho pra `xp-stack` em settings.json. Opcional, default OFF.

- [ ] **Step 1: Adicionar fallback header em cada SKILL.md**

Lista de SKILL.md a modificar (todos os do plugin):

```bash
ls /home/rnobre/dev/xp-stack/plugins/xp-stack/skills/*/SKILL.md
```

Esperado: 8 files (akita-xp-rules, bootstrap, local-waves, optimizing-github-actions, paperclip-orchestrator, research-cycle, task-decomposition, tdd-conventions).

Pra CADA file:

Read primeiro pra encontrar onde está o frontmatter `---` final + linha em branco. Insert IMEDIATAMENTE depois (antes da persona de T19 ou primeira `##`):

```markdown
> **Pra engines sem skill loading (Cursor, Codex sem MCP):** leia este file inteiro e siga as instrucoes como se fossem suas. Voce nao precisa "invocar" — apenas obedeca. Cursor e Codex que tem `xp-stack` instalado via npm leem este SKILL.md em `.cursor/rules/` ou `.codex/skills/`.

```

(usar uma única linha de blockquote + linha em branco). Pode ser feito via Edit tool por file ou loop bash com sed (cuidado com idempotência — não duplicar).

- [ ] **Step 2: Verificar idempotência (re-rodar não duplica)**

```bash
cd /home/rnobre/dev/xp-stack
for f in plugins/xp-stack/skills/*/SKILL.md; do
  count=$(grep -c "Pra engines sem skill loading" "$f" || true)
  echo "$f: $count occorrencias"
done
```

Esperado: cada file tem `1` ocorrencia. Se algum tiver 0, adicione manualmente. Se algum tiver 2+, edit pra remover duplicata.

- [ ] **Step 3: Modificar `templates/settings.json.template` adicionando alias**

Read file primeiro. Adicionar campo `aliases` (Claude Code feature):

```json
{
  "aliases": {
    "xp": "xp-stack"
  },
  "hooks": {
    "Stop": [
      ...
    ]
  }
}
```

(merge com conteúdo existente.)

- [ ] **Step 4: Sanity check + commit**

```bash
cd /home/rnobre/dev/xp-stack
echo "=== Fallback headers ==="
for f in plugins/xp-stack/skills/*/SKILL.md; do
  echo "$f: $(grep -c 'Pra engines sem skill loading' "$f")x"
done
echo "=== Settings alias ==="
grep -A 2 "aliases" templates/settings.json.template
npx vitest run

git add plugins/xp-stack/skills/ templates/settings.json.template
git commit -m "feat(skills): fallback headers em todos SKILL.md + alias /xp (T23 W4)

Fallback header em 8 skills (todas em plugins/xp-stack/skills/):
- akita-xp-rules, bootstrap, tdd-conventions, task-decomposition,
  research-cycle, optimizing-github-actions, paperclip-orchestrator,
  local-waves
- Pattern: blockquote logo apos frontmatter explicando que engines
  sem skill loading (Cursor, Codex sem MCP) devem ler o file inteiro
  e obedecer as instrucoes como se fossem suas.

Alias /xp -> xp-stack em settings.json.template (Claude Code aliases).
Opt-in via init --with-hooks (settings.json eh injetado).

Suite: 127 verde."
git push origin feat/v1.0.0-ship
```

---

## Task 24: release final 1.0.0

**Files:**
- Modify: `package.json` (version `1.0.0-alpha.0` → `1.0.0`)
- Modify: `README.md` (atualizar instructions, badges, version refs)
- Modify: `CLAUDE.md` (adicionar ADR-009 + atualizar status pra v1.0.0)
- Modify: `docs/tasks/v1.0.0-ship/00-overview.md` (status: CONCLUIDA)
- Create: `docs/tasks/v1.0.0-ship/PROGRESS.md` (snapshot final)

> **CRÍTICO:** T24 envolve operações públicas — `npm publish` (afeta npm registry, irreversível pra mesma versão), GitHub release (visível), PR pra main. **Pause antes de executar npm publish e PR pra confirmar com Piloto.**

- [ ] **Step 1: Bump version em package.json**

```bash
cd /home/rnobre/dev/xp-stack
# Manualmente OR npm version 1.0.0 --no-git-tag-version
```

Edit `package.json` linha `"version": "1.0.0-alpha.0"` → `"version": "1.0.0"`.

- [ ] **Step 2: Atualizar README.md**

Adicionar/atualizar:
- Badge npm version (ex: `[![npm version](https://img.shields.io/npm/v/xp-stack.svg)](https://npmjs.com/package/xp-stack)`)
- Seção "Install": `npm install -g xp-stack` ou `npx xp-stack init`
- Lista de subcomandos atualizada (10 + version)
- Quick start exemplo
- Link pro GitHub release v1.0.0

> **Conteúdo exato do README depende do estado atual.** Read primeiro, faça edits incrementais. NAO sobrescreva tudo.

- [ ] **Step 3: Adicionar ADR-009 em CLAUDE.md (do repo xp-stack)**

Read CLAUDE.md primeiro. Adicionar na secção "Decisões Tecnicas (ADRs)" ou criar a seção:

```markdown
- **ADR-009** (v1.0.0, 2026-05-03) — Reversa-inspired hardening: npm CLI primario (`xp-stack`) + plugin marketplace shim, dual mirror always-on (claude-code + antigravity), state machine per-feature (state.json) + global index, schemas estruturados (tasks/sources/claims/manifest/index), confidence markers, manifest SHA-256 com diff em update, RESUME.md auto-gen via hook Stop, doc level configuravel, 3 agents opt-in (db-archaeologist, screenshot-spec-writer, flowchart-extractor), persona PT-BR em 4 skills executoras, fallback headers pra engines sem skill loading, alias `/xp`. Trade-off aceito: sem self-test em projetos reais antes do release (validacao via 127 tests internos + smoke E2E). 18 tasks em 5 ondas, ~40 commits no branch feat/v1.0.0-ship.
```

Atualizar tambem a secção "Estado Atual" pra refletir v1.0.0 lançada.

- [ ] **Step 4: Atualizar `00-overview.md` da feature**

Read file. Atualizar header:

```markdown
**Status:** CONCLUIDA on 2026-05-03
```

Marcar T19-T24 como `[x] Concluida` na tabela W4 (substituir as linhas pendentes).

- [ ] **Step 5: Criar `PROGRESS.md` com snapshot final**

```bash
cat > /home/rnobre/dev/xp-stack/docs/tasks/v1.0.0-ship/PROGRESS.md <<'EOF'
# v1.0.0-ship — Progress Final

**Status:** CONCLUIDA on 2026-05-03
**Branch:** `feat/v1.0.0-ship` mergeada em main
**Tag:** `v1.0.0`

## Métricas finais

| Métrica | Valor |
|---|---|
| Tasks totais | 18 (T0-T18 + T19-T24) |
| Ondas | 5 (W0 fundação, W1 CLI core, W2 state machine, W3 schemas+agents, W4 polish+release) |
| Commits no branch | ~50 (incluindo plans, closures, fixes, ruidosos T17) |
| Tests vitest | ~130 |
| Tests bash | 53 (preservados, sem regression) |
| Subcomandos CLI | 10 |
| Helpers JS | 7 (engines, manifest, installer, index-tracker, state, resume-generator, markdown-tasks, tasks, research, research-renderer) |
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

## Riscos materializados (pos-release)

(preencher se houver issues abertas no GitHub apos release v1.0.0)

## Lessons brought forward (pra v1.1+)

- Working tree instability com templates (subagents persistem deletes em sandbox próprio) — workaround `git checkout HEAD -- ...`
- 3 commits ruidosos T17 — ao fazer revert de commit que toca múltiplas paths, verificar exatamente o que foi revertido antes de re-criar
- DRY violations em research.js (read/write pairs) — candidato a `makeJsonCollection(fileName, schemaName)` em refactor v1.1
- Sync tasks.json ↔ state.json deferido pra refactor v1.1
EOF
```

- [ ] **Step 6: Commit pre-release (preparação)**

```bash
cd /home/rnobre/dev/xp-stack
git add package.json README.md CLAUDE.md docs/tasks/v1.0.0-ship/00-overview.md docs/tasks/v1.0.0-ship/PROGRESS.md
git commit -m "release: v1.0.0 (Reversa-inspired hardening)

Bump version 1.0.0-alpha.0 -> 1.0.0.
ADR-009 documenta release.
PROGRESS.md com snapshot final (18 tasks, 5 ondas, ~50 commits, ~130 tests).
README atualizado com instructions npm CLI + 10 subcomandos.
00-overview marcado CONCLUIDA + T19-T24 [x].

Pronto pra npm publish + GitHub release + PR pra main."
git push origin feat/v1.0.0-ship
```

- [ ] **Step 7: PAUSA OBRIGATÓRIA — confirmar com Piloto antes de operações públicas**

Antes de continuar pros próximos steps (npm publish, GitHub release, PR pra main), CONFIRME com o Piloto que tudo está OK:

- Suite verde (rodar `npm test` + `npm run test:bash`)
- README está como ele quer
- ADR-009 reflete a realidade
- npm token configurado (se ele vai publicar via CI/manualmente)

**Reporte ao Piloto:**

> "T24 chegou no ponto público. Próximos steps fazem npm publish (irreversível pra v1.0.0), GitHub release (visível), e PR feat/v1.0.0-ship → main. Confirma que posso prosseguir? Precisa configurar npm token primeiro?"

NAO PROSSEGUIR sem o "OK" explícito do Piloto.

- [ ] **Step 8 (após OK do Piloto): npm publish**

```bash
cd /home/rnobre/dev/xp-stack
# Verificar npm login
npm whoami
# Se nao logado: npm login

# Dry-run primeiro pra validar tarball
npm pack --dry-run
# Esperado: tarball ~25-50kB, files = bin/ + src/ + schemas/ + templates/ + skills/ + README + LICENSE + package.json

# Publish (publica como public se eh primeira vez)
npm publish --access public

# Verificar
npm view xp-stack version
# Esperado: 1.0.0
```

- [ ] **Step 9: GitHub release**

```bash
cd /home/rnobre/dev/xp-stack
git tag v1.0.0
git push origin v1.0.0

gh release create v1.0.0 --title "v1.0.0 — Reversa-inspired hardening" --notes "$(cat <<'EOF'
## Highlights

xp-stack v1.0.0 — primeira release publica no npm.

- **npm CLI multi-engine**: `npx xp-stack init` detecta engines (Claude Code, Codex, Cursor, Antigravity, Gemini CLI, etc.) + instala templates dual mirror automatico.
- **State machine per-feature**: `state.json` + `tasks.json` em cada `docs/tasks/<feature>/`, com auto-update via hook Stop.
- **RESUME.md auto-gerado**: snapshot vivo da feature (tasks, blockers, last_session_summary), regenerado no fim de cada sessao.
- **3 agents opt-in**: `db-archaeologist` (Supabase analyzer), `screenshot-spec-writer` (UI doc gen), `flowchart-extractor` (Mermaid). Instalavel via `xp-stack add-skill <name>`.
- **Manifest SHA-256**: `xp-stack update` detecta drift e pergunta keep/take/abort por arquivo.
- **JSON wins**: tasks.json + claims.json sao fonte de verdade pra dados estruturais; markdown eh render derivado. `xp-stack reconcile` sincroniza.
- **Confidence markers** (🟢 CONFIRMADO / 🟡 INFERIDO / 🔴 LACUNA) estruturais em outputs.

## Subcomandos

`init`, `update`, `status`, `add-engine`, `add-skill`, `uninstall`, `resume`, `hook-stop`, `regenerate-resume`, `reconcile`.

## Skills (plugin marketplace)

8 skills: `akita-xp-rules`, `bootstrap`, `tdd-conventions`, `task-decomposition`, `research-cycle`, `optimizing-github-actions`, `paperclip-orchestrator`, `local-waves`.

## Install

\`\`\`bash
npx xp-stack init
\`\`\`

Ou via plugin marketplace Claude Code:
\`\`\`
/plugin marketplace add RNobre1/xp-stack
/plugin install xp-stack@xp-stack
/xp-stack:bootstrap
\`\`\`

## Inspiracao

Padroes de design absorvidos de [sandeco/reversa](https://github.com/sandeco/reversa). Veja [ADR-009](CLAUDE.md) pro racional completo.
EOF
)"

# Verificar
gh release view v1.0.0
```

- [ ] **Step 10: PR feat/v1.0.0-ship → main**

```bash
cd /home/rnobre/dev/xp-stack
gh pr create --base main --head feat/v1.0.0-ship --title "v1.0.0 — Reversa-inspired hardening" --body "$(cat <<'EOF'
## Summary

xp-stack v1.0.0 — primeira release publica. 18 tasks em 5 ondas (W0-W4), ~50 commits, ~130 tests vitest + 53 bash.

Detalhes em [00-overview.md](docs/tasks/v1.0.0-ship/00-overview.md), [PROGRESS.md](docs/tasks/v1.0.0-ship/PROGRESS.md), e [GitHub release v1.0.0](https://github.com/RNobre1/xp-stack/releases/tag/v1.0.0).

## Test plan

- [x] `npm test` — 130 verde (vitest)
- [x] `npm run test:bash` — 53 verde (bash)
- [x] `node bin/xp-stack --version` → 1.0.0
- [x] Smoke E2E: init → status → add-engine → add-skill (3 agents) → uninstall → todos OK
- [x] npm publish OK
- [x] GitHub release v1.0.0 criado
- [ ] Pos-merge: validar instalacao limpa via `npx xp-stack@1.0.0 init` em projeto temp

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

# Esperar aprovacao + merge do Piloto. NAO self-merge.
```

- [ ] **Step 11: Pos-merge cleanup**

Apos Piloto mergear o PR:

```bash
cd /home/rnobre/dev/xp-stack
git checkout main
git pull origin main
git branch -d feat/v1.0.0-ship
# git push origin --delete feat/v1.0.0-ship  # opcional, pode preservar como ref histórica
```

---

## Conclusão da Onda 4

Após T19-T24 mergeados, o repo terá:

✅ Persona PT-BR em 4 skills executoras (bootstrap, task-decomposition, research-cycle, optimizing-github-actions)
✅ Doc level configurável (essencial/completo + L1/L2/L3)
✅ Refinement de dual mirror auto-detect (warning quando ambíguo)
✅ Auto check de versão npm (1x/sessão via akita-xp-rules)
✅ Fallback headers em TODOS 8 SKILL.md
✅ Alias `/xp` opcional via settings.json
✅ **xp-stack v1.0.0 publicada no npm**
✅ **GitHub release v1.0.0 criado**
✅ **PR feat/v1.0.0-ship → main mergeado**

**v1.0.0 OFICIALMENTE LANÇADA.** 🎉

---

## Checklist de saída de W4

- [ ] T19 (persona PT-BR) commitado
- [ ] T20 (doc level) commitado
- [ ] T21 (dual mirror warning) commitado
- [ ] T22 (version check) commitado
- [ ] T23 (fallback headers + alias) commitado
- [ ] T24 release: package.json bump 1.0.0
- [ ] T24 release: README atualizado
- [ ] T24 release: ADR-009 em CLAUDE.md
- [ ] T24 release: 00-overview.md status CONCLUIDA
- [ ] T24 release: PROGRESS.md criado
- [ ] **PAUSA: confirmação Piloto antes de operações públicas**
- [ ] T24 release: `npm publish --access public` sucede
- [ ] T24 release: `npm view xp-stack version` retorna `1.0.0`
- [ ] T24 release: `gh release create v1.0.0` sucede
- [ ] T24 release: `gh pr create --base main` sucede
- [ ] **PAUSA: Piloto revisa + merga PR**
- [ ] T24 cleanup: branch local deletado, working em main
- [ ] Post-release smoke: `npx xp-stack@1.0.0 init` em projeto temp sucede
