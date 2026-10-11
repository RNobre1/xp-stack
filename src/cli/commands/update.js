import { existsSync, copyFileSync, lstatSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { resolve, join, dirname, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifest, writeManifest, hashFile } from '../../lib/manifest.js';
import { walkDir } from '../../lib/installer.js';
import { ENGINE_PATHS } from '../../lib/engines.js';
import { validate } from '../../lib/validators.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..', '..');

// Validate every candidate before writing. A manifest is not permission to write
// outside the selected project, nor to follow a user-created symbolic link.
function containedPath(root, rel) {
  if (typeof rel !== 'string' || !rel || isAbsolute(rel) || rel.includes('\\') ||
      rel.split('/').some((part) => part === '..' || part === '.' || !part)) {
    throw new Error(`xp-stack update: caminho inválido: ${rel}`);
  }
  let current = realpathSync(root);
  for (const part of rel.split('/')) {
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) {
        throw new Error(`xp-stack update: symlink no caminho gerenciado: ${rel}`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return current;
}

function sourceFor(rel, source) {
  // init <= 2.2.0 recorded placeholders for these two template trees.
  const legacy = [
    ['docs/tasks/_template/', 'plugins/xp-stack/templates/docs-tasks-template/'],
    ['docs/pesquisas/_template/', 'plugins/xp-stack/templates/docs-pesquisas-template/'],
  ];
  for (const [dest, src] of legacy) {
    if (source === `${src}...` && rel.startsWith(dest)) return `${src}${rel.slice(dest.length)}`;
  }
  return source;
}

function installedSkillGroups(files) {
  const groups = new Map();
  for (const [dest, entry] of Object.entries(files)) {
    const match = /^(plugins\/xp-stack\/skills|templates\/opt-in-skills)\/([^/]+)\/(.+)$/.exec(entry.source);
    if (!match) continue;
    const [, root, skill, suffix] = match;
    for (const cfg of Object.values(ENGINE_PATHS)) {
      const prefix = `${cfg.skillsDir}/${skill}/`;
      if (dest === `${prefix}${suffix}`) groups.set(prefix, `${root}/${skill}`);
    }
  }
  return groups;
}

async function runUpdate(opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  containedPath(projectRoot, '.xp-stack/manifest.json');
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    throw new Error('xp-stack update: manifest nao encontrado em .xp-stack/manifest.json. Rode "xp-stack init" primeiro.');
  }
  const validation = validate('manifest', manifest);
  if (!validation.valid) throw new Error(`Manifest invalido contra schema: ${JSON.stringify(validation.errors)}`);

  if (opts.keepMine && opts.takeTheirs) throw new Error('Escolha somente --keep-mine ou --take-theirs.');
  const autoMode = opts.yes ? (opts.keepMine ? 'keep' : opts.takeTheirs ? 'take' : 'skip') : null;
  const next = structuredClone(manifest);
  const copies = [];
  let modifiedCount = 0;
  let driftWithoutPolicy = false;

  for (const [relPath, entry] of Object.entries(manifest.files)) {
    const destPath = containedPath(projectRoot, relPath);
    if (entry.hash === 'managed_lines') continue;
    const source = sourceFor(relPath, entry.source);
    const sourcePath = containedPath(PKG_ROOT, source);
    if (!existsSync(sourcePath) || !lstatSync(sourcePath).isFile()) {
      console.warn(`Source indisponível; preservado: ${relPath}`);
      continue;
    }
    const sourceHash = hashFile(sourcePath);
    const currentHash = existsSync(destPath) ? hashFile(destPath) : null;
    if (currentHash !== entry.hash && currentHash !== sourceHash) {
      modifiedCount++;
      if (!autoMode) {
        console.error(`Drift detectado em ${relPath}. Use --yes --keep-mine OR --yes --take-theirs em CI.`);
        driftWithoutPolicy = true;
      }
      if (autoMode !== 'take') {
        next.files[relPath].user_modified = true;
        next.files[relPath].user_modified_detected_at = new Date().toISOString();
        continue;
      }
    }
    if (currentHash !== sourceHash) copies.push({ sourcePath, destPath });
    next.files[relPath] = { ...entry, hash: sourceHash, source, user_modified: false };
    delete next.files[relPath].user_modified_detected_at;
  }

  // Discover only new files belonging to an already installed skill/mirror.
  // Unmanaged collisions are always preserved, even with --take-theirs.
  for (const [destPrefix, sourcePrefix] of installedSkillGroups(manifest.files)) {
    const sourceDir = containedPath(PKG_ROOT, sourcePrefix);
    if (!existsSync(sourceDir)) continue;
    for (const relativeFile of walkDir(sourceDir)) {
      const suffix = relativeFile.split(sep).join('/');
      const destRel = `${destPrefix}${suffix}`;
      if (Object.hasOwn(manifest.files, destRel)) continue;
      const destPath = containedPath(projectRoot, destRel);
      const source = `${sourcePrefix}/${suffix}`;
      const sourcePath = containedPath(PKG_ROOT, source);
      if (existsSync(destPath)) {
        console.warn(`Arquivo local não gerenciado; preservado: ${destRel}`);
        continue;
      }
      copies.push({ sourcePath, destPath });
      next.files[destRel] = { hash: hashFile(sourcePath), source, user_modified: false };
    }
  }

  if (driftWithoutPolicy) {
    process.exitCode = 1;
    return;
  }
  for (const { sourcePath, destPath } of copies) {
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(sourcePath, destPath);
  }
  next.installed_version = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8')).version;
  writeManifest(projectRoot, next);
  if (copies.length === 0 && modifiedCount === 0) {
    console.log('xp-stack update: nothing to update (sem drift detectado)');
  } else {
    console.log(`xp-stack update: ${copies.length} arquivos atualizados/adicionados; ${modifiedCount} alterações locais avaliadas.`);
  }
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
