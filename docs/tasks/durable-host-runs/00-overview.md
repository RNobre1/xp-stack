# P1 — Durable Host Runs

**Branch:** `feat/harness-durable-runs`
**Base:** `main` at `6acf9e58ccf25517d341dd22b956ce8600749466`
**Worktree:** `/Users/rnobre/.traycer/worktrees/rnobre1__xp-stack/feat-harness-durable-runs`
**Status:** Correções de revisão implementadas; candidata commitada; gate agregado local e integração real pendentes
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
- A chave determina um identificador seguro do registro e da unidade; o hash do payload considera cwd canônico, candidato e cada argumento de argv. Um preflight dos binários e do user manager acontece antes do registro; se falhar, não consome a chave e a mesma pode ser tentada novamente. Após registrar e tentar enqueue, timeout/erro ambíguo preserva o registro e nunca relança com a mesma chave.
- A camada de supervisor recebe uma interface injetável; os testes usam `FakeSystemctl`, sem chamar `systemctl` real. A implementação real submete com `systemd-run --user --no-block` sem `--collect`, consulta com `systemctl --user show` e cancela somente a unidade persistida. Falhas permanecem inspecionáveis no supervisor; não há `reset-failed` automático.
- O worker registra `started`, `command_exited` e `finished`, captura stdout/stderr em arquivo e grava recibo final atomicamente. Exceções do worker gravam `worker_failed` e recibo com exit 70. Só uma intenção de cancelamento gravada antes do stop faz SIGTERM virar `cancelled`; outros sinais ficam como falha `signal`.
- A saída do worker não basta para afirmar que o processo tree terminou. `status` mantém `stopping` enquanto a unidade está ativa, e só define `supervisor_terminal` com prova terminal do systemd ou unidade descarregada depois de `enqueue_confirmed`/`started`. `follow` drena eventos finais e encerra com evento explícito também em estado inconclusivo.

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
8. Snapshot loaded/inactive sem código terminal útil permanece inconclusivo e não sela recibo nulo.
9. Recibo da worker não confirma fim da árvore; `supervisor_terminal` só fica true por estado/unload confirmado do supervisor.
10. Cancelamento usa intenção durável, atinge só a unidade da chave e distingue signal externo de cancel pedido; corrida com término natural relê o recibo.
11. `follow` drena eventos finais, encerra em unknown com diagnóstico e não mantém polling ocupado.
12. Diretórios, lock, registro, intenção, eventos, log e recibo são privados; não há limpeza automática.
13. Unitários usam FakeSystemctl e entram em `npm run test:bash` e workflow CI; nenhum teste da worktree usa systemd real ou carga pesada.
14. Commit de autoria Rafael, sem trailer de coautoria; integração Linux real permanece para o coordenador.

## Plano curto

1. **RED:** adicionar casos do review R1/R2/R3/R4/R5/R6/R7/R8 para não selar código nulo, signal vs cancel-intent, corrida natural, follow/unknown, preflight, spawn signal, evento fiel e falha de worker; observar RED em série.
2. **GREEN:** corrigir o worker/manager, remover collect, preservar evidência terminal, preflight antes do registro e cancelar só com intenção persistida.
3. **Integração local:** integrar os unitários em `npm run test:bash` e workflow GitHub Actions; executar guardas leves em série, sem systemd real.
4. **Entrega:** atualizar README/CLAUDE/task com distribuição e semântica de árvore, rever diff e evidências, criar commit Conventional Commit de Rafael.

## Evidências de entrega

- **Origem da expectativa:** briefing explícito do Pilot para este incremento.
- **Base/candidato/diff:** base `main` `6acf9e58ccf25517d341dd22b956ce8600749466`; revisão independente exercitou `894f741ab5961af0f2bc6d65f1a9a267782908f9`; correções seguem no mesmo branch/worktree e o novo SHA vai na mensagem de entrega. Diff desta correção inclui `CLAUDE.md`, este arquivo, `plugins/xp-stack/README.md`, skill/script `plugins/xp-stack/skills/durable-host-runs/`, `package.json`, `.github/workflows/validate-plugins.yml` e `tests/durable_host_runs_test.py`/`tests/skeleton_test.sh`.
- **Reprodução do review antigo:** `PYTHONDONTWRITEBYTECODE=1 python3 /Users/rnobre/.traycer/epics/3d451778-9b35-47d1-84d6-f515a08cc790/artifacts/agent-selection-20261001/execucao/p1-review/repro.py r1 r2 r3 r4 r6 r7 r8` → exit `0`, SHA do reproducer `653e1c7b7a16990643c49d0b39f0159ce421257cd2513afd1e5f267c2ba208a9`. R1 selava `exit_code:null`; R2 devolvia unknown com exit 0; R3 emitia só submitted; R4 fazia 81 inspeções/s; R6 classificava SIGTERM externo como cancelled; R7 perdia o handler durante spawn por 5,08 s; R8 emitia cancel_confirmed com null contra recibo 143.
- **RED/GREEN das correções:** cada comando abaixo usou `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'durable_host_runs_test.py' -k <selector> -v`, em série. RED exit `1` e GREEN exit `0` para: `loaded_inactive_start_pending_state_does_not_seal_null_receipt` (A1); `sigterm_without_durable_cancel_intent_is_a_signal_failure` e `cancel_persists_intent_before_calling_supervisor` (A2); `cancel_rereads_receipt_when_natural_finish_wins_stop_race` (B3); `follow_drains_worker_events_written_during_terminal_status_check`, `follow_reports_unknown_once_without_busy_polling` e `follow_cli_returns_nonzero_and_prints_unknown_terminal_event` (B4); `supervisor_preflight_failure_does_not_register_or_burn_key` (B1); `systemd_submission_keeps_terminal_evidence_loaded` e `worker_exception_persists_event_and_failure_receipt` (B2); `sigterm_during_spawn_is_forwarded_to_child_process_group` (C1); `cancel_confirmed_event_uses_receipt_that_won_race` (C2); `receipt_does_not_confirm_tree_end_until_supervisor_is_terminal` (C3); `systemd_preflight_rejects_missing_systemd_run_before_registering`, `default_registry_path_is_stable_across_shell_home_overrides`, `worker_records_when_its_final_receipt_loses_an_existing_receipt_race`, `systemd_inspect_parses_terminal_code_and_not_found_load_state` e `systemd_sigterm_exit_is_signal_without_cancel_intent` (B1/C5).
- **GREEN agregado Python:** `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'durable_host_runs_test.py' -v` → exit `0`, `33/33`. `npm run test:bash` foi iniciado com shims temporários BSD/GNU e retornou saída parcial após 10 s, sem o handle de sessão chegar ao wrapper; o trecho visível mostra os 54 casos shell PASS, mas o exit agregado permanece **desconhecido**. Pelo contrato, não foi iniciada uma execução duplicada. O job CI dedicado está configurado.
- **Impacto/limites/revisão:** teste integrado no `npm run test:bash` e workflow GitHub Actions; nenhum pool ou teste de aplicação. Host local é macOS sem `systemd-run`/`systemctl`; a aceitação Linux e kill do cliente permanecem para o coordenador na VPS. Não houve instalação, reset de unidade, acesso à VPS ou publicação. Nova revisão independente do candidato final e gate agregado local permanecem pendentes.
