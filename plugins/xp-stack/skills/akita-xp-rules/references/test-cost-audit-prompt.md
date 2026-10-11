# Reusable prompt — audit test cost and value

Use with [`test-cost-audit.md`](test-cost-audit.md), revision `2026-10-11.1`.

```text
Audit the cost and value of this test selection. Follow the linked test-cost-audit protocol as the single source for the inventory and proof criteria.

Scope supplied by the coordinator:
- Base, candidate, worktree, and diff:
- Selected tests/commands and available logs/timings:
- Runtime, tool, and fixture environment:
- Requirements, known incidents, and applicable project/security gates:
- Authorization/capacity for focused probes:

Perform the inventory before suggesting simplifications. Separate observations from estimates and preserve intentional test dimensions. Do not optimize toward a count or remove, edit, skip, or disable tests. For every possible cut, identify an equivalent surviving oracle and focused counterproof; if either is missing, mark the proposal inconclusive. Keep the safety families named by the protocol.

Return the inventory, observed cost, risk/oracle coverage, overlap classification, no-change or proposed outcome, proof/results, required review, and remaining gaps. The report is not permission to alter the suite; any accepted delta is a separate TDD change with independent review.
```
