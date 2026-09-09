"""Rutherford config/status UI backend routes (Phase 2).

Installed-app convention (verified against kiro_crew.apps.route_registry):

    register_routes(ctx: AppContext) -> list[AppRoute]

Each AppRoute(method, path, handler) is dispatched by the gateway's
RouteRegistry under the app's base prefix ``/api/apps/rutherford``. Handlers
receive ``(request: web.Request, ctx: AppContext)`` and return a
``web.Response``.

READ layer (GET): resolve config.toml in both scopes, parse ``[agents.*]``
tables (default_model / enabled / env), fold in ``acp.json`` (global + project),
and surface any ``RUTHERFORD_*`` environment overrides. Always report
``{path, scope, platform, exists}`` so the UI can show the native path even
when the file is absent.

WRITE layer (PUT /config?scope=global|workspace): accept a JSON body, serialize
it to TOML (hand-serialized for the limited supported schema; comment
preservation is intentionally NOT attempted), and write it to the resolved
config.toml for that scope. Safety: validate the serialized TOML re-parses
before touching disk, write atomically (temp file in the same dir + os.replace),
snapshot the prior file to a timestamped ``.bak-YYYY-MM-DD`` first, reject path
traversal, and only ever write the resolved global/workspace config.toml path.
"""
from __future__ import annotations

import os
import sys
import tempfile
import tomllib
from datetime import date
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


def _global_config_dir() -> Path:
    """Directory holding the global config.toml / acp.json, per-platform.

    Windows: %APPDATA%\\rutherford
    Linux/macOS: $XDG_CONFIG_HOME/rutherford, else ~/.config/rutherford
    """
    if _PLATFORM.startswith("win"):
        appdata = os.environ.get("APPDATA")
        base = Path(appdata) if appdata else _home() / "AppData" / "Roaming"
        return base / "rutherford"
    xdg = os.environ.get("XDG_CONFIG_HOME")
    base = Path(xdg) if xdg else _home() / ".config"
    return base / "rutherford"


def _global_config_path() -> Path:
    """Global Rutherford config.toml.

    RUTHERFORD_CONFIG, when set, REPLACES file discovery and points directly at
    the config file (surfaced separately as an env override).
    """
    override = os.environ.get("RUTHERFORD_CONFIG")
    if override:
        return Path(override)
    return _global_config_dir() / "config.toml"


# Project-scope config candidates, in resolution order.
_PROJECT_CONFIG_CANDIDATES = (
    ("rutherford.toml",),
    (".rutherford.toml",),
    (".rutherford", "config.toml"),
)


def _project_root() -> Path:
    """Best-effort project root for a UI backend running in the gateway.

    The gateway has no per-request cwd for an app, so we use the process cwd.
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


def _resolve_config_path(scope: str) -> Path:
    if scope == "global":
        return _global_config_path()
    path, _ = _project_config_path()
    return path


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


# Scalar keys we treat as top-level agent settings (everything else under an
# [agents.<id>] table besides `env` is surfaced verbatim under `extra`).
_AGENT_KNOWN_KEYS = ("default_model", "enabled")


def _parse_agents(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Structured view of every [agents.<id>] table.

    Surfaces id, default_model, enabled (default True when absent — Rutherford
    treats a declared agent as enabled unless enabled=false), the per-agent
    [agents.<id>.env] map, and any other keys under `extra`.
    """
    agents_tbl = data.get("agents")
    if not isinstance(agents_tbl, dict):
        return []
    out: list[dict[str, Any]] = []
    for agent_id, tbl in agents_tbl.items():
        if not isinstance(tbl, dict):
            continue
        env = tbl.get("env") if isinstance(tbl.get("env"), dict) else {}
        extra = {
            k: v
            for k, v in tbl.items()
            if k not in _AGENT_KNOWN_KEYS and k != "env"
        }
        out.append(
            {
                "id": agent_id,
                "default_model": tbl.get("default_model"),
                "enabled": bool(tbl.get("enabled", True)),
                "env": {str(k): str(v) for k, v in env.items()},
                "extra": extra,
            }
        )
    return out


