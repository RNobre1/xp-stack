"""Local-only tests for the opt-in Jev shadow-triage skill."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch


SKILL_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL_DIR))
try:
    import jev_triage
except ModuleNotFoundError as error:
    if error.name != "jev_triage":
        raise
    jev_triage = None


NOW = datetime(2026, 10, 11, 12, 0, tzinfo=timezone.utc)
CATEGORIES = ("environment", "contract", "behavior", "timing", "inconclusive")


def make_case(symptom_codes: list[str], *, case_id: str = "synthetic-case-01") -> object:
    return jev_triage.parse_case(
        {
            "case_id": case_id,
            "synthetic": True,
            "symptom_codes": symptom_codes,
        }
    )


def make_config(ledger_path: Path, limit_nano_usd: int | None = None, timeout: float = 1.0) -> object:
    return jev_triage.BudgetConfig(
        monthly_limit_nano_usd=limit_nano_usd or jev_triage.RESERVATION_NANO_USD * 4,
        ledger_path=ledger_path,
        timeout_seconds=timeout,
    )


def response_body(
    category: str = "contract",
    *,
    model: str | None = None,
    input_tokens: object = 1000,
    output_tokens: object = 24,
) -> dict:
    probabilities = {item: (1.0 if item == category else 0.0) for item in CATEGORIES}
    return {
        "model": model or jev_triage.MODEL_ID,
        "answers": {
            "category": {
                "type": "choice",
                "choice": category,
                "confidence": 1.0,
                "probabilities": probabilities,
            }
        },
        "usage": {"input_tokens": input_tokens, "output_tokens": output_tokens},
    }


class LocalJevServer:
    """A loopback HTTP double; tests never contact TypeSafe."""

    def __init__(
        self,
        body: dict,
        *,
        status: int = 200,
        delay_seconds: float = 0,
        on_request=None,
    ) -> None:
        self.body = json.dumps(body).encode("utf-8")
        self.status = status
        self.delay_seconds = delay_seconds
        self.on_request = on_request
        self.requests: list[dict] = []
        self._requests_lock = threading.Lock()
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                length = int(self.headers.get("Content-Length", "0"))
                raw_body = self.rfile.read(length)
                with outer._requests_lock:
                    outer.requests.append(
                        {
                            "path": self.path,
                            "headers": dict(self.headers.items()),
                            "body": raw_body,
                        }
                    )
                if outer.on_request is not None:
                    outer.on_request()
                if outer.delay_seconds:
                    time.sleep(outer.delay_seconds)
                self.send_response(outer.status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(outer.body)))
                self.end_headers()
                try:
                    self.wfile.write(outer.body)
                except OSError:
                    # A timeout test closes the client socket before this write.
                    pass

            def log_message(self, _format: str, *_args: object) -> None:
                return

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.server.daemon_threads = True
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    @property
    def endpoint(self) -> str:
        host, port = self.server.server_address[:2]
        return f"http://{host}:{port}/v1/systemone"

    def __enter__(self) -> "LocalJevServer":
        self.thread.start()
        return self

    def __exit__(self, *_args: object) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)


class StubClient:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def evaluate(self, state: dict, api_key: str, timeout_seconds: float) -> dict:
        self.calls.append(
            {"state": state, "api_key": api_key, "timeout_seconds": timeout_seconds}
        )
        return {"category": "contract", "input_tokens": 1000, "output_tokens": 24}


class JevTriageTests(unittest.TestCase):
    def setUp(self) -> None:
        if jev_triage is None:
            self.fail("jev_triage.py has not been implemented yet")
        self.temp = tempfile.TemporaryDirectory(prefix="jev-triage-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.ledger_path = self.root / "private-state" / "ledger.json"

    def test_clear_environment_signal_returns_rule_without_network_or_budget(self) -> None:
        case = make_case(["module_missing"])
        client = StubClient()

        result = jev_triage.triage_case(
            case, config=None, api_key=None, client=client, now=NOW
        )

        self.assertEqual(result.category, "environment")
        self.assertEqual(result.origin, "rule")
        self.assertFalse(result.inconclusive)
        self.assertEqual(client.calls, [])
        self.assertFalse(self.ledger_path.exists())
        encoded = result.to_dict()
        self.assertNotIn("cause", encoded)
        self.assertNotIn("passed", encoded)
        self.assertIn("schema", encoded["version"])

    def test_conflicting_signals_use_only_explicit_local_jev_request(self) -> None:
        case = make_case(["module_missing", "timeout"])
        config = make_config(self.ledger_path)
        with LocalJevServer(response_body("environment")) as server:
            client = jev_triage.JevClient(endpoint=server.endpoint)
            result = jev_triage.triage_case(
                case,
                config=config,
                api_key="local-test-key",
                client=client,
                now=NOW,
            )

        self.assertEqual(result.origin, "jev")
        self.assertEqual(result.category, "environment")
        self.assertFalse(result.inconclusive)
        self.assertEqual(result.to_dict()["version"]["model"], jev_triage.MODEL_ID)
        self.assertEqual(len(server.requests), 1)
        request = server.requests[0]
        self.assertEqual(request["path"], "/v1/systemone")
        self.assertEqual(request["headers"]["Authorization"], "Bearer local-test-key")
        payload = json.loads(request["body"])
        self.assertEqual(payload["model"], "jev-1.13.0")
        self.assertEqual(payload["state"], {
            "synthetic": True,
            "symptoms": [
                {"code": "module_missing", "description": jev_triage.SYMPTOM_CODES["module_missing"]["description"]},
                {"code": "timeout", "description": jev_triage.SYMPTOM_CODES["timeout"]["description"]},
            ],
        })
        self.assertEqual(payload["questions"]["category"]["type"], "choice")
        self.assertNotIn("case_id", payload)
        self.assertNotIn("case_id", payload["state"])
        self.assertNotIn("summary", payload["state"])
        self.assertNotIn("signals", payload["state"])
        self.assertNotIn("local-test-key", json.dumps(result.to_dict()))

    def test_http_mock_endpoint_cannot_be_redirected_to_an_external_host(self) -> None:
        with self.assertRaises(ValueError):
            jev_triage.JevClient(endpoint="http://example.invalid/v1/systemone")

    def test_missing_key_falls_back_before_creating_ledger_or_lock(self) -> None:
        case = make_case(["no_diagnostic"])
        client = StubClient()

        result = jev_triage.triage_case(
            case,
            config=make_config(self.ledger_path),
            api_key=None,
            client=client,
            now=NOW,
        )

        self.assertEqual(result.category, "inconclusive")
        self.assertEqual(result.origin, "fallback")
        self.assertTrue(result.inconclusive)
        self.assertEqual(result.reason_code, "missing_api_key")
        self.assertEqual(client.calls, [])
        self.assertFalse(self.ledger_path.exists())
        self.assertFalse(self.ledger_path.with_suffix(".json.lock").exists())

    def test_cli_does_not_fall_back_to_other_secret_environment_variables(self) -> None:
        case_path = self.root / "selected-case.json"
        case_path.write_text(
            json.dumps(
                {
                    "case_id": "synthetic-cli-auth",
                    "synthetic": True,
                    "symptom_codes": ["no_diagnostic"],
                }
            ),
            encoding="utf-8",
        )
        config_path = self.root / "explicit-budget.json"
        config_path.write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "monthly_budget_usd": "0.1",
                    "ledger_path": str(self.ledger_path),
                    "timeout_seconds": 1,
                }
            ),
            encoding="utf-8",
        )
        client = StubClient()

        with patch.dict(
            jev_triage.os.environ,
            {"ANTHROPIC_API_KEY": "decoy-secret", "OPENAI_API_KEY": "decoy-secret"},
            clear=True,
        ), patch.object(jev_triage, "JevClient", return_value=client) as client_factory:
            result = jev_triage._cli_result(case_path, config_path)

        self.assertEqual(result.reason_code, "missing_api_key")
        self.assertEqual(client_factory.call_count, 0)
        self.assertEqual(client.calls, [])
        self.assertFalse(self.ledger_path.exists())

    def test_cli_writes_structured_suggestion_only_to_explicit_sidecar(self) -> None:
        case_path = self.root / "selected-synthetic-case.json"
        case_path.write_text(
            json.dumps(
                {
                    "case_id": "synthetic-sidecar",
                    "synthetic": True,
                    "symptom_codes": ["no_diagnostic"],
                }
            ),
            encoding="utf-8",
        )
        suggestion_path = self.root / "synthetic-sidecar.jev-suggestion.json"
        stdout = io.StringIO()
        stderr = io.StringIO()

        with patch.dict(jev_triage.os.environ, {}, clear=True), redirect_stdout(stdout), redirect_stderr(stderr):
            try:
                exit_code = jev_triage.main(
                    ["--case", str(case_path), "--suggestion-out", str(suggestion_path)]
                )
            except SystemExit as error:
                exit_code = error.code

        self.assertEqual(exit_code, 0)
        self.assertEqual(stdout.getvalue(), "")
        self.assertEqual(stderr.getvalue(), "")
        self.assertTrue(suggestion_path.is_file())
        self.assertEqual(suggestion_path.stat().st_mode & 0o777, 0o600)
        result = json.loads(suggestion_path.read_text(encoding="utf-8"))
        self.assertEqual(result["origin"], "fallback")
        self.assertEqual(result["category"], "inconclusive")
        self.assertTrue(result["inconclusive"])
        self.assertNotIn("case_id", result)
        self.assertNotIn("symptom_codes", result)

    def test_cli_refuses_to_overwrite_existing_suggestion_file(self) -> None:
        case_path = self.root / "selected-synthetic-case.json"
        case_path.write_text(
            json.dumps(
                {
                    "case_id": "synthetic-no-overwrite",
                    "synthetic": True,
                    "symptom_codes": ["no_diagnostic"],
                }
            ),
            encoding="utf-8",
        )
        suggestion_path = self.root / "existing.jev-suggestion.json"
        original = b"preserve-existing-suggestion\n"
        suggestion_path.write_bytes(original)

        with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            try:
                exit_code = jev_triage.main(
                    ["--case", str(case_path), "--suggestion-out", str(suggestion_path)]
                )
            except SystemExit as error:
                exit_code = error.code

        self.assertNotEqual(exit_code, 0)
        self.assertEqual(suggestion_path.read_bytes(), original)

    def test_cli_rejects_suggestion_inside_checkout(self) -> None:
        case_path = self.root / "selected-synthetic-case.json"
        case_path.write_text(
            json.dumps(
                {
                    "case_id": "synthetic-inside-checkout",
                    "synthetic": True,
                    "symptom_codes": ["no_diagnostic"],
                }
            ),
            encoding="utf-8",
        )
        in_checkout = Path.cwd() / "plugins/xp-stack/skills/jev-triage/should-not-be-created.json"

        with patch.dict(jev_triage.os.environ, {}, clear=True), redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            try:
                exit_code = jev_triage.main(
                    ["--case", str(case_path), "--suggestion-out", str(in_checkout)]
                )
            except SystemExit as error:
                exit_code = error.code

        self.assertNotEqual(exit_code, 0)
        self.assertFalse(in_checkout.exists())

    def test_budget_config_is_explicit_and_rejects_auto_recharge_fields(self) -> None:
        config_path = self.root / "explicit-budget.json"
        config = {
            "schema_version": 1,
            "monthly_budget_usd": "0.25",
            "ledger_path": str(self.ledger_path),
            "timeout_seconds": 5,
            "auto_recharge": True,
        }
        config_path.write_text(json.dumps(config), encoding="utf-8")

        with self.assertRaises(jev_triage.ConfigError):
            jev_triage.load_budget_config(config_path)
        self.assertFalse(self.ledger_path.exists())

        config.pop("auto_recharge")
        config_path.write_text(json.dumps(config), encoding="utf-8")
        loaded = jev_triage.load_budget_config(config_path)
        self.assertEqual(loaded.monthly_limit_nano_usd, 250_000_000)
        self.assertEqual(loaded.ledger_path, self.ledger_path.resolve())

    def test_case_requires_explicit_synthetic_allowlisted_codes(self) -> None:
        base = {
            "case_id": "synthetic-case-02",
            "synthetic": True,
            "symptom_codes": ["no_diagnostic"],
        }
        for invalid in (
            {**base, "synthetic": False},
            {**base, "raw_transcript": "must never be accepted"},
            {**base, "summary": "arbitrary free text is not allowed"},
            {**base, "symptom_codes": ["arbitrary-private-text"]},
            {key: value for key, value in base.items() if key != "synthetic"},
        ):
            with self.subTest(invalid=invalid):
                with self.assertRaises(jev_triage.InputError):
                    jev_triage.parse_case(invalid)

    def test_too_many_symptom_codes_are_refused_before_remote_call(self) -> None:
        data = {
            "case_id": "synthetic-case-big",
            "synthetic": True,
            "symptom_codes": [
                "module_missing",
                "timeout",
                "schema_field_missing",
                "unexpected_value",
                "no_diagnostic",
            ],
        }

        with self.assertRaises(jev_triage.InputError):
            jev_triage.parse_case(data)
        self.assertFalse(self.ledger_path.exists())

    def test_exhausted_budget_does_not_send_or_change_ledger(self) -> None:
        reservation = jev_triage.RESERVATION_NANO_USD
        ledger = jev_triage.BudgetLedger(
            self.ledger_path, monthly_limit_nano_usd=reservation
        )
        self.assertEqual(ledger.reserve("synthetic-used", now=NOW).status, "reserved")
        before = self.ledger_path.read_bytes()
        client = StubClient()

        result = jev_triage.triage_case(
            make_case(["no_diagnostic"], case_id="synthetic-new"),
            config=make_config(self.ledger_path, limit_nano_usd=reservation),
            api_key="local-test-key",
            client=client,
            now=NOW,
        )

        self.assertEqual(result.reason_code, "budget_exhausted")
        self.assertTrue(result.inconclusive)
        self.assertEqual(client.calls, [])
        self.assertEqual(self.ledger_path.read_bytes(), before)

    def test_concurrent_reservations_stay_within_monthly_limit(self) -> None:
        reservation = jev_triage.RESERVATION_NANO_USD
        allowed = 4
        ledger = jev_triage.BudgetLedger(
            self.ledger_path,
            monthly_limit_nano_usd=reservation * allowed,
        )
        barrier = threading.Barrier(12)

        def reserve(index: int) -> str:
            barrier.wait(timeout=3)
            return ledger.reserve(f"synthetic-concurrent-{index}", now=NOW).status

        with ThreadPoolExecutor(max_workers=12) as pool:
            statuses = list(pool.map(reserve, range(12)))

        self.assertEqual(statuses.count("reserved"), allowed)
        self.assertEqual(statuses.count("exhausted"), 12 - allowed)
        self.assertEqual(ledger.used_nano_usd(now=NOW), reservation * allowed)

    def test_shared_ledger_rejects_a_different_monthly_cap_without_mutation(self) -> None:
        reservation = jev_triage.RESERVATION_NANO_USD
        original = jev_triage.BudgetLedger(
            self.ledger_path, monthly_limit_nano_usd=reservation
        )
        self.assertEqual(original.reserve("synthetic-cap-owner", now=NOW).status, "reserved")
        before = self.ledger_path.read_bytes()
        changed_config = jev_triage.BudgetLedger(
            self.ledger_path, monthly_limit_nano_usd=reservation * 3
        )

        result = changed_config.reserve("synthetic-cap-change", now=NOW)

        self.assertEqual(result.status, "config_mismatch")
        self.assertEqual(self.ledger_path.read_bytes(), before)

    def test_monthly_budget_rolls_by_utc_month(self) -> None:
        reservation = jev_triage.RESERVATION_NANO_USD
        ledger = jev_triage.BudgetLedger(
            self.ledger_path, monthly_limit_nano_usd=reservation
        )
        october = datetime(2026, 10, 31, 23, 59, tzinfo=timezone.utc)
        november = datetime(2026, 11, 1, 0, 1, tzinfo=timezone.utc)

        self.assertEqual(ledger.reserve("synthetic-oct", now=october).status, "reserved")
        self.assertEqual(ledger.reserve("synthetic-nov", now=november).status, "reserved")
        self.assertEqual(ledger.used_nano_usd(now=october), reservation)
        self.assertEqual(ledger.used_nano_usd(now=november), reservation)

    def test_timeout_reservation_is_kept_and_same_case_is_not_resent(self) -> None:
        case = make_case(["no_diagnostic"], case_id="synthetic-timeout")
        config = make_config(self.ledger_path, timeout=0.05)
        with LocalJevServer(response_body(), delay_seconds=0.2) as server:
            client = jev_triage.JevClient(endpoint=server.endpoint)
            first = jev_triage.triage_case(
                case, config=config, api_key="local-test-key", client=client, now=NOW
            )
            second = jev_triage.triage_case(
                case, config=config, api_key="local-test-key", client=client, now=NOW
            )
            time.sleep(0.25)

        self.assertTrue(first.inconclusive)
        self.assertIn(first.reason_code, {"request_uncertain", "invalid_response"})
        self.assertTrue(second.inconclusive)
        self.assertEqual(second.reason_code, "duplicate_suppressed")
        self.assertEqual(len(server.requests), 1)
        self.assertEqual(
            jev_triage.BudgetLedger(
                self.ledger_path,
                monthly_limit_nano_usd=jev_triage.RESERVATION_NANO_USD * 4,
            ).used_nano_usd(now=NOW),
            jev_triage.RESERVATION_NANO_USD,
        )

    def test_confirmed_http_rejection_releases_reservation_without_retry(self) -> None:
        case = make_case(["no_diagnostic"], case_id="synthetic-422")
        config = make_config(self.ledger_path)
        with LocalJevServer({"error": "synthetic validation rejection"}, status=422) as server:
            client = jev_triage.JevClient(endpoint=server.endpoint)
            result = jev_triage.triage_case(
                case, config=config, api_key="local-test-key", client=client, now=NOW
            )

        self.assertEqual(result.origin, "fallback")
        self.assertEqual(result.reason_code, "api_rejected")
        self.assertTrue(result.inconclusive)
        self.assertEqual(len(server.requests), 1)
        ledger = jev_triage.BudgetLedger(
            self.ledger_path,
            monthly_limit_nano_usd=jev_triage.RESERVATION_NANO_USD * 4,
        )
        self.assertEqual(ledger.used_nano_usd(now=NOW), 0)
        self.assertNotIn("synthetic validation rejection", json.dumps(result.to_dict()))

    def test_valid_usage_reconciles_reservation_and_duplicate_reuses_local_result(self) -> None:
        case = make_case(["no_diagnostic"], case_id="synthetic-valid")
        config = make_config(self.ledger_path)
        ledger = jev_triage.BudgetLedger(
            self.ledger_path,
            monthly_limit_nano_usd=jev_triage.RESERVATION_NANO_USD * 4,
        )
        status_seen_before_response: list[str] = []

        def check_pre_call_reservation() -> None:
            data = json.loads(self.ledger_path.read_text(encoding="utf-8"))
            entries = data["months"]["2026-10"]["entries"]
            status_seen_before_response.append(
                next(item["status"] for item in entries if item["case_id"] == case.case_id)
            )

        with LocalJevServer(
            response_body("contract", input_tokens=1000, output_tokens=24),
            on_request=check_pre_call_reservation,
        ) as server:
            client = jev_triage.JevClient(endpoint=server.endpoint)
            result = jev_triage.triage_case(
                case, config=config, api_key="local-test-key", client=client, now=NOW
            )
            cached = jev_triage.triage_case(
                case, config=config, api_key="local-test-key", client=client, now=NOW
            )

        self.assertEqual(status_seen_before_response, ["reserved"])
        self.assertEqual(result.origin, "jev")
        self.assertEqual(result.category, "contract")
        self.assertFalse(result.inconclusive)
        self.assertEqual(ledger.used_nano_usd(now=NOW), 1000 * jev_triage.NANO_USD_PER_INPUT_TOKEN)
        self.assertEqual(cached.category, "contract")
        self.assertTrue(cached.cached)
        self.assertEqual(len(server.requests), 1)

    def test_invalid_model_or_usage_keeps_reservation_and_suppresses_duplicates(self) -> None:
        invalid_responses = (
            response_body("contract", model="jev-latest"),
            response_body("contract", input_tokens=jev_triage.MAX_SUPPORTED_INPUT_TOKENS + 1),
            response_body("contract", input_tokens=-1),
            response_body("contract", output_tokens="24"),
        )
        for index, body in enumerate(invalid_responses):
            with self.subTest(index=index):
                ledger_path = self.root / f"invalid-{index}" / "ledger.json"
                config = make_config(ledger_path)
                case = make_case(["no_diagnostic"], case_id=f"synthetic-invalid-{index}")
                with LocalJevServer(body) as server:
                    client = jev_triage.JevClient(endpoint=server.endpoint)
                    first = jev_triage.triage_case(
                        case,
                        config=config,
                        api_key="local-test-key",
                        client=client,
                        now=NOW,
                    )
                    second = jev_triage.triage_case(
                        case,
                        config=config,
                        api_key="local-test-key",
                        client=client,
                        now=NOW,
                    )

                ledger = jev_triage.BudgetLedger(
                    ledger_path,
                    monthly_limit_nano_usd=jev_triage.RESERVATION_NANO_USD * 4,
                )
                self.assertTrue(first.inconclusive)
                self.assertEqual(first.origin, "fallback")
                self.assertEqual(first.reason_code, "invalid_jev_response")
                self.assertEqual(second.reason_code, "duplicate_suppressed")
                self.assertEqual(len(server.requests), 1)
                self.assertEqual(ledger.used_nano_usd(now=NOW), jev_triage.RESERVATION_NANO_USD)

    def test_small_evaluation_set_checks_mechanics_not_accuracy(self) -> None:
        path = SKILL_DIR / "evaluation" / "cases.jsonl"
        cases = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]

        self.assertGreaterEqual(len(cases), 8)
        self.assertLessEqual(len(cases), 20)
        self.assertEqual(len({item["case"]["case_id"] for item in cases}), len(cases))
        for item in cases:
            case = jev_triage.parse_case(item["case"])
            match = jev_triage.classify_deterministic(case)
            expected = item["expected_category"]
            if expected == "inconclusive":
                self.assertIsNone(match, item["case"]["case_id"])
            else:
                self.assertIsNotNone(match, item["case"]["case_id"])
                self.assertEqual(match.category, expected, item["case"]["case_id"])


if __name__ == "__main__":
    unittest.main()
