# POC bootstrap empirico — Overview

**Data:** 2026-04-15
**Status:** CONCLUIDO em 2026-04-15 — RESULTADO: valida hipotese
**Objetivo:** Validar empiricamente que uma skill Claude Code pode executar `bash ${CLAUDE_SKILL_DIR}/scripts/scaffold.sh "$(pwd)"` via shell injection `!command` e copiar arquivos do diretorio da skill pro cwd do receptor. O resultado deste POC decide se a secao 10 de `docs/pesquisas/replicar-stack-claude-code.md` (no repo O Agente) se mantem ou precisa ser reestruturada.

---

## Diagnostico

A pesquisa `replicar-stack-claude-code.md` (secoes 6.2, 9 e 11) propos distribuir o stack Claude Code via plugin + marketplace git. O bootstrap de projetos novos usa uma skill com `!command` pre-processado que executa um script shell embarcado no plugin, copiando templates pro cwd via `${CLAUDE_SKILL_DIR}`. Esse padrao e **descrito apenas pela docs oficial [ref 5 da pesquisa]**, sem prior art publico. O unico plugin real observado (Vercel) usa `commands/` flat (legacy) pra deployment, nao `skills/*/SKILL.md` com shell injection pra scaffold — nao valida o padrao proposto.

**Hipotese grade B que precisa virar grade A antes de investir nas outras tasks** (`extract-portable-skills`, `write-bootstrap-skill`, `poc-mcp-userconfig`, `poc-meteora-stack-marketplace`):

| Afirmacao | Hoje | Meta |
|---|---|---|
| `!bash ${CLAUDE_SKILL_DIR}/scripts/scaffold.sh "$(pwd)"` e pre-processado corretamente pelo Claude Code antes do conteudo chegar ao modelo | hipotese (docs unica) | validado empiricamente |
| `${CLAUDE_SKILL_DIR}` resolve pro diretorio da skill dentro de plugin carregado via `claude --plugin-dir` | hipotese | validado |
| scaffold.sh executado via `!command` copia arquivos pro cwd do projeto receptor sem tocar em outras areas | hipotese | validado |
| `cp -n` preserva arquivos existentes (idempotencia) em execucao repetida | hipotese | validado |

---

## Tasks (ordem de execucao)

| Task | Nome | Dependencia | Estimativa | Status |
|------|------|------------|------------|--------|
| [T1](T1-scaffold-skeleton.md) | Plugin skeleton + scaffold.sh com testes unitarios puro-bash | Nenhuma | P (~1h) | [x] Concluida 2026-04-15 (e088058, ef1a316) |
| [T2](T2-empirical-invocation.md) | Invocacao real via `claude --plugin-dir` e verificacao filesystem | T1 | M (~1h) | [x] Concluida 2026-04-15 |

Total estimado: **~2h**, consistente com a estimativa original da secao 11 da pesquisa. Sem paralelismo — POC tem uma unica linha de validacao.

---

## Sub-tasks identificadas

Nenhuma por enquanto. Se T1 ou T2 revelar arestas (ex: `${CLAUDE_SKILL_DIR}` nao resolver em `--plugin-dir` local mas so em plugin instalado via marketplace, limite de tamanho de SKILL.md, shellcheck ruidoso, campo obrigatorio nao-mencionado na hipotese no `plugin.json`), registrar aqui antes de fecha-las ad-hoc — virar follow-up em vez de feature creep.

---

## Criterios de sucesso do POC

- [x] **T1 passa:** `bash tests/scaffold_test.sh` exit 0, 5/5 cenarios verdes. Commits: `e088058` (red), `ef1a316` (green).
- [x] **T2 passa:** Plugin carregado via `--plugin-dir`, skill auto-descoberta ("Loaded 1 skills from plugin poc-bootstrap default directory"), `!command` preamble executado, `SENTINEL.md` copiado pro cwd alvo com conteudo correto (`POC_SENTINEL_FILE` presente). Segunda invocacao: idempotency PASS (mtime inalterado: 1776303243). Nota: requer `--dangerously-skip-permissions` em `-p` mode; em modo interativo (uso real), usuario aprova Bash normalmente.
- [x] Tudo documentado nos logs de execucao de T1 e T2 com comandos verbatim, output bruto, debug log e analise de 4 incidentes de teste.

## Criterios de falha (bloqueante — parar e revisar a pesquisa)

- `${CLAUDE_SKILL_DIR}` nao e substituido pelo Claude Code no `!command` preamble.
- `!command` nao pre-processa shell injection em plugin carregado via `--plugin-dir`.
- Arquivos copiados pelo scaffold.sh nao caem no cwd do receptor (caem em outro lugar ou sao silenciosamente ignorados).
- Idempotencia quebra (2a execucao sobrescreve ou falha).
- Qualquer caminho observado requer alterar `~/.claude/` global ou arquivos do repo O Agente, violando limites duros desta sessao.

