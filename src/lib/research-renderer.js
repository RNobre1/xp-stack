/**
 * Gera markdown da pesquisa a partir de sources + claims.
 *
 * Estrutura: header + claims (com inline citations + confidence) + fontes (lista).
 *
 * @param {string} slug - Nome da pesquisa (ex: 'estudo-x')
 * @param {Array} sources - Array conforme sources.schema.json
 * @param {Array} claims - Array conforme claims.schema.json
 * @returns {string} Markdown completo
 */
export function renderResearchMarkdown(slug, sources, claims) {
  const lines = [];

  lines.push(`# ${slug}`);
  lines.push('');
  lines.push(`> Gerado automaticamente a partir de claims.json + sources.json. Editar a prosa? Edite o markdown direto. Editar status/confidence? Edite os JSONs e regenere com \`xp-stack render-research ${slug}\`.`);
  lines.push('');
  lines.push('---');
  lines.push('');

  if (claims.length === 0) {
    lines.push('## Claims');
    lines.push('');
    lines.push('_(nenhum claim registrado ainda)_');
    lines.push('');
  } else {
    lines.push('## Claims');
    lines.push('');
    for (const claim of claims) {
      const citations = claim.sources.join(', ');
      const reviewedMark = claim.reviewed_by_critic ? ' *(revisado pelo critic)*' : '';
      lines.push(`- ${claim.statement} [${citations}] ${claim.confidence}${reviewedMark}`);
    }
    lines.push('');
  }

  if (sources.length === 0) {
    lines.push('## Fontes');
    lines.push('');
    lines.push('_(nenhuma fonte registrada ainda)_');
    lines.push('');
  } else {
    lines.push('## Fontes');
    lines.push('');
    for (const s of sources) {
      lines.push(`- **${s.id}** — ${s.title} (${s.type}, acessado ${s.accessed_at}): ${s.url}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Glossario de confidence');
  lines.push('');
  lines.push('- 🟢 **CONFIRMADO** — extraido de fonte primaria (codigo, docs oficiais)');
  lines.push('- 🟡 **INFERIDO** — baseado em padrao observado, similar, ou heuristica');
  lines.push('- 🔴 **LACUNA** — requer validacao humana antes de prosseguir');
  lines.push('');

  return lines.join('\n');
}
