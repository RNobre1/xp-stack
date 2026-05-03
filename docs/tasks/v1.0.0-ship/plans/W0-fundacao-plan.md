# W0 — Fundação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estabelecer fundação técnica de v1.0.0 — renomear repo `claude-craft` → `xp-stack`, criar npm package skeleton com primeiro subcomando funcional (`--version`), e definir 6 schemas JSON validáveis via Ajv.

**Architecture:** Node.js 18+ ESM package usando `commander` para roteamento de subcomandos. Schemas JSON sob `schemas/` validados por wrapper Ajv em `src/lib/validators.js`. Tests Vitest em paralelo aos tests bash existentes (sem conflito — testam coisas diferentes).

**Tech Stack:**
- Node.js 18+ (testado em 22.22)
- ESM modules (`"type": "module"`)
- `commander` ^12 (CLI subcommand router)
- `vitest` ^2 (test runner)
- `ajv` ^8 (JSON Schema validator)
- `ajv-formats` ^3 (date-time, uri, email format support)

---

## File Structure

Será criado/modificado:

| Path | Tipo | Responsabilidade |
|------|------|------------------|
| `.claude-plugin/marketplace.json` | Modify | Renomear marketplace `claude-craft` → `xp-stack` |
| `README.md` | Modify | Atualizar URLs `RNobre1/claude-craft` → `RNobre1/xp-stack` + badges |
| `CLAUDE.md` | Modify | Atualizar refs ao nome do repo + adicionar v1.0.0 ao histórico |
| `package.json` | Create | npm package descriptor (name=xp-stack, bin, scripts) |
| `bin/xp-stack` | Create | Entry point CLI (shebang Node, importa src/cli/index.js) |
| `src/cli/index.js` | Create | Commander router — registra subcomandos |
| `src/cli/commands/version.js` | Create | Handler do `--version` (lê package.json) |
| `src/lib/validators.js` | Create | Wrapper Ajv — load + validate schemas |
| `schemas/state.schema.json` | Create | Schema de `docs/tasks/{feature}/state.json` |
| `schemas/tasks.schema.json` | Create | Schema de `docs/tasks/{feature}/tasks.json` |
| `schemas/sources.schema.json` | Create | Schema de `docs/pesquisas/{slug}/sources.json` |
| `schemas/claims.schema.json` | Create | Schema de `docs/pesquisas/{slug}/claims.json` |
| `schemas/manifest.schema.json` | Create | Schema de `.xp-stack/manifest.json` |
| `schemas/index.schema.json` | Create | Schema de `.xp-stack/index.json` |
| `vitest.config.js` | Create | Config Vitest (ESM, paths, coverage opt-in) |
| `tests/cli/version.test.js` | Create | Test do subcomando version |
| `tests/lib/validators.test.js` | Create | Tests dos 6 schemas (positive + negative) |
| `.gitignore` | Modify | Adicionar `node_modules/`, `coverage/` |
| `.npmignore` | Create | Excluir tests, docs, .github do package publicado |

---

## Task 0: Rename `claude-craft` → `xp-stack`

**Files:**
- Modify: `.claude-plugin/marketplace.json` (linha 2)
- Modify: `README.md` (instruções `/plugin marketplace add`, links GitHub)
- Modify: `CLAUDE.md` (refs ao nome)
- Operation: `gh repo rename` no GitHub
- Operation: `mv` local + `git remote set-url`

> **Pré-requisito de ambiente:** `gh` CLI autenticado (`gh auth status`). Se não estiver, abortar e instruir Piloto a fazer `gh auth login`.

- [ ] **Step 1: Verificar working tree limpa e gh autenticado**

```bash
cd /home/rnobre/dev/claude-craft
git status
# Expected: "On branch feat/v1.0.0-ship" + "nothing to commit, working tree clean" OR só o overview já commitado

gh auth status
# Expected: "Logged in to github.com as RNobre1" (ou similar)
```

Se working tree não estiver limpa OU gh não autenticado: PARAR. Notificar Piloto.

- [ ] **Step 2: Renomear repo no GitHub**

```bash
cd /home/rnobre/dev/claude-craft
gh repo rename xp-stack --yes
# Expected: "github.com/RNobre1/claude-craft renamed to github.com/RNobre1/xp-stack"
```

GitHub mantém 301 redirect automático de `RNobre1/claude-craft` por anos — backward compat preservada.

- [ ] **Step 3: Atualizar `marketplace.json`**

Read current file:
```bash
cat /home/rnobre/dev/claude-craft/.claude-plugin/marketplace.json
```

Substituir `"name": "claude-craft"` por `"name": "xp-stack"` E `"description"` por descrição mais clara. Conteúdo final:

```json
{
  "name": "xp-stack",
  "description": "Marketplace do stack metodologico XP/Akita para Claude Code — TDD absoluto, pair programming, pesquisa formal, task decomposition, conventional commits, multi-agent orchestration, npm CLI multi-engine.",
  "owner": {
    "name": "Meteora Digital",
    "email": "vinicius@meteoradigital.com.br"
  },
  "plugins": [
    {
      "name": "xp-stack",
      "description": "Stack completo de metodologia XP/Akita para Claude Code: 4 agents (researcher, research-critic, tdd, reviewer), 8 skills (bootstrap, akita-xp-rules, tdd-conventions, task-decomposition, research-cycle, optimizing-github-actions, paperclip-orchestrator, local-waves), templates de projeto com AGENTS.md symlink convention.",
      "source": "./plugins/xp-stack",
      "category": "developer-tools",
      "tags": ["methodology", "tdd", "xp", "pair-programming", "bootstrap", "orchestration", "multi-agent"]
    }
  ]
}
```

- [ ] **Step 4: Atualizar README.md**

Substituir todas as ocorrências de `RNobre1/claude-craft` por `RNobre1/xp-stack` no README.md:

```bash
cd /home/rnobre/dev/claude-craft
grep -n "claude-craft" README.md
# Expected: ~10 matches (instruções de install, links, etc.)
```

Para cada match, substituir `claude-craft` → `xp-stack` exceto:
- Histórico em "Origem: extraído iterativamente do projeto O Agente" (não alterar — fato histórico)
- Linha do marketplace name no comando `/plugin marketplace add RNobre1/claude-craft` → vira `/plugin marketplace add RNobre1/xp-stack`

Comando seguro (preserva histórico em "Origem"):
```bash
cd /home/rnobre/dev/claude-craft
sed -i 's|RNobre1/claude-craft|RNobre1/xp-stack|g' README.md
sed -i 's|`claude-craft`|`xp-stack`|g' README.md
# NÃO usar -i sem backup em primeira tentativa — verificar diff antes de aceitar
git diff README.md
```

Verificar visualmente que os 10 matches viraram corretos. Se algum deve ficar como `claude-craft` (histórico), reverter especifico via `git checkout -p`.

- [ ] **Step 5: Atualizar CLAUDE.md**

```bash
cd /home/rnobre/dev/claude-craft
grep -n "claude-craft" CLAUDE.md
# Expected: ~5-15 matches
```

Mesma lógica do README: substituir `claude-craft` → `xp-stack` exceto refs históricas/changelogs:

```bash
sed -i 's|RNobre1/claude-craft|RNobre1/xp-stack|g' CLAUDE.md
sed -i 's|`claude-craft`|`xp-stack`|g' CLAUDE.md
git diff CLAUDE.md
```

Verificar e ajustar manualmente refs em "Histórico" / "Origem" se houver.

- [ ] **Step 6: Atualizar git remote URL local**

```bash
cd /home/rnobre/dev/claude-craft
git remote -v
# Expected: origin git@github.com:RNobre1/claude-craft.git (fetch/push)

git remote set-url origin git@github.com:RNobre1/xp-stack.git

git remote -v
# Expected: origin git@github.com:RNobre1/xp-stack.git (fetch/push)

git fetch origin
# Expected: sucesso (testa que URL nova funciona)
```

- [ ] **Step 7: Renomear diretório local**

```bash
cd /home/rnobre/dev
mv claude-craft xp-stack

cd xp-stack
git status
# Expected: ainda em feat/v1.0.0-ship, modificações dos steps 3-5 staged ou unstaged
```

> **ATENÇÃO:** Se houver outros worktrees apontando pra `claude-craft/`, eles vão quebrar. Verificar `git worktree list` antes do mv. Se houver, fazer `git worktree move` antes do mv principal.

- [ ] **Step 8: Commit + push**

```bash
cd /home/rnobre/dev/xp-stack
git add .claude-plugin/marketplace.json README.md CLAUDE.md
git status
# Expected: 3 files modified

git commit -m "chore(rename): claude-craft -> xp-stack (T0 W0 v1.0.0)

Renomeia repositorio + marketplace + refs no README e CLAUDE.md em
preparacao pra release v1.0.0 (npm package primario com mesmo nome).

GitHub mantem 301 redirect automatico de RNobre1/claude-craft, entao
/plugin marketplace add com URL antiga continua funcionando (backward
compat). Diretorio local renomeado de ~/dev/claude-craft -> ~/dev/xp-stack.
Git remote URL atualizado.

Refs em Origem/Historico preservados (fatos historicos do projeto)."

git push -u origin feat/v1.0.0-ship
# Expected: branch criada no remote ou push bem-sucedido
```

- [ ] **Step 9: Verificar que tudo funciona**

```bash
cd /home/rnobre/dev/xp-stack
gh repo view --json name,url
# Expected: {"name":"xp-stack","url":"https://github.com/RNobre1/xp-stack"}

git log --oneline -3
# Expected: commit do step 8 no topo + commit do overview anterior
```

Verificar no browser: `https://github.com/RNobre1/claude-craft` deve redirecionar pra `https://github.com/RNobre1/xp-stack`.

