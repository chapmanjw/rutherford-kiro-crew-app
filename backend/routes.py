"""Rutherford config/status UI — read-only backend routes (Phase 1).

Installed-app convention (verified against kiro_crew.apps.route_registry):

    register_routes(ctx: AppContext) -> list[AppRoute]

Each AppRoute(method, path, handler) is dispatched by the gateway's
RouteRegistry under the app's base prefix ``/api/apps/rutherford``. Handlers
receive ``(request: web.Request, ctx: AppContext)`` and return a
``web.Response``. Everything here is READ-ONLY: GET only, no mutation of any
Rutherford file.

Rutherford config lives in two scopes and several platform-specific
locations. We resolve them per-platform, read with tomllib, and always report
``{path, scope, platform, exists}`` so the UI can show the native path even
when the file is absent.
"""
from __future__ import annotations

import os
import sys
import tomllib
from pathlib import Path
from typing import Any

from aiohttp import web

from kiro_crew.apps.context import AppContext
from kiro_crew.apps.route_registry import AppRoute

# --------------------------------------------------------------------------
# Platform / path resolution
# --------------------------------------------------------------------------

_PLATFORM = sys.platform  # "win32" | "darwin" | "linux"


def _platform_label() -> str:
    if _PLATFORM.startswith("win"):
        return "windows"
    if _PLATFORM == "darwin":
        return "macos"
    return "linux"


def _home() -> Path:
    return Path.home()


def _global_config_path() -> Path:
    """Global Rutherford config.toml, resolved per-platform.

    Windows: %APPDATA%\\rutherford\\config.toml
    Linux/macOS: $XDG_CONFIG_HOME/rutherford/config.toml, else ~/.config/rutherford/config.toml
    """
    if _PLATFORM.startswith("win"):
        appdata = os.environ.get("APPDATA")
        base = Path(appdata) if appdata else _home() / "AppData" / "Roaming"
        return base / "rutherford" / "config.toml"
    xdg = os.environ.get("XDG_CONFIG_HOME")
    base = Path(xdg) if xdg else _home() / ".config"
    return base / "rutherford" / "config.toml"


# Project-scope config candidates, in resolution order.
_PROJECT_CONFIG_CANDIDATES = (
    ("rutherford.toml",),
    (".rutherford.toml",),
    (".rutherford", "config.toml"),
)


def _project_root() -> Path:
    """Best-effort project root for a UI backend running in the gateway.

    The gateway has no per-request cwd for an app, so we use the process cwd.
    Phase 1 is read-only and clearly labels scope=workspace + the resolved
    path, so an empty result here is honest, not misleading.
    """
    return Path.cwd()


def _project_config_path() -> tuple[Path, bool]:
    """First existing project-scope config; else the canonical first candidate."""
    root = _project_root()
    for parts in _PROJECT_CONFIG_CANDIDATES:
        candidate = root.joinpath(*parts)
        if candidate.is_file():
            return candidate, True
    # None exist — report the canonical location (project .rutherford/config.toml).
    return root.joinpath(*_PROJECT_CONFIG_CANDIDATES[-1]), False


def _rutherford_dirs() -> list[Path]:
    """Directories that hold panels.toon and roles/ — global (~/.rutherford)
    and project (<cwd>/.rutherford)."""
    return [_home() / ".rutherford", _project_root() / ".rutherford"]


# --------------------------------------------------------------------------
# Readers
# --------------------------------------------------------------------------

def _meta(path: Path, scope: str) -> dict[str, Any]:
    return {
        "path": str(path),
        "scope": scope,
        "platform": _platform_label(),
        "exists": path.is_file(),
    }


def _read_toml(path: Path) -> tuple[dict[str, Any], str | None]:
    """Read+parse a TOML file. Returns (data, error). Missing file is not an
    error — callers report exists=false."""
    if not path.is_file():
        return {}, None
    try:
        with path.open("rb") as fh:
            return tomllib.load(fh), None
    except (OSError, tomllib.TOMLDecodeError) as exc:
        return {}, f"{type(exc).__name__}: {exc}"