# RUTHERFORD_* environment overrides we surface. RUTHERFORD_CONFIG replaces file
# discovery entirely; the rest override individual settings.
_ENV_OVERRIDE_KEYS = (
    "RUTHERFORD_CONFIG",
    "RUTHERFORD_MAX_DEPTH",
    "RUTHERFORD_MAX_TARGETS",
    "RUTHERFORD_MAX_CONCURRENCY",
    "RUTHERFORD_DEFAULT_TIMEOUT_S",
    "RUTHERFORD_DEFAULT_SAFETY",
    "RUTHERFORD_TRUSTED_WORKSPACES",
    "RUTHERFORD_ROLE_DIRS",
)


def _env_overrides() -> dict[str, Any]:
    """Surface any RUTHERFORD_* overrides that are actually set."""
    out: dict[str, Any] = {}
    for key in _ENV_OVERRIDE_KEYS:
        val = os.environ.get(key)
        if val is not None and val != "":
            out[key] = val
    if "RUTHERFORD_CONFIG" in out:
        out["_note"] = "RUTHERFORD_CONFIG replaces file discovery for the global scope."
    return out


def _acp_source(path: Path, scope: str) -> dict[str, Any]:
    """Read an acp.json (global or project) and fold its agent_servers.

    Reports {path, scope, platform, exists} plus the agent_servers table when
    present. JSON parse errors are surfaced, not raised.
    """
    entry: dict[str, Any] = {**_meta(path, scope)}
    if path.is_file():
        import json

        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
            servers = raw.get("agent_servers") if isinstance(raw, dict) else None
            entry["agent_servers"] = servers if isinstance(servers, dict) else {}
        except (OSError, ValueError) as exc:
            entry["error"] = f"{type(exc).__name__}: {exc}"
            entry["agent_servers"] = {}
    else:
        entry["agent_servers"] = {}
    return entry


def _acp_sources() -> list[dict[str, Any]]:
    """acp.json in the global config dir + the project .rutherford dir."""
    return [
        _acp_source(_global_config_dir() / "acp.json", "global"),
        _acp_source(_project_root() / ".rutherford" / "acp.json", "workspace"),
    ]


# --------------------------------------------------------------------------
# TOML serialization (limited schema, no comment preservation)
# --------------------------------------------------------------------------

def _toml_scalar(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, float):
        return repr(value)
    # string — use TOML basic string with escapes (handles Windows backslashes).
    s = str(value)
    s = s.replace("\\", "\\\\").replace('"', '\\"')
    s = s.replace("\n", "\\n").replace("\t", "\\t").replace("\r", "\\r")
    return f'"{s}"'


def _toml_array(values: list[Any]) -> str:
    return "[" + ", ".join(_toml_scalar(v) for v in values) + "]"


def _toml_value(value: Any) -> str:
    if isinstance(value, list):
        return _toml_array(value)
    return _toml_scalar(value)


def _serialize_toml(data: dict[str, Any]) -> str:
    """Hand-serialize the supported config schema to TOML text.

    Supported: top-level scalars (bool/int/float/str) and arrays, plus
    ``[agents.<id>]`` subtables carrying default_model / enabled and an optional
    ``[agents.<id>.env]`` map. Nested dicts other than ``agents`` are rejected by
    the caller's validation; comments are not preserved (by design).
    """
    lines: list[str] = []

    # Top-level scalars/arrays first (skip the agents table — emitted as subtables).
    for key, value in data.items():
        if key == "agents":
            continue
        if isinstance(value, dict):
            # Unknown nested table — not part of the supported write schema.
            raise ValueError(f"unsupported nested table at top level: {key!r}")
        lines.append(f"{key} = {_toml_value(value)}")

    agents = data.get("agents")
    if isinstance(agents, dict):
        for agent_id, tbl in agents.items():
            if not isinstance(tbl, dict):
                raise ValueError(f"[agents.{agent_id}] must be a table")
            if lines:
                lines.append("")
            lines.append(f"[agents.{agent_id}]")
            env = None
            for k, v in tbl.items():
                if k == "env":
                    env = v
                    continue
                if isinstance(v, dict):
                    raise ValueError(
                        f"unsupported nested table [agents.{agent_id}.{k}]"
                    )
                lines.append(f"{k} = {_toml_value(v)}")
            if isinstance(env, dict) and env:
                lines.append(f"[agents.{agent_id}.env]")
                for ek, ev in env.items():
                    lines.append(f"{ek} = {_toml_scalar(str(ev))}")

    return "\n".join(lines) + "\n"


