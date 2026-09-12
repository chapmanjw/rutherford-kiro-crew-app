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

WRITE layer (PUT /rutherford-config?scope=global|workspace): accept a JSON body, serialize
it to TOML (hand-serialized for the limited supported schema; comment
preservation is intentionally NOT attempted), and write it to the resolved
config.toml for that scope. Safety: validate the serialized TOML re-parses
before touching disk, write atomically (temp file in the same dir + os.replace),
snapshot the prior file to a timestamped ``.bak`` first, reject path
traversal, and only ever write the resolved global/workspace config.toml path.

PANELS write layer (PUT /rutherford-panels?scope=global|workspace): accept a JSON
list of panels (or ``{"panels": [...]}``) and serialize it back to valid
panels.toon (TOON, indentation-based). The path is the NON-reserved
``/rutherford-panels`` because Kiro Crew reserves ``/api/apps/<app>/config``; any
NEW write route must likewise avoid reserved names. The serializer round-trips
every panel field (name/description/strategy + seats with cli/model/role/label/
weight/parity/stance, and any unknown key it does not surface). Same safety
envelope as config: a parse→serialize→parse round-trip check before disk, a
timestamped ``.bak``, an atomic temp-file + os.replace, and only ever the
resolved scope's panels.toon path.
"""
from __future__ import annotations

import os
import sys
import tempfile
import tomllib
import traceback
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


def _global_config_dir_candidates() -> list[Path]:
    """Candidate directories that may hold the global config.toml / acp.json,
    in resolution order, per-platform.

    Windows: %APPDATA%\\rutherford, then %USERPROFILE%\\AppData\\Roaming\\rutherford,
    then Path.home()/AppData/Roaming/rutherford. These usually coincide, but the
    fallbacks matter when the gateway process has a WRONG or absent APPDATA:
    APPDATA being *set but wrong* never triggers a Path.home()-only fallback, so
    we probe the home-derived paths explicitly and pick the first that exists.

    Linux/macOS: $XDG_CONFIG_HOME/rutherford, then ~/.config/rutherford.
    """
    candidates: list[Path] = []
    if _PLATFORM.startswith("win"):
        appdata = os.environ.get("APPDATA")
        if appdata:
            candidates.append(Path(appdata) / "rutherford")
        userprofile = os.environ.get("USERPROFILE")
        if userprofile:
            candidates.append(
                Path(userprofile) / "AppData" / "Roaming" / "rutherford"
            )
        candidates.append(_home() / "AppData" / "Roaming" / "rutherford")
    else:
        xdg = os.environ.get("XDG_CONFIG_HOME")
        if xdg:
            candidates.append(Path(xdg) / "rutherford")
        candidates.append(_home() / ".config" / "rutherford")
    # De-dupe while preserving order (APPDATA/USERPROFILE/home frequently coincide).
    seen: set[str] = set()
    unique: list[Path] = []
    for c in candidates:
        key = str(c)
        if key not in seen:
            seen.add(key)
            unique.append(c)
    return unique


def _global_config_dir() -> Path:
    """The global config directory to display / write under.

    Returns the FIRST candidate whose config.toml already exists (so the READ
    surfaces the real file even under a wrong/absent APPDATA), else the FIRST
    (canonical) candidate for display / creation.
    """
    candidates = _global_config_dir_candidates()
    for d in candidates:
        if (d / "config.toml").is_file():
            return d
    return candidates[0]


def _global_config_path() -> Path:
    """Global Rutherford config.toml.

    RUTHERFORD_CONFIG, when set, REPLACES file discovery and points directly at
    the config file (surfaced separately as an env override). Otherwise return
    the first candidate config.toml that EXISTS across the platform's config-dir
    candidates, else the canonical location. This is the SINGLE resolver shared
    by the GET read layer and the PUT write layer (via _resolve_config_path), so
    a Save always targets the same real file the read reported and never creates
    a stray under a wrong APPDATA path.
    """
    override = os.environ.get("RUTHERFORD_CONFIG")
    if override:
        return Path(override)
    for d in _global_config_dir_candidates():
        candidate = d / "config.toml"
        if candidate.is_file():
            return candidate
    # None exist yet — canonical location for display / first-time creation.
    return _global_config_dir_candidates()[0] / "config.toml"


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
# Meta enums — the option sets the UI renders dropdowns from
# --------------------------------------------------------------------------
#
# These mirror Rutherford's own reference (reference/config.md, reference/panels.md)
# so the UI can offer closed dropdowns for values whose valid set is KNOWN, and
# fall back to a free-text datalist for open values (models, ids the user may add).
#
# Agent ids are sourced authoritatively as follows. A backend route handler runs
# in-process in the gateway and is handed only an AppContext (cron/events/storage/
# spawn/job SDKs) — it has NO MCP client surface and no ACP session, so it CANNOT
# call Rutherford's own capabilities/doctor MCP tools, and no permissions.mcpTools
# grant changes that (that grant is an AGENT-side prompting scope, not a backend
# capability). So we take the documented fallback: the built-in roster below,
# UNIONED at request time with every id the user's config actually declares
# (enabled_agents allowlist + [agents.<id>] tables, both scopes) and every
# acp.json agent_servers key. The UI degrades to a free-text datalist so a user
# can always type an id we did not enumerate.

# Rutherford's 19 curated built-in agents (reference/tools.md). Only the ones
# installed + signed in on a given machine actually drive, but all 19 are valid
# ids to reference in config/panels.
_BUILTIN_AGENT_IDS = (
    "goose", "opencode", "vibe", "cline", "junie", "kimi", "openhands",
    "codex", "claude_code", "copilot", "qwen", "droid", "cursor", "kiro",
    "pi", "hermes", "gemini", "qoder", "grok",
)

# Built-in role personas that ship in the Rutherford server (reference/config.md).
# These are NOT files on disk; the roles editor surfaces them read-only as
# reference and only user role FILES are editable.
_BUILTIN_ROLE_IDS = (
    "principal-reviewer", "architect", "debugger", "security-reviewer", "explainer",
)

# Consensus aggregation strategies (reference/panels.md).
_STRATEGIES = (
    "all-voices", "unanimous", "majority", "plurality", "weighted",
    "parity-pair", "rank",
)

# Safety postures (reference/config.md).
_SAFETY_MODES = ("read_only", "propose", "write", "yolo")

# Run persistence dispositions (reference/config.md).
_PERSISTENCE = ("ephemeral", "job")


def _config_derived_agent_ids() -> list[str]:
    """Agent ids the user's config actually declares, across both scopes.

    Union of: enabled_agents allowlist entries, [agents.<id>] table keys, and
    acp.json agent_servers keys — global then project. Order is preserved and
    de-duplicated so the UI can present a stable list.
    """
    ids: list[str] = []

    def _add(candidate: Any) -> None:
        s = str(candidate).strip()
        if s and s not in ids:
            ids.append(s)

    for cfg_path in (_global_config_path(), _project_config_path()[0]):
        data, _ = _read_toml(cfg_path)
        for a in _split_pathsep(data.get("enabled_agents", [])):
            _add(a)
        agents_tbl = data.get("agents")
        if isinstance(agents_tbl, dict):
            for aid in agents_tbl:
                _add(aid)
    for src in _acp_sources():
        for key in (src.get("agent_servers") or {}):
            _add(key)
    return ids


def _role_ids() -> list[str]:
    """Every role id the UI may reference in a panel seat: built-ins first, then
    user role FILE stems discovered under global/project .rutherford/roles and any
    config role_dirs. De-duplicated, order-preserving."""
    ids: list[str] = list(_BUILTIN_ROLE_IDS)
    for src in _list_role_sources():
        for r in src.get("roles", []):
            name = str(r.get("name", "")).strip()
            if name and name not in ids:
                ids.append(name)
    return ids


def _agent_ids_union() -> list[str]:
    """The full agent-id option set for the UI: built-ins UNIONed with every id
    the user's config declares. Built-ins first (stable, familiar), then any
    extra configured/acp id not already listed."""
    ids: list[str] = list(_BUILTIN_AGENT_IDS)
    for aid in _config_derived_agent_ids():
        if aid not in ids:
            ids.append(aid)
    return ids


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
    """GET /rutherford-config?scope=global|workspace — config viewer payload."""
    scope = (request.query.get("scope") or "global").lower()
    if scope not in ("global", "workspace"):
        return web.json_response(
            {"error": f"invalid scope {scope!r}; expected global|workspace"},
            status=400,
        )

    try:
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
    except Exception as exc:  # noqa: BLE001 — surface swallowed errors
        tb = traceback.format_exc()
        return web.json_response(
            {"error": f"{type(exc).__name__}: {exc}", "traceback": tb}, status=500
        )


async def _handle_config_write(request: web.Request, ctx: AppContext) -> web.Response:
    """PUT /rutherford-config?scope=global|workspace — write config.toml."""
    scope = (request.query.get("scope") or "global").lower()
    if scope not in ("global", "workspace"):
        return web.json_response(
            {"error": f"invalid scope {scope!r}; expected global|workspace"},
            status=400,
        )

    try:
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

        # Only ever write the resolved global/workspace config.toml path. The
        # path comes from our own resolver, never from the request, so traversal
        # cannot steer it — but we defensively confirm the target is named
        # config.toml inside its resolved parent and reject anything else.
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

        # Re-read and return the fresh structured payload so the UI can update.
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
    except Exception as exc:  # noqa: BLE001 — surface swallowed errors
        tb = traceback.format_exc()
        return web.json_response(
            {"error": f"{type(exc).__name__}: {exc}", "traceback": tb}, status=500
        )


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


# --------------------------------------------------------------------------
# panels.toon round-trip (TOON — indentation-based, 2-space steps)
# --------------------------------------------------------------------------
#
# The panels file Rutherford speaks is TOON: a top-level ``panels:`` mapping
# whose keys are panel names, each carrying ``description`` / ``strategy`` and a
# ``targets[N]:`` list of seat mappings. The READ layer once extracted only a
# name + description + strategy + seat COUNT; writing back safely needs a full
# structural model that preserves EVERY seat and EVERY seat key (cli / model /
# role / label / weight / parity / stance, and any key we do not surface), so a
# Save never silently drops config. The parser below yields, per panel:
#
#     {"name", "description", "strategy",
#      "targets": [ {ordered seat mapping}, ... ],
#      "extra":   {panel-level keys other than description/strategy/targets}}
#
# and the serializer round-trips it back to byte-identical TOON for the shapes
# the user's real files use. ``_panels_roundtrip_ok`` proves parse→serialize→
# parse equality before any write touches disk.

_TOON_INDENT = "  "  # 2 spaces per level


def _toon_indent_of(s: str) -> int:
    return len(s) - len(s.lstrip(" "))


def _toon_scalar_needs_quote(value: str) -> bool:
    """True when a bare TOON scalar would misparse and must be quoted.

    We quote only when necessary so unquoted values (the common case — models
    like ``gpt-5.6-sol``, strategies, descriptions with ``/ - . ,``) round-trip
    byte-for-byte. Characters that break the bare grammar: the structural ``[``
    / ``]`` (would look like a ``targets[N]`` count), ``:`` (key/value split),
    ``"`` / ``#``, plus leading/trailing whitespace or an empty string.
    """
    if value == "":
        return True
    if value != value.strip():
        return True
    return any(ch in value for ch in ('[', ']', ':', '"', '#'))


def _toon_emit_scalar(value: Any) -> str:
    """Emit a scalar as TOON text (quoting only when required)."""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, float):
        return repr(value)
    s = str(value)
    if _toon_scalar_needs_quote(s):
        esc = s.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{esc}"'
    return s


def _toon_parse_scalar(raw: str) -> Any:
    """Parse a TOON scalar value token back to a Python value.

    Handles a double-quoted string (with \\-escapes), the bools true/false, and
    plain ints; everything else stays a bare string. This mirrors what the
    emitter produces so the pair round-trips.
    """
    raw = raw.strip()
    if len(raw) >= 2 and raw[0] == '"' and raw[-1] == '"':
        body = raw[1:-1]
        out: list[str] = []
        i = 0
        while i < len(body):
            ch = body[i]
            if ch == "\\" and i + 1 < len(body):
                nxt = body[i + 1]
                out.append({"n": "\n", "t": "\t", "r": "\r", '"': '"', "\\": "\\"}.get(nxt, nxt))
                i += 2
                continue
            out.append(ch)
            i += 1
        return "".join(out)
    if raw == "true":
        return True
    if raw == "false":
        return False
    # A bare integer (weights may be written bare). Keep floats/other as string.
    if raw.lstrip("-").isdigit():
        try:
            return int(raw)
        except ValueError:
            return raw
    return raw


# Panel-level keys the structured model names explicitly; anything else a panel
# carries is preserved under ``extra`` and re-emitted so nothing is dropped.
_PANEL_KNOWN_KEYS = ("description", "strategy", "targets")


def _parse_panels_toon(text: str) -> list[dict[str, Any]]:
    """Full structural parse of panels.toon into an ordered list of panels.

    Each panel: {name, description, strategy, targets:[seat maps], extra:{}}.
    Seats preserve key order and all keys. Raises ValueError on a shape the
    round-trip cannot faithfully reproduce (so a write never proceeds blind).
    """
    panels: list[dict[str, Any]] = []
    lines = text.splitlines()
    in_panels = False
    current: dict[str, Any] | None = None
    current_seat: dict[str, Any] | None = None
    in_targets = False

    for raw in lines:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = _toon_indent_of(raw)
        stripped = raw.strip()

        if not in_panels:
            if stripped == "panels:":
                in_panels = True
            continue

        # Panel name: indent 2, ends with ':' and has no value after the colon.
        if indent == 2 and stripped.endswith(":") and ":" == stripped[-1]:
            if current is not None:
                panels.append(current)
            name = stripped[:-1].strip()
            current = {"name": name, "description": "", "strategy": "", "targets": [], "extra": {}}
            current_seat = None
            in_targets = False
            continue

        if current is None:
            continue

        # A seat starts with "- " (indent 6 in the reference files).
        if stripped.startswith("- ") or stripped == "-":
            if not in_targets:
                raise ValueError(f"seat item outside a targets list in panel {current['name']!r}")
            current_seat = {}
            current["targets"].append(current_seat)
            rest = stripped[2:] if stripped.startswith("- ") else ""
            if rest.strip():
                if ":" not in rest:
                    raise ValueError(f"malformed seat line {stripped!r} in panel {current['name']!r}")
                k, v = rest.split(":", 1)
                current_seat[k.strip()] = _toon_parse_scalar(v)
            continue

        # A continuation key of the current seat (indent deeper than the "- ").
        if current_seat is not None and in_targets and indent >= 8 and ":" in stripped and not stripped.endswith(":"):
            k, v = stripped.split(":", 1)
            current_seat[k.strip()] = _toon_parse_scalar(v)
            continue

        # Panel-level key at indent 4.
        if indent == 4:
            current_seat = None
            if stripped.endswith(":") and stripped[:-1].strip().split("[", 1)[0] == "targets":
                # "targets[N]:" — begin the seat list. N is advisory (we recount).
                in_targets = True
                current["targets"] = []
                continue
            in_targets = False
            if ":" not in stripped:
                raise ValueError(f"malformed panel line {stripped!r} in panel {current['name']!r}")
            k, v = stripped.split(":", 1)
            key = k.strip()
            val = _toon_parse_scalar(v)
            if key in ("description", "strategy"):
                current[key] = val
            else:
                current["extra"][key] = val
            continue

        raise ValueError(f"unexpected line {raw!r} in panel {current['name']!r}")

    if current is not None:
        panels.append(current)
    return panels


# Seat key emission order: the reference files use cli, model, role, label; keep
# that order for known keys, then append any unknown keys in first-seen order so
# nothing is dropped and common seats round-trip byte-for-byte.
_SEAT_KEY_ORDER = ("cli", "model", "role", "label", "weight", "parity", "stance")


def _serialize_panels_toon(panels: list[dict[str, Any]]) -> str:
    """Serialize the structured panel list back to TOON text.

    Round-trips the shapes the real files use byte-for-byte. Seat keys are
    emitted in the canonical order above, then any remaining keys in the order
    they appear in the seat mapping (so unknown keys are preserved).
    """
    out: list[str] = ["panels:"]
    for panel in panels:
        name = str(panel.get("name", "")).strip()
        if not name:
            raise ValueError("a panel is missing a name")
        out.append(f"{_TOON_INDENT}{name}:")
        # description / strategy first (matching the reference files), then any
        # extra panel-level keys, then the targets list last.
        desc = panel.get("description", "")
        if desc != "" and desc is not None:
            out.append(f"{_TOON_INDENT * 2}description: {_toon_emit_scalar(desc)}")
        strat = panel.get("strategy", "")
        if strat != "" and strat is not None:
            out.append(f"{_TOON_INDENT * 2}strategy: {_toon_emit_scalar(strat)}")
        extra = panel.get("extra") or {}
        if isinstance(extra, dict):
            for k, v in extra.items():
                out.append(f"{_TOON_INDENT * 2}{k}: {_toon_emit_scalar(v)}")
        seats = panel.get("targets") or []
        if not isinstance(seats, list):
            raise ValueError(f"panel {name!r} targets must be a list")
        out.append(f"{_TOON_INDENT * 2}targets[{len(seats)}]:")
        for seat in seats:
            if not isinstance(seat, dict):
                raise ValueError(f"panel {name!r} has a non-mapping seat")
            ordered = [k for k in _SEAT_KEY_ORDER if k in seat]
            ordered += [k for k in seat if k not in _SEAT_KEY_ORDER]
            if not ordered:
                raise ValueError(f"panel {name!r} has an empty seat")
            first = ordered[0]
            out.append(f"{_TOON_INDENT * 3}- {first}: {_toon_emit_scalar(seat[first])}")
            for k in ordered[1:]:
                out.append(f"{_TOON_INDENT * 4}{k}: {_toon_emit_scalar(seat[k])}")
    return "\n".join(out) + "\n"


def _panels_roundtrip_ok(text: str) -> bool:
    """parse → serialize → parse structural equality guard."""
    first = _parse_panels_toon(text)
    second = _parse_panels_toon(_serialize_panels_toon(first))
    return first == second


def _validate_panels_body(body: Any) -> tuple[list[dict[str, Any]] | None, str | None]:
    """Validate an incoming panels write body into the structured model.

    Accepts either a bare list of panels or ``{"panels": [...]}``. Each panel
    needs a non-empty name and a non-empty targets list; each seat needs a
    non-empty ``cli``. Unknown seat keys are preserved. Returns (panels, error).
    """
    if isinstance(body, dict) and "panels" in body:
        body = body["panels"]
    if not isinstance(body, list):
        return None, "body must be a list of panels (or {\"panels\": [...] })"
    names: set[str] = set()
    clean: list[dict[str, Any]] = []
    for i, p in enumerate(body):
        if not isinstance(p, dict):
            return None, f"panel [{i}] must be an object"
        name = str(p.get("name", "")).strip()
        if not name:
            return None, f"panel [{i}] is missing a non-empty name"
        if name in names:
            return None, f"duplicate panel name {name!r}"
        names.add(name)
        seats_in = p.get("targets")
        if not isinstance(seats_in, list) or not seats_in:
            return None, f"panel {name!r} needs a non-empty targets list"
        seats: list[dict[str, Any]] = []
        for j, s in enumerate(seats_in):
            if not isinstance(s, dict):
                return None, f"panel {name!r} seat [{j}] must be an object"
            cli = str(s.get("cli", "")).strip()
            if not cli:
                return None, f"panel {name!r} seat [{j}] is missing a non-empty cli"
            seat: dict[str, Any] = {}
            for k, v in s.items():
                if v is None:
                    continue
                if isinstance(v, (dict, list)):
                    return None, f"panel {name!r} seat [{j}] key {k!r} must be a scalar"
                sv = str(v).strip() if isinstance(v, str) else v
                if isinstance(sv, str) and sv == "":
                    continue
                seat[k] = sv
            seats.append(seat)
        extra = p.get("extra") if isinstance(p.get("extra"), dict) else {}
        clean.append(
            {
                "name": name,
                "description": str(p.get("description", "") or ""),
                "strategy": str(p.get("strategy", "") or ""),
                "targets": seats,
                "extra": {str(k): v for k, v in extra.items()},
            }
        )
    return clean, None


def _atomic_write_panels(path: Path, panels: list[dict[str, Any]]) -> None:
    """Serialize + validate round-trip + atomically write panels.toon, backing
    up first. Raises ValueError if the serialized text does not round-trip."""
    text = _serialize_panels_toon(panels)
    if not _panels_roundtrip_ok(text):
        raise ValueError("serialized panels.toon failed the parse→serialize→parse round-trip")

    path.parent.mkdir(parents=True, exist_ok=True)

    if path.is_file():
        stamp = date.today().isoformat()
        bak = path.with_name(f"{path.name}.bak-{stamp}")
        n = 1
        while bak.exists():
            bak = path.with_name(f"{path.name}.bak-{stamp}.{n}")
            n += 1
        bak.write_bytes(path.read_bytes())

    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=path.name + ".", suffix=".tmp")
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


def _panels_path_for_scope(scope: str) -> Path:
    """Resolve the panels.toon path for a scope. global → ~/.rutherford,
    workspace → <cwd>/.rutherford."""
    if scope == "global":
        return _home() / ".rutherford" / "panels.toon"
    return _project_root() / ".rutherford" / "panels.toon"


async def _handle_panels(request: web.Request, ctx: AppContext) -> web.Response:
    """GET /panels — named panels from panels.toon across global + project scopes.

    Returns each panel with its full seat list so the editor can round-trip it,
    plus a ``targets`` count for the compact display the read view already used.
    A parse error is surfaced per-source, never raised.
    """
    result: list[dict[str, Any]] = []
    for d in _rutherford_dirs():
        scope = "global" if d == _home() / ".rutherford" else "workspace"
        path = d / "panels.toon"
        meta = _meta(path, scope)
        entry: dict[str, Any] = {**meta, "panels": []}
        if path.is_file():
            try:
                parsed = _parse_panels_toon(path.read_text(encoding="utf-8"))
                entry["panels"] = [
                    {
                        "name": p["name"],
                        "description": p.get("description", ""),
                        "strategy": p.get("strategy", ""),
                        "targets": len(p.get("targets") or []),
                        "seats": p.get("targets") or [],
                        "extra": p.get("extra") or {},
                    }
                    for p in parsed
                ]
            except (OSError, ValueError) as exc:
                entry["error"] = f"{type(exc).__name__}: {exc}"
        result.append(entry)
    return web.json_response({"platform": _platform_label(), "sources": result})


async def _handle_panels_write(request: web.Request, ctx: AppContext) -> web.Response:
    """PUT /rutherford-panels?scope=global|workspace — write panels.toon.

    NON-reserved base (/api/apps/rutherford reserves /config, so panels reads
    live at /panels and writes at /rutherford-panels). Accepts a JSON body that
    is a list of panels or {"panels": [...]}, serializes it to valid TOON, and
    writes it to the resolved scope path with the same safety envelope as the
    config writer: round-trip validation before touching disk, a timestamped
    .bak, an atomic temp-file + os.replace, and only ever the resolved
    panels.toon path (never a request-supplied path).
    """
    scope = (request.query.get("scope") or "global").lower()
    if scope not in ("global", "workspace"):
        return web.json_response(
            {"error": f"invalid scope {scope!r}; expected global|workspace"}, status=400
        )
    try:
        try:
            body = await request.json()
        except (ValueError, TypeError) as exc:
            return web.json_response({"error": f"invalid JSON body: {exc}"}, status=400)

        clean, verr = _validate_panels_body(body)
        if verr is not None:
            return web.json_response({"error": verr}, status=400)
        assert clean is not None

        path = _panels_path_for_scope(scope)
        resolved = path.resolve()
        if resolved.name != "panels.toon":
            return web.json_response(
                {"error": "refusing to write a non panels.toon target"}, status=400
            )
        # Defense in depth: the parent must be a .rutherford dir under home/cwd.
        expected_parents = {
            (_home() / ".rutherford").resolve(),
            (_project_root() / ".rutherford").resolve(),
        }
        if resolved.parent not in expected_parents:
            return web.json_response(
                {"error": "refusing to write outside a resolved .rutherford directory"},
                status=400,
            )

        try:
            _atomic_write_panels(path, clean)
        except ValueError as exc:
            return web.json_response({"error": str(exc)}, status=400)
        except OSError as exc:
            return web.json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)

        # Re-read and return the fresh payload (mirrors the GET shape) so the UI
        # can confirm persistence via written===true or a verify GET.
        meta = _meta(path, scope)
        payload: dict[str, Any] = {**meta, "written": True, "panels": []}
        try:
            parsed = _parse_panels_toon(path.read_text(encoding="utf-8"))
            payload["panels"] = [
                {
                    "name": p["name"],
                    "description": p.get("description", ""),
                    "strategy": p.get("strategy", ""),
                    "targets": len(p.get("targets") or []),
                    "seats": p.get("targets") or [],
                    "extra": p.get("extra") or {},
                }
                for p in parsed
            ]
        except (OSError, ValueError) as exc:
            payload["error"] = f"{type(exc).__name__}: {exc}"
        return web.json_response(payload)
    except Exception as exc:  # noqa: BLE001 — surface swallowed errors
        tb = traceback.format_exc()
        return web.json_response(
            {"error": f"{type(exc).__name__}: {exc}", "traceback": tb}, status=500
        )


# --------------------------------------------------------------------------
# Roles: markdown files (frontmatter + body) round-trip + read/write
# --------------------------------------------------------------------------
#
# A role is a markdown file: a leading frontmatter block delimited by `---`
# lines carrying `name` / `description` (and an optional `display_name`), then
# the body which is the system prompt. Rutherford discovers role files under
# ~/.rutherford/roles/, <cwd>/.rutherford/roles/, and any role_dirs. We parse
# only the small scalar frontmatter the format uses (a flat key: value map) and
# treat everything after the closing `---` as the verbatim body, so a
# parse→serialize round-trip reproduces the body byte-for-byte. Built-in roles
# ship in the server (not as files); they are surfaced read-only as reference
# and only user role FILES are editable.

# Frontmatter keys surfaced as first-class fields; any OTHER scalar key is
# preserved (round-tripped) under `extra`.
_ROLE_KNOWN_FM_KEYS = ("name", "display_name", "description")


def _parse_role_md(text: str) -> dict[str, Any]:
    """Parse a role markdown file into a structured model.

    The frontmatter is the block between a leading ``---`` line and the next
    ``---`` line; each line inside is a ``key: value`` scalar (value optionally
    quoted). Everything after the closing ``---`` line is the body, sliced from
    the ORIGINAL text so CRLF / trailing spaces are not altered on round-trip. A
    file with NO leading ``---`` parses to empty frontmatter + whole text body.

    Returns {name, display_name, description, body, extra}.
    """
    name = display_name = description = ""
    extra: dict[str, str] = {}
    body = text

    lines = text.splitlines(keepends=True)
    if lines and lines[0].strip() == "---":
        close_idx = None
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                close_idx = i
                break
        if close_idx is not None:
            fm_lines = lines[1:close_idx]
            body = "".join(lines[close_idx + 1:])
            for raw in fm_lines:
                stripped = raw.strip()
                if not stripped or stripped.startswith("#") or ":" not in stripped:
                    continue
                k, v = stripped.split(":", 1)
                key = k.strip()
                val = v.strip()
                if len(val) >= 2 and val[0] == val[-1] and val[0] in ('"', "'"):
                    quote = val[0]
                    val = val[1:-1]
                    # Reverse _emit_fm_scalar's escaping. Only double-quoted
                    # values are ever emitted with escapes (\\ -> \ and \" -> "),
                    # so unescape exactly those two sequences and only for `"`.
                    if quote == '"':
                        val = _unescape_fm_double_quoted(val)
                if key == "name":
                    name = val
                elif key == "display_name":
                    display_name = val
                elif key == "description":
                    description = val
                elif key:
                    extra[key] = val
    return {
        "name": name,
        "display_name": display_name,
        "description": description,
        "body": body,
        "extra": extra,
    }


def _fm_scalar_needs_quote(value: str) -> bool:
    """Quote a frontmatter value only when a bare scalar would misparse: empty,
    leading/trailing whitespace, a leading structural char, or an embedded
    ``:``/`` #``. Minimal quoting lets the common case round-trip byte-for-byte."""
    if value == "":
        return True
    if value != value.strip():
        return True
    if value[0] in ('"', "'", "[", "{", "&", "*", "!", "|", ">", "%", "@", "`", "#"):
        return True
    return ":" in value or " #" in value


