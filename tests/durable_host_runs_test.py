"""Unit tests for the opt-in durable-host-runs skill (stdlib only)."""

from __future__ import annotations

import json
import os
from pathlib import Path
import signal
import stat
import sys
import tempfile
import threading
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
        self.submissions: List[Tuple[str, str, List[str]]] = []
        self.stopped: List[str] = []
        self.units: Dict[str, Dict[str, str]] = {}
        self._lock = threading.Lock()

    def submit(self, unit: str, cwd: str, worker_argv: List[str]) -> None:
        with self._lock:
            self.submissions.append((unit, cwd, list(worker_argv)))
            if self.expose_started_units:
                self.units[unit] = self._active()

    def inspect(self, unit: str) -> Optional[Dict[str, str]]:
        with self._lock:
            status = self.units.get(unit)
            return None if status is None else dict(status)

    def stop(self, unit: str) -> bool:
        with self._lock:
            self.stopped.append(unit)
            if not self.confirm_stop:
                return False
            if self.collect_after_stop:
                self.units.pop(unit, None)
            elif unit in self.units:
                self.units[unit] = {
                    "load_state": "loaded",
                    "active_state": "inactive",
                    "sub_state": "dead",
                    "result": "success",
                    "exec_main_code": "2",
                    "exec_main_status": "15",
                }
            return True

    @staticmethod
    def _active() -> Dict[str, str]:
        return {
            "load_state": "loaded",
            "active_state": "active",
            "sub_state": "running",
            "result": "",
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

    def submit(self, *, key: str = "candidate:test:pytest", candidate: str = "git:deadbeef", cwd: Optional[Path] = None, argv: Optional[List[str]] = None) -> dict:
        return self.manager.submit(
            key=key,
            candidate=candidate,
            cwd=str(self.cwd if cwd is None else cwd),
            argv=argv or [sys.executable, "-c", "print('ok')"],
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
        self.assertEqual(sum(result["created"] for result in results), 1)

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

    def test_nonzero_command_exit_is_written_to_receipt_and_status(self) -> None:
        result = self.submit(argv=[sys.executable, "-c", "print('captured'); raise SystemExit(23)"])
        request_before = Path(result["request_path"]).read_bytes()

        worker_exit = durable_run.run_worker(result["request_path"])
        receipt = json.loads(Path(result["receipt_path"]).read_text(encoding="utf-8"))
        status = self.manager.status("candidate:test:pytest")

        self.assertEqual(worker_exit, 23)
        self.assertEqual(receipt["exit_code"], 23)
        self.assertEqual(status["exit_code"], 23)
        self.assertEqual(status["state"], "failed")
        self.assertIn(b"captured", Path(result["log_path"]).read_bytes())
        self.assertEqual(Path(result["request_path"]).read_bytes(), request_before)

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

    def test_cancel_stops_only_the_unit_for_the_requested_key(self) -> None:
        target = self.submit(key="cancel:target")
        other = self.submit(key="cancel:other")

        cancelled = self.manager.cancel("cancel:target")

        self.assertEqual(cancelled["confirmed"], True)
        self.assertEqual(self.fake.stopped, [target["unit"]])
        self.assertNotEqual(target["unit"], other["unit"])
        self.assertEqual(self.fake.inspect(other["unit"])["active_state"], "active")
        self.assertEqual(self.manager.status("cancel:target")["state"], "cancelled")

    def test_cancel_confirms_sync_supervisor_stop_when_unit_is_collected(self) -> None:
        self.fake.collect_after_stop = True
        submitted = self.submit(key="cancel:collected")

        cancelled = self.manager.cancel("cancel:collected")

        self.assertEqual(self.fake.stopped, [submitted["unit"]])
        self.assertEqual(self.fake.inspect(submitted["unit"]), None)
        self.assertEqual(cancelled["confirmed"], True)
        self.assertEqual(cancelled["state"], "cancelled")
        self.assertEqual(cancelled["exit_code"], None)
        self.assertTrue(Path(cancelled["receipt_path"]).exists())

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

        events = list(self.manager.follow("candidate:test:pytest", poll_interval=0))
        names = [event["event"] for event in events]

        self.assertIn("submitted", names)
        self.assertIn("started", names)
        self.assertIn("finished", names)

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
