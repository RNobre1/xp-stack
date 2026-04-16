# T3 — SKILL.md + validacao empirica

> **Sessao:** unica (sequencial apos T2)
> **Branch:** `feat/write-bootstrap-skill`
> **Status:** `[x] Planning` `[x] In progress` `[x] Tests passing` `[x] Ready for review`

---

## Objetivo

Reescrever `plugins/xp-stack/skills/bootstrap/SKILL.md` com fluxo de 4 steps (detect -> ask 3 questions -> ask CLAUDE.md action -> bash scaffold.sh) e validar empiricamente invocando `claude --plugin-dir` em um diretorio temporario, testando os 4 modos de CLAUDE.md. Apos esta task, a feature esta completa.

---

## Contexto necessario

- **Feature maior:** [00-overview.md](00-overview.md)
- **Tasks anteriores:** T1 (templates + tests RED), T2 (scaffold.sh GREEN 10/10)
- **Spec:** `/tmp/claude-craft-write-bootstrap.md`, bloco `## FILE: plugins/xp-stack/skills/bootstrap/SKILL.md`
- **POC de referencia:** `plugins/poc-bootstrap/skills/scaffold/SKILL.md` (padrao !command + `${CLAUDE_SKILL_DIR}` validado empiricamente, 5/5 testes)
- **Validacao empirica anterior (extract-portable-skills):** `claude --plugin-dir` carregou 5 skills + 4 agents; bootstrap oculto por `disable-model-invocation: true`

---

## Files ALLOWED

```
plugins/xp-stack/skills/bootstrap/SKILL.md               (reescrever)
docs/tasks/write-bootstrap-skill/T3-skill-md-empirical.md (este, para log empirico)
CLAUDE.md                                                (adicionar ADR-005 + atualizar Estado atual)
```

## Files FORBIDDEN

```
plugins/poc-bootstrap/**
plugins/xp-stack/skills/bootstrap/scripts/scaffold.sh     (congelado de T2)
plugins/xp-stack/templates/**                             (congelados de T1)
tests/**                                                  (congelados)
```

---

## Ordem de execucao (TDD nao-aplicavel — conteudo e empirico)

TDD classico nao se aplica aqui: SKILL.md e texto/markdown consumido pelo agente em runtime, nao codigo testavel unitariamente. A validacao e empirica (invocar o plugin de fato).

### Fase 1 — Reescrever SKILL.md

- [ ] Substituir conteudo atual de `plugins/xp-stack/skills/bootstrap/SKILL.md` por versao da spec:
  - Frontmatter: `name: bootstrap`, description nova (inglesa), `disable-model-invocation: true`, `allowed-tools` expandida (bash/cp/cp -n/cp -rn/mkdir/mkdir -p/test/ls/pwd/cat + AskUserQuestion)
  - Corpo: # XP Stack Bootstrap + 3 blocos `!` de detecao (pwd, test -f CLAUDE.md, ls .claude, ls docs) + 4 steps (collect info, handle CLAUDE.md, run scaffold, report)
  - Step 3 chama o script com 5 args via Bash tool: `bash ${CLAUDE_SKILL_DIR}/scripts/scaffold.sh "$(pwd)" "<name>" "<stack>" "<desc>" "<action>"`
- [ ] Rodar regressao: `bash tests/{marketplace,skeleton,scaffold,bootstrap}_test.sh` → tudo verde ainda
- [ ] `git commit -m "feat(skill): bootstrap SKILL.md com AskUserQuestion + 4 modos CLAUDE.md"`

### Fase 2 — Validacao empirica

Seguir protocolo de 4 cenarios. **Importante:** usar dir temporario isolado, nao poluir o claude-craft nem o home.