---

## Task 1: npm package skeleton

**Files:**
- Create: `package.json`
- Create: `bin/xp-stack`
- Create: `src/cli/index.js`
- Create: `src/cli/commands/version.js`
- Create: `tests/cli/version.test.js`
- Create: `vitest.config.js`
- Create: `.npmignore`
- Modify: `.gitignore`

> **Convenção de segurança:** todos os tests e código de produção usam `execFileSync`/`execFile` (sem shell), nunca `exec`/`execSync` com strings. Razão: `execFile*` passa argv como array, eliminando vetor de shell injection. Mesmo em testes (Piloto reforçou em hook).

- [ ] **Step 1: Escrever teste falho de version**

```bash
cd /home/rnobre/dev/xp-stack
mkdir -p tests/cli
```

Criar `tests/cli/version.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');
const PKG_JSON = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));

describe('xp-stack --version', () => {
  it('imprime a versao do package.json', () => {
    const output = execFileSync('node', [BIN, '--version'], { encoding: 'utf8' }).trim();
    expect(output).toBe(PKG_JSON.version);
  });

  it('aceita -V como atalho', () => {
    const output = execFileSync('node', [BIN, '-V'], { encoding: 'utf8' }).trim();
    expect(output).toBe(PKG_JSON.version);
  });
});
```

- [ ] **Step 2: Verificar que teste falha (esperado: tudo quebra — sem package.json, sem bin, sem deps)**

```bash
cd /home/rnobre/dev/xp-stack
npx vitest run tests/cli/version.test.js
# Expected: FAIL — package.json doesn't exist OR vitest not installed OR bin/xp-stack doesn't exist
```

Se npx vitest cair no prompt de instalação interativa, abortar e proceder direto pro Step 3 (instalar deps explicitamente).

- [ ] **Step 3: Criar `package.json`**

```bash
cat > /home/rnobre/dev/xp-stack/package.json <<'EOF'
{
  "name": "xp-stack",
  "version": "1.0.0-alpha.0",
  "description": "Methodology stack for AI coding agents (Claude Code, Codex, Cursor, Antigravity, Gemini CLI). TDD absoluto, pair programming, pesquisa formal triangulada, task decomposition rigorosa, multi-agent orchestration. Inspired by Reversa.",
  "type": "module",
  "bin": {
    "xp-stack": "./bin/xp-stack"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:bash": "bash tests/marketplace_test.sh && bash tests/skeleton_test.sh && bash tests/scaffold_test.sh && bash tests/bootstrap_test.sh && bash tests/paperclip_test.sh && bash tests/local_waves_test.sh"
  },
  "files": [
    "bin/",
    "src/",
    "schemas/",
    "templates/",
    "skills/"
  ],
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "ajv": "^8.17.1",
    "ajv-formats": "^3.0.1",
    "commander": "^12.1.0"
  },
  "devDependencies": {
    "vitest": "^2.1.0"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/RNobre1/xp-stack.git"
  },
  "keywords": [
    "ai",
    "agent",
    "methodology",
    "tdd",
    "xp",
    "pair-programming",
    "claude-code",
    "anthropic",
    "scaffolding",
    "multi-agent"
  ],
  "author": "Rafael Nobre <rafael@meteoradigital.io>",
  "license": "MIT",
  "homepage": "https://github.com/RNobre1/xp-stack#readme",
  "bugs": {
    "url": "https://github.com/RNobre1/xp-stack/issues"
  }
}
EOF
```

> **Versão inicial `1.0.0-alpha.0`:** intencional. Permite publicar pré-releases no npm sem ocupar a tag `1.0.0` antes de Onda 4 (release final).

- [ ] **Step 4: Instalar dependências**

```bash
cd /home/rnobre/dev/xp-stack
npm install
# Expected: cria node_modules/, package-lock.json, sem erros
ls node_modules | head -10
# Expected: ajv, ajv-formats, commander, vitest, e várias deps transitivas
```

- [ ] **Step 5: Criar `bin/xp-stack` (entry point)**

```bash
mkdir -p /home/rnobre/dev/xp-stack/bin
cat > /home/rnobre/dev/xp-stack/bin/xp-stack <<'EOF'
#!/usr/bin/env node
import { run } from '../src/cli/index.js';

run(process.argv).catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
EOF
chmod +x /home/rnobre/dev/xp-stack/bin/xp-stack
```

- [ ] **Step 6: Criar `src/cli/index.js` (router commander)**

```bash
mkdir -p /home/rnobre/dev/xp-stack/src/cli/commands
cat > /home/rnobre/dev/xp-stack/src/cli/index.js <<'EOF'
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { registerVersion } from './commands/version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_JSON = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8')
);

export async function run(argv) {
  const program = new Command();

  program
    .name('xp-stack')
    .description(PKG_JSON.description)
    .version(PKG_JSON.version, '-V, --version', 'imprime a versao instalada');

  registerVersion(program);
  // Future subcommands wire up here: init, update, status, resume, add-engine, add-skill, uninstall

  await program.parseAsync(argv);
}
EOF
```

