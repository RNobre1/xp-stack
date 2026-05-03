import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_PATHS } from '../../lib/engines.js';
import { readManifest, writeManifest } from '../../lib/manifest.js';
import { readIndex, writeIndex } from '../../lib/index-tracker.js';
import { installToDualMirror, walkDir } from '../../lib/installer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..', '..');
const TEMPLATES_ROOT = join(PKG_ROOT, 'templates');

async function runAddEngine(engineName, opts) {
  if (!ENGINE_PATHS[engineName]) {
    throw new Error(`xp-stack add-engine: engine desconhecida '${engineName}'. Validas: ${Object.keys(ENGINE_PATHS).join(', ')}`);
  }
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    throw new Error('xp-stack add-engine: manifest nao encontrado. Rode "xp-stack init" primeiro.');
  }

  const index = readIndex(projectRoot) ?? { schema_version: '1.0', active_features: [], archived_features: [], doc_level_default: 'completo', engines_installed: [] };
  if (!index.engines_installed.includes(engineName)) {
    index.engines_installed.push(engineName);
    writeIndex(projectRoot, index);
  }

  // Instala todos os templates pra essa engine
  const templates = walkDir(TEMPLATES_ROOT);
  for (const tpl of templates) {
    const result = installToDualMirror({
      sourceRel: tpl,
      sourceRoot: TEMPLATES_ROOT,
      projectRoot,
      engines: [engineName],
      overwrite: false,
    });
    for (const inst of result.installed) {
      manifest.files[inst.destRel] = {
        hash: inst.hash,
        source: `templates/${tpl}`,
        user_modified: false,
      };
    }
  }
  writeManifest(projectRoot, manifest);

  console.log(`xp-stack add-engine: ${engineName} adicionada. Engines ativas: ${index.engines_installed.join(', ')}`);
}

export function registerAddEngine(program) {
  program
    .command('add-engine <engine>')
    .description('Adiciona uma engine adicional (instala templates em seu skillsDir)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .action(async (engine, opts) => {
      await runAddEngine(engine, opts);
    });
  return program;
}
