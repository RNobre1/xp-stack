# xp-stack

[![npm version](https://img.shields.io/npm/v/xp-stack.svg)](https://www.npmjs.com/package/xp-stack)

Metodologia **XP/Akita para desenvolvimento com agentes de IA**: incrementos utilizáveis, TDD, pesquisa com fontes, revisão independente e evidências de entrega. Funciona com diferentes stacks, modelos e ferramentas; a sessão e o projeto definem quem executa, revisa e pode publicar.

O npm CLI instala o conteúdo no projeto. O plugin oferece a integração com Claude Code. As versões desses dois canais são independentes: [npm](package.json), [plugin](plugins/xp-stack/.claude-plugin/plugin.json) e [histórico de releases](CHANGELOG.md).

## O fluxo atual

O objetivo é entregar com qualidade sem transformar testes, documentação ou coordenação em trabalho repetido:

- **Um resultado utilizável por incremento.** Não criar uma task para cada arquivo ou etapa interna. Documentação essencial é o padrão; detalhes adicionais entram quando ajudam a coordenação.
- **TDD e verificações proporcionais ao risco.** Testes focados e tipos vêm antes das etapas caras. Uma falha bloqueante interrompe as etapas caras seguintes; diagnóstico completo precisa de propósito explícito.
- **Validação ampla no candidato integrado.** O coordenador reúne a evidência e admite a execução conforme a capacidade real do Host. Autores verificam seu recorte sem repetir a suíte completa a cada entrega.
- **Paralelismo com equivalência e isolamento.** Grupos precisam preservar seleção, navegadores, cenas e oráculos, sem omissões nem duplicações. Dados mutáveis, portas, caches e saídas ficam isolados. O pacote não fixa quantos workers cada máquina suporta.
- **Reuso somente com prova.** Resultado anterior exige manifesto das entradas e do ambiente e uma comparação do delta. Um diff pequeno ou a palavra “docs” não basta para reaproveitar um verde.
- **Revisão por função.** Identidade independente e evidência conferida são requisitos; nenhum modelo é obrigatório. O autor nunca aprova a própria mudança. Diversidade e exceções seguem a política vigente.
- **Uma fonte de estado.** Respeitar o ticket, controlador ou ferramenta já adotada. Pausa, compactação e handoff preservam contexto e execuções pendentes; não autorizam suíte, commit ou publicação por si.

Este resumo aponta para o [Delivery flow](plugins/xp-stack/skills/akita-xp-rules/references/delivery-flow.md), a fonte canônica das condições, exceções e revisão vigente. O [contrato de evidências](plugins/xp-stack/skills/akita-xp-rules/SKILL.md#delivery-evidence-contract-shared-source) define o que registrar por entrega. Essas orientações não instalam automaticamente um escalonador nem modificam o runner de testes de um projeto.

## Começar pelo npm CLI

Requer Node.js compatível com o campo `engines` do [package.json](package.json).

```bash
cd meu-projeto
npx xp-stack@latest init
npx xp-stack@latest status
```

Em terminal interativo, `init` pergunta quais engines instalar e o nível de documentação. Para escolher explicitamente:

```bash
npx xp-stack@latest init --engine claude-code,codex --doc-level essencial --yes
```

A seleção explícita de `--engine` prevalece. Sem ela, o modo não interativo detecta as engines; quando detecta Claude Code, acrescenta o espelho `.agents/skills` por padrão, salvo `--no-dual-mirror`. Consulte os [destinos de cada engine](src/lib/engines.js). O instalador de conteúdo não instala os próprios harnesses e não garante que todos ofereçam os mesmos recursos nativos.

### O que o init cria

- Skills core e suas referências nos diretórios das engines selecionadas, rastreadas por manifest SHA-256 em `.xp-stack/`.
- `CLAUDE.md` de projeto e symlink relativo `AGENTS.md → CLAUDE.md`, quando os destinos ainda não existem.
- Templates em `docs/tasks/_template/` e `docs/pesquisas/_template/`.
- Para Claude Code, definições de agents e `.claude/settings.json` de projeto, preservando arquivos existentes.
- Entrada `.xp-stack/state/` no `.gitignore`.

O hook Stop é **opcional**, habilitado por `init --with-hooks`; ele altera `.claude/settings.json` de forma aditiva. Inspecione o diff antes de adotar permissões ou hooks. As instruções globais do usuário, a fila do Host e suas credenciais não são instaladas pelo `init`.

### Usar as skills

Com o npm, use o nome que o catálogo do harness expõe — por exemplo, `task-decomposition` ou `research-cycle`. No Codex, pode invocar `$task-decomposition`. O prefixo `/xp-stack:` pertence à instalação pelo **plugin**, não é um comando universal de toda engine.

Para habilitar uma capacidade opcional e depois levá-la a outra engine:

```bash
npx xp-stack@latest add-skill debugging-discipline
npx xp-stack@latest add-engine codex
```

`add-skill` copia a skill; setups adicionais são executados ao invocá-la conforme suas instruções. `add-engine` replica o conteúdo já habilitado, sem ativar todas as opções do catálogo nem sobrescrever destinos existentes.

## Conteúdo e fontes

| Necessidade | Fonte |
| --- | --- |
| Regras, evidências e revisão | [akita-xp-rules](plugins/xp-stack/skills/akita-xp-rules/SKILL.md) e [Delivery flow](plugins/xp-stack/skills/akita-xp-rules/references/delivery-flow.md) |
| Selecionar camadas de teste e aplicar TDD | [tdd-conventions](plugins/xp-stack/skills/tdd-conventions/SKILL.md) |
| Decompor trabalho e preparar handoffs | [task-decomposition](plugins/xp-stack/skills/task-decomposition/SKILL.md) |
| Pesquisa com fontes e revisão crítica | [research-cycle](plugins/xp-stack/skills/research-cycle/SKILL.md) |
| Cache, segurança e paralelismo em GitHub Actions | [optimizing-github-actions](plugins/xp-stack/skills/optimizing-github-actions/SKILL.md) |
| Avaliar custo e valor dos testes | [Protocolo de auditoria](plugins/xp-stack/skills/akita-xp-rules/references/test-cost-audit.md) e [prompt reutilizável](plugins/xp-stack/skills/akita-xp-rules/references/test-cost-audit-prompt.md) |

A lista de opt-ins e aliases aceitos pelo CLI está no [registry](src/lib/opt-in-registry.js). Inclui, por exemplo, análise de banco, extração de especificação visual, lembretes de debug/revisão e mecanismos opcionais de orquestração. Os [agents](plugins/xp-stack/agents/) são definições para Claude Code; as demais engines recebem as skills compatíveis, não uma implementação equivalente de agents.

### Auditar uma suíte que ficou cara

Use o prompt de auditoria com inventário de duração, comportamento coberto, histórico de defeitos e custo de manutenção. O resultado é uma proposta de manter, fundir, mover de camada ou remover testes **com prova de substituição**. Não há meta de quantidade nem autorização para apagar regressões só para reduzir o tempo. O protocolo preserva especialmente segurança, transações, rollback e concorrência.

### Execução durável no Linux

[durable-host-runs](plugins/xp-stack/skills/durable-host-runs/SKILL.md) executa um comando identificado sob `systemd --user`, com deduplicação, logs e recibo de término que sobrevivem à saída do cliente, desde que o gerenciador de usuário continue disponível.

É uma capacidade manual distribuída pelo plugin ou por cópia pessoal versionada. **Não está no registry de `add-skill`**, não funciona como supervisor no macOS e não aloca workers ou substitui a fila existente. Requisitos e operação estão na própria skill.

### Jev: experimental, manual e opcional

```bash
npx xp-stack@latest add-skill jev-triage
```

O [Jev opt-in](plugins/xp-stack/skills/jev-triage/SKILL.md) aceita casos sintéticos restritos e grava uma sugestão externa. Credencial e orçamento são configurados separadamente. O piloto limita-se ao contrato da API: **não demonstra acurácia ou ganho de produtividade**, não lê logs reais e não aprova testes, alterações ou publicação. Não é uma dependência do fluxo normal.

### Limites do pacote

O xp-stack fornece instruções e ferramentas específicas; não instala uma política global pessoal, não ativa Autonomia nem publica aplicações por consequência. Um runner de portão completo, seus adapters e o número de grupos de E2E pertencem a cada projeto/Host. Experimentos locais de paralelismo não são funcionalidades gerais nem garantias de tempo do npm.

Skills pessoais ou de terceiros, como `motion-director`, `grill-me`, `animate` e `wiggle`, **não fazem parte desta distribuição**. Superpowers e Traycer também são integrações separadas; não presuma que existam apenas porque o xp-stack foi instalado.

## Atualizar preservando o projeto

```bash
npx xp-stack@latest update --cwd /caminho/do/projeto
```

Se prefere o executável global, primeiro atualize-o com `npm install -g xp-stack@latest`, depois use `xp-stack update`.

O update compara fonte, manifest e arquivos locais. Conteúdo gerenciado intacto recebe a nova versão e novas referências. Alterações locais precisam de escolha explícita; exclusões locais são preservadas. Colisões com conteúdo não gerenciado não são sobrescritas. `CLAUDE.md`, `AGENTS.md` e `.claude/settings.json` são do projeto após o init e permanecem preservados, inclusive com `--take-theirs`.

```bash
# Preservar personalizações, atualizando o restante gerenciado:
npx xp-stack@latest update --yes --keep-mine

# Restaurar fontes gerenciadas, inclusive exclusões locais: usar só se essa for a intenção.
npx xp-stack@latest update --yes --take-theirs
```

Confira os caminhos relatados e compare manualmente novos templates de instruções/permissões. Faça backup ou trabalhe em branch. Não use `uninstall` para atualizar: `.xp-stack/` também contém estado.

**Instalações antigas de add-engine:** versões anteriores criavam cópias em `<skillsDir>/opt-in-skills/`, que alguns harnesses descobrem recursivamente. A versão atual deixa de criá-las, mas não apaga cópias antigas. Inventarie arquivos, personalizações e catálogo efetivo. Uma limpeza autorizada deve preservar backup dos arquivos e de `.xp-stack/manifest.json` e remover também as entradas correspondentes; senão `--take-theirs` pode restaurar as cópias. Não apague toda a pasta de skills. Symlinks em caminhos gerenciados podem ser recusados; siga o diagnóstico sem substituir conteúdo de terceiros.

## Plugin Claude Code

```text
/plugin marketplace add RNobre1/xp-stack
/plugin install xp-stack@xp-stack
```

O [README do plugin](plugins/xp-stack/README.md) descreve esse canal. Para scaffold manual de um projeto ainda não preparado, invoque `/xp-stack:bootstrap`. Não rode outro bootstrap apenas porque atualizou o plugin.

```text
/plugin marketplace update xp-stack
/plugin update xp-stack@xp-stack
```

Atualizar o cache do plugin não reexecuta os scaffolds já copiados ao projeto. Evite carregar simultaneamente cópias diferentes da mesma skill via npm, plugin e diretório global; confira o catálogo efetivo do harness.

## Estado das tarefas e continuidade

O [guia canônico](plugins/xp-stack/skills/akita-xp-rules/references/delivery-flow.md#source-of-task-state) distingue ticket Traycer, controlador Autonomia, ferramenta existente e novo fluxo em `docs/tasks`. No novo fluxo sem ferramenta prévia, `tasks.json` é a autoridade; o Markdown registra especificações e visões derivadas. O layout essencial é o padrão e `PROGRESS.md` é opcional.

**Compatibilidade:** os comandos `resume`, `hook-stop`, `regenerate-resume` e `reconcile` ainda operam o estado legado em `state.json`/`index.json`. Eles não passaram a consumir `tasks.json`. Preserve contratos existentes e não crie escrita dupla; migrar estado é trabalho separado. O hook Stop não substitui a fonte de estado da sessão.

Para workers sem loader de skills, o briefing leva o excerto literal do contrato canônico, com referência e revisão. Um nome ou link inacessível não basta.

## Referência do CLI

Use `npx xp-stack@latest --help` e `<comando> --help` para opções completas.

| Comando | Uso |
| --- | --- |
| `init` | Instalar conteúdo e scaffold no projeto |
| `update` | Atualizar fontes gerenciadas, conciliando modificações locais |
| `status` | Inspecionar versão, engines, arquivos e drift |
| `add-engine <engine>` | Replicar conteúdo habilitado para outra engine |
| `add-skill <skill>` | Habilitar uma opção do registry |
| `config get [key]` | Ler configurações do projeto |
| `config doc-level <essencial\|completo>` | Definir o padrão de documentação para novas decomposições |
| `resume [slug]` | Consultar features/estado legado |
| `hook-stop` | Atualizar índice e resumo pelo hook opcional do Claude Code |
| `regenerate-resume <slug>` | Gerar resumo a partir do estado legado |
| `reconcile <slug>` | Comparar/sincronizar estado legado e overview; dry-run por padrão |
| `uninstall` | Remover a instalação conforme opções e confirmação; consulte a ajuda antes |
| `--version` | Consultar a versão do CLI |

A lista é uma referência de uso; os comandos e opções são definidos em [src/cli/index.js](src/cli/index.js) e seus módulos.

## Desenvolvimento e verificação

```bash
npm ci
npm test
npm run test:bash
```

`test:bash` agrega os cenários de shell, o runner durável em Python, os contratos portáteis e o Jev sintético. Para selecionar esses últimos diretamente:

```bash
npm run test:contracts
npm run test:jev
```

Os testes de Jev usam simulações locais, sem credencial nem chamada paga. O [workflow de CI](.github/workflows/validate-plugins.yml) executa os checks obrigatórios em PRs e na main. Consulte o resultado do commit exercitado; contagem de testes e tempo não são metas fixas do projeto.

Para testar o plugin do checkout, sem publicar:

```bash
claude --plugin-dir ./plugins/xp-stack
```

Aplique as convenções de contribuição do [CLAUDE.md](CLAUDE.md), os gates pertinentes ao incremento e a revisão exigida. Não é necessário executar uma bateria pesada em toda edição de prosa; mudanças de comportamento ou contrato precisam de suas provas.

## Histórico e licença

O projeto nasceu da extração de práticas reutilizáveis do ecossistema Meteora Digital. As escolhas históricas de modelos, mecanismos e documentação estão no [CHANGELOG](CHANGELOG.md) e nas ADRs do [CLAUDE.md](CLAUDE.md); não são defaults obrigatórios da versão atual.

MIT — copyright **Rafael Nobre de Souza**. A [LICENSE](LICENSE) da raiz é a fonte; o plugin distribui uma cópia conferida pelo CI.
