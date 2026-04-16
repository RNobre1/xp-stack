# Task: Invocacao real via `claude --plugin-dir` e verificacao filesystem

> **Sessao:** Terminal 1 de 1
> **Branch:** `feat/poc-bootstrap`
> **Status:** `[ ] Planejando` `[ ] Em execucao` `[ ] Testes passando` `[ ] Pronto para revisao`
> **Bloqueado por:** T1 verde + review do Piloto

---

## Objetivo

Provar empiricamente que o padrao `!bash ${CLAUDE_SKILL_DIR}/scripts/scaffold.sh "$(pwd)"` no preamble de uma SKILL.md e pre-processado pelo Claude Code durante a invocacao da skill, e que o script efetivamente copia `SENTINEL.md` pro cwd da sessao receptora. T2 e a unica fase do POC que exercita a integracao end-to-end com o runtime Claude Code; T1 cuidou do shell standalone.

---

## Contexto necessario

- **Feature maior:** [00-overview.md](00-overview.md)
- **Pre-requisito:** T1 com 5/5 testes passando, plugin skeleton committed em `feat/poc-bootstrap`, review OK do Piloto.
- **Secao da pesquisa:** `docs/pesquisas/replicar-stack-claude-code.md` secao 6.2 (hipotese do mecanismo) e secao 9 (limitacoes conhecidas: padrao nao observado em plugin publico, claim grade B).
- **Mecanismo de carregamento pra teste:** `claude --plugin-dir <path>` — flag documentada pela docs oficial [ref 1 da pesquisa] pra testar plugin sem instalar via marketplace.

---

## Arquivos que PODE tocar

```
docs/tasks/poc-bootstrap/T2-empirical-invocation.md   # so Log de execucao
docs/tasks/poc-bootstrap/00-overview.md               # so atualizar status final do POC
```

**T2 nao modifica codigo do plugin.** Se T2 descobrir que algo em `plugins/poc-bootstrap/SKILL.md` ou `scaffold.sh` precisa mudar pra funcionar, **parar e reportar** — isso e um incidente bloqueante, nao um bug menor.

---

## Arquivos PROIBIDOS

```
plugins/poc-bootstrap/**                              # T2 nao editava codigo do plugin
tests/**
~/.claude/**
/home/rnobre/Área de trabalho/Meteora/o-agente/**
```

---

## Ordem de execucao

### Fase 0 — Pre-verificacao

- [ ] `claude --version` — confirmar versao instalada. Se < Oct/2025, parar — sistema de plugins nao existe na versao.
- [ ] Confirmar T1 verde (`bash tests/scaffold_test.sh` exit 0 rodando do repo root).
- [ ] Confirmar estrutura: `plugins/poc-bootstrap/.claude-plugin/plugin.json` existe.

### Fase 1 — Setup do target dir

- [ ] `TARGET=$(mktemp -d -t claude-craft-poc-XXXXXX)` — criar dir empty pra ser o cwd da sessao de teste.
- [ ] `ls -la "$TARGET"` — confirmar vazio.
- [ ] **Registrar `$TARGET` no log** (caminho absoluto).

### Fase 2 — Validacao via `/plugin validate` (pre-flight, opcional se suportado)

- [ ] Tentar rodar `claude --plugin-dir "$(pwd)/plugins/poc-bootstrap" -p "/plugin validate ."` ou equivalente documentado. Se o comando existir, validar `plugin.json` e `SKILL.md` antes da invocacao real. Se nao existir/falhar, nao bloquear — seguir pra Fase 3.

### Fase 3 — Invocacao empirica

Esta e a fase critica. Duas estrategias possiveis, na ordem de preferencia:

**Estrategia A (preferida) — sessao nao-interativa:**
- [ ] Abrir terminal novo dedicado.
- [ ] `cd "$TARGET"` (importante: cwd do cliente Claude Code define o que `$(pwd)` sera dentro do `!command` preamble).
- [ ] `claude --plugin-dir /home/rnobre/dev/claude-craft/plugins/poc-bootstrap -p "Invoke the scaffold skill from poc-bootstrap now. After it runs, list files in the current directory and report verbatim."`
- [ ] Capturar output verbatim.
- [ ] `ls -la "$TARGET"` — esperar `SENTINEL.md` presente.

**Estrategia B (fallback) — sessao interativa manual:**
- [ ] Se `-p` nao funcionar (ex: skill `disable-model-invocation: true` exige slash-command explicito), abrir `claude --plugin-dir ...` interativamente em `$TARGET`.
- [ ] Invocar manualmente via slash command: `/poc-bootstrap:scaffold`.
- [ ] Capturar transcript da sessao (comandos + output + qualquer erro).
- [ ] Verificar filesystem do lado de fora.

### Fase 4 — Verificacao de criterios de sucesso

