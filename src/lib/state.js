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