```bash
# Cenario 1: create em dir vazio
rm -rf /tmp/bootstrap-empirical-create
mkdir -p /tmp/bootstrap-empirical-create
cd /tmp/bootstrap-empirical-create
claude --plugin-dir /home/rnobre/dev/claude-craft/plugins/xp-stack
# Dentro: /xp-stack:bootstrap
# Responder: name="test-api", stack="Python + FastAPI", desc="API teste", action=create (auto, dir vazio)
# Verificar: ls -la; CLAUDE.md existe; docs/tasks/_template/ existe; docs/pesquisas/_template/ existe; .claude/settings.json existe
# Verificar: grep "test-api" CLAUDE.md → encontra; grep "{{PROJECT_NAME}}" CLAUDE.md → nao encontra

# Cenario 2: skip preserva
# Com dir ja populado do cenario 1, editar CLAUDE.md adicionando linha "MARKER_SKIP"
# Rodar /xp-stack:bootstrap de novo; responder action=skip
# Verificar: grep "MARKER_SKIP" CLAUDE.md → ainda encontra (preservado)

# Cenario 3: backup renomeia e cria novo
# Com CLAUDE.md contendo MARKER_SKIP ainda
# Rodar /xp-stack:bootstrap; responder action=backup
# Verificar: ls CLAUDE.md.bak; grep "MARKER_SKIP" CLAUDE.md.bak → encontra
# Verificar: grep "MARKER_SKIP" CLAUDE.md → nao encontra (foi recriado)

# Cenario 4: abort nao faz nada
rm -rf /tmp/bootstrap-empirical-abort
mkdir -p /tmp/bootstrap-empirical-abort
cd /tmp/bootstrap-empirical-abort
claude --plugin-dir /home/rnobre/dev/claude-craft/plugins/xp-stack
# Criar CLAUDE.md com "dummy"; invocar skill; responder action=abort
# Verificar: CLAUDE.md nao alterado (contem "dummy"); docs/ nao criado
```

**Alternativa se interatividade for problematica:** rodar `scaffold.sh` diretamente com cada `CLAUDE_MD_ACTION` value e verificar via bash (isso ja e coberto por `bootstrap_test.sh` 7/8/9). A validacao empirica adiciona SO o teste de que a SKILL.md e consumida corretamente pelo Claude Code (detecao de env + AskUserQuestion + chamada bash).

### Fase 3 — Documentacao final

- [ ] Preencher "Log de execucao > Fase empirica" deste arquivo com outputs reais (4 cenarios)
- [ ] Editar `CLAUDE.md` do projeto:
  - Adicionar ADR-005 "Bootstrap skill final" (razao: design, validacao empirica, limites)
  - Atualizar Estado atual: `[x] write-bootstrap-skill` com data
  - Licoes aprendidas: registrar surpresas empiricas se houver
- [ ] `git commit -m "docs(bootstrap): ADR-005 + log empirico"`

---

## Criterios de aceitacao

- [ ] SKILL.md tem frontmatter valido (name, description, disable-model-invocation, allowed-tools)
- [ ] SKILL.md menciona explicitamente `AskUserQuestion` batched + 4 modos de CLAUDE.md action
- [ ] SKILL.md chama `bash ${CLAUDE_SKILL_DIR}/scripts/scaffold.sh` com 5 args
- [ ] Empirico cenario 1 (create): 4 arquivos/dirs criados + placeholders substituidos
- [ ] Empirico cenario 2 (skip): CLAUDE.md preservado
- [ ] Empirico cenario 3 (backup): .bak criado + novo CLAUDE.md sem marcador
- [ ] Empirico cenario 4 (abort): nada criado
- [ ] ADR-005 adicionada ao CLAUDE.md do projeto
- [ ] Estado atual no CLAUDE.md marcado `[x] write-bootstrap-skill`
- [ ] Regressao zero em todas as 4 suites de teste

---

## Blockers — parar e alertar

- `claude --plugin-dir` interatividade travar ou nao responder em modo nao-interativo → fallback: usar scaffold.sh diretamente (cobertura dos 4 modos ja e feita por `bootstrap_test.sh`)
- `AskUserQuestion` nao aparecer em `allowed-tools` do ambiente → verificar documentacao do plugin system, ajustar se necessario
- Substituicao de placeholders falhar com caracteres especiais no stack → documentar limitacao (ex: evitar `|` literal no input)

