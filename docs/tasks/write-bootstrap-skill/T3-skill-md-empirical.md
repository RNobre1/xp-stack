# T3 — SKILL.md + validacao empirica

> **Sessao:** unica (sequencial apos T2)
> **Branch:** `feat/write-bootstrap-skill`
> **Status:** `[ ] Planning` `[ ] In progress` `[ ] Tests passing` `[ ] Ready for review`

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

> Preenchido durante execucao.

### Fase 1 — SKILL.md reescrita
- **Commit hash:** {{preencher}}
- **Regressao:** {{4 suites de teste — X/X cada}}

### Fase 2 — Validacao empirica
- **Cenario 1 (create dir vazio):** {{output real, arquivos criados, substituicoes validadas}}
- **Cenario 2 (skip):** {{MARKER preservado? sim/nao}}
- **Cenario 3 (backup):** {{.bak criado? MARKER onde?}}
- **Cenario 4 (abort):** {{nada criado? exit 0?}}

### Fase 3 — Documentacao
- **ADR-005 adicionada em CLAUDE.md:** {{link para commit}}
- **Estado atual atualizado:** {{link para commit}}

### Incidentes / desvios

{{preencher}}

---

## Notas para revisao

- **Trade-off:** `AskUserQuestion` como tool allowed — adiciona superficie de prompt injection em teoria, mas e unica forma de batched questions estruturadas. Alternativa (perguntas free-form via texto) seria pior UX e mais fragil ao modelo esquecer o schema.
- **Desapego do POC:** nao importar scaffold.sh do POC por diff — reescrita do zero, baseada na spec. Razao: signature diferente (5 args vs 1), comportamento diferente (4 modos vs apenas copy).
- **Validacao empirica obrigatoria:** ADR-002 demanda "validacao empirica". Sem ela, a feature esta incompleta. Nao substituir por testes estruturais que ja estao em `skeleton_test.sh`.
