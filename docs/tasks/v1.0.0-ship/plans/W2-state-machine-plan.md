# W2 — State Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar state machine per-feature (`state.json`), automação via hook Stop (auto-update do `index.json` + regeneração de `RESUME.md`), e skill `reconcile` pra resolver divergência JSON ↔ markdown nos T-files.

**Architecture:** Camadas: (1) helper `src/lib/state.js` encapsula I/O e validação de `docs/tasks/{slug}/state.json`; (2) `src/lib/resume-generator.js` produz `RESUME.md` a partir de state.json + tasks.json + git log; (3) `src/lib/markdown-tasks.js` parseia e regenera a tabela de tasks no `00-overview.md`; (4) 3 subcomandos CLI consomem helpers (`hook-stop` chamado pelo hook Stop, `regenerate-resume` explícito, `reconcile` sincroniza JSON↔markdown). Pra propagar o hook automaticamente, o `xp-stack init` ganha enhancement em T11 (Step opcional) que injeta o hook em `.claude/settings.json` (idempotente, com prompt no modo interativo).

**Tech Stack:** Mesma do W0+W1: Node 18+ ESM, commander 12, vitest 2, ajv 8 (W0). Sem novas deps. Schema `state.schema.json` já existe (W0 T2).

---

## File Structure

| Path | Tipo | Responsabilidade |
|------|------|------------------|
| `src/lib/state.js` | Create (T10) | Read/write `docs/tasks/{slug}/state.json` com schema validation |
| `src/lib/resume-generator.js` | Create (T12) | Gera string markdown do RESUME.md |
| `src/lib/markdown-tasks.js` | Create (T13) | Parse e regenera tabela de tasks no `00-overview.md` |
| `src/cli/commands/hook-stop.js` | Create (T11) | Subcomando chamado pelo hook Stop do Claude Code (detecta features tocadas, atualiza index, regenera RESUME) |
| `src/cli/commands/regenerate-resume.js` | Create (T12) | Subcomando explícito pra regenerar RESUME.md de uma feature |
| `src/cli/commands/reconcile.js` | Create (T13) | Subcomando que detecta divergência JSON ↔ markdown e resolve |
| `src/cli/index.js` | Modify | Wire up dos 3 novos subcomandos |
| `templates/settings.json.template` | Create (T11) | Template esqueleto de `.claude/settings.json` com hook Stop apontando pro xp-stack |
| `src/cli/commands/init.js` | Modify (T11) | Após instalar templates, oferecer (com `--with-hooks` flag) injeção do hook Stop em `.claude/settings.json` se claude-code engine presente |
| `tests/lib/state.test.js` | Create (T10) | Tests do state helper |
| `tests/lib/resume-generator.test.js` | Create (T12) | Tests do generator (snapshot-style sem brittle exact match) |
| `tests/lib/markdown-tasks.test.js` | Create (T13) | Tests de parser + renderer |
| `tests/cli/hook-stop.test.js` | Create (T11) | Tests E2E do subcomando hook-stop em fixture |
| `tests/cli/regenerate-resume.test.js` | Create (T12) | Tests E2E do regenerate-resume em fixture |
| `tests/cli/reconcile.test.js` | Create (T13) | Tests E2E do reconcile em fixture |

---

## Convenções gerais (válidas pra W2)

- TDD obrigatório (RED → GREEN → commit por step)
- `execFileSync` em tests CLI (sem shell, regra W0)
- Fixtures em `/tmp/xp-stack-w2-{taskname}-{rand}/` com cleanup em afterEach
- `--cwd <dir>` flag em todos os subcomandos (default `process.cwd()`)
- Mensagens em PT-BR (subjects ≤72 chars, sem `Co-Authored-By`)
- Subcomandos exportam `register{Name}(program)` (pattern já estabelecido)
- W2 NÃO popula skills reais (templates/skills/ continua vazio); W3 faz isso

---

## Task 10: helper `src/lib/state.js`

**Files:**
- Create: `src/lib/state.js`
- Create: `tests/lib/state.test.js`

- [ ] **Step 1: Escrever teste falho**

Criar `tests/lib/state.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readState,
  writeState,
  EMPTY_STATE,
  registerTaskCompleted,
  setCurrentTask,
} from '../../src/lib/state.js';

describe('state - EMPTY_STATE', () => {
  it('retorna state inicial valido contra schema', () => {
    const s = EMPTY_STATE('feature-x');
    expect(s.schema_version).toBe('1.0');
    expect(s.feature).toBe('feature-x');
    expect(s.phase).toBe('fundacao');
    expect(s.phases_completed).toEqual([]);
    expect(s.phases_pending).toEqual(['testes', 'implementacao', 'refatoracao', 'integracao', 'cicd']);
    expect(s.tasks_completed).toEqual([]);
    expect(s.tasks_pending).toEqual([]);
  });
});

describe('state - read/write', () => {
  let tmp, featureDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-state-test-'));
    featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('writeState persiste em state.json e readState le', () => {
    const s = EMPTY_STATE('feature-x');
    s.tasks_pending = ['T1', 'T2'];
    writeState(featureDir, s);

    const read = readState(featureDir);
    expect(read).toEqual(s);
  });

  it('readState retorna null se nao existe', () => {
    expect(readState(featureDir)).toBeNull();
  });

  it('writeState valida contra state.schema.json', () => {
    const invalid = { schema_version: 'errado', feature: 'x', phase: 'fundacao', phases_completed: [], phases_pending: [], tasks_completed: [], tasks_pending: [] };
    expect(() => writeState(featureDir, invalid)).toThrow();
  });
});

describe('state - registerTaskCompleted', () => {
  let tmp, featureDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-state-rt-'));
    featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
    const s = EMPTY_STATE('feature-x');
    s.tasks_pending = ['T1', 'T2', 'T3'];
    writeState(featureDir, s);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('move task de pending pra completed', () => {
    registerTaskCompleted(featureDir, 'T1');
    const s = readState(featureDir);
    expect(s.tasks_completed).toContain('T1');
    expect(s.tasks_pending).not.toContain('T1');
  });

  it('idempotente: chamar 2x nao duplica em completed', () => {
    registerTaskCompleted(featureDir, 'T1');
    registerTaskCompleted(featureDir, 'T1');
    const s = readState(featureDir);
    expect(s.tasks_completed.filter((t) => t === 'T1').length).toBe(1);
  });

  it('throw se task nao existe em pending nem completed', () => {
    expect(() => registerTaskCompleted(featureDir, 'T99')).toThrow(/nao encontrada/i);
  });
});

describe('state - setCurrentTask', () => {
  let tmp, featureDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-state-sc-'));
    featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
    const s = EMPTY_STATE('feature-x');
    s.tasks_pending = ['T1', 'T2'];
    writeState(featureDir, s);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('atualiza current_task + last_checkpoint_at', () => {
    setCurrentTask(featureDir, 'T1');
    const s = readState(featureDir);
    expect(s.current_task).toBe('T1');
    expect(s.last_checkpoint_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
```

