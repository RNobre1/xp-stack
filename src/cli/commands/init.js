import {
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectEngines, ENGINE_PATHS } from '../../lib/engines.js';
import { EMPTY_MANIFEST, readManifest, writeManifest } from '../../lib/manifest.js';
import { EMPTY_INDEX, readIndex, writeIndex } from '../../lib/index-tracker.js';
import { installFile } from '../../lib/installer.js';
import {
  scaffoldFile,
  scaffoldDir,
  scaffoldSymlink,
  injectGitignoreLine,
} from '../../lib/scaffold.js';
import { resolveEngines, getAllEngineChoices } from '../../lib/engine-resolver.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..', '..');
const PLUGIN_SOURCE_ROOT = join(PKG_ROOT, 'plugins', 'xp-stack');

const CORE_SKILLS = [
  'akita-xp-rules',
  'tdd-conventions',
  'task-decomposition',
  'research-cycle',
  'optimizing-github-actions',
];

const CORE_AGENTS = ['researcher.md', 'research-critic.md', 'tdd.md', 'reviewer.md'];

const HOOK_STOP_COMMAND = 'npx xp-stack hook-stop';

/**
 * Walk de um skill dir, retorna paths relativos (sem .gitkeep).
 */
function walkSkillFiles(skillDir) {
  const out = [];
  function walk(dir, base = '') {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      if (entry === '.gitkeep') continue;
      const full = join(dir, entry);
      const rel = base ? `${base}/${entry}` : entry;
      if (statSync(full).isDirectory()) walk(full, rel);
      else out.push(rel);
    }
  }
  walk(skillDir);
  return out;
}

/**
 * Injeta hook Stop em .claude/settings.json (idempotente).
 */