def _emit_fm_scalar(value: str) -> str:
    if _fm_scalar_needs_quote(value):
        esc = value.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{esc}"'
    return value


def _unescape_fm_double_quoted(value: str) -> str:
    """Inverse of _emit_fm_scalar's escaping for a double-quoted body.

    The emitter produces exactly two escape sequences, in this order:
    ``\\`` -> ``\\\\`` and ``"`` -> ``\\"``. Decode with a single left-to-right
    scan so an escaped backslash is consumed as one unit and cannot combine with
    a following quote (i.e. ``\\\\"`` decodes to ``\\`` + a closing/literal quote,
    never to ``"``). Any other backslash sequence is left verbatim, since the
    emitter never produces one."""
    out: list[str] = []
    i = 0
    n = len(value)
    while i < n:
        ch = value[i]
        if ch == "\\" and i + 1 < n and value[i + 1] in ('\\', '"'):
            out.append(value[i + 1])
            i += 2
        else:
            out.append(ch)
            i += 1
    return "".join(out)


def _serialize_role_md(role: dict[str, Any]) -> str:
    """Serialize a parsed role model back to markdown text.

    Emits a frontmatter block (name, display_name if set, description, then any
    extra keys in order) then the verbatim body. The parser strips exactly the
    closing ``---`` line's own newline, so emitting ``"\\n" + body`` round-trips
    a body that begins with its own blank line (as the shipped example does).
    """
    name = str(role.get("name", "")).strip()
    fm: list[str] = ["---", f"name: {_emit_fm_scalar(name)}"]
    display_name = str(role.get("display_name", "") or "")
    if display_name.strip() != "":
        fm.append(f"display_name: {_emit_fm_scalar(display_name)}")
    fm.append(f"description: {_emit_fm_scalar(str(role.get('description', '') or ''))}")
    extra = role.get("extra") or {}
    if isinstance(extra, dict):
        for k, v in extra.items():
            fm.append(f"{k}: {_emit_fm_scalar(str(v))}")
    fm.append("---")
    body = role.get("body", "")
    if not isinstance(body, str):
        body = str(body)
    return "\n".join(fm) + "\n" + body


