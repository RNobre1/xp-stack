# Task: Plugin skeleton + scaffold.sh com testes unitarios

> **Sessao:** Terminal 1 de 1
> **Branch:** `feat/poc-bootstrap` (branch dedicada criada antes dos Writes; merge strategy pos-POC decidida na hora)
> **Status:** `[ ] Planejando` `[ ] Em execucao` `[ ] Testes passando` `[ ] Pronto para revisao`

---

## Objetivo

Criar a estrutura minima do plugin `poc-bootstrap` com a skill `scaffold`, o script `scripts/scaffold.sh`, um arquivo sentinela em `templates/`, e uma suite de testes puro bash que valida o comportamento do scaffold.sh **isoladamente** — sem nenhuma dependencia de Claude Code em runtime. Ao fim desta task, o scaffold.sh deve estar provado como correto em nivel shell; T2 sera quem prova a integracao com o Claude Code.

---

## Contexto necessario

- **Feature maior:** [00-overview.md](00-overview.md) — criterios de sucesso/falha do POC completo.
- **O que as outras sessoes estao fazendo:** Nada. POC solo, sem paralelismo.
- **Decisoes ja tomadas (secao "Decisoes ja tomadas" do overview):** estrutura em `plugins/poc-bootstrap/`, nome `scaffold`, testes puro bash, scaffold.sh deriva seu proprio dir via `BASH_SOURCE` (nao usa `${CLAUDE_SKILL_DIR}` internamente).
- **Secoes relevantes do CLAUDE.md global:** Regra 2 (TDD absoluto — test primeiro), Regra 3 (sem execucao silenciosa — qualquer coisa fora do escopo para e avisa), Regra 6 (conventional commits).
- **Referencia da pesquisa:** `docs/pesquisas/replicar-stack-claude-code.md` no repo O Agente, secao 6.2 — hipotese do padrao `!command` + `${CLAUDE_SKILL_DIR}`. **T1 nao valida essa hipotese**; valida apenas o shell standalone. A validacao end-to-end e T2.

---

## Arquivos que PODE tocar

```
plugins/poc-bootstrap/.claude-plugin/plugin.json
plugins/poc-bootstrap/skills/scaffold/SKILL.md
plugins/poc-bootstrap/skills/scaffold/scripts/scaffold.sh
plugins/poc-bootstrap/skills/scaffold/templates/SENTINEL.md
tests/scaffold_test.sh
.gitignore
docs/tasks/poc-bootstrap/T1-scaffold-skeleton.md          # so Log de execucao e Estado ao pausar
docs/tasks/poc-bootstrap/00-overview.md                   # so atualizar status da T1 ao final
```

---

## Arquivos PROIBIDOS

```
README.md                              # YAGNI ate o POC validar
LICENSE                                 # idem
.github/**                              # sem CI ainda
package.json                            # sem node
qualquer coisa dentro de ~/.claude/     # limite duro desta sessao
qualquer coisa dentro de /home/rnobre/Área de trabalho/Meteora/o-agente/  # repo origem read-only
plugins/poc-bootstrap/skills/scaffold/scripts/*.sh exceto scaffold.sh
plugins/xp-stack/**                     # nao existe ainda, nao criar por antecipacao
docs/tasks/poc-bootstrap/T2-*.md        # T2 se auto-edita
docs/tasks/poc-bootstrap/PROGRESS.md    # nao criado por YAGNI; POC de 2h nao precisa
```

> Se for necessario mexer em algo fora disso, **parar e avisar** (ver Bloqueios).

---

## Ordem de execucao (TDD obrigatorio)

### Fase 1 — Testes primeiro (RED)

- [ ] Criar `plugins/poc-bootstrap/skills/scaffold/templates/SENTINEL.md` com conteudo minimo (~3 linhas) incluindo a string unica `POC_SENTINEL_FILE` pra grep-ability.
- [ ] Criar `tests/scaffold_test.sh` com 5 cenarios (ver "Cenarios de teste obrigatorios" abaixo). Cada cenario e uma funcao bash que retorna 0 (ok) ou nao-zero (falha); o test runner imprime PASS/FAIL por cenario e exit com contagem de falhas. Tmpdirs via `mktemp -d` com tracking global e cleanup em trap EXIT.
- [ ] Rodar `bash tests/scaffold_test.sh` — testes **falham** porque `scaffold.sh` ainda nao existe. Confirmar que a falha e pelo motivo certo (script ausente; exit 127 ao invocar bash num arquivo inexistente), nao por erro de sintaxe do proprio test runner.
- [ ] `git add tests/scaffold_test.sh plugins/poc-bootstrap/skills/scaffold/templates/SENTINEL.md`
- [ ] `git commit -m "test: cenarios de scaffold.sh (red)"`

