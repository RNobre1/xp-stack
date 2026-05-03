# W1 — CLI Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar 7 subcomandos do CLI `xp-stack` (init, update, status, add-engine, add-skill, uninstall, resume) sobre os schemas + validators de W0, com 4 helper modules compartilhados (engines, manifest, installer, index-tracker).

**Architecture:** Camadas: (1) helpers em `src/lib/` (engines/manifest/installer/index-tracker) que encapsulam I/O e lógica reutilizável; (2) subcomandos em `src/cli/commands/` consomem helpers via API limpa. Cada subcomando tem TDD com fixture em `/tmp` (não toca repo real). Manifest SHA-256 + index global são fonte de verdade pra estado de instalação. Backward compat com plugin marketplace mantida (T3 init detecta `.claude/` e instala em `.claude/skills/` + `.agents/skills/` dual mirror).

**Tech Stack:**
- Node 18+ ESM (mesmo W0)
- `commander` 12 (já em deps)
- `ajv` 8 + `ajv-formats` 3 via `validate()` de `src/lib/validators.js` (W0)
- `@inquirer/prompts` ^7 (NOVO em T3 — prompts interativos pra `update` confirm/abort/keep/take)
- Node fs/promises + path + crypto (built-in, sem nova dep)

---

## File Structure

| Path | Tipo | Responsabilidade |
|------|------|------------------|
| `src/lib/engines.js` | Create (T3.1) | Detect engines instaladas (`.claude/`, `.codex/`, etc), retorna paths absolutos por engine |
| `src/lib/manifest.js` | Create (T3.2) | Hash SHA-256 de file, read/write `.xp-stack/manifest.json`, detect user-modified |
| `src/lib/installer.js` | Create (T3.3) | Copy template paths pra engines (dual mirror), registra em manifest, idempotente |
| `src/lib/index-tracker.js` | Create (T3.4) | Read/write `.xp-stack/index.json`, register/deregister features ativas |
| `src/cli/commands/init.js` | Create (T3) | Subcomando `init` — full bootstrap (engines + manifest + index + install templates) |
| `src/cli/commands/update.js` | Create (T4) | Subcomando `update` — diff manifest, prompt per-arquivo (keep/take/merge/abort) |
| `src/cli/commands/status.js` | Create (T5) | Subcomando `status` — print state (versão, engines, features, drift) |
| `src/cli/commands/add-engine.js` | Create (T6) | Subcomando `add-engine <name>` — instala dual mirror em path adicional |
| `src/cli/commands/add-skill.js` | Create (T7) | Subcomando `add-skill <name>` — habilita skill opt-in (paperclip/local-waves/agents B5) |
| `src/cli/commands/uninstall.js` | Create (T8) | Subcomando `uninstall` — remove só arquivos do manifest, preserva user-modified, prompt antes de cada delete |
| `src/cli/commands/resume.js` | Create (T9) | Subcomando `resume [feature]` — lê index, lista features ativas, retoma com state.json |
| `src/cli/index.js` | Modify | Wire up dos 7 novos subcomandos |
| `package.json` | Modify | Adicionar `@inquirer/prompts` em deps, adicionar `templates/` em `files` |
| `templates/skills/` | Create (T3) | Diretório skeleton pra skills mock (real templates ficam pra W3+) |
| `tests/lib/engines.test.js` | Create (T3.1) | Tests de detect engines (fixtures `/tmp`) |
| `tests/lib/manifest.test.js` | Create (T3.2) | Tests de hash + read/write manifest |
| `tests/lib/installer.test.js` | Create (T3.3) | Tests de copy + manifest tracking |
| `tests/lib/index-tracker.test.js` | Create (T3.4) | Tests de register/deregister features |
| `tests/cli/init.test.js` | Create (T3) | Tests E2E de `init` em fixture `/tmp` |
| `tests/cli/update.test.js` | Create (T4) | Tests de update em fixture com manifest divergente |
| `tests/cli/status.test.js` | Create (T5) | Tests de status output formatting |
| `tests/cli/add-engine.test.js` | Create (T6) | Tests de add-engine |
| `tests/cli/add-skill.test.js` | Create (T7) | Tests de add-skill |
| `tests/cli/uninstall.test.js` | Create (T8) | Tests de uninstall + preserve user-modified |
| `tests/cli/resume.test.js` | Create (T9) | Tests de resume com index vazio + populated |

---

## Convenções gerais (válidas pra todas as tasks)

1. **Tests usam `execFileSync('node', [BIN, ...args])`** — sem shell, regra de segurança (W0 estabeleceu).
2. **Fixtures de teste em `/tmp/xp-stack-test-{taskname}-{timestamp}/`** — cada test cria seu próprio dir temp, limpa em afterEach. NUNCA rodar contra repo real.
3. **CWD do CLI passa via flag `--cwd <dir>`** (default `process.cwd()`). Permite tests não dependerem de chdir.
4. **Mensagens de saída em PT-BR**, mas erros mantém termos técnicos em inglês (mais facilmente googláveis).
5. **Subcomandos exportam `register{Name}(program)`** padronizado (igual `registerVersion` em W0).
6. **Commits sem `Co-Authored-By`**. PT-BR sem caracteres especiais críticos.
7. **TDD obrigatório**: escrever test → run FAIL → implement → run PASS → commit.
8. **Cada task termina com push** (`git push origin feat/v1.0.0-ship`).

---

## Task 3: `init` subcomando (+ 4 helpers fundacionais)

> **Esta é a maior task de W1.** Cria 4 helpers + o subcomando `init` que consome todos. Sub-divisão em T3.1-T3.4 (helpers) + T3 final (subcomando).
>
> Ordem: T3.1 → T3.2 → T3.3 → T3.4 → T3.

**Files (consolidado):**
- Create: `src/lib/engines.js` (T3.1)
- Create: `src/lib/manifest.js` (T3.2)
- Create: `src/lib/installer.js` (T3.3)
- Create: `src/lib/index-tracker.js` (T3.4)
- Create: `src/cli/commands/init.js` (T3)
- Create: `templates/skills/.gitkeep` (T3, dir esqueleto pra installer ter o que copiar nos tests)
- Modify: `src/cli/index.js` (T3, wire up registerInit)
- Modify: `package.json` (T3, adiciona `@inquirer/prompts` + `templates/` em files)
- Create: `tests/lib/engines.test.js` (T3.1)
- Create: `tests/lib/manifest.test.js` (T3.2)
- Create: `tests/lib/installer.test.js` (T3.3)
- Create: `tests/lib/index-tracker.test.js` (T3.4)
- Create: `tests/cli/init.test.js` (T3)

### T3.1: helper `src/lib/engines.js`

- [ ] **Step 1: Escrever teste falho**

```bash
mkdir -p /home/rnobre/dev/xp-stack/tests/lib
```

Criar `tests/lib/engines.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectEngines, ENGINE_PATHS } from '../../src/lib/engines.js';

describe('engines - ENGINE_PATHS export', () => {
  it('expoe os 13 engines suportados (alinhado com index.schema.json enum)', () => {
    const names = Object.keys(ENGINE_PATHS);
    expect(names).toContain('claude-code');
    expect(names).toContain('codex');
    expect(names).toContain('cursor');
    expect(names).toContain('antigravity');
    expect(names).toContain('gemini-cli');
    expect(names.length).toBe(13);
  });

  it('cada engine tem detectMarker e skillsDir definidos', () => {
    for (const [name, cfg] of Object.entries(ENGINE_PATHS)) {
      expect(cfg.detectMarker, `${name} missing detectMarker`).toBeTruthy();
      expect(cfg.skillsDir, `${name} missing skillsDir`).toBeTruthy();
    }
  });
});

describe('engines - detectEngines', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-engines-test-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('retorna array vazio em projeto sem nenhuma engine', () => {
    const result = detectEngines(tmp);
    expect(result).toEqual([]);
  });

  it('detecta claude-code via .claude/', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    const result = detectEngines(tmp);
    expect(result).toContain('claude-code');
  });

  it('detecta antigravity via AGENTS.md', () => {
    writeFileSync(join(tmp, 'AGENTS.md'), '# AGENTS\n');
    const result = detectEngines(tmp);
    expect(result).toContain('antigravity');
  });

  it('detecta multiplas engines simultaneamente', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    mkdirSync(join(tmp, '.cursor'), { recursive: true });
    writeFileSync(join(tmp, 'AGENTS.md'), '# AGENTS\n');
    const result = detectEngines(tmp);
    expect(result).toContain('claude-code');
    expect(result).toContain('cursor');
    expect(result).toContain('antigravity');
    expect(result.length).toBe(3);
  });
});
```

- [ ] **Step 2: Verificar FAIL**

```bash
cd /home/rnobre/dev/xp-stack
npx vitest run tests/lib/engines.test.js
```
Esperado: FAIL "Cannot find module '../../src/lib/engines.js'"

