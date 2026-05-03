import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { hashFile } from './manifest.js';
import { ENGINE_PATHS } from './engines.js';

/**
 * Walk recursivo de um diretorio, retorna paths relativos.
 * Filtra .gitkeep automaticamente.
 *
 * @param {string} root - Path absoluto do diretorio raiz
 * @returns {string[]} Paths relativos a root
 */
export function walkDir(root) {
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
  walk(root);
  return out;
}

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
