#!/usr/bin/env python3
"""Route-level behavior tests for the native-panels GET/PUT handlers in
``backend/routes.py`` (v3.0.0).

Standalone, stdlib-only, no pytest — run it directly:

    python tests/test_native_routes.py

Exits non-zero on any failing assertion and prints a pass/fail count, matching
the repo convention in ``tests/test_native_panels.py``.

``backend/routes.py`` imports ``aiohttp`` and ``kiro_crew`` at module top (absent
in a plain interpreter), so we stub just enough of both to import it, then drive
the REAL ``_handle_native_panels`` / ``_handle_native_panels_write`` async
handlers with a fake request against temp scope directories. This exercises the
actual validators, the scope resolution (global/workspace/config_dir precedence),
the write-safety envelope, and the no-traceback-leak error path — not a
re-implementation.
"""
from __future__ import annotations

import asyncio
import importlib.util
import os
import sys
import tempfile
import types
from contextlib import contextmanager
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# --------------------------------------------------------------------------
# Stub aiohttp + kiro_crew so backend/routes.py imports in a bare interpreter
# --------------------------------------------------------------------------


class _Resp:
    """Stand-in for aiohttp's json response — captures status + JSON body."""

    def __init__(self, data, status: int = 200):
        self.body = data
        self.status = status


def _json_response(data, status: int = 200):
    return _Resp(data, status)


def _install_stubs() -> None:
    aiohttp = types.ModuleType("aiohttp")
    web = types.ModuleType("aiohttp.web")
    web.json_response = _json_response
    web.Request = object
    web.Response = _Resp
    aiohttp.web = web
    sys.modules["aiohttp"] = aiohttp
    sys.modules["aiohttp.web"] = web

    kc = types.ModuleType("kiro_crew")
    kc_apps = types.ModuleType("kiro_crew.apps")
    kc_ctx = types.ModuleType("kiro_crew.apps.context")
    kc_ctx.AppContext = type("AppContext", (), {})
    kc_rr = types.ModuleType("kiro_crew.apps.route_registry")
    kc_rr.AppRoute = type(
        "AppRoute", (), {"__init__": lambda self, *a, **k: None}
    )
    kc.apps = kc_apps
    kc_apps.context = kc_ctx
    kc_apps.route_registry = kc_rr
    sys.modules["kiro_crew"] = kc
    sys.modules["kiro_crew.apps"] = kc_apps
    sys.modules["kiro_crew.apps.context"] = kc_ctx
    sys.modules["kiro_crew.apps.route_registry"] = kc_rr


def _load(name: str, rel: str):
    path = REPO_ROOT / rel
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_install_stubs()
# Load native_panels FIRST and register it under both names routes.py may import
# (``from backend import native_panels`` then ``import native_panels``), so the
# routes module shares the EXACT module object we patch below — no split identity.
native_panels = _load("native_panels", "backend/native_panels.py")
sys.modules["native_panels"] = native_panels
backend_pkg = types.ModuleType("backend")
backend_pkg.native_panels = native_panels
sys.modules["backend"] = backend_pkg
sys.modules["backend.native_panels"] = native_panels
routes = _load("routes", "backend/routes.py")

# --------------------------------------------------------------------------
# Assertion harness
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


# --------------------------------------------------------------------------
# Fake request + async driver
# --------------------------------------------------------------------------


class FakeRequest:
    def __init__(self, query=None, json_body=None, json_raises=False):
        self.query = dict(query or {})
        self._json_body = json_body
        self._json_raises = json_raises

    async def json(self):
        if self._json_raises:
            raise ValueError("no json")
        return self._json_body


_CTX = sys.modules["kiro_crew.apps.context"].AppContext()


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def get_panels(query=None) -> _Resp:
    return _run(routes._handle_native_panels(FakeRequest(query=query), _CTX))


def put_panels(scope, body, json_raises=False) -> _Resp:
    return _run(
        routes._handle_native_panels_write(
            FakeRequest(query={"scope": scope}, json_body=body, json_raises=json_raises),
            _CTX,
        )
    )


@contextmanager
def scopes(home: Path, cwd: Path, config_dir: Path | None = None):
    """Point native_panels' scope resolution at temp dirs for one test."""
    orig_home = native_panels._home
    orig_root = native_panels._project_root
    orig_env = os.environ.get("RUTHERFORD_CONFIG_DIR")
    native_panels._home = lambda: home  # type: ignore[assignment]
    native_panels._project_root = lambda: cwd  # type: ignore[assignment]
    if config_dir is not None:
        os.environ["RUTHERFORD_CONFIG_DIR"] = str(config_dir)
    else:
        os.environ.pop("RUTHERFORD_CONFIG_DIR", None)
    try:
        yield
    finally:
        native_panels._home = orig_home  # type: ignore[assignment]
        native_panels._project_root = orig_root  # type: ignore[assignment]
        if orig_env is None:
            os.environ.pop("RUTHERFORD_CONFIG_DIR", None)
        else:
            os.environ["RUTHERFORD_CONFIG_DIR"] = orig_env