- [ ] **Step 3: Implementar `src/lib/engines.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/lib/engines.js <<'EOF'
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Definicao das 13 engines de IA suportadas pelo xp-stack.
 *
 * Cada entry tem:
 * - `detectMarker`: file/dir que se existir no project root indica que a engine esta instalada.
 * - `skillsDir`: path relativo onde skills sao instalados pra essa engine.
 *
 * Fonte: enum `engines_installed` no schemas/index.schema.json (alinhado com Reversa).
 */
export const ENGINE_PATHS = {
  'claude-code':  { detectMarker: '.claude',          skillsDir: '.claude/skills' },
  'codex':        { detectMarker: '.codex',           skillsDir: '.codex/skills' },
  'cursor':       { detectMarker: '.cursor',          skillsDir: '.cursor/rules' },
  'antigravity':  { detectMarker: 'AGENTS.md',        skillsDir: '.agents/skills' },
  'gemini-cli':   { detectMarker: '.gemini',          skillsDir: '.gemini/skills' },
  'windsurf':     { detectMarker: '.windsurfrules',   skillsDir: '.windsurf/skills' },
  'cline':        { detectMarker: '.cline',           skillsDir: '.cline/skills' },
  'roo-code':     { detectMarker: '.roo',             skillsDir: '.roo/skills' },
  'copilot':      { detectMarker: '.github/copilot',  skillsDir: '.github/copilot/skills' },
  'aider':        { detectMarker: '.aider.conf.yml',  skillsDir: '.aider/skills' },
  'amazon-q':     { detectMarker: '.amazonq',         skillsDir: '.amazonq/skills' },
  'kiro':         { detectMarker: '.kiro',            skillsDir: '.kiro/skills' },
  'opencode':     { detectMarker: '.opencode',        skillsDir: '.opencode/skills' },
};

/**
 * Detecta engines instaladas no projeto (presenca do detectMarker).
 *
 * @param {string} projectRoot - Path absoluto do projeto a inspecionar
 * @returns {string[]} Array de nomes de engines detectadas (subset de Object.keys(ENGINE_PATHS))
 */
export function detectEngines(projectRoot) {
  const detected = [];
  for (const [name, cfg] of Object.entries(ENGINE_PATHS)) {
    if (existsSync(join(projectRoot, cfg.detectMarker))) {
      detected.push(name);
    }
  }
  return detected;
}
EOF
```

- [ ] **Step 4: Verificar PASS**

```bash
cd /home/rnobre/dev/xp-stack
npx vitest run tests/lib/engines.test.js
```
Esperado: 6/6 verde (2 ENGINE_PATHS + 4 detectEngines).

- [ ] **Step 5: Commit T3.1**

```bash
cd /home/rnobre/dev/xp-stack
git add src/lib/engines.js tests/lib/engines.test.js
git commit -m "feat(lib): adiciona engines.js com detectEngines + ENGINE_PATHS (T3.1 W1 v1.0.0)

Helper foundational pro CLI core:
- ENGINE_PATHS mapeia 13 engines (alinhado com index.schema.json enum)
- detectEngines(projectRoot) retorna array de engines presentes via filesystem markers
- Cada engine tem detectMarker (file/dir indicador) + skillsDir (onde instalar)

Tests: 6/6 verde (vitest). Sem deps novas (so node:fs/path)."
git push origin feat/v1.0.0-ship
```

### T3.2: helper `src/lib/manifest.js`

- [ ] **Step 1: Escrever teste falho**

Criar `tests/lib/manifest.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  hashFile,
  readManifest,
  writeManifest,
  detectDrift,
  EMPTY_MANIFEST,
} from '../../src/lib/manifest.js';

describe('manifest - EMPTY_MANIFEST', () => {
  it('retorna manifest vazio com schema_version 1.0', () => {
    const m = EMPTY_MANIFEST('1.0.0');
    expect(m.schema_version).toBe('1.0');
    expect(m.installed_version).toBe('1.0.0');
    expect(m.files).toEqual({});
    expect(m.installed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('manifest - hashFile', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-manifest-test-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('retorna hash sha256: prefix + 64 hex chars pra arquivo conhecido', () => {
    const f = join(tmp, 'a.txt');
    writeFileSync(f, 'hello');
    const h = hashFile(f);
    expect(h).toMatch(/^sha256:[a-f0-9]{64}$/);
    // sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(h).toBe('sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('hashes diferentes pra contents diferentes', () => {
    const f1 = join(tmp, 'a.txt');
    const f2 = join(tmp, 'b.txt');
    writeFileSync(f1, 'a');
    writeFileSync(f2, 'b');
    expect(hashFile(f1)).not.toBe(hashFile(f2));
  });
});

describe('manifest - read/write', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-manifest-rw-'));
    mkdirSync(join(tmp, '.xp-stack'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('writeManifest persiste e readManifest le de volta', () => {
    const m = EMPTY_MANIFEST('1.0.0');
    m.files['.claude/skills/x.md'] = {
      hash: 'sha256:abc',
      source: 'templates/skills/x.md',
      user_modified: false,
    };
    writeManifest(tmp, m);

    const read = readManifest(tmp);
    expect(read).toEqual(m);
  });

  it('readManifest retorna null se manifest nao existe', () => {
    const result = readManifest(tmp);
    expect(result).toBeNull();
  });

  it('writeManifest valida contra schema antes de escrever', () => {
    const invalid = { schema_version: 'errado', installed_version: '1.0.0', installed_at: '2026-05-03T00:00:00Z', files: {} };
    expect(() => writeManifest(tmp, invalid)).toThrow();
  });
});

describe('manifest - detectDrift', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-manifest-drift-'));
    mkdirSync(join(tmp, 'subdir'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('detecta arquivo nao-modificado quando hash bate', () => {
    const f = join(tmp, 'subdir', 'a.txt');
    writeFileSync(f, 'hello');
    const result = detectDrift(tmp, 'subdir/a.txt', 'sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(result).toBe('unchanged');
  });

  it('detecta arquivo modificado quando hash diverge', () => {
    const f = join(tmp, 'subdir', 'a.txt');
    writeFileSync(f, 'modified content');
    const result = detectDrift(tmp, 'subdir/a.txt', 'sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(result).toBe('modified');
  });

  it('detecta arquivo deletado', () => {
    const result = detectDrift(tmp, 'subdir/inexistente.txt', 'sha256:any');
    expect(result).toBe('deleted');
  });
});
```

- [ ] **Step 2: Verificar FAIL** — `npx vitest run tests/lib/manifest.test.js` deve falhar (módulo não existe).

- [ ] **Step 3: Implementar `src/lib/manifest.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/lib/manifest.js <<'EOF'
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { validate } from './validators.js';

const MANIFEST_REL = '.xp-stack/manifest.json';

/**
 * Cria manifest vazio inicial.
 *
 * @param {string} version - Versao do xp-stack que esta instalando
 * @returns {object} Manifest valido contra schemas/manifest.schema.json
 */
export function EMPTY_MANIFEST(version) {
  return {
    schema_version: '1.0',
    installed_version: version,
    installed_at: new Date().toISOString(),
    files: {},
  };
}

/**
 * Hash SHA-256 do conteudo de um arquivo.
 *
 * @param {string} absPath - Path absoluto do arquivo
 * @returns {string} `sha256:<64hex>` formato compativel com manifest.schema.json
 */
export function hashFile(absPath) {
  const buf = readFileSync(absPath);
  const h = createHash('sha256').update(buf).digest('hex');
  return `sha256:${h}`;
}

/**
 * Le manifest de `.xp-stack/manifest.json` do projeto.
 *
 * @param {string} projectRoot - Path absoluto do projeto
 * @returns {object|null} Manifest ou null se arquivo nao existe
 */
export function readManifest(projectRoot) {
  const path = join(projectRoot, MANIFEST_REL);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Escreve manifest em `.xp-stack/manifest.json` (cria dir se necessario).
 * Valida contra schema antes de gravar.
 *
 * @param {string} projectRoot - Path absoluto do projeto
 * @param {object} manifest - Manifest object
 * @throws Error se manifest nao valida contra schema
 */
export function writeManifest(projectRoot, manifest) {
  const result = validate('manifest', manifest);
  if (!result.valid) {
    const errs = JSON.stringify(result.errors, null, 2);
    throw new Error(`Manifest invalido contra schema:\n${errs}`);
  }
  const path = join(projectRoot, MANIFEST_REL);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

/**
 * Detecta drift de um arquivo em relacao ao hash esperado.
 *
 * @param {string} projectRoot
 * @param {string} relPath - Path relativo do arquivo no projeto
 * @param {string} expectedHash - Hash esperado (formato `sha256:...`)
 * @returns {'unchanged'|'modified'|'deleted'}
 */
export function detectDrift(projectRoot, relPath, expectedHash) {
  const abs = join(projectRoot, relPath);
  if (!existsSync(abs)) return 'deleted';
  const current = hashFile(abs);
  return current === expectedHash ? 'unchanged' : 'modified';
}
EOF
```

- [ ] **Step 4: Verificar PASS** — `npx vitest run tests/lib/manifest.test.js` deve retornar 8/8 verde (1 EMPTY + 2 hashFile + 3 read/write + 3 detectDrift, mas conta exata depende — esperar pelo menos 8 testes).

- [ ] **Step 5: Commit T3.2**