def _role_roundtrip_ok(text: str) -> bool:
    """parse → serialize → parse structural equality guard for a role file."""
    first = _parse_role_md(text)
    second = _parse_role_md(_serialize_role_md(first))
    return first == second


def _roles_dir_for_scope(scope: str) -> Path:
    """global → ~/.rutherford/roles, workspace → <cwd>/.rutherford/roles."""
    if scope == "global":
        return _home() / ".rutherford" / "roles"
    return _project_root() / ".rutherford" / "roles"


def _list_role_sources() -> list[dict[str, Any]]:
    """Shared role discovery used by GET /rutherford-roles and the
    meta/role-id helpers.

    One entry per role directory (global + project .rutherford/roles, then any
    config role_dirs), each {path, scope, platform, exists, editable, roles}.
    Each role carries name/file/path plus parsed description/display_name so the
    editor renders a list without a second fetch. Only .md FILES are listed; a
    per-file parse error is surfaced on that role, never raised.
    """
    dirs: list[tuple[Path, str]] = []
    for d in _rutherford_dirs():
        scope = "global" if d == _home() / ".rutherford" else "workspace"
        dirs.append((d / "roles", scope))

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
        meta: dict[str, Any] = {
            "path": str(path),
            "scope": scope,
            "platform": _platform_label(),
            "exists": path.is_dir(),
            # editable only for the two writable scopes the PUT accepts (never
            # config:role_dirs, whose target may be anywhere).
            "editable": scope in ("global", "workspace"),
        }
        roles: list[dict[str, Any]] = []
        if path.is_dir():
            try:
                for f in sorted(path.glob("*.md")):
                    entry: dict[str, Any] = {"name": f.stem, "file": f.name, "path": str(f)}
                    try:
                        parsed = _parse_role_md(f.read_text(encoding="utf-8"))
                        entry["description"] = parsed.get("description", "")
                        entry["display_name"] = parsed.get("display_name", "")
                    except OSError as exc:
                        entry["error"] = f"{type(exc).__name__}: {exc}"
                    roles.append(entry)
            except OSError as exc:
                meta["error"] = f"{type(exc).__name__}: {exc}"
        sources.append({**meta, "roles": roles})
    return sources