- [ ] **Step 2: Verificar FAIL** — `npx vitest run tests/lib/state.test.js`. Esperado: módulo não existe.

- [ ] **Step 3: Implementar `src/lib/state.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/lib/state.js <<'EOF'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { validate } from './validators.js';

const STATE_FILE = 'state.json';

/**
 * Cria state inicial pra uma feature nova (fase fundacao).
 *
 * @param {string} featureSlug - Slug da feature (ex: 'v1.0.0-ship')
 * @returns {object} State valido contra schemas/state.schema.json
 */
export function EMPTY_STATE(featureSlug) {
  return {
    schema_version: '1.0',
    feature: featureSlug,
    phase: 'fundacao',
    phases_completed: [],
    phases_pending: ['testes', 'implementacao', 'refatoracao', 'integracao', 'cicd'],
    tasks_completed: [],
    tasks_pending: [],
    blockers: [],
  };
}

/**
 * Le state.json de docs/tasks/{slug}/state.json (caminho passado e' o featureDir).
 *
 * @param {string} featureDir - Path absoluto do diretorio da feature
 * @returns {object|null}
 */
export function readState(featureDir) {
  const path = join(featureDir, STATE_FILE);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Escreve state. Valida contra schema antes.
 *
 * @param {string} featureDir
 * @param {object} state
 * @throws Error se invalido
 */
export function writeState(featureDir, state) {
  const result = validate('state', state);
  if (!result.valid) {
    throw new Error(`State invalido contra schema:\n${JSON.stringify(result.errors, null, 2)}`);
  }
  const path = join(featureDir, STATE_FILE);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

/**
 * Move task de pending pra completed. Idempotente.
 *
 * @param {string} featureDir
 * @param {string} taskId - Ex: 'T1'
 * @throws Error se taskId nao existe nem em pending nem completed
 */
export function registerTaskCompleted(featureDir, taskId) {
  const s = readState(featureDir);
  if (!s) throw new Error(`State nao encontrado em ${featureDir}/state.json`);
  const inPending = s.tasks_pending.includes(taskId);
  const inCompleted = s.tasks_completed.includes(taskId);
  if (!inPending && !inCompleted) {
    throw new Error(`Task ${taskId} nao encontrada em pending nem completed`);
  }
  if (!inCompleted) {
    s.tasks_completed.push(taskId);
  }
  s.tasks_pending = s.tasks_pending.filter((t) => t !== taskId);
  s.last_checkpoint_at = new Date().toISOString();
  writeState(featureDir, s);
}

/**
 * Define qual task esta em progresso. Atualiza last_checkpoint_at.
 *
 * @param {string} featureDir
 * @param {string} taskId
 */
export function setCurrentTask(featureDir, taskId) {
  const s = readState(featureDir);
  if (!s) throw new Error(`State nao encontrado em ${featureDir}/state.json`);
  s.current_task = taskId;
  s.last_checkpoint_at = new Date().toISOString();
  writeState(featureDir, s);
}
EOF
```

- [ ] **Step 4: Verificar PASS** — `npx vitest run tests/lib/state.test.js`. Esperado: 8 testes verde (1 EMPTY + 3 read/write + 3 registerTaskCompleted + 1 setCurrentTask).

- [ ] **Step 5: Commit T10**

```bash
cd /home/rnobre/dev/xp-stack
git add src/lib/state.js tests/lib/state.test.js
git commit -m "feat(lib): adiciona state.js com read/write + registerTaskCompleted (T10 W2)

Helper foundational pra state machine:
- EMPTY_STATE(slug) cria state inicial fase=fundacao
- readState/writeState com schema validation (state.schema.json)
- registerTaskCompleted(featureDir, taskId) move pending->completed
  (idempotente, throw se task desconhecida)
- setCurrentTask(featureDir, taskId) atualiza current_task + checkpoint

Reusa validate() de validators.js (W0).
Tests: 8/8 verde."
git push origin feat/v1.0.0-ship
```

---

## Task 11: subcomando `hook-stop` + integração no `init`

**Files:**
- Create: `src/cli/commands/hook-stop.js`
- Create: `tests/cli/hook-stop.test.js`
- Create: `templates/settings.json.template`
- Modify: `src/cli/commands/init.js` (adicionar `--with-hooks` flag opcional)
- Modify: `src/cli/index.js` (wire up registerHookStop)

> **Comportamento:** o subcomando `xp-stack hook-stop --feature <slug>` é projetado pra ser chamado pelo hook Stop do Claude Code. Ele:
> 1. Atualiza `index.json` (last_touched + phase) pra essa feature via `registerFeature`
> 2. (Será extendido em T12) Regenera `RESUME.md`
>
> Pra wire up no projeto, `xp-stack init --with-hooks` injeta no `.claude/settings.json` o hook que chama `npx xp-stack hook-stop --feature <auto-detect>`. Auto-detect feature = primeira pasta sob `docs/tasks/` com state.json. Se múltiplas, pega a mais recentemente modificada (mtime).

- [ ] **Step 1: Escrever teste falho**

