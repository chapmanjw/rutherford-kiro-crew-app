#!/usr/bin/env python3
"""Gateway-load regression test for ``backend/routes.py`` (fixes the blanket 404).

This reproduces the EXACT way Kiro Crew's ``kiro_crew.apps.route_registry`` loads
an installed app's routes: it executes ``routes.py`` BY ABSOLUTE FILE PATH, with
no ``backend`` package context and ``backend/`` NOT on ``sys.path``. Under that
load, the module's ``native_panels`` import must still resolve, ``register_routes``
must run, and every route must register. The pre-fix two-branch import
(``from backend import native_panels`` / ``import native_panels``) raised
``ImportError`` here, so ``register_routes`` never ran and every backend route
404'd live — while the older tests passed because their harness puts ``backend/``
on ``sys.path``, hiding the bug.

Standalone, stdlib-only, no pytest — run it directly:

    python tests/test_route_loading.py

Exits non-zero on any failing assertion and prints a pass/fail count, matching
the repo convention in ``tests/test_native_panels.py`` / ``test_native_routes.py``.

Falsifiability: temporarily revert routes.py to the old two-branch import and this
test FAILS at ``exec_module`` (the module raises ``ImportError: No module named
'native_panels'``), which is precisely the gateway's live failure.
"""
from __future__ import annotations

import asyncio
import importlib.util
import logging
import sys
import types
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
ROUTES_PATH = BACKEND_DIR / "routes.py"

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
# Stub aiohttp + kiro_crew so routes.py imports in a bare interpreter. These
# stand in for deps the live gateway provides; they are ORTHOGONAL to the bug
# under test (the native_panels import). The AppRoute stub records method/path
# so we can assert on the returned route table, mirroring the real dataclass
# signature AppRoute(method, path, handler).
# --------------------------------------------------------------------------


class _Resp:
    def __init__(self, data, status: int = 200):
        self.body = data
        self.status = status


class _AppRoute:
    def __init__(self, method, path, handler):
        self.method = method
        self.path = path
        self.handler = handler


def _install_dep_stubs() -> None:
    aiohttp = types.ModuleType("aiohttp")
    web = types.ModuleType("aiohttp.web")
    web.json_response = lambda data, status=200: _Resp(data, status)
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
    kc_rr.AppRoute = _AppRoute
    kc.apps = kc_apps
    kc_apps.context = kc_ctx
    kc_apps.route_registry = kc_rr
    sys.modules["kiro_crew"] = kc
    sys.modules["kiro_crew.apps"] = kc_apps
    sys.modules["kiro_crew.apps.context"] = kc_ctx
    sys.modules["kiro_crew.apps.route_registry"] = kc_rr


def _scrub_sys_path_and_modules() -> None:
    """Make the environment match the gateway's file-path load exactly.

    - backend/ must NOT be on sys.path (kills the ``import native_panels`` branch)
    - repo root must NOT be on sys.path (kills ``from backend import native_panels``,
      which would otherwise succeed as a PEP-420 namespace package import)
    - no pre-imported native_panels / backend modules may satisfy the import from
      cache — the module must resolve itself, by path, from __file__.
    """
    drop = {str(REPO_ROOT), str(BACKEND_DIR), ""}
    sys.path[:] = [p for p in sys.path if p not in drop]
    for name in ("native_panels", "rutherford_native_panels", "backend",
                 "backend.native_panels", "routes"):
        sys.modules.pop(name, None)


def _load_routes_like_gateway():
    """spec_from_file_location on the ABSOLUTE path, exec_module — as the gateway does."""
    spec = importlib.util.spec_from_file_location("rutherford_routes", ROUTES_PATH)
    assert spec and spec.loader, "could not build spec for routes.py"
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # <- pre-fix, this raised ImportError('native_panels')
    return mod


# (method, path) pairs — pinning the METHOD (not just the path) so a route that
# silently loses its PUT (e.g. the native-panels WRITE surface) is caught, not just
# a dropped path. The native-panels GET and PUT share one path but are distinct routes.
EXPECTED_ROUTES = {
    ("GET", "/status"),
    ("GET", "/rutherford-meta"),
    ("GET", "/rutherford-config"),
    ("PUT", "/rutherford-config"),
    ("GET", "/panels"),
    ("PUT", "/rutherford-panels"),
    ("GET", "/rutherford-native-panels"),
    ("PUT", "/rutherford-native-panels"),
    ("GET", "/rutherford-roles"),
    ("PUT", "/rutherford-roles"),
}


