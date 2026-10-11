import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(TEST_DIR, '../..');
const SKILLS = resolve(ROOT, 'plugins/xp-stack/skills');
const TEMPLATES = resolve(ROOT, 'plugins/xp-stack/templates');
const REFERENCES = resolve(SKILLS, 'akita-xp-rules/references');

const paths = {
  flow: resolve(REFERENCES, 'delivery-flow.md'),
  audit: resolve(REFERENCES, 'test-cost-audit.md'),
  prompt: resolve(REFERENCES, 'test-cost-audit-prompt.md'),
  tasksManifestTemplate: resolve(TEMPLATES, 'docs-tasks-template/TEMPLATE-tasks.json'),
  akita: resolve(SKILLS, 'akita-xp-rules/SKILL.md'),
  tdd: resolve(SKILLS, 'tdd-conventions/SKILL.md'),
  decomposition: resolve(SKILLS, 'task-decomposition/SKILL.md'),
  claudeTemplate: resolve(TEMPLATES, 'CLAUDE.md.template'),
  templatesReadme: resolve(TEMPLATES, 'docs-tasks-template/README.md'),
  overviewTemplate: resolve(TEMPLATES, 'docs-tasks-template/TEMPLATE-overview.md'),
  progressTemplate: resolve(TEMPLATES, 'docs-tasks-template/TEMPLATE-progress.md'),
  taskTemplate: resolve(TEMPLATES, 'docs-tasks-template/TEMPLATE-task.md'),
  orchestratorTemplate: resolve(TEMPLATES, 'docs-tasks-template/TEMPLATE-orchestrator-prompt.md'),
};

const read = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '');

test('the canonical flow and audit protocol are present and referenced by consumers', () => {
  for (const reference of [paths.flow, paths.audit, paths.prompt]) {
    assert.ok(existsSync(reference), `${reference} should exist`);
  }

  const consumers = [
    paths.akita,
    paths.tdd,
    paths.decomposition,
    paths.claudeTemplate,
    paths.templatesReadme,
    paths.overviewTemplate,
    paths.progressTemplate,
    paths.taskTemplate,
    paths.orchestratorTemplate,
  ];
  for (const path of consumers) {
    assert.match(read(path), /delivery-flow\.md/, `${path} should point to the shared flow`);
  }
  assert.match(read(paths.prompt), /test-cost-audit\.md/);
});

