const TASK_ROW_RE = /^\|\s*(?:\[?)(T\d+(?:\.\d+)?)(?:\]\([^)]+\))?\s*\|.*?\|\s*(.*?)\s*\|/;

/**
 * Parseia tabela de tasks de um markdown.
 * Detecta linhas que comecam com pipe + T<num> e retorna {id, status, raw}.
 *
 * status = 'completed' se raw comeca com [x], 'pending' se comeca com [ ]
 *
 * @param {string} markdown
 * @returns {Array<{id: string, status: 'completed'|'pending', raw: string}>}
 */
export function parseTasksTable(markdown) {
  const out = [];
  for (const line of markdown.split('\n')) {
    const m = line.match(TASK_ROW_RE);
    if (!m) continue;
    const id = m[1];
    const raw = m[2];
    let status;
    if (raw.startsWith('[x]')) status = 'completed';
    else if (raw.startsWith('[ ]')) status = 'pending';
    else continue; // linha de header da tabela ou separator
    out.push({ id, status, raw });
  }
  return out;
}

/**
 * Re-renderiza tabela de tasks no markdown sincronizando com state.
 * Substitui o status (coluna 3) pra cada linha matched.
 * Preserva o resto da linha (subject, metadata pos-status).
 *
 * @param {string} markdown - Markdown original
 * @param {{tasks_completed: string[], tasks_pending: string[]}} state
 * @param {string} dateStr - YYYY-MM-DD pra anexar em "[x] Concluida <date>"
 * @returns {string} Markdown atualizado
 */
export function renderTasksTable(markdown, state, dateStr) {
  const completedSet = new Set(state.tasks_completed);
  const pendingSet = new Set(state.tasks_pending);

  return markdown.split('\n').map((line) => {
    const m = line.match(TASK_ROW_RE);
    if (!m) return line;
    const id = m[1];
    const oldRaw = m[2];

    // So mexer se o id esta em alguma das listas
    if (!completedSet.has(id) && !pendingSet.has(id)) return line;

    let newStatus;
    if (completedSet.has(id)) {
      // Preserva metadata pos-Concluida (ex: refs a commits)
      // Se ja era completed, mantem; se era pending, vira "Concluida <date>"
      if (oldRaw.startsWith('[x]')) {
        newStatus = oldRaw; // ja completed, nao mexer
      } else {
        newStatus = `[x] Concluida ${dateStr}`;
      }
    } else {
      // pending: preserva metadata pos-Pendente (ex: "bloqueada por T2")
      if (oldRaw.startsWith('[ ]')) {
        newStatus = oldRaw; // ja pending, nao mexer
      } else {
        newStatus = '[ ] Pendente';
      }
    }

    // Substituir oldRaw por newStatus na linha
    return line.replace(oldRaw, newStatus);
  }).join('\n');
}