### Fase 2 — Implementacao (GREEN)

- [ ] Criar `plugins/poc-bootstrap/skills/scaffold/scripts/scaffold.sh`:
  - Shebang `#!/usr/bin/env bash`, `set -euo pipefail`.
  - Arg 1 obrigatorio = target dir absoluto. Se ausente, exit 64 com mensagem `Usage: scaffold.sh <target-dir>` em stderr.
  - `SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`.
  - `TEMPLATES_DIR="$SCRIPT_DIR/../templates"`; se nao existir, exit 65 com mensagem clara em stderr.
  - `mkdir -p "$1"` — deve funcionar tambem quando `$1` contem espacos ou sub-dirs intermediarios inexistentes (cenario 5).
  - `cp -rn "$TEMPLATES_DIR/." "$1/"` — `-n` no-clobber (preserva existente), `-r` recursivo (suporta sub-dirs futuros). **Nao usar `cp -a`**: flag `-a` em alguns coreutils ignora `-n`; validar com teste.
  - **Quoting obrigatorio**: todas as variaveis que podem conter espacos (`$1`, `$TEMPLATES_DIR`, `$SCRIPT_DIR`) DEVEM estar entre aspas duplas em todo uso. Cenario 5 e a rede de seguranca pra isso.
  - Echo final `POC scaffold: copied <N> file(s) to <target>` pra stdout. Contagem de arquivos via `find "$TEMPLATES_DIR" -type f | wc -l`.
- [ ] `chmod +x plugins/poc-bootstrap/skills/scaffold/scripts/scaffold.sh`.
- [ ] Criar `plugins/poc-bootstrap/.claude-plugin/plugin.json` minimo com campos documentados pela docs oficial: `name`, `version` (`0.1.0`), `description`, `author` (stub com nome do Piloto). Se a docs exigir outros campos obrigatorios descobertos durante a task, registrar como incidente + sub-task; nao inventar campos.
- [ ] Criar `plugins/poc-bootstrap/skills/scaffold/SKILL.md` com frontmatter YAML minimo (`name`, `description`, `disable-model-invocation: true`, `allowed-tools: [Bash(cp *), Bash(mkdir *)]`) + o preamble `!command` que T2 vai validar:
  ```
  !`bash ${CLAUDE_SKILL_DIR}/scripts/scaffold.sh "$(pwd)"`
  ```
  **T1 nao testa esse arquivo em runtime** — T1 so garante que ele existe e e sintaticamente coerente (frontmatter parseavel, preamble presente).
- [ ] Criar `.gitignore` minimo: ignorar `/tmp-test/`, `*.swp`, `.DS_Store`, outros dirs temporarios que os testes possam deixar se trap falhar.
- [ ] Rodar `bash tests/scaffold_test.sh` — 5/5 cenarios passam (verde).
- [ ] `git add plugins/poc-bootstrap/ .gitignore`
- [ ] `git commit -m "feat: scaffold.sh + plugin skeleton poc-bootstrap"`

### Fase 3 — Refatoracao (REFACTOR)

- [ ] Rodar `shellcheck plugins/poc-bootstrap/skills/scaffold/scripts/scaffold.sh tests/scaffold_test.sh` **se estiver instalado** — o proprio test runner ja imprime a linha de status do shellcheck no topo do output; se for `shellcheck not installed, skipping static analysis`, registrar assim mesmo no Log de execucao (pulo explicito, nao esquecimento). Se instalado, corrigir warnings relevantes (nao silenciar com `# shellcheck disable` a menos que justificado).
- [ ] Remover duplicacao se houver. Extrair helper de teste (ex: `assert_exit_code`, `assert_file_exists`) se `tests/scaffold_test.sh` passar de 200 linhas.
- [ ] `git commit -m "refactor: <o que mudou>"` — **so se houver mudanca real**, nao forcar commit vazio.

### Fase 4 — Verificacao final