def _safe_role_filename(name: str) -> str | None:
    """Turn a role name into a safe ``<stem>.md`` filename, or None if unsafe.

    Rejects path separators, ``..``, a leading dot, and empties. Allows a
    kebab-case-ish id: an alnum start then alnum / ``. _ -``.
    """
    import re as _re
    stem = name.strip()
    if not stem:
        return None
    if stem.lower().endswith(".md"):
        stem = stem[:-3]
    if not stem or stem in (".", ".."):
        return None
    if any(sep in stem for sep in ("/", "\\")) or ".." in stem or stem[0] == ".":
        return None
    if not _re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", stem):
        return None
    return f"{stem}.md"


def _atomic_write_role(path: Path, role: dict[str, Any]) -> None:
    """Serialize + round-trip-validate + atomically write a role .md, backing up
    first. Raises ValueError if the serialized text fails the round-trip."""
    text = _serialize_role_md(role)
    if not _role_roundtrip_ok(text):
        raise ValueError("serialized role file failed the parse→serialize→parse round-trip")

    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file():
        stamp = date.today().isoformat()
        bak = path.with_name(f"{path.name}.bak-{stamp}")
        n = 1
        while bak.exists():
            bak = path.with_name(f"{path.name}.bak-{stamp}.{n}")
            n += 1
        bak.write_bytes(path.read_bytes())

    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=path.name + ".", suffix=".tmp")
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


