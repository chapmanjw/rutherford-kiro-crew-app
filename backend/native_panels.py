"""Round-trip-safe TOON serializer/parser for ``native-panels.toon`` (v3.0.0).

Native panels are the all-Kiro-Crew execution path added in v3: every seat is a
Kiro Crew subagent (`spawn_run`, one model per seat), aggregation is done by the
`native-panel` skill, and NO external ACP agent is launched. They live in their
OWN file — ``native-panels.toon`` — NOT ``panels.toon``, because Rutherford's
panels loader rejects unknown keys (`engine`, `agent`, `reduction`), so mixing
the two shapes in one file would fail to load.

This module mirrors the ``panels.toon`` serializer/parser in ``backend/routes.py``
(same TOON dialect: a top-level mapping, 2-space indentation, a ``targets[N]:``
count header, and ``- key: value`` seat rows) with three deliberate differences:

1. The top-level key is ``native-panels:``, not ``panels:``.
2. A native seat's required key is ``model`` (a Kiro-spawnable model name), NOT
   ``cli`` (a Rutherford ACP agent id). Native seats also add an optional
   ``agent`` (the Kiro Crew agent to spawn, default ``kirocrew``); a panel adds
   ``engine`` (MUST be ``native``) and an optional ``reduction``.
3. Parsing is STRICT: an unknown panel key or an unknown seat key is a parse
   error (``panels.toon`` preserves unknown keys under ``extra``; native panels
   reject them, same posture the Rutherford panels LOADER takes at load time).

Guarantees:
- ``serialize(parse(x)) == x`` byte-for-byte for a canonically-formatted file
  (the shipped ``examples/native-panels.toon`` is canonical), and a
  ``parse -> serialize -> parse`` structural round-trip holds for any file that
  parses (``roundtrip_ok``), proven before any write touches disk.
- Discovery spans the SAME three scopes as ``panels.toon``: ``~/.rutherford/``,
  ``<cwd>/.rutherford/``, and ``$RUTHERFORD_CONFIG_DIR`` — closest scope wins for
  a same-named panel.
- Write safety matches the config/panels writers in ``routes.py``: a timestamped
  ``.bak``, an atomic temp-file + ``os.replace``, and a path guard that refuses
  any target outside a resolved ``.rutherford`` scope directory.
"""
from __future__ import annotations

import os
import tempfile
from datetime import date
from pathlib import Path
from typing import Any

# --------------------------------------------------------------------------
# Discovery — the three native-panels scopes (mirrors reference/panels.md)
# --------------------------------------------------------------------------

NATIVE_PANELS_FILENAME = "native-panels.toon"


def _home() -> Path:
    return Path.home()


def _project_root() -> Path:
    return Path.cwd()


def scope_dirs() -> list[dict[str, Any]]:
    """The native-panels scope directories, lowest precedence first.

    1. ``~/.rutherford/`` — the global, per-user store.
    2. ``<cwd>/.rutherford/`` — the project being worked in; overrides home.
    3. ``$RUTHERFORD_CONFIG_DIR/`` — an explicit directory; overrides both.

    Each entry is ``{"scope", "dir", "path"}`` where ``path`` is the
    ``native-panels.toon`` under that directory. De-duplicated (the three can
    coincide) preserving the precedence order.
    """
    entries: list[dict[str, Any]] = [
        {"scope": "global", "dir": _home() / ".rutherford"},
        {"scope": "workspace", "dir": _project_root() / ".rutherford"},
    ]
    cfg_dir = os.environ.get("RUTHERFORD_CONFIG_DIR")
    if cfg_dir:
        entries.append({"scope": "config_dir", "dir": Path(cfg_dir)})

    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for e in entries:
        d = e["dir"]
        key = str(d.resolve()) if d.exists() else str(d)
        if key in seen:
            continue
        seen.add(key)
        out.append({"scope": e["scope"], "dir": d, "path": d / NATIVE_PANELS_FILENAME})
    return out


