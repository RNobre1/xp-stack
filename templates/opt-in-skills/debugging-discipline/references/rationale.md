# Rationale — debugging-discipline skill

## Diagnóstico que originou esta skill

Em auditoria no projeto `agentes-internos` (Meteora AI Platform, 2026-05):
- 24 de 50 commits recentes eram `fix:` — **48% fix ratio** (threshold de atenção: 30%)
- Skill `superpowers:systematic-debugging` estava listada no `CLAUDE.md` como **obrigatória**
- Nenhum commit ou PR tinha evidência de "hypotheses ranked", "root cause" ou "regression test"
- **Zero** execuções documentadas da skill obrigatória

Resultado: documentação sem atrito não muda comportamento.

## O problema raiz: documentação sem gate

Quando uma regra existe só em texto (CLAUDE.md "use X skill"), ela não gera atrito. O agente lê, segue em frente, edita o código, commita. A regra existe no contexto mas não no workflow.

Gates concretos mudam isso:
- **PR template** com seção obrigatória para `fix:` → o PR *não pode ser submetido* sem preencher "Hypotheses ranked" e "Regression test". Torna o não-compliance visível para reviewer humano.
- **PreToolUse hook** → toda vez que o agente abre um arquivo para editar, vê o lembrete. Não bloqueia — não é o papel do hook bloquear (isso seria paternalismo). O papel é tornar a invocação consciente.

## Caso concreto: Composio L14/L15/L16

O módulo Composio no `agentes-internos` acumulou 3 fixes consecutivos:
- **L14**: SDK legado `composio-core@0.5.39` chamava endpoint v1 deprecated. 4 testes unitários passavam (mocks não cobriam HTTP real). Fix: upgrade SDK.
- **L15**: Composio v3 não emite `connected_account.created` via webhook. Fix: poll síncrono pós-OAuth.
- **L16**: `entityId` passado como email em vez de UUID Supabase. Cross-tenant safety bypassada.

Cada fix corrigiu um sintoma sem diagnosticar o sistema. Com debugging-discipline instalado:
- L14 teria gerado hipótese "SDK faz chamada para endpoint errado?" → contract test contra endpoint real antes de qualquer fix
- L15 teria mapeado o fluxo do webhook antes de codar — referência aos docs oficiais obrigatória
- L16 teria regression test de cross-tenant safety que falhasse com email e passasse com UUID

Resultado esperado: 3 commits `fix:` virariam 1 commit `fix:` com diagnóstico completo + regression test.

## Por que hook não bloqueia

Bloquear o Edit/Write tool introduz atrito destrutivo: o agente pode estar editando código *correto*, não um fix. O hook filtra por extensão de código (`.ts`, `.js`, etc.) e ignora `docs/`, mas não tem contexto semântico suficiente para saber "isso é um fix ou uma feature?". O gate semântico é o **PR template** — ali sim o agente declara o tipo e é forçado a preencher a seção de diagnóstico.

## Princípio Akita aplicado

A regra "TDD absoluto" do método Akita inclui, implicitamente, regression test para cada bug corrigido: o teste deve falhar com o bug presente e passar após o fix. Sem um gate no PR template que exija essa evidência, a regra fica na categoria "documentada mas não praticada". Esta skill fecha esse gap.