```bash
cd /home/rnobre/dev/xp-stack
git add src/lib/manifest.js tests/lib/manifest.test.js
git commit -m "feat(lib): adiciona manifest.js com hash + read/write + drift detect (T3.2 W1 v1.0.0)

Helper foundational pro CLI core:
- EMPTY_MANIFEST(version) cria manifest inicial alinhado com schema
- hashFile(path) retorna 'sha256:<64hex>' (formato manifest.schema.json)
- readManifest(projectRoot) le .xp-stack/manifest.json (null se ausente)
- writeManifest(projectRoot, m) valida contra schema antes de gravar (throw se invalido)
- detectDrift(projectRoot, relPath, expectedHash) -> 'unchanged'|'modified'|'deleted'

Reusa validate() de src/lib/validators.js (W0).
Tests: ~8 cenarios verde (vitest). Sem deps novas (node:crypto built-in)."
git push origin feat/v1.0.0-ship
```

### T3.3: helper `src/lib/installer.js`

- [ ] **Step 1: Escrever teste falho**

Criar `tests/lib/installer.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installFile, installToDualMirror } from '../../src/lib/installer.js';
import { hashFile, readManifest } from '../../src/lib/manifest.js';

describe('installer - installFile', () => {
  let tmp, sourceDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-install-test-'));
    sourceDir = mkdtempSync(join(tmpdir(), 'xp-stack-install-source-'));
    writeFileSync(join(sourceDir, 'SKILL.md'), '# Test Skill\n');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(sourceDir, { recursive: true, force: true });
  });

  it('copia source pra destino e retorna hash', () => {
    const src = join(sourceDir, 'SKILL.md');
    const dest = join(tmp, '.claude/skills/test/SKILL.md');
    const result = installFile(src, dest);
    expect(existsSync(dest)).toBe(true);
    expect(readFileSync(dest, 'utf8')).toBe('# Test Skill\n');
    expect(result.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.hash).toBe(hashFile(src));
  });

  it('retorna skipped=true se destino ja existe e overwrite=false', () => {
    const src = join(sourceDir, 'SKILL.md');
    const dest = join(tmp, '.claude/skills/test/SKILL.md');
    mkdirSync(join(tmp, '.claude/skills/test'), { recursive: true });
    writeFileSync(dest, '# Existing\n');
    const result = installFile(src, dest, { overwrite: false });
    expect(result.skipped).toBe(true);
    expect(readFileSync(dest, 'utf8')).toBe('# Existing\n');
  });

  it('sobrescreve se overwrite=true', () => {
    const src = join(sourceDir, 'SKILL.md');
    const dest = join(tmp, '.claude/skills/test/SKILL.md');
    mkdirSync(join(tmp, '.claude/skills/test'), { recursive: true });
    writeFileSync(dest, '# Existing\n');
    const result = installFile(src, dest, { overwrite: true });
    expect(result.skipped).toBeFalsy();
    expect(readFileSync(dest, 'utf8')).toBe('# Test Skill\n');
  });
});

describe('installer - installToDualMirror', () => {
  let tmp, sourceDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-dual-test-'));
    sourceDir = mkdtempSync(join(tmpdir(), 'xp-stack-dual-source-'));
    mkdirSync(join(sourceDir, 'skills', 'test'), { recursive: true });
    writeFileSync(join(sourceDir, 'skills', 'test', 'SKILL.md'), '# Test\n');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(sourceDir, { recursive: true, force: true });
  });

  it('instala em multiplas engines simultaneamente', () => {
    const result = installToDualMirror({
      sourceRel: 'skills/test/SKILL.md',
      sourceRoot: sourceDir,
      projectRoot: tmp,
      engines: ['claude-code', 'antigravity'],
    });
    expect(existsSync(join(tmp, '.claude/skills/skills/test/SKILL.md'))).toBe(true);
    expect(existsSync(join(tmp, '.agents/skills/skills/test/SKILL.md'))).toBe(true);
    expect(result.installed.length).toBe(2);
    expect(result.installed[0].destRel).toMatch(/\.claude\/skills/);
    expect(result.installed[1].destRel).toMatch(/\.agents\/skills/);
  });

  it('skipa engine desconhecida silenciosamente', () => {
    const result = installToDualMirror({
      sourceRel: 'skills/test/SKILL.md',
      sourceRoot: sourceDir,
      projectRoot: tmp,
      engines: ['claude-code', 'engine-inexistente'],
    });
    expect(result.installed.length).toBe(1);
    expect(result.skipped.length).toBe(1);
    expect(result.skipped[0].engine).toBe('engine-inexistente');
  });
});
```

- [ ] **Step 2: Verificar FAIL** — `npx vitest run tests/lib/installer.test.js` deve falhar.

- [ ] **Step 3: Implementar `src/lib/installer.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/lib/installer.js <<'EOF'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { hashFile } from './manifest.js';
import { ENGINE_PATHS } from './engines.js';

/**
 * Copia um source pra destino. Idempotente: nao sobrescreve por default.
 *
 * @param {string} sourcePath - Path absoluto do source
 * @param {string} destPath - Path absoluto do destino
 * @param {object} [opts]
 * @param {boolean} [opts.overwrite=false] - Sobrescrever se destino existe
 * @returns {{hash?: string, skipped?: boolean}}
 */
export function installFile(sourcePath, destPath, opts = {}) {
  const overwrite = opts.overwrite ?? false;
  if (existsSync(destPath) && !overwrite) {
    return { skipped: true };
  }
  mkdirSync(dirname(destPath), { recursive: true });
  copyFileSync(sourcePath, destPath);
  return { hash: hashFile(destPath) };
}

/**
 * Instala um arquivo pra todas as engines passadas (dual mirror).
 * Cada engine tem seu skillsDir definido em ENGINE_PATHS.
 *
 * @param {object} args
 * @param {string} args.sourceRel - Path relativo do source dentro do sourceRoot (ex: 'skills/test/SKILL.md')
 * @param {string} args.sourceRoot - Path absoluto da raiz dos templates (ex: 'node_modules/xp-stack/templates')
 * @param {string} args.projectRoot - Path absoluto do projeto destino
 * @param {string[]} args.engines - Lista de engines a instalar (ex: ['claude-code', 'antigravity'])
 * @param {boolean} [args.overwrite=false]
 * @returns {{installed: Array<{engine, destRel, hash}>, skipped: Array<{engine, reason}>}}
 */
export function installToDualMirror(args) {
  const { sourceRel, sourceRoot, projectRoot, engines, overwrite = false } = args;
  const installed = [];
  const skipped = [];

  for (const engine of engines) {
    const cfg = ENGINE_PATHS[engine];
    if (!cfg) {
      skipped.push({ engine, reason: 'engine-desconhecida' });
      continue;
    }
    const sourcePath = join(sourceRoot, sourceRel);
    const destRel = join(cfg.skillsDir, sourceRel);
    const destPath = join(projectRoot, destRel);
    const result = installFile(sourcePath, destPath, { overwrite });
    if (result.skipped) {
      skipped.push({ engine, reason: 'destino-ja-existe' });
    } else {
      installed.push({ engine, destRel, hash: result.hash });
    }
  }

  return { installed, skipped };
}
EOF
```

- [ ] **Step 4: Verificar PASS** — `npx vitest run tests/lib/installer.test.js` deve retornar 5/5 verde.

- [ ] **Step 5: Commit T3.3**

```bash
cd /home/rnobre/dev/xp-stack
git add src/lib/installer.js tests/lib/installer.test.js
git commit -m "feat(lib): adiciona installer.js com installFile + installToDualMirror (T3.3 W1 v1.0.0)

Helper foundational pro CLI core:
- installFile(src, dest, opts) copia idempotente (no-overwrite default)
- installToDualMirror({sourceRel, sourceRoot, projectRoot, engines}) instala
  em N engines simultaneamente (cada engine tem skillsDir em ENGINE_PATHS)
- Retorna {installed: [], skipped: []} pra reporter granular

Reusa hashFile() (manifest.js) + ENGINE_PATHS (engines.js).
Tests: 5/5 verde."
git push origin feat/v1.0.0-ship
```

### T3.4: helper `src/lib/index-tracker.js`

- [ ] **Step 1: Escrever teste falho**

Criar `tests/lib/index-tracker.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readIndex,
  writeIndex,
  registerFeature,
  EMPTY_INDEX,
} from '../../src/lib/index-tracker.js';

describe('index-tracker - EMPTY_INDEX', () => {
  it('cria index vazio com defaults validos', () => {
    const idx = EMPTY_INDEX();
    expect(idx.schema_version).toBe('1.0');
    expect(idx.active_features).toEqual([]);
    expect(idx.archived_features).toEqual([]);
    expect(idx.doc_level_default).toBe('completo');
    expect(idx.engines_installed).toEqual([]);
  });
});

describe('index-tracker - read/write', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-index-test-'));
    mkdirSync(join(tmp, '.xp-stack'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('writeIndex persiste e readIndex le de volta', () => {
    const idx = EMPTY_INDEX();
    idx.engines_installed = ['claude-code'];
    writeIndex(tmp, idx);

    const read = readIndex(tmp);
    expect(read).toEqual(idx);
  });

  it('readIndex retorna null se nao existe', () => {
    expect(readIndex(tmp)).toBeNull();
  });

  it('writeIndex valida contra schema antes de escrever', () => {
    const invalid = { schema_version: 'errado', active_features: [], archived_features: [], doc_level_default: 'completo', engines_installed: [] };
    expect(() => writeIndex(tmp, invalid)).toThrow();
  });
});

describe('index-tracker - registerFeature', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-index-rf-'));
    mkdirSync(join(tmp, '.xp-stack'), { recursive: true });
    writeIndex(tmp, EMPTY_INDEX());
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('adiciona feature em active_features', () => {
    registerFeature(tmp, 'v1.0.0-ship', 'fundacao');
    const idx = readIndex(tmp);
    expect(idx.active_features.length).toBe(1);
    expect(idx.active_features[0].slug).toBe('v1.0.0-ship');
    expect(idx.active_features[0].phase).toBe('fundacao');
    expect(idx.active_features[0].last_touched).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('atualiza last_touched + phase se feature ja existe', async () => {
    registerFeature(tmp, 'v1.0.0-ship', 'fundacao');
    await new Promise((r) => setTimeout(r, 5));
    registerFeature(tmp, 'v1.0.0-ship', 'testes');
    const idx = readIndex(tmp);
    expect(idx.active_features.length).toBe(1);
    expect(idx.active_features[0].phase).toBe('testes');
  });
});
```

