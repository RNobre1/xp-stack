import { existsSync, readdirSync, statSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_PATHS } from '../../lib/engines.js';
import { hashFile, readManifest, writeManifest } from '../../lib/manifest.js';
import { readIndex } from '../../lib/index-tracker.js';
import {
  OPT_IN_SKILLS,
  resolveSkillName,
  formatUnknownSkillError,
} from '../../lib/opt-in-registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..', '..');

/**
 * Resolve dir absoluto da skill source.
 *
 * - Se `XP_STACK_OPT_IN_ROOT` env var set: usa esse root pra QUALQUER skill name
 *   (override pra testes isolados; mantem retrocompat).
 * - Senao: usa o registry oficial (cada skill aponta pro proprio sourceRoot).
 */
function getSkillSourceDir(skillName) {
  if (process.env.XP_STACK_OPT_IN_ROOT) {
    return join(process.env.XP_STACK_OPT_IN_ROOT, skillName);
  }
  const def = OPT_IN_SKILLS[skillName];
  if (!def) return null;
  return join(PKG_ROOT, def.sourceRoot, skillName);
}

function listSkillFiles(skillDir) {
  const out = [];
  function walk(dir, base = '') {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const rel = base ? `${base}/${entry}` : entry;
      if (statSync(full).isDirectory()) {
        walk(full, rel);
      } else {
        out.push(rel);
      }
    }
  }
  walk(skillDir);
  return out;
}

async function runAddSkill(skillInput, opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());

  // 1. Resolve nome (canonical OU alias). Em modo XP_STACK_OPT_IN_ROOT (testes),
  //    aceita qualquer nome de dir existente (preserva retrocompat dos tests).
  let canonical;
  if (process.env.XP_STACK_OPT_IN_ROOT) {
    canonical = skillInput;
  } else {
    canonical = resolveSkillName(skillInput);
    if (!canonical) {
      throw new Error(formatUnknownSkillError(skillInput));
    }
  }

  // 2. Localiza source
  const skillSourceDir = getSkillSourceDir(canonical);
  if (!skillSourceDir || !existsSync(skillSourceDir)) {
    throw new Error(
      `xp-stack add-skill: skill nao encontrada em ${skillSourceDir ?? '<sem registry hit>'}/`
    );
  }

  // 3. Manifest + index existentes
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    throw new Error('xp-stack add-skill: manifest nao encontrado. Rode "xp-stack init" primeiro.');
  }
  const index = readIndex(projectRoot);
  const engines = index?.engines_installed ?? [];
  if (engines.length === 0) {
    throw new Error('xp-stack add-skill: nenhuma engine instalada. Rode "xp-stack init" primeiro.');
  }

  // 4. Instala em cada engine (skip files ja presentes)
  let totalInstalled = 0;
  const sourceLabel = process.env.XP_STACK_OPT_IN_ROOT
    ? `${process.env.XP_STACK_OPT_IN_ROOT}/${canonical}`
    : `${OPT_IN_SKILLS[canonical].sourceRoot}/${canonical}`;

  for (const engine of engines) {
    const cfg = ENGINE_PATHS[engine];
    if (!cfg) continue;

    const files = listSkillFiles(skillSourceDir);
    for (const f of files) {
      const sourcePath = join(skillSourceDir, f);
      const destRel = join(cfg.skillsDir, canonical, f);
      const destPath = join(projectRoot, destRel);
      if (existsSync(destPath)) continue;
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(sourcePath, destPath);
      manifest.files[destRel] = {
        hash: hashFile(destPath),
        source: `${sourceLabel}/${f}`,
        user_modified: false,
      };
      totalInstalled++;
    }
  }
  writeManifest(projectRoot, manifest);

  const aliasNote =
    skillInput !== canonical && !process.env.XP_STACK_OPT_IN_ROOT
      ? ` (alias "${skillInput}" -> ${canonical})`
      : '';
  console.log(
    `xp-stack add-skill: ${canonical} instalada${aliasNote} (${totalInstalled} arquivos em ${engines.length} engine(s)).`
  );
}

function buildHelpEpilog() {
  const lines = ['', 'Opt-in skills disponiveis:'];
  for (const [name, def] of Object.entries(OPT_IN_SKILLS)) {
    const aliasStr = def.aliases.length ? ` (alias: ${def.aliases.join(', ')})` : '';
    lines.push(`  ${name}${aliasStr}`);
    lines.push(`    ${def.summary}`);
  }
  return lines.join('\n');
}

export function registerAddSkill(program) {
  program
    .command('add-skill <skill>')
    .description('Habilita skill opt-in (paperclip, local-waves, db-archaeologist, etc.) — ver lista completa em --help')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .addHelpText('after', buildHelpEpilog())
    .action(async (...args) => {
      try {
        await runAddSkill(...args);
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    });
  return program;
}