def _backup_and_delete_role(path: Path) -> None:
    """Timestamped .bak snapshot then delete a role file. No-op-safe caller
    checks existence first; here we assume the file exists."""
    stamp = date.today().isoformat()
    bak = path.with_name(f"{path.name}.bak-{stamp}")
    n = 1
    while bak.exists():
        bak = path.with_name(f"{path.name}.bak-{stamp}.{n}")
        n += 1
    bak.write_bytes(path.read_bytes())
    path.unlink()


async def _handle_meta(request: web.Request, ctx: AppContext) -> web.Response:
    """GET /rutherford-meta — the option sets the UI renders dropdowns from.

    {agent_ids, agent_ids_builtin, agent_ids_source, strategies, safety_modes,
     persistence, roles, roles_builtin}. agent_ids is built-ins UNIONed with
     config-declared ids (see the meta-enums note); agent_ids_source records how
     it was sourced so the UI (and this report) can state it honestly.
    """
    try:
        derived = _config_derived_agent_ids()
        payload = {
            "platform": _platform_label(),
            "agent_ids": _agent_ids_union(),
            "agent_ids_builtin": list(_BUILTIN_AGENT_IDS),
            "agent_ids_config_derived": derived,
            # We cannot reach Rutherford's capabilities/doctor MCP tools from an
            # in-process backend route (no MCP client on AppContext), so the
            # roster is NOT live-probed — it is the built-in set unioned with
            # config. The UI degrades to a free-text datalist regardless.
            "agent_ids_source": "builtin+config-derived (no backend MCP; free-text fallback in UI)",
            "strategies": list(_STRATEGIES),
            "safety_modes": list(_SAFETY_MODES),
            "persistence": list(_PERSISTENCE),
            "roles": _role_ids(),
            "roles_builtin": list(_BUILTIN_ROLE_IDS),
        }
        return web.json_response(payload)
    except Exception as exc:  # noqa: BLE001 — surface swallowed errors
        tb = traceback.format_exc()
        return web.json_response(
            {"error": f"{type(exc).__name__}: {exc}", "traceback": tb}, status=500
        )


