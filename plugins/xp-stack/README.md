# xp-stack para Claude Code

Plugin de metodologia XP/Akita: TDD, pesquisa com fontes, incrementos utilizáveis e revisão independente baseada em evidências. Modelo, provider, mecanismo de despacho e permissões vêm da sessão e do projeto.

A versão deste canal está no [manifest do plugin](.claude-plugin/plugin.json). Ela é independente da versão do npm CLI. O [guia principal](../../README.md) reúne instalação, atualização, comandos e limites atuais; o [CHANGELOG](../../CHANGELOG.md) preserva o histórico.

## Instalação pelo marketplace

```text
/plugin marketplace add RNobre1/xp-stack
/plugin install xp-stack@xp-stack
```

Para scaffold de um projeto ainda não preparado, invoque `/xp-stack:bootstrap`. Ele é manual e não precisa ser reexecutado a cada atualização. Para instalação por projeto em diferentes engines, use o npm CLI descrito no guia principal.

```text
/plugin marketplace update xp-stack
/plugin update xp-stack@xp-stack
```

A atualização troca o conteúdo do plugin; arquivos já copiados por setups permanecem sob controle do projeto. Confira a descoberta no catálogo se também usa cópias via npm ou diretório global, evitando versões concorrentes da mesma skill.

## Conteúdo e uso

As [skills do plugin](skills/) incluem regras metodológicas, convenções de teste, decomposição, pesquisa e orientação para GitHub Actions. As [definições de agents](agents/) oferecem pesquisa, crítica, TDD e revisão no formato do Claude Code. Consulte a descrição de cada skill; disponibilidade não autoriza executar setups, publicar ou alterar infraestrutura.

Invocação neste canal usa `/xp-stack:<nome>`, por exemplo `/xp-stack:research-cycle`. O nome sem namespace é a referência portátil nos briefings. Quem não tem loader recebe o excerto literal do contrato, com referência e revisão.

O [Delivery flow](skills/akita-xp-rules/references/delivery-flow.md) é a fonte do fluxo vigente: guardas proporcionais, evidência de reuso, revisão independente e estado único. A [auditoria de testes](skills/akita-xp-rules/references/test-cost-audit.md) e o [prompt reutilizável](skills/akita-xp-rules/references/test-cost-audit-prompt.md) ajudam a reduzir custo sem remover proteção por meta de contagem. O plugin não escolhe workers nem instala um runner de portão completo.

## Capacidades opcionais

- [Jev](skills/jev-triage/SKILL.md): invocação manual para casos sintéticos restritos; requer configuração própria de orçamento/credencial para API. Não substitui testes, não decide gates e não tem benefício de triagem demonstrado por esta distribuição.
- [Durable Host Runs](skills/durable-host-runs/SKILL.md): comando identificado sob `systemd --user` no Linux, com deduplicação e recibos. Não reserva recursos nem substitui a fila. Distribuído neste plugin ou por cópia pessoal versionada; não está no registry do `xp-stack add-skill`.
- [Paperclip](skills/paperclip-orchestrator/SKILL.md) e [local-waves](skills/local-waves/SKILL.md): mecanismos de orquestração com setup explícito, conforme capacidade e política da sessão.

Outras opções do npm CLI, como lembretes de debug/revisão e análise de banco, vivem em fontes separadas. Consulte o [registry do CLI](../../src/lib/opt-in-registry.js) no repositório; não presuma que todo opt-in seja carregado por este plugin.

O plugin não declara MCPs por padrão. Serviços externos, credenciais e ferramentas pessoais são configurados separadamente. `motion-director` e `grill-me` não são distribuídas aqui.

## Licença

MIT — copyright Rafael Nobre de Souza. Veja a [LICENSE distribuída](LICENSE).
