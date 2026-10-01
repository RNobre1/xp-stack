"""Unit tests for the opt-in durable-host-runs skill (stdlib only)."""

from __future__ import annotations

import io
import json
import os
from pathlib import Path
import pwd
import signal
import shutil
import socket
import stat
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional, Tuple
from unittest.mock import patch


REPO_ROOT = Path(__file__).resolve().parents[1]
SKILL_SCRIPTS = REPO_ROOT / "plugins/xp-stack/skills/durable-host-runs/scripts"
if SKILL_SCRIPTS.is_dir():
    sys.path.insert(0, str(SKILL_SCRIPTS))
    import durable_run
else:
    durable_run = None


class FakeSystemctl:
    """Deterministic systemd boundary double; never invokes systemctl."""

    def __init__(self, *, expose_started_units: bool = True, confirm_stop: bool = True, collect_after_stop: bool = False):
        self.expose_started_units = expose_started_units
        self.confirm_stop = confirm_stop
        self.collect_after_stop = collect_after_stop
        self.preflight_error: Optional[Exception] = None
        self.preflight_calls = 0
        self.cancel_intent_at_stop: Optional[Path] = None
        self.intent_was_present_at_stop = False
        self.submissions: List[Tuple[str, str, List[str]]] = []
        self.stopped: List[str] = []
        self.units: Dict[str, Dict[str, str]] = {}
        self.known_units = set()
        self.inspect_calls = 0
        self.inspection_script: List[Optional[Dict[str, str]]] = []
        self._lock = threading.Lock()

    def preflight(self) -> None:
        self.preflight_calls += 1
        if self.preflight_error is not None:
            raise self.preflight_error

    def submit(self, unit: str, cwd: str, worker_argv: List[str]) -> None:
        with self._lock:
            self.submissions.append((unit, cwd, list(worker_argv)))
            if self.expose_started_units:
                self.known_units.add(unit)
                self.units[unit] = self._active()

    def inspect(self, unit: str) -> Optional[Dict[str, str]]:
        with self._lock:
            self.inspect_calls += 1
            if self.inspection_script:
                scripted = self.inspection_script.pop(0)
                return dict(scripted) if scripted is not None else None
            status = self.units.get(unit)
            if status is not None:
                return dict(status)
            if unit in self.known_units:
                return {
                    "load_state": "not-found",
                    "active_state": "inactive",
                    "sub_state": "dead",
                    "exec_main_code": "",
                    "exec_main_status": "",
                }
            return None

    def stop(self, unit: str) -> bool:
        with self._lock:
            self.stopped.append(unit)
            if self.cancel_intent_at_stop is not None:
                self.intent_was_present_at_stop = self.cancel_intent_at_stop.exists()
            if not self.confirm_stop:
                return False
            if self.collect_after_stop:
                self.units.pop(unit, None)
            elif unit in self.units:
                self.units[unit] = {
                    "load_state": "loaded",
                    "active_state": "inactive",
                    "sub_state": "dead",
                    "exec_main_code": "2",
                    "exec_main_status": "15",
                }
            return True

    def finish(self, unit: str, exit_code: int, *, main_code: str = "1") -> None:
        self.units[unit] = {
            "load_state": "loaded",
            "active_state": "inactive" if exit_code == 0 else "failed",
            "sub_state": "dead",
            "exec_main_code": main_code,
            "exec_main_status": str(exit_code),
        }

    @staticmethod
    def _active() -> Dict[str, str]:
        return {
            "load_state": "loaded",
            "active_state": "active",
            "sub_state": "running",
            "exec_main_code": "",
            "exec_main_status": "",
        }


