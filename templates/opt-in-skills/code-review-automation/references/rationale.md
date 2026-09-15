# Rationale — code-review-automation skill

> This rationale records the historical gap that motivated the opt-in skill.
> Current routing follows the **Delivery evidence contract** in
> `xp-stack:akita-xp-rules`: author self-inspection prepares the handoff,
> optional triage reports facts, and independent final review follows the
> session/Host policy. The hook and PR section are reminders, not semantic
> enforcement.

## Diagnóstico que originou esta skill

Em auditoria no projeto `agentes-internos` (Meteora AI Platform, 2026-05):
- 10 PRs recentes no projeto — **zero evidências de code review estruturado** antes de merge
- Skill `superpowers:requesting-code-review` listada no CLAUDE.md como mandatory
- `reviewer.md` slash command existia em `.claude/commands/` mas **nunca invocado** (git log mostra zero menções em commits ou PR bodies)
- Projeto usa Agent View: orchestrator Opus dispatcha workers Sonnet para waves paralelas — código gerado por múltiplos workers converge em PRs sem review de capacidade superior
- Padrão: orchestrator termina wave → abre PR → Pilot merga → descoberta tardia de bugs

Resultado histórico: o slash command existia, mas não havia um lembrete visível no momento da abertura do PR.

## O problema raiz histórico: slash command sem hook de lembrete

`reviewer.md` como slash command opcional = documento morto. Na configuração auditada, quando o orchestrator estava focado em terminar wave e abrir PR, não havia atrito visível que lembrasse o self-review. O hook `pre-tool-use` que debugging-discipline instalou não cobria `gh pr create`/`gh pr merge` — apenas Edit/Write.

Artefatos que esta skill instala:
- **PreToolUse matcher para Bash** com grep em `gh pr (create|merge)` → lembrete visível no momento exato antes do PR abrir
- **Seção no PR template** → campos de evidência ficam visíveis se o responsável pulou o review; não-compliance é visível para o revisor, sem bloqueio automático
- **Slash command estruturado** → não apenas "faça um review", mas protocol exato com adversarial persona, checklist, categorização, e decisão explícita Block/Must Fix/Suggestion

## Referência: pesquisa Couch 2025 sobre viés de reviewer

Simon Couch (2025) — *"Position bias and family bias in LLM code review"*:
- LLMs apresentam **position bias dominante**: tendem a aprovar código apresentado primeiro ou em posição de destaque
- **Family bias** (mesmo modelo revisa próprio output) é menor que position bias, mas real e mensurável: blind spots sistemáticos compartilhados entre generator e reviewer do mesmo modelo
- Mitigação mais documentada e eficaz: **adversarial persona prompting** — instruir o reviewer a "assumir que código está errado" antes de começar

Aplicação na configuração histórica:
- O experimento escolheu Sonnet para geração e Opus para revisão, uma assimetria possível quando a sessão autoriza
- Persona adversarial injeta viés oposto ao natural ("validar") → reviewer procura ativamente falhas

## Referência: Agent View blog post Meteora (2026-05-11)

Decisão histórica de adotar Agent View nativo (ADR-0024) como padrão de paralelização:
- Orchestrator Opus dispatcha workers Sonnet via Agent tool com `isolation: "worktree"` + `model: "sonnet"`
- Workers reportam findings ao orchestrator; orchestrator consolida e abre PRs
- Problema identificado: gap entre "workers terminam" e "PR abre" — nenhum checkpoint de review estruturado
- Esta skill foi criada para preencher esse gap; a sessão atual pode escolher outro mecanismo

## Complementaridade com debugging-discipline

`debugging-discipline` (instalada antes na maioria dos projetos xp-stack) cobre:
- PreToolUse hook no Edit/Write (lembra systematic-debugging antes de editar)
- PR template com seção fix-workflow (Hypotheses / Root cause / Regression test)

`code-review-automation` **não conflita** — estende:
- Appenda matcher novo ao hook existente (grep `gh pr` em vez de Edit/Write)
- Appenda seção nova ao PR template existente (self-review findings em vez de fix-workflow)
- Adiciona slash command que debugging-discipline não instala

Script `setup-code-review-automation.sh` detecta debugging-discipline instalado e faz append idempotente. Projetos com ambas as skills deixam estes lembretes visíveis:
- Edit/Write → lembrete systematic-debugging
- `gh pr create`/`merge` → lembrete /review-pr
- PR template → seção fix-workflow + seção self-review findings

## Trade-off de revisão (decisão da sessão)

Uma autoinspeção do orquestrador pode aproveitar o contexto já aberto e reduzir
uma passagem de handoff, mas continua sendo preparação quando o risco exige
independência. Um revisor filho ou outro contexto pode ser selecionado pela
sessão quando trouxer uma perspectiva útil; não há proibição ou obrigação
universal.

Qualquer passe adicional consome tempo, contexto e cota conforme a conta
configurada. Meça a troca no experimento; não trate o passe como custo zero.

O revisor final usa contexto fresco ou responsabilidade distinta conforme a
política. A persona adversarial e o checklist ajudam, mas não transformam uma
autoinspeção em aprovação final.
