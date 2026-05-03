import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readTasks,
  writeTasks,
  EMPTY_TASKS,
  upsertTask,
  setTaskStatus,
} from '../../src/lib/tasks.js';

describe('tasks - EMPTY_TASKS', () => {
  it('cria tasks struct vazio valido contra schema', () => {
    const t = EMPTY_TASKS('feature-x');
    expect(t.schema_version).toBe('1.0');
    expect(t.feature).toBe('feature-x');
    expect(t.tasks).toEqual([]);
  });
});

describe('tasks - read/write', () => {
  let tmp, featureDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-tasks-test-'));
    featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('writeTasks persiste e readTasks le de volta', () => {
    const t = EMPTY_TASKS('feature-x');
    t.tasks.push({
      id: 'T1', slug: 'primeira', title: 'Primeira task',
      status: 'pending', deps: [], phase: 'fundacao', confidence: '🟢',
    });
    writeTasks(featureDir, t);

    const read = readTasks(featureDir);
    expect(read).toEqual(t);
  });

  it('readTasks retorna null se nao existe', () => {
    expect(readTasks(featureDir)).toBeNull();
  });

  it('writeTasks valida contra schema antes de gravar', () => {
    const invalid = {
      schema_version: '1.0', feature: 'x',
      tasks: [{ id: 'T1', slug: 'x', title: 'x', status: 'in_orbit', deps: [], phase: 'fundacao', confidence: '🟢' }],
    };
    expect(() => writeTasks(featureDir, invalid)).toThrow();
  });
});

describe('tasks - upsertTask', () => {
  let tmp, featureDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-tasks-up-'));
    featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
    writeTasks(featureDir, EMPTY_TASKS('feature-x'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('insere task nova', () => {
    upsertTask(featureDir, {
      id: 'T1', slug: 'primeira', title: 'P', status: 'pending',
      deps: [], phase: 'fundacao', confidence: '🟢',
    });
    const t = readTasks(featureDir);
    expect(t.tasks.length).toBe(1);
    expect(t.tasks[0].id).toBe('T1');
  });

  it('atualiza task existente (mesmo id)', () => {
    upsertTask(featureDir, {
      id: 'T1', slug: 'primeira', title: 'P', status: 'pending',
      deps: [], phase: 'fundacao', confidence: '🟢',
    });
    upsertTask(featureDir, {
      id: 'T1', slug: 'primeira', title: 'P', status: 'done',
      deps: [], phase: 'fundacao', confidence: '🟢',
    });
    const t = readTasks(featureDir);
    expect(t.tasks.length).toBe(1);
    expect(t.tasks[0].status).toBe('done');
  });
});

describe('tasks - setTaskStatus', () => {
  let tmp, featureDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-tasks-st-'));
    featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
    const t = EMPTY_TASKS('feature-x');
    t.tasks.push({
      id: 'T1', slug: 'p', title: 'P', status: 'pending',
      deps: [], phase: 'fundacao', confidence: '🟢',
    });
    writeTasks(featureDir, t);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('atualiza status de task existente', () => {
    setTaskStatus(featureDir, 'T1', 'done');
    const t = readTasks(featureDir);
    expect(t.tasks[0].status).toBe('done');
  });

  it('throw se task nao existe', () => {
    expect(() => setTaskStatus(featureDir, 'T99', 'done')).toThrow(/nao encontrada/i);
  });

  it('throw se status invalido', () => {
    expect(() => setTaskStatus(featureDir, 'T1', 'launched-to-mars')).toThrow();
  });
});
