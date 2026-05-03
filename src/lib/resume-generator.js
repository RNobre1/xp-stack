/**
 * Gera markdown do RESUME.md a partir de um state object.
 *
 * @param {object} state - State valido contra state.schema.json
 * @returns {string} Markdown completo (com newlines, pronto pra writeFileSync)
 */
export function generateResumeMarkdown(state) {
  const lines = [];
  const totalTasks = (state.tasks_completed?.length ?? 0) + (state.tasks_pending?.length ?? 0);
  const completedCount = state.tasks_completed?.length ?? 0;
  const phasesTotal = (state.phases_completed?.length ?? 0) + (state.phases_pending?.length ?? 0);

  lines.push(`# ${state.feature} — Resume`);
  lines.push('');
  lines.push(`> Ultima atualizacao: ${state.last_checkpoint_at ?? new Date().toISOString()}`);
  lines.push(`> Proxima sessao: digite \`/xp-stack:resume ${state.feature}\` ou leia este arquivo`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Status atual');
  lines.push('');
  lines.push(`- **Fase:** ${state.phase} (${state.phases_completed?.length ?? 0} de ${phasesTotal} fases concluidas)`);
  lines.push(`- **Task atual:** ${state.current_task ?? '(nenhuma definida)'}`);
  lines.push(`- **Progresso:** ${completedCount} de ${totalTasks} tasks concluidas`);
  lines.push('');

  if (state.tasks_completed && state.tasks_completed.length > 0) {
    lines.push('## Tasks concluidas');
    lines.push('');
    for (const t of state.tasks_completed) {
      lines.push(`- [x] ${t}`);
    }
    lines.push('');
  }

  if (state.tasks_pending && state.tasks_pending.length > 0) {
    lines.push('## Tasks pendentes');
    lines.push('');
    for (const t of state.tasks_pending) {
      const marker = t === state.current_task ? '<- PROXIMA' : '';
      lines.push(`- [ ] ${t} ${marker}`.trimEnd());
    }
    lines.push('');
  }

  if (state.blockers && state.blockers.length > 0) {
    lines.push('## Blockers');
    lines.push('');
    for (const b of state.blockers) {
      lines.push(`- **${b.task}**: ${b.reason}`);
    }
    lines.push('');
  } else {
    lines.push('## Blockers');
    lines.push('');
    lines.push('Nenhum.');
    lines.push('');
  }

  if (state.last_session_summary) {
    lines.push('## Ultima sessao');
    lines.push('');
    lines.push(state.last_session_summary);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Como retomar');
  lines.push('');
  lines.push('1. Abra nova sessao no diretorio do projeto');
  lines.push(`2. Digite: \`xp-stack resume ${state.feature}\``);
  lines.push('3. O orquestrador lera state.json e perguntara onde continuar');
  lines.push('');

  return lines.join('\n');
}
