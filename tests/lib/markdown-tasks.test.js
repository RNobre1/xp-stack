import { describe, it, expect } from 'vitest';
import { parseTasksTable, renderTasksTable } from '../../src/lib/markdown-tasks.js';

describe('markdown-tasks - parseTasksTable', () => {
  it('extrai tasks de uma tabela markdown padrao do projeto', () => {
    const md = `
## Tasks

| Task | Subject | Status |
|------|---------|--------|
| T1 | Primeira | [x] Concluida 2026-05-03 |
| T2 | Segunda | [ ] Pendente |
| T3 | Terceira | [ ] Pendente — bloqueada por T2 |
`;
    const tasks = parseTasksTable(md);
    expect(tasks.length).toBe(3);
    expect(tasks[0]).toEqual({ id: 'T1', status: 'completed', raw: '[x] Concluida 2026-05-03' });
    expect(tasks[1]).toEqual({ id: 'T2', status: 'pending', raw: '[ ] Pendente' });
    expect(tasks[2]).toEqual({ id: 'T3', status: 'pending', raw: '[ ] Pendente — bloqueada por T2' });
  });

  it('retorna array vazio se nao tem tabela', () => {
    expect(parseTasksTable('# Sem tabela aqui\n')).toEqual([]);
  });

  it('ignora linhas que nao casam com pattern T<n>', () => {
    const md = `
| Task | Subject | Status |
|------|---------|--------|
| T1 | x | [x] Concluida |
| Some other row | y | z |
`;
    const tasks = parseTasksTable(md);
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe('T1');
  });
});

describe('markdown-tasks - renderTasksTable (sincroniza com state)', () => {
  it('atualiza status [ ] -> [x] pra tasks em state.tasks_completed', () => {
    const md = `
| Task | Subject | Status |
|------|---------|--------|
| T1 | Primeira | [ ] Pendente |
| T2 | Segunda | [ ] Pendente |
`;
    const state = {
      tasks_completed: ['T1'],
      tasks_pending: ['T2'],
    };
    const updated = renderTasksTable(md, state, '2026-05-03');
    expect(updated).toMatch(/T1.*\[x\] Concluida 2026-05-03/);
    expect(updated).toMatch(/T2.*\[ \] Pendente/);
  });

  it('preserva linhas fora da tabela', () => {
    const md = `
# Header

prosa antes

| Task | Subject | Status |
|------|---------|--------|
| T1 | x | [ ] Pendente |

prosa depois
`;
    const state = { tasks_completed: ['T1'], tasks_pending: [] };
    const updated = renderTasksTable(md, state, '2026-05-03');
    expect(updated).toMatch(/# Header/);
    expect(updated).toMatch(/prosa antes/);
    expect(updated).toMatch(/prosa depois/);
    expect(updated).toMatch(/T1.*\[x\] Concluida/);
  });

  it('preserva metadata pos-status (ex: bloqueada por T2)', () => {
    const md = `
| Task | Subject | Status |
|------|---------|--------|
| T2 | x | [ ] Pendente — bloqueada por T1 |
`;
    const state = { tasks_completed: [], tasks_pending: ['T2'] };
    const updated = renderTasksTable(md, state, '2026-05-03');
    expect(updated).toMatch(/T2.*\[ \] Pendente — bloqueada por T1/);
  });
});
