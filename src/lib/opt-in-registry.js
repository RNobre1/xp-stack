/**
 * Registry centralizado das skills opt-in disponiveis via `xp-stack add-skill`.
 *
 * Cada skill aponta pra sua fonte (plugins/ ou templates/opt-in-skills/) +
 * aliases user-friendly + descricao curta pra help text.
 *
 * Razao: skills foram organizadas em 2 fontes durante o desenvolvimento (CLI/process
 * em plugins/xp-stack/skills/, agent skills em templates/opt-in-skills/). add-skill
 * lia so de templates/opt-in-skills/, deixando paperclip-orchestrator/local-waves/
 * bootstrap/claude-md-bootstrap inacessiveis. Esse registry unifica.
 */
export const OPT_IN_SKILLS = {
  'paperclip-orchestrator': {
    sourceRoot: 'plugins/xp-stack/skills',
    summary: 'Setup multi-agent remoto (droplet via Paperclip API)',
    aliases: ['paperclip'],
  },
  'local-waves': {
    sourceRoot: 'plugins/xp-stack/skills',
    summary: 'Setup multi-agent local (paralelizacao via worktrees)',
    aliases: ['waves', 'wave'],
  },
  'bootstrap': {
    sourceRoot: 'plugins/xp-stack/skills',
    summary: 'Scaffold inicial do projeto (uso interno do init, raramente manual)',
    aliases: [],
  },
  'claude-md-bootstrap': {
    sourceRoot: 'plugins/xp-stack/skills',
    summary: 'Le codebase + docs e preenche CLAUDE.md a partir do template',
    aliases: ['claude-md', 'claudemd'],
  },
  'db-archaeologist': {
    sourceRoot: 'templates/opt-in-skills',
    summary: 'Analisa schema PostgreSQL/Supabase, RLS policies, migrations',
    aliases: ['db'],
  },
  'screenshot-spec-writer': {
    sourceRoot: 'templates/opt-in-skills',
    summary: 'Transforma screenshot de UI em spec markdown',
    aliases: ['screenshot', 'spec-writer'],
  },
  'flowchart-extractor': {
    sourceRoot: 'templates/opt-in-skills',
    summary: 'Gera Mermaid flowchart fiel ao fluxo de uma funcao',
    aliases: ['flowchart'],
  },
  'debugging-discipline': {
    sourceRoot: 'templates/opt-in-skills',
    summary: 'Instala gates de fix-workflow (PR template + hook PreToolUse) para enforcar disciplina de debug',
    aliases: ['debug-discipline', 'fix-gates', 'debugging'],
  },
  'code-review-automation': {
    sourceRoot: 'templates/opt-in-skills',
    summary: 'Instala gates de orchestrator self-review (slash command /review-pr, PR template section, PreToolUse hook em gh pr create/merge). Anti-viés família via adversarial persona prompting.',
    aliases: ['review-auto', 'pr-review-gate', 'self-review', 'review'],
  },
};

/**
 * Resolve nome canonico a partir de input do usuario (canonico OU alias).
 *
 * @param {string} input
 * @returns {string|null} nome canonico ou null se nao bater
 */
export function resolveSkillName(input) {
  if (Object.prototype.hasOwnProperty.call(OPT_IN_SKILLS, input)) return input;
  for (const [canonical, def] of Object.entries(OPT_IN_SKILLS)) {
    if (def.aliases.includes(input)) return canonical;
  }
  return null;
}

/**
 * Lista skills disponiveis pra help text.
 *
 * @returns {Array<{name: string, aliases: string[], summary: string}>}
 */
export function listAvailableSkills() {
  return Object.entries(OPT_IN_SKILLS).map(([name, def]) => ({
    name,
    aliases: def.aliases,
    summary: def.summary,
  }));
}

/**
 * Formata mensagem de erro listando todas as opcoes (canonico + aliases).
 */
export function formatUnknownSkillError(input) {
  const lines = [`xp-stack add-skill: skill desconhecida "${input}".`, '', 'Disponiveis:'];
  for (const skill of listAvailableSkills()) {
    const aliasStr = skill.aliases.length ? ` (alias: ${skill.aliases.join(', ')})` : '';
    lines.push(`  - ${skill.name}${aliasStr}`);
    lines.push(`      ${skill.summary}`);
  }
  return lines.join('\n');
}