- [ ] `bash tests/scaffold_test.sh` — 5/5 PASS, exit 0. Output copiado verbatim pro Log de execucao (inclui a linha de status do shellcheck, pra registrar explicitamente se rodou ou foi pulado).
- [ ] Checagem manual: `bash plugins/poc-bootstrap/skills/scaffold/scripts/scaffold.sh /tmp/poc-manual-$$` — confirmar que `/tmp/poc-manual-$$/SENTINEL.md` existe com o conteudo esperado. Depois `ls -la /tmp/poc-manual-$$ && rm -rf /tmp/poc-manual-$$` (operacao mutante em `/tmp`, listar no log antes de executar — aceito porque `/tmp` e escopo do usuario e `$$` garante unicidade).
- [ ] `grep -n CLAUDE_SKILL_DIR plugins/poc-bootstrap/skills/scaffold/scripts/scaffold.sh` — deve retornar **0 matches** (scaffold.sh nao referencia `CLAUDE_SKILL_DIR` internamente, e a proposta).
- [ ] `grep -n CLAUDE_SKILL_DIR plugins/poc-bootstrap/skills/scaffold/SKILL.md` — deve retornar **>=1 match** (SKILL.md usa a variavel no preamble, e o que T2 vai validar).
- [ ] `git status --short && git diff --stat HEAD~2..HEAD` — nenhum arquivo fora da lista "Arquivos que PODE tocar".
- [ ] Atualizar o status desta task no `00-overview.md` de `[ ] Pendente` pra `[ ] Pronto para revisao` (manter `Pendente` ate T2 validar o POC completo — concluida so quando todo o POC valida).
- [ ] Preencher Log de execucao (abaixo) com hashes de commit + output bruto dos testes + qualquer incidente.
- [ ] **Parar e reportar ao Piloto.** Nao iniciar T2 sem OK explicito.

---

## Criterios de aceite

- [ ] 5 testes em `tests/scaffold_test.sh` passam (verde).
- [ ] Primeira execucao de scaffold.sh num dir vazio coloca `SENTINEL.md` la, exit 0.
- [ ] Segunda execucao no mesmo dir nao altera nada (cp -n), exit 0.
- [ ] Execucao sem arg falha com exit 64 e mensagem clara em stderr contendo "Usage".
- [ ] scaffold.sh funciona corretamente com target contendo espacos no nome (cenario 5 verde — cobre quoting + mkdir -p de sub-dir novo).
- [ ] scaffold.sh nao referencia `CLAUDE_SKILL_DIR` (grep = 0 matches).
- [ ] SKILL.md referencia `CLAUDE_SKILL_DIR` no preamble `!command` (grep >= 1 match).
- [ ] `git log --oneline` mostra 2 a 3 commits (red, green, opcional refactor) em `feat/poc-bootstrap`.
- [ ] `git status --short` e 100% vazio ao fim.

---

## Cenarios de teste obrigatorios

```
scaffold.sh
  1. happy_path_copies_sentinel
     - target dir criado via mktemp -d
     - rodar scaffold.sh <target>
     - assertar: target/SENTINEL.md existe
     - assertar: conteudo de target/SENTINEL.md contem "POC_SENTINEL_FILE"
     - assertar: exit code 0

  2. idempotent_no_clobber
     - target dir via mktemp -d
     - rodar scaffold.sh 1a vez
     - capturar mtime de target/SENTINEL.md
     - sleep 1 (garante granularidade mtime no ext4)
     - rodar scaffold.sh 2a vez
     - assertar: mtime nao mudou
     - assertar: exit code 0 nas duas

  3. preserves_existing_file
     - target dir via mktemp -d
     - criar target/SENTINEL.md com conteudo "USER_MODIFIED_CONTENT_XYZ" ANTES de rodar scaffold.sh
     - rodar scaffold.sh
     - assertar: target/SENTINEL.md ainda contem "USER_MODIFIED_CONTENT_XYZ" (cp -n preservou)
     - assertar: target/SENTINEL.md NAO contem "POC_SENTINEL_FILE"
     - assertar: exit code 0 (cp -n com arquivo existente nao e erro)

  4. missing_arg_fails
     - rodar scaffold.sh sem argumento
     - assertar: exit code != 0 (esperado 64 apos GREEN; RED pode retornar 127 por script ausente)
     - assertar: stderr contem "Usage" (so vai passar na GREEN, quando scaffold.sh implementar a checagem)

  5. path_with_spaces
     - parent dir via mktemp -d
     - target = "$parent/dir with spaces/target" (sub-dir novo com espacos no nome)
     - rodar scaffold.sh "<target>"
     - assertar: target/SENTINEL.md existe
     - assertar: conteudo contem "POC_SENTINEL_FILE"
     - assertar: exit code 0
     - Motivo empirico: o cwd tipico do projeto real do Piloto (/home/rnobre/Área de trabalho/Meteora/o-agente) tem espaco. Qualquer scaffold.sh que esqueca aspas em $1, $TEMPLATES_DIR ou $SCRIPT_DIR quebra silenciosamente aqui. Bonus: cobre mkdir -p de sub-dir novo dentro do target (valida auto-criacao de estrutura que nao existe).
```