def _panel(name="p1", model="claude-sonnet-4.5", **seat_extra):
    seat = {"model": model, **seat_extra}
    return {"name": name, "engine": "native", "strategy": "all-voices", "seats": [seat]}


# --------------------------------------------------------------------------
# Tests
# --------------------------------------------------------------------------


def test_valid_roundtrip_global():
    with tempfile.TemporaryDirectory() as h, tempfile.TemporaryDirectory() as c:
        home, cwd = Path(h), Path(c)
        with scopes(home, cwd):
            body = [_panel(name="alpha", model="claude-sonnet-4.5", role="architect", weight=2)]
            resp = put_panels("global", {"panels": body})
            check("valid PUT global -> 200", resp.status == 200)
            check("valid PUT echoes written=true", resp.body.get("written") is True)
            file = home / ".rutherford" / "native-panels.toon"
            check("valid PUT wrote the file", file.is_file())
            check(
                "PUT echo carries the panel",
                any(p["name"] == "alpha" for p in resp.body.get("panels", [])),
            )
            # Verify GET reads back the SAME content (name + seat fields).
            got = get_panels()
            gsrc = next((s for s in got.body["sources"] if s["scope"] == "global"), None)
            check("GET has a global source", gsrc is not None)
            gp = next((p for p in (gsrc or {}).get("panels", []) if p["name"] == "alpha"), None)
            check("GET returns the alpha panel", gp is not None)
            seat0 = (gp or {}).get("seats", [{}])[0]
            check("GET round-trips seat model", seat0.get("model") == "claude-sonnet-4.5")
            check("GET round-trips seat role", seat0.get("role") == "architect")
            check("GET round-trips seat weight", seat0.get("weight") == 2)


def test_config_dir_scope_and_precedence():
    with tempfile.TemporaryDirectory() as h, tempfile.TemporaryDirectory() as c, tempfile.TemporaryDirectory() as g:
        home, cwd, cfg = Path(h), Path(c), Path(g)
        with scopes(home, cwd, cfg):
            # config_dir must be an offered scope.
            got0 = get_panels()
            check("config_dir appears in scopes list", "config_dir" in got0.body.get("scopes", []))
            # Same-named panel in BOTH global and config_dir; config_dir wins.
            put_panels("global", {"panels": [_panel(name="shared", model="global-model")]})
            resp_cfg = put_panels("config_dir", {"panels": [_panel(name="shared", model="cfg-model")]})
            check("PUT config_dir -> 200", resp_cfg.status == 200)
            check(
                "config_dir file written under $RUTHERFORD_CONFIG_DIR",
                (cfg / "native-panels.toon").is_file(),
            )
            got = get_panels()
            by_scope = {s["scope"]: s for s in got.body["sources"]}
            gpanel = next(p for p in by_scope["global"]["panels"] if p["name"] == "shared")
            cpanel = next(p for p in by_scope["config_dir"]["panels"] if p["name"] == "shared")
            check("global copy is shadowed (resolved=false)", gpanel.get("resolved") is False)
            check(
                "global copy names config_dir as the winner",
                gpanel.get("resolved_scope") == "config_dir",
            )
            check("config_dir copy is the resolved one", cpanel.get("resolved") is True)


def test_dedup_when_home_equals_cwd():
    with tempfile.TemporaryDirectory() as h:
        home = Path(h)
        with scopes(home, home):  # home == cwd -> scopes must collapse to one
            got = get_panels()
            check("home==cwd collapses to a single scope", got.body.get("scopes") == ["global"])
            check("home==cwd yields one source", len(got.body["sources"]) == 1)
            # A PUT to the now-nonexistent 'workspace' scope must be rejected.
            resp = put_panels("workspace", {"panels": [_panel()]})
            check("PUT to a collapsed 'workspace' scope -> 400", resp.status == 400)