function injectHookStop(projectRoot) {
  const settingsPath = join(projectRoot, '.claude', 'settings.json');
  let settings = {};
  if (existsSync(settingsPath)) {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  }
  settings.hooks ??= {};
  settings.hooks.Stop ??= [];

  const alreadyPresent = settings.hooks.Stop.some((entry) =>
    entry.hooks?.some((h) => h.command === HOOK_STOP_COMMAND)
  );
  if (alreadyPresent) return;

  settings.hooks.Stop.push({
    matcher: '',
    hooks: [{ type: 'command', command: HOOK_STOP_COMMAND }],
  });

  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

/**
 * Prompt checkbox padrao via @inquirer/prompts. Marca pre-selecao = detected.
 * Lazy-import porque @inquirer/prompts e ESM e so deve ser carregado quando precisamos.
 */
async function defaultCheckboxPrompt(detected) {
  const { checkbox } = await import('@inquirer/prompts');
  const choices = getAllEngineChoices().map((c) => ({
    ...c,
    checked: detected.includes(c.value),
  }));
  return checkbox({
    message:
      'Quais engines de IA o projeto usa? (espaco pra marcar/desmarcar, enter pra confirmar)',
    choices,
    instructions: false,
  });
}

async function runInit(opts) {
  const projectRoot = resolve(opts.cwd ?? process.cwd());
  // Snapshot detected engines BEFORE scaffolds (init cria AGENTS.md symlink que
  // contaria como antigravity em re-detect; queremos a foto do estado real do projeto).
  const detectedAtStart = detectEngines(projectRoot);

  let resolved;
  try {
    resolved = await resolveEngines(opts, projectRoot, {
      detect: detectEngines,
      prompt: defaultCheckboxPrompt,
    });
  } catch (err) {
    // ExitPromptError: user pressed Ctrl-C in checkbox
    if (err?.name === 'ExitPromptError') {
      throw new Error('xp-stack init: cancelado pelo usuario.');
    }
    throw err;
  }
  const engines = resolved.engines;

  if (engines.length === 0) {
    if (resolved.mode === 'interactive') {
      throw new Error(
        'xp-stack init: nenhuma engine selecionada. Marque pelo menos uma engine no prompt (espaco) ou use --engine <csv>.'
      );
    }
    throw new Error(
      'xp-stack init: nenhuma engine detectada no projeto. ' +
      'Use --engine <nome[,nome...]> pra forcar (ex: --engine claude-code), ' +
      'ou rode sem --yes pra escolher interativamente.'
    );
  }

  const pkgJson = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));

  let manifest = readManifest(projectRoot) ?? EMPTY_MANIFEST(pkgJson.version);
  manifest.engines = engines;

  // 1. Skills core (dual mirror conforme engines)
  for (const skillName of CORE_SKILLS) {
    const skillSource = join(PLUGIN_SOURCE_ROOT, 'skills', skillName);
    if (!existsSync(skillSource)) continue;
    const files = walkSkillFiles(skillSource);
    for (const f of files) {
      for (const engine of engines) {
        const cfg = ENGINE_PATHS[engine];
        if (!cfg) continue;
        const destRel = join(cfg.skillsDir, skillName, f);
        const destPath = join(projectRoot, destRel);
        const result = installFile(join(skillSource, f), destPath);
        if (!result.skipped) {
          manifest.files[destRel] = {
            hash: result.hash,
            source: `plugins/xp-stack/skills/${skillName}/${f}`,
            user_modified: false,
          };
        }
      }
    }
  }

  // 2. Agents (claude-code only — formato Claude Code, outras engines TBD)
  if (engines.includes('claude-code')) {
    for (const agent of CORE_AGENTS) {
      const sourcePath = join(PLUGIN_SOURCE_ROOT, 'agents', agent);
      if (!existsSync(sourcePath)) continue;
      const destRel = join('.claude', 'agents', agent);
      const destPath = join(projectRoot, destRel);
      const result = installFile(sourcePath, destPath);
      if (!result.skipped) {
        manifest.files[destRel] = {
          hash: result.hash,
          source: `plugins/xp-stack/agents/${agent}`,
          user_modified: false,
        };
      }
    }
  }

  // 3. Scaffolds — CLAUDE.md
  const claudeMdResult = scaffoldFile(
    join(PLUGIN_SOURCE_ROOT, 'templates', 'CLAUDE.md.template'),
    join(projectRoot, 'CLAUDE.md')
  );
  if (!claudeMdResult.skipped) {
    manifest.files['CLAUDE.md'] = {
      hash: claudeMdResult.hash,
      source: 'plugins/xp-stack/templates/CLAUDE.md.template',
      user_modified: false,
    };
  }

  // 4. AGENTS.md symlink -> CLAUDE.md
  scaffoldSymlink('CLAUDE.md', join(projectRoot, 'AGENTS.md'));

  // 5. docs/tasks/_template/
  const tasksTplResult = scaffoldDir(
    join(PLUGIN_SOURCE_ROOT, 'templates', 'docs-tasks-template'),
    join(projectRoot, 'docs', 'tasks', '_template')
  );
  for (const entry of tasksTplResult.copied) {
    const destRel = entry.destPath.slice(projectRoot.length + 1);
    manifest.files[destRel] = {
      hash: entry.hash,
      source: 'plugins/xp-stack/templates/docs-tasks-template/...',
      user_modified: false,
    };
  }

  // 6. docs/pesquisas/_template/
  const pesquisasTplResult = scaffoldDir(
    join(PLUGIN_SOURCE_ROOT, 'templates', 'docs-pesquisas-template'),
    join(projectRoot, 'docs', 'pesquisas', '_template')
  );
  for (const entry of pesquisasTplResult.copied) {
    const destRel = entry.destPath.slice(projectRoot.length + 1);
    manifest.files[destRel] = {
      hash: entry.hash,
      source: 'plugins/xp-stack/templates/docs-pesquisas-template/...',
      user_modified: false,
    };
  }

  // 7. .claude/settings.json (so se claude-code engine, pra evitar criar dir desnecessario)
  if (engines.includes('claude-code')) {
    const settingsResult = scaffoldFile(
      join(PLUGIN_SOURCE_ROOT, 'templates', 'claude-settings-project.json'),
      join(projectRoot, '.claude', 'settings.json')
    );
    if (!settingsResult.skipped) {
      manifest.files['.claude/settings.json'] = {
        hash: settingsResult.hash,
        source: 'plugins/xp-stack/templates/claude-settings-project.json',
        user_modified: false,
      };
    }
  }

  // 8. .gitignore
  injectGitignoreLine('.xp-stack/state/', projectRoot);

  // 9. Manifest + index
  writeManifest(projectRoot, manifest);
  let index = readIndex(projectRoot) ?? EMPTY_INDEX();
  index.engines_installed = engines;
  writeIndex(projectRoot, index);

  // 10. Optional Stop hook
  if (opts.withHooks && engines.includes('claude-code')) {
    injectHookStop(projectRoot);
    console.log('Hook Stop injetado em .claude/settings.json (call: npx xp-stack hook-stop)');
  }

  // 11. Multi-engine warning (usa snapshot pre-scaffold; AGENTS.md symlink que init
  // acabou de criar nao deve disparar warn de antigravity).
  if (!opts.engine && detectedAtStart.length >= 2) {
    console.log(
      `xp-stack init: WARN — multiplas engines detectadas (${detectedAtStart.join(', ')}). Pra evitar instalacao em todas, use --engine <csv> pra forcar lista explicita.`
    );
  }

  // 12. Summary
  console.log(`xp-stack v${pkgJson.version} instalado em ${projectRoot}`);
  console.log(`Engines: ${engines.join(', ')}`);
  console.log(`Manifest: ${Object.keys(manifest.files).length} files trackeados`);
  console.log(`Skills core: ${CORE_SKILLS.length} (${CORE_SKILLS.join(', ')})`);
  if (engines.includes('claude-code')) {
    console.log(`Agents: ${CORE_AGENTS.length} em .claude/agents/`);
  }
  console.log(
    `Scaffolded: CLAUDE.md, AGENTS.md (symlink), docs/tasks/_template/, docs/pesquisas/_template/${
      engines.includes('claude-code') ? ', .claude/settings.json' : ''
    }, .gitignore`
  );
}

export function registerInit(program) {
  program
    .command('init')
    .description(
      'Inicializa xp-stack no projeto: detect engines + 5 skills core + 4 agents + CLAUDE.md + AGENTS.md (symlink) + docs templates + .claude/settings.json + .gitignore'
    )
    .option('--cwd <path>', 'project root (default: process.cwd())')
    .option('--engine <names>', 'forca engines (csv): claude-code,codex,cursor,...')
    .option('--no-dual-mirror', 'desabilita dual mirror automatico (so engines detectadas)')
    .option('--yes', 'pula prompts interativos: usa engines detectadas + dual mirror (CI/non-TTY behavior)')
    .option('--with-hooks', 'injeta hook Stop em .claude/settings.json (so se claude-code engine presente)')
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
