import { existsSync, readdirSync, statSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_PATHS } from '../../lib/engines.js';
import { hashFile, readManifest, writeManifest } from '../../lib/manifest.js';
import { readIndex } from '../../lib/index-tracker.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..', '..');
// XP_STACK_OPT_IN_ROOT permite override pra testes isolados (evita race com add-skill.test.js)
const OPT_IN_ROOT = process.env.XP_STACK_OPT_IN_ROOT ?? join(PKG_ROOT, 'templates', 'opt-in-skills');

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

async function runAddSkill(skillName, opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const skillSourceDir = join(OPT_IN_ROOT, skillName);
  if (!existsSync(skillSourceDir)) {
    throw new Error(`xp-stack add-skill: skill nao encontrada em templates/opt-in-skills/${skillName}/`);
  }

  const manifest = readManifest(projectRoot);
  if (!manifest) {
    throw new Error('xp-stack add-skill: manifest nao encontrado. Rode "xp-stack init" primeiro.');
  }
  const index = readIndex(projectRoot);
  const engines = index?.engines_installed ?? [];
  if (engines.length === 0) {
    throw new Error('xp-stack add-skill: nenhuma engine instalada. Rode "xp-stack init" primeiro.');
  }

  // Pra cada engine, instala a skill em <engine.skillsDir>/<skillName>/<file>
  let totalInstalled = 0;
  for (const engine of engines) {
    const cfg = ENGINE_PATHS[engine];
    if (!cfg) continue;

    const files = listSkillFiles(skillSourceDir);
    for (const f of files) {
      const sourcePath = join(skillSourceDir, f);
      const destRel = join(cfg.skillsDir, skillName, f);
      const destPath = join(projectRoot, destRel);
      if (existsSync(destPath)) continue;
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(sourcePath, destPath);
      manifest.files[destRel] = {
        hash: hashFile(destPath),
        source: `templates/opt-in-skills/${skillName}/${f}`,
        user_modified: false,
      };
      totalInstalled++;
    }
  }
  writeManifest(projectRoot, manifest);

  console.log(`xp-stack add-skill: ${skillName} instalada (${totalInstalled} arquivos em ${engines.length} engine(s)).`);
}

export function registerAddSkill(program) {
  program
    .command('add-skill <skill>')
    .description('Habilita skill opt-in (paperclip, local-waves, agents B5, etc.)')
    .option('--cwd <path>', 'project root (default: process.cwd())')
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
