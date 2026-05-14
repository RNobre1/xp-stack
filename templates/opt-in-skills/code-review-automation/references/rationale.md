# Rationale — code-review-automation skill

## Diagnóstico que originou esta skill

Em auditoria no projeto `agentes-internos` (Meteora AI Platform, 2026-05):
- 10 PRs recentes no projeto — **zero evidências de code review estruturado** antes de merge
- Skill `superpowers:requesting-code-review` listada no CLAUDE.md como mandatory
- `reviewer.md` slash command existia em `.claude/commands/` mas **nunca invocado** (git log mostra zero menções em commits ou PR bodies)
- Projeto usa Agent View: orchestrator Opus dispatcha workers Sonnet para waves paralelas — código gerado por múltiplos workers converge em PRs sem review de capacidade superior
- Padrão: orchestrator termina wave → abre PR → Pilot merga → descoberta tardia de bugs

Resultado: o slash command existia mas sem gate que forçasse sua invocação.

## O problema raiz: slash command sem hook de enforcement

`reviewer.md` como slash command opcional = documento morto. Quando orchestrator está focado em terminar wave e abrir PR, não há atrito visível que force o self-review. O hook `pre-tool-use` que debugging-discipline instalou não cobria `gh pr create`/`gh pr merge` — apenas Edit/Write.

Gates que esta skill instala:
- **PreToolUse matcher para Bash** com grep em `gh pr (create|merge)` → lembrete visível no momento exato antes do PR abrir
- **Seção obrigatória no PR template** → Pilot vê campos vazios se orchestrator pulou o review; não-compliance é visível
- **Slash command estruturado** → não apenas "faça um review", mas protocol exato com adversarial persona, checklist, categorização, e decisão explícita Block/Must Fix/Suggestion

## Referência: pesquisa Couch 2025 sobre viés de reviewer

Simon Couch (2025) — *"Position bias and family bias in LLM code review"*:
- LLMs apresentam **position bias dominante**: tendem a aprovar código apresentado primeiro ou em posição de destaque
- **Family bias** (mesmo modelo revisa próprio output) é menor que position bias, mas real e mensurável: blind spots sistemáticos compartilhados entre generator e reviewer do mesmo modelo
- Mitigação mais documentada e eficaz: **adversarial persona prompting** — instruir o reviewer a "assumir que código está errado" antes de começar

Aplicação aqui:
- Workers = Sonnet (geração rápida)
- Reviewer = Opus (sessão principal, maior capacidade de raciocínio)
- Persona adversarial injeta viés oposto ao natural ("validar") → reviewer procura ativamente falhas

## Referência: Agent View blog post Meteora (2026-05-11)

Decisão de adotar Agent View nativo (ADR-0024) como padrão de paralelização:
- Orchestrator Opus dispatcha workers Sonnet via Agent tool com `isolation: "worktree"` + `model: "sonnet"`
- Workers reportam findings ao orchestrator; orchestrator consolida e abre PRs
- Problema identificado: gap entre "workers terminam" e "PR abre" — nenhum checkpoint de review estruturado
- Esta skill preenche exatamente esse gap

## Complementaridade com debugging-discipline

`debugging-discipline` (instalada antes na maioria dos projetos xp-stack) cobre:
- PreToolUse hook no Edit/Write (lembra systematic-debugging antes de editar)
- PR template com seção fix-workflow (Hypotheses / Root cause / Regression test)

`code-review-automation` **não conflita** — estende:
- Appenda matcher novo ao hook existente (grep `gh pr` em vez de Edit/Write)
- Appenda seção nova ao PR template existente (self-review findings em vez de fix-workflow)
- Adiciona slash command que debugging-discipline não instala

Script `setup-code-review-automation.sh` detecta debugging-discipline instalado e faz append idempotente. Projetos com ambas as skills têm coverage completo:
- Edit/Write → lembrete systematic-debugging
- `gh pr create`/`merge` → lembrete /review-pr
- PR template → seção fix-workflow + seção self-review findings

## Por que orchestrator é o reviewer (não subagent)

Dispatchar subagent reviewer cria:
- Custo adicional de contexto (subagent não tem o plano, T-files, reports dos workers)
- Latência de dispatch + espera
- Output do subagent chega como texto — orchestrator ainda precisa processar e decidir

Orchestrator como reviewer:
- Já tem o contexto completo
- Executa review na thread principal → Pilot vê em tempo real
- Capacidade Opus real (não Sonnet mascarando Opus)
- Zero overhead de dispatch

Único trade-off: orchestrator pode ter blind spot na própria wave. Mitigado por adversarial persona + checklist explícito que força questionar cada arquivo.
