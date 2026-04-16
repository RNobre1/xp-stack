---
name: scaffold
description: POC bootstrap — copia arquivos de templates/ para o cwd do receptor via shell injection preprocessado. Throwaway, usado exclusivamente pra validar empiricamente a hipotese grade B da secao 6.2 da pesquisa replicar-stack-claude-code (O Agente). Nao usar em producao.
disable-model-invocation: true
allowed-tools:
  - Bash(bash *)
  - Bash(mkdir *)
  - Bash(cp *)
---

# POC Scaffold

```!
bash ${CLAUDE_SKILL_DIR}/scripts/scaffold.sh "$(pwd)"
```

Arquivos copiados pelo preamble acima. Esta skill existe exclusivamente pra T2 validar
que o Claude Code:

1. Pre-processa o bloco `!command` acima antes de entregar conteudo ao modelo;
2. Substitui `${CLAUDE_SKILL_DIR}` pelo path absoluto do diretorio da skill no plugin
   carregado (via `claude --plugin-dir` ou marketplace);
3. Executa `bash .../scaffold.sh "$(pwd)"` deterministicamente;
4. Retorna o stdout do script como substituicao do placeholder antes do resto do
   conteudo da skill ser renderizado.

Se voce esta lendo isso fora do contexto do POC, veja `docs/tasks/poc-bootstrap/` no
repo `RNobre1/claude-craft` — o POC ja validou ou derrubou a hipotese e esta skill
pode ser removida ou mantida apenas como regression test.