---

## Log de execucao

### Fase 1 — SKILL.md reescrita
- **Commit hash:** `11362ea` (feat(skill): bootstrap SKILL.md com AskUserQuestion + 4 modos CLAUDE.md)
- **Regressao (2026-04-16):** 37/37 verde — marketplace 9/9, skeleton 12/12, scaffold 5/5, bootstrap 11/11

### Fase 2 — Validacao empirica (modo fallback)

**Modo de validacao:** invocacao shell direta do `scaffold.sh` via bash nos 4 modos, em diretorios isolados `/tmp/bootstrap-empirical-{A,B,C,D}`. A camada runtime/interativa (SKILL.md consumida pelo Claude Code + AskUserQuestion batched) NAO e validada aqui — fica como follow-up no primeiro teste de aceitacao em projeto real (proxima sessao, registrar no MEMORY.md global quando concluido). Razao do fallback: autorizado pelo T3 linha 92 ("alternativa se interatividade for problematica") e confirmado pelo Piloto nesta sessao (2026-04-16) — a validacao runtime seria duplicacao do teste em projeto real que ocorre logo em seguida.

#### Cenario A — create em dir vazio (2026-04-16)

**Comando:**
```
bash scripts/scaffold.sh /tmp/bootstrap-empirical-A "test-api" "Python + FastAPI" "API de teste empirico" "create"
```

**Output (stdout + stderr):**
```
Created: /tmp/bootstrap-empirical-A/CLAUDE.md
Created: /tmp/bootstrap-empirical-A/docs/tasks/_template/README.md
Created: /tmp/bootstrap-empirical-A/docs/tasks/_template/TEMPLATE-overview.md
Created: /tmp/bootstrap-empirical-A/docs/tasks/_template/TEMPLATE-progress.md
Created: /tmp/bootstrap-empirical-A/docs/tasks/_template/TEMPLATE-task.md
Created: /tmp/bootstrap-empirical-A/docs/tasks/_template/TEMPLATE-terminal-prompts.md
Created: /tmp/bootstrap-empirical-A/docs/pesquisas/_template/TEMPLATE-pesquisa.md
Created: /tmp/bootstrap-empirical-A/.claude/settings.json
Bootstrap complete. Target: /tmp/bootstrap-empirical-A
```

**Verificacoes:**
- `ls -laR` pos-execucao mostra `CLAUDE.md` (4116 bytes), `docs/tasks/_template/` com 5 arquivos, `docs/pesquisas/_template/TEMPLATE-pesquisa.md` (6283 bytes), `.claude/settings.json` (347 bytes) — 8 arquivos criados.
- `grep -c "{{PROJECT_NAME}}\|{{PROJECT_STACK}}\|{{PROJECT_DESCRIPTION}}" CLAUDE.md` → `0` (zero placeholders remanescentes).
- Substituicoes efetivas: `test-api` (1 match), `Python + FastAPI` (2 matches), `API de teste empirico` (1 match).

**Status:** PASS.

#### Cenario B — skip preserva CLAUDE.md existente (2026-04-16)

**Setup:** criado `CLAUDE.md` pre-existente com linha `PRE_EXISTING_MARKER_XYZ`.

**Comando:**
```
bash scripts/scaffold.sh /tmp/bootstrap-empirical-B "ignored-name" "ignored-stack" "ignored-desc" "skip"
```

**Output:**
```
Skipped: CLAUDE.md (kept existing)
Created: /tmp/bootstrap-empirical-B/docs/tasks/_template/README.md
...[5 templates tasks]
Created: /tmp/bootstrap-empirical-B/docs/pesquisas/_template/TEMPLATE-pesquisa.md
Created: /tmp/bootstrap-empirical-B/.claude/settings.json
Bootstrap complete. Target: /tmp/bootstrap-empirical-B
```

