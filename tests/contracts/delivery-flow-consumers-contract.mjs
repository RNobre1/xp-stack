import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FLOW = resolve(ROOT, 'plugins/xp-stack/skills/akita-xp-rules/references/delivery-flow.md');
const consumers = [
  'plugins/xp-stack/agents/reviewer.md',
  'plugins/xp-stack/agents/research-critic.md',
  'plugins/xp-stack/skills/research-cycle/SKILL.md',
  'templates/opt-in-skills/code-review-automation/SKILL.md',
  'templates/opt-in-skills/code-review-automation/templates/review-pr.md.template',
  'templates/opt-in-skills/code-review-automation/templates/PR_TEMPLATE_self-review-section.md.template',
  'templates/opt-in-skills/code-review-automation/references/rationale.md',
];

const read = (relativePath) => readFileSync(resolve(ROOT, relativePath), 'utf8');

test('review consumers link to the canonical delivery flow', () => {
  for (const relativePath of consumers) {
    const absolutePath = resolve(ROOT, relativePath);
    const source = read(relativePath);
    const link = [...source.matchAll(/\[([^\]]*(?:delivery|flow)[^\]]*)\]\(([^)]+)\)/gi)]
      .find(([, , href]) => !/^[a-z]+:\/\//i.test(href));

    assert.ok(link, `${relativePath} should link to delivery-flow.md`);
    assert.equal(resolve(dirname(absolutePath), link[2]), FLOW, `${relativePath} link target`);
  }
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