class DurableHostRunsTest(unittest.TestCase):
    def setUp(self) -> None:
        if durable_run is None:
            self.fail("durable_run.py has not been implemented yet")
        self.temp_dir = tempfile.TemporaryDirectory(prefix="durable-host-runs-")
        self.addCleanup(self.temp_dir.cleanup)
        self.root = Path(self.temp_dir.name) / "state"
        self.cwd = Path(self.temp_dir.name)
        self.fake = FakeSystemctl()
        self.manager = durable_run.RunManager(state_dir=self.root, systemctl=self.fake)

    def submit(
        self,
        *,
        key: str = "candidate:test:pytest",
        candidate: str = "git:deadbeef",
        cwd: Optional[Path] = None,
        argv: Optional[List[str]] = None,
        owner: Optional[str] = None,
        resources: Optional[List[str]] = None,
    ) -> dict:
        metadata = {}
        if owner is not None:
            metadata["owner"] = owner
        if resources is not None:
            metadata["resources"] = resources
        return self.manager.submit(
            key=key,
            candidate=candidate,
            cwd=str(self.cwd if cwd is None else cwd),
            argv=argv or [sys.executable, "-c", "print('ok')"],
            **metadata,
        )

    def test_concurrent_identical_submits_start_only_one_unit(self) -> None:
        barrier = threading.Barrier(3)

        def submit_after_barrier() -> dict:
            barrier.wait(timeout=3)
            return self.submit()

        with ThreadPoolExecutor(max_workers=2) as pool:
            first = pool.submit(submit_after_barrier)
            second = pool.submit(submit_after_barrier)
            barrier.wait(timeout=3)
            results = [first.result(timeout=5), second.result(timeout=5)]

        self.assertEqual(len(self.fake.submissions), 1)
        self.assertEqual(self.fake.preflight_calls, 1)
        self.assertEqual(sum(result["created"] for result in results), 1)

    def test_default_registry_path_is_stable_across_shell_home_overrides(self) -> None:
        alternate_home = Path(self.temp_dir.name) / "alternate-home"
        alternate_state = Path(self.temp_dir.name) / "alternate-state"
        with patch.dict(os.environ, {"HOME": str(alternate_home), "XDG_STATE_HOME": str(alternate_state)}):
            manager = durable_run.RunManager(systemctl=self.fake)

        actual_home = Path(pwd.getpwuid(os.getuid()).pw_dir)
        self.assertEqual(manager.state_dir, actual_home / ".local/state/xp-stack/durable-host-runs")

    def test_same_key_with_different_candidate_is_rejected(self) -> None:
        first = self.submit()
        with self.assertRaises(durable_run.PayloadConflict):
            self.submit(candidate="git:cafebabe")
        self.assertEqual(len(self.fake.submissions), 1)
        self.assertEqual(Path(first["request_path"]).exists(), True)

    def test_same_key_with_different_cwd_is_rejected(self) -> None:
        first = self.submit()
        other_cwd = Path(self.temp_dir.name) / "other"
        other_cwd.mkdir()
        with self.assertRaises(durable_run.PayloadConflict):
            self.submit(cwd=other_cwd)
        self.assertEqual(len(self.fake.submissions), 1)
        self.assertEqual(Path(first["request_path"]).exists(), True)

    def test_same_key_with_different_argv_is_rejected(self) -> None:
        self.submit()
        with self.assertRaises(durable_run.PayloadConflict):
            self.submit(argv=[sys.executable, "-c", "print('different')"])
        self.assertEqual(len(self.fake.submissions), 1)

    def test_record_preserves_candidate_canonical_cwd_and_argv_boundaries(self) -> None:
        argv = [sys.executable, "-c", "import sys; print(sys.argv[1])", "two words"]
        result = self.submit(candidate="commit:123abc", argv=argv)
        request = json.loads(Path(result["request_path"]).read_text(encoding="utf-8"))

        self.assertEqual(request["candidate"], "commit:123abc")
        self.assertEqual(request["cwd"], str(self.cwd.resolve()))
        self.assertEqual(request["argv"], argv)
        self.assertIsInstance(request["argv"], list)

    def test_owner_and_resources_are_persisted_and_unchanged_for_handoff_status(self) -> None:
        key = "handoff:immutable-owner"
        with patch.dict(
            os.environ,
            {"TRAYCER_TASK_ID": "task-origin", "TRAYCER_AGENT_ID": "agent-origin"},
        ):
            submitted = self.submit(key=key, resources=["declared:cpu=2", "declared:ram=4g"])
        request = json.loads(Path(submitted["request_path"]).read_text(encoding="utf-8"))
        expected_owner = {
            "host": socket.gethostname(),
            "user": pwd.getpwuid(os.getuid()).pw_name,
            "traycer_task_id": "task-origin",
            "traycer_agent_id": "agent-origin",
        }
        self.assertEqual(request["owner"], expected_owner)
        self.assertEqual(request["resources"], ["declared:cpu=2", "declared:ram=4g"])

        observer = durable_run.RunManager(state_dir=self.root, systemctl=self.fake)
        with patch.dict(
            os.environ,
            {"TRAYCER_TASK_ID": "task-observer", "TRAYCER_AGENT_ID": "agent-observer"},
        ):
            status = observer.status(key)

        self.assertEqual(status["owner"], expected_owner)
        self.assertEqual(status["resources"], request["resources"])

    def test_explicit_owner_and_declared_resources_are_immutable_payload(self) -> None:
        first = self.submit(key="metadata:explicit", owner="pilot:rafael", resources=["cpu:2"])
        request = json.loads(Path(first["request_path"]).read_text(encoding="utf-8"))

        self.assertEqual(request["owner"], {"explicit": "pilot:rafael"})
        self.assertEqual(request["resources"], ["cpu:2"])
        with self.assertRaises(durable_run.PayloadConflict):
            self.submit(key="metadata:explicit", owner="agent:handoff", resources=["cpu:2"])
        with self.assertRaises(durable_run.PayloadConflict):
            self.submit(key="metadata:explicit", owner="pilot:rafael", resources=["cpu:4"])
        self.assertEqual(len(self.fake.submissions), 1)

    def test_submit_cli_persists_explicit_owner_and_repeated_resource_declarations(self) -> None:
        output = io.StringIO()
        with patch.object(durable_run, "RunManager", return_value=self.manager), patch("sys.stdout", output):
            exit_code = durable_run.main(
                [
                    "submit",
                    "--key",
                    "metadata:cli",
                    "--candidate",
                    "git:deadbeef",
                    "--cwd",
                    str(self.cwd),
                    "--owner",
                    "pilot:rafael",
                    "--resource",
                    "cpu:2",
                    "--resource",
                    "ram:4g",
                    "--",
                    sys.executable,
                    "-c",
                    "pass",
                ]
            )

        result = json.loads(output.getvalue())
        request = json.loads(Path(result["request_path"]).read_text(encoding="utf-8"))
        self.assertEqual(exit_code, 0)
        self.assertEqual(request["owner"], {"explicit": "pilot:rafael"})
        self.assertEqual(request["resources"], ["cpu:2", "ram:4g"])

    def test_nonzero_command_exit_is_written_to_receipt_and_status(self) -> None:
        result = self.submit(argv=[sys.executable, "-c", "print('captured'); raise SystemExit(23)"])
        request_before = Path(result["request_path"]).read_bytes()

        worker_exit = durable_run.run_worker(result["request_path"])
        self.fake.finish(result["unit"], 23)
        receipt = json.loads(Path(result["receipt_path"]).read_text(encoding="utf-8"))
        status = self.manager.status("candidate:test:pytest")

        self.assertEqual(worker_exit, 23)
        self.assertEqual(receipt["exit_code"], 23)
        self.assertEqual(status["exit_code"], 23)
        self.assertEqual(status["state"], "failed")
        self.assertIn(b"captured", Path(result["log_path"]).read_bytes())
        self.assertEqual(Path(result["request_path"]).read_bytes(), request_before)

    def test_worker_records_when_its_final_receipt_loses_an_existing_receipt_race(self) -> None:
        submitted = self.submit(argv=[sys.executable, "-c", "raise SystemExit(0)"])
        durable_run._write_json_once(
            Path(submitted["receipt_path"]),
            {
                "schema": 1,
                "exit_code": 23,
                "termination": "supervisor",
                "source": "systemd",
                "finished_at": "test",
            },
        )

        self.assertEqual(durable_run.run_worker(submitted["request_path"]), 0)
        events = [json.loads(line) for line in Path(submitted["events_path"]).read_text().splitlines()]
        conflicts = [event for event in events if event["event"] == "receipt_write_refused"]

        self.assertEqual(json.loads(Path(submitted["receipt_path"]).read_text())["exit_code"], 23)
        self.assertEqual(conflicts[-1]["worker_exit_code"], 0)
        self.assertEqual(conflicts[-1]["stored_exit_code"], 23)

    def test_receipt_does_not_confirm_tree_end_until_supervisor_is_terminal(self) -> None:
        submitted = self.submit(argv=[sys.executable, "-c", "raise SystemExit(0)"])
        self.assertEqual(durable_run.run_worker(submitted["request_path"]), 0)

        while_main_exiting = self.manager.status("candidate:test:pytest")

        self.assertEqual(while_main_exiting["state"], "stopping")
        self.assertFalse(while_main_exiting["supervisor_terminal"])
        self.fake.finish(submitted["unit"], 0)
        after_supervisor = self.manager.status("candidate:test:pytest")
        self.assertEqual(after_supervisor["state"], "completed")
        self.assertTrue(after_supervisor["supervisor_terminal"])

    def test_loaded_inactive_start_pending_state_does_not_seal_null_receipt(self) -> None:
        submitted = self.submit(argv=[sys.executable, "-c", "raise SystemExit(0)"])
        self.fake.units[submitted["unit"]] = {
            "load_state": "loaded",
            "active_state": "inactive",
            "sub_state": "dead",
            "exec_main_code": "0",
            "exec_main_status": "0",
        }

        early = self.manager.status("candidate:test:pytest")

        self.assertEqual(early["state"], "unknown")
        self.assertFalse(early["supervisor_terminal"])
        self.assertFalse(Path(submitted["receipt_path"]).exists())
        self.assertEqual(durable_run.run_worker(submitted["request_path"]), 0)
        self.fake.finish(submitted["unit"], 0)
        late = self.manager.status("candidate:test:pytest")
        receipt = json.loads(Path(submitted["receipt_path"]).read_text(encoding="utf-8"))
        self.assertEqual(late["state"], "completed")
        self.assertEqual(late["exit_code"], 0)
        self.assertEqual(receipt["source"], "worker")

    def test_cancel_signal_racing_after_command_exit_preserves_real_exit_code(self) -> None:
        submitted = self.submit()

        class CommandFinishedBeforeStopSignal:
            pid = 999999
            returncode = None

            def __init__(self) -> None:
                self.poll_calls = 0

            def poll(self) -> Optional[int]:
                self.poll_calls += 1
                return None if self.poll_calls == 1 else 0

            def wait(self, timeout: Optional[float] = None) -> int:
                self.returncode = 0
                signal.raise_signal(signal.SIGTERM)
                return 0

        with patch.object(durable_run.subprocess, "Popen", return_value=CommandFinishedBeforeStopSignal()):
            worker_exit = durable_run.run_worker(submitted["request_path"])
        receipt = json.loads(Path(submitted["receipt_path"]).read_text(encoding="utf-8"))

        self.assertEqual(worker_exit, 0)
        self.assertEqual(receipt["exit_code"], 0)
        self.assertEqual(receipt["termination"], "command")

    def test_sigterm_without_durable_cancel_intent_is_a_signal_failure(self) -> None:
        submitted = self.submit(argv=[sys.executable, "-c", "import time; time.sleep(10)"])
        timer = threading.Timer(0.1, lambda: os.kill(os.getpid(), signal.SIGTERM))
        timer.start()
        try:
            worker_exit = durable_run.run_worker(submitted["request_path"])
        finally:
            timer.cancel()
        receipt = json.loads(Path(submitted["receipt_path"]).read_text(encoding="utf-8"))

        self.assertEqual(worker_exit, 143)
        self.assertEqual(receipt["termination"], "signal")
        self.assertEqual(receipt["exit_code"], 143)
        self.assertFalse((Path(submitted["request_path"]).parent / "cancel.intent").exists())

    def test_sigterm_during_spawn_is_forwarded_to_child_process_group(self) -> None:
        marker = Path(self.temp_dir.name) / "child-handled-sigterm"
        ready = Path(self.temp_dir.name) / "child-ready"
        child_code = (
            "import pathlib,signal,sys,time\n"
            "def handle(signum, frame):\n"
            "    pathlib.Path({!r}).write_text('graceful')\n"
            "    sys.exit(0)\n"
            "signal.signal(signal.SIGTERM, handle)\n"
            "pathlib.Path({!r}).write_text('ready')\n"
            "time.sleep(30)\n"
        ).format(str(marker), str(ready))
        submitted = self.submit(argv=[sys.executable, "-c", child_code])
        intent = Path(submitted["request_path"]).parent / "cancel.intent"
        durable_run._write_json_once(
            intent,
            {"schema": 1, "key": submitted["key"], "unit": submitted["unit"], "requested_at": "test"},
            mode=0o400,
        )
        real_popen = durable_run.subprocess.Popen

        def popen_then_signal(*args, **kwargs):
            child = real_popen(*args, **kwargs)
            deadline = time.monotonic() + 2
            while not ready.exists() and time.monotonic() < deadline:
                time.sleep(0.005)
            if not ready.exists():
                raise AssertionError("child did not install SIGTERM handler before test signal")
            signal.raise_signal(signal.SIGTERM)
            return child

        with patch.object(durable_run.subprocess, "Popen", side_effect=popen_then_signal):
            worker_exit = durable_run.run_worker(submitted["request_path"])
        receipt = json.loads(Path(submitted["receipt_path"]).read_text(encoding="utf-8"))

        self.assertTrue(marker.exists())
        self.assertEqual(worker_exit, 143)
        self.assertEqual(receipt["termination"], "cancelled")

    def test_cancel_persists_intent_before_calling_supervisor(self) -> None:
        submitted = self.submit(key="cancel:intent")
        intent = Path(submitted["request_path"]).parent / "cancel.intent"
        self.fake.cancel_intent_at_stop = intent

        result = self.manager.cancel("cancel:intent")

        self.assertTrue(self.fake.intent_was_present_at_stop)
        self.assertEqual(stat.S_IMODE(intent.stat().st_mode), 0o400)
        self.assertTrue(result["confirmed"])

    def test_unknown_supervisor_state_does_not_resubmit_existing_key(self) -> None:
        self.fake.expose_started_units = False
        first = self.submit()
        repeated = self.submit()
        status = self.manager.status("candidate:test:pytest")

        self.assertEqual(first["created"], True)
        self.assertEqual(repeated["created"], False)
        self.assertEqual(repeated["state"], "unknown")
        self.assertEqual(status["state"], "unknown")
        self.assertEqual(len(self.fake.submissions), 1)
        self.assertEqual(self.fake.preflight_calls, 1)

    def test_supervisor_preflight_failure_does_not_register_or_burn_key(self) -> None:
        key = "candidate:preflight:test"
        self.fake.preflight_error = durable_run.SupervisorUnavailable("user bus unavailable")

        with self.assertRaises(durable_run.SupervisorUnavailable):
            self.submit(key=key)
        self.assertEqual(self.manager.status(key)["state"], "not_found")
        self.assertEqual(len(self.fake.submissions), 0)

        self.fake.preflight_error = None
        retry = self.submit(key=key)
        self.assertTrue(retry["created"])
        self.assertEqual(self.fake.preflight_calls, 2)
        self.assertEqual(len(self.fake.submissions), 1)

    def test_systemd_submission_keeps_terminal_evidence_loaded(self) -> None:
        supervisor = durable_run.SystemdSupervisor(script_path=Path("/opt/durable_run.py"))
        with patch.object(
            supervisor,
            "_run",
            return_value=subprocess.CompletedProcess(["systemd-run"], 0, "", ""),
        ) as run:
            supervisor.submit("xp-stack-run-deadbeef.service", str(self.cwd), [sys.executable, "worker"])

        command = run.call_args.args[0]
        self.assertIn("--user", command)
        self.assertIn("--no-block", command)
        self.assertNotIn("--collect", command)
        self.assertIn("--property=KillMode=mixed", command)

    def test_systemd_preflight_checks_user_manager_without_registering_a_unit(self) -> None:
        supervisor = durable_run.SystemdSupervisor()
        with patch.object(shutil, "which", return_value="/usr/bin/systemctl"), patch.object(
            supervisor,
            "_run",
            return_value=subprocess.CompletedProcess(["systemctl"], 0, "PATH=/usr/bin\n", ""),
        ) as run:
            supervisor.preflight()

        self.assertEqual(run.call_args.args[0], ["systemctl", "--user", "show-environment"])

    def test_systemd_preflight_rejects_missing_systemd_run_before_registering(self) -> None:
        supervisor = durable_run.SystemdSupervisor()
        with patch.object(
            shutil,
            "which",
            side_effect=lambda executable: "/usr/bin/systemctl" if executable == "systemctl" else None,
        ), patch.object(
            supervisor,
            "_run",
            return_value=subprocess.CompletedProcess(["systemctl"], 0, "", ""),
        ) as run:
            with self.assertRaises(durable_run.SupervisorUnavailable):
                supervisor.preflight()

        run.assert_not_called()

    def test_systemd_inspect_parses_terminal_code_and_not_found_load_state(self) -> None:
        supervisor = durable_run.SystemdSupervisor()
        output = "LoadState=not-found\nActiveState=inactive\nSubState=dead\nExecMainCode=0\nExecMainStatus=0\n"
        with patch.object(
            supervisor,
            "_run",
            return_value=subprocess.CompletedProcess(["systemctl"], 0, output, ""),
        ):
            snapshot = supervisor.inspect("xp-stack-run-deadbeef.service")

        self.assertEqual(snapshot["load_state"], "not-found")
        self.assertEqual(snapshot["active_state"], "inactive")
        self.assertEqual(snapshot["exec_main_code"], "0")
        self.assertNotIn("result", snapshot)

        with patch.object(
            supervisor,
            "_run",
            return_value=subprocess.CompletedProcess(
                ["systemctl"], 1, "", "Unit xp-stack-run-deadbeef.service could not be found."
            ),
        ):
            missing = supervisor.inspect("xp-stack-run-deadbeef.service")
        self.assertIsNone(missing)

    def test_not_found_default_snapshot_does_not_confirm_an_unstarted_unit(self) -> None:
        submitted = self.submit(key="show:not-found-default")
        self.fake.units[submitted["unit"]] = {
            "load_state": "not-found",
            "active_state": "inactive",
            "sub_state": "dead",
            "exec_main_code": "0",
            "exec_main_status": "0",
        }

        status = self.manager.status("show:not-found-default")

        self.assertEqual(status["state"], "unknown")
        self.assertFalse(status["supervisor_terminal"])
        self.assertFalse(Path(status["receipt_path"]).exists())

    def test_cancel_does_not_confirm_termination_when_supervisor_query_is_unavailable(self) -> None:
        class UnobservableAfterStop(FakeSystemctl):
            unavailable = False

            def stop(self, unit: str) -> bool:
                self.stopped.append(unit)
                self.unavailable = True
                return True

            def inspect(self, unit: str) -> Optional[Dict[str, str]]:
                if self.unavailable:
                    self.inspect_calls += 1
                    return None
                return super().inspect(unit)

        supervisor = UnobservableAfterStop()
        self.manager = durable_run.RunManager(state_dir=self.root, systemctl=supervisor)
        self.submit(key="cancel:query-unavailable")

        result = self.manager.cancel("cancel:query-unavailable")

        self.assertEqual(supervisor.stopped, ["xp-stack-run-{}".format(durable_run._key_digest("cancel:query-unavailable")) + ".service"])
        self.assertFalse(result["confirmed"])
        self.assertFalse(result["supervisor_terminal"])
        self.assertEqual(result["state"], "unknown")

    def test_systemd_exec_failure_codes_are_supervisor_failures_not_signals(self) -> None:
        for status_code in (200, 203):
            with self.subTest(status_code=status_code):
                receipt = durable_run.RunManager._receipt_from_supervisor(
                    {"exec_main_code": "exited", "exec_main_status": str(status_code)},
                    cancel_requested=True,
                )

                self.assertEqual(receipt["exit_code"], status_code)
                self.assertEqual(receipt["termination"], "supervisor_error")

    def test_systemd_sigterm_exit_is_signal_without_cancel_intent(self) -> None:
        snapshot = {"exec_main_code": "1", "exec_main_status": "143"}

        external_signal = durable_run.RunManager._receipt_from_supervisor(snapshot, cancel_requested=False)
        requested_cancel = durable_run.RunManager._receipt_from_supervisor(snapshot, cancel_requested=True)

        self.assertEqual(external_signal["termination"], "signal")
        self.assertEqual(external_signal["exit_code"], 143)
        self.assertEqual(requested_cancel["termination"], "cancelled")

    def test_worker_exception_persists_event_and_failure_receipt(self) -> None:
        submitted = self.submit(key="worker:failure")
        append_event = durable_run._append_event

        def fail_on_start(job_dir: Path, event: str, **details: object) -> None:
            if event == "started":
                raise RuntimeError("worker setup failed")
            append_event(job_dir, event, **details)

        with patch.object(durable_run, "_append_event", side_effect=fail_on_start):
            worker_exit = durable_run.main(["worker", "--request", submitted["request_path"]])

        events = [json.loads(line) for line in Path(submitted["events_path"]).read_text().splitlines()]
        receipt = json.loads(Path(submitted["receipt_path"]).read_text(encoding="utf-8"))
        self.assertEqual(worker_exit, 70)
        self.assertIn("worker_failed", [event["event"] for event in events])
        self.assertEqual(receipt["exit_code"], 70)
        self.assertEqual(receipt["termination"], "worker_error")
        self.fake.finish(submitted["unit"], 70)
        self.assertEqual(self.manager.status("worker:failure")["state"], "failed")

    def test_supervisor_failure_persists_receipt_and_terminal_event_after_worker_loss(self) -> None:
        submitted = self.submit(key="worker:killed")
        self.fake.finish(submitted["unit"], 9, main_code="2")

        status = self.manager.status("worker:killed")
        events = [json.loads(line) for line in Path(submitted["events_path"]).read_text().splitlines()]
        receipt = json.loads(Path(submitted["receipt_path"]).read_text(encoding="utf-8"))
        terminal_events = [event for event in events if event["event"] == "supervisor_receipt"]

        self.assertEqual(status["state"], "failed")
        self.assertEqual(status["exit_code"], 137)
        self.assertEqual(receipt["exit_code"], 137)
        self.assertEqual(receipt["termination"], "signal")
        self.assertEqual(terminal_events[-1]["exit_code"], 137)
        self.assertEqual(terminal_events[-1]["termination"], "signal")

    def test_cancel_stops_only_the_unit_for_the_requested_key(self) -> None:
        target = self.submit(key="cancel:target")
        other = self.submit(key="cancel:other")

        cancelled = self.manager.cancel("cancel:target")

        self.assertEqual(cancelled["confirmed"], True)
        self.assertEqual(self.fake.stopped, [target["unit"]])
        self.assertNotEqual(target["unit"], other["unit"])
        self.assertEqual(self.fake.inspect(other["unit"])["active_state"], "active")
        self.assertEqual(self.manager.status("cancel:target")["state"], "cancelled")

    def test_cancel_rereads_receipt_when_natural_finish_wins_stop_race(self) -> None:
        class StopAfterNaturalEnd(FakeSystemctl):
            request_path = ""

            def stop(self, unit: str) -> bool:
                durable_run.run_worker(self.request_path)
                self.units.pop(unit, None)
                self.stopped.append(unit)
                return False

        self.fake = StopAfterNaturalEnd()
        self.manager = durable_run.RunManager(state_dir=self.root, systemctl=self.fake)
        submitted = self.submit(key="cancel:natural-race", argv=[sys.executable, "-c", "raise SystemExit(0)"])
        self.fake.request_path = submitted["request_path"]

        result = self.manager.cancel("cancel:natural-race")

        self.assertEqual(result["state"], "completed")
        self.assertEqual(result["exit_code"], 0)
        self.assertTrue(result["confirmed"])
        self.assertTrue(result["already_finished"])

    def test_cancel_confirms_sync_supervisor_stop_when_unit_is_collected(self) -> None:
        self.fake.collect_after_stop = True
        submitted = self.submit(key="cancel:collected")
        durable_run._append_event(
            Path(submitted["request_path"]).parent,
            "started",
            unit=submitted["unit"],
        )

        cancelled = self.manager.cancel("cancel:collected")

        self.assertEqual(self.fake.stopped, [submitted["unit"]])
        self.assertEqual(self.fake.inspect(submitted["unit"])["load_state"], "not-found")
        self.assertEqual(cancelled["confirmed"], True)
        self.assertEqual(cancelled["state"], "unknown")
        self.assertEqual(cancelled["exit_code"], None)
        self.assertEqual(cancelled["supervisor_terminal"], True)
        self.assertFalse(Path(cancelled["receipt_path"]).exists())

    def test_cancel_confirmed_event_uses_receipt_that_won_race(self) -> None:
        class StopWritesReceipt(FakeSystemctl):
            receipt_path = ""

            def stop(self, unit: str) -> bool:
                durable_run._write_json_once(
                    Path(self.receipt_path),
                    {
                        "schema": 1,
                        "exit_code": 143,
                        "termination": "cancelled",
                        "source": "worker",
                        "finished_at": "test",
                    },
                )
                self.units.pop(unit, None)
                self.stopped.append(unit)
                return True

        self.fake = StopWritesReceipt()
        self.manager = durable_run.RunManager(state_dir=self.root, systemctl=self.fake)
        submitted = self.submit(key="cancel:receipt-race")
        self.fake.receipt_path = submitted["receipt_path"]
        # A real worker persists this before it can write its final receipt.
        durable_run._append_event(
            Path(submitted["request_path"]).parent,
            "started",
            unit=submitted["unit"],
        )

        result = self.manager.cancel("cancel:receipt-race")
        events = [json.loads(line) for line in Path(submitted["events_path"]).read_text().splitlines()]
        confirmed = [event for event in events if event["event"] == "cancel_confirmed"]

        self.assertTrue(result["confirmed"])
        self.assertEqual(result["exit_code"], 143)
        self.assertEqual(confirmed[-1]["exit_code"], 143)

    def test_cancel_is_not_reported_as_success_while_unit_remains_active(self) -> None:
        self.fake.confirm_stop = False
        submitted = self.submit(key="cancel:unconfirmed")

        cancelled = self.manager.cancel("cancel:unconfirmed")

        self.assertEqual(self.fake.stopped, [submitted["unit"]])
        self.assertEqual(cancelled["confirmed"], False)
        self.assertEqual(cancelled["state"], "running")

    def test_follow_reads_persisted_lifecycle_events(self) -> None:
        submitted = self.submit(argv=[sys.executable, "-c", "print('done')"])
        self.assertEqual(durable_run.run_worker(submitted["request_path"]), 0)
        self.fake.finish(submitted["unit"], 0)

        events = list(self.manager.follow("candidate:test:pytest", poll_interval=0))
        names = [event["event"] for event in events]

        self.assertIn("registered", names)
        self.assertIn("enqueue_confirmed", names)
        self.assertIn("started", names)
        self.assertIn("finished", names)
        self.assertEqual(names[-1], "follow_finished")

    def test_follow_drains_worker_events_written_during_terminal_status_check(self) -> None:
        submitted = self.submit(argv=[sys.executable, "-c", "raise SystemExit(0)"])
        real_status = self.manager.status

        def finish_during_status(key: str) -> dict:
            durable_run.run_worker(submitted["request_path"])
            self.fake.finish(submitted["unit"], 0)
            return real_status(key)

        self.manager.status = finish_during_status
        events = list(self.manager.follow("candidate:test:pytest", poll_interval=0))
        names = [event["event"] for event in events]

        self.assertIn("started", names)
        self.assertIn("command_exited", names)
        self.assertIn("finished", names)
        self.assertEqual(names[-1], "follow_finished")
        self.assertEqual(events[-1]["state"], "completed")

    def test_follow_reports_unknown_once_without_busy_polling(self) -> None:
        self.fake.expose_started_units = False
        submitted = self.submit(key="follow:unknown")
        before = self.fake.inspect_calls
        delays: List[float] = []

        with patch.object(durable_run.time, "sleep", side_effect=lambda delay: delays.append(delay)):
            events = list(self.manager.follow("follow:unknown", poll_interval=0.01))

        self.assertEqual(self.fake.inspect_calls - before, 3)
        self.assertEqual(events[-1]["event"], "follow_finished")
        self.assertEqual(events[-1]["state"], "unknown")
        self.assertEqual(events[-1]["unit"], submitted["unit"])
        self.assertFalse(events[-1]["supervisor_terminal"])
        self.assertEqual(len(delays), 2)
        self.assertGreaterEqual(min(delays), 0.25)
        self.assertEqual(len(self.fake.submissions), 1)

    def test_follow_retries_one_transient_unknown_with_a_minimum_delay(self) -> None:
        submitted = self.submit(key="follow:transient-unknown")
        self.fake.inspection_script = [
            None,
            self.fake._active(),
            {
                "load_state": "loaded",
                "active_state": "inactive",
                "sub_state": "dead",
                "exec_main_code": "1",
                "exec_main_status": "0",
            },
        ]
        before = self.fake.inspect_calls
        delays: List[float] = []

        with patch.object(durable_run.time, "sleep", side_effect=lambda delay: delays.append(delay)):
            events = list(self.manager.follow("follow:transient-unknown", poll_interval=0))

        self.assertEqual(events[-1]["event"], "follow_finished")
        self.assertEqual(events[-1]["state"], "completed")
        self.assertEqual(self.fake.inspect_calls - before, 3)
        self.assertTrue(delays)
        self.assertGreaterEqual(min(delays), 0.25)
        self.assertEqual(len(self.fake.submissions), 1)
        self.assertEqual(submitted["unit"], events[-1]["unit"])

    def test_follow_unknown_budget_exhaustion_is_bounded_and_does_not_resubmit(self) -> None:
        submitted = self.submit(key="follow:unknown-budget")
        self.fake.inspection_script = [None] * 10
        before = self.fake.inspect_calls
        delays: List[float] = []

        def bounded_sleep(delay: float) -> None:
            delays.append(delay)
            if len(delays) > 2:
                raise AssertionError("follow exceeded its unknown observation budget")

        with patch.object(durable_run.time, "sleep", side_effect=bounded_sleep):
            events = list(self.manager.follow("follow:unknown-budget", poll_interval=0))

        self.assertEqual(self.fake.inspect_calls - before, 3)
        self.assertEqual(events[-1]["event"], "follow_finished")
        self.assertEqual(events[-1]["state"], "unknown")
        self.assertFalse(events[-1]["supervisor_terminal"])
        self.assertEqual(len(delays), 2)
        self.assertGreaterEqual(min(delays), 0.25)
        self.assertEqual(len(self.fake.submissions), 1)
        self.assertEqual(submitted["unit"], events[-1]["unit"])

    def test_follow_cli_returns_nonzero_and_prints_unknown_terminal_event(self) -> None:
        self.fake.expose_started_units = False
        self.submit(key="follow:cli-unknown")
        output = io.StringIO()

        with patch.object(durable_run, "RunManager", return_value=self.manager), patch("sys.stdout", output), patch.object(
            durable_run.time, "sleep", return_value=None
        ):
            exit_code = durable_run.main(["follow", "--key", "follow:cli-unknown", "--poll-seconds", "0"])

        lines = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual(exit_code, 6)
        self.assertEqual(lines[-1]["event"], "follow_finished")
        self.assertEqual(lines[-1]["state"], "unknown")

    def test_state_records_logs_events_and_receipt_are_private_and_persist(self) -> None:
        submitted = self.submit(argv=[sys.executable, "-c", "raise SystemExit(0)"])
        request_path = Path(submitted["request_path"])
        request_before = request_path.read_bytes()
        self.assertEqual(durable_run.run_worker(request_path), 0)

        job_dir = request_path.parent
        private_paths = [
            self.root,
            self.root / "jobs",
            job_dir,
            self.root / "registry.lock",
            request_path,
            job_dir / "events.jsonl",
            Path(submitted["log_path"]),
            Path(submitted["receipt_path"]),
        ]
        expected_modes = [0o700, 0o700, 0o700, 0o600, 0o400, 0o600, 0o600, 0o400]
        self.assertEqual(len(private_paths), len(expected_modes))
        for path, expected in zip(private_paths, expected_modes):
            with self.subTest(path=path):
                self.assertEqual(stat.S_IMODE(path.stat().st_mode), expected)
                self.assertTrue(path.exists())
        self.assertEqual(request_path.read_bytes(), request_before)


if __name__ == "__main__":
    unittest.main(verbosity=2)
