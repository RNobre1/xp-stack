import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, join, dirname, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_PATHS } from '../../lib/engines.js';
import { readManifest, writeManifest } from '../../lib/manifest.js';
import { EMPTY_INDEX, readIndex, writeIndex } from '../../lib/index-tracker.js';
import { OPT_IN_SKILLS } from '../../lib/opt-in-registry.js';
import { installFile, walkDir } from '../../lib/installer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..', '..');
const TEMPLATES_ROOT = join(PKG_ROOT, 'templates');
const CORE_SKILLS_SOURCE_ROOT = 'plugins/xp-stack/skills';

function containedPath(root, rel) {
  if (typeof rel !== 'string' || !rel || isAbsolute(rel) || rel.includes('\\') ||
      rel.split('/').some((part) => part === '..' || part === '.' || !part)) {
    throw new Error(`xp-stack add-engine: caminho inválido: ${rel}`);
  }

  let current = realpathSync(root);
  for (const part of rel.split('/')) {
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) {
        throw new Error(
          `xp-stack add-engine: symlink no caminho gerenciado: ${rel}. Nenhum arquivo foi atualizado; reconcilie o mirror/manifest antes de repetir.`,
        );
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return current;
}

function toPosixPath(value) {
  return value.split(sep).join('/');
}

function getRegisteredSkillFiles(manifestFiles, installedEngines, projectRoot) {
  const sourceRoots = new Set([
    CORE_SKILLS_SOURCE_ROOT,
    ...Object.values(OPT_IN_SKILLS).map(({ sourceRoot }) => sourceRoot),
  ]);
  const engineSkillsDirs = installedEngines
    .map((engine) => ENGINE_PATHS[engine]?.skillsDir)
    .filter(Boolean)
    .map(toPosixPath);
  const registered = new Map();

  for (const [destPathRel, entry] of Object.entries(manifestFiles ?? {})) {
    const sourceRel = entry?.source;
    if (typeof sourceRel !== 'string') continue;

    const sourceRoot = [...sourceRoots].find((root) => sourceRel.startsWith(`${root}/`));
    if (!sourceRoot) continue;

    const parts = sourceRel.slice(sourceRoot.length + 1).split('/');
    const [skillName, ...fileParts] = parts;
    if (!skillName || !fileParts.length || parts.some((part) => !part || part === '.' || part === '..')) {
      continue;
    }

    const skillRel = `${skillName}/${fileParts.join('/')}`;
    const destRel = toPosixPath(destPathRel);
    const installedInEngine = engineSkillsDirs.some((skillsDir) => destRel === `${skillsDir}/${skillRel}`);
    if (!installedInEngine) continue;

    const installedPath = containedPath(projectRoot, destRel);
    if (!existsSync(installedPath)) continue;

    registered.set(sourceRel, { sourceRel, skillName, fileParts });
  }

  return [...registered.values()];
}

async function runAddEngine(engineName, opts) {
  if (!ENGINE_PATHS[engineName]) {
    throw new Error(`xp-stack add-engine: engine desconhecida '${engineName}'. Validas: ${Object.keys(ENGINE_PATHS).join(', ')}`);
  }
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  containedPath(projectRoot, '.xp-stack/manifest.json');
  containedPath(projectRoot, '.xp-stack/index.json');
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    throw new Error('xp-stack add-engine: manifest nao encontrado. Rode "xp-stack init" primeiro.');
  }

  const index = readIndex(projectRoot) ?? EMPTY_INDEX();
  const currentIndexEngines = index.engines_installed ?? [];
  const existingEngines = [...new Set([...currentIndexEngines, ...(manifest.engines ?? [])])];
  const manifestFilesBefore = { ...manifest.files };
  const skillFiles = getRegisteredSkillFiles(manifestFilesBefore, existingEngines, projectRoot);

  const installedEngines = [...existingEngines];
  if (!installedEngines.includes(engineName)) installedEngines.push(engineName);
  const indexChanged =
    installedEngines.length !== currentIndexEngines.length ||
    installedEngines.some((engine, position) => engine !== currentIndexEngines[position]);
  index.engines_installed = installedEngines;
  manifest.engines = [...installedEngines];

  const engineSkillsDir = toPosixPath(ENGINE_PATHS[engineName].skillsDir);
  const optInTemplateRoots = new Set(
    Object.values(OPT_IN_SKILLS)
      .map(({ sourceRoot }) => sourceRoot)
      .filter((sourceRoot) => sourceRoot.startsWith('templates/'))
      .map((sourceRoot) => sourceRoot.slice('templates/'.length)),
  );
  const templates = walkDir(TEMPLATES_ROOT).filter(
    (path) => ![...optInTemplateRoots].some((root) => path === root || path.startsWith(`${root}/`)),
  );
  const templatePlan = templates.map((tpl) => {
    const destRel = `${engineSkillsDir}/${tpl}`;
    return {
      sourcePath: join(TEMPLATES_ROOT, ...tpl.split('/')),
      sourceRel: `templates/${tpl}`,
      destRel,
      destPath: containedPath(projectRoot, destRel),
    };
  });
  const skillPlan = [];
  for (const skillFile of skillFiles) {
    const sourcePath = join(PKG_ROOT, ...skillFile.sourceRel.split('/'));
    if (!existsSync(sourcePath)) continue;

    const destRel = `${engineSkillsDir}/${skillFile.skillName}/${skillFile.fileParts.join('/')}`;
    skillPlan.push({
      sourcePath,
      sourceRel: skillFile.sourceRel,
      destRel,
      destPath: containedPath(projectRoot, destRel),
    });
  }

  // Complete every path check before changing the index, files, or manifest.
  if (indexChanged) writeIndex(projectRoot, index);

  for (const template of templatePlan) {
    const result = installFile(template.sourcePath, template.destPath);
    if (result.skipped) continue;

    manifest.files[template.destRel] = {
      hash: result.hash,
      source: template.sourceRel,
      user_modified: false,
    };
  }

  for (const skill of skillPlan) {
    const result = installFile(skill.sourcePath, skill.destPath);
    if (result.skipped) continue;

    manifest.files[skill.destRel] = {
      hash: result.hash,
      source: skill.sourceRel,
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
