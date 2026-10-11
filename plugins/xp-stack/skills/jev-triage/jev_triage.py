#!/usr/bin/env python3
"""Opt-in, non-authoritative shadow triage for one explicitly selected case."""

from __future__ import annotations

import argparse
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import fcntl
import json
import math
import os
from pathlib import Path
import re
import stat
import sys
import tempfile
from typing import Iterator, Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener
import uuid


MODEL_ID = "jev-1.13.0"
API_ENDPOINT = "https://api.typesafe.ai/v1/systemone"
OUTPUT_SCHEMA_VERSION = 1
RULESET_VERSION = "1.0"
QUESTION_VERSION = "1"
MAX_SUPPORTED_INPUT_TOKENS = 64_000
MAX_SYMPTOM_CODES = 4
MAX_CASE_FILE_BYTES = 64_000
MAX_RESPONSE_BYTES = 32_000
NANO_USD_PER_INPUT_TOKEN = 42
RESERVATION_NANO_USD = MAX_SUPPORTED_INPUT_TOKENS * NANO_USD_PER_INPUT_TOKEN
_CASE_ID = re.compile(r"synthetic-[A-Za-z0-9][A-Za-z0-9._-]{0,53}\Z")
_MONTH = re.compile(r"\d{4}-(0[1-9]|1[0-2])\Z")


# One vocabulary drives the API options, output validation, and local suggestions.
CATEGORY_GUIDANCE: dict[str, dict[str, str]] = {
    "environment": {
        "criteria": "The supplied evidence suggests runtime, dependency, permission, or configuration setup.",
        "suggestion": "Check the runtime, dependencies, permissions, and expected environment using authorized evidence.",
    },
    "contract": {
        "criteria": "The supplied evidence suggests an input, output, schema, or interface mismatch.",
        "suggestion": "Compare the input and output with their documented contracts; do not infer correctness from this hint.",
    },
    "behavior": {
        "criteria": "The supplied evidence suggests an unexpected result or state transition.",
        "suggestion": "Create the smallest reproduction and compare the expected and observed values.",
    },
    "timing": {
        "criteria": "The supplied evidence suggests a timeout, ordering, deadline, or concurrency issue.",
        "suggestion": "Inspect deadlines, ordering, and concurrency with timestamps; do not label a failure flaky without reproduction.",
    },
    "inconclusive": {
        "criteria": "The supplied synthetic codes do not support a cautious category.",
        "suggestion": "Select one more allowed synthetic signal and ask a human to review it.",
    },
}
CATEGORIES = tuple(CATEGORY_GUIDANCE)

SYMPTOM_CODES: dict[str, dict[str, str | None]] = {
    "module_missing": {"category": "environment", "description": "Synthetic missing dependency import."},
    "command_missing": {"category": "environment", "description": "Synthetic executable not found."},
    "permission_denied": {"category": "environment", "description": "Synthetic permission rejection."},
    "schema_field_missing": {"category": "contract", "description": "Synthetic required field missing."},
    "schema_unknown_field": {"category": "contract", "description": "Synthetic unknown field rejected."},
    "assertion_mismatch": {"category": "behavior", "description": "Synthetic expected and actual values differ."},
    "unexpected_value": {"category": "behavior", "description": "Synthetic output value was unexpected."},
    "timeout": {"category": "timing", "description": "Synthetic request exceeded its timeout."},
    "deadline": {"category": "timing", "description": "Synthetic operation exceeded its deadline."},
    "race_condition": {"category": "timing", "description": "Synthetic concurrent operations conflict."},
    "no_diagnostic": {"category": None, "description": "Synthetic case has no specific diagnostic signal."},
}


class TriageError(Exception):
    """Base class for safe, user-facing triage errors."""


class InputError(TriageError):
    """The explicitly selected case is not a supported synthetic object."""


class ConfigError(TriageError):
    """The explicitly selected budget configuration is invalid."""


class LedgerError(TriageError):
    """The local budget ledger cannot be safely read or updated."""


class InvalidJevResponse(TriageError):
    """The remote response is not the pinned, validated response shape."""


class OutputError(TriageError):
    """The selected suggestion sidecar cannot be safely written."""


