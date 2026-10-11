# {{Feature}} — Orchestrator Prompts

> This is a prompt template, not a global dispatch policy. Before dispatching, consult the current session's Agent Selection Guide, Host concurrency policy, available mechanisms, and the authorization already granted. Model, profile, isolation, UI, and communication style are selected there; this template defines no named defaults.

> Use this prompt when parallel work is useful and authorized. For one task, execute the T-file in the current session. For explicit opt-in alternatives, see `local-waves` and `paperclip-orchestrator` (plugin namespaces may prefix these names when the plugin is the loader).

> **Contract source:** {{resolved path/URI supplied by the environment to `akita-xp-rules/SKILL.md`}}
> **Contract revision:** `2026-10-11.1`
> **Delivery-flow source/revision:** {{resolved `akita-xp-rules/references/delivery-flow.md` URI}} | `2026-10-11.1`
> **Authorization reference:** {{concrete T-file/briefing/session-artifact section or decision ID}}

---

## Mental model

- **Orchestrator** = the current session. It reads the contract, coordinates work, and records decisions.
- **Workers** = isolated task contexts when the selected mechanism and Host policy support them. Each receives one T-file and returns evidence or a checkpoint.
- **Delivery flow** = the portable `delivery-flow.md` reference. Include its revision and attach the relevant literal excerpt for a worker without a skill loader.
- **Evidence contract** = the shared contract in `akita-xp-rules`; task files provide slots and links instead of redefining its fields.
- **Final reviewer** = a policy-selected reviewer with identity and evidence independent from the author. Follow the same-model and high-risk counterproof rules in `delivery-flow.md`; author self-inspection never approves its own work.

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

Contract source: {{resolved path/URI supplied by the environment to akita-xp-rules/SKILL.md}}
Contract revision: 2026-10-11.1
Delivery-flow source: {{resolved URI to akita-xp-rules/references/delivery-flow.md}}
Delivery-flow revision: 2026-10-11.1
If this worker has no skill loader, the sender MUST paste the exact relevant canonical excerpt from each source here, including its reference and revision. Do not send only the pointer.
Canonical excerpts for a worker without a skill loader:
[BEGIN akita-xp-rules / Delivery evidence contract — revision 2026-10-11.1]
{{paste the exact excerpt from the resolved source; do not rewrite it}}
[END akita-xp-rules / Delivery evidence contract]

[BEGIN akita-xp-rules / delivery-flow.md — revision 2026-10-11.1]
{{paste the exact relevant excerpt from the resolved source; do not rewrite it}}
[END akita-xp-rules / delivery-flow.md]

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

Dispatch independent usable increments in the same orchestration turn when the mechanism supports them. The default batch is up to two deliverables; a larger batch needs a capacity/risk justification, and a ready result need not wait to fill it. If the mechanism does not support parallelism, run serially or use an explicitly selected alternative; do not silently substitute a mechanism.

## Why each field

| Field | Why |
|---|---|
| `description` | Identifies the T-file and increment in status/output. |
| `isolation` | Protects independent work when the selected mechanism supports worktrees or another isolation boundary. |
| `model` / `profile` | Deliberate session choices. Omit them unless the current policy or Pilot selected them. |
| `prompt` | Supplies the minimum project context and routes evidence to the shared contract. |

## Coordination rules

- Do not rebase or edit another worker's branch while it is in flight.
- The orchestrator updates the single task-status authority and refreshes derived `PROGRESS.md` only when used; workers do not rewrite shared status concurrently.
- Run focused tests and other guards selected by impact. A full suite belongs at the integration boundary or where project policy requires it; do not run it by reflex.
- A worker stops and reports when it needs a forbidden file, a new authorization, a credential, or a business decision. Preserve a checkpoint instead of widening scope.
- An already-granted authorization is sufficient for the exact scoped action. Record the concrete T-file/briefing/session-artifact reference or decision ID and proceed; ask only for a new or expanded action.
- A clean commit is not a completion condition. Pending changes and WIP belong in the checkpoint/evidence record.

## Sequence for a wave

1. Read `00-overview.md`, identify independent increments, and confirm base, allowed files, dependencies, and current authorization.
2. Dispatch workers through the selected mechanism with isolated contexts when available.
3. Collect each report and compare its base/candidate, diff, behavior, and evidence with the T-file.
4. Run focused guards required by impact; classify missing or inconclusive evidence instead of calling it green.
5. If the session selected an optional triage pass, give it the accepted scope, criteria, base/candidate, diff, consumers, and available evidence. It reports findings with location, case, expected/observed, evidence, severity, and confirmation.
6. Send confirmed findings to the author. The author reproduces and corrects them; triage rechecks only the changed delta and property.
7. Arrange the independent final review required by policy or risk. Verify reviewer identity differs from author identity; model diversity is recommended, while the same-model choice requires explicit Pilot selection and recording. For high risk with the same model, require a mechanical counterproof or an additional reviewer with a different model. The reviewer declares checks executed now or fresh external evidence before deciding; triage or self-inspection does not approve it.
8. Integrate, open a PR, merge, or pause according to the session and project authorization. Record the decision and update progress.

## Review outcomes

Use the status that matches the evidence:

- **Blocked:** required authorization, dependency, or correction is missing.
- **Inconclusive:** evidence or behavior could not be established; it is not approval.
- **Ready for independent review:** focused guards and handoff evidence are captured, including the contract source and revision.
- **Accepted:** the policy-required independent reviewer and required gates accepted the identified candidate under the authorized policy, with checks now or fresh external evidence declared.
- **Checkpoint:** WIP/pending changes and the exact next step are recorded; this is resumable progress, not a completed delivery.

## Explicit opt-in mechanisms

- **Native Agent/Agent View:** use when the current session exposes it and its policy/capacity permit it. It is a mechanism choice, not a requirement.
- **`local-waves`:** local, headless workers for explicitly selected non-interactive or fallback execution. Read that skill before setup.
- **`paperclip-orchestrator`:** remote async Paperclip scheduling and its configured gates. Read that skill before setup.
- **Legacy `TERMINAL-PROMPTS.md`:** use only when the selected local mechanism requires it.

If a preferred mechanism regresses or is unavailable, choose another authorized mechanism and record the choice in the feature overview. Do not hardcode a model, compression skill, UI, or merge actor into the project-wide rules.