def _atomic_write_toml(path: Path, data: dict[str, Any]) -> None:
    """Serialize + validate + atomically write config.toml, backing up first.

    Raises ValueError if the serialized text does not re-parse as valid TOML.
    """
    text = _serialize_toml(data)

    # Validate: the serialized text must re-parse cleanly before we touch disk.
    try:
        tomllib.loads(text)
    except tomllib.TOMLDecodeError as exc:
        raise ValueError(f"serialized config is not valid TOML: {exc}") from exc

    path.parent.mkdir(parents=True, exist_ok=True)

    # Timestamped backup of the prior file (match the user's .bak-YYYY-MM-DD style).
    if path.is_file():
        stamp = date.today().isoformat()
        bak = path.with_name(f"{path.name}.bak-{stamp}")
        # Avoid clobbering an earlier same-day backup.
        n = 1
        while bak.exists():
            bak = path.with_name(f"{path.name}.bak-{stamp}.{n}")
            n += 1
        bak.write_bytes(path.read_bytes())

    # Atomic replace: temp file in the same dir, then os.replace.
    fd, tmp = tempfile.mkstemp(
        dir=str(path.parent), prefix=path.name + ".", suffix=".tmp"
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _validate_write_body(body: Any) -> tuple[dict[str, Any] | None, str | None]:
    """Validate an incoming write body against the supported schema.

    Returns (clean_data, error). Rejects non-object bodies and nested tables
    other than the agents subtables handled by the serializer.
    """
    if not isinstance(body, dict):
        return None, "body must be a JSON object"
    for key, value in body.items():
        if key == "agents":
            if not isinstance(value, dict):
                return None, "'agents' must be an object"
            for aid, tbl in value.items():
                if not isinstance(tbl, dict):
                    return None, f"agent {aid!r} must be an object"
                env = tbl.get("env")
                if env is not None and not isinstance(env, dict):
                    return None, f"agent {aid!r} env must be an object"
            continue
        if isinstance(value, dict):
            return None, f"unsupported nested object at top level: {key!r}"
        if isinstance(value, list):
            for item in value:
                if isinstance(item, (dict, list)):
                    return None, f"array {key!r} may only contain scalars"
    return body, None


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

    path = _resolve_config_path(scope)
    data, error = _read_toml(path)
    payload: dict[str, Any] = {**_meta(path, scope)}
    if error:
        payload["error"] = error
    payload["config"] = data
    payload["agents"] = _parse_agents(data)
    # Convenience: surface pathsep-joined settings pre-split for the UI.
    payload["derived"] = {
        "enabled_agents": _split_pathsep(data.get("enabled_agents", [])),
        "trusted_workspaces": _split_pathsep(data.get("trusted_workspaces", [])),
        "role_dirs": _split_pathsep(data.get("role_dirs", [])),
    }
    payload["acp"] = _acp_sources()
    payload["env_overrides"] = _env_overrides()
    return web.json_response(payload)


async def _handle_config_write(request: web.Request, ctx: AppContext) -> web.Response:
    """PUT /config?scope=global|workspace — write config.toml (Phase 2)."""
    scope = (request.query.get("scope") or "global").lower()
    if scope not in ("global", "workspace"):
        return web.json_response(
            {"error": f"invalid scope {scope!r}; expected global|workspace"},
            status=400,
        )

    try:
        body = await request.json()
    except (ValueError, TypeError) as exc:
        return web.json_response(
            {"error": f"invalid JSON body: {exc}"}, status=400
        )

    clean, verr = _validate_write_body(body)
    if verr is not None:
        return web.json_response({"error": verr}, status=400)
    assert clean is not None

    # Only ever write the resolved global/workspace config.toml path. The path
    # comes from our own resolver, never from the request, so traversal cannot
    # steer it — but we defensively confirm the target is named config.toml
    # inside its resolved parent and reject anything else.
    path = _resolve_config_path(scope)
    resolved = path.resolve()
    if resolved.name != "config.toml":
        return web.json_response(
            {"error": "refusing to write a non config.toml target"}, status=400
        )
    # Reject an obvious traversal attempt smuggled via RUTHERFORD_CONFIG.
    if ".." in Path(os.environ.get("RUTHERFORD_CONFIG", "")).parts:
        return web.json_response(
            {"error": "path traversal in RUTHERFORD_CONFIG is rejected"},
            status=400,
        )

    try:
        _atomic_write_toml(path, clean)
    except ValueError as exc:
        return web.json_response({"error": str(exc)}, status=400)
    except OSError as exc:
        return web.json_response(
            {"error": f"{type(exc).__name__}: {exc}"}, status=500
        )

    # Re-read and return the fresh structured payload so the UI can update in place.
    data, error = _read_toml(path)
    payload: dict[str, Any] = {**_meta(path, scope), "written": True}
    if error:
        payload["error"] = error
    payload["config"] = data
    payload["agents"] = _parse_agents(data)
    payload["derived"] = {
        "enabled_agents": _split_pathsep(data.get("enabled_agents", [])),
        "trusted_workspaces": _split_pathsep(data.get("trusted_workspaces", [])),
        "role_dirs": _split_pathsep(data.get("role_dirs", [])),
    }
    payload["acp"] = _acp_sources()
    payload["env_overrides"] = _env_overrides()
    return web.json_response(payload)


async def _handle_status(request: web.Request, ctx: AppContext) -> web.Response:
    """GET /status — resolved agent roster + config locations + acp + env.

    Reachability (live doctor probe) is a Phase 1.5 TODO: it is not cleanly
    callable from this in-process backend, so we return config-declared enabled
    agents and mark reachability as a known gap.
    """
    g_path = _global_config_path()
    p_path, _ = _project_config_path()
    g_data, g_err = _read_toml(g_path)
    p_data, p_err = _read_toml(p_path)

    # Project scope overrides global for the "effective" roster view.
    enabled_global = _split_pathsep(g_data.get("enabled_agents", []))
    enabled_project = _split_pathsep(p_data.get("enabled_agents", []))
    effective_enabled = enabled_project or enabled_global

    # Structured agents from both scopes; project overrides global by id.
    agents_by_id: dict[str, dict[str, Any]] = {}
    for a in _parse_agents(g_data):
        agents_by_id[a["id"]] = {**a, "source": "global"}
    for a in _parse_agents(p_data):
        agents_by_id[a["id"]] = {**a, "source": "workspace"}

    # Resolved roster: agents that are enabled AND (if an allowlist is set) in it.
    roster: list[dict[str, Any]] = []
    for aid, a in agents_by_id.items():
        if effective_enabled and aid not in effective_enabled:
            continue
        if not a.get("enabled", True):
            continue
        roster.append(
            {
                "id": aid,
                "default_model": a.get("default_model"),
                "source": a.get("source"),
            }
        )
    # Allowlisted agents with no [agents.<id>] table still belong to the roster.
    known_ids = set(agents_by_id)
    for aid in effective_enabled:
        if aid not in known_ids:
            roster.append({"id": aid, "default_model": None, "source": "allowlist"})

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
            "roster": sorted(roster, key=lambda r: r["id"]),
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
        "acp": _acp_sources(),
        "env_overrides": _env_overrides(),
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

    Extracts each named panel plus its description, strategy, and declared
    target count. Read-only and best-effort.
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
    """Return the app's routes. Base prefix /api/apps/rutherford is applied by
    the gateway's RouteRegistry. GET routes are read-only; PUT /config writes
    config.toml (Phase 2)."""
    return [
        AppRoute("GET", "/status", _handle_status),
        AppRoute("GET", "/config", _handle_config),
        AppRoute("PUT", "/config", _handle_config_write),
        AppRoute("GET", "/panels", _handle_panels),
        AppRoute("GET", "/roles", _handle_roles),
    ]