def _split_pathsep(value: Any) -> list[str]:
    """Split a config value that may be a native os.pathsep-joined string OR an
    already-parsed TOML list into a list of entries."""
    if isinstance(value, list):
        return [str(v) for v in value]
    if isinstance(value, str) and value:
        return [p for p in value.split(os.pathsep) if p]
    return []


# --------------------------------------------------------------------------
# Handlers
# --------------------------------------------------------------------------

async def _handle_config(request: web.Request, ctx: AppContext) -> web.Response:
    """GET /config?scope=global|workspace — read-only config viewer payload."""
    scope = (request.query.get("scope") or "global").lower()
    if scope not in ("global", "workspace"):
        return web.json_response(
            {"error": f"invalid scope {scope!r}; expected global|workspace"},
            status=400,
        )

    if scope == "global":
        path = _global_config_path()
    else:
        path, _ = _project_config_path()

    data, error = _read_toml(path)
    payload: dict[str, Any] = {**_meta(path, scope)}
    if error:
        payload["error"] = error
    payload["config"] = data
    # Convenience: surface pathsep-joined settings pre-split for the UI.
    payload["derived"] = {
        "enabled_agents": _split_pathsep(data.get("enabled_agents", [])),
        "trusted_workspaces": _split_pathsep(data.get("trusted_workspaces", [])),
        "role_dirs": _split_pathsep(data.get("role_dirs", [])),
    }
    return web.json_response(payload)


async def _handle_status(request: web.Request, ctx: AppContext) -> web.Response:
    """GET /status — enabled/declared agents + config locations.

    Reachability (live doctor probe) is a Phase 1.5 TODO: it is not cleanly
    callable from this in-process backend, so we return config-declared enabled
    agents and mark reachability as a known gap rather than blocking Phase 1.
    """
    g_path = _global_config_path()
    p_path, _ = _project_config_path()
    g_data, g_err = _read_toml(g_path)
    p_data, p_err = _read_toml(p_path)

    # Project scope overrides global for the "effective" roster view.
    enabled_global = _split_pathsep(g_data.get("enabled_agents", []))
    enabled_project = _split_pathsep(p_data.get("enabled_agents", []))
    effective_enabled = enabled_project or enabled_global

    def _mode(d: dict[str, Any]) -> str | None:
        v = d.get("default_safety_mode")
        return str(v) if v is not None else None

    payload = {
        "platform": _platform_label(),
        "agents": {
            # When no allowlist is set, Rutherford enables every built-in plus
            # any configured agent — we cannot enumerate that from config alone,
            # so an empty list means "all built-ins (no allowlist configured)".
            "enabled": effective_enabled,
            "enabled_source": "project" if enabled_project else ("global" if enabled_global else "default-all"),
            "allowlist_configured": bool(effective_enabled),
        },
        "defaults": {
            "safety_mode": _mode(p_data) or _mode(g_data),
            "auto_detect_local_models": (
                p_data.get("auto_detect_local_models")
                if "auto_detect_local_models" in p_data
                else g_data.get("auto_detect_local_models")
            ),
        },
        "config_locations": {
            "global": _meta(g_path, "global"),
            "workspace": _meta(p_path, "workspace"),
        },
        "reachability": {
            "available": False,
            "note": "Live doctor reachability is a Phase 1.5 TODO — not probed by the read-only backend.",
        },
    }
    if g_err:
        payload["config_locations"]["global"]["error"] = g_err
    if p_err:
        payload["config_locations"]["workspace"]["error"] = p_err
    return web.json_response(payload)


