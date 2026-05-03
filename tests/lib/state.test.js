import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readState,
  writeState,
  EMPTY_STATE,
  registerTaskCompleted,
  setCurrentTask,
} from '../../src/lib/state.js';

describe('state - EMPTY_STATE', () => {
  it('retorna state inicial valido contra schema', () => {
    const s = EMPTY_STATE('feature-x');
    expect(s.schema_version).toBe('1.0');
    expect(s.feature).toBe('feature-x');
    expect(s.phase).toBe('fundacao');
    expect(s.phases_completed).toEqual([]);
    expect(s.phases_pending).toEqual(['testes', 'implementacao', 'refatoracao', 'integracao', 'cicd']);
    expect(s.tasks_completed).toEqual([]);
    expect(s.tasks_pending).toEqual([]);
  });
});

describe('state - read/write', () => {
  let tmp, featureDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-state-test-'));
    featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('writeState persiste em state.json e readState le', () => {
    const s = EMPTY_STATE('feature-x');
    s.tasks_pending = ['T1', 'T2'];
    writeState(featureDir, s);

    const read = readState(featureDir);
    expect(read).toEqual(s);
  });

  it('readState retorna null se nao existe', () => {
    expect(readState(featureDir)).toBeNull();
  });

  it('writeState valida contra state.schema.json', () => {
    const invalid = { schema_version: 'errado', feature: 'x', phase: 'fundacao', phases_completed: [], phases_pending: [], tasks_completed: [], tasks_pending: [] };
    expect(() => writeState(featureDir, invalid)).toThrow();
  });
});

describe('state - registerTaskCompleted', () => {
  let tmp, featureDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-state-rt-'));
    featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
    const s = EMPTY_STATE('feature-x');
    s.tasks_pending = ['T1', 'T2', 'T3'];
    writeState(featureDir, s);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('move task de pending pra completed', () => {
    registerTaskCompleted(featureDir, 'T1');
    const s = readState(featureDir);
    expect(s.tasks_completed).toContain('T1');
    expect(s.tasks_pending).not.toContain('T1');
  });

  it('idempotente: chamar 2x nao duplica em completed', () => {
    registerTaskCompleted(featureDir, 'T1');
    registerTaskCompleted(featureDir, 'T1');
    const s = readState(featureDir);
    expect(s.tasks_completed.filter((t) => t === 'T1').length).toBe(1);
  });

  it('throw se task nao existe em pending nem completed', () => {
    expect(() => registerTaskCompleted(featureDir, 'T99')).toThrow(/nao encontrada/i);
  });
});

describe('state - setCurrentTask', () => {
  let tmp, featureDir;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xp-stack-state-sc-'));
    featureDir = join(tmp, 'docs', 'tasks', 'feature-x');
    mkdirSync(featureDir, { recursive: true });
    const s = EMPTY_STATE('feature-x');
    s.tasks_pending = ['T1', 'T2'];
    writeState(featureDir, s);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('atualiza current_task + last_checkpoint_at', () => {
    setCurrentTask(featureDir, 'T1');
    const s = readState(featureDir);
    expect(s.current_task).toBe('T1');
    expect(s.last_checkpoint_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
