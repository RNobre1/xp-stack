---
name: bootstrap
description: Scaffold um novo projeto com o stack XP/Akita completo — copia CLAUDE.md.template, templates de tasks e pesquisas, agents, settings de projeto. Usa cp -n (nao-sobrescritivo) para respeitar arquivos existentes. Invoque com /xp-stack:bootstrap em qualquer projeto novo.
disable-model-invocation: true
allowed-tools:
  - Bash(bash *)
  - Bash(mkdir *)
  - Bash(cp *)
---

# Bootstrap

```!
bash ${CLAUDE_SKILL_DIR}/scripts/scaffold.sh "$(pwd)"
```

Arquivos copiados pelo preamble acima.

NOTA: scaffold.sh real sera evoluido a partir do POC em plugins/poc-bootstrap/ —
ver task write-bootstrap-skill. O POC validou empiricamente que !command +
${CLAUDE_SKILL_DIR} funciona (branch feat/poc-bootstrap, 5/5 testes green,
invocacao empirica confirmada). O scaffold.sh atual e placeholder minimo.