Criar `tests/cli/hook-stop.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack hook-stop', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-hook-stop-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
    // Cria feature ativa com state.json
    const featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
    writeFileSync(join(featureDir, 'state.json'), JSON.stringify({
      schema_version: '1.0', feature: 'feature-x', phase: 'fundacao',
      phases_completed: [], phases_pending: ['testes', 'implementacao', 'refatoracao', 'integracao', 'cicd'],
      tasks_completed: [], tasks_pending: ['T1'], blockers: [],
    }, null, 2));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('com --feature <slug>, atualiza index.json (last_touched novo)', () => {
    const idxPath = join(tmp, '.xp-stack/index.json');
    // Captura last_touched anterior se feature ja registrada (init nao registra ela ainda — nao deveria)
    execFileSync('node', [BIN, 'hook-stop', '--cwd', tmp, '--feature', 'feature-x'], { encoding: 'utf8' });
    const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
    const f = idx.active_features.find((x) => x.slug === 'feature-x');
    expect(f).toBeTruthy();
    expect(f.phase).toBe('fundacao');
    expect(f.last_touched).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('sem --feature, auto-detect feature mais recente em docs/tasks/', () => {
    // Cria 2 features: feature-x (acima) + feature-y mais nova
    const fyDir = join(tmp, 'docs', 'tasks', 'feature-y');
    mkdirSync(fyDir, { recursive: true });
    writeFileSync(join(fyDir, 'state.json'), JSON.stringify({
      schema_version: '1.0', feature: 'feature-y', phase: 'testes',
      phases_completed: ['fundacao'], phases_pending: ['implementacao', 'refatoracao', 'integracao', 'cicd'],
      tasks_completed: [], tasks_pending: ['T1'], blockers: [],
    }, null, 2));

    execFileSync('node', [BIN, 'hook-stop', '--cwd', tmp], { encoding: 'utf8' });

    const idx = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    const fy = idx.active_features.find((x) => x.slug === 'feature-y');
    expect(fy).toBeTruthy();
    expect(fy.phase).toBe('testes');
  });

  it('sem features (docs/tasks/ vazio): no-op silencioso (exit 0, sem erro)', () => {
    // Remove a feature criada no beforeEach
    rmSync(join(tmp, 'docs', 'tasks'), { recursive: true, force: true });
    expect(() => {
      execFileSync('node', [BIN, 'hook-stop', '--cwd', tmp], { encoding: 'utf8' });
    }).not.toThrow();
  });

  it('com --feature inexistente: throw com mensagem clara', () => {
    expect(() => {
      execFileSync('node', [BIN, 'hook-stop', '--cwd', tmp, '--feature', 'feature-inexistente'], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/nao encontrada|not found/i);
  });
});

describe('xp-stack init --with-hooks', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-init-hooks-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('com --with-hooks, cria/atualiza .claude/settings.json com hook Stop', () => {
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--with-hooks', '--yes'], { encoding: 'utf8' });
    const settings = JSON.parse(readFileSync(join(tmp, '.claude', 'settings.json'), 'utf8'));
    expect(settings.hooks).toBeTruthy();
    expect(settings.hooks.Stop).toBeTruthy();
    // Esperado: array com pelo menos 1 entry referenciando xp-stack
    const stopHooksJson = JSON.stringify(settings.hooks.Stop);
    expect(stopHooksJson).toMatch(/xp-stack/);
    expect(stopHooksJson).toMatch(/hook-stop/);
  });

  it('sem --with-hooks, NAO cria settings.json', () => {
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    expect(existsSync(join(tmp, '.claude', 'settings.json'))).toBe(false);
  });

  it('--with-hooks idempotente: re-rodar nao duplica hook entries', () => {
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--with-hooks', '--yes'], { encoding: 'utf8' });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--with-hooks', '--yes'], { encoding: 'utf8' });
    const settings = JSON.parse(readFileSync(join(tmp, '.claude', 'settings.json'), 'utf8'));
    // Conta ocorrências de 'hook-stop' — deve aparecer só 1x
    const matches = JSON.stringify(settings.hooks.Stop).match(/hook-stop/g);
    expect(matches.length).toBe(1);
  });
});
```

- [ ] **Step 2: Verificar FAIL** — `npx vitest run tests/cli/hook-stop.test.js`. Esperado: subcomando + flag `--with-hooks` não existem.

- [ ] **Step 3: Criar `templates/settings.json.template`**

```bash
cat > /home/rnobre/dev/xp-stack/templates/settings.json.template <<'EOF'
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "npx xp-stack hook-stop"
          }
        ]
      }
    ]
  }
}
EOF
```

(Esse template documenta o shape esperado. O init em `--with-hooks` pode mergiar com settings.json existente em vez de copiar literal.)

- [ ] **Step 4: Implementar `src/cli/commands/hook-stop.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/cli/commands/hook-stop.js <<'EOF'
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readState } from '../../lib/state.js';
import { registerFeature } from '../../lib/index-tracker.js';

/**
 * Lista features ativas em docs/tasks/{slug}/ (cada uma com state.json).
 * Retorna ordenado por mtime desc (mais recente primeiro).
 *
 * @param {string} projectRoot
 * @returns {Array<{slug: string, dir: string, mtime: number}>}
 */
function listFeatureDirs(projectRoot) {
  const tasksRoot = join(projectRoot, 'docs', 'tasks');
  if (!existsSync(tasksRoot)) return [];
  const out = [];
  for (const entry of readdirSync(tasksRoot)) {
    if (entry.startsWith('_') || entry === '_template' || entry === '_archive') continue;
    const dir = join(tasksRoot, entry);
    const st = statSync(dir);
    if (!st.isDirectory()) continue;
    const stateFile = join(dir, 'state.json');
    if (!existsSync(stateFile)) continue;
    const stateMtime = statSync(stateFile).mtime.getTime();
    out.push({ slug: entry, dir, mtime: stateMtime });
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

async function runHookStop(opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());

  let featureSlug = opts.feature;
  let featureDir;

  if (featureSlug) {
    featureDir = join(projectRoot, 'docs', 'tasks', featureSlug);
    if (!existsSync(join(featureDir, 'state.json'))) {
      throw new Error(`xp-stack hook-stop: feature '${featureSlug}' nao encontrada em docs/tasks/${featureSlug}/state.json`);
    }
  } else {
    // Auto-detect: pega a feature mais recentemente modificada
    const features = listFeatureDirs(projectRoot);
    if (features.length === 0) {
      // No-op silencioso (hook roda em todo Stop, mesmo se nao ha feature)
      return;
    }
    const top = features[0];
    featureSlug = top.slug;
    featureDir = top.dir;
  }

  const state = readState(featureDir);
  if (!state) return; // defensive — readState valida existsSync mas tem race

  registerFeature(projectRoot, featureSlug, state.phase);
  // RESUME.md regen vira em T12
}

export function registerHookStop(program) {
  program
    .command('hook-stop')
    .description('Chamado pelo hook Stop do Claude Code: atualiza index.json (e RESUME.md em T12)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .option('--feature <slug>', 'feature especifica (default: auto-detect mais recente em docs/tasks/)')
    .action(async (opts) => {
      await runHookStop(opts);
    });
  return program;
}
EOF
```

- [ ] **Step 5: Modificar `src/cli/commands/init.js` pra suportar `--with-hooks`**

Adicionar import no topo:
```javascript
import { existsSync, readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
```