def test_invalid_bodies_rejected_and_no_write():
    with tempfile.TemporaryDirectory() as h, tempfile.TemporaryDirectory() as c:
        home, cwd = Path(h), Path(c)
        file = home / ".rutherford" / "native-panels.toon"
        with scopes(home, cwd):
            cases = {
                "missing model": [{"name": "x", "engine": "native", "seats": [{"role": "architect"}]}],
                "engine != native": [
                    {"name": "x", "engine": "mcp", "seats": [{"model": "m"}]}
                ],
                "negative weight": [_panel(model="m", weight=-1)],
                "non-bool parity": [_panel(model="m", parity="yes")],
                # Malformed numeric weights: float("nan")/float("inf") SUCCEED and a
                # huge value overflows — before the fix the later int(wv) raised a
                # ValueError/OverflowError that surfaced as a 500 for user input.
                # Each must now be a clean 400 with NO file written.
                "weight nan": [_panel(model="m", weight="nan")],
                "weight inf": [_panel(model="m", weight="inf")],
                "weight 1e309 (inf)": [_panel(model="m", weight=1e309)],
                "weight overflow int": [_panel(model="m", weight=10**400)],
            }
            for label, body in cases.items():
                resp = put_panels("global", {"panels": body})
                check(f"invalid body ({label}) -> 400", resp.status == 400)
                check(f"invalid body ({label}) does not report written", resp.body.get("written") is not True)
            check("no file written after only-invalid PUTs", not file.exists())

            # Bad scope query -> 400.
            resp = put_panels("bogus", {"panels": [_panel()]})
            check("bad scope -> 400", resp.status == 400)
            # Malformed JSON body -> 400.
            resp = put_panels("global", None, json_raises=True)
            check("malformed JSON -> 400", resp.status == 400)


def test_failed_write_does_not_report_success_and_no_traceback_leak():
    with tempfile.TemporaryDirectory() as h, tempfile.TemporaryDirectory() as c:
        home, cwd = Path(h), Path(c)
        with scopes(home, cwd):
            orig = native_panels.atomic_write

            def boom(path, panels):
                raise OSError(f"disk full at {path}")

            native_panels.atomic_write = boom  # type: ignore[assignment]
            try:
                resp = put_panels("global", {"panels": [_panel()]})
            finally:
                native_panels.atomic_write = orig  # type: ignore[assignment]

            check("write failure -> 500", resp.status == 500)
            check("write failure does not report written=true", resp.body.get("written") is not True)
            check("write failure returns a correlation id", bool(resp.body.get("error_id")))
            # The traceback (with absolute paths) must NOT cross the wire.
            check("no 'traceback' key leaked to client", "traceback" not in resp.body)
            serialized = repr(resp.body)
            check("no 'Traceback' string leaked", "Traceback" not in serialized)
            check("no absolute scope path leaked", str(home) not in serialized)


def test_reread_failure_does_not_report_success_and_no_traceback_leak():
    # The write SUCCEEDS (file lands), but the POST-WRITE reread/parse the handler
    # does to verify persistence fails. That must NOT be reported as a saved panel:
    # no 200, no written=true, and no filesystem path from the exception may leak.
    with tempfile.TemporaryDirectory() as h, tempfile.TemporaryDirectory() as c:
        home, cwd = Path(h), Path(c)
        file = home / ".rutherford" / "native-panels.toon"
        with scopes(home, cwd):
            orig_write = native_panels.atomic_write
            orig_parse = native_panels.parse

            def write_then_break_reread(path, panels):
                # Real write: the file genuinely lands and passes its own internal
                # round-trip (which uses the real parse) before we poison anything.
                orig_write(path, panels)

                # Now poison ONLY the subsequent reread the route performs next.
                def broken_parse(text):
                    raise OSError(f"cannot read {path}")

                native_panels.parse = broken_parse  # type: ignore[assignment]

            native_panels.atomic_write = write_then_break_reread  # type: ignore[assignment]
            try:
                resp = put_panels("global", {"panels": [_panel()]})
            finally:
                native_panels.atomic_write = orig_write  # type: ignore[assignment]
                native_panels.parse = orig_parse  # type: ignore[assignment]

            check("reread failure -> non-200", resp.status != 200)
            check("reread failure -> 500", resp.status == 500)
            check(
                "reread failure does not report written=true",
                resp.body.get("written") is not True,
            )
            check("reread failure returns a correlation id", bool(resp.body.get("error_id")))
            # The write actually landed even though the verify reread failed.
            check("file landed on disk despite reread failure", file.is_file())
            # The OSError message embedded the absolute path — it must not cross the wire.
            serialized = repr(resp.body)
            check("no 'traceback' key leaked (reread)", "traceback" not in resp.body)
            check("no 'Traceback' string leaked (reread)", "Traceback" not in serialized)
            check("no absolute scope path leaked (reread)", str(home) not in serialized)


def main() -> int:
    for fn in (
        test_valid_roundtrip_global,
        test_config_dir_scope_and_precedence,
        test_dedup_when_home_equals_cwd,
        test_invalid_bodies_rejected_and_no_write,
        test_failed_write_does_not_report_success_and_no_traceback_leak,
        test_reread_failure_does_not_report_success_and_no_traceback_leak,
    ):
        fn()
    total = _passed + _failed
    if _failed:
        print(f"\n✗ native_routes tests: {_passed}/{total} passed, {_failed} failed")
        return 1
    print(f"✓ native_routes tests: {_passed}/{total} passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
