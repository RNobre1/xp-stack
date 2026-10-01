---
name: durable-host-runs
description: Submit, inspect, follow, and cancel a specifically identified command in a transient systemd user unit, preserving its logs and exit receipt after the client exits.
disable-model-invocation: true
---

# Durable Host Runs

Use this skill only after the Pilot explicitly asks to run a command through the existing VPS queue. It requires Linux, Python 3, `systemd-run`, and an available systemd user manager. It starts one transient unit for the supplied command; it does not allocate slots or change the behavior of the existing queue scripts.

## Install to a versioned personal prefix

On the target Linux account, copy the complete skill into a new versioned personal skill directory. Do not overwrite a prior version:

```bash
install_dir="$HOME/.claude/skills/durable-host-runs-v0.1.0"
mkdir -p "$install_dir"
cp -a plugins/xp-stack/skills/durable-host-runs/. "$install_dir/"
```

Invoke the installed version explicitly as `/durable-host-runs-v0.1.0`. For rollback, stop invoking that directory and use the previous versioned skill directory, for example `/durable-host-runs-v0.0.9`. Keep a version directory while any unit started from its `durable_run.py` may still be active; the worker starts from that path. This repository task does not perform the installation.

## Submit a command

Choose a stable `--key` for the candidate and operation, and supply a stable `--candidate` identity such as `commit:<full-sha>`. The key, candidate, canonical cwd, and each argv element form the immutable request identity. Repeating an identical request returns the existing job. Reusing its key with a different candidate, cwd, or argv is refused.

Set `runner` to the installed script path or use the active skill's script path, then pass the command as an argv vector after `--`:

```bash
runner="$HOME/.claude/skills/durable-host-runs-v0.1.0/scripts/durable_run.py"
python3 "$runner" submit \
  --key "commit:<full-sha>:tests:unit" \
  --candidate "commit:<full-sha>" \
  --cwd "/path/to/checkout" \
  -- "$HOME/.traycer/locks/vaga-teste.sh" /usr/bin/printf '%s\n' 'job output'
```

Substitute the example argv with the exact test command for the candidate.

For the existing TypeScript queue, invoke its script with no arguments:

```bash
python3 "$runner" submit \
  --key "commit:<full-sha>:tsc" \
  --candidate "commit:<full-sha>" \
  --cwd "/path/to/checkout" \
  -- "$HOME/.traycer/locks/vaga-tsc.sh"
```

The utility does not wrap argv in a shell or alter either queue script. Commands that resolve their executable through `PATH` must be available in the systemd user manager's environment; use an absolute executable path when needed. The default private state directory is `$XDG_STATE_HOME/xp-stack/durable-host-runs`, or `~/.local/state/xp-stack/durable-host-runs` when `XDG_STATE_HOME` is unset.

## Inspect and follow

```bash
python3 "$runner" status --key "commit:<full-sha>:tests:unit"
python3 "$runner" follow --key "commit:<full-sha>:tests:unit"
```

`status` reports `starting`, `running`, `stopping`, `completed`, `failed`, `cancelled`, `unknown`, or `not_found`, plus the final exit code when known and paths to the immutable request, event stream, command log, and final receipt. `follow` prints persisted lifecycle events as they arrive. The command's combined stdout/stderr is stored in `command.log` at the reported path. `unknown` is inconclusive: do not submit another key or treat it as an available queue slot. Reconcile the same key with the supervisor before proceeding.

## Cancel one identified job

```bash
python3 "$runner" cancel --key "commit:<full-sha>:tests:unit"
```

Cancellation resolves the unit from that key's private registration, asks the user systemd manager to stop that unit, and reports `confirmed: true` only after `systemctl --user show` confirms a terminal unit state. If the supervisor remains active or its state is unavailable, the result remains unconfirmed; check `status` again before acting. A completed job is not stopped or rewritten.

The registration and receipt are read-only files; directories and mutable event/log files are private to the account. Nothing removes logs, records, receipts, worktrees, or installed skill versions automatically. A transient user unit survives the submitting chat/client process while its systemd user manager remains available; this tool does not configure lingering, reboot recovery, or host recovery.