(Substitui o import existente de `node:fs` que tinha só `existsSync, readdirSync, statSync`. **OBSERVAÇÃO:** após T3 fix do `walkDir`, init.js NÃO importa esses 3 — `walkDir` foi extraído. Então o subagent precisa adicionar `existsSync, readFileSync, writeFileSync` ao import de fs (pode estar zerado ou só `existsSync` — verificar antes de editar).)

Adicionar uma helper function antes de `registerInit`:

```javascript
const HOOK_STOP_COMMAND = 'npx xp-stack hook-stop';

function injectHookStop(projectRoot) {
  const settingsPath = join(projectRoot, '.claude', 'settings.json');
  let settings = {};
  if (existsSync(settingsPath)) {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  }
  settings.hooks ??= {};
  settings.hooks.Stop ??= [];

  // Idempotente: nao adicionar se ja existe entry com nosso command
  const alreadyPresent = settings.hooks.Stop.some((entry) =>
    entry.hooks?.some((h) => h.command === HOOK_STOP_COMMAND)
  );
  if (alreadyPresent) return;

  settings.hooks.Stop.push({
    matcher: '',
    hooks: [{ type: 'command', command: HOOK_STOP_COMMAND }],
  });

  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}
```

(Note: `mkdirSync` + `dirname` precisam estar no import. Verificar imports existentes.)

No final de `runInit`, adicionar antes de `console.log`:

```javascript
  if (opts.withHooks && engines.includes('claude-code')) {
    injectHookStop(projectRoot);
    console.log('Hook Stop injetado em .claude/settings.json (call: npx xp-stack hook-stop)');
  }
```

E no `registerInit` adicionar nova option:

```javascript
    .option('--with-hooks', 'injeta hook Stop em .claude/settings.json (so se claude-code engine presente)')
```

- [ ] **Step 6: Wire up em `src/cli/index.js`**

Adicionar:
```javascript
import { registerHookStop } from './commands/hook-stop.js';
```
e `registerHookStop(program);` após `registerResume(program);`.

- [ ] **Step 7: Verificar PASS** — `npx vitest run tests/cli/hook-stop.test.js`. Esperado: 7 testes verde.

Suite total esperada: 65 (W0+W1) + 8 (T10) + 7 (T11) = **80 verde**.

- [ ] **Step 8: Commit T11**

```bash
cd /home/rnobre/dev/xp-stack
git add src/cli/index.js src/cli/commands/hook-stop.js src/cli/commands/init.js templates/settings.json.template tests/cli/hook-stop.test.js
git commit -m "feat(cli): adiciona hook-stop + init --with-hooks (T11 W2)

Subcomando hook-stop implementado:
- xp-stack hook-stop [--cwd <dir>] [--feature <slug>]
- Default: auto-detect feature mais recente em docs/tasks/ (mtime de state.json)
- Atualiza index.json via registerFeature (last_touched + phase)
- No-op silencioso se docs/tasks/ vazio (hook roda sempre)
- Throw claro se --feature inexistente

init ganhou --with-hooks (default OFF):
- Injeta hook Stop em .claude/settings.json (so se claude-code engine)
- Idempotente: re-rodar nao duplica entries
- Hook command: 'npx xp-stack hook-stop'
- Merge nao-destrutivo com settings.json existente

Tests: 7 cenarios (4 hook-stop + 3 init --with-hooks)."
git push origin feat/v1.0.0-ship
```

---

## Task 12: subcomando `regenerate-resume` + lib `resume-generator`

**Files:**
- Create: `src/lib/resume-generator.js`
- Create: `src/cli/commands/regenerate-resume.js`
- Create: `tests/lib/resume-generator.test.js`
- Create: `tests/cli/regenerate-resume.test.js`
- Modify: `src/cli/index.js` (wire up registerRegenerateResume)
- Modify: `src/cli/commands/hook-stop.js` (chamar regen RESUME no fim)

> **Conteúdo do RESUME.md:** snapshot vivo com phase, tasks completed/pending, blockers, last_session_summary. Spec exato em `00-overview.md` Decisão 11. Pra evitar testes brittle de exact match, lib gera string e tests verificam que campos-chave aparecem (regex), não match literal.

- [ ] **Step 1: Escrever teste falho do generator**

Criar `tests/lib/resume-generator.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { generateResumeMarkdown } from '../../src/lib/resume-generator.js';

describe('resume-generator', () => {
  const baseState = {
    schema_version: '1.0',
    feature: 'v1.0.0-ship',
    doc_level: 'completo',
    phase: 'implementacao',
    phases_completed: ['fundacao', 'testes'],
    phases_pending: ['refatoracao', 'integracao', 'cicd'],
    current_task: 'T3',
    tasks_completed: ['T1', 'T2'],
    tasks_pending: ['T3', 'T4', 'T5'],
    blockers: [],
    last_checkpoint_at: '2026-05-03T12:00:00Z',
    last_session_summary: 'T2 GREEN, todos os 14 cenarios passando',
  };

  it('gera markdown com header, status atual, tasks tables, como retomar', () => {
    const md = generateResumeMarkdown(baseState);
    // Header obvio
    expect(md).toMatch(/# v1\.0\.0-ship — Resume/);
    // Phase
    expect(md).toMatch(/Fase:.*implementacao/i);
    // Progresso
    expect(md).toMatch(/2 de 5 tasks/i);
    // Tasks pending listadas
    expect(md).toMatch(/T3/);
    expect(md).toMatch(/T4/);
    // Como retomar
    expect(md).toMatch(/como retomar|continuar|resume/i);
  });

  it('inclui blockers se houver', () => {
    const state = { ...baseState, blockers: [{ task: 'T3', reason: 'aguardando aprovacao do Pilot' }] };
    const md = generateResumeMarkdown(state);
    expect(md).toMatch(/aguardando aprovacao/);
  });

  it('inclui last_session_summary se houver', () => {
    const md = generateResumeMarkdown(baseState);
    expect(md).toMatch(/T2 GREEN/);
  });

  it('lida com state minimo (sem campos opcionais)', () => {
    const minimal = {
      schema_version: '1.0',
      feature: 'feature-x',
      phase: 'fundacao',
      phases_completed: [],
      phases_pending: ['testes', 'implementacao', 'refatoracao', 'integracao', 'cicd'],
      tasks_completed: [],
      tasks_pending: [],
    };
    expect(() => generateResumeMarkdown(minimal)).not.toThrow();
    const md = generateResumeMarkdown(minimal);
    expect(md).toMatch(/feature-x/);
    expect(md).toMatch(/fundacao/);
  });
});
```