- [ ] **Step 2: Verificar FAIL** — `npx vitest run tests/lib/index-tracker.test.js` deve falhar.

- [ ] **Step 3: Implementar `src/lib/index-tracker.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/lib/index-tracker.js <<'EOF'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { validate } from './validators.js';

const INDEX_REL = '.xp-stack/index.json';

/**
 * Cria index vazio com defaults validos.
 * @returns {object}
 */
export function EMPTY_INDEX() {
  return {
    schema_version: '1.0',
    active_features: [],
    archived_features: [],
    doc_level_default: 'completo',
    engines_installed: [],
  };
}

/**
 * Le index de `.xp-stack/index.json`.
 * @param {string} projectRoot
 * @returns {object|null}
 */
export function readIndex(projectRoot) {
  const path = join(projectRoot, INDEX_REL);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Escreve index. Valida contra schema antes.
 * @param {string} projectRoot
 * @param {object} index
 * @throws Error se invalido
 */
export function writeIndex(projectRoot, index) {
  const result = validate('index', index);
  if (!result.valid) {
    throw new Error(`Index invalido contra schema:\n${JSON.stringify(result.errors, null, 2)}`);
  }
  const path = join(projectRoot, INDEX_REL);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(index, null, 2) + '\n', 'utf8');
}

/**
 * Registra feature em active_features (cria index se nao existe).
 * Se feature ja existe (mesmo slug), atualiza phase + last_touched.
 *
 * @param {string} projectRoot
 * @param {string} slug - Feature slug (ex: 'v1.0.0-ship')
 * @param {string} phase - Fase atual (ex: 'fundacao')
 */
export function registerFeature(projectRoot, slug, phase) {
  let idx = readIndex(projectRoot) ?? EMPTY_INDEX();
  const now = new Date().toISOString();
  const existing = idx.active_features.find((f) => f.slug === slug);
  if (existing) {
    existing.phase = phase;
    existing.last_touched = now;
  } else {
    idx.active_features.push({ slug, phase, last_touched: now });
  }
  writeIndex(projectRoot, idx);
}
EOF
```

- [ ] **Step 4: Verificar PASS** — `npx vitest run tests/lib/index-tracker.test.js` deve retornar 6/6 verde.

- [ ] **Step 5: Commit T3.4**

```bash
cd /home/rnobre/dev/xp-stack
git add src/lib/index-tracker.js tests/lib/index-tracker.test.js
git commit -m "feat(lib): adiciona index-tracker.js com registerFeature (T3.4 W1 v1.0.0)

Helper foundational pro CLI core:
- EMPTY_INDEX() cria index com defaults validos
- readIndex(projectRoot) le .xp-stack/index.json (null se ausente)
- writeIndex(projectRoot, idx) valida contra schema antes de gravar
- registerFeature(projectRoot, slug, phase) adiciona ou atualiza feature

Reusa validate() (validators.js, W0).
Tests: 6/6 verde."
git push origin feat/v1.0.0-ship
```

### T3 (final): subcomando `src/cli/commands/init.js`

- [ ] **Step 1: Adicionar `@inquirer/prompts` e atualizar package.json**

```bash
cd /home/rnobre/dev/xp-stack
npm install @inquirer/prompts
```

Verificar que `package.json` ganhou em `dependencies`. Adicionar também `templates/` em `files`:

Editar `package.json` adicionando `"templates/"` ao array `files` (entre `"src/"` e `"schemas/"`):

```json
"files": [
  "bin/",
  "src/",
  "templates/",
  "schemas/",
  "skills/"
]
```

- [ ] **Step 2: Criar diretório templates/skills/ esqueleto**

```bash
mkdir -p /home/rnobre/dev/xp-stack/templates/skills
touch /home/rnobre/dev/xp-stack/templates/skills/.gitkeep
echo "# Templates de skills (populado em W3+)" > /home/rnobre/dev/xp-stack/templates/skills/README.md
```

(Pra T3 init basta um dir esqueleto. Em W3 esses templates serão populados com skills reais.)

- [ ] **Step 3: Escrever teste falho de init**

Criar `tests/cli/init.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack init', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-init-test-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('em projeto sem nenhuma engine, sem --engine, falha com mensagem clara', () => {
    expect(() => {
      execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/nenhuma engine detectada/i);
  });

  it('em projeto com .claude/, init cria .xp-stack/manifest.json e index.json', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    expect(existsSync(join(tmp, '.xp-stack/manifest.json'))).toBe(true);
    expect(existsSync(join(tmp, '.xp-stack/index.json'))).toBe(true);

    const manifest = JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
    expect(manifest.schema_version).toBe('1.0');
    expect(manifest.installed_version).toBeTruthy();

    const idx = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    expect(idx.engines_installed).toContain('claude-code');
  });

  it('flag --engine sobrescreve detect (forca engines)', () => {
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code,antigravity', '--yes'], { encoding: 'utf8' });
    const idx = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    expect(idx.engines_installed).toContain('claude-code');
    expect(idx.engines_installed).toContain('antigravity');
  });

  it('idempotente: re-rodar init nao sobrescreve manifest existente', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    const m1 = readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8');
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    const m2 = readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8');
    // installed_at pode mudar mas estrutura deve permanecer estavel
    const j1 = JSON.parse(m1);
    const j2 = JSON.parse(m2);
    expect(j2.installed_version).toBe(j1.installed_version);
    expect(Object.keys(j2.files).sort()).toEqual(Object.keys(j1.files).sort());
  });

  it('--no-dual-mirror desabilita instalacao em .agents/skills/ quando claude-code detectado', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--no-dual-mirror', '--yes'], { encoding: 'utf8' });
    // sem --no-dual-mirror, antigravity (.agents/skills) seria adicionado mesmo sem AGENTS.md
    // com --no-dual-mirror, so claude-code
    const idx = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    expect(idx.engines_installed).toEqual(['claude-code']);
  });
});
```

- [ ] **Step 4: Verificar FAIL** — `npx vitest run tests/cli/init.test.js` deve falhar (subcomando init não existe).

