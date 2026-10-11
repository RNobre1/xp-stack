---
name: jev-triage
description: Use when a coordinator explicitly selects one synthetic failure case for optional, non-authoritative shadow triage after deterministic checks remain ambiguous.
disable-model-invocation: true
---

# Jev Shadow Triage

Use only when explicitly invoked for one selected synthetic case. This is an advisory sidecar; it is not a test, gate, queue, authorization, or root-cause mechanism.

The `disable-model-invocation: true` metadata keeps this capability manual-only. In the xp-stack plugin, invoke `/xp-stack:jev-triage`; for a versioned copy, invoke the skill by the name registered by its host. Resolve the script as a sibling of the `SKILL.md` that supplied this instruction. Do not assume the current directory is the xp-stack source checkout.

## Input and boundary

- Select exactly one JSON case with `--case`. The schema requires `synthetic: true` and codes from `SYMPTOM_CODES` in `jev_triage.py`.
- The pilot accepts no free text, logs, stdout, crash reports, transcripts, paths, identifiers from people, or extra fields. Do not scan a repository or infer a case from a run. Sanitized free-form input is not supported.
- The exporter sends only the fixed synthetic marker plus code/description pairs generated from that allowlist. The local `case_id` never leaves the host.

## Run

Set `SKILL_DIR` to the directory containing the loaded `SKILL.md`, then run:

```sh
python3 "$SKILL_DIR/jev_triage.py" \
  --case /absolute/path/to/one-synthetic-case.json \
  --suggestion-out /absolute/path/outside-checkout/case.jev-suggestion.json \
  --config /absolute/path/to/explicit-budget.json
```

`--suggestion-out` is required, must be a new file outside the checkout, and is written atomically with mode `0600`. The result is not printed to stdout and no runner reads this file. Do not pipe it into tests, queues, or gates.

`--config` is explicit and optional. Jev is considered only when local rules are ambiguous, `TYPESAFE_API_KEY` is set, and the coordinator-assigned monthly budget config is valid. No other environment variable, dotenv file, credential store, or config default is searched. The request is pinned to `jev-1.13.0`; no package is installed and the tool has no billing or auto-recharge integration.

No key/config, exhausted or mismatched budget, HTTP rejection, timeout, invalid response, or uncertain request produces an `inconclusive` sidecar. No test status, queue, authorization, or application state is changed. A reserved or uncertain case ID is suppressed for the month; never rerun it to retry an uncertain call.

Read [README.md](README.md) for the local schema, budget and ledger behavior, and evaluation limits.
