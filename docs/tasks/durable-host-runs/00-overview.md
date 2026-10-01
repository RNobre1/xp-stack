# P1 — Durable Host Runs

**Branch:** `feat/harness-durable-runs`
**Base:** `main` at `6acf9e58ccf25517d341dd22b956ce8600749466`
**Worktree:** `/Users/rnobre/.traycer/worktrees/rnobre1__xp-stack/feat-harness-durable-runs`
**Status:** Follow-up de revisão implementado; gate local agregado 54 shell checks + 41 unitários; integração Linux real permanece com o coordenador
**Autorização:** incremento fechado autorizado pelo Pilot; sem instalação global ou na VPS.
**Contrato de evidências:** `akita-xp-rules / Delivery evidence contract`, revisão `2026-09-15.1`; fonte resolvida: `/Users/rnobre/.local/share/traycer-guidance/delivery-contract.md`.

## Objetivo e comportamento observável

Adicionar uma skill manual, opcional e pequena para submeter, consultar, acompanhar e cancelar comandos na VPS Linux por unidades transitórias `systemd-run --user`. O processo permanece sob o supervisor após o cliente terminar. Cada submissão recebe uma chave estável explícita, identidade explícita do candidato, cwd e argv sem interpretação por shell; a mesma chave e payload nunca iniciam uma segunda unidade, enquanto payload diferente para a mesma chave é recusado.

Cada registro privado preserva o payload de submissão sem mutação; log, eventos e recibo final ficam ao lado dele. Recibo só é selado com código de saída útil; estado sem prova conclusiva do supervisor aparece como `unknown` e nunca autoriza repetir uma execução registrada. Cancelamento grava intenção durável antes do stop e deriva a unidade exclusivamente do registro daquela chave.

## Desenho aprovado pelo briefing

- Um script Python 3 da biblioteca padrão vive em `plugins/xp-stack/skills/durable-host-runs/scripts/`; não instala dependências nem cria daemon.
- A interface é `submit --key KEY --candidate ID --cwd DIR -- ARGV...`, `status --key KEY`, `follow --key KEY` e `cancel --key KEY`. `ARGV` é sempre executado diretamente, sem shell.
- O estado padrão fica em `~/.local/state/xp-stack/durable-host-runs`, derivado do home em passwd e imune a overrides `HOME`/`XDG_STATE_HOME` entre shells; diretórios privados `0700`, arquivos privados `0600` (registro/recibo selados como somente leitura após escrita). Não há limpeza automática de registros, logs, recibos ou unidades falhas.
- Um lock `flock` protege somente a criação/deduplicação de registros. O script não reserva, conta, limita ou roteia vagas. O comando indicado pelo chamador pode ser `~/.traycer/locks/vaga-teste.sh ...` ou `~/.traycer/locks/vaga-tsc.sh` com seu contrato atual preservado.
- A chave determina um identificador seguro do registro e da unidade; o hash do payload considera cwd canônico, candidato, argv, dono capturado/explicado e recursos declarados. Um preflight dos binários e do user manager acontece antes do registro; se falhar, não consome a chave e a mesma pode ser tentada novamente. Após registrar e tentar enqueue, timeout/erro ambíguo preserva o registro e nunca relança com a mesma chave.
- A camada de supervisor recebe uma interface injetável; os testes usam `FakeSystemctl`, sem chamar `systemctl` real. A implementação real submete com `systemd-run --user --no-block` sem `--collect`, consulta com `systemctl --user show` e cancela somente a unidade persistida. Falhas permanecem inspecionáveis no supervisor; não há `reset-failed` automático.
- O worker registra `started`, `command_exited` e `finished`, captura stdout/stderr em arquivo e grava recibo final atomicamente. Exceções do worker gravam `worker_failed` e recibo com exit 70. Só uma intenção de cancelamento gravada antes do stop faz SIGTERM virar `cancelled`; outros sinais ficam como falha `signal`.
- A saída do worker não basta para afirmar que o processo tree terminou. `status` mantém `stopping` enquanto a unidade está ativa, e só define `supervisor_terminal` com prova terminal do systemd ou unidade descarregada depois do evento persistido `started`; `enqueue_confirmed` não basta. `systemctl show` com retorno não zero é indisponível, independentemente de stderr. `follow` drena eventos finais, tolera no máximo três leituras `unknown` consecutivas com intervalo mínimo de 250 ms e encerra como `unknown` se o orçamento acabar.

