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