- [ ] **Step 2: Verificar FAIL** — `npx vitest run tests/lib/resume-generator.test.js`.

- [ ] **Step 3: Implementar `src/lib/resume-generator.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/lib/resume-generator.js <<'EOF'
/**
 * Gera markdown do RESUME.md a partir de um state object.
 *
 * @param {object} state - State valido contra state.schema.json
 * @returns {string} Markdown completo (com newlines, pronto pra writeFileSync)
 */
export function generateResumeMarkdown(state) {
  const lines = [];
  const totalTasks = state.tasks_completed.length + state.tasks_pending.length;
  const completedCount = state.tasks_completed.length;

  lines.push(`# ${state.feature} — Resume`);
  lines.push('');
  lines.push(`> Ultima atualizacao: ${state.last_checkpoint_at ?? new Date().toISOString()}`);
  lines.push(`> Proxima sessao: digite \`/xp-stack:resume ${state.feature}\` ou leia este arquivo`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Status atual');
  lines.push('');
  lines.push(`- **Fase:** ${state.phase} (${state.phases_completed.length} de ${state.phases_completed.length + state.phases_pending.length} fases concluidas)`);
  lines.push(`- **Task atual:** ${state.current_task ?? '(nenhuma definida)'}`);
  lines.push(`- **Progresso:** ${completedCount} de ${totalTasks} tasks concluidas`);
  lines.push('');

  if (state.tasks_completed.length > 0) {
    lines.push('## Tasks concluidas');
    lines.push('');
    for (const t of state.tasks_completed) {
      lines.push(`- [x] ${t}`);
    }
    lines.push('');
  }

  if (state.tasks_pending.length > 0) {
    lines.push('## Tasks pendentes');
    lines.push('');
    for (const t of state.tasks_pending) {
      const marker = t === state.current_task ? '<- PROXIMA' : '';
      lines.push(`- [ ] ${t} ${marker}`.trim());
    }
    lines.push('');
  }

  if (state.blockers && state.blockers.length > 0) {
    lines.push('## Blockers');
    lines.push('');
    for (const b of state.blockers) {
      lines.push(`- **${b.task}**: ${b.reason}`);
    }
    lines.push('');
  } else {
    lines.push('## Blockers');
    lines.push('');
    lines.push('Nenhum.');
    lines.push('');
  }

  if (state.last_session_summary) {
    lines.push('## Ultima sessao');
    lines.push('');
    lines.push(state.last_session_summary);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Como retomar');
  lines.push('');
  lines.push(`1. Abra nova sessao no diretorio do projeto`);
  lines.push(`2. Digite: \`xp-stack resume ${state.feature}\``);
  lines.push(`3. O orquestrador lera state.json e perguntara onde continuar`);
  lines.push('');

  return lines.join('\n');
}
EOF
```

- [ ] **Step 4: Verificar PASS do generator** — `npx vitest run tests/lib/resume-generator.test.js`. Esperado: 4 verde.

- [ ] **Step 5: Escrever teste falho do subcomando**

Criar `tests/cli/regenerate-resume.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack regenerate-resume', () => {
  let tmp, featureDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-regen-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
    featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
    writeFileSync(join(featureDir, 'state.json'), JSON.stringify({
      schema_version: '1.0', feature: 'feature-x', phase: 'implementacao',
      phases_completed: ['fundacao', 'testes'],
      phases_pending: ['refatoracao', 'integracao', 'cicd'],
      tasks_completed: ['T1', 'T2'], tasks_pending: ['T3'], blockers: [],
    }, null, 2));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('gera RESUME.md em docs/tasks/feature-x/', () => {
    execFileSync('node', [BIN, 'regenerate-resume', 'feature-x', '--cwd', tmp], { encoding: 'utf8' });
    const resumePath = join(featureDir, 'RESUME.md');
    expect(existsSync(resumePath)).toBe(true);
    const content = readFileSync(resumePath, 'utf8');
    expect(content).toMatch(/feature-x/);
    expect(content).toMatch(/implementacao/);
  });

  it('falha se feature dir nao existe', () => {
    expect(() => {
      execFileSync('node', [BIN, 'regenerate-resume', 'feature-inexistente', '--cwd', tmp], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/nao encontrad|not found/i);
  });

  it('regenerate sobrescreve RESUME.md existente', () => {
    const resumePath = join(featureDir, 'RESUME.md');
    writeFileSync(resumePath, '# Conteudo antigo\n', 'utf8');
    execFileSync('node', [BIN, 'regenerate-resume', 'feature-x', '--cwd', tmp], { encoding: 'utf8' });
    const content = readFileSync(resumePath, 'utf8');
    expect(content).not.toMatch(/Conteudo antigo/);
    expect(content).toMatch(/feature-x — Resume/);
  });
});
```

- [ ] **Step 6: Verificar FAIL** do subcomando — `npx vitest run tests/cli/regenerate-resume.test.js`.

- [ ] **Step 7: Implementar `src/cli/commands/regenerate-resume.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/cli/commands/regenerate-resume.js <<'EOF'
import { existsSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readState } from '../../lib/state.js';
import { generateResumeMarkdown } from '../../lib/resume-generator.js';

async function runRegenerateResume(slug, opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const featureDir = join(projectRoot, 'docs', 'tasks', slug);
  if (!existsSync(featureDir)) {
    throw new Error(`xp-stack regenerate-resume: feature '${slug}' nao encontrada em docs/tasks/${slug}/`);
  }
  const state = readState(featureDir);
  if (!state) {
    throw new Error(`xp-stack regenerate-resume: state.json nao encontrado em ${featureDir}/`);
  }
  const md = generateResumeMarkdown(state);
  writeFileSync(join(featureDir, 'RESUME.md'), md, 'utf8');
  console.log(`xp-stack regenerate-resume: ${slug}/RESUME.md regenerado.`);
}

export function registerRegenerateResume(program) {
  program
    .command('regenerate-resume <slug>')
    .description('Regenera RESUME.md de uma feature a partir de state.json')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .action(async (slug, opts) => {
      await runRegenerateResume(slug, opts);
    });
  return program;
}
EOF
```

- [ ] **Step 8: Wire up em `src/cli/index.js`**

Adicionar `import { registerRegenerateResume } from './commands/regenerate-resume.js';` e `registerRegenerateResume(program);`.

- [ ] **Step 9: Estender `hook-stop.js` pra chamar regen automaticamente**

Editar `src/cli/commands/hook-stop.js` adicionando ao final do `runHookStop` (após o `registerFeature`):

```javascript
  // Regenera RESUME.md automaticamente (T12)
  try {
    const md = generateResumeMarkdown(state);
    const { writeFileSync } = await import('node:fs');
    writeFileSync(join(featureDir, 'RESUME.md'), md, 'utf8');
  } catch (err) {
    // Silent fail: hook nunca deve travar fim de sessao do user
    console.error(`xp-stack hook-stop: nao foi possivel regenerar RESUME.md: ${err.message}`);
  }
```

E adicionar import no topo:
```javascript
import { generateResumeMarkdown } from '../../lib/resume-generator.js';
```

- [ ] **Step 10: Verificar PASS** — `npx vitest run tests/cli/regenerate-resume.test.js`. Esperado: 3 verde.

Reverificar tests do hook-stop ainda passam (não devem ter regression):
```bash
npx vitest run tests/cli/hook-stop.test.js
```
Esperado: 7 verde.

Suite total esperada: 80 (W0+W1+T10+T11) + 4 (T12 generator) + 3 (T12 cmd) = **87 verde**.

- [ ] **Step 11: Commit T12**

```bash
cd /home/rnobre/dev/xp-stack
git add src/lib/resume-generator.js src/cli/commands/regenerate-resume.js src/cli/commands/hook-stop.js src/cli/index.js tests/lib/resume-generator.test.js tests/cli/regenerate-resume.test.js
git commit -m "feat(cli): adiciona regenerate-resume + RESUME.md auto-gen no hook-stop (T12 W2)

Lib resume-generator.js:
- generateResumeMarkdown(state) -> string markdown completo
- Inclui phase, tasks tables, blockers, last_session_summary, como retomar
- Robusto pra state com campos opcionais ausentes

Subcomando regenerate-resume:
- xp-stack regenerate-resume <slug> [--cwd <dir>]
- Le state.json + gera + grava RESUME.md em docs/tasks/<slug>/
- Throw se feature ou state nao existe

hook-stop estendido:
- Apos registerFeature, regenera RESUME.md silenciosamente
- Silent fail (hook nao trava end of session)

Tests: 4 generator + 3 regenerate-resume = 7 novos. Suite: 87 verde."
git push origin feat/v1.0.0-ship
```

---

## Task 13: subcomando `reconcile` + lib `markdown-tasks`

**Files:**
- Create: `src/lib/markdown-tasks.js`
- Create: `src/cli/commands/reconcile.js`
- Create: `tests/lib/markdown-tasks.test.js`
- Create: `tests/cli/reconcile.test.js`
- Modify: `src/cli/index.js` (wire up registerReconcile)

> **Reconcile semantics:** quando `tasks.json` (T14 vai criar de fato; aqui T13 trabalha com `state.json` apenas porque tasks.json é deferido pra W3) e `00-overview.md` divergem na **status de tasks**, JSON wins (regra de design v1.0.0). Markdown é regenerado pra refletir JSON. Pra W2: reconcile sincroniza `state.tasks_completed/pending` com a coluna Status da tabela do `00-overview.md` (que usa pattern `[x] Concluida` / `[ ] Pendente`).

- [ ] **Step 1: Escrever teste falho da lib**

Criar `tests/lib/markdown-tasks.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { parseTasksTable, renderTasksTable } from '../../src/lib/markdown-tasks.js';

describe('markdown-tasks - parseTasksTable', () => {
  it('extrai tasks de uma tabela markdown padrao do projeto', () => {
    const md = `
## Tasks

| Task | Subject | Status |
|------|---------|--------|
| T1 | Primeira | [x] Concluida 2026-05-03 |
| T2 | Segunda | [ ] Pendente |
| T3 | Terceira | [ ] Pendente — bloqueada por T2 |
`;
    const tasks = parseTasksTable(md);
    expect(tasks.length).toBe(3);
    expect(tasks[0]).toEqual({ id: 'T1', status: 'completed', raw: '[x] Concluida 2026-05-03' });
    expect(tasks[1]).toEqual({ id: 'T2', status: 'pending', raw: '[ ] Pendente' });
    expect(tasks[2]).toEqual({ id: 'T3', status: 'pending', raw: '[ ] Pendente — bloqueada por T2' });
  });

  it('retorna array vazio se nao tem tabela', () => {
    expect(parseTasksTable('# Sem tabela aqui\n')).toEqual([]);
  });

  it('ignora linhas que nao casam com pattern T<n>', () => {
    const md = `
| Task | Subject | Status |
|------|---------|--------|
| T1 | x | [x] Concluida |
| Some other row | y | z |
`;
    const tasks = parseTasksTable(md);
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe('T1');
  });
});

describe('markdown-tasks - renderTasksTable (sincroniza com state)', () => {
  it('atualiza status [ ] -> [x] pra tasks em state.tasks_completed', () => {
    const md = `
| Task | Subject | Status |
|------|---------|--------|
| T1 | Primeira | [ ] Pendente |
| T2 | Segunda | [ ] Pendente |
`;
    const state = {
      tasks_completed: ['T1'],
      tasks_pending: ['T2'],
    };
    const updated = renderTasksTable(md, state, '2026-05-03');
    expect(updated).toMatch(/T1.*\[x\] Concluida 2026-05-03/);
    expect(updated).toMatch(/T2.*\[ \] Pendente/);
  });

  it('preserva linhas fora da tabela', () => {
    const md = `
# Header

prosa antes

| Task | Subject | Status |
|------|---------|--------|
| T1 | x | [ ] Pendente |

prosa depois
`;
    const state = { tasks_completed: ['T1'], tasks_pending: [] };
    const updated = renderTasksTable(md, state, '2026-05-03');
    expect(updated).toMatch(/# Header/);
    expect(updated).toMatch(/prosa antes/);
    expect(updated).toMatch(/prosa depois/);
    expect(updated).toMatch(/T1.*\[x\] Concluida/);
  });

  it('preserva metadata pos-status (ex: bloqueada por T2)', () => {
    const md = `
| Task | Subject | Status |
|------|---------|--------|
| T2 | x | [ ] Pendente — bloqueada por T1 |
`;
    const state = { tasks_completed: [], tasks_pending: ['T2'] };
    const updated = renderTasksTable(md, state, '2026-05-03');
    expect(updated).toMatch(/T2.*\[ \] Pendente — bloqueada por T1/);
  });
});
```

- [ ] **Step 2: Verificar FAIL** — `npx vitest run tests/lib/markdown-tasks.test.js`.

- [ ] **Step 3: Implementar `src/lib/markdown-tasks.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/lib/markdown-tasks.js <<'EOF'
const TASK_ROW_RE = /^\|\s*(?:\[?)(T\d+(?:\.\d+)?)(?:\]\([^)]+\))?\s*\|.*?\|\s*(.*?)\s*\|/;

/**
 * Parseia tabela de tasks de um markdown.
 * Detecta linhas que comecam com pipe + T<num> e retorna {id, status, raw}.
 *
 * status = 'completed' se raw comeca com [x], 'pending' se comeca com [ ]
 *
 * @param {string} markdown
 * @returns {Array<{id: string, status: 'completed'|'pending', raw: string}>}
 */
export function parseTasksTable(markdown) {
  const out = [];
  for (const line of markdown.split('\n')) {
    const m = line.match(TASK_ROW_RE);
    if (!m) continue;
    const id = m[1];
    const raw = m[2];
    let status;
    if (raw.startsWith('[x]')) status = 'completed';
    else if (raw.startsWith('[ ]')) status = 'pending';
    else continue; // linha de header da tabela ou separator
    out.push({ id, status, raw });
  }
  return out;
}

/**
 * Re-renderiza tabela de tasks no markdown sincronizando com state.
 * Substitui o status (coluna 3) pra cada linha matched.
 * Preserva o resto da linha (subject, metadata pos-status).
 *
 * @param {string} markdown - Markdown original
 * @param {{tasks_completed: string[], tasks_pending: string[]}} state
 * @param {string} dateStr - YYYY-MM-DD pra anexar em "[x] Concluida <date>"
 * @returns {string} Markdown atualizado
 */
export function renderTasksTable(markdown, state, dateStr) {
  const completedSet = new Set(state.tasks_completed);
  const pendingSet = new Set(state.tasks_pending);

  return markdown.split('\n').map((line) => {
    const m = line.match(TASK_ROW_RE);
    if (!m) return line;
    const id = m[1];
    const oldRaw = m[2];

    // So mexer se o id esta em alguma das listas
    if (!completedSet.has(id) && !pendingSet.has(id)) return line;

    let newStatus;
    if (completedSet.has(id)) {
      // Preserva metadata pos-Concluida (ex: refs a commits)
      // Se ja era completed, mantem; se era pending, vira "Concluida <date>"
      if (oldRaw.startsWith('[x]')) {
        newStatus = oldRaw; // ja completed, nao mexer
      } else {
        newStatus = `[x] Concluida ${dateStr}`;
      }
    } else {
      // pending: preserva metadata pos-Pendente (ex: "bloqueada por T2")
      if (oldRaw.startsWith('[ ]')) {
        newStatus = oldRaw; // ja pending, nao mexer
      } else {
        newStatus = '[ ] Pendente';
      }
    }

    // Substituir oldRaw por newStatus na linha
    return line.replace(oldRaw, newStatus);
  }).join('\n');
}
EOF
```

- [ ] **Step 4: Verificar PASS** — `npx vitest run tests/lib/markdown-tasks.test.js`. Esperado: 6 verde.

- [ ] **Step 5: Escrever teste falho do reconcile**

Criar `tests/cli/reconcile.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack reconcile', () => {
  let tmp, featureDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-reconcile-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
    featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
    writeFileSync(join(featureDir, 'state.json'), JSON.stringify({
      schema_version: '1.0', feature: 'feature-x', phase: 'implementacao',
      phases_completed: ['fundacao', 'testes'],
      phases_pending: ['refatoracao', 'integracao', 'cicd'],
      tasks_completed: ['T1', 'T2'], tasks_pending: ['T3', 'T4'], blockers: [],
    }, null, 2));
    // 00-overview com tasks "desatualizadas" (T1 e T2 ainda como [ ] Pendente)
    writeFileSync(join(featureDir, '00-overview.md'), `# feature-x

## Tasks

| Task | Subject | Status |
|------|---------|--------|
| T1 | Primeira | [ ] Pendente |
| T2 | Segunda | [ ] Pendente |
| T3 | Terceira | [ ] Pendente |
| T4 | Quarta | [ ] Pendente |
`, 'utf8');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('detecta divergencia + atualiza markdown (JSON wins)', () => {
    execFileSync('node', [BIN, 'reconcile', 'feature-x', '--cwd', tmp, '--apply'], { encoding: 'utf8' });
    const overview = readFileSync(join(featureDir, '00-overview.md'), 'utf8');
    expect(overview).toMatch(/T1.*\[x\] Concluida/);
    expect(overview).toMatch(/T2.*\[x\] Concluida/);
    expect(overview).toMatch(/T3.*\[ \] Pendente/);
    expect(overview).toMatch(/T4.*\[ \] Pendente/);
  });

  it('sem --apply, mostra diff em dry-run (markdown nao muda)', () => {
    const before = readFileSync(join(featureDir, '00-overview.md'), 'utf8');
    const out = execFileSync('node', [BIN, 'reconcile', 'feature-x', '--cwd', tmp], { encoding: 'utf8' });
    const after = readFileSync(join(featureDir, '00-overview.md'), 'utf8');
    expect(after).toBe(before); // sem mudanca
    expect(out).toMatch(/divergencia|drift|diff/i);
  });

  it('sem divergencia, reporta "ja sincronizado"', () => {
    // Sincroniza primeiro
    execFileSync('node', [BIN, 'reconcile', 'feature-x', '--cwd', tmp, '--apply'], { encoding: 'utf8' });
    const out = execFileSync('node', [BIN, 'reconcile', 'feature-x', '--cwd', tmp], { encoding: 'utf8' });
    expect(out).toMatch(/sincronizado|nothing to reconcile|sync/i);
  });

  it('falha se feature nao existe', () => {
    expect(() => {
      execFileSync('node', [BIN, 'reconcile', 'feature-inexistente', '--cwd', tmp], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/nao encontrad|not found/i);
  });
});
```

- [ ] **Step 6: Verificar FAIL** — `npx vitest run tests/cli/reconcile.test.js`.

- [ ] **Step 7: Implementar `src/cli/commands/reconcile.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/cli/commands/reconcile.js <<'EOF'
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readState } from '../../lib/state.js';
import { parseTasksTable, renderTasksTable } from '../../lib/markdown-tasks.js';

