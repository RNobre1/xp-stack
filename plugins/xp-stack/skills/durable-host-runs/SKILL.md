---
name: durable-host-runs
description: Submit, inspect, follow, and cancel a specifically identified command in a transient systemd user unit, preserving its logs and exit receipt after the client exits.
disable-model-invocation: true
---

# Durable Host Runs

Use this skill only after the Pilot explicitly asks to run a command through the existing VPS queue. It requires Linux, Python 3, `systemctl`, `systemd-run`, and an available systemd user manager. A successful preflight happens before any request is recorded; a preflight failure leaves the stable key available for a safe retry. It starts one transient unit for the supplied command; it does not allocate slots or change the behavior of the existing queue scripts.

When invoked from the plugin, the slash command is `/xp-stack:durable-host-runs`. The plugin and manual versioned copy are the supported distribution paths; the npm CLI installer does not install or register this skill.

## Install to a versioned personal prefix

On the target Linux account, copy the complete skill into a versioned personal prefix. Do not overwrite a prior version:

```bash
install_dir="$HOME/.local/share/xp-stack/durable-host-runs/v0.1.0"
mkdir -p "$install_dir"
cp -a plugins/xp-stack/skills/durable-host-runs/. "$install_dir/"
```

Invoke the skill from the plugin as `/xp-stack:durable-host-runs`; the slash name stays `durable-host-runs` for every version. The versioned prefix pins the worker code used by a unit; set `runner` to that version's `scripts/durable_run.py`. For rollback, set `runner` to an earlier prefix, for example `v0.0.9`. Keep every version directory while any unit started from its `durable_run.py` may still be active. The user systemd manager must remain available for a job to survive the client's exit. To survive closing the last login session, check `loginctl show-user "$USER" -p Linger`; lingering must already be enabled. This skill never changes lingering. This repository task does not perform the installation.

## Submit a command

Choose a stable `--key` for the candidate and operation, and supply a stable `--candidate` identity such as `commit:<full-sha>`. The key, candidate, canonical cwd, and each argv element form the immutable request identity. Repeating an identical request returns the existing job. Reusing its key with a different candidate, cwd, or argv is refused.

Set `runner` to the installed script path or use the active skill's script path, then pass the command as an argv vector after `--`:

```bash
runner="$HOME/.local/share/xp-stack/durable-host-runs/v0.1.0/scripts/durable_run.py"
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

The utility does not wrap argv in a shell or alter either queue script. Commands that resolve their executable through `PATH` must be available in the systemd user manager's environment; use an absolute executable path when needed. The private registry always lives under the account's passwd home at `~/.local/state/xp-stack/durable-host-runs`; shell `HOME`/`XDG_STATE_HOME` overrides do not create a second registry for the same user.

## Inspect and follow

```bash
python3 "$runner" status --key "commit:<full-sha>:tests:unit"
python3 "$runner" follow --key "commit:<full-sha>:tests:unit"
```

`status` reports `starting`, `running`, `stopping`, `completed`, `failed`, `cancelled`, `unknown`, or `not_found`, plus the command exit code when known, `supervisor_terminal`, and paths to the immutable request, event stream, command log, and receipt. A worker receipt by itself does not prove the whole systemd unit's process tree has ended: while the unit is active, status remains `stopping` and `supervisor_terminal` is false. Only act on the queue slot after the supervisor reports the unit terminal or confirms it has unloaded after execution. If the tree is confirmed but no useful exit code survived, status remains `unknown`, `supervisor_terminal` is true, and no null receipt is sealed. A worker exception is recorded as `worker_failed` with exit code 70; the status becomes final only after the supervisor confirms the unit ended. `follow` drains lifecycle events, prints a final `follow_finished` event, and exits nonzero (6) with `state: unknown` when the supervisor cannot establish the result; it does not keep polling that unknown state. The command's combined stdout/stderr is stored in `command.log` at the reported path.

If preflight fails before registration, retry with the same key after the user manager is available. If a request is already registered and its state is `unknown`, preserve it and inspect its unit, event stream, command log, and journal. A different explicit key is allowed only after authoritative supervisor evidence that the earlier unit never ran or its process tree is terminal; elapsed time alone is not evidence. Nothing removes the old record.

## Cancel one identified job

```bash
python3 "$runner" cancel --key "commit:<full-sha>:tests:unit"
```

Cancellation first writes a private durable intent, then resolves the unit from that key's registration and asks the user systemd manager to stop that unit. The worker labels SIGTERM as `cancelled` only when that intent exists; unrelated signals are recorded as `signal` failures. Cancellation reports `confirmed: true` only after the synchronous stop or a follow-up supervisor query confirms termination. If the command finishes naturally during cancellation, the result is reread from its receipt and returned as already finished.

The worker sends SIGTERM to the command's process group, waits up to five seconds, then sends SIGKILL to that group. With `KillMode=mixed`, systemd initially signals the worker and kills any remaining processes in the unit's cgroup after its stop timeout; descendants that escape the command process group may therefore not get a graceful signal. `supervisor_terminal: true` is the proof that the systemd unit's process tree is gone.

The registration, cancellation intent, and receipt are read-only files; directories and mutable event/log files are private to the account. Nothing removes logs, records, receipts, failed systemd unit evidence, worktrees, or installed skill versions automatically. The tool does not configure lingering, reboot recovery, or host recovery.