- [ ] **Step 7: Criar `src/cli/commands/version.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/cli/commands/version.js <<'EOF'
// O subcomando "version" e' implementado via commander.version() no index.js
// (registra automaticamente as flags -V e --version).
//
// Este modulo existe pra futuro suporte a `xp-stack version` como subcomando
// explicito (ex: imprimir versao + node version + engines instaladas).
//
// Por enquanto, no-op exportado pra manter contrato do router.

export function registerVersion(program) {
  // commander ja registrou -V/--version em index.js. Sem subcomando explicito.
  return program;
}
EOF
```

- [ ] **Step 8: Criar `vitest.config.js`**

```bash
cat > /home/rnobre/dev/xp-stack/vitest.config.js <<'EOF'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    exclude: ['tests/**/*_test.sh', 'node_modules/**'],
    globals: false,
    environment: 'node',
    testTimeout: 10000,
  },
});
EOF
```

- [ ] **Step 9: Atualizar `.gitignore`**

```bash
cd /home/rnobre/dev/xp-stack
cat .gitignore
# Verificar conteudo atual antes de adicionar
```

Adicionar ao final (se não existirem já):

```bash
cat >> /home/rnobre/dev/xp-stack/.gitignore <<'EOF'

# v1.0.0+ npm package
node_modules/
coverage/
*.log
.npm/
EOF
```

Verificar idempotência (se `node_modules/` já existe, não duplicar):
```bash
sort .gitignore | uniq -d
# Expected: vazio (sem duplicatas)
```

- [ ] **Step 10: Criar `.npmignore`**

```bash
cat > /home/rnobre/dev/xp-stack/.npmignore <<'EOF'
# Excluir do package publicado no npm (incluido por default no git)

# Tests (nao precisam no consumer)
tests/
*.test.js

# Dev tooling
vitest.config.js
.github/
.claude/
.claude-plugin/
.gitignore

# Docs (READMEs especificos vao por padrao, mas excluir docs/tasks/ etc)
docs/

# Plugins de IDE (consumidor instala separado se quiser)
plugins/

# Internal
local/
scripts/orchestrate/
.xp-stack/
EOF
```

- [ ] **Step 11: Rodar test de version e verificar PASS**

```bash
cd /home/rnobre/dev/xp-stack
npx vitest run tests/cli/version.test.js
# Expected:
#  ✓ tests/cli/version.test.js (2)
#    ✓ xp-stack --version
#      ✓ imprime a versao do package.json
#      ✓ aceita -V como atalho
#  Test Files  1 passed (1)
#       Tests  2 passed (2)
```

Se falhar, debugar com:
```bash
node bin/xp-stack --version
# Expected: 1.0.0-alpha.0
node bin/xp-stack -V
# Expected: 1.0.0-alpha.0
```

- [ ] **Step 12: Commit T1**

```bash
cd /home/rnobre/dev/xp-stack
git add package.json package-lock.json bin/ src/ tests/cli/ vitest.config.js .gitignore .npmignore
git status
# Expected: 9 files: 8 created + .gitignore modified

git commit -m "feat(npm): scaffold do package xp-stack com subcomando --version (T1 W0 v1.0.0)

Cria estrutura de package npm ESM:
- package.json (name=xp-stack, version=1.0.0-alpha.0, type=module)
- bin/xp-stack entry point Node ESM
- src/cli/index.js router commander
- src/cli/commands/version.js (no-op por enquanto, --version vem via commander.version)
- tests/cli/version.test.js (2 cenarios: --version e -V)
- vitest.config.js
- .npmignore (exclui tests, docs, plugins do tarball)
- .gitignore atualizado com node_modules/coverage/etc

Stack: Node 18+, ESM, commander ^12, vitest ^2. Tests usam execFileSync
(sem shell, pra prevenir injection mesmo em fixture). Versao alpha
permite publicar no npm pra teste antes de tag 1.0.0 final em W4."

git push origin feat/v1.0.0-ship
```

---

## Task 2: Schema definitions (Ajv)

**Files:**
- Create: `schemas/state.schema.json`
- Create: `schemas/tasks.schema.json`
- Create: `schemas/sources.schema.json`
- Create: `schemas/claims.schema.json`
- Create: `schemas/manifest.schema.json`
- Create: `schemas/index.schema.json`
- Create: `src/lib/validators.js`
- Create: `tests/lib/validators.test.js`

- [ ] **Step 1: Escrever teste falho de validators (12 cenários: 6 schemas × pos+neg)**