async function runReconcile(slug, opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const featureDir = join(projectRoot, 'docs', 'tasks', slug);
  if (!existsSync(featureDir)) {
    throw new Error(`xp-stack reconcile: feature '${slug}' nao encontrada em docs/tasks/${slug}/`);
  }
  const state = readState(featureDir);
  if (!state) {
    throw new Error(`xp-stack reconcile: state.json nao encontrado em ${featureDir}/`);
  }
  const overviewPath = join(featureDir, '00-overview.md');
  if (!existsSync(overviewPath)) {
    throw new Error(`xp-stack reconcile: 00-overview.md nao encontrado em ${featureDir}/`);
  }
  const overview = readFileSync(overviewPath, 'utf8');
  const parsed = parseTasksTable(overview);

  // Detecta divergencias
  const completedSet = new Set(state.tasks_completed);
  const pendingSet = new Set(state.tasks_pending);
  const divergences = [];
  for (const t of parsed) {
    const inJsonCompleted = completedSet.has(t.id);
    const inJsonPending = pendingSet.has(t.id);
    if (!inJsonCompleted && !inJsonPending) continue; // task no markdown mas nao no state — skip
    const expectedStatus = inJsonCompleted ? 'completed' : 'pending';
    if (t.status !== expectedStatus) {
      divergences.push({ id: t.id, markdown: t.status, state: expectedStatus });
    }
  }

  if (divergences.length === 0) {
    console.log(`xp-stack reconcile: ${slug} ja sincronizado (sem drift entre state.json e 00-overview.md).`);
    return;
  }

  console.log(`xp-stack reconcile: ${divergences.length} divergencia(s) detectada(s) em ${slug}/00-overview.md:`);
  for (const d of divergences) {
    console.log(`  - ${d.id}: markdown=${d.markdown}, state=${d.state} -> JSON wins`);
  }

  if (!opts.apply) {
    console.log('\nDry-run (sem --apply). Use --apply pra atualizar markdown com base no state.json.');
    return;
  }

  // Apply: regera markdown
  const today = new Date().toISOString().slice(0, 10);
  const updated = renderTasksTable(overview, state, today);
  writeFileSync(overviewPath, updated, 'utf8');
  console.log(`xp-stack reconcile: 00-overview.md atualizado com ${divergences.length} mudanca(s).`);
}

