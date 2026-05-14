# {{Feature}} — Orchestrator Prompts (Agent View)

> **Padrão Agent View (canônico desde 2026-05-11):** o orquestrador dispara N tasks paralelas via `Agent` tool nativo + `claude agents` UI. Cada worker é Sonnet em worktree isolado. Substitui o legado `TERMINAL-PROMPTS.md` (copy-paste em N terminais).

> **Quando NÃO usar:** se você não tem acesso ao Claude Code interativo (ex.: rodar em CI, em script headless), use `xp-stack:local-waves` como fallback. Pra multi-developer async use `xp-stack:paperclip-orchestrator`.

---

## Mental model

- **Orchestrator** = sessão Claude Code Opus-class atual. Lê T-files, dispara workers, consolida resultados, faz merge.
- **Workers** = N Agent tool calls Sonnet-class. Cada um em worktree isolado (`isolation: "worktree"`). Invoca `caveman:caveman` no início pra ultra-compressar comunicação com o orchestrator.
- **Agent View** = UI do Claude Code (`claude agents` ou seta esquerda) que mostra status de cada worker em tempo real.

---

## Padrão de dispatch (Agent tool)

Pra cada T-file da wave, o orquestrador faz **um** Agent tool call. Exemplo TypeScript pseudo-code:

```ts
Agent({
  description: "T1 — {{slug}}",
  subagent_type: "general-purpose",
  model: "sonnet",
  isolation: "worktree",
  prompt: `Antes de qualquer outra coisa, invoque a skill caveman:caveman pra ultra-compressar comunicação.

Você é o worker T1 da wave {{N}} do feature {{feature-slug}}. Leia e execute integralmente o arquivo:
docs/tasks/{{feature-slug}}/T1-{{slug}}.md

Branch: feat/{{feature-slug}}-T1 (já criado pelo worktree).
Contexto obrigatório:
- docs/tasks/{{feature-slug}}/00-overview.md (plano geral)
- CLAUDE.md (convenções)
- {{outros docs relevantes da feature}}

Metodologia:
- TDD absoluto (RED → GREEN → REFACTOR → VERIFICATION)
- Conventional commits (sem Co-Authored-By: Claude)
- Files ALLOWED/FORBIDDEN do T-file são lei
- Ask before assume (use AskUserQuestion se ambíguo)

Quando terminar:
- Commit local no worktree (não push ainda — orchestrator coordena)
- Reporte em caveman: o que foi feito, hash do commit, blockers se houver
- NÃO abra PR — orchestrator consolida e abre PRs separados`
})
```

Repita pra cada task independente da wave (T2, T3, ...). Todos disparados na MESMA mensagem do orquestrador → correm em paralelo (Agent View mostra status).

---

## Por que cada campo

| Campo | Por quê |
|---|---|
| `model: "sonnet"` | Custo + velocidade. Orchestrator é Opus (planning); workers são Sonnet (execution). Skill `caveman:caveman` reduz tokens ~75% adicional. |
| `isolation: "worktree"` | FS isolation. Cada worker tem checkout próprio do main. Sem race condition em arquivos compartilhados. |
| `subagent_type: "general-purpose"` | Tools `*`. Pra `Explore` (search only) ou `Plan` (design only) use os tipos específicos. |
| Prompt invoca `caveman:caveman` no início | Pilot rule. Ultra-compressa output do worker pro orchestrator. Mantém precisão técnica. |
| **Reviewer = orquestrador atual** | NÃO existe `subagent_type: "reviewer"` dispatched no fluxo. O orquestrador da sessão é o reviewer. Combate viés família (Opus revisa Sonnet) + adversarial persona via `/review-pr` ou checklist manual. Subagent reviewer só faz sentido em **research review** (`research-critic`), não code review. |

---

## Coordination rules

- **Sem rebase entre branches paralelas mid-flight.** Workers commitam no próprio worktree.
- **PROGRESS.md é atualizado pelo orchestrator no merge** — nunca pelo worker (evita conflict).
- **Pre-flight obrigatório:** orchestrator roda `bun run check` (lint + typecheck + test) ANTES de abrir o PR de cada T.
- **Workers param e reportam** se: precisam tocar file FORBIDDEN, encontram bug pré-existente, hit blocker.
- **Orchestrator NÃO self-merge** PRs — Pilot revisa e mergeia (regra Akita).

---

## Sequência típica de uma wave

1. Orchestrator lê `00-overview.md` e identifica a próxima wave (tasks pending + no deps abertas).
2. Orchestrator dispara N Agent tool calls em UMA mensagem (paralelo nativo).
3. Agent View UI mostra status (working / waiting input / completed).
4. Quando todos voltarem: orchestrator lê reports, roda `bun run check` em cada worktree.
5. **Orchestrator self-review (NÃO dispatch reviewer subagent):** pra cada worktree do worker que terminou, o orquestrador:
   a. `cd <worker-worktree-path>`
   b. `git diff main...HEAD` (vê o que de fato mudou)
   c. **Invoca `/review-pr`** (instalado por `xp-stack add-skill code-review-automation`) OU executa checklist manual:
      - Adversarial persona: "assuma código ERRADO até prova em contrário"
      - Correctness · OWASP · conventions · test coverage · YAGNI
   d. Categoriza findings: Block / Must Fix / Suggestion / Nit
   e. **Se Block findings:** NÃO abre PR. SendMessage pro worker (agentId ainda vivo) OU edit direto + commit. Re-review.
   f. **Se Must Fix / Suggestion / Nit apenas:** safe pra abrir PR. Cola findings no PR body sob `## Orchestrator self-review findings`.

   > **Por que self-review e não subagent reviewer?** Workers são Sonnet, orquestrador é Opus — capacidade diferente dentro da família combate blind spots compartilhados. Subagent reviewer Sonnet teria os mesmos blind spots dos workers. Adversarial persona reforça anti-viés.
6. Orchestrator abre 1 PR por T-file (atualiza status em PROGRESS.md).
7. Pilot revisa + mergeia PRs.
8. Orchestrator avança pra próxima wave.

---

## Fallback se Agent View regredir (Research Preview)

- `xp-stack:local-waves` — `claude -p` headless em worktrees (Sonnet workers, sem UI)
- `xp-stack:paperclip-orchestrator` — async remoto droplet (multi-dev)
- `TERMINAL-PROMPTS.md` legado (não recomendado, mas funciona) — copy-paste em N terminais

Quando rolar back: avise no `00-overview.md` da feature qual padrão usado.
