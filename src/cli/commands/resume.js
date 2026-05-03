import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readIndex } from '../../lib/index-tracker.js';

function readState(projectRoot, slug) {
  const path = join(projectRoot, 'docs/tasks', slug, 'state.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function runResume(slug, opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const index = readIndex(projectRoot);

  if (!index || index.active_features.length === 0) {
    console.log('xp-stack resume: nenhuma feature ativa em .xp-stack/index.json.');
    return;
  }

  if (!slug) {
    console.log(`xp-stack resume: ${index.active_features.length} features ativas:`);
    const sorted = [...index.active_features].sort((a, b) => b.last_touched.localeCompare(a.last_touched));
    for (const f of sorted) {
      console.log(`  - ${f.slug} (phase: ${f.phase}, last_touched: ${f.last_touched})`);
    }
    console.log(`\nUse: xp-stack resume <slug> pra ver detalhes.`);
    return;
  }

  const feature = index.active_features.find((f) => f.slug === slug);
  if (!feature) {
    console.log(`xp-stack resume: feature '${slug}' nao encontrada em active_features.`);
    return;
  }

  const state = readState(projectRoot, slug);
  if (!state) {
    console.log(`xp-stack resume: state.json nao encontrado em docs/tasks/${slug}/.`);
    return;
  }

  console.log(`xp-stack resume: ${slug}`);
  console.log(`  phase: ${state.phase}`);
  console.log(`  phases_completed: ${state.phases_completed.join(', ') || '(none)'}`);
  console.log(`  current_task: ${state.current_task || '(unset)'}`);
  console.log(`  tasks_completed: ${state.tasks_completed.length}`);
  console.log(`  tasks_pending: ${state.tasks_pending.join(', ') || '(none)'}`);
  if (state.blockers?.length) {
    console.log(`  blockers:`);
    for (const b of state.blockers) {
      console.log(`    - ${b.task}: ${b.reason}`);
    }
  }
  if (state.last_session_summary) {
    console.log(`  last_session_summary: ${state.last_session_summary}`);
  }
}

export function registerResume(program) {
  program
    .command('resume [slug]')
    .description('Lista features ativas ou retoma uma especifica (le state.json)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .action(async (slug, opts) => {
      try {
        await runResume(slug, opts);
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    });
  return program;
}
