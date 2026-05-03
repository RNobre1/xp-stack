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