## Fora de escopo

Não adicionar algoritmo de vagas, capacidade paralela, daemon residente, lógica nova aos scripts `vaga-teste.sh`/`vaga-tsc.sh`, roteamento de modelos, P4/P5/P6, acesso à produção, execução real na VPS, cargas/pools, instalação do skill em diretórios globais ou publicação externa. O teste de aceitação Linux real e kill do cliente serão feitos pelo coordenador na VPS.

## Critérios de aceite

1. Frontmatter da skill contém `disable-model-invocation: true`; o nome de slash permanece `durable-host-runs` e documentação ensina o prefixo pessoal versionado/rollback sem instalar. Distribuição é pelo plugin/cópia manual, não pelo npm CLI.
2. Submissões simultâneas idênticas para uma chave iniciam exatamente uma unidade; submissão posterior idêntica retorna o job existente.
3. A mesma chave com cwd, candidato ou argv diferente é recusada sem iniciar outra unidade.
4. Cwd/candidato/argv mantêm sua identidade no registro; argv não é concatenado nem passado por shell.
5. O registro padrão deriva do home em passwd e não muda com overrides `HOME`/`XDG_STATE_HOME` entre shells.
6. Código de saída não zero do comando aparece no recibo final e no status.
7. Preflight indisponível (binários ou user manager) não grava registro; registro existente em estado ambíguo nunca relança com a mesma chave. Nova chave só após evidência autoritativa de não execução ou término, nunca apenas por timeout.
8. Snapshot loaded/inactive sem código terminal útil e snapshot not-found padrão sem evento `started` permanecem inconclusivos e não selam recibo nulo.
9. Recibo da worker não confirma fim da árvore; `supervisor_terminal` só fica true por estado terminal ou unload do supervisor após `started`.
10. Cancelamento usa intenção durável, atinge só a unidade da chave e distingue signal externo de cancel pedido; corrida com término natural relê o recibo.
11. `follow` drena eventos finais; tolera três estados unknown consecutivos com atraso mínimo de 250 ms, depois encerra honestamente em unknown sem relançar.
12. Diretórios, lock, registro, intenção, eventos, log e recibo são privados; não há limpeza automática.
13. Unitários usam FakeSystemctl e entram em `npm run test:bash` e workflow CI; nenhum teste da worktree usa systemd real ou carga pesada.
14. Commit de autoria Rafael, sem trailer de coautoria; integração Linux real permanece para o coordenador.
15. Registro privado conserva `owner` (hostname/usuário e IDs Traycer disponíveis, ou dono explícito) e lista de `resources` declarados. Consulta após handoff preserva o dono original. Recursos são metadados opacos, sem alocação, medição ou novo algoritmo de vagas.

## Plano curto

1. **RED:** adicionar casos do review R1/R2/R3/R4/R5/R6/R7/R8 para não selar código nulo, signal vs cancel-intent, corrida natural, follow/unknown, preflight, spawn signal, evento fiel e falha de worker; observar RED em série.
2. **GREEN:** corrigir o worker/manager, remover collect, preservar evidência terminal, preflight antes do registro e cancelar só com intenção persistida.
3. **Integração local:** integrar os unitários em `npm run test:bash` e workflow GitHub Actions; executar guardas leves em série, sem systemd real.
4. **Entrega:** atualizar README/CLAUDE/task com distribuição e semântica de árvore, rever diff e evidências, criar commit Conventional Commit de Rafael.

## Follow-up da revisão de 01/10

O incremento adicional fecha as ressalvas da revisão sem alterar as filas, limites ou identidade da execução:

- O registro imutável incluirá `owner` e `resources` no payload autenticado. Sem `--owner`, o dono registra hostname, usuário Unix e IDs Traycer presentes no ambiente (`TRAYCER_TASK_ID` e `TRAYCER_AGENT_ID`); com `--owner`, persiste o identificador explícito. `--resource` repetido guarda declarações opacas do chamador. Esses valores não reservam, medem nem limitam recursos. `status`, `follow` e `cancel` só leem o dono original; um observador após handoff não o substitui.
- `follow` tolerará no máximo três observações `unknown` consecutivas sem prova terminal, esperando pelo menos 250 ms entre consultas. Um estado conhecido reinicia a contagem. Esgotar o orçamento encerra como `unknown`; nunca reenvia.
- `LoadState=not-found` só pode confirmar unload depois do evento persistido `started`; `enqueue_confirmed` sozinho e retorno não zero de `systemctl show` não provam término. `ExecMainCode=exited` com status 200–255 permanece código de falha do supervisor, não sinal.
- Falhas ficam no supervisor para inspeção. Se um operador decidir remover depois uma unidade `failed`, a limpeza é explícita e posterior à captura do journal/recibo, via `systemctl --user reset-failed <unidade>`; o utilitário não executa esse comando.

Ordem de prova: acrescentar testes de regressão para dono/recursos, consulta após handoff, transient `unknown` com orçamento e atraso mínimo, snapshot `not-found` padrão do Host, retorno não zero do `show`, ausência de inferência terminal em cancel e códigos 200/203; observar RED antes do código. Depois implementar o menor delta, observar GREEN individual e suíte Python. O gate agregado será relançado somente após captura do antigo handle como terminado: o registro e session ID anteriores não foram recuperáveis, e `ps` no Host confirmou ausência de processos correspondentes às 2026-10-01T16:58:51Z; o exit anterior permanece desconhecido.

## Evidências de entrega

