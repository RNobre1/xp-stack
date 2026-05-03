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