export function registerReconcile(program) {
  program
    .command('reconcile <slug>')
    .description('Sincroniza 00-overview.md com state.json (JSON wins). Default: dry-run.')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .option('--apply', 'aplica mudancas no markdown (sem isto: dry-run)')
    .action(async (slug, opts) => {
      await runReconcile(slug, opts);
    });
  return program;
}
EOF
```

- [ ] **Step 8: Wire up em `src/cli/index.js`**

Adicionar `import { registerReconcile } from './commands/reconcile.js';` e `registerReconcile(program);`.

- [ ] **Step 9: Verificar PASS** — `npx vitest run tests/cli/reconcile.test.js`. Esperado: 4 verde.

Suite total esperada: 87 + 6 (markdown-tasks) + 4 (reconcile) = **97 verde**.

- [ ] **Step 10: Commit T13**

```bash
cd /home/rnobre/dev/xp-stack
git add src/lib/markdown-tasks.js src/cli/commands/reconcile.js src/cli/index.js tests/lib/markdown-tasks.test.js tests/cli/reconcile.test.js
git commit -m "feat(cli): adiciona reconcile + lib markdown-tasks (T13 W2)

Lib markdown-tasks.js:
- parseTasksTable(md) -> [{id, status, raw}] de pipes em tabelas com T<n>
- renderTasksTable(md, state, dateStr) atualiza coluna Status (JSON wins)
- Preserva metadata pos-status (ex: 'bloqueada por T2')
- Preserva linhas fora da tabela (prosa, headers)