async def _handle_roles(request: web.Request, ctx: AppContext) -> web.Response:
    """GET /rutherford-roles — role markdown files under global + project
    .rutherford/roles plus any role_dirs declared in config, PLUS the server's
    built-in roles (surfaced read-only as reference).

    ``?scope=global|workspace&name=<id>`` returns the FULL parsed body of one
    editable role file (name/display_name/description/body/extra) so the editor
    can open it without a second endpoint; otherwise the listing is returned.
    """
    # Single-role body fetch (for the edit form).
    q_scope = request.query.get("scope")
    q_name = request.query.get("name")
    if q_scope and q_name:
        scope = q_scope.lower()
        if scope not in ("global", "workspace"):
            return web.json_response(
                {"error": f"invalid scope {scope!r}; expected global|workspace"}, status=400
            )
        fname = _safe_role_filename(q_name)
        if not fname:
            return web.json_response({"error": f"unsafe role name {q_name!r}"}, status=400)
        path = _roles_dir_for_scope(scope) / fname
        if not path.is_file():
            return web.json_response(
                {"error": f"role {q_name!r} not found in {scope} scope", "exists": False},
                status=404,
            )
        try:
            parsed = _parse_role_md(path.read_text(encoding="utf-8"))
        except OSError as exc:
            return web.json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)
        return web.json_response(
            {
                "scope": scope,
                "path": str(path),
                "platform": _platform_label(),
                "exists": True,
                "role": {
                    "name": parsed["name"] or path.stem,
                    "display_name": parsed["display_name"],
                    "description": parsed["description"],
                    "body": parsed["body"],
                    "extra": parsed["extra"],
                },
            }
        )

    return web.json_response(
        {
            "platform": _platform_label(),
            "sources": _list_role_sources(),
            # Built-in personas ship in the server (not as files): reference only,
            # not editable. The UI shows these read-only.
            "builtin": [{"name": r} for r in _BUILTIN_ROLE_IDS],
        }
    )