**Verificacoes:**
- `grep -q "PRE_EXISTING_MARKER_XYZ" CLAUDE.md` → match encontrado (preservado).
- `grep -q "ignored-name" CLAUDE.md` → ausente (skip honrado, nao substituiu placeholders em CLAUDE.md existente).
- `docs/tasks/_template/`, `docs/pesquisas/_template/`, `.claude/settings.json` criados.

**Status:** PASS.

#### Cenario C — backup renomeia para .bak e cria novo (2026-04-16)

**Setup:** criado `CLAUDE.md` com `PRE_EXISTING_MARKER_XYZ`.

**Comando:**
```
bash scripts/scaffold.sh /tmp/bootstrap-empirical-C "new-project" "Go" "Nova descricao" "backup"
```

**Output:**
```
Backup: /tmp/bootstrap-empirical-C/CLAUDE.md -> /tmp/bootstrap-empirical-C/CLAUDE.md.bak
Created: /tmp/bootstrap-empirical-C/CLAUDE.md
...[demais templates]
Bootstrap complete. Target: /tmp/bootstrap-empirical-C
```

**Verificacoes:**
- `CLAUDE.md.bak` existe (115 bytes, contem marker original).
- `grep -q "PRE_EXISTING_MARKER_XYZ" CLAUDE.md.bak` → match.
- `grep -q "PRE_EXISTING_MARKER_XYZ" CLAUDE.md` → ausente (recriado).
- Substituicoes efetivas em CLAUDE.md novo: `new-project`, `Go`, `Nova descricao` — todos encontrados.
- Placeholders remanescentes: 0.

**Status:** PASS.

#### Cenario D — abort nao faz nada (2026-04-16)

**Setup:** dir vazio.

**Comando:**
```
bash scripts/scaffold.sh /tmp/bootstrap-empirical-D "any" "any" "any" "abort"
```

**Output:**
```
Bootstrap aborted by user. Nothing done.
```

**Verificacoes:**
- Exit code: `0` (graceful abort).
- `ls -A /tmp/bootstrap-empirical-D | wc -l` → `0` (nenhum arquivo criado).

**Status:** PASS.

#### Resumo Fase 2

4/4 cenarios PASS. Comportamento do scaffold.sh empiricamente consistente com `bootstrap_test.sh` (11/11) e com o design da spec. **Follow-up pendente:** validar a camada de integracao com o Claude Code runtime (AskUserQuestion batched + `${CLAUDE_SKILL_DIR}` + carregamento da SKILL.md pelo plugin system) no primeiro teste de aceitacao em projeto real — registrar outcome no MEMORY.md global quando concluido.

### Fase 3 — Documentacao
- **ADR-005 adicionada em CLAUDE.md:** commit desta fase (ver git log).
- **Estado atual atualizado:** `[x] write-bootstrap-skill` marcado no mesmo commit.

### Incidentes / desvios

- **Desvio (2026-04-16):** Fase 2 executada em modo fallback shell-direct em vez de invocacao interativa `claude --plugin-dir`. Autorizado pelo T3 linha 92 + decisao explicita do Piloto na sessao. Cobertura runtime/AskUserQuestion vira no teste de aceitacao em projeto real — nao faz sentido duplicar agora.

---

## Notas para revisao

- **Trade-off:** `AskUserQuestion` como tool allowed — adiciona superficie de prompt injection em teoria, mas e unica forma de batched questions estruturadas. Alternativa (perguntas free-form via texto) seria pior UX e mais fragil ao modelo esquecer o schema.
- **Desapego do POC:** nao importar scaffold.sh do POC por diff — reescrita do zero, baseada na spec. Razao: signature diferente (5 args vs 1), comportamento diferente (4 modos vs apenas copy).
- **Validacao empirica obrigatoria:** ADR-002 demanda "validacao empirica". Sem ela, a feature esta incompleta. Nao substituir por testes estruturais que ja estao em `skeleton_test.sh`.