def test_routes_load_under_gateway_path_execution() -> None:
    _install_dep_stubs()
    _scrub_sys_path_and_modules()

    # Guard: the two package-style import branches genuinely cannot resolve here,
    # so this test really is exercising the path-based fallback (not a stub).
    check("backend/ is not on sys.path", str(BACKEND_DIR) not in sys.path)
    check("repo root is not on sys.path", str(REPO_ROOT) not in sys.path)
    check("no cached 'native_panels' module", "native_panels" not in sys.modules)

    routes = _load_routes_like_gateway()

    # native_panels resolved (routes.py imported it) — and via the PATH branch,
    # which loads it under this explicit name. That proves the fix ran, not a
    # lingering package import.
    check("routes.py resolved native_panels", getattr(routes, "native_panels", None) is not None)
    np = getattr(routes, "native_panels", None)
    check("native_panels is a module", isinstance(np, types.ModuleType))
    check(
        "native_panels loaded by path (spec name)",
        getattr(np, "__name__", None) == "rutherford_native_panels",
    )
    # It's the real module, not an empty shim: its serializer entry points exist.
    check("native_panels exposes parse()", callable(getattr(np, "parse", None)))
    check("native_panels exposes atomic_write()", callable(getattr(np, "atomic_write", None)))

    # register_routes runs without raising and returns the full route table.
    ctx = sys.modules["kiro_crew.apps.context"].AppContext()
    result = routes.register_routes(ctx)
    check("register_routes returns a non-empty list", isinstance(result, list) and len(result) > 0)

    got_routes = {(r.method, r.path) for r in result}
    for method, path in sorted(EXPECTED_ROUTES):
        check(f"route table includes {method} {path}", (method, path) in got_routes)

    # The /status route must be a GET (the Overview health probe the dashboard hits).
    status_route = next((r for r in result if r.path == "/status"), None)
    check("/status is registered as GET", status_route is not None and status_route.method == "GET")


def _load_routes_with_failing_native_panels():
    """Load routes.py the gateway way, but force the native_panels PATH-load to
    raise (simulating a missing native_panels.py / a SyntaxError defect). The
    load must NOT abort routes.py at module scope: register_routes still runs and
    ``native_panels`` degrades to None.

    We patch ``importlib.util.spec_from_file_location`` to raise ONLY for the
    native_panels.py target (routes.py calls it via ``_ilu.spec_from_file_location``
    in its path-load branch), and load routes.py itself through the captured REAL
    function so its own load is unaffected.
    """
    import importlib.util as ilu

    real_spec = ilu.spec_from_file_location

    def failing_spec(name, location=None, *a, **k):
        if location is not None and str(location).endswith("native_panels.py"):
            raise SyntaxError("simulated native_panels.py defect")
        return real_spec(name, location, *a, **k)

    ilu.spec_from_file_location = failing_spec
    try:
        spec = real_spec("rutherford_routes_degraded", ROUTES_PATH)
        assert spec and spec.loader, "could not build spec for routes.py"
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)  # must NOT raise despite native_panels failing
        return mod
    finally:
        ilu.spec_from_file_location = real_spec


class _FakeReq:
    def __init__(self, query=None, body=None):
        self.query = dict(query or {})
        self._body = body

    async def json(self):
        return self._body


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def test_native_panels_load_failure_degrades_gracefully() -> None:
    _install_dep_stubs()
    _scrub_sys_path_and_modules()
    # The degraded path deliberately logs the failure via _LOG.exception; quiet it
    # so the expected traceback does not clutter the test output.
    logging.getLogger("rutherford.routes").setLevel(logging.CRITICAL)

    routes = _load_routes_with_failing_native_panels()

    # native_panels degraded to None — but routes.py import did NOT abort.
    check(
        "native_panels degraded to None on load failure",
        getattr(routes, "native_panels", "MISSING") is None,
    )

    # register_routes STILL runs and returns the FULL route table (MCP config,
    # panels, roles, meta) — no blanket 404 from the native-panels load failing.
    ctx = sys.modules["kiro_crew.apps.context"].AppContext()
    result = routes.register_routes(ctx)
    check(
        "register_routes still returns the full table under degraded native panels",
        isinstance(result, list) and len(result) > 0,
    )
    got_routes = {(r.method, r.path) for r in result}
    for method, path in sorted(EXPECTED_ROUTES):
        check(
            f"degraded route table still includes {method} {path}",
            (method, path) in got_routes,
        )

    # Both native handlers return a clean 503 (not an AttributeError crash on None).
    get_resp = _run(routes._handle_native_panels(_FakeReq(), ctx))
    check("degraded GET /rutherford-native-panels -> 503", get_resp.status == 503)
    check(
        "degraded GET body says native panels unavailable",
        isinstance(get_resp.body, dict)
        and get_resp.body.get("error") == "native panels unavailable",
    )
    put_resp = _run(
        routes._handle_native_panels_write(
            _FakeReq(
                query={"scope": "global"},
                body=[{"name": "x", "engine": "native", "seats": [{"model": "m"}]}],
            ),
            ctx,
        )
    )
    check("degraded PUT /rutherford-native-panels -> 503", put_resp.status == 503)
    check(
        "degraded PUT body says native panels unavailable",
        isinstance(put_resp.body, dict)
        and put_resp.body.get("error") == "native panels unavailable",
    )


def main() -> int:
    test_routes_load_under_gateway_path_execution()
    test_native_panels_load_failure_degrades_gracefully()
    total = _passed + _failed
    if _failed:
        print(f"\n✗ route_loading tests: {_passed}/{total} passed, {_failed} failed")
        return 1
    print(f"✓ route_loading tests: {_passed}/{total} passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
