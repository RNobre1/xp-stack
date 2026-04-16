# Marketplace Structure — Overview

**Data:** 2026-04-15
**Status:** CONCLUIDO em 2026-04-15
**Objetivo:** Transformar o repo `RNobre1/claude-craft` de POC isolado em marketplace Claude Code funcional, seguindo a estrutura definida na secao 10 da pesquisa `replicar-stack-claude-code.md` (O Agente). O plugin `xp-stack` sera o unico plugin listado, com skeleton completo (dirs + placeholders) pronto para receber conteudo real nas tasks subsequentes (`extract-portable-skills`, `write-bootstrap-skill`).

---

## Diagnostico

O POC `poc-bootstrap` (branch `feat/poc-bootstrap`, 4 commits) validou que `!command` + `${CLAUDE_SKILL_DIR}` funciona em plugin real. O repo hoje tem:

- `plugins/poc-bootstrap/` — plugin throwaway (preservar como registro historico)
- `tests/scaffold_test.sh` — testes puro bash do POC
- `docs/tasks/poc-bootstrap/` — docs do POC (CONCLUIDO)
- `.gitignore`

**Falta:** marketplace.json, plugin `xp-stack`, CI, CLAUDE.md do projeto, README, LICENSE. Ou seja, falta tudo que transforma este repo num marketplace distribuivel.

**Referencia estrutural:** `ivan-magda/claude-code-plugin-template` [ref 9] para CI e convenccoes, `anthropics/claude-plugins-official` [ref 7] para schema canonico de marketplace.json. Nao e fork de nenhum — estrutura propria seguindo docs oficiais [refs 1-4].

---

## Decisoes ja tomadas (nao redecidir nas T-files)

1. **`plugins/poc-bootstrap/` permanece intacto.** A regra "nao apagar esta pasta nunca" do POC se mantem. O marketplace.json NAO lista o poc-bootstrap — ele e artefato historico, nao plugin distribuivel. Coexiste com `xp-stack` no mesmo repo sem conflito.

2. **Estrutura do marketplace segue secao 10 da pesquisa** com dois ajustes pragmaticos:
   - `install-global-rules/` **excluido do skeleton** — grade D, precisa de POC proprio (secao 9 da pesquisa). Entra como follow-up futuro, nao agora.
   - Conteudo real de skills/agents/templates **nao entra nesta task**. Placeholders com frontmatter valido e corpo minimo. Conteudo vem de `extract-portable-skills` e `write-bootstrap-skill`.

3. **Plugin name:** `xp-stack`. Invocacao namespaced: `/xp-stack:bootstrap`, `/xp-stack:akita-xp-rules`, etc.

4. **Marketplace name:** `claude-craft`. Source type `local` apontando pra `./plugins/xp-stack`.

5. **CI:** GitHub Actions com validacao de JSON syntax + campos obrigatorios + dirs existentes. Inspirado em `ivan-magda/claude-code-plugin-template` (validate-plugins.yml) e `anthropics/claude-plugins-official` (validate-marketplace.yml + validate-frontmatter.yml). Simplificado: um unico workflow com 3 jobs (marketplace, plugin, frontmatter).

6. **Testes locais:** puro bash em `tests/`, mesmo padrao do POC. Sem dependencias externas. Reutilizar o harness (pass/fail/cleanup pattern) do `scaffold_test.sh`.

7. **CLAUDE.md do projeto:** este repo precisa do seu proprio CLAUDE.md como fonte da verdade para desenvolvimento do marketplace. Conteudo minimo: nome, objetivo, stack, estrutura, decisoes, estado atual.

8. **README.md:** instrucoes de instalacao (`/plugin marketplace add`, `/plugin install`), overview do que o plugin oferece. Necessario pra marketplace publico.

9. **LICENSE:** MIT (mesmo do ivan-magda template, compativel com uso amplo).

---

## Estrutura alvo (secao 10 da pesquisa, adaptada)