async def _handle_roles_write(request: web.Request, ctx: AppContext) -> web.Response:
    """PUT /rutherford-roles?scope=global|workspace — create / edit / delete a
    role .md.

    NON-reserved base (Kiro Crew reserves /api/apps/<app>/config). Body:
      {"name": "<id>", "op": "delete"}                     — delete the role file
      {"name": "<id>", "display_name"?, "description"?,
       "body": "<system prompt>", "extra"?: {...}}          — create or overwrite

    Same safety envelope as config/panels: validate + round-trip before touching
    disk, a timestamped .bak of an edited/deleted file, an atomic temp-file +
    os.replace, path-traversal rejection, and only ever a ``.md`` under the
    resolved scope's ``.rutherford/roles`` directory (never a request path).
    """
    scope = (request.query.get("scope") or "global").lower()
    if scope not in ("global", "workspace"):
        return web.json_response(
            {"error": f"invalid scope {scope!r}; expected global|workspace"}, status=400
        )
    try:
        try:
            body = await request.json()
        except (ValueError, TypeError) as exc:
            return web.json_response({"error": f"invalid JSON body: {exc}"}, status=400)
        if not isinstance(body, dict):
            return web.json_response({"error": "body must be a JSON object"}, status=400)

        name = str(body.get("name", "")).strip()
        if not name:
            return web.json_response({"error": "role 'name' is required"}, status=400)
        # A built-in id is a server persona, not a file — refuse to shadow it via
        # this editor (the user can still add a same-named file by other means,
        # but the guided editor should not silently override a built-in).
        if name in _BUILTIN_ROLE_IDS:
            return web.json_response(
                {"error": f"{name!r} is a built-in role (server persona); it is read-only here"},
                status=400,
            )
        fname = _safe_role_filename(name)
        if not fname:
            return web.json_response(
                {"error": f"unsafe or invalid role name {name!r} (use a kebab-case id)"},
                status=400,
            )

        roles_dir = _roles_dir_for_scope(scope)
        path = (roles_dir / fname)
        resolved = path.resolve()
        # Defense in depth: the parent must be the resolved scope roles dir and
        # the name must be a .md file.
        if resolved.name != fname or resolved.suffix != ".md":
            return web.json_response({"error": "refusing to write a non .md role target"}, status=400)
        expected_parent = roles_dir.resolve()
        if resolved.parent != expected_parent:
            return web.json_response(
                {"error": "refusing to write outside the resolved .rutherford/roles directory"},
                status=400,
            )

        op = str(body.get("op", "")).strip().lower()
        if op == "delete":
            if not path.is_file():
                return web.json_response(
                    {"error": f"role {name!r} not found in {scope} scope", "exists": False},
                    status=404,
                )
            try:
                _backup_and_delete_role(path)
            except OSError as exc:
                return web.json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)
            return web.json_response(
                {
                    "scope": scope,
                    "path": str(path),
                    "platform": _platform_label(),
                    "written": True,
                    "deleted": True,
                    "sources": _list_role_sources(),
                }
            )

        # Create / overwrite.
        role_body = body.get("body", "")
        if not isinstance(role_body, str):
            return web.json_response({"error": "role 'body' must be a string"}, status=400)
        extra = body.get("extra") if isinstance(body.get("extra"), dict) else {}
        # Reject a non-scalar extra value; frontmatter is a flat scalar map.
        for k, v in extra.items():
            if isinstance(v, (dict, list)):
                return web.json_response(
                    {"error": f"role frontmatter key {k!r} must be a scalar"}, status=400
                )
        role = {
            "name": name,
            "display_name": str(body.get("display_name", "") or ""),
            "description": str(body.get("description", "") or ""),
            "body": role_body,
            "extra": {str(k): str(v) for k, v in extra.items()},
        }
        try:
            _atomic_write_role(path, role)
        except ValueError as exc:
            return web.json_response({"error": str(exc)}, status=400)
        except OSError as exc:
            return web.json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)

        # Re-read and echo the persisted role so the UI can confirm via written===true.
        try:
            parsed = _parse_role_md(path.read_text(encoding="utf-8"))
        except OSError as exc:
            return web.json_response({"error": f"{type(exc).__name__}: {exc}"}, status=500)
        return web.json_response(
            {
                "scope": scope,
                "path": str(path),
                "platform": _platform_label(),
                "written": True,
                "role": {
                    "name": parsed["name"] or path.stem,
                    "display_name": parsed["display_name"],
                    "description": parsed["description"],
                    "body": parsed["body"],
                    "extra": parsed["extra"],
                },
                "sources": _list_role_sources(),
            }
        )
    except Exception as exc:  # noqa: BLE001 — surface swallowed errors
        tb = traceback.format_exc()
        return web.json_response(
            {"error": f"{type(exc).__name__}: {exc}", "traceback": tb}, status=500
        )