def discover_panels() -> tuple[dict[str, dict[str, Any]], list[str]]:
    """Resolve native panels across the three scopes, closest scope winning.

    Returns ``(panels_by_name, errors)``. ``panels_by_name`` maps a panel name to
    its parsed record (with an added ``_scope`` / ``_path`` for provenance);
    ``errors`` collects a per-file ``"<path>: <reason>"`` for any file that fails
    to parse (a bad file is reported, never silently dropped). Higher-precedence
    scopes overwrite a same-named panel from a lower one.
    """
    panels_by_name: dict[str, dict[str, Any]] = {}
    errors: list[str] = []
    for entry in scope_dirs():  # lowest precedence first; later scopes win
        path: Path = entry["path"]
        if not path.is_file():
            continue
        try:
            parsed = parse(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            errors.append(f"{path}: {type(exc).__name__}: {exc}")
            continue
        for panel in parsed:
            record = dict(panel)
            record["_scope"] = entry["scope"]
            record["_path"] = str(path)
            panels_by_name[panel["name"]] = record
    return panels_by_name, errors


# --------------------------------------------------------------------------
# TOON scalar emit / parse (same dialect as routes.py's panels serializer)
# --------------------------------------------------------------------------

_INDENT = "  "  # 2 spaces per level


def _indent_of(s: str) -> int:
    return len(s) - len(s.lstrip(" "))


def _scalar_needs_quote(value: str) -> bool:
    """True when a bare TOON scalar would misparse and must be quoted.

    Quote only when necessary so the common case (model names like
    ``claude-sonnet-4.5``, roles, descriptions with ``/ - . ,``) round-trips
    byte-for-byte. The structural characters that break the bare grammar are
    ``[`` / ``]`` (a ``targets[N]`` count), ``:`` (key/value split), ``"`` / ``#``,
    plus leading/trailing whitespace or an empty string. An embedded newline,
    tab, or carriage return ALSO forces quoting: a bare scalar is a single line,
    so a real control character in it would corrupt the TOON structure — and
    ``_parse_scalar`` can produce one from the ``\\n`` / ``\\t`` / ``\\r`` escapes,
    so ``_emit_scalar`` must round-trip it back through the quoted+escaped form.
    """
    if value == "":
        return True
    if value != value.strip():
        return True
    return any(ch in value for ch in ("[", "]", ":", '"', "#", "\n", "\t", "\r"))


def _emit_scalar(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, float):
        return repr(value)
    s = str(value)
    if _scalar_needs_quote(s):
        # Escape symmetrically with ``_parse_scalar``'s unescape map. Backslash
        # first (so the escapes we introduce below are not re-escaped), then the
        # quote and the three control characters ``_parse_scalar`` decodes.
        esc = (
            s.replace("\\", "\\\\")
            .replace('"', '\\"')
            .replace("\n", "\\n")
            .replace("\t", "\\t")
            .replace("\r", "\\r")
        )
        return f'"{esc}"'
    return s


def _parse_scalar(raw: str) -> Any:
    """Parse a TOON scalar token back to a Python value.

    Mirrors ``_emit_scalar`` so the pair round-trips: a double-quoted string
    (with ``\\``-escapes), the bools ``true``/``false``, a bare integer, and a
    bare float (``weight`` may be written ``1.5``). Everything else stays a bare
    string — a model like ``claude-sonnet-4.5`` is NOT a pure float, so it is
    preserved verbatim.
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
    if raw.lstrip("-").isdigit():
        try:
            return int(raw)
        except ValueError:
            return raw
    # A bare float (a whole numeric token with a single dot, e.g. weight 1.5).
    if _is_float_token(raw):
        try:
            return float(raw)
        except ValueError:
            return raw
    return raw


def _is_float_token(raw: str) -> bool:
    """True only for a complete numeric float token like ``1.5`` / ``-0.25``.

    Requires digits on BOTH sides of a single dot so a model name that merely
    contains a dot (``claude-sonnet-4.5`` has a leading ``claude-``) is never
    mistaken for a number.
    """
    body = raw[1:] if raw.startswith("-") else raw
    if body.count(".") != 1:
        return False
    left, right = body.split(".")
    return left.isdigit() and right.isdigit()


# --------------------------------------------------------------------------
# Schema — the strict key sets and their canonical emit order
# --------------------------------------------------------------------------

VALID_STRATEGIES = (
    "all-voices", "unanimous", "majority", "plurality", "weighted",
    "parity-pair", "rank",
)
VALID_STANCES = ("for", "against", "neutral")

# Panel keys, in canonical emit order. ``targets`` is emitted last (as the
# ``targets[N]:`` list). All are optional EXCEPT ``engine`` (must be "native")
# and ``targets`` (a non-empty list).
_PANEL_KEYS = ("description", "engine", "strategy", "reduction", "targets")

# Seat keys, in canonical emit order. ``model`` is REQUIRED; the rest default.
_SEAT_KEYS = ("model", "role", "label", "weight", "parity", "stance", "agent")


def _panel_error(name: str, msg: str) -> ValueError:
    return ValueError(f"native panel {name!r}: {msg}")


# --------------------------------------------------------------------------
# Parse
# --------------------------------------------------------------------------

def parse(text: str) -> list[dict[str, Any]]:
    """Strict structural parse of ``native-panels.toon`` into an ordered list.

    Each panel: ``{name, description, engine, strategy, reduction, targets:[...]}``
    with keys present only when set (``targets`` always present). Seats preserve
    key order. Raises ``ValueError`` on: a PRESENT file missing its top-level
    ``native-panels:`` table (a typo'd root reads as a config error, never as an
    empty config), an unknown panel or seat key, a missing ``model``, an
    ``engine`` other than ``native``, an unknown ``strategy`` / ``stance``, a
    negative or non-numeric ``weight``, a non-bool ``parity``, an empty
    ``targets`` list, or any structurally malformed line — so a write never
    proceeds over a shape the round-trip cannot faithfully reproduce.
    """
    panels: list[dict[str, Any]] = []
    lines = text.splitlines()
    in_root = False
    current: dict[str, Any] | None = None
    current_seat: dict[str, Any] | None = None
    in_targets = False
    seen_panel_keys: set[str] = set()
    targets_declared = False

    for raw in lines:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = _indent_of(raw)
        stripped = raw.strip()

        if not in_root:
            if stripped == "native-panels:":
                in_root = True
            continue

        # Panel name: indent 2, a bare "name:".
        if indent == 2 and stripped.endswith(":"):
            if current is not None:
                _finalize_panel(current)
                panels.append(current)
            name = stripped[:-1].strip()
            if not name:
                raise ValueError("a native panel is missing a name")
            current = {"name": name, "targets": []}
            current_seat = None
            in_targets = False
            seen_panel_keys = set()
            targets_declared = False
            continue

        if current is None:
            raise ValueError(f"unexpected line before any panel: {raw!r}")

        name = current["name"]

        # A seat row: "- model: ..." at indent 6.
        if stripped.startswith("- ") or stripped == "-":
            if not in_targets:
                raise _panel_error(name, f"seat item outside a targets list: {stripped!r}")
            current_seat = {}
            current["targets"].append(current_seat)
            rest = stripped[2:] if stripped.startswith("- ") else ""
            if rest.strip():
                if ":" not in rest:
                    raise _panel_error(name, f"malformed seat line {stripped!r}")
                k, v = rest.split(":", 1)
                _set_seat_key(name, current_seat, k.strip(), _parse_scalar(v))
            continue

        # A seat continuation key at indent >= 8.
        if current_seat is not None and in_targets and indent >= 8 and ":" in stripped and not stripped.endswith(":"):
            k, v = stripped.split(":", 1)
            _set_seat_key(name, current_seat, k.strip(), _parse_scalar(v))
            continue

        # A panel-level key at indent 4.
        if indent == 4:
            current_seat = None
            base = stripped[:-1].strip() if stripped.endswith(":") else stripped
            if stripped.endswith(":") and base.split("[", 1)[0] == "targets":
                # A second ``targets[...]`` in one panel would silently discard
                # the first seat list (a 3-seat panel could become 1). Reject it.
                if targets_declared:
                    raise _panel_error(name, "duplicate 'targets' declaration")
                targets_declared = True
                # Remember the declared count so ``_finalize_panel`` can enforce
                # it matches the seats actually parsed. (This is stricter than the
                # ``panels.toon`` serializer, which treats the count as advisory —
                # a deliberate divergence: native-panels.py is the strict reference
                # parser, and the count guards against seats dropped by a
                # formatting slip. The serializer always emits ``targets[len]``, so
                # a canonical file always matches and round-trips.)
                current["_declared_count"] = _parse_targets_count(name, base)
                in_targets = True
                current["targets"] = []
                continue
            in_targets = False
            if ":" not in stripped:
                raise _panel_error(name, f"malformed panel line {stripped!r}")
            k, v = stripped.split(":", 1)
            key = k.strip()
            if key not in _PANEL_KEYS or key == "targets":
                raise _panel_error(
                    name,
                    f"unknown panel key {key!r} — valid keys are "
                    f"{', '.join(k for k in _PANEL_KEYS)}",
                )
            # A repeated panel key would silently overwrite the earlier value.
            if key in seen_panel_keys:
                raise _panel_error(name, f"duplicate panel key {key!r}")
            seen_panel_keys.add(key)
            current[key] = _parse_scalar(v)
            continue

        raise _panel_error(name, f"unexpected line {raw!r}")

    if not in_root:
        # A PRESENT file that never declares the `native-panels:` root table is a
        # config error, not an empty config — a typo like `native-panel:` or an
        # unrelated file must fail loudly here rather than read as "no panels" and
        # resurface downstream as a misleading "panel not found". (Discovery skips
        # a genuinely absent file BEFORE calling parse, so this only fires on a
        # file that exists but is missing its root.)
        raise ValueError(
            "missing required top-level 'native-panels:' table — "
            "is the root key spelled correctly (e.g. not 'native-panel:')?"
        )

    if current is not None:
        _finalize_panel(current)
        panels.append(current)
    return panels


def _parse_targets_count(panel_name: str, base: str) -> int | None:
    """Extract N from a ``targets[N]`` header (``base`` has no trailing colon).

    Returns the declared count, or ``None`` when the header is a bare ``targets``
    with no bracketed count. Raises on a malformed or non-integer count.
    """
    lb = base.find("[")
    if lb == -1:
        return None
    rb = base.find("]", lb)
    if rb == -1:
        raise _panel_error(panel_name, f"malformed targets header {base!r}")
    inner = base[lb + 1 : rb].strip()
    if not inner.isdigit():
        raise _panel_error(panel_name, f"targets count must be an integer (got {inner!r})")
    return int(inner)


def _set_seat_key(panel_name: str, seat: dict[str, Any], key: str, value: Any) -> None:
    if key not in _SEAT_KEYS:
        raise _panel_error(
            panel_name,
            f"unknown seat key {key!r} — valid keys are {', '.join(_SEAT_KEYS)}",
        )
    seat[key] = value


def _finalize_panel(panel: dict[str, Any]) -> None:
    """Validate a fully-parsed panel; raise on the first schema violation."""
    name = panel["name"]

    # The declared ``targets[N]`` count, stashed by ``parse``. Pop it so it never
    # leaks into the returned record.
    declared_count = panel.pop("_declared_count", None)

    engine = panel.get("engine")
    if engine != "native":
        raise _panel_error(
            name,
            f"engine must be \"native\" (got {engine!r}) — native-panels.toon holds "
            f"ONLY native panels; external ACP agents use panels.toon",
        )

    strategy = panel.get("strategy")
    if strategy is not None and strategy not in VALID_STRATEGIES:
        raise _panel_error(
            name,
            f"unknown strategy {strategy!r} — valid strategies are "
            f"{', '.join(VALID_STRATEGIES)}",
        )

    targets = panel.get("targets")
    if not isinstance(targets, list) or not targets:
        raise _panel_error(name, "needs a non-empty targets list")

    if declared_count is not None and declared_count != len(targets):
        raise _panel_error(
            name,
            f"declared targets[{declared_count}] but found {len(targets)} seat(s) — "
            f"fix the count or the seat list (a mismatch usually means a "
            f"mis-indented seat was dropped)",
        )

    for i, seat in enumerate(targets):
        if not isinstance(seat, dict):
            raise _panel_error(name, f"seat [{i}] is not a mapping")
        model = seat.get("model")
        if not isinstance(model, str) or not model.strip():
            raise _panel_error(name, f"seat [{i}] is missing a required non-empty 'model'")
        stance = seat.get("stance")
        if stance is not None and stance not in VALID_STANCES:
            raise _panel_error(
                name,
                f"seat [{i}] stance {stance!r} must be one of {', '.join(VALID_STANCES)}",
            )
        weight = seat.get("weight")
        if weight is not None:
            if isinstance(weight, bool) or not isinstance(weight, (int, float)):
                raise _panel_error(name, f"seat [{i}] weight must be a number")
            if weight < 0:
                raise _panel_error(name, f"seat [{i}] weight must be >= 0")
        parity = seat.get("parity")
        if parity is not None and not isinstance(parity, bool):
            raise _panel_error(name, f"seat [{i}] parity must be a boolean")


# --------------------------------------------------------------------------
# Serialize
# --------------------------------------------------------------------------

def serialize(panels: list[dict[str, Any]]) -> str:
    """Serialize the structured panel list back to canonical TOON text.

    Emits panel keys in the order ``description, engine, strategy, reduction``
    then the ``targets[N]:`` list, and seat keys in the order
    ``model, role, label, weight, parity, stance, agent``. Byte-for-byte
    reproduces a canonically-formatted file (the shipped example is canonical).
    """
    out: list[str] = ["native-panels:"]
    for panel in panels:
        name = str(panel.get("name", "")).strip()
        if not name:
            raise ValueError("a native panel is missing a name")
        out.append(f"{_INDENT}{name}:")
        for key in ("description", "engine", "strategy", "reduction"):
            val = panel.get(key)
            if val is not None and val != "":
                out.append(f"{_INDENT * 2}{key}: {_emit_scalar(val)}")
        seats = panel.get("targets") or []
        if not isinstance(seats, list):
            raise ValueError(f"native panel {name!r} targets must be a list")
        out.append(f"{_INDENT * 2}targets[{len(seats)}]:")
        for seat in seats:
            if not isinstance(seat, dict):
                raise ValueError(f"native panel {name!r} has a non-mapping seat")
            ordered = [k for k in _SEAT_KEYS if k in seat]
            if not ordered:
                raise ValueError(f"native panel {name!r} has an empty seat")
            first = ordered[0]
            out.append(f"{_INDENT * 3}- {first}: {_emit_scalar(seat[first])}")
            for k in ordered[1:]:
                out.append(f"{_INDENT * 4}{k}: {_emit_scalar(seat[k])}")
    return "\n".join(out) + "\n"


def roundtrip_ok(text: str) -> bool:
    """parse -> serialize -> parse structural equality guard."""
    first = parse(text)
    second = parse(serialize(first))
    return _strip_provenance(first) == _strip_provenance(second)


def _strip_provenance(panels: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop discovery-added ``_scope`` / ``_path`` keys for equality checks."""
    return [{k: v for k, v in p.items() if not k.startswith("_")} for p in panels]


# --------------------------------------------------------------------------
# Write safety — timestamped .bak, atomic replace, .rutherford path guard
# --------------------------------------------------------------------------

def _allowed_parents() -> set[Path]:
    """Resolved directories a native-panels.toon may be written into."""
    parents = {(_home() / ".rutherford").resolve(), (_project_root() / ".rutherford").resolve()}
    cfg_dir = os.environ.get("RUTHERFORD_CONFIG_DIR")
    if cfg_dir:
        parents.add(Path(cfg_dir).resolve())
    return parents


def atomic_write(path: Path, panels: list[dict[str, Any]]) -> None:
    """Serialize + round-trip-check + atomically write native-panels.toon.

    Refuses any path whose name is not ``native-panels.toon`` or whose parent is
    not a resolved ``.rutherford`` scope directory (path guard). Backs up an
    existing file to a timestamped ``.bak`` first, then writes a temp file in the
    same directory and ``os.replace``s it into place. Raises ``ValueError`` if the
    serialized text fails the parse->serialize->parse round-trip.
    """
    resolved = path.resolve()
    if resolved.name != NATIVE_PANELS_FILENAME:
        raise ValueError(f"refusing to write a non {NATIVE_PANELS_FILENAME} target")
    if resolved.parent not in _allowed_parents():
        raise ValueError("refusing to write outside a resolved .rutherford scope directory")

    text = serialize(panels)
    if not roundtrip_ok(text):
        raise ValueError(
            "serialized native-panels.toon failed the parse->serialize->parse round-trip"
        )

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