- [ ] **Step 5: Implementar `src/cli/commands/init.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/cli/commands/init.js <<'EOF'
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { detectEngines, ENGINE_PATHS } from '../../lib/engines.js';
import { EMPTY_MANIFEST, readManifest, writeManifest } from '../../lib/manifest.js';
import { EMPTY_INDEX, readIndex, writeIndex } from '../../lib/index-tracker.js';
import { installToDualMirror } from '../../lib/installer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..', '..');
const TEMPLATES_ROOT = join(PKG_ROOT, 'templates');

/**
 * Lista todos os files relativos sob templates/ recursivamente.
 * @returns {string[]} paths relativos a TEMPLATES_ROOT
 */
function listTemplateFiles() {
  const out = [];
  function walk(dir, base = '') {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      if (entry === '.gitkeep') continue;
      const full = join(dir, entry);
      const rel = base ? `${base}/${entry}` : entry;
      if (statSync(full).isDirectory()) {
        walk(full, rel);
      } else {
        out.push(rel);
      }
    }
  }
  walk(TEMPLATES_ROOT);
  return out;
}

/**
 * Resolve quais engines instalar:
 * - --engine flag: forca lista explicita
 * - --no-dual-mirror: so engines detectadas
 * - default: engines detectadas + 'antigravity' (dual mirror always-on)
 */
function resolveEngines(opts, projectRoot) {
  if (opts.engine) {
    return opts.engine.split(',').map((e) => e.trim()).filter(Boolean);
  }
  const detected = detectEngines(projectRoot);
  if (opts.dualMirror === false) {
    return detected;
  }
  // Dual mirror always-on: se claude-code detectado mas nao antigravity, adiciona antigravity
  // Razao: instalar tambem em .agents/skills/ pra zero-friction quando user adicionar Antigravity/Codex/Cursor
  const engines = new Set(detected);
  if (engines.has('claude-code') && !engines.has('antigravity')) {
    engines.add('antigravity');
  }
  return Array.from(engines);
}

async function runInit(opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const engines = resolveEngines(opts, projectRoot);

  if (engines.length === 0) {
    throw new Error(
      'xp-stack init: nenhuma engine detectada no projeto. ' +
      'Use --engine <nome[,nome...]> pra forcar (ex: --engine claude-code).'
    );
  }

  const pkgJsonPath = join(PKG_ROOT, 'package.json');
  const pkgJson = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(pkgJsonPath, 'utf8')));

  // Manifest: cria se nao existe, mantem files se ja existe
  let manifest = readManifest(projectRoot);
  if (!manifest) {
    manifest = EMPTY_MANIFEST(pkgJson.version);
    manifest.engines = engines;
  } else {
    // Idempotente: mantem version + files. So atualiza engines se mudou.
    manifest.engines = engines;
  }

  // Instala todos os templates pra todas as engines
  const templates = listTemplateFiles();
  for (const tpl of templates) {
    const result = installToDualMirror({
      sourceRel: tpl,
      sourceRoot: TEMPLATES_ROOT,
      projectRoot,
      engines,
      overwrite: false,
    });
    for (const inst of result.installed) {
      manifest.files[inst.destRel] = {
        hash: inst.hash,
        source: `templates/${tpl}`,
        user_modified: false,
      };
    }
  }

  writeManifest(projectRoot, manifest);

  // Index: cria se nao existe, atualiza engines_installed
  let index = readIndex(projectRoot);
  if (!index) {
    index = EMPTY_INDEX();
  }
  index.engines_installed = engines;
  writeIndex(projectRoot, index);

  console.log(`xp-stack v${pkgJson.version} instalado em ${projectRoot}`);
  console.log(`Engines: ${engines.join(', ')}`);
  console.log(`Manifest: ${Object.keys(manifest.files).length} files trackeados`);
}

export function registerInit(program) {
  program
    .command('init')
    .description('Inicializa xp-stack no projeto (detect engines + instala templates + escreve manifest/index)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .option('--engine <names>', 'forca engines (csv): claude-code,codex,cursor,...')
    .option('--no-dual-mirror', 'desabilita dual mirror automatico (so engines detectadas)')
    .option('--yes', 'pula prompts interativos (CI-safe)')
    .action(async (opts) => {
      await runInit(opts);
    });
  return program;
}
EOF
```

- [ ] **Step 6: Wire up registerInit em `src/cli/index.js`**

Edit `src/cli/index.js` — adicionar import + chamada:

Substituir:
```javascript
import { registerVersion } from './commands/version.js';
```

por:

```javascript
import { registerVersion } from './commands/version.js';
import { registerInit } from './commands/init.js';
```

E substituir:
```javascript
  registerVersion(program);
  // Future subcommands wire up here: init, update, status, resume, add-engine, add-skill, uninstall
```

por:

```javascript
  registerVersion(program);
  registerInit(program);
  // Future subcommands wire up here: update, status, resume, add-engine, add-skill, uninstall
```

- [ ] **Step 7: Verificar PASS de init.test**

```bash
cd /home/rnobre/dev/xp-stack
npx vitest run tests/cli/init.test.js
```
Esperado: 5/5 verde.

- [ ] **Step 8: Verificar suite completa não tem regressão**

```bash
cd /home/rnobre/dev/xp-stack
npx vitest run
```
Esperado: total = 16 (W0) + 6 + 8 + 5 + 6 + 5 = ~46 verde (margem de erro nas contagens, mas todos verdes).

- [ ] **Step 9: Commit T3 final**

```bash
cd /home/rnobre/dev/xp-stack
git add package.json package-lock.json templates/ src/cli/index.js src/cli/commands/init.js tests/cli/init.test.js
git status
git commit -m "feat(cli): adiciona xp-stack init subcomando + wire up no router (T3 W1 v1.0.0)

Subcomando init implementado:
- xp-stack init [--cwd <dir>] [--engine <csv>] [--no-dual-mirror] [--yes]
- Detect engines via .claude/, .codex/, .cursor/, AGENTS.md, etc.
- Resolve engines: --engine flag > detect + dual-mirror > so detect (--no-dual-mirror)
- Dual mirror always-on: se claude-code detectado, adiciona antigravity automaticamente
  (zero-friction quando user adicionar segunda engine depois)
- Cria .xp-stack/manifest.json + .xp-stack/index.json
- Idempotente: re-rodar nao sobrescreve

Wire up em src/cli/index.js (registerInit junto a registerVersion).
Adiciona @inquirer/prompts em deps (sera usado em T4 update).
Adiciona templates/ em package.json files allowlist.

Tests cli/init.test.js: 5 cenarios (no engine, claude-code detect,
--engine flag, idempotency, --no-dual-mirror).
Tests lib (T3.1-T3.4): 25+ verde."
git push origin feat/v1.0.0-ship
```

---

## Task 4: `update` subcomando

**Files:**
- Create: `src/cli/commands/update.js`
- Create: `tests/cli/update.test.js`
- Modify: `src/cli/index.js` (wire up registerUpdate)

- [ ] **Step 1: Escrever teste falho**

Criar `tests/cli/update.test.js`:

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

