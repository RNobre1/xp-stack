import { describe, it, expect } from 'vitest';
import { validate, SCHEMA_NAMES } from '../../src/lib/validators.js';

describe('validators - state schema', () => {
  it('aceita state.json valido com phase definida', () => {
    const valid = {
      schema_version: '1.0',
      feature: 'v1.0.0-ship',
      doc_level: 'completo',
      phase: 'fundacao',
      phases_completed: [],
      phases_pending: ['testes', 'implementacao', 'refatoracao', 'integracao', 'cicd'],
      current_task: 'T0',
      tasks_completed: [],
      tasks_pending: ['T0', 'T1', 'T2'],
      blockers: [],
      last_checkpoint_at: '2026-05-02T23:55:00Z',
      last_session_summary: 'inicio do W0',
    };
    const result = validate('state', valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeNull();
  });

  it('rejeita state.json sem schema_version', () => {
    const invalid = {
      feature: 'v1.0.0-ship',
      doc_level: 'completo',
      phase: 'fundacao',
    };
    const result = validate('state', invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeTruthy();
  });
});

describe('validators - tasks schema', () => {
  it('aceita tasks.json com array de tasks valido', () => {
    const valid = {
      schema_version: '1.0',
      feature: 'v1.0.0-ship',
      tasks: [
        {
          id: 'T0',
          slug: 'rename-repo',
          title: 'Rename repo',
          status: 'done',
          deps: [],
          phase: 'fundacao',
          confidence: '🟢',
        },
      ],
    };
    const result = validate('tasks', valid);
    expect(result.valid).toBe(true);
  });

  it('rejeita tasks.json com status invalido', () => {
    const invalid = {
      schema_version: '1.0',
      feature: 'v1.0.0-ship',
      tasks: [
        { id: 'T0', slug: 'x', title: 'x', status: 'in_orbit', deps: [], phase: 'fundacao', confidence: '🟢' },
      ],
    };
    const result = validate('tasks', invalid);
    expect(result.valid).toBe(false);
  });
});

describe('validators - sources schema', () => {
  it('aceita sources.json com array de sources', () => {
    const valid = [
      {
        id: 'S1',
        url: 'https://example.com/doc',
        title: 'Example Doc',
        type: 'official_docs',
        accessed_at: '2026-05-02',
        hash: 'sha256:abc123',
      },
    ];
    const result = validate('sources', valid);
    expect(result.valid).toBe(true);
  });

  it('rejeita source com url invalida', () => {
    const invalid = [{ id: 'S1', url: 'not-a-url', title: 't', type: 'official_docs', accessed_at: '2026-05-02', hash: 'x' }];
    const result = validate('sources', invalid);
    expect(result.valid).toBe(false);
  });
});

describe('validators - claims schema', () => {
  it('aceita claims.json com confidence valido', () => {
    const valid = [
      {
        id: 'C1',
        statement: 'X eh verdade',
        sources: ['S1'],
        confidence: '🟢',
        reviewed_by_critic: true,
      },
    ];
    const result = validate('claims', valid);
    expect(result.valid).toBe(true);
  });

  it('rejeita claim com confidence fora do enum', () => {
    const invalid = [
      { id: 'C1', statement: 'x', sources: ['S1'], confidence: 'maybe', reviewed_by_critic: false },
    ];
    const result = validate('claims', invalid);
    expect(result.valid).toBe(false);
  });
});

describe('validators - manifest schema', () => {
  it('aceita manifest.json valido', () => {
    const valid = {
      schema_version: '1.0',
      installed_version: '1.0.0',
      installed_at: '2026-05-02T23:00:00Z',
      files: {
        '.claude/skills/akita-xp-rules/SKILL.md': {
          hash: 'sha256:af61',
          source: 'templates/skills/akita-xp-rules/SKILL.md',
          user_modified: false,
        },
      },
    };
    const result = validate('manifest', valid);
    expect(result.valid).toBe(true);
  });

  it('rejeita manifest sem installed_version', () => {
    const invalid = {
      schema_version: '1.0',
      installed_at: '2026-05-02T23:00:00Z',
      files: {},
    };
    const result = validate('manifest', invalid);
    expect(result.valid).toBe(false);
  });
});

describe('validators - index schema', () => {
  it('aceita index.json com active_features', () => {
    const valid = {
      schema_version: '1.0',
      active_features: [
        { slug: 'v1.0.0-ship', phase: 'fundacao', last_touched: '2026-05-02T23:55:00Z' },
      ],
      archived_features: [],
      doc_level_default: 'completo',
      engines_installed: ['claude-code'],
    };
    const result = validate('index', valid);
    expect(result.valid).toBe(true);
  });

  it('rejeita index com engines_installed nao-array', () => {
    const invalid = {
      schema_version: '1.0',
      active_features: [],
      archived_features: [],
      doc_level_default: 'completo',
      engines_installed: 'claude-code',
    };
    const result = validate('index', invalid);
    expect(result.valid).toBe(false);
  });
});

describe('validators - SCHEMA_NAMES export', () => {
  it('expoe os 6 nomes de schema', () => {
    expect(SCHEMA_NAMES).toEqual(['state', 'tasks', 'sources', 'claims', 'manifest', 'index']);
  });
});

describe('validators - schemaName invalido', () => {
  it('joga erro para schema desconhecido', () => {
    expect(() => validate('inexistente', {})).toThrow('Schema desconhecido');
  });
});
