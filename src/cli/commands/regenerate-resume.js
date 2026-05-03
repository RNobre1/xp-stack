import { existsSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readState } from '../../lib/state.js';
import { generateResumeMarkdown } from '../../lib/resume-generator.js';

async function runRegenerateResume(slug, opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  const featureDir = join(projectRoot, 'docs', 'tasks', slug);
  if (!existsSync(featureDir)) {
    throw new Error(`xp-stack regenerate-resume: feature '${slug}' nao encontrada em docs/tasks/${slug}/`);
  }
  const state = readState(featureDir);
  if (!state) {
    throw new Error(`xp-stack regenerate-resume: state.json nao encontrado em ${featureDir}/`);
  }
  const md = generateResumeMarkdown(state);
  writeFileSync(join(featureDir, 'RESUME.md'), md, 'utf8');
  console.log(`xp-stack regenerate-resume: ${slug}/RESUME.md regenerado.`);
}

export function registerRegenerateResume(program) {
  program
    .command('regenerate-resume <slug>')
    .description('Regenera RESUME.md de uma feature a partir de state.json')
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .action(async (slug, opts) => {
      try {
        await runRegenerateResume(slug, opts);
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    });
  return program;
}
