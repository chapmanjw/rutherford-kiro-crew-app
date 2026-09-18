#!/usr/bin/env python3
"""Behavior tests for ``backend/native_panels.py`` (v3.0.0 native panel engine).

Standalone, stdlib-only, no pytest — run it directly:

    python tests/test_native_panels.py

Exits non-zero on the first failing assertion group and prints a pass/fail
count, matching the repo's ``scripts/test-validate-app.mjs`` convention. Covers
the strict parser, the byte-for-byte round-trip, the missing-root guard added
by the review panel, scope discovery, and the atomic writer's path guard + .bak.
"""
from __future__ import annotations

import importlib.util
import os
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
EXAMPLE = REPO_ROOT / "examples" / "native-panels.toon"


def _load_module():
    """Import backend/native_panels.py directly (no package __init__)."""
    path = REPO_ROOT / "backend" / "native_panels.py"
    spec = importlib.util.spec_from_file_location("native_panels", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


np = _load_module()

# --------------------------------------------------------------------------
# Tiny assertion harness
# --------------------------------------------------------------------------

_passed = 0
_failed = 0


def check(label: str, cond: bool) -> None:
    global _passed, _failed
    if cond:
        _passed += 1
    else:
        _failed += 1
        print(f"  FAIL: {label}")


def expect_valueerror(label: str, fn) -> None:
    """Pass iff calling ``fn`` raises ValueError."""
    global _passed, _failed
    try:
        fn()
    except ValueError:
        _passed += 1
        return
    except Exception as exc:  # wrong error type is still a failure
        _failed += 1
        print(f"  FAIL: {label} — raised {type(exc).__name__}, expected ValueError")
        return
    _failed += 1
    print(f"  FAIL: {label} — no error raised, expected ValueError")


# --------------------------------------------------------------------------
# Round-trip: the shipped example, byte-for-byte
# --------------------------------------------------------------------------

def test_example_roundtrip() -> None:
    text = EXAMPLE.read_text(encoding="utf-8")
    check("example parses to 3 panels", len(np.parse(text)) == 3)
    check("serialize(parse(example)) == example byte-for-byte",
          np.serialize(np.parse(text)) == text)
    check("roundtrip_ok(example)", np.roundtrip_ok(text))


# --------------------------------------------------------------------------
# Round-trip: edge cases (int weight, bool parity, stance, quoted model)
# --------------------------------------------------------------------------

EDGE = (
    "native-panels:\n"
    "  edge:\n"
    "    description: Edge cases.\n"
    "    engine: native\n"
    "    strategy: weighted\n"
    "    targets[1]:\n"
    '      - model: "vendor:model-x"\n'
    "        role: architect\n"
    "        label: v1\n"
    "        weight: 2\n"
    "        parity: true\n"
    "        stance: for\n"
    "        agent: kirocrew\n"
)


def test_edge_roundtrip() -> None:
    parsed = np.parse(EDGE)
    check("edge serialize(parse(x)) == x byte-for-byte", np.serialize(parsed) == EDGE)
    seat = parsed[0]["targets"][0]
    check("quoted model preserved (colon)", seat["model"] == "vendor:model-x")
    check("int weight parses to int 2", seat["weight"] == 2 and isinstance(seat["weight"], int))
    check("bool parity parses to True", seat["parity"] is True)
    check("stance parses to 'for'", seat["stance"] == "for")


# --------------------------------------------------------------------------
# Strict parse errors
# --------------------------------------------------------------------------

def test_parse_errors() -> None:
    empty_targets = (
        "native-panels:\n  p:\n    engine: native\n    targets[0]:\n"
    )
    expect_valueerror("empty targets list rejected", lambda: np.parse(empty_targets))

    unknown_top = (
        "native-panels:\n  p:\n    engine: native\n    bogus: x\n"
        "    targets[1]:\n      - model: m\n"
    )
    expect_valueerror("unknown panel key rejected", lambda: np.parse(unknown_top))

    unknown_seat = (
        "native-panels:\n  p:\n    engine: native\n    targets[1]:\n"
        "      - model: m\n        bogus: x\n"
    )
    expect_valueerror("unknown seat key rejected", lambda: np.parse(unknown_seat))

    no_model = (
        "native-panels:\n  p:\n    engine: native\n    targets[1]:\n"
        "      - role: architect\n"
    )
    expect_valueerror("seat missing model rejected", lambda: np.parse(no_model))

    bad_engine = (
        "native-panels:\n  p:\n    engine: mcp\n    targets[1]:\n      - model: m\n"
    )
    expect_valueerror("engine != native rejected", lambda: np.parse(bad_engine))

    bad_strategy = (
        "native-panels:\n  p:\n    engine: native\n    strategy: bogus\n"
        "    targets[1]:\n      - model: m\n"
    )
    expect_valueerror("unknown strategy rejected", lambda: np.parse(bad_strategy))

    neg_weight = (
        "native-panels:\n  p:\n    engine: native\n    targets[1]:\n"
        "      - model: m\n        weight: -1\n"
    )
    expect_valueerror("negative weight rejected", lambda: np.parse(neg_weight))


# --------------------------------------------------------------------------
# Finding 2: a PRESENT file missing its root table is an error
# --------------------------------------------------------------------------

def test_missing_root_is_error() -> None:
    typo = (
        "native-panel:\n  p:\n    engine: native\n    targets[1]:\n      - model: m\n"
    )
    expect_valueerror("typo'd root 'native-panel:' rejected", lambda: np.parse(typo))
    expect_valueerror("empty string rejected (no root)", lambda: np.parse(""))
    expect_valueerror("unrelated content rejected (no root)",
                      lambda: np.parse("hello: world\n"))


# --------------------------------------------------------------------------
# Discovery: a genuinely absent file across all scopes returns empty, no raise
# --------------------------------------------------------------------------

def test_discovery_absent_file() -> None:
    with tempfile.TemporaryDirectory() as home, tempfile.TemporaryDirectory() as proj:
        orig_home, orig_proj = np._home, np._project_root
        orig_cfg = os.environ.pop("RUTHERFORD_CONFIG_DIR", None)
        try:
            np._home = lambda: Path(home)
            np._project_root = lambda: Path(proj)
            panels, errors = np.discover_panels()  # no files anywhere
            check("absent file -> empty panels", panels == {})
            check("absent file -> no errors", errors == [])
        finally:
            np._home, np._project_root = orig_home, orig_proj
            if orig_cfg is not None:
                os.environ["RUTHERFORD_CONFIG_DIR"] = orig_cfg


def test_discovery_present_broken_file_reports_error() -> None:
    with tempfile.TemporaryDirectory() as home, tempfile.TemporaryDirectory() as proj:
        orig_home, orig_proj = np._home, np._project_root
        orig_cfg = os.environ.pop("RUTHERFORD_CONFIG_DIR", None)
        try:
            np._home = lambda: Path(home)
            np._project_root = lambda: Path(proj)
            d = Path(home) / ".rutherford"
            d.mkdir(parents=True)
            (d / "native-panels.toon").write_text("native-panel:\n", encoding="utf-8")
            panels, errors = np.discover_panels()
            check("present broken file -> no panels", panels == {})
            check("present broken file -> reported in errors", len(errors) == 1)
        finally:
            np._home, np._project_root = orig_home, orig_proj
            if orig_cfg is not None:
                os.environ["RUTHERFORD_CONFIG_DIR"] = orig_cfg


# --------------------------------------------------------------------------
# Atomic writer: path guard + timestamped .bak + atomic replace
# --------------------------------------------------------------------------

def test_path_guard() -> None:
    with tempfile.TemporaryDirectory() as home, tempfile.TemporaryDirectory() as proj:
        orig_home, orig_proj = np._home, np._project_root
        orig_cfg = os.environ.pop("RUTHERFORD_CONFIG_DIR", None)
        try:
            np._home = lambda: Path(home)
            np._project_root = lambda: Path(proj)
            panels = np.parse(EXAMPLE.read_text(encoding="utf-8"))

            # Parent not a .rutherford scope dir -> refused.
            outside = Path(proj) / "native-panels.toon"
            expect_valueerror("write outside .rutherford refused",
                              lambda: np.atomic_write(outside, panels))

            # Wrong filename inside a scope dir -> refused.
            wrong_name = Path(home) / ".rutherford" / "panels.toon"
            expect_valueerror("write with wrong filename refused",
                              lambda: np.atomic_write(wrong_name, panels))
        finally:
            np._home, np._project_root = orig_home, orig_proj
            if orig_cfg is not None:
                os.environ["RUTHERFORD_CONFIG_DIR"] = orig_cfg


def test_atomic_write_and_bak() -> None:
    with tempfile.TemporaryDirectory() as home, tempfile.TemporaryDirectory() as proj:
        orig_home, orig_proj = np._home, np._project_root
        orig_cfg = os.environ.pop("RUTHERFORD_CONFIG_DIR", None)
        try:
            np._home = lambda: Path(home)
            np._project_root = lambda: Path(proj)
            target = Path(home) / ".rutherford" / "native-panels.toon"
            panels = np.parse(EXAMPLE.read_text(encoding="utf-8"))

            # First write: creates the file, no .bak yet.
            np.atomic_write(target, panels)
            check("first write creates the file", target.is_file())
            baks = list(target.parent.glob("native-panels.toon.bak-*"))
            check("first write leaves no .bak", baks == [])
            check("written file round-trips",
                  np.parse(target.read_text(encoding="utf-8")) is not None)

            # Second write: backs up the existing file to a timestamped .bak.
            np.atomic_write(target, panels)
            baks = list(target.parent.glob("native-panels.toon.bak-*"))
            check("overwrite creates exactly one .bak", len(baks) == 1)

            # Atomicity: no leftover temp files in the directory.
            tmps = list(target.parent.glob("native-panels.toon.*.tmp"))
            check("no leftover .tmp files (atomic replace)", tmps == [])
        finally:
            np._home, np._project_root = orig_home, orig_proj
            if orig_cfg is not None:
                os.environ["RUTHERFORD_CONFIG_DIR"] = orig_cfg


def main() -> int:
    for fn in (
        test_example_roundtrip,
        test_edge_roundtrip,
        test_parse_errors,
        test_missing_root_is_error,
        test_discovery_absent_file,
        test_discovery_present_broken_file_reports_error,
        test_path_guard,
        test_atomic_write_and_bak,
    ):
        fn()
    total = _passed + _failed
    if _failed:
        print(f"\n✗ native_panels tests: {_passed}/{total} passed, {_failed} failed")
        return 1
    print(f"✓ native_panels tests: {_passed}/{total} passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
