import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { registerVersion } from './commands/version.js';
import { registerInit } from './commands/init.js';
import { registerUpdate } from './commands/update.js';
import { registerStatus } from './commands/status.js';
import { registerAddEngine } from './commands/add-engine.js';
import { registerAddSkill } from './commands/add-skill.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_JSON = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8')
);

export async function run(argv) {
  const program = new Command();

  program
    .name('xp-stack')
    .description(PKG_JSON.description)
    .version(PKG_JSON.version, '-V, --version', 'imprime a versao instalada');

  registerVersion(program);
  registerInit(program);
  registerUpdate(program);
  registerStatus(program);
  registerAddEngine(program);
  registerAddSkill(program);
  // Future subcommands wire up here: resume, uninstall

  await program.parseAsync(argv);
}
