import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readState } from '../../lib/state.js';
import { registerFeature } from '../../lib/index-tracker.js';

/**
 * Lista features ativas em docs/tasks/{slug}/ (cada uma com state.json).
 * Retorna ordenado por mtime desc (mais recente primeiro).
 *
 * @param {string} projectRoot
 * @returns {Array<{slug: string, dir: string, mtime: number}>}
 */
function listFeatureDirs(projectRoot) {
  const tasksRoot = join(projectRoot, 'docs', 'tasks');
  if (!existsSync(tasksRoot)) return [];
  const out = [];
  for (const entry of readdirSync(tasksRoot)) {
    if (entry.startsWith('_') || entry === '_template' || entry === '_archive') continue;
    const dir = join(tasksRoot, entry);
    const st = statSync(dir);
    if (!st.isDirectory()) continue;
    const stateFile = join(dir, 'state.json');
    if (!existsSync(stateFile)) continue;
    const stateMtime = statSync(stateFile).mtime.getTime();
    out.push({ slug: entry, dir, mtime: stateMtime });
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

async function runHookStop(opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());

  let featureSlug = opts.feature;
  let featureDir;

  if (featureSlug) {
    featureDir = join(projectRoot, 'docs', 'tasks', featureSlug);
    if (!existsSync(join(featureDir, 'state.json'))) {
      throw new Error(`xp-stack hook-stop: feature '${featureSlug}' nao encontrada em docs/tasks/${featureSlug}/state.json`);
    }
  } else {
    const features = listFeatureDirs(projectRoot);
    if (features.length === 0) {
      // No-op silencioso (hook roda sempre, mesmo se nao ha feature ativa)
      return;
    }
    const top = features[0];
    featureSlug = top.slug;
    featureDir = top.dir;
  }

  const state = readState(featureDir);
  if (!state) return; // defensive

  registerFeature(projectRoot, featureSlug, state.phase);
  // RESUME.md regen vira em T12
}

export function registerHookStop(program) {
  program
    .command('hook-stop')
    .description('Chamado pelo hook Stop do Claude Code: atualiza index.json (e RESUME.md em T12)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .option('--feature <slug>', 'feature especifica (default: auto-detect mais recente em docs/tasks/)')
    .action(async (opts) => {
      try {
        await runHookStop(opts);
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    });
  return program;
}
