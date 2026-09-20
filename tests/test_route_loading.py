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

import importlib.util
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


EXPECTED_PATHS = {
    "/status",
    "/rutherford-meta",
    "/rutherford-native-panels",
    "/rutherford-panels",
    "/rutherford-roles",
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

    got_paths = {r.path for r in result}
    for path in sorted(EXPECTED_PATHS):
        check(f"route table includes {path}", path in got_paths)

    # The /status route must be a GET (the Overview health probe the dashboard hits).
    status_route = next((r for r in result if r.path == "/status"), None)
    check("/status is registered as GET", status_route is not None and status_route.method == "GET")


def main() -> int:
    test_routes_load_under_gateway_path_execution()
    total = _passed + _failed
    if _failed:
        print(f"\n✗ route_loading tests: {_passed}/{total} passed, {_failed} failed")
        return 1
    print(f"✓ route_loading tests: {_passed}/{total} passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
