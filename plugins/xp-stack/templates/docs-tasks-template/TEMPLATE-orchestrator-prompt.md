# {{Feature}} — Orchestrator Prompts

> This is a prompt template, not a global dispatch policy. Before dispatching, consult the current session's Agent Selection Guide, Host concurrency policy, available mechanisms, and the authorization already granted. Model, profile, isolation, UI, and communication style are selected there; this template does not make `Sonnet`, Agent View, or `caveman` universal.

> Use this prompt when parallel work is useful and authorized. For one task, execute the T-file in the current session. For explicit opt-in alternatives, see `xp-stack:local-waves` and `xp-stack:paperclip-orchestrator`.

---

## Mental model

- **Orchestrator** = the current session. It reads the contract, coordinates work, and records decisions.
- **Workers** = isolated task contexts when the selected mechanism and Host policy support them. Each receives one T-file and returns evidence or a checkpoint.
- **Evidence contract** = the **Delivery evidence contract** in `xp-stack:akita-xp-rules`; task files provide slots and links instead of redefining its fields.
- **Final reviewer** = an independent context or responsibility selected by policy and risk. Author self-inspection prepares the handoff but is not a universal substitute.

## Dispatch pattern

For each independent T-file in the wave, use the native dispatch mechanism selected by the session. This pseudo-call shows the contract without choosing a model or UI:

```ts
Agent({
  description: "T1 — {{slug}}",
  isolation: "{{selected by session/Host policy, when supported}}",
  // Add model/profile only when explicitly selected by the current policy.
  prompt: `Você é o executor da task T1 na wave {{N}} do feature {{feature-slug}}.

Leia e execute integralmente:
docs/tasks/{{feature-slug}}/T1-{{slug}}.md

Contexto obrigatório:
- docs/tasks/{{feature-slug}}/00-overview.md
- CLAUDE.md (e AGENTS.md se o projeto os usar como fonte única)
- {{outros docs relevantes da feature}}

Contrato de trabalho:
- Preserve os arquivos ALLOWED/FORBIDDEN e o escopo do T-file.
- Siga RED → GREEN → REFACTOR → VERIFY para o incremento, sem inventar RED histórico.
- Registre comandos, árvore/base/candidato, exit codes, logs e guardas aplicáveis no T-file.
- Faça autoinspeção preparatória antes da entrega.
- Se houver triagem opcional selecionada pela sessão, retorne achados no formato do contrato; triagem não aprova nem edita sua implementação.
- Em caso de bloqueio, preserve WIP, descreva o estado e o próximo passo exato.

Quando terminar, devolva: comportamento observado, evidências e limites, estado da árvore, alterações pendentes, revisão/triagem (se houver) e bloqueios. Faça commit ou abra PR somente se isso estiver autorizado pelo fluxo atual.`
})
```

Dispatch independent tasks in the same orchestration turn when the mechanism supports parallelism. If it does not, run them serially or use an explicitly selected `xp-stack:local-waves` or `xp-stack:paperclip-orchestrator` flow; do not silently substitute a different mechanism.

## Why each field

| Field | Why |
|---|---|
| `description` | Identifies the T-file and increment in status/output. |
| `isolation` | Protects independent work when the selected mechanism supports worktrees or another isolation boundary. |
| `model` / `profile` | Deliberate session choices. Omit them unless the current policy or Pilot selected them. |
| `prompt` | Supplies the minimum project context and routes evidence to the shared contract. |

## Coordination rules

- Do not rebase or edit another worker's branch while it is in flight.
- The orchestrator records decisions and updates `PROGRESS.md` after integrating the relevant evidence; workers do not rewrite shared progress concurrently.
- Run focused tests and other guards selected by impact. A full suite belongs at the integration boundary or where project policy requires it; do not run it by reflex.
- A worker stops and reports when it needs a forbidden file, a new authorization, a credential, or a business decision. Preserve a checkpoint instead of widening scope.
- An already-granted authorization is sufficient for the exact scoped action. Record it and proceed; ask only for a new or expanded action.
- A clean commit is not a completion condition. Pending changes and WIP belong in the checkpoint/evidence record.

## Sequence for a wave

1. Read `00-overview.md`, identify independent increments, and confirm base, allowed files, dependencies, and current authorization.
2. Dispatch workers through the selected mechanism with isolated contexts when available.
3. Collect each report and compare its base/candidate, diff, behavior, and evidence with the T-file.
4. Run focused guards required by impact; classify missing or inconclusive evidence instead of calling it green.
5. If the session selected an optional triage pass, give it the accepted scope, criteria, base/candidate, diff, consumers, and available evidence. It reports findings with location, case, expected/observed, evidence, severity, and confirmation.
6. Send confirmed findings to the author. The author reproduces and corrects them; triage rechecks only the changed delta and property.
7. Arrange the independent final review required by policy or risk (for example, Opus when the session routes it there). The reviewer decides from the candidate and evidence; triage or self-inspection does not approve it.
8. Integrate, open a PR, merge, or pause according to the session and project authorization. Record the decision and update progress.

## Review outcomes

Use the status that matches the evidence:

- **Blocked:** required authorization, dependency, or correction is missing.
- **Inconclusive:** evidence or behavior could not be established; it is not approval.
- **Ready for independent review:** focused guards and handoff evidence are captured.
- **Accepted:** the independent reviewer and required gates accepted the identified candidate under the authorized policy.
- **Checkpoint:** WIP/pending changes and the exact next step are recorded; this is resumable progress, not a completed delivery.

## Explicit opt-in mechanisms

- **Native Agent/Agent View:** use when the current session exposes it and its policy/capacity permit it. It is a mechanism choice, not a requirement.
- **`xp-stack:local-waves`:** local, headless `claude -p` workers for explicitly selected non-interactive or fallback execution. Read that skill before setup.
- **`xp-stack:paperclip-orchestrator`:** remote async Paperclip scheduling and its configured gates. Read that skill before setup.
- **Legacy `TERMINAL-PROMPTS.md`:** use only when the selected local mechanism requires it.

If a preferred mechanism regresses or is unavailable, choose another authorized mechanism and record the choice in the feature overview. Do not hardcode a model, compression skill, UI, or merge actor into the project-wide rules.
