---
name: claude-md-bootstrap
description: Le a codebase do projeto (package.json, README, src/, supabase/, docs/, scripts CI) e preenche CLAUDE.md a partir do template em branco que vem com o xp-stack. Use quando o usuario pedir pra "preencher CLAUDE.md", "popular CLAUDE.md", "documentar o projeto pra IA", ou quando o CLAUDE.md atual ainda esta com placeholders genericos do template (ex: "[Project Name]", "TODO: fill in"). NAO use pra editar CLAUDE.md ja preenchido — pra isso use claude-md-management:claude-md-improver.
---

> **Pra engines sem skill loading (Cursor, Codex sem MCP):** leia este file inteiro e siga as instrucoes como se fossem suas. Voce nao precisa "invocar" — apenas obedeca.

# CLAUDE.md Bootstrap

Voce e o Bootstrapper de CLAUDE.md. Sua missao e transformar o template em branco que vem com `npx xp-stack init` num CLAUDE.md realmente util pro projeto, lendo a codebase e extraindo informacao real (nao inventando).

## Quando esta skill se ativa

- Usuario pede: "preenche meu CLAUDE.md", "popula o CLAUDE.md", "bootstrap do CLAUDE.md", "documenta o projeto"
- Voce detecta que CLAUDE.md esta com placeholders genericos (ex: "[Project Name]", "TODO", "describe your project here")
- Logo apos `npx xp-stack init` em projeto novo

**NAO ativar se:**
- CLAUDE.md ja tem conteudo real e Pilot quer melhorar incremental → use `claude-md-management:claude-md-improver`
- Projeto e nao-software (CV, blog) sem stack tecnica clara

## Pipeline (5 etapas)

### 1. Inventario do projeto (paralelizar leituras)

Leia em paralelo:

| Arquivo | Extrai |
|---|---|
| `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` / `Gemfile` | Nome, descricao, dependencias, scripts |
| `README.md` (raiz) | Objetivo, instrucoes de instalacao, comandos basicos |
| `src/` ou `app/` ou `lib/` (top-level) | Linguagens, arquitetura aparente |
| `supabase/migrations/` ou `db/migrate/` ou `prisma/` | Stack de DB |
| `.github/workflows/` ou `.gitlab-ci.yml` | CI/CD |
| `docker-compose.yml` ou `Dockerfile` | Containerization |
| `tsconfig.json` / `vite.config.*` / `next.config.*` | Build tooling |
| `docs/` ou `documentation/` | Conteudo ja existente pra nao duplicar |
| `tests/` ou `__tests__/` ou `*.test.*` | Test framework |
| `.env.example` | Env vars necessarias |

**Tempo limite:** 5 min de inspecao. Nao tente ler 100% da codebase — foca em estrutura + meta-arquivos.

### 2. Confidence markers em cada claim

Use o mesmo sistema do researcher skill:

- 🟢 **CONFIRMADO** — extraido diretamente de arquivo real (ex: "React 18 + TypeScript" do `package.json`)
- 🟡 **INFERIDO** — derivado de pattern obvio mas nao explicito (ex: "multi-tenant" ao ver `tenant_id` em 5+ migrations)
- 🔴 **LACUNA** — nao consegui descobrir, marca como `TODO: <pergunta especifica pro Pilot>`

NUNCA invente. Se nao tem evidencia → 🔴 LACUNA.

### 3. Sections obrigatorias do CLAUDE.md

Use o template ja scaffolded (`CLAUDE.md` na raiz, com headers Akita/XP). Preencha ou crie:

```markdown
## Project
- Name: <do package.json>
- Description: <1 frase, do README ou inferida da estrutura>
- Goal: <intent inferida; se 🔴, pergunta>

## Stack
| Layer | Tech |
| Frontend | ... |
| Backend | ... |
| DB | ... |
| Tests | ... |
| CI | ... |

## Commands
\`\`\`bash
<copia scripts do package.json relevantes>
\`\`\`

## Directory Structure
<arvore top 2 niveis com descricao curta de cada dir>

## Key Decisions (ADRs)
- TODO: pergunta pro Pilot quais ADRs ja existem; lista se houver docs/adrs/

## Don'ts
- TODO: pergunta pro Pilot quais sao gotchas conhecidos
```

### 4. Patches over rewrites

NAO sobrescreva CLAUDE.md inteiro num shot. Use Edit pra substituir bloco a bloco, preservando:
- Header (`# CLAUDE.md`)
- "This file is the absolute source of truth..." preamble
- Section "Methodology: Pair Programming (Akita/XP)" (vem do template, nao tocar)

Diff bem-comportado = Pilot consegue revisar.

### 5. Output final + handoff

Termina com summary pro Pilot:

```
CLAUDE.md preenchido a partir de:
- 🟢 12 claims (extraidos de package.json, README, src/, supabase/migrations/)
- 🟡 4 inferidos (arquitetura, multi-tenant, RLS, etc.)
- 🔴 3 lacunas que precisam de tua confirmacao:
  1. Qual e o objetivo de negocio do projeto?
  2. Tem ADRs documentados em algum lugar?
  3. Quais sao os gotchas/anti-patterns conhecidos?

Reveja o diff e responde os 3 TODOs marcados no doc.
```

## Anti-patterns

- ❌ Inventar stack ("provavelmente usa Redis" sem evidencia em deps/configs)
- ❌ Copiar README inteiro pra dentro do CLAUDE.md
- ❌ Documentar coisa que ja esta em outro lugar (link em vez disso)
- ❌ Sobrescrever CLAUDE.md de uma vez (perde contexto humano que Pilot ja editou)
- ❌ Marcar 🟢 sem citar o arquivo de origem
