import { describe, it, expect } from 'vitest';
import { generateResumeMarkdown } from '../../src/lib/resume-generator.js';

describe('resume-generator', () => {
  const baseState = {
    schema_version: '1.0',
    feature: 'v1.0.0-ship',
    doc_level: 'completo',
    phase: 'implementacao',
    phases_completed: ['fundacao', 'testes'],
    phases_pending: ['refatoracao', 'integracao', 'cicd'],
    current_task: 'T3',
    tasks_completed: ['T1', 'T2'],
    tasks_pending: ['T3', 'T4', 'T5'],
    blockers: [],
    last_checkpoint_at: '2026-05-03T12:00:00Z',
    last_session_summary: 'T2 GREEN, todos os 14 cenarios passando',
  };

  it('gera markdown com header, status atual, tasks tables, como retomar', () => {
    const md = generateResumeMarkdown(baseState);
    expect(md).toMatch(/# v1\.0\.0-ship — Resume/);
    expect(md).toMatch(/Fase:.*implementacao/i);
    expect(md).toMatch(/2 de 5 tasks/i);
    expect(md).toMatch(/T3/);
    expect(md).toMatch(/T4/);
    expect(md).toMatch(/como retomar|continuar|resume/i);
  });

  it('inclui blockers se houver', () => {
    const state = { ...baseState, blockers: [{ task: 'T3', reason: 'aguardando aprovacao do Pilot' }] };
    const md = generateResumeMarkdown(state);
    expect(md).toMatch(/aguardando aprovacao/);
  });

  it('inclui last_session_summary se houver', () => {
    const md = generateResumeMarkdown(baseState);
    expect(md).toMatch(/T2 GREEN/);
  });

  it('lida com state minimo (sem campos opcionais)', () => {
    const minimal = {
      schema_version: '1.0',
      feature: 'feature-x',
      phase: 'fundacao',
      phases_completed: [],
      phases_pending: ['testes', 'implementacao', 'refatoracao', 'integracao', 'cicd'],
      tasks_completed: [],
      tasks_pending: [],
    };
    expect(() => generateResumeMarkdown(minimal)).not.toThrow();
    const md = generateResumeMarkdown(minimal);
    expect(md).toMatch(/feature-x/);
    expect(md).toMatch(/fundacao/);
  });
});