Em caso de falha, **parar imediatamente**, reportar observacao verbatim (comando executado + output bruto) e voltar pra pesquisa antes de iniciar qualquer outra task da secao 11. A decisao central da secao 10 precisa ser revisada estruturalmente.

---

## Como executar

Sequencial. T2 depende de T1 passar 100%.

**Iniciar T1** (prompt self-contained):
```
Leia docs/tasks/poc-bootstrap/T1-scaffold-skeleton.md e execute a task seguindo TDD estrito.
Sem tocar em arquivos fora do escopo. Pare e reporte ao terminar — T2 so comeca apos review.
```

**Iniciar T2** (apos T1 estar verde e revisado):
```
Leia docs/tasks/poc-bootstrap/T2-empirical-invocation.md e execute a validacao empirica.
Capturar output verbatim da sessao Claude Code de teste. Se qualquer criterio de falha
acontecer, parar e reportar imediatamente sem improvisar workaround.
```

---

## Regras gerais

- **TDD absoluto** — tests primeiro em T1, mesmo pra POC. Regra 2 do CLAUDE.md global nao abre excecao pra POC.
- **Branch:** `feat/poc-bootstrap` (criada antes dos Writes da Fase 1 de T1). Disciplina cultivada > ritual dispensado — mesmo solo em repo privado, branch dedicada permite descartar barato se o POC derrubar a hipotese. Primeiro push so depois de T1 verde + review do usuario. Pos-POC: decide merge strategy (PR virtual ou fast-forward direto) na hora.
- **Conventional commits** — `test:`, `feat:`, `chore:`, `docs:`, `refactor:` conforme o caso.
- **Zero arquivo fora do escopo declarado em cada T-file.** Listas explicitas de arquivos permitidos e proibidos em T1 e T2.
- **Sem README/LICENSE/CI ainda** — YAGNI. O POC nao precisa disso pra validar o padrao. Esses artefatos entram quando o stack real (`xp-stack`) comecar, pos-POC.
- **Zero dependencia externa nao-trivial** — testes puro bash, sem bats, sem npm, sem nada pra instalar. `shellcheck` so se ja estiver instalado (nice-to-have, nao bloqueador).

---

## Decisoes ja tomadas (pra nao redecidir em T1/T2)

- **Estrutura do plugin:** `plugins/poc-bootstrap/.claude-plugin/plugin.json`. Alinha com o futuro `plugins/xp-stack/` proposto na secao 10 da pesquisa, mesmo sem marketplace ainda. `claude --plugin-dir ./plugins/poc-bootstrap` e o modo de carregar pra teste, sem precisar de `marketplace.json`.
- **Nome do plugin:** `poc-bootstrap`. Deixa claro que e throwaway pra validar hipotese, nao o `xp-stack` final. Quando o POC terminar e o stack real comecar, este plugin pode ser excluido ou mantido como regression test.
- **Nome da skill:** `scaffold`. Invocacao namespaced: `/poc-bootstrap:scaffold`. Nao colide com futuro `/xp-stack:bootstrap`.
- **Testes unitarios:** puro bash em `tests/scaffold_test.sh`, sem bats/shellcheck obrigatorios. 5 cenarios cobrindo happy path, idempotencia, preservacao, missing arg e path com espacos.
- **Arquivo sentinela:** `plugins/poc-bootstrap/skills/scaffold/templates/SENTINEL.md` — conteudo minimo com string unica `POC_SENTINEL_FILE` pra grep-ability. Nao e template real, so marcador pra validar que a copia aconteceu.
- **Separacao de preocupacoes:** scaffold.sh e standalone-testavel (deriva seu proprio dir via `$(dirname "${BASH_SOURCE[0]}")`, nao usa `${CLAUDE_SKILL_DIR}` internamente). O `${CLAUDE_SKILL_DIR}` aparece **apenas** no preamble `!command` de `SKILL.md`, que e onde a substituicao do Claude Code efetivamente acontece. T1 valida scaffold.sh isoladamente; T2 valida a substituicao + invocacao end-to-end. Essa separacao permite que T1 seja 100% standalone (pure bash), deixando toda a incerteza empirica concentrada em T2.

---

## Ao finalizar o POC

Independente do resultado (sucesso ou falha):

1. Atualizar este `00-overview.md` com cabecalho `**Status:** CONCLUIDO em YYYY-MM-DD — RESULTADO: {valida|derruba} hipotese`.
2. Se sucesso: abrir as 4 tasks restantes da secao 11 da pesquisa como novas pastas em `docs/tasks/`. Primeira prioridade: `poc-meteora-stack-marketplace` + `extract-portable-skills`.
3. Se falha: **nao criar as outras tasks**. Voltar pro repo O Agente (read-only desta sessao) e registrar o findings como follow-up pra revisao estrutural da secao 10 da pesquisa. Provavelmente vai requerer nova L2 derivada.
4. **Nao apagar** esta pasta nunca. Politica de arquivamento do template do O Agente: decisao+contexto+incidentes ficam in-place como memoria viva. Mesmo um POC que derruba hipotese e valioso — documenta **por que** uma direcao foi rejeitada.
