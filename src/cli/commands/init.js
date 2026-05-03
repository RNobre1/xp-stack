import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { detectEngines, ENGINE_PATHS } from '../../lib/engines.js';
import { EMPTY_MANIFEST, readManifest, writeManifest } from '../../lib/manifest.js';
import { EMPTY_INDEX, readIndex, writeIndex } from '../../lib/index-tracker.js';
import { installToDualMirror } from '../../lib/installer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..', '..');
const TEMPLATES_ROOT = join(PKG_ROOT, 'templates');

/**
 * Lista todos os files relativos sob templates/ recursivamente.
 * @returns {string[]} paths relativos a TEMPLATES_ROOT
 */
function listTemplateFiles() {
  const out = [];
  function walk(dir, base = '') {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      if (entry === '.gitkeep') continue;
      const full = join(dir, entry);
      const rel = base ? `${base}/${entry}` : entry;
      if (statSync(full).isDirectory()) {
        walk(full, rel);
      } else {
        out.push(rel);
      }
    }
  }
  walk(TEMPLATES_ROOT);
  return out;
}

/**
 * Resolve quais engines instalar:
 * - --engine flag: forca lista explicita
 * - --no-dual-mirror: so engines detectadas
 * - default: engines detectadas + 'antigravity' (dual mirror always-on)
 */
function resolveEngines(opts, projectRoot) {
  if (opts.engine) {
    return opts.engine.split(',').map((e) => e.trim()).filter(Boolean);
  }
  const detected = detectEngines(projectRoot);
  if (opts.dualMirror === false) {
    return detected;
  }
  // Dual mirror always-on: se claude-code detectado mas nao antigravity, adiciona antigravity
  // Razao: instalar tambem em .agents/skills/ pra zero-friction quando user adicionar Antigravity/Codex/Cursor
  const engines = new Set(detected);
  if (engines.has('claude-code') && !engines.has('antigravity')) {
    engines.add('antigravity');
  }
  return Array.from(engines);
}

async function runInit(opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const engines = resolveEngines(opts, projectRoot);

  if (engines.length === 0) {
    throw new Error(
      'xp-stack init: nenhuma engine detectada no projeto. ' +
      'Use --engine <nome[,nome...]> pra forcar (ex: --engine claude-code).'
    );
  }

  const pkgJson = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));

  // Manifest: cria se nao existe, mantem files se ja existe
  let manifest = readManifest(projectRoot);
  if (!manifest) {
    manifest = EMPTY_MANIFEST(pkgJson.version);
    manifest.engines = engines;
  } else {
    // Idempotente: mantem version + files. So atualiza engines se mudou.
    manifest.engines = engines;
  }

  // Instala todos os templates pra todas as engines
  const templates = listTemplateFiles();
  for (const tpl of templates) {
    const result = installToDualMirror({
      sourceRel: tpl,
      sourceRoot: TEMPLATES_ROOT,
      projectRoot,
      engines,
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

  // Index: cria se nao existe, atualiza engines_installed
  let index = readIndex(projectRoot);
  if (!index) {
    index = EMPTY_INDEX();
  }
  index.engines_installed = engines;
  writeIndex(projectRoot, index);

  console.log(`xp-stack v${pkgJson.version} instalado em ${projectRoot}`);
  console.log(`Engines: ${engines.join(', ')}`);
  console.log(`Manifest: ${Object.keys(manifest.files).length} files trackeados`);
}

export function registerInit(program) {
  program
    .command('init')
    .description('Inicializa xp-stack no projeto (detect engines + instala templates + escreve manifest/index)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .option('--engine <names>', 'forca engines (csv): claude-code,codex,cursor,...')
    .option('--no-dual-mirror', 'desabilita dual mirror automatico (so engines detectadas)')
    .option('--yes', 'pula prompts interativos (CI-safe)')
    .action(async (opts) => {
      try {
        await runInit(opts);
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    });
  return program;
}