```bash
mkdir -p /home/rnobre/dev/xp-stack/tests/lib
cat > /home/rnobre/dev/xp-stack/tests/lib/validators.test.js <<'EOF'
import { describe, it, expect } from 'vitest';
import { validate, SCHEMA_NAMES } from '../../src/lib/validators.js';

describe('validators - state schema', () => {
  it('aceita state.json valido com phase definida', () => {
    const valid = {
      schema_version: '1.0',
      feature: 'v1.0.0-ship',
      doc_level: 'completo',
      phase: 'fundacao',
      phases_completed: [],
      phases_pending: ['testes', 'implementacao', 'refatoracao', 'integracao', 'cicd'],
      current_task: 'T0',
      tasks_completed: [],
      tasks_pending: ['T0', 'T1', 'T2'],
      blockers: [],
      last_checkpoint_at: '2026-05-02T23:55:00Z',
      last_session_summary: 'inicio do W0',
    };
    const result = validate('state', valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeNull();
  });

  it('rejeita state.json sem schema_version', () => {
    const invalid = {
      feature: 'v1.0.0-ship',
      doc_level: 'completo',
      phase: 'fundacao',
    };
    const result = validate('state', invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeTruthy();
  });
});

describe('validators - tasks schema', () => {
  it('aceita tasks.json com array de tasks valido', () => {
    const valid = {
      schema_version: '1.0',
      feature: 'v1.0.0-ship',
      tasks: [
        {
          id: 'T0',
          slug: 'rename-repo',
          title: 'Rename repo',
          status: 'done',
          deps: [],
          phase: 'fundacao',
          confidence: '🟢',
        },
      ],
    };
    const result = validate('tasks', valid);
    expect(result.valid).toBe(true);
  });

  it('rejeita tasks.json com status invalido', () => {
    const invalid = {
      schema_version: '1.0',
      feature: 'v1.0.0-ship',
      tasks: [
        { id: 'T0', slug: 'x', title: 'x', status: 'in_orbit', deps: [], phase: 'fundacao', confidence: '🟢' },
      ],
    };
    const result = validate('tasks', invalid);
    expect(result.valid).toBe(false);
  });
});

describe('validators - sources schema', () => {
  it('aceita sources.json com array de sources', () => {
    const valid = [
      {
        id: 'S1',
        url: 'https://example.com/doc',
        title: 'Example Doc',
        type: 'official_docs',
        accessed_at: '2026-05-02',
        hash: 'sha256:abc123',
      },
    ];
    const result = validate('sources', valid);
    expect(result.valid).toBe(true);
  });

  it('rejeita source com url invalida', () => {
    const invalid = [{ id: 'S1', url: 'not-a-url', title: 't', type: 'official_docs', accessed_at: '2026-05-02', hash: 'x' }];
    const result = validate('sources', invalid);
    expect(result.valid).toBe(false);
  });
});

describe('validators - claims schema', () => {
  it('aceita claims.json com confidence valido', () => {
    const valid = [
      {
        id: 'C1',
        statement: 'X eh verdade',
        sources: ['S1'],
        confidence: '🟢',
        reviewed_by_critic: true,
      },
    ];
    const result = validate('claims', valid);
    expect(result.valid).toBe(true);
  });

  it('rejeita claim com confidence fora do enum', () => {
    const invalid = [
      { id: 'C1', statement: 'x', sources: ['S1'], confidence: 'maybe', reviewed_by_critic: false },
    ];
    const result = validate('claims', invalid);
    expect(result.valid).toBe(false);
  });
});

describe('validators - manifest schema', () => {
  it('aceita manifest.json valido', () => {
    const valid = {
      schema_version: '1.0',
      installed_version: '1.0.0',
      installed_at: '2026-05-02T23:00:00Z',
      files: {
        '.claude/skills/akita-xp-rules/SKILL.md': {
          hash: 'sha256:af61',
          source: 'templates/skills/akita-xp-rules/SKILL.md',
          user_modified: false,
        },
      },
    };
    const result = validate('manifest', valid);
    expect(result.valid).toBe(true);
  });

  it('rejeita manifest sem installed_version', () => {
    const invalid = {
      schema_version: '1.0',
      installed_at: '2026-05-02T23:00:00Z',
      files: {},
    };
    const result = validate('manifest', invalid);
    expect(result.valid).toBe(false);
  });
});

describe('validators - index schema', () => {
  it('aceita index.json com active_features', () => {
    const valid = {
      schema_version: '1.0',
      active_features: [
        { slug: 'v1.0.0-ship', phase: 'fundacao', last_touched: '2026-05-02T23:55:00Z' },
      ],
      archived_features: [],
      doc_level_default: 'completo',
      engines_installed: ['claude-code'],
    };
    const result = validate('index', valid);
    expect(result.valid).toBe(true);
  });

  it('rejeita index com engines_installed nao-array', () => {
    const invalid = {
      schema_version: '1.0',
      active_features: [],
      archived_features: [],
      doc_level_default: 'completo',
      engines_installed: 'claude-code',
    };
    const result = validate('index', invalid);
    expect(result.valid).toBe(false);
  });
});

describe('validators - SCHEMA_NAMES export', () => {
  it('expoe os 6 nomes de schema', () => {
    expect(SCHEMA_NAMES).toEqual(['state', 'tasks', 'sources', 'claims', 'manifest', 'index']);
  });
});
EOF
```