def _parse_panels_toon(text: str) -> list[dict[str, Any]]:
    """Light structural parse of panels.toon (indentation-based TOON).

    We extract each named panel plus its description, strategy, and declared
    target count. This intentionally avoids a hard TOON dependency: it reads
    the two-space-indented ``name:`` keys under a top-level ``panels:`` block
    and the ``targets[N]:`` count. Read-only and best-effort.
    """
    panels: list[dict[str, Any]] = []
    lines = text.splitlines()
    in_panels = False
    current: dict[str, Any] | None = None

    def _indent(s: str) -> int:
        return len(s) - len(s.lstrip(" "))

    for raw in lines:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        stripped = raw.strip()
        indent = _indent(raw)
        if not in_panels:
            if stripped.rstrip() == "panels:":
                in_panels = True
            continue
        # Panel name lives at indent 2 and ends with ':'
        if indent == 2 and stripped.endswith(":"):
            if current:
                panels.append(current)
            current = {"name": stripped[:-1].strip(), "description": "", "strategy": "", "targets": None}
            continue
        if current is None:
            continue
        if stripped.startswith("description:"):
            current["description"] = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("strategy:"):
            current["strategy"] = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("targets"):
            # e.g. "targets[2]:"
            lb, rb = stripped.find("["), stripped.find("]")
            if lb != -1 and rb != -1 and rb > lb:
                try:
                    current["targets"] = int(stripped[lb + 1 : rb])
                except ValueError:
                    current["targets"] = None
    if current:
        panels.append(current)
    return panels


async def _handle_panels(request: web.Request, ctx: AppContext) -> web.Response:
    """GET /panels — named panels from panels.toon across global + project scopes."""
    result: list[dict[str, Any]] = []
    for d in _rutherford_dirs():
        scope = "global" if d == _home() / ".rutherford" else "workspace"
        path = d / "panels.toon"
        meta = _meta(path, scope)
        entry: dict[str, Any] = {**meta, "panels": []}
        if path.is_file():
            try:
                entry["panels"] = _parse_panels_toon(path.read_text(encoding="utf-8"))
            except OSError as exc:
                entry["error"] = f"{type(exc).__name__}: {exc}"
        result.append(entry)
    return web.json_response({"platform": _platform_label(), "sources": result})


async def _handle_roles(request: web.Request, ctx: AppContext) -> web.Response:
    """GET /roles — role markdown files under global + project .rutherford/roles
    plus any role_dirs declared in config."""
    dirs: list[tuple[Path, str]] = []
    for d in _rutherford_dirs():
        scope = "global" if d == _home() / ".rutherford" else "workspace"
        dirs.append((d / "roles", scope))

    # role_dirs from config (both scopes), split on os.pathsep.
    g_data, _ = _read_toml(_global_config_path())
    p_path, _ = _project_config_path()
    p_data, _ = _read_toml(p_path)
    for cfg in (g_data, p_data):
        for entry in _split_pathsep(cfg.get("role_dirs", [])):
            dirs.append((Path(entry), "config:role_dirs"))

    sources: list[dict[str, Any]] = []
    seen: set[str] = set()
    for path, scope in dirs:
        key = str(path)
        if key in seen:
            continue
        seen.add(key)
        meta = {
            "path": str(path),
            "scope": scope,
            "platform": _platform_label(),
            "exists": path.is_dir(),
        }
        roles: list[dict[str, str]] = []
        if path.is_dir():
            try:
                for f in sorted(path.glob("*.md")):
                    roles.append({"name": f.stem, "file": f.name, "path": str(f)})
            except OSError as exc:
                meta["error"] = f"{type(exc).__name__}: {exc}"
        sources.append({**meta, "roles": roles})
    return web.json_response({"platform": _platform_label(), "sources": sources})


# --------------------------------------------------------------------------
# Registration
# --------------------------------------------------------------------------

def register_routes(ctx: AppContext) -> list[AppRoute]:
    """Return the app's read-only routes. Base prefix /api/apps/rutherford is
    applied by the gateway's RouteRegistry."""
    return [
        AppRoute("GET", "/status", _handle_status),
        AppRoute("GET", "/config", _handle_config),
        AppRoute("GET", "/panels", _handle_panels),
        AppRoute("GET", "/roles", _handle_roles),
    ]
