import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readState } from '../../lib/state.js';
import { parseTasksTable, renderTasksTable } from '../../lib/markdown-tasks.js';

async function runReconcile(slug, opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const featureDir = join(projectRoot, 'docs', 'tasks', slug);
  if (!existsSync(featureDir)) {
    throw new Error(`xp-stack reconcile: feature '${slug}' nao encontrada em docs/tasks/${slug}/`);
  }
  const state = readState(featureDir);
  if (!state) {
    throw new Error(`xp-stack reconcile: state.json nao encontrado em ${featureDir}/`);
  }
  const overviewPath = join(featureDir, '00-overview.md');
  if (!existsSync(overviewPath)) {
    throw new Error(`xp-stack reconcile: 00-overview.md nao encontrado em ${featureDir}/`);
  }
  const overview = readFileSync(overviewPath, 'utf8');
  const parsed = parseTasksTable(overview);

  // Detecta divergencias
  const completedSet = new Set(state.tasks_completed);
  const pendingSet = new Set(state.tasks_pending);
  const divergences = [];
  for (const t of parsed) {
    const inJsonCompleted = completedSet.has(t.id);
    const inJsonPending = pendingSet.has(t.id);
    if (!inJsonCompleted && !inJsonPending) continue; // task no markdown mas nao no state — skip
    const expectedStatus = inJsonCompleted ? 'completed' : 'pending';
    if (t.status !== expectedStatus) {
      divergences.push({ id: t.id, markdown: t.status, state: expectedStatus });
    }
  }

  if (divergences.length === 0) {
    console.log(`xp-stack reconcile: ${slug} ja sincronizado (sem drift entre state.json e 00-overview.md).`);
    return;
  }

  console.log(`xp-stack reconcile: ${divergences.length} divergencia(s) detectada(s) em ${slug}/00-overview.md:`);
  for (const d of divergences) {
    console.log(`  - ${d.id}: markdown=${d.markdown}, state=${d.state} -> JSON wins`);
  }

  if (!opts.apply) {
    console.log('\nDry-run (sem --apply). Use --apply pra atualizar markdown com base no state.json.');
    return;
  }

  // Apply: regera markdown
  const today = new Date().toISOString().slice(0, 10);
  const updated = renderTasksTable(overview, state, today);
  writeFileSync(overviewPath, updated, 'utf8');
  console.log(`xp-stack reconcile: 00-overview.md atualizado com ${divergences.length} mudanca(s).`);
}

export function registerReconcile(program) {
  program
    .command('reconcile <slug>')
    .description('Sincroniza 00-overview.md com state.json (JSON wins). Default: dry-run.')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .option('--apply', 'aplica mudancas no markdown (sem isto: dry-run)')
    .action(async (slug, opts) => {
      await runReconcile(slug, opts);
    });
  return program;
}
