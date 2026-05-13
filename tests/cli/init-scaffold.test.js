import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
  lstatSync,
  readlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const BIN = join(REPO_ROOT, 'bin', 'xp-stack');

const CORE_SKILLS = [
  'akita-xp-rules',
  'tdd-conventions',
  'task-decomposition',
  'research-cycle',
  'optimizing-github-actions',
];

const CORE_AGENTS = ['researcher.md', 'research-critic.md', 'tdd.md', 'reviewer.md'];

describe('xp-stack init — scaffolding completo (v1.1.0 contract)', () => {
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-scaffold-'));
    mkdirSync(join(tmp, '.claude'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function runInit(extraArgs = []) {
    return execFileSync('node', [BIN, 'init', '--cwd', tmp, '--yes', ...extraArgs], {
      encoding: 'utf8',
    });
  }

  it('cria as 5 skills core em .claude/skills/ (com SKILL.md)', () => {
    runInit();
    for (const skill of CORE_SKILLS) {
      expect(existsSync(join(tmp, '.claude/skills', skill, 'SKILL.md'))).toBe(true);
    }
  });

  it('cria as 5 skills core em .agents/skills/ (dual mirror)', () => {
    runInit();
    for (const skill of CORE_SKILLS) {
      expect(existsSync(join(tmp, '.agents/skills', skill, 'SKILL.md'))).toBe(true);
    }
  });

  it('NAO cria path duplicado .claude/skills/skills/ (regression v1.0.x)', () => {
    runInit();
    expect(existsSync(join(tmp, '.claude/skills/skills'))).toBe(false);
    expect(existsSync(join(tmp, '.agents/skills/skills'))).toBe(false);
  });

  it('NAO instala skills opt-in (bootstrap, paperclip-orchestrator, local-waves)', () => {
    runInit();
    expect(existsSync(join(tmp, '.claude/skills/bootstrap'))).toBe(false);
    expect(existsSync(join(tmp, '.claude/skills/paperclip-orchestrator'))).toBe(false);
    expect(existsSync(join(tmp, '.claude/skills/local-waves'))).toBe(false);
  });

  it('cria 4 agents em .claude/agents/', () => {
    runInit();
    for (const agent of CORE_AGENTS) {
      expect(existsSync(join(tmp, '.claude/agents', agent))).toBe(true);
    }
  });

  it('cria CLAUDE.md a partir do template se ausente', () => {
    runInit();
    expect(existsSync(join(tmp, 'CLAUDE.md'))).toBe(true);
    expect(readFileSync(join(tmp, 'CLAUDE.md'), 'utf8')).toMatch(/Pair Programming \(Akita\/XP\)/);
  });

  it('NAO sobrescreve CLAUDE.md existente', () => {
    writeFileSync(join(tmp, 'CLAUDE.md'), '# meu conteudo\n');
    runInit();
    expect(readFileSync(join(tmp, 'CLAUDE.md'), 'utf8')).toBe('# meu conteudo\n');
  });

  it('cria AGENTS.md como symlink relativo para CLAUDE.md', () => {
    runInit();
    const linkPath = join(tmp, 'AGENTS.md');
    const stats = lstatSync(linkPath);
    expect(stats.isSymbolicLink()).toBe(true);
    expect(readlinkSync(linkPath)).toBe('CLAUDE.md');
  });

  it('NAO sobrescreve AGENTS.md existente', () => {
    writeFileSync(join(tmp, 'AGENTS.md'), '# user agents\n');
    runInit();
    const stats = lstatSync(join(tmp, 'AGENTS.md'));
    expect(stats.isSymbolicLink()).toBe(false);
    expect(readFileSync(join(tmp, 'AGENTS.md'), 'utf8')).toBe('# user agents\n');
  });

  it('cria docs/tasks/_template/ com 5 arquivos', () => {
    runInit();
    for (const f of [
      'README.md',
      'TEMPLATE-overview.md',
      'TEMPLATE-progress.md',
      'TEMPLATE-task.md',
      'TEMPLATE-orchestrator-prompt.md',
    ]) {
      expect(existsSync(join(tmp, 'docs/tasks/_template', f))).toBe(true);
    }
  });

  it('NAO cria mais TEMPLATE-terminal-prompts.md (substituido por orchestrator-prompt em v2.0.0)', () => {
    runInit();
    expect(existsSync(join(tmp, 'docs/tasks/_template/TEMPLATE-terminal-prompts.md'))).toBe(false);
  });

  it('cria docs/pesquisas/_template/TEMPLATE-pesquisa.md', () => {
    runInit();
    expect(existsSync(join(tmp, 'docs/pesquisas/_template/TEMPLATE-pesquisa.md'))).toBe(true);
  });

  it('cria .claude/settings.json a partir do template se ausente', () => {
    runInit();
    expect(existsSync(join(tmp, '.claude/settings.json'))).toBe(true);
    const settings = JSON.parse(readFileSync(join(tmp, '.claude/settings.json'), 'utf8'));
    expect(settings.permissions).toBeDefined();
  });

  it('NAO sobrescreve .claude/settings.json existente', () => {
    writeFileSync(join(tmp, '.claude/settings.json'), '{"hooks": {}}');
    runInit();
    expect(readFileSync(join(tmp, '.claude/settings.json'), 'utf8')).toBe('{"hooks": {}}');
  });

  it('adiciona .xp-stack/state/ ao .gitignore (idempotente em re-run)', () => {
    runInit();
    expect(readFileSync(join(tmp, '.gitignore'), 'utf8')).toMatch(/\.xp-stack\/state\//);
    runInit();
    const gitignore = readFileSync(join(tmp, '.gitignore'), 'utf8');
    expect(gitignore.match(/\.xp-stack\/state\//g).length).toBe(1);
  });

  it('manifest registra todos os arquivos instalados (>20 entradas)', () => {
    runInit();
    const manifest = JSON.parse(readFileSync(join(tmp, '.xp-stack/manifest.json'), 'utf8'));
    const filesCount = Object.keys(manifest.files).length;
    expect(filesCount).toBeGreaterThan(20);
  });

  it('--no-dual-mirror nao instala em .agents/skills/', () => {
    runInit(['--no-dual-mirror']);
    expect(existsSync(join(tmp, '.claude/skills/akita-xp-rules/SKILL.md'))).toBe(true);
    expect(existsSync(join(tmp, '.agents/skills/akita-xp-rules'))).toBe(false);
  });
});