- [ ] **Existencia:** `test -f "$TARGET/SENTINEL.md"` exit 0.
- [ ] **Conteudo:** `grep -q POC_SENTINEL_FILE "$TARGET/SENTINEL.md"` exit 0.
- [ ] **Nenhuma pegada fora do cwd:** `find "$TARGET" -type f | sort` retorna exatamente a lista esperada (`SENTINEL.md` + nada mais espurio).
- [ ] **Nenhuma pegada residual no home:** checar que nada novo foi criado em `~/.claude/plugins/cache/` alem do esperado (plugin Vercel ja instalado continua intocado).

### Fase 5 — Idempotencia

- [ ] Invocar a skill de novo no mesmo `$TARGET` (segunda vez, sem limpar).
- [ ] Capturar output.
- [ ] `stat "$TARGET/SENTINEL.md"` — mtime **nao deve ter mudado** versus stat anterior (prova que `cp -n` funcionou).

### Fase 6 — Cleanup + log

- [ ] `rm -rf "$TARGET"` (operacao destrutiva, mas e sobre tmpdir gerado por `mktemp` — ok).
- [ ] Registrar **tudo verbatim** no Log de execucao: comando exato, output bruto, caminhos, exit codes, decisoes tomadas no meio.
- [ ] Atualizar `00-overview.md`:
  - Se sucesso: `**Status:** CONCLUIDO em YYYY-MM-DD — RESULTADO: valida hipotese`. Criar as 4 tasks restantes da secao 11 da pesquisa (como pastas novas em `docs/tasks/`) e listar prioridades.
  - Se falha: `**Status:** CONCLUIDO em YYYY-MM-DD — RESULTADO: derruba hipotese`. **Nao criar as outras tasks**. Escrever observacoes bloqueantes e parar.
- [ ] Reportar ao Piloto com resumo curto (<200 palavras) + link pro Log de execucao.

---

## Criterios de aceite

- [ ] Sessao Claude Code de teste carrega `plugins/poc-bootstrap/` sem erro.
- [ ] Invocacao da skill `scaffold` executa o preamble `!command` (verificavel pelo output do script aparecer na transcript ou pelo arquivo aparecer no filesystem).
- [ ] `SENTINEL.md` existe em `$TARGET` apos primeira invocacao.
- [ ] `SENTINEL.md` inalterado apos segunda invocacao (mtime identico).
- [ ] Log verbatim de comandos + outputs salvo em Log de execucao.
- [ ] Nenhum criterio de falha do POC disparado.

---

## Bloqueios — parar e avisar imediatamente

Qualquer dos criterios de falha listados em `00-overview.md > Criterios de falha`:
- `${CLAUDE_SKILL_DIR}` nao substituido → bloqueante.
- `!command` nao pre-processado → bloqueante.
- Arquivos copiados no lugar errado → bloqueante.
- Idempotencia quebra → bloqueante.
- Precisar alterar `~/.claude/` global → limite duro, bloqueante.

Adicional:
- `claude --plugin-dir` nao existir na versao instalada → pesquisa derivada imediata pra descobrir o modo canonico de carregar plugin local em 2026.
- Plugin carrega mas skill nao aparece em listagem → investigar se `disable-model-invocation: true` mudou comportamento de discovery.
- Skill aparece mas nao executa o `!command` → **este e o achado critico** que derruba a hipotese. Documentar em detalhe e parar.

---

## Log de execucao

- **Desvio de convencao (ex-ante):** `PROGRESS.md` omitido desta pasta de tasks. Justificativa: YAGNI pra POC de 2h com 2 tasks — o Log de execucao interno dos T-files cobre o mesmo papel que PROGRESS.md teria. Registro explicito aqui pra qualquer futuro leitor nao "corrigir" a falta criando burocracia onde nao precisa.
- **Fase 0:** _a preencher_
- **Fase 1:** _a preencher_
- **Fase 2:** _a preencher_
- **Fase 3:** _a preencher_
- **Fase 4:** _a preencher_
- **Fase 5:** _a preencher_
- **Fase 6:** _a preencher_

### Incidentes / desvios

_a preencher. Este bloco e **particularmente critico** em T2 — qualquer achado empirico precisa ficar aqui verbatim pra alimentar a revisao da secao 10 da pesquisa._

### Output verbatim das sessoes Claude Code de teste

```
# Fase 3 — primeira invocacao
$ cd <TARGET>
$ claude --plugin-dir ...
[colar output aqui]

# Fase 5 — segunda invocacao (idempotencia)
$ claude --plugin-dir ...
[colar output aqui]
```

---

## Estado ao pausar

_a preencher se necessario._

---

## Notas para a sessao de revisao

- **O valor do POC esta exatamente aqui.** T1 nao prova nada sobre o mecanismo Claude Code; T2 sim. Um resultado negativo em T2 e tao valioso quanto positivo — ambos produzem decisao informada.
- **Nao improvisar workarounds.** Se o padrao nao funcionar como descrito, a resposta correta e parar e registrar, nao tentar 5 variacoes ate algo colar. A pesquisa precisa ser revisada estruturalmente nesse cenario.
