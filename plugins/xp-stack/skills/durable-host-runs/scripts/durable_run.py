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
import pwd
import secrets
import signal
import shutil
import socket
import stat
import subprocess
import sys
import time
from typing import Dict, Iterator, List, Optional, Sequence, Tuple


FOLLOW_UNKNOWN_BUDGET = 3
FOLLOW_MIN_POLL_SECONDS = 0.25


class DurableRunError(Exception):
    """Base error reported by the CLI as a structured message."""


class PayloadConflict(DurableRunError):
    """A stable key already names a different candidate or command."""


class CorruptRecord(DurableRunError):
    """A private registration or receipt failed integrity checks."""


class SubmissionFailed(DurableRunError):
    """The registration is durable, but systemd-run did not confirm enqueue."""


class SupervisorUnavailable(DurableRunError):
    """The user manager failed preflight before a registration was created."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _json_bytes(value: dict) -> bytes:
    return (json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")


def _key_digest(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def _unit_for_key(key: str) -> str:
    return "xp-stack-run-{}.service".format(_key_digest(key))


def _legacy_stable_payload(key: str, candidate: str, cwd: str, argv: Sequence[str]) -> dict:
    return {"key": key, "candidate": candidate, "cwd": cwd, "argv": list(argv)}


def _stable_payload(key: str, candidate: str, cwd: str, argv: Sequence[str]) -> dict:
    """Identity that determines whether a stable key names the same execution."""
    return _legacy_stable_payload(key, candidate, cwd, argv)


def _legacy_metadata_payload(
    key: str,
    candidate: str,
    cwd: str,
    argv: Sequence[str],
    owner: dict,
    resources: Sequence[str],
) -> dict:
    return {
        "key": key,
        "candidate": candidate,
        "cwd": cwd,
        "argv": list(argv),
        "owner": owner,
        "resources": list(resources),
    }


def _record_integrity_digest(record: dict) -> str:
    unsigned_record = {name: value for name, value in record.items() if name != "record_sha256"}
    return _payload_digest(unsigned_record)


def _capture_owner(explicit_owner: Optional[str]) -> dict:
    if explicit_owner is not None:
        if not isinstance(explicit_owner, str) or not explicit_owner.strip() or "\x00" in explicit_owner:
            raise DurableRunError("owner must be a non-empty NUL-free identifier")
        return {"explicit": explicit_owner}

    account = pwd.getpwuid(os.getuid())
    owner = {"host": socket.gethostname(), "user": account.pw_name}
    epic_id = os.environ.get("TRAYCER_EPIC_ID")
    legacy_task_id = os.environ.get("TRAYCER_TASK_ID")
    agent_id = os.environ.get("TRAYCER_AGENT_ID")
    if epic_id:
        owner["traycer_epic_id"] = epic_id
    elif legacy_task_id:
        owner["traycer_task_id"] = legacy_task_id
    if agent_id:
        owner["traycer_agent_id"] = agent_id
    return owner


def _validate_owner(owner: object) -> dict:
    if not isinstance(owner, dict):
        raise CorruptRecord("registration has invalid owner metadata")
    if set(owner) == {"explicit"}:
        value = owner.get("explicit")
        if isinstance(value, str) and value.strip() and "\x00" not in value:
            return owner
        raise CorruptRecord("registration has invalid explicit owner")

    allowed = {"host", "user", "traycer_epic_id", "traycer_task_id", "traycer_agent_id"}
    if not {"host", "user"}.issubset(owner) or set(owner) - allowed:
        raise CorruptRecord("registration has invalid host/account owner")
    if any(not isinstance(value, str) or not value.strip() or "\x00" in value for value in owner.values()):
        raise CorruptRecord("registration has invalid host/account owner")
    return owner


def _validate_resources(resources: object) -> List[str]:
    if not isinstance(resources, list) or any(
        not isinstance(value, str) or not value.strip() or "\x00" in value for value in resources
    ):
        raise CorruptRecord("registration has invalid declared resources")
    return resources


def _assert_same_execution(existing: dict, requested: dict) -> None:
    changed_fields = [
        field
        for field in ("candidate", "cwd", "argv")
        if existing.get(field) != requested.get(field)
    ]
    if changed_fields:
        raise PayloadConflict(
            "stable key already has a durable execution; changed execution fields: {}. "
            "This conflict is not permission to bypass deduplication with a new key.".format(
                ", ".join(changed_fields)
            )
        )


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


def _event_exists(path: Path, wanted: str) -> bool:
    if not os.path.lexists(str(path)):
        return False
    try:
        _check_private_file(path, 0o600)
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                event = json.loads(line)
            except ValueError:
                continue
            if isinstance(event, dict) and event.get("event") == wanted:
                return True
    except (OSError, CorruptRecord):
        return False
    return False


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

    identity = _stable_payload(key, candidate, cwd, argv)
    if record.get("schema") == 1:
        if digest != _payload_digest(_legacy_stable_payload(key, candidate, cwd, argv)):
            raise CorruptRecord("registration payload digest does not match")
    elif record.get("schema") == 2:
        owner = _validate_owner(record.get("owner"))
        resources = _validate_resources(record.get("resources"))
        legacy_payload = _legacy_metadata_payload(key, candidate, cwd, argv, owner, resources)
        if digest != _payload_digest(legacy_payload):
            raise CorruptRecord("registration payload digest does not match")
    elif record.get("schema") == 3:
        _validate_owner(record.get("owner"))
        _validate_resources(record.get("resources"))
        if digest != _payload_digest(identity):
            raise CorruptRecord("registration execution identity digest does not match")
        if record.get("record_sha256") != _record_integrity_digest(record):
            raise CorruptRecord("registration record integrity digest does not match")
    else:
        raise CorruptRecord("registration has an unsupported schema")
    if expected_key is not None and key != expected_key:
        raise CorruptRecord("registration key does not match its requested key")
    if unit != _unit_for_key(key):
        raise CorruptRecord("registration unit does not match its key")
    return identity


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

    def preflight(self) -> None:
        for executable in ("systemctl", "systemd-run"):
            if shutil.which(executable) is None:
                raise SupervisorUnavailable(
                    "{} not found in PATH; no registration was written".format(executable)
                )
        try:
            result = self._run(["systemctl", "--user", "show-environment"], timeout=5)
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise SupervisorUnavailable("systemd user manager unavailable; no registration was written: {}".format(exc))
        if result.returncode != 0:
            detail = (result.stderr or result.stdout or "systemctl --user preflight failed").strip()
            raise SupervisorUnavailable("systemd user manager unavailable; no registration was written: {}".format(detail))

    def submit(self, unit: str, cwd: str, worker_argv: List[str]) -> None:
        argv = [
            "systemd-run",
            "--user",
            "--no-block",
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
        properties = ("LoadState", "ActiveState", "SubState", "ExecMainCode", "ExecMainStatus")
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
            user_home = Path(pwd.getpwuid(os.getuid()).pw_dir)
            state_dir = user_home / ".local" / "state" / "xp-stack" / "durable-host-runs"
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
            "cancel_intent": job_dir / "cancel.intent",
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
        return record, paths

    def _load_receipt(self, paths: dict) -> Optional[dict]:
        if not os.path.lexists(str(paths["receipt"])):
            return None
        receipt = _read_private_json(paths["receipt"], 0o400)
        if receipt.get("schema") != 1 or "exit_code" not in receipt or not receipt.get("finished_at"):
            raise CorruptRecord("final receipt is missing required fields")
        return receipt

    def submit(
        self,
        key: str,
        candidate: str,
        cwd: str,
        argv: Sequence[str],
        owner: Optional[str] = None,
        resources: Optional[Sequence[str]] = None,
    ) -> dict:
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

        if isinstance(resources, (str, bytes)):
            raise DurableRunError("resources must be a sequence of declared strings")
        resource_values = list(resources or [])
        if any(not isinstance(value, str) or not value.strip() or "\x00" in value for value in resource_values):
            raise DurableRunError("resources must contain non-empty NUL-free strings")
        captured_owner = _capture_owner(owner)
        identity = _stable_payload(key, candidate, str(canonical_cwd), args)
        identity_digest = _payload_digest(identity)
        unit = _unit_for_key(key)
        paths = self._paths(key)
        created = False

        with self._registry_lock():
            if os.path.lexists(str(paths["job_dir"])):
                _ensure_private_directory(paths["job_dir"])
            if os.path.lexists(str(paths["request"])):
                record = _read_private_json(paths["request"], 0o400)
                existing_identity = _validate_request(record, expected_key=key)
                _assert_same_execution(existing_identity, identity)
            else:
                try:
                    self.systemctl.preflight()
                except Exception as exc:
                    if isinstance(exc, SupervisorUnavailable):
                        raise
                    raise SupervisorUnavailable("systemd user manager preflight failed; no registration was written: {}".format(exc))
                _ensure_private_directory(paths["job_dir"])
                record = dict(identity)
                record.update({
                    "schema": 3,
                    "unit": unit,
                    "payload_sha256": identity_digest,
                    "owner": captured_owner,
                    "resources": resource_values,
                    "created_at": _now(),
                })
                record["record_sha256"] = _record_integrity_digest(record)
                if not _write_json_once(paths["request"], record, mode=0o400):
                    record = _read_private_json(paths["request"], 0o400)
                    existing_identity = _validate_request(record, expected_key=key)
                    _assert_same_execution(existing_identity, identity)
                else:
                    _append_event(paths["job_dir"], "registered", unit=unit, candidate=candidate)
                    worker_argv = [
                        os.path.abspath(sys.executable),
                        str(Path(__file__).resolve()),
                        "worker",
                        "--request",
                        str(paths["request"]),
                    ]
                    try:
                        self.systemctl.submit(unit, str(canonical_cwd), worker_argv)
                        _append_event(paths["job_dir"], "enqueue_confirmed", unit=unit)
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
        if not snapshot or snapshot.get("load_state") == "not-found":
            return False
        if snapshot.get("active_state") == "failed":
            return True
        return snapshot.get("active_state") == "inactive" and RunManager._has_useful_exit(snapshot)

    @staticmethod
    def _has_useful_exit(snapshot: Optional[dict]) -> bool:
        if not snapshot or snapshot.get("exec_main_code") not in ("1", "2", "3", "exited", "killed", "dumped"):
            return False
        try:
            int(snapshot.get("exec_main_status", ""))
            return True
        except (TypeError, ValueError):
            return False

    @staticmethod
    def _receipt_from_supervisor(snapshot: dict, cancel_requested: bool = False) -> Optional[dict]:
        main_code = snapshot.get("exec_main_code", "")
        raw_status = snapshot.get("exec_main_status", "")
        try:
            status_value = int(raw_status)
        except (TypeError, ValueError):
            return None
        if main_code in ("1", "exited"):
            exit_code = status_value
            if 200 <= status_value <= 255:
                termination = "supervisor_error"
            elif cancel_requested and status_value == 143:
                termination = "cancelled"
            elif status_value >= 128:
                termination = "signal"
            else:
                termination = "supervisor"
        elif main_code in ("2", "3", "killed", "dumped"):
            exit_code = 128 + status_value
            termination = "cancelled" if cancel_requested else "signal"
        else:
            return None
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
            return {"key": key, "state": "not_found", "exit_code": None, "supervisor_terminal": False}
        record, paths = loaded
        receipt = self._load_receipt(paths)
        try:
            snapshot = self.systemctl.inspect(record["unit"])
        except Exception:
            snapshot = None

        if receipt is None and self._is_terminal(snapshot) and self._has_useful_exit(snapshot):
            final_receipt = self._receipt_from_supervisor(
                snapshot,
                cancel_requested=_has_cancel_intent(paths["job_dir"], record),
            )
            if final_receipt is not None:
                wrote_receipt = _write_json_once(paths["receipt"], final_receipt, mode=0o400)
                if wrote_receipt:
                    _append_event(
                        paths["job_dir"],
                        "supervisor_receipt",
                        exit_code=final_receipt["exit_code"],
                        termination=final_receipt["termination"],
                    )
                try:
                    receipt = self._load_receipt(paths)
                except CorruptRecord:
                    receipt = None

        unit_unloaded = bool(snapshot) and snapshot.get("load_state") == "not-found"
        was_started = _event_exists(paths["events"], "started")
        supervisor_terminal = self._is_terminal(snapshot) or (unit_unloaded and was_started)

        if receipt is not None and supervisor_terminal:
            state = self._state_for_receipt(receipt)
        elif receipt is not None and snapshot and snapshot.get("active_state") in ("active", "activating", "deactivating"):
            state = "stopping"
        elif snapshot and snapshot.get("active_state") == "active":
            state = "running"
        elif snapshot and snapshot.get("active_state") == "activating":
            state = "starting"
        elif snapshot and snapshot.get("active_state") == "deactivating":
            state = "stopping"
        else:
            state = "unknown"

        exit_code = receipt.get("exit_code") if receipt is not None else None
        if state == "unknown" and supervisor_terminal and receipt is None:
            exit_code = None

        return {
            "key": key,
            "candidate": record["candidate"],
            "cwd": record["cwd"],
            "owner": record.get("owner"),
            "resources": record.get("resources"),
            "unit": record["unit"],
            "state": state,
            "exit_code": exit_code,
            "supervisor_terminal": supervisor_terminal,
            "supervisor_state": (
                "{}/{}".format(snapshot.get("load_state", ""), snapshot.get("active_state", ""))
                if snapshot
                else "unavailable"
            ),
            "request_path": str(paths["request"]),
            "events_path": str(paths["events"]),
            "log_path": str(paths["log"]),
            "receipt_path": str(paths["receipt"]),
        }

    def cancel(self, key: str) -> dict:
        loaded = self._load_request(key)
        if loaded is None:
            return {"key": key, "state": "not_found", "confirmed": False, "exit_code": None, "supervisor_terminal": False}
        record, paths = loaded
        before_stop = self.status(key)
        if before_stop.get("supervisor_terminal"):
            before_stop.update({
                "confirmed": True,
                "already_finished": before_stop["state"] != "cancelled",
                "cancelled": before_stop["state"] == "cancelled",
            })
            return before_stop

        current_receipt = self._load_receipt(paths)
        details = {"unit": record["unit"]}
        if current_receipt is not None:
            details["reason"] = "tree-still-active"
        _append_event(paths["job_dir"], "cancel_requested", **details)
        intent_written = _write_json_once(
            paths["cancel_intent"],
            {"schema": 1, "key": key, "unit": record["unit"], "requested_at": _now()},
            mode=0o400,
        )
        if not intent_written and not _has_cancel_intent(paths["job_dir"], record):
            raise CorruptRecord("existing cancel intent does not match this registered job")

        try:
            self.systemctl.stop(record["unit"])
        except Exception as exc:
            _append_event(paths["job_dir"], "cancel_command_error", error=str(exc))

        result = self.status(key)
        if result.get("supervisor_terminal"):
            result["supervisor_terminal"] = True
            actual_receipt = self._load_receipt(paths)
            exit_code = actual_receipt["exit_code"] if actual_receipt is not None else None
            _append_event(paths["job_dir"], "cancel_confirmed", exit_code=exit_code)
            result["confirmed"] = True
            result["cancelled"] = bool(actual_receipt and actual_receipt.get("termination") == "cancelled")
            result["already_finished"] = result["state"] in ("completed", "failed")
            return result

        _append_event(paths["job_dir"], "cancel_unconfirmed", state=result["state"])
        result["confirmed"] = False
        return result

    def follow(self, key: str, poll_interval: float = 0.25) -> Iterator[dict]:
        loaded = self._load_request(key)
        if loaded is None:
            raise DurableRunError("no registered job for key {!r}".format(key))
        record, paths = loaded
        offset = 0
        remainder = b""
        unknown_observations = 0

        def read_available() -> List[dict]:
            nonlocal offset, remainder
            try:
                flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
                fd = os.open(str(paths["events"]), flags)
                _check_private_fd(fd, paths["events"], 0o600)
                with os.fdopen(fd, "rb") as stream:
                    stream.seek(offset)
                    chunk = stream.read()
            except FileNotFoundError:
                chunk = b""
            offset += len(chunk)
            remainder += chunk
            result = []
            while b"\n" in remainder:
                line, remainder = remainder.split(b"\n", 1)
                if line:
                    try:
                        event = json.loads(line.decode("utf-8"))
                    except (UnicodeDecodeError, ValueError) as exc:
                        raise CorruptRecord("invalid event record: {}".format(exc))
                    if isinstance(event, dict):
                        result.append(event)
            return result

        while True:
            for event in read_available():
                yield event
            status = self.status(key)
            unknown_without_terminal = (
                status["state"] == "unknown" and not status.get("supervisor_terminal", False)
            )
            if unknown_without_terminal:
                unknown_observations += 1
            else:
                unknown_observations = 0

            terminal = status["state"] in ("completed", "failed", "cancelled") or (
                status["state"] == "unknown" and status.get("supervisor_terminal", False)
            ) or (unknown_without_terminal and unknown_observations >= FOLLOW_UNKNOWN_BUDGET)
            if terminal:
                # Worker final events are flushed before its receipt; drain once more
                # after observing terminal evidence or exhausting the bounded unknown budget.
                for event in read_available():
                    yield event
                yield {
                    "event": "follow_finished",
                    "key": key,
                    "unit": record["unit"],
                    "state": status["state"],
                    "exit_code": status.get("exit_code"),
                    "supervisor_terminal": status.get("supervisor_terminal", False),
                    "supervisor_state": status.get("supervisor_state", "unavailable"),
                }
                return
            time.sleep(max(FOLLOW_MIN_POLL_SECONDS, poll_interval))


def _open_private_append(path: Path):
    flags = os.O_WRONLY | os.O_CREAT | os.O_APPEND | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(str(path), flags, 0o600)
    _check_private_fd(fd, path, 0o600)
    return os.fdopen(fd, "ab", buffering=0)


def _has_cancel_intent(job_dir: Path, record: dict) -> bool:
    path = job_dir / "cancel.intent"
    if not os.path.lexists(str(path)):
        return False
    try:
        intent = _read_private_json(path, 0o400)
    except CorruptRecord:
        return False
    return intent.get("schema") == 1 and intent.get("key") == record["key"] and intent.get("unit") == record["unit"]


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
                termination = "cancelled" if _has_cancel_intent(job_dir, record) else "signal"
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
                    if cancel_signal[0] is not None and child.poll() is None:
                        try:
                            os.killpg(child.pid, int(cancel_signal[0]))
                        except ProcessLookupError:
                            pass
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
                        code = 128 + int(cancel_signal[0])
                        termination = "cancelled" if _has_cancel_intent(job_dir, record) else "signal"
                    elif raw_code < 0:
                        code, termination = 128 + abs(raw_code), "signal"
                    else:
                        code, termination = raw_code, "command"

        if cancel_signal[0] is not None:
            _append_event(
                job_dir,
                "signal_received",
                signal=int(cancel_signal[0]),
                cancel_requested=termination == "cancelled",
            )
        _append_event(job_dir, "command_exited", exit_code=code, termination=termination)
        _append_event(job_dir, "finished", exit_code=code, termination=termination)
        receipt = {
            "schema": 1,
            "exit_code": code,
            "termination": termination,
            "source": "worker",
            "finished_at": _now(),
        }
        if not _write_json_once(job_dir / "receipt.json", receipt, mode=0o400):
            try:
                stored = _read_private_json(job_dir / "receipt.json", 0o400)
                if stored.get("exit_code") != code or stored.get("termination") != termination:
                    _append_event(
                        job_dir,
                        "receipt_write_refused",
                        worker_exit_code=code,
                        stored_exit_code=stored.get("exit_code"),
                        stored_source=stored.get("source"),
                    )
            except CorruptRecord as exc:
                _append_event(job_dir, "receipt_write_refused", worker_exit_code=code, stored_error=str(exc))
        return code
    finally:
        signal.signal(signal.SIGTERM, previous_term)


def _record_worker_failure(request_path: str, error: Exception) -> None:
    request_file = Path(request_path)
    _ensure_private_directory(request_file.parent)
    record = _read_private_json(request_file, 0o400)
    _validate_request(record)
    job_dir = request_file.parent
    _append_event(job_dir, "worker_failed", error=str(error), exit_code=70)
    _write_json_once(
        job_dir / "receipt.json",
        {
            "schema": 1,
            "exit_code": 70,
            "termination": "worker_error",
            "source": "worker",
            "finished_at": _now(),
        },
        mode=0o400,
    )


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run an idempotent command in a transient user systemd unit.")
    commands = parser.add_subparsers(dest="action", required=True)

    submit = commands.add_parser("submit", help="register and submit one command")
    submit.add_argument("--key", required=True, help="stable idempotency key")
    submit.add_argument("--candidate", required=True, help="explicit candidate identity")
    submit.add_argument("--cwd", required=True, help="working directory")
    submit.add_argument("--owner", help="explicit stable owner identifier; defaults to Host/account and available Traycer IDs")
    submit.add_argument("--resource", action="append", default=[], help="opaque declared resource label; may be repeated")
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
            try:
                _record_worker_failure(args.request, exc)
            except Exception as record_error:
                print("durable-run could not persist worker failure: {}".format(record_error), file=sys.stderr, flush=True)
            print("durable-run worker failed: {}".format(exc), file=sys.stderr, flush=True)
            return 70

    manager = RunManager()
    try:
        if args.action == "submit":
            command = list(args.command)
            if command and command[0] == "--":
                command = command[1:]
            result = manager.submit(
                args.key,
                args.candidate,
                args.cwd,
                command,
                owner=args.owner,
                resources=args.resource,
            )
            _print_json(result)
            return 6 if not result.get("created") and result.get("state") == "unknown" else 0
        if args.action == "status":
            result = manager.status(args.key)
            _print_json(result)
            return 4 if result["state"] == "not_found" else 0
        if args.action == "follow":
            unknown = False
            for event in manager.follow(args.key, poll_interval=args.poll_seconds):
                _print_json(event)
                if event.get("event") == "follow_finished" and event.get("state") == "unknown":
                    unknown = True
            return 6 if unknown else 0
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
    except SupervisorUnavailable as exc:
        _print_json({"error": str(exc), "state": "not_registered", "key": getattr(args, "key", None)}, sys.stderr)
        return 3
    except DurableRunError as exc:
        _print_json({"error": str(exc), "key": getattr(args, "key", None)}, sys.stderr)
        return 2
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
