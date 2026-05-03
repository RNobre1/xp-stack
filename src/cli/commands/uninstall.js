import { existsSync, rmSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readManifest, hashFile } from '../../lib/manifest.js';

async function runUninstall(opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  if (!opts.yes) {
    throw new Error('xp-stack uninstall: operacao destrutiva. Use --yes pra confirmar. (--yes obrigatorio)');
  }

  const manifest = readManifest(projectRoot);
  if (!manifest) {
    console.log('xp-stack uninstall: nada pra remover (manifest nao encontrado).');
    return;
  }

  let removed = 0;
  let preserved = 0;
  for (const [relPath, entry] of Object.entries(manifest.files)) {
    const abs = join(projectRoot, relPath);
    if (!existsSync(abs)) continue;
    if (opts.keepUserModified) {
      const currentHash = hashFile(abs);
      if (currentHash !== entry.hash) {
        preserved++;
        continue;
      }
    }
    unlinkSync(abs);
    removed++;
  }

  // Remove .xp-stack/ inteira (manifest + index + version + cache)
  const xpStackDir = join(projectRoot, '.xp-stack');
  if (existsSync(xpStackDir)) {
    rmSync(xpStackDir, { recursive: true, force: true });
  }

  console.log(`xp-stack uninstall: ${removed} arquivos removidos, ${preserved} preservados (user-modified).`);
  console.log(`Diretorio .xp-stack/ removido. Templates/skills nao tocados em /.git/.`);
}

export function registerUninstall(program) {
  program
    .command('uninstall')
    .description('Remove xp-stack do projeto (apaga files do manifest, preserva user-modified opcional)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .option('--yes', 'confirma operacao destrutiva (obrigatorio)')
    .option('--keep-user-modified', 'preserva files que diferenciam do hash original')
    .action(async (opts) => {
      await runUninstall(opts);
    });
  return program;
}