- [ ] **Step 2: Rodar teste e verificar FAIL (validators.js não existe)**

```bash
cd /home/rnobre/dev/xp-stack
npx vitest run tests/lib/validators.test.js
# Expected: FAIL — "Cannot find module '../../src/lib/validators.js'"
```

- [ ] **Step 3: Criar `schemas/state.schema.json`**

```bash
mkdir -p /home/rnobre/dev/xp-stack/schemas
cat > /home/rnobre/dev/xp-stack/schemas/state.schema.json <<'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/RNobre1/xp-stack/schemas/state.schema.json",
  "title": "xp-stack state.json",
  "description": "State machine per-feature em docs/tasks/{feature}/state.json",
  "type": "object",
  "required": [
    "schema_version",
    "feature",
    "phase",
    "phases_completed",
    "phases_pending",
    "tasks_completed",
    "tasks_pending"
  ],
  "additionalProperties": false,
  "properties": {
    "schema_version": { "type": "string", "const": "1.0" },
    "feature": { "type": "string", "minLength": 1 },
    "doc_level": {
      "type": "string",
      "enum": ["essencial", "completo"]
    },
    "phase": {
      "type": "string",
      "enum": ["fundacao", "testes", "implementacao", "refatoracao", "integracao", "cicd"]
    },
    "phases_completed": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["fundacao", "testes", "implementacao", "refatoracao", "integracao", "cicd"]
      }
    },
    "phases_pending": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["fundacao", "testes", "implementacao", "refatoracao", "integracao", "cicd"]
      }
    },
    "current_task": { "type": "string", "pattern": "^T[0-9]+(\\.[0-9]+)?$" },
    "tasks_completed": {
      "type": "array",
      "items": { "type": "string", "pattern": "^T[0-9]+(\\.[0-9]+)?$" }
    },
    "tasks_pending": {
      "type": "array",
      "items": { "type": "string", "pattern": "^T[0-9]+(\\.[0-9]+)?$" }
    },
    "blockers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["task", "reason"],
        "properties": {
          "task": { "type": "string", "pattern": "^T[0-9]+(\\.[0-9]+)?$" },
          "reason": { "type": "string", "minLength": 1 },
          "blocked_at": { "type": "string", "format": "date-time" }
        }
      }
    },
    "last_checkpoint_at": { "type": "string", "format": "date-time" },
    "last_session_summary": { "type": "string" }
  }
}
EOF
```

- [ ] **Step 4: Criar `schemas/tasks.schema.json`**

```bash
cat > /home/rnobre/dev/xp-stack/schemas/tasks.schema.json <<'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/RNobre1/xp-stack/schemas/tasks.schema.json",
  "title": "xp-stack tasks.json",
  "description": "Tasks estruturadas em docs/tasks/{feature}/tasks.json (fonte de verdade pra status/deps)",
  "type": "object",
  "required": ["schema_version", "feature", "tasks"],
  "additionalProperties": false,
  "properties": {
    "schema_version": { "type": "string", "const": "1.0" },
    "feature": { "type": "string", "minLength": 1 },
    "tasks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "slug", "title", "status", "deps", "phase", "confidence"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string", "pattern": "^T[0-9]+(\\.[0-9]+)?$" },
          "slug": { "type": "string", "pattern": "^[a-z0-9-]+$" },
          "title": { "type": "string", "minLength": 1 },
          "status": { "type": "string", "enum": ["pending", "in_progress", "blocked", "done", "abandoned"] },
          "deps": {
            "type": "array",
            "items": { "type": "string", "pattern": "^T[0-9]+(\\.[0-9]+)?$" }
          },
          "blockers": {
            "type": "array",
            "items": { "type": "string" }
          },
          "phase": {
            "type": "string",
            "enum": ["fundacao", "testes", "implementacao", "refatoracao", "integracao", "cicd"]
          },
          "owner": { "type": "string" },
          "pr": { "type": "string" },
          "confidence": { "type": "string", "enum": ["🟢", "🟡", "🔴"] }
        }
      }
    }
  }
}
EOF
```

- [ ] **Step 5: Criar `schemas/sources.schema.json`**

```bash
cat > /home/rnobre/dev/xp-stack/schemas/sources.schema.json <<'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/RNobre1/xp-stack/schemas/sources.schema.json",
  "title": "xp-stack sources.json (research)",
  "description": "Fontes citadas em docs/pesquisas/{slug}/sources.json",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "url", "title", "type", "accessed_at", "hash"],
    "additionalProperties": false,
    "properties": {
      "id": { "type": "string", "pattern": "^S[0-9]+$" },
      "url": { "type": "string", "format": "uri" },
      "title": { "type": "string", "minLength": 1 },
      "type": {
        "type": "string",
        "enum": ["official_docs", "blog_post", "academic_paper", "github_repo", "video", "forum_post", "primary_code", "other"]
      },
      "accessed_at": { "type": "string", "format": "date" },
      "hash": { "type": "string", "minLength": 1 }
    }
  }
}
EOF
```