@dataclass(frozen=True)
class SyntheticCase:
    case_id: str
    symptom_codes: tuple[str, ...]

    def api_state(self) -> dict[str, object]:
        # This allowlist exporter is the only API boundary; identifiers never leave the host.
        if not _CASE_ID.fullmatch(self.case_id):
            raise InputError("case identifier is not synthetic")
        if not 1 <= len(self.symptom_codes) <= MAX_SYMPTOM_CODES:
            raise InputError("synthetic case has an unsupported number of symptom codes")
        if any(code not in SYMPTOM_CODES for code in self.symptom_codes):
            raise InputError("synthetic case contains a code outside the export allowlist")
        if len(set(self.symptom_codes)) != len(self.symptom_codes):
            raise InputError("synthetic case contains duplicate symptom codes")
        return {
            "synthetic": True,
            "symptoms": [
                {"code": code, "description": SYMPTOM_CODES[code]["description"]}
                for code in self.symptom_codes
            ],
        }


@dataclass(frozen=True)
class RuleMatch:
    category: str
    rule_id: str


@dataclass(frozen=True)
class BudgetConfig:
    monthly_limit_nano_usd: int
    ledger_path: Path
    timeout_seconds: float


@dataclass(frozen=True)
class Reservation:
    status: str
    request_id: str | None = None
    category: str | None = None


@dataclass(frozen=True)
class TriageResult:
    category: str
    suggestion: str
    origin: str
    inconclusive: bool
    model_version: str | None
    reason_code: str | None = None
    cached: bool = False

    def to_dict(self) -> dict[str, object]:
        result: dict[str, object] = {
            "category": self.category,
            "suggestion": self.suggestion,
            "origin": self.origin,
            "inconclusive": self.inconclusive,
            "version": {
                "schema": OUTPUT_SCHEMA_VERSION,
                "rules": RULESET_VERSION,
                "questions": QUESTION_VERSION,
                "model": self.model_version,
            },
        }
        if self.reason_code is not None:
            result["reason_code"] = self.reason_code
        if self.cached:
            result["cached"] = True
        return result


def parse_case(value: object) -> SyntheticCase:
    expected = {"case_id", "synthetic", "symptom_codes"}
    if type(value) is not dict or set(value) != expected:
        raise InputError("case must contain exactly case_id, synthetic, and symptom_codes")
    if value.get("synthetic") is not True:
        raise InputError("initial pilot accepts only cases explicitly marked synthetic=true")
    case_id = value.get("case_id")
    if not isinstance(case_id, str) or not _CASE_ID.fullmatch(case_id):
        raise InputError("case_id must be a short synthetic-* identifier")
    codes = value.get("symptom_codes")
    if type(codes) is not list or not 1 <= len(codes) <= MAX_SYMPTOM_CODES:
        raise InputError(f"symptom_codes must contain 1 to {MAX_SYMPTOM_CODES} allowlisted codes")
    if any(not isinstance(code, str) or code not in SYMPTOM_CODES for code in codes):
        raise InputError("symptom_codes contains a code outside the synthetic allowlist")
    if len(set(codes)) != len(codes):
        raise InputError("symptom_codes must be unique")
    return SyntheticCase(case_id=case_id, symptom_codes=tuple(codes))


def _checkout_root(start: Path | None = None) -> Path | None:
    current = (start or Path.cwd()).resolve()
    for candidate in (current, *current.parents):
        if (candidate / ".git").exists():
            return candidate
    return None


def _ensure_outside_checkout(path: Path, *, error_type: type[TriageError], label: str) -> Path:
    resolved = path.resolve(strict=False)
    for root in (_checkout_root(), _checkout_root(resolved.parent)):
        if root is None:
            continue
        try:
            resolved.relative_to(root)
        except ValueError:
            continue
        raise error_type(f"{label} must be outside the checkout")
    return resolved


def validate_suggestion_path(path: Path) -> Path:
    if not path.is_absolute() or path.exists() or path.is_symlink() or not path.parent.is_dir():
        raise OutputError("suggestion output must be a new absolute file in an existing directory")
    return _ensure_outside_checkout(path, error_type=OutputError, label="suggestion output")


