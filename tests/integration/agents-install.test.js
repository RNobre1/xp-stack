import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

const AGENTS = ['db-archaeologist', 'screenshot-spec-writer', 'flowchart-extractor'];

/**
 * Diretorio de templates isolado pra este suite.
 * Evita race condition com add-skill.test.js que faz rmSync em
 * REPO_ROOT/templates/opt-in-skills/ no afterEach.
 * add-skill.js aceita XP_STACK_OPT_IN_ROOT como override.
 */
let isolatedOptInRoot;

function buildIsolatedTemplates(root) {
  // db-archaeologist
  const dbDir = join(root, 'db-archaeologist');
  mkdirSync(join(dbDir, 'references'), { recursive: true });
  writeFileSync(join(dbDir, 'SKILL.md'),
    '---\nname: db-archaeologist\ndescription: Analisa schema PostgreSQL/Supabase, RLS policies e migrations.\ndisable-model-invocation: false\nallowed-tools:\n  - Read\n  - Glob\n  - Grep\n  - Bash(supabase *)\n  - Bash(psql *)\n---\n\nVoce eh o DB Archaeologist.\n');
  writeFileSync(join(dbDir, 'references', 'output-schema.md'), '# Output Schema\n');

  // screenshot-spec-writer
  const ssDir = join(root, 'screenshot-spec-writer');
  mkdirSync(join(ssDir, 'references'), { recursive: true });
  writeFileSync(join(ssDir, 'SKILL.md'),
    '---\nname: screenshot-spec-writer\ndescription: Transforma screenshots de UI em spec markdown.\ndisable-model-invocation: false\nallowed-tools:\n  - Read\n  - Write\n  - Bash(ls *)\n  - Bash(file *)\n---\n\nVoce eh o Screenshot Spec Writer.\n');
  writeFileSync(join(ssDir, 'references', 'output-template.md'), '# Output Template\n');

  // flowchart-extractor
  const fcDir = join(root, 'flowchart-extractor');
  mkdirSync(join(fcDir, 'references'), { recursive: true });
  writeFileSync(join(fcDir, 'SKILL.md'),
    '---\nname: flowchart-extractor\ndescription: Gera Mermaid flowchart fiel ao fluxo de controle de uma funcao.\ndisable-model-invocation: false\nallowed-tools:\n  - Read\n  - Glob\n  - Grep\n  - Write\n  - Bash(ls *)\n  - Bash(wc *)\n---\n\nVoce eh o Flowchart Extractor.\n');
  writeFileSync(join(fcDir, 'references', 'mermaid-patterns.md'), '# Mermaid Patterns\n');
}

describe('W3 agents - install via xp-stack add-skill', () => {
  let tmp;

  beforeAll(() => {
    isolatedOptInRoot = mkdtempSync(join(tmpdir(), 'xp-stack-w3-opt-in-'));
    buildIsolatedTemplates(isolatedOptInRoot);
  });

  afterAll(() => {
    if (isolatedOptInRoot) rmSync(isolatedOptInRoot, { recursive: true, force: true });
  });

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-w3-agents-test-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
    execFileSync('node', [BIN, 'init', '--cwd', tmp, '--engine', 'claude-code', '--yes'], { encoding: 'utf8' });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it.each(AGENTS)('instala %s sem erro', (agent) => {
    expect(() => {
      execFileSync('node', [BIN, 'add-skill', agent, '--cwd', tmp], {
        encoding: 'utf8',
        env: { ...process.env, XP_STACK_OPT_IN_ROOT: isolatedOptInRoot },
      });
    }).not.toThrow();

    const skillPath = join(tmp, '.claude/skills', agent, 'SKILL.md');
    expect(existsSync(skillPath)).toBe(true);

    const content = readFileSync(skillPath, 'utf8');
    expect(content).toMatch(/^---\n/);
    expect(content).toMatch(new RegExp(`name: ${agent}`));
    expect(content).toMatch(/description:/);
  });

  it.each(AGENTS)('%s tem references/ instaladas', (agent) => {
    execFileSync('node', [BIN, 'add-skill', agent, '--cwd', tmp], {
      encoding: 'utf8',
      env: { ...process.env, XP_STACK_OPT_IN_ROOT: isolatedOptInRoot },
    });
    const refsDir = join(tmp, '.claude/skills', agent, 'references');
    expect(existsSync(refsDir)).toBe(true);
  });

  it('os 3 agents listam no manifest apos install', () => {
    for (const agent of AGENTS) {
      execFileSync('node', [BIN, 'add-skill', agent, '--cwd', tmp], {
        encoding: 'utf8',
        env: { ...process.env, XP_STACK_OPT_IN_ROOT: isolatedOptInRoot },
      });
    }
    const manifest = JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
    const filesJson = JSON.stringify(manifest.files);
    for (const agent of AGENTS) {
      expect(filesJson).toMatch(new RegExp(`${agent}.*SKILL\\.md`));
    }
  });
});