```
RNobre1/claude-craft/
├── .claude-plugin/
│   └── marketplace.json                      # lista xp-stack (source local)
├── .github/workflows/
│   └── validate-plugins.yml                  # CI: JSON + frontmatter + dirs
├── plugins/
│   ├── poc-bootstrap/                        # [preservado — artefato historico do POC]
│   │   └── (conteudo existente, nao tocar)
│   └── xp-stack/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── skills/
│       │   ├── akita-xp-rules/SKILL.md
│       │   ├── tdd-conventions/SKILL.md
│       │   ├── task-decomposition/SKILL.md
│       │   ├── research-cycle/SKILL.md
│       │   └── bootstrap/
│       │       ├── SKILL.md
│       │       └── scripts/
│       │           └── scaffold.sh           # placeholder — real vem de write-bootstrap-skill
│       ├── agents/
│       │   ├── researcher.md
│       │   ├── research-critic.md
│       │   ├── tdd.md
│       │   └── reviewer.md
│       ├── templates/
│       │   ├── CLAUDE.md.template
│       │   ├── docs-tasks-template/
│       │   │   └── 00-overview.md.template
│       │   ├── docs-pesquisas-template/
│       │   │   └── pesquisa.md.template
│       │   └── claude-settings-project.json
│       ├── .mcp.json                         # stubs MCPs com userConfig
│       ├── README.md
│       └── LICENSE
├── plugins/poc-bootstrap/                    # [preservado]
├── tests/
│   ├── scaffold_test.sh                      # [preservado — testes do POC]
│   ├── marketplace_test.sh                   # T1: valida marketplace.json + plugin.json
│   └── skeleton_test.sh                      # T2: valida completude do skeleton
├── docs/tasks/
│   ├── poc-bootstrap/                        # [preservado]
│   └── marketplace-structure/                # esta task
├── CLAUDE.md                                 # T3: fonte da verdade do projeto
├── README.md                                 # T3: instrucoes de instalacao
├── LICENSE                                   # T3: MIT
└── .gitignore                                # [existente, possivel update]
```

---

## Tasks (ordem de execucao)

| Task | Nome | Dependencia | Estimativa | Status |
|------|------|------------|------------|--------|
| [T1](T1-manifests-ci.md) | Manifests (marketplace.json + plugin.json) + CI + testes de validacao | Nenhuma | P (~40min) | [x] Concluida (d5771aa, 4eab597) |
| [T2](T2-plugin-skeleton.md) | Skeleton completo do plugin xp-stack (dirs + placeholders com frontmatter valido) | T1 | M (~40min) | [x] Concluida (73c2f06, 293e57a) |
| [T3](T3-meta-load-test.md) | CLAUDE.md + README + LICENSE + validacao empirica (load test via `claude --plugin-dir`) | T2 | P (~30min) | [x] Concluida (c054d8b) |

Total estimado: **~2h**, consistente com estimativa da secao 11 da pesquisa.

---

## Criterios de sucesso

- [x] `bash tests/marketplace_test.sh` — exit 0, 9/9 green (T1)
- [x] `bash tests/skeleton_test.sh` — exit 0, 12/12 green (T2)
- [x] `claude --plugin-dir ./plugins/xp-stack` carrega plugin, 5 skills + 4 agents com namespace `xp-stack:` (T3)
- [ ] GitHub Actions CI passa em push da branch (pendente push)
- [x] `CLAUDE.md` existe na raiz com conteudo conforme Regra 1 do CLAUDE.md global (T3)
- [x] `plugins/poc-bootstrap/` intacto (nenhum arquivo alterado, scaffold_test.sh 5/5 green)

## Criterios de falha

- marketplace.json ou plugin.json com syntax invalida
- CI nao roda ou nao detecta erros intencionais
- `claude --plugin-dir` nao reconhece o plugin
- Skills nao aparecem namespaced como `xp-stack:*`
- Qualquer alteracao em `plugins/poc-bootstrap/` ou `~/.claude/` global

---

## Ao finalizar

1. Atualizar este `00-overview.md` com status CONCLUIDO.
2. Abrir PR `feat/marketplace-structure` -> `main` com descricao referenciando a secao 10 da pesquisa.
3. Proximas tasks desbloqueadas: `extract-portable-skills`, `write-bootstrap-skill` (secao 11 da pesquisa).
