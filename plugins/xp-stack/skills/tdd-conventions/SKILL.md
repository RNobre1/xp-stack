---
name: tdd-conventions
description: Use when selecting applicable test layers or following TDD for a functional increment. Covers unit, integration, E2E, contract, regression, performance, and security checks; read the project's CLAUDE.md for stack-specific configuration.
---

> **For environments without skill loading:** read and follow this file as the operating reference. A loader may prefix the skill name; resolve links relative to this file.

**Delivery flow:** [`../akita-xp-rules/references/delivery-flow.md`](../akita-xp-rules/references/delivery-flow.md), revision `2026-10-11.1`. Use it for increment boundaries, stage ordering, and evidence reuse; this skill selects test layers.

# TDD Conventions

## Test Pyramid (Bottom to Top)

Choose the layers that exercise the increment's behavior and risk. Unit coverage remains the default for pure business logic; the other layers below are applicable when their trigger is present. Record why a layer was omitted or deferred instead of treating the whole pyramid as a per-edit checklist.

1. **Unit Tests** — Test functions, methods, and classes in isolation. Must be fast, deterministic, and free of external dependencies (use mocks/stubs). Cover business rules according to their risk; do not optimize toward a test-count target.

2. **Integration Tests** (when modules, services, databases, queues, or internal APIs interact) — Validate those boundaries against real or containerized dependencies, not only mocks.

3. **End-to-End (E2E) Tests** (when a critical user or consumer flow changes) — Simulate the complete path from input to final response, including the main error scenario.

4. **Contract Tests** (when services or external APIs communicate) — Validate that schemas and request/response formats are respected by both parties. Use recorded fixtures (VCR pattern) when appropriate.

5. **Regression Tests** — Every fixed bug must generate a test that reproduces the failure scenario BEFORE the fix, ensuring the defect doesn't return.

6. **Performance/Load Tests** (when an endpoint or operation is critical or high-volume) — Include a focused benchmark or load test.

7. **Security Tests (SAST/DAST)** (when the change affects an exposed boundary, secrets, permissions, or deployment) — Run the static and dynamic checks required by the project's security policy.

## Mandatory TDD Flow

1. **RED** — Write the test first. It must fail for the right reason (missing behavior, not syntax/configuration). Record the command, tree or commit exercised, exit code, and log. If the failure is reproduced after the fact, label it as a reproduction; never invent a historical RED.
2. **GREEN** — Write the minimum production code to make the test pass.
3. **REFACTOR** — With tests passing, clean up. Tests must still pass after refactoring.

4. **VERIFY** — Run the focused tests and other guards applicable to the increment. Run the full suite at the integration/release boundary or when the project policy requires it; capture output before claiming completion.

Run supported type/static-contract checks before an expensive integration or browser stage when they can catch the same failure sooner. Mutation checks are focused contraproofs for risky assertions or proposed test reductions, not a fixed quota or per-edit campaign. Before removing or merging tests, follow [`../akita-xp-rules/references/test-cost-audit.md`](../akita-xp-rules/references/test-cost-audit.md).

## CI/CD Integration

Integrate each applicable layer into CI/CD at the boundary where the project requires it:
- Required linters, formatters, tests, and security checks remain mandatory gates
- Push/PR and protected-branch coverage follow the project's stack and risk policy
- A skipped or unavailable required check is reported as a limitation or blocker, not silently marked green
- Block integration or merge when a required check fails or coverage drops below the defined threshold

## Universal Patterns

- **Input validation before config check:** Validate user input (return 400) before checking if external services are configured (return 500). This prevents masking user errors with infrastructure errors.
- **Centralized mocks:** Keep shared mocks in a dedicated directory. Use factories instead of copying mocks.
- **External APIs always mocked** in unit/integration tests. Use VCR/contract tests to validate real formats.
- **Debt and warnings:** Follow the project's and current session's debt policy. Do not authorize new debt by default; record any exception, owner, and next step. Record alerts, warnings, and small problems when they are found instead of silently treating an unverified warning as harmless.
- **Centralized configs:** Constants scattered across components must be centralized. Adding a new option should require editing only ONE file.
