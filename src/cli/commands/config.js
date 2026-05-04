import { resolve } from 'node:path';
import { readIndex, writeIndex } from '../../lib/index-tracker.js';
import { DOC_LEVELS } from '../../lib/doc-level-resolver.js';

/**
 * Le e imprime config atual do projeto (doc_level_default + engines + counts).
 *
 * @param {string|undefined} key - Se passada, imprime so essa key
 * @param {object} opts
 */
async function runGet(key, opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const index = readIndex(projectRoot);
  if (!index) {
    throw new Error('xp-stack config get: nenhum index encontrado. Rode "xp-stack init" primeiro.');
  }

  const config = {
    doc_level_default: index.doc_level_default,
    engines_installed: index.engines_installed,
    active_features: index.active_features?.length ?? 0,
    archived_features: index.archived_features?.length ?? 0,
  };

  if (key) {
    if (!Object.prototype.hasOwnProperty.call(config, key)) {
      throw new Error(
        `xp-stack config get: key "${key}" desconhecida. Disponiveis: ${Object.keys(config).join(', ')}.`
      );
    }
    const value = config[key];
    console.log(Array.isArray(value) ? value.join(', ') : value);
    return;
  }

  console.log(`xp-stack config @ ${projectRoot}`);
  console.log(`  doc_level_default: ${config.doc_level_default}`);
  console.log(`  engines_installed: ${config.engines_installed.join(', ')}`);
  console.log(`  active_features:   ${config.active_features}`);
  console.log(`  archived_features: ${config.archived_features}`);
}

async function runSetDocLevel(level, opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  if (!DOC_LEVELS.includes(level)) {
    throw new Error(
      `xp-stack config doc-level: valor invalido "${level}". Aceitos: ${DOC_LEVELS.join(', ')}.`
    );
  }
  const index = readIndex(projectRoot);
  if (!index) {
    throw new Error(
      'xp-stack config doc-level: nenhum index encontrado. Rode "xp-stack init" primeiro.'
    );
  }
  const previous = index.doc_level_default;
  if (previous === level) {
    console.log(`xp-stack config doc-level: ja esta em "${level}", nada a fazer.`);
    return;
  }
  index.doc_level_default = level;
  writeIndex(projectRoot, index);
  console.log(`xp-stack config doc-level: ${previous} -> ${level}`);
}

export function registerConfig(program) {
  const config = program.command('config').description('Le ou edita config do xp-stack neste projeto');

  config
    .command('get [key]')
    .description('Imprime config (sem key = tudo, com key = so essa)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .action(async (key, opts) => {
      try {
        await runGet(key, opts);
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    });

  config
    .command('doc-level <level>')
    .description(`Define nivel de detalhamento das tasks (${DOC_LEVELS.join(' | ')})`)
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .action(async (level, opts) => {
      try {
        await runSetDocLevel(level, opts);
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    });

  return program;
}