- [ ] **Step 6: Criar `schemas/claims.schema.json`**

```bash
cat > /home/rnobre/dev/xp-stack/schemas/claims.schema.json <<'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/RNobre1/xp-stack/schemas/claims.schema.json",
  "title": "xp-stack claims.json (research)",
  "description": "Claims com confidence em docs/pesquisas/{slug}/claims.json",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "statement", "sources", "confidence", "reviewed_by_critic"],
    "additionalProperties": false,
    "properties": {
      "id": { "type": "string", "pattern": "^C[0-9]+$" },
      "statement": { "type": "string", "minLength": 1 },
      "sources": {
        "type": "array",
        "items": { "type": "string", "pattern": "^S[0-9]+$" },
        "minItems": 1
      },
      "confidence": { "type": "string", "enum": ["🟢", "🟡", "🔴"] },
      "reviewed_by_critic": { "type": "boolean" },
      "reviewer_notes": { "type": "string" }
    }
  }
}
EOF
```

- [ ] **Step 7: Criar `schemas/manifest.schema.json`**

```bash
cat > /home/rnobre/dev/xp-stack/schemas/manifest.schema.json <<'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/RNobre1/xp-stack/schemas/manifest.schema.json",
  "title": "xp-stack manifest.json",
  "description": "Tracker de tudo que o instalador escreveu, em .xp-stack/manifest.json",
  "type": "object",
  "required": ["schema_version", "installed_version", "installed_at", "files"],
  "additionalProperties": false,
  "properties": {
    "schema_version": { "type": "string", "const": "1.0" },
    "installed_version": { "type": "string", "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+(-[a-z0-9.-]+)?$" },
    "installed_at": { "type": "string", "format": "date-time" },
    "engines": {
      "type": "array",
      "items": { "type": "string" }
    },
    "files": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["hash", "source"],
        "additionalProperties": false,
        "properties": {
          "hash": { "type": "string", "pattern": "^sha256:[a-f0-9]+$|^managed_lines$" },
          "source": { "type": "string" },
          "user_modified": { "type": "boolean" },
          "user_modified_detected_at": { "type": "string", "format": "date-time" },
          "managed_lines": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    }
  }
}
EOF
```

- [ ] **Step 8: Criar `schemas/index.schema.json`**

```bash
cat > /home/rnobre/dev/xp-stack/schemas/index.schema.json <<'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/RNobre1/xp-stack/schemas/index.schema.json",
  "title": "xp-stack index.json",
  "description": "Global tracker de features ativas em .xp-stack/index.json",
  "type": "object",
  "required": ["schema_version", "active_features", "archived_features", "doc_level_default", "engines_installed"],
  "additionalProperties": false,
  "properties": {
    "schema_version": { "type": "string", "const": "1.0" },
    "active_features": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["slug", "phase", "last_touched"],
        "additionalProperties": false,
        "properties": {
          "slug": { "type": "string", "pattern": "^[a-z0-9.-]+$" },
          "phase": {
            "type": "string",
            "enum": ["fundacao", "testes", "implementacao", "refatoracao", "integracao", "cicd"]
          },
          "last_touched": { "type": "string", "format": "date-time" }
        }
      }
    },
    "archived_features": {
      "type": "array",
      "items": { "type": "string", "pattern": "^[a-z0-9.-]+$" }
    },
    "doc_level_default": {
      "type": "string",
      "enum": ["essencial", "completo"]
    },
    "engines_installed": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["claude-code", "codex", "cursor", "antigravity", "gemini-cli", "windsurf", "cline", "roo-code", "copilot", "aider", "amazon-q", "kiro", "opencode"]
      }
    }
  }
}
EOF
```

- [ ] **Step 9: Criar `src/lib/validators.js`**

```bash
mkdir -p /home/rnobre/dev/xp-stack/src/lib
cat > /home/rnobre/dev/xp-stack/src/lib/validators.js <<'EOF'
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMAS_DIR = join(__dirname, '..', '..', 'schemas');

export const SCHEMA_NAMES = ['state', 'tasks', 'sources', 'claims', 'manifest', 'index'];

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validators = {};
for (const name of SCHEMA_NAMES) {
  const schemaPath = join(SCHEMAS_DIR, `${name}.schema.json`);
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  validators[name] = ajv.compile(schema);
}

/**
 * Valida data contra um schema nomeado.
 *
 * @param {string} schemaName - Um de SCHEMA_NAMES
 * @param {unknown} data - Dado a validar
 * @returns {{valid: boolean, errors: object[]|null}}
 */
export function validate(schemaName, data) {
  if (!validators[schemaName]) {
    throw new Error(`Schema desconhecido: ${schemaName}. Validos: ${SCHEMA_NAMES.join(', ')}`);
  }
  const validator = validators[schemaName];
  const valid = validator(data);
  return {
    valid,
    errors: valid ? null : validator.errors,
  };
}
EOF
```