def write_suggestion(path: Path, result: TriageResult) -> Path:
    destination = validate_suggestion_path(path)
    temporary: Path | None = None
    try:
        descriptor, name = tempfile.mkstemp(prefix=".jev-triage-suggestion-", dir=destination.parent)
        temporary = Path(name)
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "wb") as file:
            file.write(_json_bytes(result.to_dict()))
            file.flush()
            os.fsync(file.fileno())
        # A hard link publishes the complete file atomically and never overwrites an existing path.
        os.link(temporary, destination)
        directory_fd = os.open(destination.parent, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
        return destination
    except OSError:
        raise OutputError("suggestion sidecar could not be written") from None
    finally:
        if temporary is not None:
            try:
                temporary.unlink()
            except FileNotFoundError:
                pass
            except OSError:
                pass


def load_case_file(path: Path) -> SyntheticCase:
    try:
        info = path.stat()
        if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_CASE_FILE_BYTES:
            raise InputError("selected case file is not a supported regular file")
        value = json.loads(path.read_text(encoding="utf-8"))
    except InputError:
        raise
    except (OSError, UnicodeError, json.JSONDecodeError):
        raise InputError("selected case file is unreadable or invalid JSON") from None
    return parse_case(value)


def load_budget_config(path: Path) -> BudgetConfig:
    try:
        info = path.stat()
        if not stat.S_ISREG(info.st_mode) or info.st_size > 16_000:
            raise ConfigError("explicit budget config is not a supported regular file")
        value = json.loads(path.read_text(encoding="utf-8"))
    except ConfigError:
        raise
    except (OSError, UnicodeError, json.JSONDecodeError):
        raise ConfigError("explicit budget config is unreadable or invalid JSON") from None
    expected = {"schema_version", "monthly_budget_usd", "ledger_path", "timeout_seconds"}
    if (
        type(value) is not dict
        or set(value) != expected
        or type(value.get("schema_version")) is not int
        or value.get("schema_version") != 1
    ):
        raise ConfigError("budget config must use schema_version 1 and the documented fields")
    amount = value.get("monthly_budget_usd")
    if not isinstance(amount, str) or len(amount) > 32 or not re.fullmatch(r"(?:0|[1-9][0-9]*)(?:\.[0-9]{1,9})?", amount):
        raise ConfigError("monthly_budget_usd must be a decimal string assigned by the coordinator")
    try:
        decimal_amount = Decimal(amount)
    except InvalidOperation:
        raise ConfigError("monthly_budget_usd is invalid") from None
    nano_amount = decimal_amount * Decimal(1_000_000_000)
    if not decimal_amount.is_finite() or decimal_amount < 0 or nano_amount != nano_amount.to_integral_value():
        raise ConfigError("monthly_budget_usd must be non-negative with at most 9 decimal places")
    ledger_path_raw = value.get("ledger_path")
    if not isinstance(ledger_path_raw, str) or not ledger_path_raw.strip() or "\x00" in ledger_path_raw:
        raise ConfigError("ledger_path must be an explicit absolute path")
    ledger_path = Path(ledger_path_raw)
    if not ledger_path.is_absolute():
        raise ConfigError("ledger_path must be absolute; configure it outside the checkout")
    ledger_path = _ensure_outside_checkout(ledger_path, error_type=ConfigError, label="ledger_path")
    timeout = value.get("timeout_seconds")
    if isinstance(timeout, bool) or not isinstance(timeout, (int, float)):
        raise ConfigError("timeout_seconds must be a number from 0.01 through 30")
    timeout_float = float(timeout)
    if not math.isfinite(timeout_float) or not 0.01 <= timeout_float <= 30:
        raise ConfigError("timeout_seconds must be a number from 0.01 through 30")
    return BudgetConfig(
        monthly_limit_nano_usd=int(nano_amount),
        ledger_path=ledger_path,
        timeout_seconds=timeout_float,
    )


def classify_deterministic(case: SyntheticCase) -> RuleMatch | None:
    if case.symptom_codes == ("no_diagnostic",):
        return RuleMatch(category="inconclusive", rule_id="no_diagnostic")
    mapped = [SYMPTOM_CODES[code]["category"] for code in case.symptom_codes]
    if not mapped or None in mapped or len(set(mapped)) != 1:
        return None
    category = mapped[0]
    if not isinstance(category, str):
        return None
    rule_id = "symptom-codes:" + "+".join(case.symptom_codes)
    return RuleMatch(category=category, rule_id=rule_id)


def _result(
    category: str,
    *,
    origin: str,
    model_version: str | None = None,
    reason_code: str | None = None,
    cached: bool = False,
) -> TriageResult:
    if category not in CATEGORY_GUIDANCE:
        category = "inconclusive"
        origin = "fallback"
        model_version = None
        reason_code = reason_code or "invalid_category"
    return TriageResult(
        category=category,
        suggestion=CATEGORY_GUIDANCE[category]["suggestion"],
        origin=origin,
        inconclusive=(category == "inconclusive" or origin == "fallback"),
        model_version=model_version,
        reason_code=reason_code,
        cached=cached,
    )


def _fallback(reason_code: str) -> TriageResult:
    return _result("inconclusive", origin="fallback", reason_code=reason_code)


def _utc_month(now: datetime | None) -> str:
    moment = now or datetime.now(timezone.utc)
    if moment.tzinfo is None or moment.utcoffset() is None:
        raise LedgerError("ledger time must include a timezone")
    utc = moment.astimezone(timezone.utc)
    return f"{utc.year:04d}-{utc.month:02d}"


def _json_bytes(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")


class BudgetLedger:
    """A per-config monthly ledger guarded by flock and atomic replacement."""

    def __init__(self, path: Path, *, monthly_limit_nano_usd: int) -> None:
        if not path.is_absolute():
            raise LedgerError("ledger path must be absolute")
        if type(monthly_limit_nano_usd) is not int or monthly_limit_nano_usd < 0:
            raise LedgerError("monthly ledger limit must be a non-negative integer")
        self.path = _ensure_outside_checkout(path, error_type=LedgerError, label="ledger path")
        self.lock_path = self.path.with_name(self.path.name + ".lock")
        self.monthly_limit_nano_usd = monthly_limit_nano_usd

    @contextmanager
    def _locked(self) -> Iterator[None]:
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            if self.path.parent.is_symlink() or not self.path.parent.is_dir():
                raise LedgerError("ledger parent must be a real directory")
            flags = os.O_CREAT | os.O_RDWR | getattr(os, "O_NOFOLLOW", 0)
            descriptor = os.open(self.lock_path, flags, 0o600)
        except LedgerError:
            raise
        except OSError:
            raise LedgerError("cannot open the explicit budget ledger lock") from None
        try:
            info = os.fstat(descriptor)
            if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid():
                raise LedgerError("budget lock must be an owned regular file")
            if stat.S_IMODE(info.st_mode) & 0o077:
                raise LedgerError("budget lock permissions must be private")
            fcntl.flock(descriptor, fcntl.LOCK_EX)
            yield
        except OSError:
            raise LedgerError("cannot lock the explicit budget ledger") from None
        finally:
            try:
                fcntl.flock(descriptor, fcntl.LOCK_UN)
            except OSError:
                pass
            os.close(descriptor)

    def _read_locked(self) -> dict:
        if not os.path.lexists(self.path):
            return {"schema_version": 1, "months": {}}
        try:
            descriptor = os.open(self.path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
            with os.fdopen(descriptor, "r", encoding="utf-8") as file:
                info = os.fstat(file.fileno())
                if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid():
                    raise LedgerError("budget ledger must be an owned regular file")
                if stat.S_IMODE(info.st_mode) != 0o600:
                    raise LedgerError("budget ledger permissions must be 0600")
                value = json.load(file)
        except LedgerError:
            raise
        except (OSError, UnicodeError, json.JSONDecodeError):
            raise LedgerError("budget ledger is unreadable or invalid") from None
        self._validate_ledger(value)
        return value

    @staticmethod
    def _validate_ledger(value: object) -> None:
        if type(value) is not dict or set(value) != {"schema_version", "months"}:
            raise LedgerError("budget ledger schema is invalid")
        if type(value.get("schema_version")) is not int or value.get("schema_version") != 1 or type(value.get("months")) is not dict:
            raise LedgerError("budget ledger schema is invalid")
        for month, bucket in value["months"].items():
            if not isinstance(month, str) or not _MONTH.fullmatch(month):
                raise LedgerError("budget ledger contains an invalid month")
            if (
                type(bucket) is not dict
                or set(bucket) != {"limit_nano_usd", "entries"}
                or type(bucket["entries"]) is not list
                or type(bucket["limit_nano_usd"]) is not int
                or bucket["limit_nano_usd"] < 0
            ):
                raise LedgerError("budget ledger month is invalid")
            for entry in bucket["entries"]:
                required = {
                    "case_id", "request_id", "status", "reserved_nano_usd",
                    "spent_nano_usd", "created_at", "model",
                }
                optional = {"category", "input_tokens", "output_tokens"}
                if type(entry) is not dict or not required.issubset(entry) or set(entry) - (required | optional):
                    raise LedgerError("budget ledger entry is invalid")
                if not isinstance(entry.get("case_id"), str) or not _CASE_ID.fullmatch(entry["case_id"]):
                    raise LedgerError("budget ledger case identifier is invalid")
                if not isinstance(entry.get("request_id"), str) or not entry["request_id"]:
                    raise LedgerError("budget ledger request identifier is invalid")
                status = entry.get("status")
                if not isinstance(status, str) or status not in {"reserved", "uncertain", "settled"}:
                    raise LedgerError("budget ledger status is invalid")
                for name in ("reserved_nano_usd", "spent_nano_usd"):
                    if type(entry.get(name)) is not int or entry[name] < 0:
                        raise LedgerError("budget ledger amount is invalid")
                if entry["spent_nano_usd"] > entry["reserved_nano_usd"]:
                    raise LedgerError("budget ledger spend exceeds its reservation")
                if not isinstance(entry.get("created_at"), str) or entry.get("model") != MODEL_ID:
                    raise LedgerError("budget ledger metadata is invalid")
                if status == "settled":
                    category = entry.get("category")
                    if not isinstance(category, str) or category not in CATEGORY_GUIDANCE:
                        raise LedgerError("budget ledger settled category is invalid")
                    input_tokens = entry.get("input_tokens")
                    output_tokens = entry.get("output_tokens")
                    if type(input_tokens) is not int or not 1 <= input_tokens <= MAX_SUPPORTED_INPUT_TOKENS:
                        raise LedgerError("budget ledger settled input usage is invalid")
                    if type(output_tokens) is not int or output_tokens < 0:
                        raise LedgerError("budget ledger settled output usage is invalid")
                    if entry["spent_nano_usd"] != input_tokens * NANO_USD_PER_INPUT_TOKEN:
                        raise LedgerError("budget ledger cost does not match settled input usage")
                elif entry["spent_nano_usd"] != 0:
                    raise LedgerError("unsettled budget reservation cannot contain settled spend")
                elif set(entry) & optional:
                    raise LedgerError("unsettled budget reservation contains settled metadata")

    def _write_locked(self, value: dict) -> None:
        temporary: Path | None = None
        try:
            descriptor, name = tempfile.mkstemp(
                prefix=f".{self.path.name}.", suffix=".tmp", dir=self.path.parent
            )
            temporary = Path(name)
            os.fchmod(descriptor, 0o600)
            with os.fdopen(descriptor, "wb") as file:
                file.write(_json_bytes(value))
                file.flush()
                os.fsync(file.fileno())
            os.replace(temporary, self.path)
            self._sync_parent()
        except OSError:
            if temporary is not None:
                try:
                    temporary.unlink()
                except OSError:
                    pass
            raise LedgerError("cannot atomically update the budget ledger") from None

    def _sync_parent(self) -> None:
        descriptor = os.open(self.path.parent, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)

    @staticmethod
    def _used(bucket: dict) -> int:
        total = 0
        for entry in bucket["entries"]:
            if entry["status"] in {"reserved", "uncertain"}:
                total += entry["reserved_nano_usd"]
            elif entry["status"] == "settled":
                total += entry["spent_nano_usd"]
        return total

    def reserve(self, case_id: str, *, now: datetime | None = None) -> Reservation:
        if not isinstance(case_id, str) or not _CASE_ID.fullmatch(case_id):
            raise LedgerError("budget reservation requires a synthetic case identifier")
        if self.monthly_limit_nano_usd < RESERVATION_NANO_USD:
            return Reservation("exhausted")
        month = _utc_month(now)
        try:
            created_at = (now or datetime.now(timezone.utc)).astimezone(timezone.utc).isoformat()
        except (ValueError, OverflowError):
            raise LedgerError("cannot create a UTC reservation timestamp") from None
        with self._locked():
            ledger = self._read_locked()
            bucket = ledger["months"].get(month)
            if bucket is None:
                bucket = {
                    "limit_nano_usd": self.monthly_limit_nano_usd,
                    "entries": [],
                }
                ledger["months"][month] = bucket
            elif bucket["limit_nano_usd"] != self.monthly_limit_nano_usd:
                return Reservation("config_mismatch")
            for entry in bucket["entries"]:
                if entry["case_id"] == case_id:
                    if entry["status"] == "settled":
                        return Reservation("cached", category=entry["category"])
                    return Reservation("duplicate_suppressed")
            if self._used(bucket) + RESERVATION_NANO_USD > self.monthly_limit_nano_usd:
                return Reservation("exhausted")
            request_id = str(uuid.uuid4())
            bucket["entries"].append(
                {
                    "case_id": case_id,
                    "request_id": request_id,
                    "status": "reserved",
                    "reserved_nano_usd": RESERVATION_NANO_USD,
                    "spent_nano_usd": 0,
                    "created_at": created_at,
                    "model": MODEL_ID,
                }
            )
            self._write_locked(ledger)
            return Reservation("reserved", request_id=request_id)

    def settle(
        self,
        request_id: str,
        *,
        input_tokens: int,
        output_tokens: int,
        category: str,
        now: datetime | None = None,
    ) -> None:
        if (
            type(input_tokens) is not int
            or not 1 <= input_tokens <= MAX_SUPPORTED_INPUT_TOKENS
            or type(output_tokens) is not int
            or output_tokens < 0
            or category not in CATEGORY_GUIDANCE
        ):
            raise LedgerError("settled usage or category is invalid")
        spent_nano_usd = input_tokens * NANO_USD_PER_INPUT_TOKEN
        month = _utc_month(now)
        with self._locked():
            ledger = self._read_locked()
            bucket = ledger["months"].get(month)
            entry = self._find_request(bucket, request_id)
            if entry["status"] != "reserved" or spent_nano_usd > entry["reserved_nano_usd"]:
                raise LedgerError("reservation cannot be settled with this usage")
            entry["status"] = "settled"
            entry["spent_nano_usd"] = spent_nano_usd
            entry["input_tokens"] = input_tokens
            entry["output_tokens"] = output_tokens
            entry["category"] = category
            self._write_locked(ledger)

    def mark_uncertain(self, request_id: str, *, now: datetime | None = None) -> None:
        month = _utc_month(now)
        with self._locked():
            ledger = self._read_locked()
            bucket = ledger["months"].get(month)
            entry = self._find_request(bucket, request_id)
            if entry["status"] == "reserved":
                entry["status"] = "uncertain"
                self._write_locked(ledger)

    def release(self, request_id: str, *, now: datetime | None = None) -> None:
        month = _utc_month(now)
        with self._locked():
            ledger = self._read_locked()
            bucket = ledger["months"].get(month)
            if bucket is None:
                return
            remaining = [entry for entry in bucket["entries"] if entry["request_id"] != request_id]
            if len(remaining) == len(bucket["entries"]):
                raise LedgerError("reservation to release was not found")
            if remaining:
                bucket["entries"] = remaining
            else:
                del ledger["months"][month]
            if ledger["months"]:
                self._write_locked(ledger)
            else:
                try:
                    self.path.unlink(missing_ok=True)
                    self._sync_parent()
                except OSError:
                    raise LedgerError("cannot release the confirmed rejected reservation") from None

    def used_nano_usd(self, *, now: datetime | None = None) -> int:
        month = _utc_month(now)
        with self._locked():
            ledger = self._read_locked()
            bucket = ledger["months"].get(
                month,
                {"limit_nano_usd": self.monthly_limit_nano_usd, "entries": []},
            )
            return self._used(bucket)

    @staticmethod
    def _find_request(bucket: dict | None, request_id: str) -> dict:
        if bucket is None:
            raise LedgerError("reservation month was not found")
        for entry in bucket["entries"]:
            if entry["request_id"] == request_id:
                return entry
        raise LedgerError("reservation was not found")


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, _request, _file, _code, _message, _headers, _new_url):
        return None


class JevClient:
    """Minimal stdlib HTTP client; production defaults to the official HTTPS endpoint."""

    def __init__(self, *, endpoint: str = API_ENDPOINT) -> None:
        if endpoint != API_ENDPOINT:
            parsed = urlsplit(endpoint)
            if (
                parsed.scheme != "http"
                or parsed.hostname not in {"127.0.0.1", "::1"}
                or parsed.port is None
                or parsed.path != "/v1/systemone"
                or parsed.username is not None
                or parsed.password is not None
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError("test endpoint must be a loopback HTTP server")
        self._endpoint = endpoint

    def evaluate(self, case: SyntheticCase, api_key: str, timeout_seconds: float) -> dict:
        if not isinstance(case, SyntheticCase):
            raise InvalidJevResponse("client accepts only a parsed synthetic case")
        state = case.api_state()
        request_body = {
            "state": state,
            "model": MODEL_ID,
            "questions": {
                "category": {
                    "type": "choice",
                    "instructions": (
                        "Choose the most plausible triage category supported by these allowlisted synthetic symptom codes. "
                        "Choose inconclusive when codes conflict or do not support one category. "
                        "This is a tentative lead, never a proven cause or gate result."
                    ),
                    "criteria": {
                        category: details["criteria"]
                        for category, details in CATEGORY_GUIDANCE.items()
                    },
                }
            },
        }
        encoded = _json_bytes(request_body)
        request = Request(
            self._endpoint,
            data=encoded,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        opener = build_opener(ProxyHandler({}), _NoRedirect())
        try:
            with opener.open(request, timeout=timeout_seconds) as response:
                if response.status < 200 or response.status >= 300:
                    raise HTTPError(self._endpoint, response.status, "request rejected", response.headers, None)
                raw_response = response.read(MAX_RESPONSE_BYTES + 1)
        except HTTPError as error:
            status_code = error.code
            error.close()
            raise _HttpStatusFailure(status_code) from None
        except (OSError, URLError, TimeoutError):
            raise _UncertainTransportFailure() from None
        if len(raw_response) > MAX_RESPONSE_BYTES:
            raise InvalidJevResponse("response exceeds supported size")
        try:
            decoded = json.loads(raw_response.decode("utf-8"))
        except (UnicodeError, json.JSONDecodeError):
            raise InvalidJevResponse("response is not valid JSON") from None
        return validate_jev_response(decoded)


class _HttpStatusFailure(Exception):
    def __init__(self, status_code: int) -> None:
        super().__init__(status_code)
        self.status_code = status_code


class _UncertainTransportFailure(Exception):
    pass


def validate_jev_response(value: object) -> dict:
    if type(value) is not dict or value.get("model") != MODEL_ID:
        raise InvalidJevResponse("model does not match the required pin")
    answers = value.get("answers")
    if type(answers) is not dict:
        raise InvalidJevResponse("answers map is missing")
    answer = answers.get("category")
    if type(answer) is not dict or answer.get("type") != "choice":
        raise InvalidJevResponse("category answer is not a choice")
    category = answer.get("choice")
    if not isinstance(category, str) or category not in CATEGORY_GUIDANCE:
        raise InvalidJevResponse("category choice is not supported")
    confidence = answer.get("confidence")
    if isinstance(confidence, bool) or not isinstance(confidence, (int, float)):
        raise InvalidJevResponse("choice confidence is invalid")
    if not math.isfinite(float(confidence)) or not 0 <= float(confidence) <= 1:
        raise InvalidJevResponse("choice confidence is outside its supported range")
    probabilities = answer.get("probabilities")
    if type(probabilities) is not dict or set(probabilities) != set(CATEGORIES):
        raise InvalidJevResponse("choice probability keys are invalid")
    values: list[float] = []
    for probability in probabilities.values():
        if isinstance(probability, bool) or not isinstance(probability, (int, float)):
            raise InvalidJevResponse("choice probability is invalid")
        number = float(probability)
        if not math.isfinite(number) or not 0 <= number <= 1:
            raise InvalidJevResponse("choice probability is outside its supported range")
        values.append(number)
    if not math.isclose(sum(values), 1.0, rel_tol=0, abs_tol=0.001):
        raise InvalidJevResponse("choice probabilities do not sum to one")
    usage = value.get("usage")
    if type(usage) is not dict:
        raise InvalidJevResponse("usage is missing")
    input_tokens = usage.get("input_tokens")
    output_tokens = usage.get("output_tokens")
    if type(input_tokens) is not int or not 1 <= input_tokens <= MAX_SUPPORTED_INPUT_TOKENS:
        raise InvalidJevResponse("input usage is outside the supported range")
    if type(output_tokens) is not int or output_tokens < 0:
        raise InvalidJevResponse("output usage is invalid")
    return {"category": category, "input_tokens": input_tokens, "output_tokens": output_tokens}


def triage_case(
    case: SyntheticCase,
    *,
    config: BudgetConfig | None,
    api_key: str | None,
    client: JevClient | None = None,
    now: datetime | None = None,
) -> TriageResult:
    match = classify_deterministic(case)
    if match is not None:
        return _result(match.category, origin="rule", reason_code=match.rule_id)
    if not isinstance(api_key, str) or not api_key.strip():
        return _fallback("missing_api_key")
    if config is None:
        return _fallback("missing_explicit_budget_config")
    try:
        ledger = BudgetLedger(
            config.ledger_path,
            monthly_limit_nano_usd=config.monthly_limit_nano_usd,
        )
        reservation = ledger.reserve(case.case_id, now=now)
    except LedgerError:
        return _fallback("budget_ledger_unavailable")
    if reservation.status == "exhausted":
        return _fallback("budget_exhausted")
    if reservation.status == "config_mismatch":
        return _fallback("budget_config_mismatch")
    if reservation.status == "duplicate_suppressed":
        return _fallback("duplicate_suppressed")
    if reservation.status == "cached":
        return _result(
            reservation.category or "inconclusive",
            origin="jev",
            model_version=MODEL_ID,
            cached=True,
        )
    if reservation.status != "reserved" or reservation.request_id is None:
        return _fallback("budget_ledger_unavailable")

    request_client = client or JevClient()
    try:
        validated = request_client.evaluate(case, api_key, config.timeout_seconds)
    except _HttpStatusFailure as error:
        if 300 <= error.status_code < 500:
            try:
                ledger.release(reservation.request_id, now=now)
            except LedgerError:
                return _fallback("budget_ledger_unavailable")
            return _fallback("api_rejected")
        try:
            ledger.mark_uncertain(reservation.request_id, now=now)
        except LedgerError:
            pass
        return _fallback("request_uncertain")
    except InvalidJevResponse:
        try:
            ledger.mark_uncertain(reservation.request_id, now=now)
        except LedgerError:
            pass
        return _fallback("invalid_jev_response")
    except Exception:
        try:
            ledger.mark_uncertain(reservation.request_id, now=now)
        except LedgerError:
            pass
        return _fallback("request_uncertain")

    try:
        ledger.settle(
            reservation.request_id,
            input_tokens=validated["input_tokens"],
            output_tokens=validated["output_tokens"],
            category=validated["category"],
            now=now,
        )
    except LedgerError:
        # The reservation remains held if local reconciliation fails after a response.
        return _fallback("budget_ledger_unavailable")
    return _result(validated["category"], origin="jev", model_version=MODEL_ID)


def _cli_result(case_path: Path, config_path: Path | None) -> TriageResult:
    try:
        case = load_case_file(case_path)
    except InputError:
        return _fallback("invalid_case")
    match = classify_deterministic(case)
    if match is not None:
        return _result(match.category, origin="rule", reason_code=match.rule_id)
    try:
        config = load_budget_config(config_path) if config_path is not None else None
    except ConfigError:
        return _fallback("invalid_budget_config")
    # This is the only secret source used by this CLI. It never searches files or dotenv.
    api_key = os.environ.get("TYPESAFE_API_KEY")
    return triage_case(case, config=config, api_key=api_key)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="jev-triage",
        description="Opt-in, non-authoritative triage for one selected synthetic case.",
    )
    parser.add_argument("--case", required=True, type=Path, help="one explicitly selected synthetic JSON case")
    parser.add_argument("--config", type=Path, help="explicit monthly budget and ledger config; no default is read")
    parser.add_argument(
        "--suggestion-out",
        required=True,
        type=Path,
        help="new absolute suggestion file outside the checkout; never read by the runner",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        suggestion_path = validate_suggestion_path(args.suggestion_out)
    except OutputError:
        sys.stderr.write("jev-triage: suggestion path must be a new absolute file outside the checkout\n")
        return 2
    result = _cli_result(args.case, args.config)
    try:
        write_suggestion(suggestion_path, result)
    except OutputError:
        sys.stderr.write("jev-triage: suggestion sidecar could not be written\n")
        return 2
    # Empty stdout prevents accidental piping into the test runner or gate queue.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
