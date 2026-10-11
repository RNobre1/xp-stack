import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_PATHS } from '../../lib/engines.js';
import { readManifest, writeManifest } from '../../lib/manifest.js';
import { EMPTY_INDEX, readIndex, writeIndex } from '../../lib/index-tracker.js';
import { OPT_IN_SKILLS } from '../../lib/opt-in-registry.js';
import { installFile, installToDualMirror, walkDir } from '../../lib/installer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..', '..');
const TEMPLATES_ROOT = join(PKG_ROOT, 'templates');
const CORE_SKILLS_SOURCE_ROOT = 'plugins/xp-stack/skills';

function getRegisteredSkillFiles(manifest) {
  const sourceRoots = new Set([
    CORE_SKILLS_SOURCE_ROOT,
    ...Object.values(OPT_IN_SKILLS).map(({ sourceRoot }) => sourceRoot),
  ]);
  const registered = new Map();

  for (const entry of Object.values(manifest.files ?? {})) {
    const sourceRel = entry?.source;
    if (typeof sourceRel !== 'string') continue;

    const sourceRoot = [...sourceRoots].find((root) => sourceRel.startsWith(`${root}/`));
    if (!sourceRoot) continue;

    const parts = sourceRel.slice(sourceRoot.length + 1).split('/');
    const [skillName, ...fileParts] = parts;
    if (!skillName || !fileParts.length || parts.some((part) => !part || part === '.' || part === '..')) {
      continue;
    }

    registered.set(sourceRel, { sourceRel, skillName, fileParts });
  }

  return [...registered.values()];
}

async function runAddEngine(engineName, opts) {
  if (!ENGINE_PATHS[engineName]) {
    throw new Error(`xp-stack add-engine: engine desconhecida '${engineName}'. Validas: ${Object.keys(ENGINE_PATHS).join(', ')}`);
  }
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    throw new Error('xp-stack add-engine: manifest nao encontrado. Rode "xp-stack init" primeiro.');
  }

  const index = readIndex(projectRoot) ?? EMPTY_INDEX();
  const currentIndexEngines = index.engines_installed ?? [];
  const installedEngines = [...new Set([...currentIndexEngines, ...(manifest.engines ?? [])])];
  if (!installedEngines.includes(engineName)) installedEngines.push(engineName);
  const indexChanged =
    installedEngines.length !== currentIndexEngines.length ||
    installedEngines.some((engine, position) => engine !== currentIndexEngines[position]);
  index.engines_installed = installedEngines;
  manifest.engines = [...installedEngines];
  if (indexChanged) writeIndex(projectRoot, index);

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

  // Replica skills e opt-ins ja registrados no manifest pela engine existente.
  const skillFiles = getRegisteredSkillFiles(manifest);
  const engineSkillsDir = ENGINE_PATHS[engineName].skillsDir;
  for (const skillFile of skillFiles) {
    const sourcePath = join(PKG_ROOT, ...skillFile.sourceRel.split('/'));
    if (!existsSync(sourcePath)) continue;

    const destRel = join(engineSkillsDir, skillFile.skillName, ...skillFile.fileParts);
    const destPath = join(projectRoot, destRel);
    const result = installFile(sourcePath, destPath);
    if (result.skipped) continue;

    manifest.files[destRel] = {
      hash: result.hash,
      source: skillFile.sourceRel,
      user_modified: false,
    };
  }

  writeManifest(projectRoot, manifest);

  console.log(`xp-stack add-engine: ${engineName} adicionada. Engines ativas: ${index.engines_installed.join(', ')}`);
}

export function registerAddEngine(program) {
  program
    .command('add-engine <engine>')
    .description('Adiciona uma engine adicional (instala templates em seu skillsDir)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .action(async (...args) => {
      try {
        await runAddEngine(...args);
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    });
  return program;
}
