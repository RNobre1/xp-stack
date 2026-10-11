# Jev triage — piloto opt-in em sombra

Este recurso classifica um caso **sintético** selecionado pelo coordenador e grava uma sugestão separada. Ele não comprova causa, não declara um teste verde e não altera runner, fila, autorização, status ou aplicação.

O `SKILL.md` é manual-only (`disable-model-invocation: true`) para preservar o opt-in. No plugin xp-stack, o nome de invocação é `/xp-stack:jev-triage`. Em uma cópia versionada, o host deve descobrir/invocar `jev-triage` pelo nome registrado e resolver `jev_triage.py` ao lado do `SKILL.md` carregado.

## Limite estrutural de dados

O arquivo selecionado por `--case` deve ser um objeto JSON com exatamente estes campos:

```json
{
  "case_id": "synthetic-ambiguous-01",
  "synthetic": true,
  "symptom_codes": ["module_missing", "timeout"]
}
```

`case_id` é local e deve ser sintético. Os códigos aceitos são definidos uma única vez em `SYMPTOM_CODES`, em `jev_triage.py`; o parser rejeita texto livre, códigos desconhecidos, campos adicionais, IDs sem prefixo `synthetic-` e mais de quatro códigos. Não passe stdout, logs, crash reports, transcrições, caminhos, dados pessoais ou texto privado. Este piloto não oferece entrada “sanitizada” livre: marcar um texto arbitrário como sintético não o torna permitido.

O exportador `SyntheticCase.api_state()` constrói o estado da API somente com `synthetic: true` e pares fixos código/descrição da allowlist. Ele não envia `case_id`, caminhos ou conteúdo arbitrário. Não há scraper, varredura de repositório ou leitura automática de logs.

## Execução explícita

```sh
python3 "$SKILL_DIR/jev_triage.py" \
  --case /caminho/absoluto/caso-sintetico.json \
  --suggestion-out /caminho/absoluto/fora-do-checkout/caso.jev-suggestion.json \
  --config /caminho/absoluto/orcamento-jeV.json
```

Defina `SKILL_DIR` para o diretório do `SKILL.md` carregado antes do comando. Não derive o caminho do `cwd` nem presuma que o consumidor usa o checkout fonte `plugins/xp-stack`.

`--case` e `--suggestion-out` são obrigatórios. O diretório de saída precisa existir; o arquivo de sugestão precisa ser novo, absoluto e fora do checkout. A gravação é atômica, usa modo `0600` e nunca sobrescreve outro arquivo. O resultado vai somente para esse sidecar; stdout fica vazio para que o resultado não seja acidentalmente encadeado ao runner. Nenhum runner consome esse arquivo.

O CLI não tem caminho padrão para config, ledger ou saída. Sem `--config`, uma chave ausente ou inválida, orçamento esgotado ou outra falha, grava-se apenas a sugestão `inconclusive` no sidecar explicitamente escolhido. A saída é uma dica, nunca um estado de execução.

## Fluxo de classificação

1. Regras determinísticas locais classificam códigos inequívocos e não fazem chamada externa.
2. Códigos que não têm categoria ou combinam categorias diferentes são ambíguos. Jev só é considerado então, com chave e orçamento configurado.
3. A resposta aceita apenas `model == "jev-1.13.0"`, uma escolha em `CATEGORY_GUIDANCE`, probabilidades válidas e usage inteiro suportado. Texto livre da API nunca é convertido em instrução.
4. O JSON lateral traz `category`, `suggestion`, `origin`, `inconclusive` e `version`. Nenhum campo afirma causa comprovada, aprovação ou resultado de teste.

Jev não é usado para números, datas, hashes, exit codes, autorização, aprovação de gates ou declarar um vermelho flaky. A confiança do modelo não é prova de correção. Mensagens conflitantes ou insuficientes permanecem inconclusivas quando não há uma resposta válida.

## Chave, chamadas e orçamento

O único segredo lido é `TYPESAFE_API_KEY` do ambiente do processo. Não se procura chave em `.env`, arquivo de shell, outros nomes de variável ou credential store. Uma chave ausente leva ao fallback sem criar ledger. Não há SDK ou pacote a instalar, cobrança, compra de crédito, recarga automática, proxy herdado, redirect seguido ou retry.

Quando necessário, passe um config JSON explícito com exatamente:

| Campo | Regra |
|---|---|
| `schema_version` | `1` |
| `monthly_budget_usd` | string decimal atribuída pelo coordenador para este Host; sem default e sem teto por Host embutido |
| `ledger_path` | caminho absoluto fora do checkout |
| `timeout_seconds` | número de `0.01` a `30` |

Não adicione `auto_recharge` nem outros campos. O root define a fatia de cada Host para que o consumo combinado respeite o teto aprovado de US$4 e a margem de US$1; esta skill não divide nem cria um teto por Host.

O modelo cobra US$0,042 por milhão de tokens de entrada e informa limite de 64k tokens por chamada. Antes da chamada, o ledger reserva o máximo conservador: `64.000 × 42 nUSD = 2.688.000 nUSD` (US$0,002688). O config de um ledger/mês precisa manter o mesmo teto; mudança divergente falha fechada. O ledger usa lock de arquivo e troca atômica; registra ID sintético local, request ID aleatório, timestamp, modelo, estado, categoria e usage/custo — nunca chave ou payload.

Após uma resposta válida, `usage.input_tokens` reconcilia o custo real; tokens de saída são gratuitos segundo a documentação atual. Resposta inválida, timeout, erro de transporte, HTTP 5xx ou falha local de reconciliação conserva a reserva e suprime nova chamada para o mesmo `case_id` naquele mês. Respostas HTTP definitivas 3xx/4xx liberam a reserva. Não reenvie manualmente uma chamada incerta para contornar a reserva.

Shape oficial consultado: [`POST /v1/systemone`](https://docs.typesafe.ai/api), [modelo e preço](https://docs.typesafe.ai/models). Os testes usam apenas servidor HTTP sintético em loopback; não fazem chamada paga.

## Avaliação local e limites

`evaluation/cases.jsonl` tem dez casos sintéticos pequenos. O teste mede o mecanismo determinístico e os caminhos de abstenção; **não mede acurácia do Jev nem valida adequação a casos reais**. Nenhuma amostra real foi enviada. Antes de qualquer promoção, amplie para 100–200 exemplos sintéticos independentemente rotulados, separados entre calibração e validação, com métricas por classe, erros perigosos, abstenção e comparação com as regras locais. Não promova com base neste fixture mecânico.

## Testes locais

```sh
python3 -m unittest discover -s plugins/xp-stack/skills/jev-triage/tests -v
```

Os testes cobrem schema allowlisted, fallback, ledger concorrente/mensal, timeout sem duplicata, validação de modelo/usage e contrato HTTP usando somente `127.0.0.1`.