---

## Bloqueios — parar e avisar o usuario se encontrar

- Precisar tocar qualquer arquivo fora de "Arquivos que PODE tocar".
- `shellcheck` (se instalado) reclamar de algo que exige mudanca estrutural em scaffold.sh.
- Descobrir que o schema minimo do `plugin.json` exigido pela docs oficial inclui campo obrigatorio nao-mencionado na hipotese (ex: `compatibility`, `runtime`, `engines`). Parar, registrar incidente, pedir orientacao.
- `cp -rn` ter comportamento inesperado no Fedora 43 coreutils (ex: ignorar `-n` em presenca de `-r`). Nesse caso, investigar alternativas (`cp` + `test -f`) antes de seguir.
- Qualquer sinal de que o padrao proposto na pesquisa e estruturalmente incorreto ja em T1 (antes mesmo de chegar em T2).
- Tentacao de adicionar README/LICENSE/CI/package.json "pra deixar bonito". Parar — YAGNI e explicito na secao "Arquivos PROIBIDOS".

---

## Log de execucao

> Preenchido durante a execucao pela sessao que roda a task. Deixe rastro do raciocinio, nao so dos commits.

- **Desvio de convencao (ex-ante):** `PROGRESS.md` omitido desta pasta de tasks. Justificativa: YAGNI pra POC de 2h com 2 tasks — o Log de execucao interno dos T-files cobre o mesmo papel que PROGRESS.md teria. Registro explicito aqui pra qualquer futuro leitor nao "corrigir" a falta criando burocracia onde nao precisa. Se o POC expandir alem de 2 tasks, a decisao pode ser revisitada.
- **Fase 1 (red):** _a preencher_
- **Fase 2 (green):** _a preencher_
- **Fase 3 (refactor):** _a preencher_
- **Fase 4 (verificacao):** _a preencher_

### Incidentes / desvios

_a preencher — qualquer coisa nao-obvia. Exemplos plausiveis: shellcheck instalado e encontrou issue; `cp -rn` do Fedora 43 com comportamento divergente do esperado; docs oficial pediu campo nao mencionado na pesquisa; etc._

---

## Estado ao pausar

> Preencher so se a sessao precisar parar no meio.

- **Feito:** _a preencher_
- **Em andamento:** _a preencher_
- **Proximo passo exato:** _a preencher (arquivo a abrir ou comando a rodar)_
- **Testes:** _a preencher (X/5 passando)_

---

## Notas para a sessao de revisao

- **Trade-off chave:** scaffold.sh NAO usa `${CLAUDE_SKILL_DIR}` internamente (deriva do proprio `BASH_SOURCE`). Isso e proposital pra T1 rodar 100% standalone, mas cria uma dependencia pra T2 provar que `${CLAUDE_SKILL_DIR}` e de fato expandido no `!command` preamble de SKILL.md. A alternativa — scaffold.sh usar `${CLAUDE_SKILL_DIR}` diretamente — faria T1 impossivel de testar sem Claude Code, colapsando a separacao de preocupacoes.
- **Pendente pra T2:** validar a integracao end-to-end via `claude --plugin-dir ./plugins/poc-bootstrap`, invocar a skill, confirmar que o arquivo aparece no cwd correto.
- **Risco conhecido:** se em T2 descobrirmos que `${CLAUDE_SKILL_DIR}` nao resolve no contexto `--plugin-dir` local (so resolve em plugin instalado via marketplace), T1 nao ajuda diretamente — precisaremos investigar modos alternativos (instalar via marketplace local, variavel diferente, scope diferente). Esse risco e exatamente a razao do POC existir.
