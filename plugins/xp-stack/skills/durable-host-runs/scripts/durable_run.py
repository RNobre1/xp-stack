#!/usr/bin/env python3
"""Submit idempotent user jobs to transient systemd units."""

from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import secrets
import signal
import stat
import subprocess
import sys
import time
from typing import Dict, Iterator, List, Optional, Sequence, Tuple


class DurableRunError(Exception):
    """Base error reported by the CLI as a structured message."""


class PayloadConflict(DurableRunError):
    """A stable key already names a different candidate or command."""


class CorruptRecord(DurableRunError):
    """A private registration or receipt failed integrity checks."""


class SubmissionFailed(DurableRunError):
    """The registration is durable, but systemd-run did not confirm enqueue."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_bytes(value: dict) -> bytes:
    return (json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")


def _key_digest(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def _unit_for_key(key: str) -> str:
    return "xp-stack-run-{}.service".format(_key_digest(key))


def _stable_payload(key: str, candidate: str, cwd: str, argv: Sequence[str]) -> dict:
    return {"key": key, "candidate": candidate, "cwd": cwd, "argv": list(argv)}


def _payload_digest(payload: dict) -> str:
    return hashlib.sha256(_json_bytes(payload)).hexdigest()


def _ensure_private_directory(path: Path) -> None:
    try:
        os.mkdir(str(path), 0o700)
    except FileExistsError:
        pass
    except FileNotFoundError:
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            os.mkdir(str(path), 0o700)
        except FileExistsError:
            pass

    try:
        info = path.lstat()
    except OSError as exc:
        raise DurableRunError("cannot inspect state directory {}: {}".format(path, exc))
    if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode):
        raise DurableRunError("state path is not a real directory: {}".format(path))
    if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o700:
        raise DurableRunError("state directory must be owned by this user with mode 0700: {}".format(path))


def _check_private_fd(fd: int, path: Path, expected_mode: int) -> None:
    info = os.fstat(fd)
    if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid():
        raise DurableRunError("private path is not an owned regular file: {}".format(path))
    if stat.S_IMODE(info.st_mode) != expected_mode:
        raise DurableRunError("{} must have mode {:04o}".format(path, expected_mode))


def _check_private_file(path: Path, expected_mode: int) -> None:
    try:
        info = path.lstat()
    except OSError as exc:
        raise CorruptRecord("cannot inspect {}: {}".format(path, exc))
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != os.getuid():
        raise CorruptRecord("not an owned regular file: {}".format(path))
    if stat.S_IMODE(info.st_mode) != expected_mode:
        raise CorruptRecord("{} must have mode {:04o}".format(path, expected_mode))


def _sync_directory(path: Path) -> None:
    flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
    fd = os.open(str(path), flags)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def _write_json_once(path: Path, value: dict, mode: int = 0o400) -> bool:
    """Durably publish JSON without replacing an existing final file."""
    temp_path = path.with_name(".{}.{}.tmp".format(path.name, secrets.token_hex(8)))
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(str(temp_path), flags, 0o600)
    try:
        content = _json_bytes(value)
        view = memoryview(content)
        while view:
            written = os.write(fd, view)
            view = view[written:]
        os.fsync(fd)
        os.fchmod(fd, mode)
        os.fsync(fd)
    finally:
        os.close(fd)

    try:
        os.link(str(temp_path), str(path))
    except FileExistsError:
        return False
    finally:
        try:
            os.unlink(str(temp_path))
        except FileNotFoundError:
            pass
    _sync_directory(path.parent)
    return True


def _read_private_json(path: Path, expected_mode: int) -> dict:
    _check_private_file(path, expected_mode)
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise CorruptRecord("cannot read valid JSON from {}: {}".format(path, exc))
    if not isinstance(value, dict):
        raise CorruptRecord("expected a JSON object in {}".format(path))
    return value


def _append_event(job_dir: Path, event: str, **details: object) -> None:
    event_path = job_dir / "events.jsonl"
    payload = {"at": _now(), "event": event}
    payload.update(details)
    flags = os.O_WRONLY | os.O_CREAT | os.O_APPEND | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(str(event_path), flags, 0o600)
    try:
        _check_private_fd(fd, event_path, 0o600)
        content = _json_bytes(payload)
        view = memoryview(content)
        while view:
            written = os.write(fd, view)
            view = view[written:]
        os.fsync(fd)
    finally:
        os.close(fd)


def _validate_request(record: dict, expected_key: Optional[str] = None) -> dict:
    try:
        key = record["key"]
        candidate = record["candidate"]
        cwd = record["cwd"]
        argv = record["argv"]
        unit = record["unit"]
        digest = record["payload_sha256"]
    except (KeyError, TypeError):
        raise CorruptRecord("registration is missing required fields")
    if not isinstance(key, str) or not isinstance(candidate, str) or not isinstance(cwd, str):
        raise CorruptRecord("registration has invalid identity fields")
    if not isinstance(argv, list) or not argv or any(not isinstance(arg, str) for arg in argv):
        raise CorruptRecord("registration has invalid argv")
    payload = _stable_payload(key, candidate, cwd, argv)
    if record.get("schema") != 1 or digest != _payload_digest(payload):
        raise CorruptRecord("registration payload digest does not match")
    if expected_key is not None and key != expected_key:
        raise CorruptRecord("registration key does not match its requested key")
    if unit != _unit_for_key(key):
        raise CorruptRecord("registration unit does not match its key")
    return payload


class SystemdSupervisor:
    """Real systemd boundary; tests inject a FakeSystemctl implementing the same methods."""

    def __init__(self, script_path: Optional[Path] = None) -> None:
        self.script_path = (script_path or Path(__file__)).resolve()

    @staticmethod
    def _run(argv: Sequence[str], timeout: float) -> subprocess.CompletedProcess:
        return subprocess.run(
            list(argv),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
            check=False,
        )

    def submit(self, unit: str, cwd: str, worker_argv: List[str]) -> None:
        argv = [
            "systemd-run",
            "--user",
            "--no-block",
            "--collect",
            "--unit={}".format(unit),
            "--working-directory={}".format(cwd),
            "--property=KillMode=mixed",
            "--property=TimeoutStopSec=15s",
            "--quiet",
            "--",
        ] + list(worker_argv)
        try:
            result = self._run(argv, timeout=10)
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise SubmissionFailed("systemd-run could not confirm enqueue: {}".format(exc))
        if result.returncode != 0:
            detail = (result.stderr or result.stdout or "systemd-run failed").strip()
            raise SubmissionFailed("systemd-run could not confirm enqueue: {}".format(detail))

    def inspect(self, unit: str) -> Optional[Dict[str, str]]:
        properties = ("LoadState", "ActiveState", "SubState", "Result", "ExecMainCode", "ExecMainStatus")
        argv = ["systemctl", "--user", "show", "--no-pager"]
        argv.extend("--property={}".format(name) for name in properties)
        argv.append(unit)
        try:
            result = self._run(argv, timeout=5)
        except (OSError, subprocess.TimeoutExpired):
            return None
        if result.returncode != 0:
            return None
        values = {}
        for line in result.stdout.splitlines():
            name, separator, value = line.partition("=")
            if separator:
                values[name] = value
        return {
            "load_state": values.get("LoadState", ""),
            "active_state": values.get("ActiveState", ""),
            "sub_state": values.get("SubState", ""),
            "result": values.get("Result", ""),
            "exec_main_code": values.get("ExecMainCode", ""),
            "exec_main_status": values.get("ExecMainStatus", ""),
        }

    def stop(self, unit: str) -> bool:
        try:
            result = self._run(["systemctl", "--user", "stop", unit], timeout=20)
        except (OSError, subprocess.TimeoutExpired):
            return False
        return result.returncode == 0


class RunManager:
    """Private, durable key registry around a transient-unit supervisor."""

    def __init__(self, state_dir: Optional[Path] = None, systemctl: Optional[object] = None) -> None:
        if state_dir is None:
            xdg_state_home = os.environ.get("XDG_STATE_HOME")
            if xdg_state_home:
                base = Path(xdg_state_home).expanduser()
                if not base.is_absolute():
                    raise DurableRunError("XDG_STATE_HOME must be an absolute path")
            else:
                base = Path.home() / ".local" / "state"
            state_dir = base / "xp-stack" / "durable-host-runs"
        self.state_dir = Path(state_dir).expanduser().absolute()
        self.jobs_dir = self.state_dir / "jobs"
        self.systemctl = systemctl or SystemdSupervisor()

    def _paths(self, key: str) -> dict:
        job_dir = self.jobs_dir / _key_digest(key)
        return {
            "job_dir": job_dir,
            "request": job_dir / "request.json",
            "events": job_dir / "events.jsonl",
            "log": job_dir / "command.log",
            "receipt": job_dir / "receipt.json",
        }

    def _ensure_layout(self) -> None:
        self.state_dir.parent.mkdir(parents=True, exist_ok=True)
        _ensure_private_directory(self.state_dir)
        _ensure_private_directory(self.jobs_dir)

    @contextmanager
    def _registry_lock(self) -> Iterator[None]:
        self._ensure_layout()
        lock_path = self.state_dir / "registry.lock"
        flags = os.O_RDWR | os.O_CREAT | getattr(os, "O_NOFOLLOW", 0)
        fd = os.open(str(lock_path), flags, 0o600)
        try:
            _check_private_fd(fd, lock_path, 0o600)
            fcntl.flock(fd, fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)

    def _load_request(self, key: str) -> Optional[Tuple[dict, dict]]:
        paths = self._paths(key)
        if not self.state_dir.exists():
            return None
        _ensure_private_directory(self.state_dir)
        if not self.jobs_dir.exists():
            return None
        _ensure_private_directory(self.jobs_dir)
        if not paths["job_dir"].exists():
            return None
        _ensure_private_directory(paths["job_dir"])
        if not os.path.lexists(str(paths["request"])):
            return None
        record = _read_private_json(paths["request"], 0o400)
        payload = _validate_request(record, expected_key=key)
        if record.get("payload_sha256") != _payload_digest(payload):
            raise CorruptRecord("registration payload digest does not match")
        return record, paths

    def _load_receipt(self, paths: dict) -> Optional[dict]:
        if not os.path.lexists(str(paths["receipt"])):
            return None
        receipt = _read_private_json(paths["receipt"], 0o400)
        if receipt.get("schema") != 1 or "exit_code" not in receipt or not receipt.get("finished_at"):
            raise CorruptRecord("final receipt is missing required fields")
        return receipt

    def submit(self, key: str, candidate: str, cwd: str, argv: Sequence[str]) -> dict:
        if not isinstance(key, str) or not key.strip() or key != key.strip() or len(key) > 512:
            raise DurableRunError("key must be a non-empty stable string of at most 512 characters")
        if not isinstance(candidate, str) or not candidate.strip() or candidate != candidate.strip() or len(candidate) > 512:
            raise DurableRunError("candidate must be a non-empty stable identity of at most 512 characters")
        if isinstance(argv, (str, bytes)):
            raise DurableRunError("argv must be an argument vector, not a string")
        args = list(argv)
        if not args or not args[0] or any(not isinstance(arg, str) or "\x00" in arg for arg in args):
            raise DurableRunError("argv must contain a command and NUL-free string arguments")
        try:
            canonical_cwd = Path(cwd).expanduser().resolve(strict=True)
        except (OSError, RuntimeError) as exc:
            raise DurableRunError("cwd must resolve to an existing directory: {}".format(exc))
        if not canonical_cwd.is_dir():
            raise DurableRunError("cwd must be an existing directory")

        payload = _stable_payload(key, candidate, str(canonical_cwd), args)
        digest = _payload_digest(payload)
        unit = _unit_for_key(key)
        paths = self._paths(key)
        created = False

        with self._registry_lock():
            _ensure_private_directory(paths["job_dir"])
            if os.path.lexists(str(paths["request"])):
                record = _read_private_json(paths["request"], 0o400)
                existing_payload = _validate_request(record, expected_key=key)
                if _payload_digest(existing_payload) != digest:
                    raise PayloadConflict("key already belongs to a different candidate, cwd, or argv")
            else:
                record = dict(payload)
                record.update({
                    "schema": 1,
                    "unit": unit,
                    "payload_sha256": digest,
                    "created_at": _now(),
                })
                if not _write_json_once(paths["request"], record, mode=0o400):
                    record = _read_private_json(paths["request"], 0o400)
                    existing_payload = _validate_request(record, expected_key=key)
                    if _payload_digest(existing_payload) != digest:
                        raise PayloadConflict("key already belongs to a different candidate, cwd, or argv")
                else:
                    _append_event(paths["job_dir"], "submitted", unit=unit, candidate=candidate)
                    worker_argv = [
                        os.path.abspath(sys.executable),
                        str(Path(__file__).resolve()),
                        "worker",
                        "--request",
                        str(paths["request"]),
                    ]
                    try:
                        self.systemctl.submit(unit, str(canonical_cwd), worker_argv)
                    except Exception as exc:
                        _append_event(paths["job_dir"], "submission_failed", error=str(exc))
                        raise SubmissionFailed(
                            "registration persisted at {}; supervisor state is retained as unknown: {}".format(
                                paths["request"], exc
                            )
                        )
                    created = True

        result = self.status(key)
        result["created"] = created
        return result

    @staticmethod
    def _is_terminal(snapshot: Optional[dict]) -> bool:
        return bool(snapshot) and snapshot.get("load_state") != "not-found" and snapshot.get("active_state") in ("inactive", "failed")

    @staticmethod
    def _receipt_from_supervisor(snapshot: dict, cancel_requested: bool = False) -> dict:
        main_code = snapshot.get("exec_main_code", "")
        raw_status = snapshot.get("exec_main_status", "")
        exit_code = None
        termination = "unknown"
        try:
            status_value = int(raw_status)
        except (TypeError, ValueError):
            status_value = None
        if status_value is not None and main_code in ("1", "exited"):
            exit_code = status_value
            termination = "cancelled" if cancel_requested and status_value == 143 else "supervisor"
        elif status_value is not None and main_code in ("2", "3", "killed", "dumped"):
            exit_code = 128 + status_value
            termination = "cancelled" if cancel_requested else "signal"
        elif cancel_requested:
            termination = "cancelled"
        return {
            "schema": 1,
            "exit_code": exit_code,
            "termination": termination,
            "source": "systemd",
            "finished_at": _now(),
        }

    @staticmethod
    def _state_for_receipt(receipt: dict) -> str:
        if receipt.get("termination") == "cancelled":
            return "cancelled"
        code = receipt.get("exit_code")
        if not isinstance(code, int):
            return "unknown"
        return "completed" if code == 0 else "failed"

    def status(self, key: str) -> dict:
        loaded = self._load_request(key)
        if loaded is None:
            return {"key": key, "state": "not_found", "exit_code": None}
        record, paths = loaded
        receipt = self._load_receipt(paths)
        snapshot = None
        if receipt is None:
            try:
                snapshot = self.systemctl.inspect(record["unit"])
            except Exception:
                snapshot = None
            if self._is_terminal(snapshot):
                final_receipt = self._receipt_from_supervisor(snapshot)
                _write_json_once(paths["receipt"], final_receipt, mode=0o400)
                try:
                    receipt = self._load_receipt(paths)
                except CorruptRecord:
                    receipt = None

        if receipt is not None:
            state = self._state_for_receipt(receipt)
            exit_code = receipt["exit_code"]
        elif not snapshot or snapshot.get("load_state") == "not-found":
            state, exit_code = "unknown", None
        elif snapshot.get("active_state") == "active":
            state, exit_code = "running", None
        elif snapshot.get("active_state") == "activating":
            state, exit_code = "starting", None
        elif snapshot.get("active_state") == "deactivating":
            state, exit_code = "stopping", None
        else:
            state, exit_code = "unknown", None

        return {
            "key": key,
            "candidate": record["candidate"],
            "cwd": record["cwd"],
            "unit": record["unit"],
            "state": state,
            "exit_code": exit_code,
            "request_path": str(paths["request"]),
            "events_path": str(paths["events"]),
            "log_path": str(paths["log"]),
            "receipt_path": str(paths["receipt"]),
        }

    def cancel(self, key: str) -> dict:
        loaded = self._load_request(key)
        if loaded is None:
            return {"key": key, "state": "not_found", "confirmed": False, "exit_code": None}
        record, paths = loaded
        current_receipt = self._load_receipt(paths)
        if current_receipt is not None:
            result = self.status(key)
            result.update({"confirmed": True, "already_finished": True})
            return result

        _append_event(paths["job_dir"], "cancel_requested", unit=record["unit"])
        stop_confirmed = False
        try:
            stop_confirmed = self.systemctl.stop(record["unit"]) is True
        except Exception as exc:
            _append_event(paths["job_dir"], "cancel_command_error", error=str(exc))
        try:
            snapshot = self.systemctl.inspect(record["unit"])
        except Exception:
            snapshot = None

        terminal = self._is_terminal(snapshot)
        collected_after_confirmed_stop = stop_confirmed and (
            snapshot is None or snapshot.get("load_state") == "not-found"
        )
        if terminal or collected_after_confirmed_stop:
            final_receipt = self._receipt_from_supervisor(snapshot or {}, cancel_requested=True)
            _write_json_once(paths["receipt"], final_receipt, mode=0o400)
            _append_event(paths["job_dir"], "cancel_confirmed", exit_code=final_receipt["exit_code"])
            result = self.status(key)
            result["confirmed"] = True
            return result

        if snapshot and snapshot.get("active_state") == "deactivating":
            state = "stopping"
        elif snapshot and snapshot.get("active_state") in ("active", "activating"):
            state = "running" if snapshot.get("active_state") == "active" else "starting"
        else:
            state = "unknown"
        _append_event(paths["job_dir"], "cancel_unconfirmed", state=state)
        result = self.status(key)
        result.update({"confirmed": False, "state": state})
        return result

    def follow(self, key: str, poll_interval: float = 0.25) -> Iterator[dict]:
        loaded = self._load_request(key)
        if loaded is None:
            raise DurableRunError("no registered job for key {!r}".format(key))
        _, paths = loaded
        offset = 0
        remainder = b""
        while True:
            try:
                with paths["events"].open("rb") as stream:
                    stream.seek(offset)
                    chunk = stream.read()
                    offset += len(chunk)
            except FileNotFoundError:
                chunk = b""
            remainder += chunk
            while b"\n" in remainder:
                line, remainder = remainder.split(b"\n", 1)
                if line:
                    try:
                        event = json.loads(line.decode("utf-8"))
                    except (UnicodeDecodeError, ValueError) as exc:
                        raise CorruptRecord("invalid event record: {}".format(exc))
                    if isinstance(event, dict):
                        yield event
            state = self.status(key)["state"]
            if state in ("completed", "failed", "cancelled"):
                return
            time.sleep(max(0.0, poll_interval))


def _open_private_append(path: Path):
    flags = os.O_WRONLY | os.O_CREAT | os.O_APPEND | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(str(path), flags, 0o600)
    _check_private_fd(fd, path, 0o600)
    return os.fdopen(fd, "ab", buffering=0)


def run_worker(request_path: str) -> int:
    """Worker entry point used only by the transient systemd service."""
    request_file = Path(request_path)
    _ensure_private_directory(request_file.parent)
    record = _read_private_json(request_file, 0o400)
    payload = _validate_request(record)
    job_dir = request_file.parent
    log_path = job_dir / "command.log"
    cancel_signal = [None]
    process = [None]
    cancel_started = [None]

    def handle_term(signum, _frame) -> None:
        if cancel_signal[0] is not None:
            return
        child = process[0]
        if child is not None and child.poll() is not None:
            return
        cancel_signal[0] = signum
        cancel_started[0] = time.monotonic()
        if child is not None and child.poll() is None:
            try:
                os.killpg(child.pid, signum)
            except ProcessLookupError:
                pass

    previous_term = signal.signal(signal.SIGTERM, handle_term)
    try:
        _append_event(job_dir, "started", unit=record["unit"])
        with _open_private_append(log_path) as log:
            if cancel_signal[0] is not None:
                code = 128 + int(cancel_signal[0])
                termination = "cancelled"
            else:
                try:
                    child = subprocess.Popen(
                        payload["argv"],
                        cwd=payload["cwd"],
                        stdin=subprocess.DEVNULL,
                        stdout=log,
                        stderr=subprocess.STDOUT,
                        start_new_session=True,
                    )
                except OSError as exc:
                    log.write(("failed to start command: {}\n".format(exc)).encode("utf-8", errors="replace"))
                    code, termination = 127, "spawn_error"
                else:
                    process[0] = child
                    killed_after_grace = False
                    while child.poll() is None:
                        if (
                            cancel_signal[0] is not None
                            and not killed_after_grace
                            and time.monotonic() - cancel_started[0] >= 5.0
                        ):
                            try:
                                os.killpg(child.pid, signal.SIGKILL)
                            except ProcessLookupError:
                                pass
                            killed_after_grace = True
                        try:
                            child.wait(timeout=0.1)
                        except subprocess.TimeoutExpired:
                            continue
                    raw_code = child.returncode
                    if cancel_signal[0] is not None:
                        code, termination = 128 + int(cancel_signal[0]), "cancelled"
                    elif raw_code < 0:
                        code, termination = 128 + abs(raw_code), "signal"
                    else:
                        code, termination = raw_code, "command"

        _append_event(job_dir, "command_exited", exit_code=code, termination=termination)
        _append_event(job_dir, "finished", exit_code=code, termination=termination)
        _write_json_once(
            job_dir / "receipt.json",
            {
                "schema": 1,
                "exit_code": code,
                "termination": termination,
                "source": "worker",
                "finished_at": _now(),
            },
            mode=0o400,
        )
        return code
    finally:
        signal.signal(signal.SIGTERM, previous_term)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run an idempotent command in a transient user systemd unit.")
    commands = parser.add_subparsers(dest="action", required=True)

    submit = commands.add_parser("submit", help="register and submit one command")
    submit.add_argument("--key", required=True, help="stable idempotency key")
    submit.add_argument("--candidate", required=True, help="explicit candidate identity")
    submit.add_argument("--cwd", required=True, help="working directory")
    submit.add_argument("command", nargs=argparse.REMAINDER, help="argv after --; executed without a shell")

    status = commands.add_parser("status", help="show the supervisor state and final exit code")
    status.add_argument("--key", required=True)

    follow = commands.add_parser("follow", help="stream persisted lifecycle events until terminal")
    follow.add_argument("--key", required=True)
    follow.add_argument("--poll-seconds", type=float, default=0.25)

    cancel = commands.add_parser("cancel", help="stop only the unit registered under this key")
    cancel.add_argument("--key", required=True)

    worker = commands.add_parser("worker", help=argparse.SUPPRESS)
    worker.add_argument("--request", required=True)
    return parser


def _print_json(value: dict, stream=None) -> None:
    print(json.dumps(value, sort_keys=True, ensure_ascii=False), file=stream or sys.stdout, flush=True)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = _build_parser().parse_args(argv)
    if args.action == "worker":
        try:
            return run_worker(args.request)
        except Exception as exc:
            print("durable-run worker failed: {}".format(exc), file=sys.stderr, flush=True)
            return 70

    manager = RunManager()
    try:
        if args.action == "submit":
            command = list(args.command)
            if command and command[0] == "--":
                command = command[1:]
            result = manager.submit(args.key, args.candidate, args.cwd, command)
            _print_json(result)
            return 6 if not result.get("created") and result.get("state") == "unknown" else 0
        if args.action == "status":
            result = manager.status(args.key)
            _print_json(result)
            return 4 if result["state"] == "not_found" else 0
        if args.action == "follow":
            for event in manager.follow(args.key, poll_interval=args.poll_seconds):
                _print_json(event)
            return 0
        if args.action == "cancel":
            result = manager.cancel(args.key)
            _print_json(result)
            if result["state"] == "not_found":
                return 4
            return 0 if result.get("confirmed") else 5
    except PayloadConflict as exc:
        _print_json({"error": str(exc), "key": getattr(args, "key", None)}, sys.stderr)
        return 2
    except SubmissionFailed as exc:
        _print_json({"error": str(exc), "state": "unknown", "key": getattr(args, "key", None)}, sys.stderr)
        return 3
    except DurableRunError as exc:
        _print_json({"error": str(exc), "key": getattr(args, "key", None)}, sys.stderr)
        return 2
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
