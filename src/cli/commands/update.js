import { existsSync, copyFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifest, writeManifest, detectDrift, hashFile } from '../../lib/manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..', '..');

async function runUpdate(opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    throw new Error('xp-stack update: manifest nao encontrado em .xp-stack/manifest.json. Rode "xp-stack init" primeiro.');
  }

  // Auto-yes mode: --keep-mine, --take-theirs, ou default skip
  const autoMode = opts.yes ? (opts.keepMine ? 'keep' : opts.takeTheirs ? 'take' : 'skip') : null;

  let modifiedCount = 0;
  let updatedCount = 0;
  let driftWithoutPolicy = false;

  for (const [relPath, entry] of Object.entries(manifest.files)) {
    const drift = detectDrift(projectRoot, relPath, entry.hash);

    if (drift === 'modified') {
      modifiedCount++;
      if (autoMode === 'keep' || autoMode === 'skip') {
        // Marca como user_modified no manifest, nao toca no arquivo
        entry.user_modified = true;
        entry.user_modified_detected_at = new Date().toISOString();
      } else if (autoMode === 'take') {
        // Sobrescreve com source
        const sourcePath = join(PKG_ROOT, entry.source);
        if (existsSync(sourcePath)) {
          copyFileSync(sourcePath, join(projectRoot, relPath));
          entry.hash = hashFile(join(projectRoot, relPath));
          entry.user_modified = false;
          updatedCount++;
        }
      } else {
        // No --yes: erro claro pedindo flag de policy, marca pra exit 1
        console.error(`Drift detectado em ${relPath}. Use --yes --keep-mine OR --yes --take-theirs em CI.`);
        driftWithoutPolicy = true;
      }
    }
  }

  if (driftWithoutPolicy) {
    process.exitCode = 1;
    // Nao reescrever manifest quando comando falhou
    return;
  }

  if (modifiedCount === 0) {
    console.log('xp-stack update: nothing to update (sem drift detectado)');
  } else {
    console.log(`xp-stack update: ${modifiedCount} arquivos com drift, ${updatedCount} sobrescritos`);
  }

  writeManifest(projectRoot, manifest);
}

export function registerUpdate(program) {
  program
    .command('update')
    .description('Atualiza skills/templates pra versao instalada do xp-stack (detecta drift via manifest)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .option('--yes', 'pula prompts interativos (requer --keep-mine ou --take-theirs)')
    .option('--keep-mine', 'mantem versao do user (marca user_modified=true)')
    .option('--take-theirs', 'sobrescreve com versao nova')
    .action(async (opts) => {
      try {
        await runUpdate(opts);
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    });
  return program;
}
