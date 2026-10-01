# P1 — Durable Host Runs

**Branch:** `feat/harness-durable-runs`
**Base:** `main` at `6acf9e58ccf25517d341dd22b956ce8600749466`
**Worktree:** `/Users/rnobre/.traycer/worktrees/rnobre1__xp-stack/feat-harness-durable-runs`
**Status:** Implementação concluída; revisão do coordenador e integração real pendentes
**Autorização:** incremento fechado autorizado pelo Pilot; sem instalação global ou na VPS.
**Contrato de evidências:** `akita-xp-rules / Delivery evidence contract`, revisão `2026-09-15.1`; fonte resolvida: `/Users/rnobre/.local/share/traycer-guidance/delivery-contract.md`.

## Objetivo e comportamento observável

Adicionar uma skill manual, opcional e pequena para submeter, consultar, acompanhar e cancelar comandos na VPS Linux por unidades transitórias `systemd-run --user`. O processo permanece sob o supervisor após o cliente terminar. Cada submissão recebe uma chave estável explícita, identidade explícita do candidato, cwd e argv sem interpretação por shell; a mesma chave e payload nunca iniciam uma segunda unidade, enquanto payload diferente para a mesma chave é recusado.

Cada registro privado preserva o payload de submissão sem mutação; log, eventos e recibo final ficam ao lado dele. O recibo registra o código de saída. Estado sem prova conclusiva do supervisor aparece como `unknown` e nunca autoriza repetir uma execução existente. Cancelamento deriva a unidade exclusivamente do registro daquela chave e só informa término confirmado depois de consultar o systemd.

## Desenho aprovado pelo briefing

- Um script Python 3 da biblioteca padrão vive em `plugins/xp-stack/skills/durable-host-runs/scripts/`; não instala dependências nem cria daemon.
- A interface é `submit --key KEY --candidate ID --cwd DIR -- ARGV...`, `status --key KEY`, `follow --key KEY` e `cancel --key KEY`. `ARGV` é sempre executado diretamente, sem shell.
- O estado padrão fica em `$XDG_STATE_HOME/xp-stack/durable-host-runs` ou `~/.local/state/xp-stack/durable-host-runs`; diretórios privados `0700`, arquivos privados `0600` (registro/recibo selados como somente leitura após escrita). Não há limpeza automática de registros, logs ou worktrees.
- Um lock `flock` protege somente a criação/deduplicação de registros. O script não reserva, conta, limita ou roteia vagas. O comando indicado pelo chamador pode ser `~/.traycer/locks/vaga-teste.sh ...` ou `~/.traycer/locks/vaga-tsc.sh` com seu contrato atual preservado.
- A chave determina um identificador seguro do registro e da unidade; o hash do payload considera cwd canônico, candidato e cada argumento de argv. A gravação exclusiva do registro ocorre antes da chamada ao supervisor, de forma que erro ou estado desconhecido não habilita reenvio.
- A camada de supervisor recebe uma interface injetável; os testes usam `FakeSystemctl`, sem chamar `systemctl` real. A implementação real submete com `systemd-run --user --no-block`, consulta com `systemctl --user show` e cancela somente a unidade persistida.
- O worker registra eventos estruturados, captura stdout/stderr em arquivo e grava recibo final atomicamente. O sinal de cancelamento tenta encerrar o grupo do comando; se o supervisor não confirmar o estado final, a resposta permanece inconclusiva.
- Como `--collect` pode descarregar uma unidade depois do stop, o retorno bem-sucedido do `systemctl stop` síncrono também confirma término quando a consulta posterior já não encontra a unidade. Se o systemd já descartou o código final, o recibo de cancelamento explicita `exit_code: null`.

## Fora de escopo

Não adicionar algoritmo de vagas, capacidade paralela, daemon residente, lógica nova aos scripts `vaga-teste.sh`/`vaga-tsc.sh`, roteamento de modelos, P4/P5/P6, acesso à produção, execução real na VPS, cargas/pools, instalação do skill em diretórios globais ou publicação externa. O teste de aceitação Linux real e kill do cliente serão feitos pelo coordenador na VPS.

## Critérios de aceite

