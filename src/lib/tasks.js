import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { validate } from './validators.js';

const TASKS_FILE = 'tasks.json';

/**
 * Cria tasks struct inicial vazia.
 *
 * @param {string} featureSlug
 * @returns {object} Valido contra tasks.schema.json
 */
export function EMPTY_TASKS(featureSlug) {
  return {
    schema_version: '1.0',
    feature: featureSlug,
    tasks: [],
  };
}

/**
 * Le docs/tasks/{slug}/tasks.json.
 *
 * @param {string} featureDir - Path absoluto do diretorio da feature
 * @returns {object|null}
 */
export function readTasks(featureDir) {
  const path = join(featureDir, TASKS_FILE);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Escreve tasks.json. Valida contra schema antes.
 *
 * @param {string} featureDir
 * @param {object} tasks
 * @throws Error se invalido
 */
export function writeTasks(featureDir, tasks) {
  const result = validate('tasks', tasks);
  if (!result.valid) {
    throw new Error(`Tasks invalido contra schema:\n${JSON.stringify(result.errors, null, 2)}`);
  }
  const path = join(featureDir, TASKS_FILE);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(tasks, null, 2) + '\n', 'utf8');
}

/**
 * Insere nova task ou atualiza existente (match por id).
 *
 * @param {string} featureDir
 * @param {object} task - Task object valido contra schema
 */
export function upsertTask(featureDir, task) {
  let t = readTasks(featureDir);
  if (!t) t = EMPTY_TASKS(task.feature ?? 'unknown');
  const idx = t.tasks.findIndex((x) => x.id === task.id);
  if (idx >= 0) {
    t.tasks[idx] = task;
  } else {
    t.tasks.push(task);
  }
  writeTasks(featureDir, t);
}

/**
 * Atualiza status de task existente. Throw se nao existe ou status invalido.
 *
 * @param {string} featureDir
 * @param {string} taskId
 * @param {string} newStatus - Um de: pending|in_progress|blocked|done|abandoned
 */
export function setTaskStatus(featureDir, taskId, newStatus) {
  const t = readTasks(featureDir);
  if (!t) throw new Error(`Tasks nao encontrado em ${featureDir}/tasks.json`);
  const task = t.tasks.find((x) => x.id === taskId);
  if (!task) throw new Error(`Task ${taskId} nao encontrada em tasks.json`);
  task.status = newStatus;
  writeTasks(featureDir, t); // schema validation rejeita status invalido
}