Subcomando reconcile:
- xp-stack reconcile <slug> [--cwd <dir>] [--apply]
- Default dry-run: lista divergencias state.json vs 00-overview.md
- --apply: atualiza markdown (JSON wins regra v1.0.0)
- Throw se feature ou state ou overview nao existem

Tests: 6 lib + 4 cmd = 10 novos. Suite: 97 verde."
git push origin feat/v1.0.0-ship
```

---

## Conclusão da Onda 2

Após T10-T13 mergeados em `feat/v1.0.0-ship`, o repo terá:

✅ Helper `state.js` pra read/write state.json per-feature com schema validation
✅ Subcomando `hook-stop` (chamado pelo hook Stop do Claude Code)
✅ `init --with-hooks` injeta hook em `.claude/settings.json` (idempotente)
✅ Lib `resume-generator.js` + subcomando `regenerate-resume`
✅ Auto-regen de RESUME.md no fim de toda sessão (via hook-stop)
✅ Lib `markdown-tasks.js` + subcomando `reconcile` (JSON↔markdown sync)
✅ ~32 tests novos verde (suite total ~97)

**Próximo passo:** invocar `writing-plans` quando começar W3 (Schemas + Agents: tasks.json + render, sources/claims.json + render, db-archaeologist, screenshot-spec-writer, flowchart-extractor — 5 tasks paralelizáveis).

---

## Checklist de saída de W2

- [x] T10 (state `d1289c5`) commitado e pushed
- [x] T11 (hook-stop + init --with-hooks `945cf56`) commitado e pushed
- [x] T12 (resume-generator + regenerate-resume + hook-stop estendido `91b3879`) commitado e pushed
- [x] T13 (markdown-tasks + reconcile `8f3acc0`) commitado e pushed + W2 followup (`e9721f9` try/catch padronizado em todos 10 subcomandos)
- [x] `npx vitest run` verde (97 tests)
- [x] `npm run test:bash` verde (53 preservados — confirmado pelo final reviewer)
- [x] `node bin/xp-stack --help` lista 10 subcomandos: version, init, update, status, add-engine, add-skill, uninstall, resume, hook-stop, regenerate-resume, reconcile
- [x] Smoke E2E: confirmado pelo W2 consolidated reviewer (init --with-hooks → settings.json válido → criar feature simulada → hook-stop auto-detect → RESUME.md criado → reconcile detecta+aplica → overview atualizado → resume mostra feature)
- [x] `00-overview.md`: T10-T13 marcados `[x] Concluida 2026-05-03 (commits)`

**Issues conhecidos deferidos pra W3+/polish:**
- Flaky em `tests/cli/init.test.js > idempotente` quando suite roda em paralelo (race condition em `add-skill.test.js` que cria/remove dirs em REPO_ROOT). Pré-existente desde T7 W1, não regressão de W2. Fix: refatorar `add-skill.test.js` pra usar fixture isolada via env var injection.
- T10 commit subject 76 chars (acima do guideline 72, abaixo do hard limit 80). Não-corrigível pós-push.
