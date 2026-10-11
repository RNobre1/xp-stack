import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FLOW = resolve(ROOT, 'plugins/xp-stack/skills/akita-xp-rules/references/delivery-flow.md');
const repoConsumers = [
  'plugins/xp-stack/agents/reviewer.md',
  'plugins/xp-stack/agents/research-critic.md',
  'plugins/xp-stack/skills/research-cycle/SKILL.md',
];
const installedConsumers = [
  'templates/opt-in-skills/code-review-automation/SKILL.md',
  'templates/opt-in-skills/code-review-automation/templates/review-pr.md.template',
  'templates/opt-in-skills/code-review-automation/templates/PR_TEMPLATE_self-review-section.md.template',
  'templates/opt-in-skills/code-review-automation/references/rationale.md',
];
const consumers = [...repoConsumers, ...installedConsumers];

const read = (relativePath) => readFileSync(resolve(ROOT, relativePath), 'utf8');

test('repo-local review consumers link to the canonical delivery flow', () => {
  for (const relativePath of repoConsumers) {
    const absolutePath = resolve(ROOT, relativePath);
    const source = read(relativePath);
    const link = [...source.matchAll(/\[([^\]]*(?:delivery|flow)[^\]]*)\]\(([^)]+)\)/gi)]
      .find(([, , href]) => !/^[a-z]+:\/\//i.test(href));

    assert.ok(link, `${relativePath} should link to delivery-flow.md`);
    assert.equal(resolve(dirname(absolutePath), link[2]), FLOW, `${relativePath} link target`);
  }
});

test('installed review artifacts use the canonical source name and revision, not checkout links', () => {
  for (const relativePath of installedConsumers) {
    const source = read(relativePath).replace(/\s+/g, ' ');
    assert.ok(/akita-xp-rules/i.test(source), `${relativePath} should name akita-xp-rules`);
    assert.ok(/Delivery flow/i.test(source), `${relativePath} should name the delivery flow`);
    assert.ok(/2026-10-11\.1/.test(source), `${relativePath} should record the canonical revision`);
    assert.ok(/(?:path|URI).{0,60}(?:environment|harness)|(?:environment|harness).{0,60}(?:path|URI)/i.test(source), `${relativePath} should direct source resolution through the environment/harness`);
    assert.ok(
      !/\.\.\/(?:\.\.\/)*plugins\/xp-stack\/skills\/akita-xp-rules\/references\/delivery-flow\.md/.test(source),
      `${relativePath} must not include an unusable source-checkout link`,
    );
  }

  for (const relativePath of [installedConsumers[0], installedConsumers[1]]) {
    assert.ok(/resolve the source path or URI supplied by the current environment\/harness/i.test(read(relativePath)), `${relativePath} should use the harness-supplied source path`);
  }
});

test('review command gives workers without a loader the literal canonical excerpt', () => {
  const source = read('templates/opt-in-skills/code-review-automation/templates/review-pr.md.template')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ');

  assert.ok(
    /A worker without a skill loader receives the exact canonical excerpt from the resolved Delivery evidence contract source, including its reference and revision/i.test(source),
    'loaderless workers must receive the canonical excerpt with provenance',
  );
  assert.ok(
    !/A worker without a skill loader receives pointers to those canonical sources, not a copied policy/i.test(source),
    'a bare pointer is not a loaderless handoff',
  );
});

test('operational review consumers defer identity and model rules to the canonical flow', () => {
  const operationalConsumers = consumers.filter((path) => !path.endsWith('/rationale.md'));

  for (const relativePath of operationalConsumers) {
    const source = read(relativePath);
    assert.ok(!/They must both differ\.|Both must differ\./i.test(source), `${relativePath} still requires distinct models`);
    assert.ok(!/identities and models must both differ/i.test(source), `${relativePath} still requires distinct models`);
    assert.ok(!/distinct reviewer and model/i.test(source), `${relativePath} still requires a distinct model`);
  }
});

test('review reminders do not present author self-inspection as final approval', () => {
  const reviewCommand = read('templates/opt-in-skills/code-review-automation/templates/review-pr.md.template');
  const reviewSkill = read('templates/opt-in-skills/code-review-automation/SKILL.md');
  const prTemplate = read('templates/opt-in-skills/code-review-automation/templates/PR_TEMPLATE_self-review-section.md.template');
  const hook = read('templates/opt-in-skills/code-review-automation/templates/pre-tool-use-pr-reminder.sh.template');
  const installer = read('templates/opt-in-skills/code-review-automation/scripts/setup-code-review-automation.sh');

  assert.ok(/self-inspection prepares the handoff/i.test(reviewCommand), 'review command should identify self-inspection as preparation');
  assert.ok(/does not replace an\s+independent final review/i.test(reviewCommand), 'self-inspection should not stand in for required final review');
  assert.ok(/self-inspection is never approval/i.test(reviewSkill), 'skill should not present author self-inspection as approval');
  assert.ok(/describes only the current pass and does not approve the candidate by itself/i.test(reviewCommand), 'a no-blockers result should describe only the current pass');
  assert.ok(/not approval/i.test(prTemplate), 'PR template should say evidence is not approval by itself');
  assert.ok(!/Orchestrator self-review estruturado/i.test(hook), 'hook should remind the selected review lane');
  assert.ok(!/Pilot decides merge|orchestrator does NOT self-merge/i.test(installer), 'installer should not fix the integration actor');
});
