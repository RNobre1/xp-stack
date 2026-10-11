# Test cost/value audit

**Applies with:** [`delivery-flow.md`](delivery-flow.md), revision `2026-10-11.1`.

This protocol evaluates whether a test investment is useful and whether a proposed simplification preserves the evidence it provides. It sets no target count, coverage percentage, or desired removal rate. The report is analysis; it does not authorize edits or deletions.

## Inventory before proposing cuts

Use the same base/candidate, selected test scope, and environment whenever comparing duration. For each test or coherent group, record:

| Field | What to inspect |
|---|---|
| Purpose and risk | Requirement, failure mode, user/consumer boundary, and severity if it regresses |
| Oracle | What assertion distinguishes correct behavior from the concrete faulty behavior |
| Inputs and dimensions | Fixtures, parameters, browsers, scenes, platforms, shards, setup, and cleanup |
| Cost | Observed duration/wall time and source/run, plus whether setup, queueing, or external waits are included |
| Boundaries | State, data, cache, ports, transactions, permissions, services, and isolation involved |
| Overlap | Tests that cover the same requirement, oracle, inputs, and boundary; cite evidence rather than similar names |
| History | Known incidents, regressions, and constraints this test protects |

Distinguish accidental duplication from intentional dimensions. Two assertions with similar text can exercise different permissions, state transitions, browsers, scenes, or rollback paths. Parameterized cases and parallel shards may be intentionally different even when they call the same test function. Preserve distinct cases unless their behavior and oracle are proven equivalent.

## Evaluate value without a count target

Compare observed runtime with the risk prevented, the quality of the oracle, setup/flakiness, maintenance burden, and overlap. Label estimates as estimates. Do not treat a smaller suite or shorter duration as success by itself, and do not infer a test is redundant because another test passes.

Prefer a focused substitution when a test is costly or weak: retain the relevant requirement and boundary while improving the oracle, isolation, or execution. Keep required project/security gates and tests for authorization, transactions, rollback, concurrency, and historical bugs. A low-risk documentation change does not justify pruning unrelated tests.

## Proof required for a removal or merge proposal

For every candidate removal or merge, identify the replacement before deleting anything:

1. Map each removed assertion to the requirement, failure mode, inputs, and boundary it covered.
2. Name the surviving/replacement test that covers each item, and explain equivalence from the consumer-visible contract.
3. Construct focused faulty behaviors (mutants or equivalent adversarial counterexamples) for the risks the old tests caught. Prove the surviving/replacement tests fail on each one for the intended assertion, not setup or configuration failure.
4. Preserve distinct browser/scene/parameter/platform cases and shared-state/rollback/concurrency checks unless each dimension has its own equivalence proof.
5. Request independent review of the changed test selection and counterproof. Review the changed delta; consolidate against the base after repeated deltas or when a shared invariant changes.

If the equivalence or counterproof is unavailable, mark the proposal inconclusive and keep the test. The audit never silently edits, removes, skips, or weakens a test. Any accepted removal is a separate scoped change with the normal TDD, authorization, and review flow.

## Report shape

Report the tested base/candidate and environment, selected tests and observed timing source, risk/oracle inventory, accidental versus intentional overlap, and proposed changes. For each proposed removal, include replacement mapping, focused counterexample/mutation command and result, reviewer decision, and remaining limitation. Separate measured facts from inference; no recommendation may depend only on test counts.