- **Origem da expectativa:** briefing explícito do Pilot para este incremento.
- **Base/candidato/diff:** base `main` `6acf9e58ccf25517d341dd22b956ce8600749466`; revisão independente exercitou `894f741ab5961af0f2bc6d65f1a9a267782908f9`; correção de implementação commitada em `9f7c75122191eb1db2ddd18fa280bd3f39993249`; atualização de evidências desta linha segue no mesmo branch. Diff da correção inclui `CLAUDE.md`, este task file, `plugins/xp-stack/README.md`, a skill/script, `package.json`, `.github/workflows/validate-plugins.yml` e `tests/durable_host_runs_test.py`. O SHA final da branch acompanha a mensagem ao coordenador.
- **Reprodução do review antigo:** `PYTHONDONTWRITEBYTECODE=1 python3 /Users/rnobre/.traycer/epics/3d451778-9b35-47d1-84d6-f515a08cc790/artifacts/agent-selection-20261001/execucao/p1-review/repro.py r1 r2 r3 r4 r6 r7 r8` → exit `0`, SHA do reproducer `653e1c7b7a16990643c49d0b39f0159ce421257cd2513afd1e5f267c2ba208a9`. R1 selava `exit_code:null`; R2 devolvia unknown com exit 0; R3 emitia só submitted; R4 fazia 81 inspeções/s; R6 classificava SIGTERM externo como cancelled; R7 perdia o handler durante spawn por 5,08 s; R8 emitia cancel_confirmed com null contra recibo 143.
- **RED/GREEN das correções:** cada comando abaixo usou `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'durable_host_runs_test.py' -k <selector> -v`, em série. RED exit `1` e GREEN exit `0` para: `loaded_inactive_start_pending_state_does_not_seal_null_receipt` (A1); `sigterm_without_durable_cancel_intent_is_a_signal_failure` e `cancel_persists_intent_before_calling_supervisor` (A2); `cancel_rereads_receipt_when_natural_finish_wins_stop_race` (B3); `follow_drains_worker_events_written_during_terminal_status_check`, `follow_reports_unknown_once_without_busy_polling` e `follow_cli_returns_nonzero_and_prints_unknown_terminal_event` (B4); `supervisor_preflight_failure_does_not_register_or_burn_key` (B1); `systemd_submission_keeps_terminal_evidence_loaded` e `worker_exception_persists_event_and_failure_receipt` (B2); `sigterm_during_spawn_is_forwarded_to_child_process_group` (C1); `cancel_confirmed_event_uses_receipt_that_won_race` (C2); `receipt_does_not_confirm_tree_end_until_supervisor_is_terminal` (C3); `systemd_preflight_rejects_missing_systemd_run_before_registering`, `default_registry_path_is_stable_across_shell_home_overrides`, `worker_records_when_its_final_receipt_loses_an_existing_receipt_race`, `systemd_inspect_parses_terminal_code_and_not_found_load_state` e `systemd_sigterm_exit_is_signal_without_cancel_intent` (B1/C5).
- **GREEN Python do candidato anterior ao follow-up:** `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'durable_host_runs_test.py' -v` → exit `0`, `33/33`. `git diff --check` e parse de `package.json` → exit `0`. O job CI dedicado e o comando agregado foram configurados, mas CI não foi executado.
- **Review follow-up (01/10):** RED focal completo `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'durable_host_runs_test.py' -v` → exit `1`, 41 testes, 8 failures/3 errors: metadados/CLI ausentes, `not-found` padrão tratado como terminal, query indisponível confirmando cancelamento, `follow` encerrando na primeira leitura unknown, `ExecMainStatus` 200/203 marcado como signal e retorno não zero interpretado por texto stderr. Após correção, GREEN focal → exit `0`, `41/41`. RED/GREEN seletivos: owner `-k owner` `3/3`; not-found `-k not_found` `2/2`; query indisponível `-k supervisor_query_is_unavailable` `1/1`; follow `-k follow_` `6/6`; inicialização systemd `-k exec_failure_codes` `1/1`. A primeira GREEN completa detectou que o fake de cancelamento com recibo omitira o evento `started` que um worker real grava antes do recibo; após corrigir esse fixture, teste direcionado passou e o GREEN completo repetiu `41/41`.
- **Gate agregado legado:** o comando era `npm run test:bash` via wrapper `functions.exec` com shims BSD/GNU temporários. O resultado agregado e horário de início/PID/session_id não ficaram registrados; `traycer_list_shells` e `traycer_list_terminals` retornaram vazios. Às `2026-10-01T16:58:51Z`, a tabela de processos do Host não mostrou `npm run test:bash`, Python unitário nem scripts da suíte, confirmando que já não estava ativo; isso não estabelece seu exit. Saída antiga segue **desconhecida**.
- **Gate agregado capturado:** `npm run test:bash` → exit `0`, `54` checks shell + `41/41` unitários. Host `MacBook-Air-de-Rafael.local`, PID `51300`, shell persistido `dd55aa1d-c9ca-4632-af16-d623ea62c8a0`, 2026-10-01 `17:14:16–17:14:24 UTC`. Shims temporários somente para `head -n -1`, `stat -c` e `cp -rn` no macOS. Log: [npm-test-bash-2026-10-01.txt](evidence/npm-test-bash-2026-10-01.txt); recibo com comando, horários, exit, handle e hash do diff de origem: [npm-test-bash-2026-10-01.receipt.json](evidence/npm-test-bash-2026-10-01.receipt.json). A suíte Bash não executa app Dubai, pools ou systemd real.
- **Impacto/limites/revisão:** testes unitários rodam em `npm run test:bash` e job GitHub Actions dedicado; nenhum pool ou teste de aplicação. Host local é macOS sem `systemd-run`/`systemctl`; a aceitação Linux e kill do cliente permanecem para o coordenador na VPS. Não houve instalação, reset de unidade, acesso à VPS ou publicação. Nova revisão independente do candidato final e o exit agregado local permanecem pendentes.