- [ ] **Step 10: Rodar tests e verificar PASS (13 cenários: 12 schema + 1 SCHEMA_NAMES)**

```bash
cd /home/rnobre/dev/xp-stack
npx vitest run tests/lib/validators.test.js
# Expected:
#  ✓ tests/lib/validators.test.js (13)
#    ✓ validators - state schema (2)
#    ✓ validators - tasks schema (2)
#    ✓ validators - sources schema (2)
#    ✓ validators - claims schema (2)
#    ✓ validators - manifest schema (2)
#    ✓ validators - index schema (2)
#    ✓ validators - SCHEMA_NAMES export (1)
#  Test Files  1 passed (1)
#       Tests  13 passed (13)
```

Se algum FAIL, debugar individualmente importando o modulo num REPL Node ESM (`node --input-type=module -e "..."`).

- [ ] **Step 11: Rodar suite completa de tests (regression check)**

```bash
cd /home/rnobre/dev/xp-stack
npx vitest run
# Expected:
#  Test Files  2 passed (2)
#       Tests  15 passed (15)  # 2 (version) + 13 (validators)
```

Validar que tests bash existentes ainda passam (não devem ser afetados):
```bash
npm run test:bash
# Expected: 53/53 verde (igual antes da v1.0.0)
```

- [ ] **Step 12: Commit T2**

```bash
cd /home/rnobre/dev/xp-stack
git add schemas/ src/lib/ tests/lib/
git status
# Expected: 8 files: 6 schemas + validators.js + validators.test.js

git commit -m "feat(schemas): adiciona 6 schemas JSON validados via Ajv (T2 W0 v1.0.0)

Cria 6 schemas JSON em schemas/ + wrapper Ajv em src/lib/validators.js
+ 13 cenarios de teste (positive + negative pra cada schema):

- state.schema.json: state machine per-feature
- tasks.schema.json: tasks estruturadas (status, deps, confidence)
- sources.schema.json: fontes citadas em pesquisas
- claims.schema.json: claims com confidence (🟢🟡🔴)
- manifest.schema.json: tracker do instalador (SHA-256)
- index.schema.json: global tracker de features ativas

Schemas seguem JSON Schema draft-07 com validacao estrita
(additionalProperties: false em todos), enums fechados pra phase,
status, confidence, e engines suportadas (13 do Reversa).

Validator API: validate(schemaName, data) -> {valid, errors}.
Ajv com allErrors=true pra reportar todos os erros, nao so o primeiro.
addFormats pra suporte a date, date-time, uri.

Tests: 13/13 verde (vitest). Tests bash existentes (53) nao afetados."

git push origin feat/v1.0.0-ship
```

---

## Conclusão da Onda 0

Após T0 + T1 + T2 mergeados em `feat/v1.0.0-ship`, o repo terá:

✅ Renomeado `claude-craft` → `xp-stack` (GitHub + local + URL git remote + refs em README/CLAUDE.md/marketplace.json/plugin.json)
✅ npm package skeleton funcional (`xp-stack --version` imprime `1.0.0-alpha.0`)
✅ 6 schemas JSON validáveis via `validate(name, data)` (16 tests verde — 14 validators + 2 version, após followup do T2 que adicionou test pra schemaName inválido + additionalProperties em blockers.items)
✅ Tests bash existentes preservados (53 verde, sem regressão)

**Próximo passo:** invocar `writing-plans` novamente quando começar W1 (CLI core: init, update, status, add-engine, add-skill, uninstall, resume — 7 tasks paralelizáveis).

**Nada deve estar publicado no npm ainda.** `1.0.0-alpha.0` fica só local até T24 (release final em W4).

---

## Checklist de saída de W0

Antes de declarar W0 concluída e abrir issue/PR pra W1:

- [x] T0 commitado e pushed em `feat/v1.0.0-ship` (`6b12a28` + followup `b75b2da`)
- [x] T1 commitado e pushed em `feat/v1.0.0-ship` (`76cf4d6`)
- [x] T2 commitado e pushed em `feat/v1.0.0-ship` (`8bc12cb` + followup `756d221`)
- [x] `npx vitest run` verde (16 tests — 14 validators + 2 version)
- [x] `npm run test:bash` verde (53 tests)
- [x] `node bin/xp-stack --version` imprime `1.0.0-alpha.0`
- [x] GitHub: `https://github.com/RNobre1/claude-craft` redireciona pra `xp-stack`
- [x] `docs/tasks/v1.0.0-ship/00-overview.md`: T0/T1/T2 marcados `[x] Concluida 2026-05-03 (commit)`