# --------------------------------------------------------------------------
# Registration
# --------------------------------------------------------------------------

def register_routes(ctx: AppContext) -> list[AppRoute]:
    """Return the app's routes. Base prefix /api/apps/rutherford is applied by
    the gateway's RouteRegistry.

    GET routes are read-only. Write routes (PUT) live at NON-reserved paths
    because Kiro Crew reserves /api/apps/<app>/config for its own store:
      - PUT /rutherford-config  writes config.toml
      - PUT /rutherford-panels  writes panels.toon
      - PUT /rutherford-roles   creates/edits/deletes a role .md
    The roles GET+PUT share the /rutherford-roles base (roles GET was moved off
    the bare /roles so the read and write surfaces are coherent). Panels keep
    GET /panels + PUT /rutherford-panels (the GET path is not reserved).
    GET /rutherford-meta returns the option sets the UI renders dropdowns from.
    """
    return [
        AppRoute("GET", "/status", _handle_status),
        AppRoute("GET", "/rutherford-meta", _handle_meta),
        AppRoute("GET", "/rutherford-config", _handle_config),
        AppRoute("PUT", "/rutherford-config", _handle_config_write),
        AppRoute("GET", "/panels", _handle_panels),
        AppRoute("PUT", "/rutherford-panels", _handle_panels_write),
        AppRoute("GET", "/rutherford-roles", _handle_roles),
        AppRoute("PUT", "/rutherford-roles", _handle_roles_write),
    ]