1. Frontmatter da skill contém `disable-model-invocation: true` e a documentação ensina instalação pessoal versionada e rollback, sem executar instalação nesta tarefa.
2. Submissões simultâneas idênticas para uma chave iniciam exatamente uma unidade; submissão posterior idêntica retorna o job existente.
3. A mesma chave com cwd, candidato ou argv diferente é recusada sem iniciar outra unidade.
4. Cwd/candidato/argv mantêm sua identidade no registro; argv não é concatenado nem passado por shell.
5. Código de saída não zero do comando aparece no recibo final e no status.
6. Registro existente sem prova terminal do supervisor permanece `unknown`, sem reinício automático.
7. Cancelamento usa apenas a unidade derivada do registro consultado e só relata sucesso após estado terminal ou stop síncrono confirmado pelo supervisor, mesmo se a unidade já tiver sido coletada.
8. Se o sinal de cancelamento chegar depois de o comando terminar naturalmente, o recibo preserva o código de saída real.
9. Diretórios, lock, registro, eventos, log e recibo são privados; não há limpeza automática.
10. Testes unitários usam a interface fake de systemctl; nenhum teste da worktree executa systemd nem carga pesada.
11. Commit único de autoria Rafael, sem trailer de coautoria; instruções de instalação/rollback e limite da validação real ficam registradas.

## Plano curto

1. **RED:** ampliar a validação estrutural do plugin e escrever `tests/durable_host_runs_test.py` para deduplicação concorrente, payload incompatível, identidade cwd/candidato, saída não zero, estado desconhecido, cancelamento do alvo, corrida de término e permissões; executar e guardar falhas esperadas antes de criar qualquer código de produção.
2. **GREEN:** implementar o script e o skill no escopo acima; executar os testes focados em série, usando apenas `FakeSystemctl`.
3. **Integração local:** executar novamente os testes focados e as suítes existentes de baixo custo em série; registrar comandos, exits e limites, sem testar systemd real.
4. **Entrega:** revisar diff e arquivos privados/argumentos, atualizar a memória do projeto e este registro com evidências, criar commit Conventional Commit com identidade única de Rafael.

## Evidências de entrega

- **Origem da expectativa:** briefing explícito do Pilot para este incremento.
- **Candidato/diff:** branch `feat/harness-durable-runs` sobre `main` em `6acf9e58ccf25517d341dd22b956ce8600749466`; diff inclui `CLAUDE.md`, este task file, `plugins/xp-stack/skills/durable-host-runs/{SKILL.md,scripts/durable_run.py}`, `tests/durable_host_runs_test.py` e `tests/skeleton_test.sh`. O SHA do commit de entrega acompanha a mensagem ao coordenador.
- **RED:** `python3 -m unittest discover -s tests -p 'durable_host_runs_test.py' -v` → exit `1`, 11/11 casos falharam pela ausência de `durable_run.py`. A validação estrutural com shim temporário compatível com GNU `head` → exit `1`, 9 PASS / 4 FAIL, somente pela skill ausente. `-k cancel_signal_racing_after_command_exit` → exit `1` porque o worker reportava `143` embora o processo já tivesse terminado com `0`. `-k cancel_confirms_sync_supervisor_stop_when_unit_is_collected` → exit `1` porque o manager ignorava o retorno confirmado do `systemctl stop` quando a unidade já havia sido coletada.
- **GREEN/guardas:** os dois casos de corrida isolados → exit `0`, 1/1 cada; `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'durable_host_runs_test.py' -v` → exit `0`, 13/13; `bash tests/skeleton_test.sh` sob shim temporário de GNU `head` → exit `0`, 13/13; `npm run test:bash` sob shims temporários de `head`, `stat` e semântica de retorno GNU de `cp -rn` → exit `0`, 54/54. Nenhum shim foi instalado ou salvo no repositório.
- **Impacto e guardas aplicáveis:** testes unitários cobrem fake supervisor, registro, recibo, deduplicação, mismatch, estado desconhecido, cancelamento e permissões. `npm test` (Vitest) não foi executado: não houve alteração em `src/`/`bin/`, e o briefing exclui cargas/pools. Nenhuma dependência foi instalada.
- **Limites/revisão:** host de desenvolvimento é macOS sem `systemd-run`/`systemctl`; `npm run test:bash` sem shims para comandos GNU preexistentes interrompe em `tests/scaffold_test.sh` (`cp -rn` retorna `1` em arquivo existente na cópia BSD). O teste direto de `head -n -1` também é incompatível com BSD `head`. Com shims temporários sem alterar o código testado, a suíte bash completa concluiu 54/54. Nenhum teste real Linux/VPS ou kill do cliente foi alegado; o coordenador executará essa aceitação na VPS. Revisão independente fica a cargo do coordenador segundo a política da sessão.