test('task status has one authority and the essential level does not create state.json', () => {
  const flow = read(paths.flow);
  const decomposition = read(paths.decomposition);
  const taskTemplate = read(paths.taskTemplate);
  const progressTemplate = read(paths.progressTemplate);
  const manifestTemplate = read(paths.tasksManifestTemplate);

  assert.ok(
    !/Salve a escolha em `state\.json`/i.test(decomposition),
    'document level should not be persisted as a competing state.json source',
  );
  assert.match(flow, /tasks\.json/);
  assert.match(flow, /ticket/i);
  assert.match(flow, /derived|derivad/i);
  assert.doesNotMatch(taskTemplate, /\*\*Status:\*\*\s*`?\[\s*\]/i);
  assert.match(taskTemplate, /tasks\.json/);
  assert.match(progressTemplate, /snapshot|derived|derivad/i);
  assert.ok(existsSync(paths.tasksManifestTemplate));
  const manifest = JSON.parse(manifestTemplate);
  assert.deepEqual(Object.keys(manifest).sort(), ['feature', 'schema_version', 'tasks']);
  assert.equal(manifest.schema_version, '1.0');
  assert.ok(manifest.feature.length > 0);
  assert.deepEqual(manifest.tasks, []);
});

test('status authority distinguishes Traycer, Autonomia, new docs tasks, and existing tools', () => {
  const flow = read(paths.flow);
  const templatesReadme = read(paths.templatesReadme);
  const taskTemplate = read(paths.taskTemplate);

  assert.match(flow, /Without an active Autonomia controller.*ticket.*sole source/i);
  assert.match(flow, /Traycer with an active Autonomia controller.*controller.*source.*ticket points to/i);
  assert.match(flow, /new `docs\/tasks` flow.*tasks\.json/i);
  assert.match(flow, /existing project task-status tool.*preserve/i);
  assert.match(flow, /For a new `docs\/tasks` flow without an existing status tool, essential contains `tasks\.json`/i);
  assert.match(flow, /If a current tool already owns status, link to it instead of adding `tasks\.json`/i);
  assert.match(templatesReadme, /existing status tool/i);
  assert.doesNotMatch(templatesReadme, /tasks\.json outside Traycer, or the single active ticket/i);
  assert.doesNotMatch(templatesReadme, /Outside Traycer, copy and edit the `tasks\.json` manifest/i);
  assert.doesNotMatch(taskTemplate, /id from tasks\.json or active ticket/i);
  assert.match(taskTemplate, /id from the task-status authority/i);
  assert.match(taskTemplate, /existing project tool/);
});

test('pause and compaction do not override a separately authorized lifecycle procedure', () => {
  const flow = read(paths.flow);

  assert.match(flow, /do not by themselves authorize.*cleanup/i);
  assert.match(flow, /separately authorized lifecycle procedure/i);
});

test('stage evidence reuse names its inputs, environment, and delta proof', () => {
  const flow = read(paths.flow);

  assert.match(flow, /manifest/i);
  assert.match(flow, /environment|ambiente/i);
  assert.match(flow, /delta/i);
  assert.match(flow, /sem manifesto|without a manifest/i);
});

test('stage reuse is an extension of the shared evidence contract under one rollout revision', () => {
  const flow = read(paths.flow);
  const akita = read(paths.akita);
  const portableConsumers = [
    flow,
    akita,
    read(paths.tdd),
    read(paths.decomposition),
    read(paths.claudeTemplate),
    read(paths.templatesReadme),
    read(paths.overviewTemplate),
    read(paths.progressTemplate),
    read(paths.taskTemplate),
    read(paths.orchestratorTemplate),
  ];

  assert.match(akita, /Contract reference:.*2026-10-11\.1/);
  assert.match(flow, /Revision:.*2026-10-11\.1/);
  assert.match(akita, /Stage reuse/);
  assert.match(akita, /input manifest.*environment.*delta/i);
  assert.match(read(paths.taskTemplate), /Contract revision:.*2026-10-11\.1/);
  assert.match(read(paths.orchestratorTemplate), /Contract revision: 2026-10-11\.1/);
  assert.match(read(paths.overviewTemplate), /Evidence-contract source\/revision:.*2026-10-11\.1/);
  for (const source of portableConsumers) {
    assert.match(source, /2026-10-11\.1/);
    assert.doesNotMatch(source, /delivery-flow\/1\.0|2026-09-15\.1/);
  }
});

test('template examples respect the default batch and avoid branch-per-task guidance', () => {
  const overview = read(paths.overviewTemplate);

  assert.doesNotMatch(overview, /Branch: feat\/\{\{feature-slug\}\}-T\{N\}/);
  assert.doesNotMatch(overview, /\| 2 \| \{\{T3 \+ T4 \+ T5\}\} \|/);
});

test('task templates point to the canonical flow instead of duplicating a phase checklist', () => {
  const taskTemplate = read(paths.taskTemplate);
  const decomposition = read(paths.decomposition);
  const claudeTemplate = read(paths.claudeTemplate);

  assert.doesNotMatch(taskTemplate, /### Phase [1-4]/);
  assert.doesNotMatch(decomposition, /Execution order with TDD[^\n]*Phase 1/);
  assert.doesNotMatch(decomposition, /Execute TDD phases in order/);
  assert.doesNotMatch(claudeTemplate, /One task at a time/);
});

test('review routing follows explicit policy without model-name shortcuts', () => {
  const portableDocs = [
    paths.flow,
    paths.akita,
    paths.audit,
    paths.prompt,
    paths.tdd,
    paths.decomposition,
    paths.claudeTemplate,
    paths.templatesReadme,
    paths.overviewTemplate,
    paths.progressTemplate,
    paths.taskTemplate,
    paths.orchestratorTemplate,
  ].map(read).join('\n');

  assert.ok(
    !/\b(?:Opus|Sonnet)(?:\s+\d+(?:\.\d+)?)?\b/i.test(portableDocs),
    'portable contracts/templates should leave named model selection to AgentSelection',
  );
  assert.match(read(paths.flow), /identity|identidade/i);
  assert.match(read(paths.flow), /Pilot/i);
  assert.match(read(paths.flow), /counterproof|contraprova/i);
  assert.match(read(paths.flow), /optional triage/i);
  assert.match(read(paths.flow), /confirmed.*inconclusive.*out-of-scope/i);
  assert.match(read(paths.flow), /does not edit, publish, or approve/i);
});

test('test-cost audit protects oracle value, intentional dimensions, and historical risks', () => {
  const audit = read(paths.audit);
  const prompt = read(paths.prompt);

  assert.match(audit, /inventory|invent[aá]rio/i);
  assert.match(audit, /duration|tempo/i);
  assert.match(audit, /risk|risco/i);
  assert.match(audit, /oracle|or[aá]culo/i);
  assert.match(audit, /mutation|muta[cç][aã]o/i);
  assert.match(audit, /transaction|transa[cç][aã]o/i);
  assert.match(audit, /rollback/i);
  assert.match(audit, /concurrency|concorr[eê]ncia/i);
  assert.match(audit, /historical|hist[oó]ric/i);
  assert.match(audit, /browser|navegador/i);
  assert.match(audit, /scene|cena|parameter|parametr/i);
  assert.match(audit, /sets no target count|no test-count target|sem meta de quantidade/i);
  assert.ok(!/target (?:of|at) \d+ tests?/i.test(audit), 'the protocol must not assign a fixed test-count target');
  assert.match(prompt, /test-cost-audit\.md/);
  assert.match(prompt, /Do not optimize toward a count or remove/i);
});