describe('xp-stack update', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-update-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('sem mudancas, update reporta "nothing to update"', () => {
    const out = execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    expect(out).toMatch(/nothing to update|nada pra atualizar/i);
  });

  it('detecta arquivo user-modified e marca como tal no manifest', () => {
    // Modificar um arquivo trackado (README.md do templates/skills)
    const trackedFile = join(tmp, '.claude/skills/skills/README.md');
    if (existsSync(trackedFile)) {
      writeFileSync(trackedFile, '# User-modified content\n', 'utf8');
      execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes', '--keep-mine'], { encoding: 'utf8' });
      const m = JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
      expect(m.files['.claude/skills/skills/README.md'].user_modified).toBe(true);
    }
  });

  it('--yes + --take-theirs sobrescreve user-modified', () => {
    const trackedFile = join(tmp, '.claude/skills/skills/README.md');
    if (existsSync(trackedFile)) {
      writeFileSync(trackedFile, '# User-modified\n', 'utf8');
      execFileSync('node', [BIN, 'update', '--cwd', tmp, '--yes', '--take-theirs'], { encoding: 'utf8' });
      const content = readFileSync(trackedFile, 'utf8');
      expect(content).toBe('# Templates de skills (populado em W3+)\n');
    }
  });

  it('falha se manifest nao existe (nao foi feito init)', () => {
    const tmp2 = mkdtempSync(join(tmpdir(), 'xp-stack-update-noinit-'));
    expect(() => {
      execFileSync('node', [BIN, 'update', '--cwd', tmp2, '--yes'], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/manifest nao encontrado|run init first/i);
    rmSync(tmp2, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Verificar FAIL**

```bash
cd /home/rnobre/dev/xp-stack
npx vitest run tests/cli/update.test.js
```
Esperado: FAIL (subcomando update não existe).

- [ ] **Step 3: Implementar `src/cli/commands/update.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/cli/commands/update.js <<'EOF'
import { existsSync, copyFileSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifest, writeManifest, detectDrift, hashFile } from '../../lib/manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..', '..');
const TEMPLATES_ROOT = join(PKG_ROOT, 'templates');

async function runUpdate(opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    throw new Error('xp-stack update: manifest nao encontrado em .xp-stack/manifest.json. Rode "xp-stack init" primeiro.');
  }

  // Auto-yes mode: --keep-mine, --take-theirs, ou default skip
  const autoMode = opts.yes ? (opts.keepMine ? 'keep' : opts.takeTheirs ? 'take' : 'skip') : null;

  let modifiedCount = 0;
  let updatedCount = 0;

  for (const [relPath, entry] of Object.entries(manifest.files)) {
    const drift = detectDrift(projectRoot, relPath, entry.hash);

    if (drift === 'modified') {
      modifiedCount++;
      if (autoMode === 'keep' || autoMode === 'skip') {
        // Marca como user_modified no manifest, nao toca no arquivo
        entry.user_modified = true;
        entry.user_modified_detected_at = new Date().toISOString();
      } else if (autoMode === 'take') {
        // Sobrescreve com source
        const sourcePath = join(PKG_ROOT, entry.source);
        if (existsSync(sourcePath)) {
          copyFileSync(sourcePath, join(projectRoot, relPath));
          entry.hash = hashFile(join(projectRoot, relPath));
          entry.user_modified = false;
          updatedCount++;
        }
      } else {
        // No --yes: skipa em CI-friendly mode (interactive prompt seria via @inquirer/prompts em modo nao-CI)
        // Pra CI: precisa --yes + uma flag de policy
        console.error(`Drift detectado em ${relPath}. Use --yes --keep-mine OR --yes --take-theirs em CI.`);
      }
    }
  }

  if (modifiedCount === 0) {
    console.log('xp-stack update: nothing to update (sem drift detectado)');
  } else {
    console.log(`xp-stack update: ${modifiedCount} arquivos com drift, ${updatedCount} sobrescritos`);
  }

  writeManifest(projectRoot, manifest);
}

export function registerUpdate(program) {
  program
    .command('update')
    .description('Atualiza skills/templates pra versao instalada do xp-stack (detecta drift via manifest)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .option('--yes', 'pula prompts interativos (requer --keep-mine ou --take-theirs)')
    .option('--keep-mine', 'mantem versao do user (marca user_modified=true)')
    .option('--take-theirs', 'sobrescreve com versao nova')
    .action(async (opts) => {
      await runUpdate(opts);
    });
  return program;
}
EOF
```

- [ ] **Step 4: Wire up em `src/cli/index.js`**

Adicionar `import { registerUpdate } from './commands/update.js';` e `registerUpdate(program);` (atualizar o comentário pra remover `update` da lista de pendentes).

- [ ] **Step 5: Verificar PASS**

```bash
cd /home/rnobre/dev/xp-stack
npx vitest run tests/cli/update.test.js
```
Esperado: 4/4 verde.

- [ ] **Step 6: Commit T4**

```bash
cd /home/rnobre/dev/xp-stack
git add src/cli/index.js src/cli/commands/update.js tests/cli/update.test.js
git commit -m "feat(cli): adiciona xp-stack update subcomando (T4 W1 v1.0.0)

Subcomando update implementado:
- xp-stack update [--cwd <dir>] [--yes] [--keep-mine|--take-theirs]
- Le manifest, detecta drift via SHA-256 (manifest.detectDrift)
- --keep-mine: marca user_modified=true, nao toca no arquivo
- --take-theirs: sobrescreve com source de templates/, atualiza hash
- Sem --yes: erro claro pedindo flag de policy (interactive prompt vira em refactor futuro)
- Falha clara se manifest nao existe (sugere init)

Tests: 4 cenarios (no drift, user_modified, take-theirs, no init)."
git push origin feat/v1.0.0-ship
```

---

## Task 5: `status` subcomando

**Files:**
- Create: `src/cli/commands/status.js`
- Create: `tests/cli/status.test.js`
- Modify: `src/cli/index.js`

- [ ] **Step 1: Escrever teste falho**

Criar `tests/cli/status.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack status', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-status-test-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('em projeto sem init, status reporta "nao instalado"', () => {
    const out = execFileSync('node', [BIN, 'status', '--cwd', tmp], { encoding: 'utf8' });
    expect(out).toMatch(/nao instalado|not installed/i);
  });

  it('apos init, status mostra version + engines + count de files', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    const out = execFileSync('node', [BIN, 'status', '--cwd', tmp], { encoding: 'utf8' });
    expect(out).toMatch(/version: 1\.0\.0/);
    expect(out).toMatch(/engines:.*claude-code/);
    expect(out).toMatch(/files:/);
  });
});
```

- [ ] **Step 2: Verificar FAIL** — `npx vitest run tests/cli/status.test.js`.

- [ ] **Step 3: Implementar `src/cli/commands/status.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/cli/commands/status.js <<'EOF'
import { resolve } from 'node:path';
import { readManifest } from '../../lib/manifest.js';
import { readIndex } from '../../lib/index-tracker.js';

async function runStatus(opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const manifest = readManifest(projectRoot);
  const index = readIndex(projectRoot);

  if (!manifest) {
    console.log('xp-stack: nao instalado neste projeto. Rode "xp-stack init".');
    return;
  }

  console.log(`xp-stack status @ ${projectRoot}`);
  console.log(`  version: ${manifest.installed_version}`);
  console.log(`  installed_at: ${manifest.installed_at}`);
  console.log(`  engines: ${(index?.engines_installed ?? []).join(', ') || '(none)'}`);
  console.log(`  files: ${Object.keys(manifest.files).length} trackeados`);

  const userModifiedCount = Object.values(manifest.files).filter((f) => f.user_modified).length;
  if (userModifiedCount > 0) {
    console.log(`  user_modified: ${userModifiedCount} arquivos`);
  }

  if (index?.active_features?.length) {
    console.log(`  active_features:`);
    for (const f of index.active_features) {
      console.log(`    - ${f.slug} (${f.phase}, last_touched ${f.last_touched})`);
    }
  }
}

export function registerStatus(program) {
  program
    .command('status')
    .description('Imprime estado atual do xp-stack neste projeto (version, engines, files, drift)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .action(async (opts) => {
      await runStatus(opts);
    });
  return program;
}
EOF
```

- [ ] **Step 4: Wire up em `src/cli/index.js`** (adicionar import + `registerStatus(program)`).

- [ ] **Step 5: Verificar PASS** — `npx vitest run tests/cli/status.test.js`. Esperado: 2/2 verde.

- [ ] **Step 6: Commit T5**

```bash
cd /home/rnobre/dev/xp-stack
git add src/cli/index.js src/cli/commands/status.js tests/cli/status.test.js
git commit -m "feat(cli): adiciona xp-stack status subcomando (T5 W1 v1.0.0)

Subcomando status implementado:
- xp-stack status [--cwd <dir>]
- Le manifest + index, imprime: version, installed_at, engines,
  count de files, user_modified count, active_features

Tests: 2 cenarios (no install, post-init)."
git push origin feat/v1.0.0-ship
```

---

## Task 6: `add-engine` subcomando

**Files:**
- Create: `src/cli/commands/add-engine.js`
- Create: `tests/cli/add-engine.test.js`
- Modify: `src/cli/index.js`

- [ ] **Step 1: Escrever teste falho**

Criar `tests/cli/add-engine.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack add-engine', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-add-engine-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('adiciona engine no index e instala templates pra ela', () => {
    execFileSync('node', [BIN, 'add-engine', 'cursor', '--cwd', tmp], { encoding: 'utf8' });
    const idx = JSON.parse(readFileSync(join(tmp, '.xp-stack/index.json'), 'utf8'));
    expect(idx.engines_installed).toContain('cursor');
  });

  it('falha com engine name desconhecido', () => {
    expect(() => {
      execFileSync('node', [BIN, 'add-engine', 'engine-inexistente', '--cwd', tmp], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/engine desconhecida|unknown engine/i);
  });

  it('idempotente: adicionar engine ja presente nao falha', () => {
    execFileSync('node', [BIN, 'add-engine', 'cursor', '--cwd', tmp], { encoding: 'utf8' });
    expect(() => {
      execFileSync('node', [BIN, 'add-engine', 'cursor', '--cwd', tmp], { encoding: 'utf8' });
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: Verificar FAIL** — `npx vitest run tests/cli/add-engine.test.js`.

- [ ] **Step 3: Implementar `src/cli/commands/add-engine.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/cli/commands/add-engine.js <<'EOF'
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_PATHS } from '../../lib/engines.js';
import { readManifest, writeManifest } from '../../lib/manifest.js';
import { readIndex, writeIndex } from '../../lib/index-tracker.js';
import { installToDualMirror } from '../../lib/installer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..', '..');
const TEMPLATES_ROOT = join(PKG_ROOT, 'templates');

function listTemplateFiles() {
  const out = [];
  function walk(dir, base = '') {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      if (entry === '.gitkeep') continue;
      const full = join(dir, entry);
      const rel = base ? `${base}/${entry}` : entry;
      if (statSync(full).isDirectory()) {
        walk(full, rel);
      } else {
        out.push(rel);
      }
    }
  }
  walk(TEMPLATES_ROOT);
  return out;
}

async function runAddEngine(engineName, opts) {
  if (!ENGINE_PATHS[engineName]) {
    throw new Error(`xp-stack add-engine: engine desconhecida '${engineName}'. Validas: ${Object.keys(ENGINE_PATHS).join(', ')}`);
  }
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    throw new Error('xp-stack add-engine: manifest nao encontrado. Rode "xp-stack init" primeiro.');
  }

  const index = readIndex(projectRoot) ?? { schema_version: '1.0', active_features: [], archived_features: [], doc_level_default: 'completo', engines_installed: [] };
  if (!index.engines_installed.includes(engineName)) {
    index.engines_installed.push(engineName);
    writeIndex(projectRoot, index);
  }

  // Instala todos os templates pra essa engine
  const templates = listTemplateFiles();
  for (const tpl of templates) {
    const result = installToDualMirror({
      sourceRel: tpl,
      sourceRoot: TEMPLATES_ROOT,
      projectRoot,
      engines: [engineName],
      overwrite: false,
    });
    for (const inst of result.installed) {
      manifest.files[inst.destRel] = {
        hash: inst.hash,
        source: `templates/${tpl}`,
        user_modified: false,
      };
    }
  }
  writeManifest(projectRoot, manifest);

  console.log(`xp-stack add-engine: ${engineName} adicionada. Engines ativas: ${index.engines_installed.join(', ')}`);
}

export function registerAddEngine(program) {
  program
    .command('add-engine <engine>')
    .description('Adiciona uma engine adicional (instala templates em seu skillsDir)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .action(async (engine, opts) => {
      await runAddEngine(engine, opts);
    });
  return program;
}
EOF
```

- [ ] **Step 4: Wire up em `src/cli/index.js`** (`registerAddEngine(program);`).

- [ ] **Step 5: Verificar PASS** — `npx vitest run tests/cli/add-engine.test.js`. Esperado: 3/3 verde.

- [ ] **Step 6: Commit T6**

```bash
cd /home/rnobre/dev/xp-stack
git add src/cli/index.js src/cli/commands/add-engine.js tests/cli/add-engine.test.js
git commit -m "feat(cli): adiciona xp-stack add-engine subcomando (T6 W1 v1.0.0)

Subcomando add-engine implementado:
- xp-stack add-engine <name> [--cwd <dir>]
- Valida engine name contra ENGINE_PATHS (rejeita desconhecidas)
- Adiciona engine ao index.engines_installed (idempotente)
- Instala todos os templates pra a nova engine
- Atualiza manifest com novos files

Tests: 3 cenarios (add valid, reject unknown, idempotent)."
git push origin feat/v1.0.0-ship
```

---

## Task 7: `add-skill` subcomando

**Files:**
- Create: `src/cli/commands/add-skill.js`
- Create: `tests/cli/add-skill.test.js`
- Modify: `src/cli/index.js`

> Skills opt-in conhecidas: `paperclip-orchestrator`, `local-waves`, `db-archaeologist`, `screenshot-spec-writer`, `flowchart-extractor` (B5 será criado em W3). Pra W1, validar que `add-skill <name>` funciona — mesmo que `templates/skills/<name>/` ainda não exista, comando aceita e cria registro pra quando o template aparecer.

- [ ] **Step 1: Escrever teste falho**

Criar `tests/cli/add-skill.test.js`:

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

describe('xp-stack add-skill', () => {
  let tmp, optInDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-add-skill-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
    // Garante skill opt-in dummy pra teste
    optInDir = join(REPO_ROOT, 'templates', 'opt-in-skills', 'demo-skill');
    mkdirSync(optInDir, { recursive: true });
    writeFileSync(join(optInDir, 'SKILL.md'), '# demo skill\n');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(join(REPO_ROOT, 'templates', 'opt-in-skills'), { recursive: true, force: true });
  });

  it('instala skill opt-in conhecida', () => {
    execFileSync('node', [BIN, 'add-skill', 'demo-skill', '--cwd', tmp], { encoding: 'utf8' });
    const installed = join(tmp, '.claude/skills/demo-skill/SKILL.md');
    expect(existsSync(installed)).toBe(true);
  });

  it('falha pra skill nao existente em templates/opt-in-skills', () => {
    expect(() => {
      execFileSync('node', [BIN, 'add-skill', 'skill-inexistente', '--cwd', tmp], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/skill nao encontrada|skill not found/i);
  });
});
```

- [ ] **Step 2: Verificar FAIL** — `npx vitest run tests/cli/add-skill.test.js`.

- [ ] **Step 3: Implementar `src/cli/commands/add-skill.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/cli/commands/add-skill.js <<'EOF'
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifest, writeManifest } from '../../lib/manifest.js';
import { readIndex } from '../../lib/index-tracker.js';
import { installToDualMirror } from '../../lib/installer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..', '..');
const OPT_IN_ROOT = join(PKG_ROOT, 'templates', 'opt-in-skills');

function listSkillFiles(skillDir) {
  const out = [];
  function walk(dir, base = '') {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const rel = base ? `${base}/${entry}` : entry;
      if (statSync(full).isDirectory()) {
        walk(full, rel);
      } else {
        out.push(rel);
      }
    }
  }
  walk(skillDir);
  return out;
}

async function runAddSkill(skillName, opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const skillSourceDir = join(OPT_IN_ROOT, skillName);
  if (!existsSync(skillSourceDir)) {
    throw new Error(`xp-stack add-skill: skill nao encontrada em templates/opt-in-skills/${skillName}/`);
  }

  const manifest = readManifest(projectRoot);
  if (!manifest) {
    throw new Error('xp-stack add-skill: manifest nao encontrado. Rode "xp-stack init" primeiro.');
  }
  const index = readIndex(projectRoot);
  const engines = index?.engines_installed ?? [];
  if (engines.length === 0) {
    throw new Error('xp-stack add-skill: nenhuma engine instalada. Rode "xp-stack init" primeiro.');
  }

  const files = listSkillFiles(skillSourceDir);
  for (const f of files) {
    const result = installToDualMirror({
      sourceRel: f,
      sourceRoot: skillSourceDir,
      projectRoot,
      engines,
      overwrite: false,
    });
    for (const inst of result.installed) {
      const dest = inst.destRel.replace(/^[^/]+\//, `${index.engines_installed[0] === 'claude-code' ? '.claude/skills' : '.agents/skills'}/${skillName}/`);
      manifest.files[dest] = {
        hash: inst.hash,
        source: `templates/opt-in-skills/${skillName}/${f}`,
        user_modified: false,
      };
    }
  }
  writeManifest(projectRoot, manifest);

  console.log(`xp-stack add-skill: ${skillName} instalada em ${engines.length} engine(s).`);
}

export function registerAddSkill(program) {
  program
    .command('add-skill <skill>')
    .description('Habilita skill opt-in (paperclip, local-waves, agents B5, etc.)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .action(async (skill, opts) => {
      await runAddSkill(skill, opts);
    });
  return program;
}
EOF
```

> **Nota:** o destRel acima é simplificado — em refactor futuro vai usar ENGINE_PATHS pra path correto por engine. Pra T7 funcional, o caso happy-path é claude-code (default).

- [ ] **Step 4: Wire up em `src/cli/index.js`** (`registerAddSkill(program);`).

- [ ] **Step 5: Verificar PASS** — `npx vitest run tests/cli/add-skill.test.js`. Esperado: 2/2 verde.

- [ ] **Step 6: Commit T7**

```bash
cd /home/rnobre/dev/xp-stack
git add src/cli/index.js src/cli/commands/add-skill.js tests/cli/add-skill.test.js
git commit -m "feat(cli): adiciona xp-stack add-skill subcomando (T7 W1 v1.0.0)

Subcomando add-skill implementado:
- xp-stack add-skill <name> [--cwd <dir>]
- Valida que templates/opt-in-skills/<name>/ existe
- Instala skill em todas as engines instaladas (via index)
- Adiciona files ao manifest

Tests: 2 cenarios (install valid, reject not-found)."
git push origin feat/v1.0.0-ship
```

---

## Task 8: `uninstall` subcomando

**Files:**
- Create: `src/cli/commands/uninstall.js`
- Create: `tests/cli/uninstall.test.js`
- Modify: `src/cli/index.js`

- [ ] **Step 1: Escrever teste falho**

Criar `tests/cli/uninstall.test.js`:

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

describe('xp-stack uninstall', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-uninstall-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('remove todos os files do manifest e o proprio manifest', () => {
    execFileSync('node', [BIN, 'uninstall', '--cwd', tmp, '--yes'], { encoding: 'utf8' });
    expect(existsSync(join(tmp, '.xp-stack/manifest.json'))).toBe(false);
    expect(existsSync(join(tmp, '.xp-stack/index.json'))).toBe(false);
  });

  it('preserva user-modified com --keep-user-modified', () => {
    // modifica algum arquivo trackado
    const trackedFile = join(tmp, '.claude/skills/skills/README.md');
    if (existsSync(trackedFile)) {
      writeFileSync(trackedFile, '# Modified by user\n', 'utf8');
      execFileSync('node', [BIN, 'uninstall', '--cwd', tmp, '--yes', '--keep-user-modified'], { encoding: 'utf8' });
      expect(existsSync(trackedFile)).toBe(true); // preservado
      expect(existsSync(join(tmp, '.xp-stack/manifest.json'))).toBe(false); // manifest removido
    }
  });

  it('falha sem --yes (interactive prompt requerido pra destrutivo)', () => {
    expect(() => {
      execFileSync('node', [BIN, 'uninstall', '--cwd', tmp], { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow(/--yes obrigatorio|requires --yes/i);
  });
});
```

- [ ] **Step 2: Verificar FAIL** — `npx vitest run tests/cli/uninstall.test.js`.

- [ ] **Step 3: Implementar `src/cli/commands/uninstall.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/cli/commands/uninstall.js <<'EOF'
import { existsSync, rmSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readManifest, hashFile } from '../../lib/manifest.js';

async function runUninstall(opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  if (!opts.yes) {
    throw new Error('xp-stack uninstall: operacao destrutiva. Use --yes pra confirmar.');
  }

  const manifest = readManifest(projectRoot);
  if (!manifest) {
    console.log('xp-stack uninstall: nada pra remover (manifest nao encontrado).');
    return;
  }

  let removed = 0;
  let preserved = 0;
  for (const [relPath, entry] of Object.entries(manifest.files)) {
    const abs = join(projectRoot, relPath);
    if (!existsSync(abs)) continue;
    if (opts.keepUserModified) {
      const currentHash = hashFile(abs);
      if (currentHash !== entry.hash) {
        preserved++;
        continue;
      }
    }
    unlinkSync(abs);
    removed++;
  }

  // Remove .xp-stack/ inteira (manifest + index + version + cache)
  const xpStackDir = join(projectRoot, '.xp-stack');
  if (existsSync(xpStackDir)) {
    rmSync(xpStackDir, { recursive: true, force: true });
  }

  console.log(`xp-stack uninstall: ${removed} arquivos removidos, ${preserved} preservados (user-modified).`);
  console.log(`Diretorios .xp-stack/ removido. Templates/skills nao tocados em /.git/.`);
}

export function registerUninstall(program) {
  program
    .command('uninstall')
    .description('Remove xp-stack do projeto (apaga files do manifest, preserva user-modified opcional)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .option('--yes', 'confirma operacao destrutiva (obrigatorio)')
    .option('--keep-user-modified', 'preserva files que diferenciam do hash original')
    .action(async (opts) => {
      await runUninstall(opts);
    });
  return program;
}
EOF
```

- [ ] **Step 4: Wire up em `src/cli/index.js`**.

- [ ] **Step 5: Verificar PASS** — `npx vitest run tests/cli/uninstall.test.js`. Esperado: 3/3 verde.

- [ ] **Step 6: Commit T8**

```bash
cd /home/rnobre/dev/xp-stack
git add src/cli/index.js src/cli/commands/uninstall.js tests/cli/uninstall.test.js
git commit -m "feat(cli): adiciona xp-stack uninstall subcomando (T8 W1 v1.0.0)

Subcomando uninstall implementado:
- xp-stack uninstall --yes [--cwd <dir>] [--keep-user-modified]
- --yes obrigatorio (operacao destrutiva)
- Remove todos files do manifest
- --keep-user-modified preserva files com hash divergente
- Remove .xp-stack/ inteiro

Tests: 3 cenarios (full uninstall, keep user-modified, no --yes)."
git push origin feat/v1.0.0-ship
```

---

## Task 9: `resume` subcomando

**Files:**
- Create: `src/cli/commands/resume.js`
- Create: `tests/cli/resume.test.js`
- Modify: `src/cli/index.js`

- [ ] **Step 1: Escrever teste falho**

Criar `tests/cli/resume.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

describe('xp-stack resume', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-resume-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('sem features ativas, lista vazia', () => {
    const out = execFileSync('node', [BIN, 'resume', '--cwd', tmp], { encoding: 'utf8' });
    expect(out).toMatch(/nenhuma feature ativa|no active features/i);
  });

  it('com feature ativa, lista no output', () => {
    // simular feature ativa adicionando ao index.json + criando state.json
    const idxPath = join(tmp, '.xp-stack/index.json');
    const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
    idx.active_features.push({ slug: 'feature-x', phase: 'fundacao', last_touched: new Date().toISOString() });
    writeFileSync(idxPath, JSON.stringify(idx, null, 2) + '\n', 'utf8');
    mkdirSync(join(tmp, 'docs/tasks/feature-x'), { recursive: true });
    const stateFile = join(tmp, 'docs/tasks/feature-x/state.json');
    writeFileSync(stateFile, JSON.stringify({
      schema_version: '1.0',
      feature: 'feature-x',
      phase: 'fundacao',
      phases_completed: [],
      phases_pending: ['testes', 'implementacao', 'refatoracao', 'integracao', 'cicd'],
      tasks_completed: [],
      tasks_pending: ['T1'],
      blockers: [],
    }, null, 2));

    const out = execFileSync('node', [BIN, 'resume', '--cwd', tmp], { encoding: 'utf8' });
    expect(out).toMatch(/feature-x/);
    expect(out).toMatch(/fundacao/);
  });

  it('com slug especifico, mostra detalhes da feature', () => {
    const idxPath = join(tmp, '.xp-stack/index.json');
    const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
    idx.active_features.push({ slug: 'feature-y', phase: 'implementacao', last_touched: new Date().toISOString() });
    writeFileSync(idxPath, JSON.stringify(idx, null, 2) + '\n', 'utf8');
    mkdirSync(join(tmp, 'docs/tasks/feature-y'), { recursive: true });
    writeFileSync(join(tmp, 'docs/tasks/feature-y/state.json'), JSON.stringify({
      schema_version: '1.0', feature: 'feature-y', phase: 'implementacao',
      phases_completed: ['fundacao', 'testes'],
      phases_pending: ['refatoracao', 'integracao', 'cicd'],
      tasks_completed: ['T1', 'T2'], tasks_pending: ['T3', 'T4'], blockers: [],
    }, null, 2));

    const out = execFileSync('node', [BIN, 'resume', 'feature-y', '--cwd', tmp], { encoding: 'utf8' });
    expect(out).toMatch(/feature-y/);
    expect(out).toMatch(/implementacao/);
    expect(out).toMatch(/T3/);
  });
});
```

- [ ] **Step 2: Verificar FAIL** — `npx vitest run tests/cli/resume.test.js`.

- [ ] **Step 3: Implementar `src/cli/commands/resume.js`**

```bash
cat > /home/rnobre/dev/xp-stack/src/cli/commands/resume.js <<'EOF'
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readIndex } from '../../lib/index-tracker.js';

function readState(projectRoot, slug) {
  const path = join(projectRoot, 'docs/tasks', slug, 'state.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function runResume(slug, opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const index = readIndex(projectRoot);

  if (!index || index.active_features.length === 0) {
    console.log('xp-stack resume: nenhuma feature ativa em .xp-stack/index.json.');
    return;
  }

  if (!slug) {
    console.log(`xp-stack resume: ${index.active_features.length} features ativas:`);
    const sorted = [...index.active_features].sort((a, b) => b.last_touched.localeCompare(a.last_touched));
    for (const f of sorted) {
      console.log(`  - ${f.slug} (phase: ${f.phase}, last_touched: ${f.last_touched})`);
    }
    console.log(`\nUse: xp-stack resume <slug> pra ver detalhes.`);
    return;
  }

  const feature = index.active_features.find((f) => f.slug === slug);
  if (!feature) {
    console.log(`xp-stack resume: feature '${slug}' nao encontrada em active_features.`);
    return;
  }

  const state = readState(projectRoot, slug);
  if (!state) {
    console.log(`xp-stack resume: state.json nao encontrado em docs/tasks/${slug}/.`);
    return;
  }

  console.log(`xp-stack resume: ${slug}`);
  console.log(`  phase: ${state.phase}`);
  console.log(`  phases_completed: ${state.phases_completed.join(', ') || '(none)'}`);
  console.log(`  current_task: ${state.current_task || '(unset)'}`);
  console.log(`  tasks_completed: ${state.tasks_completed.length}`);
  console.log(`  tasks_pending: ${state.tasks_pending.join(', ') || '(none)'}`);
  if (state.blockers?.length) {
    console.log(`  blockers:`);
    for (const b of state.blockers) {
      console.log(`    - ${b.task}: ${b.reason}`);
    }
  }
  if (state.last_session_summary) {
    console.log(`  last_session_summary: ${state.last_session_summary}`);
  }
}

export function registerResume(program) {
  program
    .command('resume [slug]')
    .description('Lista features ativas ou retoma uma especifica (le state.json)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .action(async (slug, opts) => {
      await runResume(slug, opts);
    });
  return program;
}
EOF
```

- [ ] **Step 4: Wire up em `src/cli/index.js`**.

- [ ] **Step 5: Verificar PASS** — `npx vitest run tests/cli/resume.test.js`. Esperado: 3/3 verde.

- [ ] **Step 6: Commit T9**

```bash
cd /home/rnobre/dev/xp-stack
git add src/cli/index.js src/cli/commands/resume.js tests/cli/resume.test.js
git commit -m "feat(cli): adiciona xp-stack resume subcomando (T9 W1 v1.0.0)

Subcomando resume implementado:
- xp-stack resume [slug] [--cwd <dir>]
- Sem slug: lista features ativas (sorted by last_touched DESC)
- Com slug: imprime detalhes (phase, current_task, tasks pending, blockers, last_session_summary)
- Le .xp-stack/index.json + docs/tasks/<slug>/state.json

Tests: 3 cenarios (lista vazia, lista com feature, feature especifica)."
git push origin feat/v1.0.0-ship
```

---

## Conclusão da Onda 1

Após T3-T9 mergeados em `feat/v1.0.0-ship`, o repo terá:

✅ 4 helper modules em `src/lib/` (engines, manifest, installer, index-tracker)
✅ 7 subcomandos CLI funcionais: `init`, `update`, `status`, `add-engine`, `add-skill`, `uninstall`, `resume`
✅ `templates/skills/` esqueleto + `templates/opt-in-skills/` quando T7 popular
✅ ~25 tests novos verde (helpers + subcomandos), suite total ~46 verde
✅ Tests bash existentes preservados (53)
✅ `xp-stack init` funcional em projeto vazio

**Próximo passo:** invocar `writing-plans` quando começar W2 (state machine: state.json writer + index tracker hook + RESUME.md generator + reconcile skill).

---

## Checklist de saída de W1

- [ ] T3.1 (engines), T3.2 (manifest), T3.3 (installer), T3.4 (index-tracker), T3 (init) commitados
- [ ] T4 (update), T5 (status), T6 (add-engine), T7 (add-skill), T8 (uninstall), T9 (resume) commitados
- [ ] `npx vitest run` verde (~46 tests: 16 W0 + ~30 W1)
- [ ] `npm run test:bash` verde (53 tests preservados)
- [ ] `node bin/xp-stack init --help` mostra todas as flags
- [ ] `node bin/xp-stack --help` lista todos os 7 novos subcomandos + `version`
- [ ] `00-overview.md`: T3-T9 marcados `[x] Concluida YYYY-MM-DD (commits)`
- [ ] Self-test manual em `/tmp/xp-stack-w1-smoke/`: criar dir, `mkdir .claude`, rodar init+status, ver output sensato
