import { resolve } from 'node:path';
import { readManifest } from '../../lib/manifest.js';
import { readIndex } from '../../lib/index-tracker.js';

async function runStatus(opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const manifest = readManifest(projectRoot);
  const index = readIndex(projectRoot);

  if (!manifest) {
    console.log('xp-stack: nao instalado neste projeto. Rode "xp-stack init".');
    return;
  }

  console.log(`xp-stack status @ ${projectRoot}`);
  console.log(`  version: ${manifest.installed_version}`);
  console.log(`  installed_at: ${manifest.installed_at}`);
  console.log(`  engines: ${(index?.engines_installed ?? []).join(', ') || '(none)'}`);
  console.log(`  files: ${Object.keys(manifest.files).length} trackeados`);

  const userModifiedCount = Object.values(manifest.files).filter((f) => f.user_modified).length;
  if (userModifiedCount > 0) {
    console.log(`  user_modified: ${userModifiedCount} arquivos`);
  }

  if (index?.active_features?.length) {
    console.log(`  active_features:`);
    for (const f of index.active_features) {
      console.log(`    - ${f.slug} (${f.phase}, last_touched ${f.last_touched})`);
    }
  }
}

export function registerStatus(program) {
  program
    .command('status')
    .description('Imprime estado atual do xp-stack neste projeto (version, engines, files, drift)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .action(async (...args) => {
      try {
        await runStatus(...args);
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    });
  return program;
}
