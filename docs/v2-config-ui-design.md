# v2.0.0 — Rutherford Config / Panels UI (Design Spec)

**Status:** Draft — Phase 1 (READ + STATUS only) design for user inspection.
**Scope of this document:** design + contract discovery only. No app/frontend/backend
code is written by this spec; `app.json` is not modified here. This is the first
inspection point for v2.0.0.

**Verified against (source read during discovery):**

- `…\kiro_crew\docs\app-platform-trust-model.md`
- `…\kiro_crew\docs\dashboard-iframe-hosts.md`
- `…\kiro_crew\docs\mcp-apps.md`
- `…\kiro_crew\apps\manifest.py` (`UIPage`, `UIConfig`, `BackendConfig`, `HooksConfig`, `Permissions` dataclasses)
- `…\kiro_crew\apps\scaffold.py` (`scaffold_app` UI-app generation)
- `…\kiro_crew\apps\registry.py`, `…\kiro_crew\apps\manager.py` (page registration, asset resolution)
- `…\kiro_crew\apps\route_registry.py` (external-app `AppRoute` / `AppContext` contract)
- `…\kiro_crew\apps\builtins\ops_mission_control\app.json` (reference manifest)
- `…\kiro_crew\apps\builtins\ops_mission_control\backend\routes.py` (`register_routes` builtin contract)
- `…\.kiro\crew\apps\rutherford\reference\config.md`, `panels.md`, `tools.md`

(`…` = `C:\Users\chapm\AppData\Local\Programs\KiroCrew\resources\backend-dist\kirocrew-backend\Lib\site-packages`)

---

## 1. Overview & goals

Rutherford v1.0.0 shipped as a purely declarative Kiro Crew app: 1 orchestrator
agent + 13 skills + an MCP server, with **no UI and no backend**. v2.0.0 adds a
**dashboard page** (`ui.pages`) that looks and feels like native Kiro Crew surfaces
and lets the user **manage Rutherford's configuration** (global + workspace) and
**see Rutherford's status** (which CLIs/agents are enabled and reachable).

**End goal (destination):** full **read + write** of config + panels + status, plus
CLI enable/disable.

**Phased delivery — this spec designs P1 and constrains the architecture so P2/P3
drop in without a rewrite:**

| Phase | Ships |
| --- | --- |
| **P1 (this design)** | READ config (global + workspace) + STATUS (roster + reachability) + read-only Panels list + Roles list. Proves the UX. |
| **P2** | WRITE config (edit `config.toml` fields, per-agent tables, env). |
| **P3** | WRITE panels (`panels.toon`) + roles, and CLI/agent **enable/disable** (write `enabled_agents` / `[agents.<id>].enabled`). |

**Non-goals for P1:** no writes of any kind; no mutation of `config.toml`,
`panels.toon`, or `roles/`; no agent install/login (Rutherford never installs or
logs in an agent — it reuses each agent's own login, per `tools.md`).

**Design principle for phasability:** P1 endpoints are all `GET`; P2/P3 add
`PUT`/`POST` on the *same* route roots (`/config`, `/panels`, `/roles`, `/agents`)
so no P1 route is renamed or moved. The read models below are defined as the
authoritative shapes writes will round-trip against.

---

## 2. Architecture

### 2.1 The verified app-page contract (Step 1 — the biggest unknown)

A Kiro Crew app contributes a dashboard page via the manifest `ui` block. The
schema (`manifest.py`):

```python
@dataclass
class UIPage:                     # manifest.py — UIPage
    route: str = ""               # URL path, e.g. /apps/<name>
    label: str = ""               # sidebar display text
    icon: str = ""                # lucide icon name or emoji
    iconUrl: str = ""             # custom icon image path relative to ui/ dir
    iconInactiveUrl: str = ""     # muted/dark variant for inactive nav row
    entryPoint: str = ""          # path to JS bundle relative to app root
    mountFunction: str = "mount"  # exported function name

@dataclass
class UIConfig:                   # manifest.py — UIConfig
    entry: str                    # ESM bundle path relative to app root, e.g. "dist/index.mjs"
    pages: list[UIPage]
    overlays: ...
    sidebar: ...
```

**Two authoring mechanisms exist — and they are NOT the same path:**

- **(a) App-shipped ESM/React bundle** — via `UIPage.entryPoint` + `mountFunction`
  (or the container-level `UIConfig.entry`, `dist/index.mjs`). The **scaffolder
  generates exactly this** for a UI app (`scaffold.py`, `scaffold_app` with
  `include_ui=True`): a full `ui/` Vite project —
  - `ui/package.json` → React 18 + Vite, `"build": "vite build"`, peer-deps
    `@kirocrew/app-sdk`, `lucide-react`
  - `ui/vite.config.ts` → library build, `entry: 'src/App.tsx'`, `formats: ['es']`,
    `fileName: () => 'index.mjs'`, `outDir: 'dist'`, externals
    `react`/`react-dom`/`@kirocrew/app-sdk`/`lucide-react`
  - `ui/src/App.tsx` → imports `useAppApi` from `@kirocrew/app-sdk` and UI
    primitives from `@kirocrew/app-sdk/ui`
  - scaffolded manifest: `"ui": { "entry": "dist/index.mjs", "pages": [{ "route": "/apps/<name>", "label": …, "icon": "Package" }] }`

- **(b) First-class React component compiled into the dashboard website bundle** —
  used by builtins. **`ops_mission_control`'s page declares `route`/`label`/`icon`
  ONLY — no `entryPoint`, no `ui.entry`** — and its app directory contains **zero
  frontend files** (no `ui/`, `dist/`, `.html`, `.js`, `.mjs`). Its
  `iconUrl`/`heroImage`/`screenshots` `/app-assets/…` files are **also absent** from
  the app dir. Corroborated by `registry.py`'s overlay-validation comment: *"there
  is no per-overlay `entryPoint` the way `ui.pages` has"* — i.e. `ui.pages` DOES have
  an `entryPoint` supply path for installed apps, and an entryPoint-less builtin page
  IS a component compiled into the dashboard bundle.

**Static assets (`/app-assets/<name>/…`) are served from the DASHBOARD bundle, not
the app dir.** `dashboard/server.py`:

```python
if (dist_dir / "app-assets").is_dir():
    app.router.add_static("/app-assets", dist_dir / "app-assets", show_index=False)
```

with the in-source note that builtin icons/hero images live at the website's
`dist/app-assets/` (checked into the dashboard repo), referenced by absolute
`/app-assets/…` URLs from each builtin's `app.json`. External-registry apps take a
different path: `registry.py` rewrites repo-relative `iconPath`/`heroImage` into
`/api/apps/blob?repo=…&path=…` proxy URLs and **ignores** a manifest-declared
absolute `iconUrl` ("index-fetched manifest is untrusted content").

**⇒ Architectural decision for Rutherford v2:** Rutherford is an **installed
(non-builtin) app**, so it CANNOT use path (b). It MUST use path **(a): an
app-shipped Vite/ESM bundle** (`ui/` → `dist/index.mjs`), declared via `ui.entry` +
`ui.pages[].route`, mounted by the dashboard's frontend loader by calling the
bundle's exported `mount` function, styled for native look-and-feel via the
`@kirocrew/app-sdk` (`useAppApi`, `useAppEvents`, and `@kirocrew/app-sdk/ui`
primitives). This is the same shape the scaffolder produces, so it is the supported,
idiomatic authoring path.

> **HONEST GAP (open question O1):** the code that actually *reads*
> `ui.pages[].entryPoint` / `ui.entry`, dynamically imports the bundle, calls
> `mountFunction`, and fetches it from disk lives in the **dashboard website source
> (`website/`, TS/React)** — which is NOT in the `backend-dist` Python I read. So the
> exact fetch URL for the app bundle, the exact `mount(container, sdk)` signature,
> the `@kirocrew/app-sdk` package's real hook/component API, and the theme-variable
> contract are **not verifiable from the sources available in this environment**.
> Everything in §2.1 about mechanism (a) is grounded in `manifest.py` + `scaffold.py`;
> the runtime loader/SDK details are inferred from the scaffold output and must be
> confirmed against `website/` before implementation (see §8).

### 2.2 Backend routes contract (verified)

Two contracts exist; Rutherford (installed app) uses the **external-app** one:

- **External-app contract (`route_registry.py`)** — the manifest `backend.routes`
  points at a function that receives an `AppContext` and **returns
  `list[AppRoute]`**:

  ```python
  @dataclass
  class AppRoute:                 # route_registry.py
      method: str                 # "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
      path: str                   # relative, e.g. "/status", "/config"
      handler: Callable[[web.Request, AppContext], Awaitable[web.Response]]
  ```

  The framework owns matching and the prefix: it registers a single catch-all
  `("*", "/api/apps/{app_name}/{path:.*}", dispatch)`, injects path params into
  `request.match_info`, and invokes `route.handler(request, ctx)` — **two-arg
  handlers**. The registrar validates the function returned a `list`.

- **Builtin contract (`ops_mission_control/backend/routes.py`, for contrast only)** —
  `register_routes(app: web.Application) -> None` registers **fully-qualified**
  paths (`f"/api/apps/{APP_NAME}/state"`) directly on `app.router`, one-arg
  handlers `(request)`. The routes.py docstring **explicitly warns the two contracts
  must not be mixed** ("mixing them up produces routes that silently never dispatch").
  Rutherford must use the external-app `AppRoute` contract, **not** this one.

  Reference GET handler shape observed in ops_mission_control (applies to our reads):
  read query params via `request.query.get("status", "")` and path params via
  `request.match_info.get(...)`; do blocking store/CLI work off the event loop via
  `await asyncio.to_thread(...)`; return `web.json_response({...})`. The only wrapper
  observed is an app-enabled gate (`_require_enabled` → 403 `app_disabled`); there is
  **no per-handler auth decorator** — auth is the platform token scope (see §2.4).

### 2.3 Cross-platform path resolution (HARD REQUIREMENT)

> **HR-1 — The backend MUST resolve every Rutherford config/panels/roles location
> PER-PLATFORM at runtime, from the host OS + environment. Never hardcode a Windows
> (or any single-OS) path.** The design targets Windows, Linux, and macOS
> universally; a path literal for one OS is a defect, not a shortcut.

**Global config resolution (mirror Rutherford's own, per `config.md`):**

```python
import os
from pathlib import Path

def rutherford_global_config_path() -> Path:
    # 1. Explicit override wins and SKIPS discovery entirely.
    override = os.environ.get("RUTHERFORD_CONFIG")
    if override:
        return Path(override).expanduser()
    # 2. Per-platform base dir, derived from the host OS + env at runtime.
    if os.name == "nt":  # Windows
        base = Path(os.environ["APPDATA"])            # %APPDATA%\rutherford\config.toml
    else:                # Linux / macOS
        base = Path(os.environ.get("XDG_CONFIG_HOME") or (Path.home() / ".config"))
    return base / "rutherford" / "config.toml"
```

- Windows → `%APPDATA%\rutherford\config.toml`
- Linux/macOS → `$XDG_CONFIG_HOME/rutherford/config.toml`, fallback
  `~/.config/rutherford/config.toml`
- `RUTHERFORD_CONFIG=<file>` overrides both and skips discovery.

**Project/workspace resolution (all OSes, identical logic):** first of
`rutherford.toml`, `.rutherford.toml`, `.rutherford/config.toml` found in the working
dir (priority order). Use `pathlib` joins (`cwd / "rutherford.toml"`) so the OS
separator is applied by the library, never string-concatenated.

**Panels/roles resolution (SEPARATE discovery, all OSes):** `panels.toon` and
`roles/` are rooted at `~/.rutherford/` and `<cwd>/.rutherford/` — NOT under the
platform config dir. `Path.home() / ".rutherford"` and `cwd / ".rutherford"` resolve
correctly on every OS; do not assume `%APPDATA%` here.

**Path-SEPARATOR handling is platform-specific (HR-2).** The multi-path env vars
`RUTHERFORD_TRUSTED_WORKSPACES` and `role_dirs` (via `RUTHERFORD_ROLE_DIRS`) are
delimited by the **OS path separator** — `;` on Windows, `:` on POSIX. The backend
MUST split/join with the platform separator, never a hardcoded one:

```python
import os
paths = value.split(os.pathsep)          # os.pathsep == ';' on Windows, ':' on POSIX
joined = os.pathsep.join(paths)
```

Splitting on a hardcoded `:` corrupts Windows paths (`C:\…` splits at the drive
colon). Use `os.pathsep`.

**Reuse over reimplementation — resolver availability (verified in Step 1):**
- The app-backend `AppContext` (`apps/context.py`) provides only `data_dir` (the
  app's OWN writable dir, `~/.kiro/crew/apps/rutherford/data`) and an `AppStorage`
  KV — **it does NOT expose a general config-path resolver, and nothing in it knows
  Rutherford's config locations.** So `AppContext` cannot resolve these paths for us.
- The idiomatic in-tree pattern is that an app **reimplements** the target tool's
  resolution itself: `apps/builtins/pptx_maker/backend/paths.py` `engine_config_path()`
  does exactly `Path(os.environ.get("XDG_CONFIG_HOME") or (Path.home()/".config"))`
  to mirror its engine's config dir. No shared `kiro_crew` cross-platform
  config-dir helper is reused there. `kiro_crew/config/loader.py` resolves
  *KiroCrew's own* config, not a third-party app's, so it is not directly reusable
  for Rutherford's locations.
- ⇒ **Decision:** the Rutherford v2 backend owns a small `paths.py` module (like
  pptx_maker's) implementing HR-1/HR-2 with `os`/`pathlib`, mirroring `config.md`.
  Whether Rutherford's **own MCP server** exposes an authoritative path-resolver we
  could call instead (rather than us mirroring its rules) is **not determinable from
  the `backend-dist` Python** (Rutherford's server is a separate ACP process) — see
  open question **O8**. Preferring that resolver, if it exists, avoids the two copies
  of the resolution logic drifting.

Every path this module resolves is surfaced to the UI with its `scope`, resolved
absolute `path`, whether it `exists`, and the `platform` it was resolved for (§3),
so the user always sees the real native location for their OS.

### 2.4 Global-vs-workspace config reading

The backend reads Rutherford's config files directly from disk (it is Python running
in the gateway with full filesystem access per the trust model), using the §2.3
per-platform resolver. Paths and precedence are the Rutherford ones (§4). A `scope`
query param selects which layer to surface: `?scope=global` reads only the global
file; `?scope=workspace` reads only the project file for a supplied/looked-up working
directory; a merged/effective view is a separate concern (see §3, `?scope=effective`
open question O4). Every response carries the resolved native path + scope + platform
(§3) — the backend never returns a path literal baked for one OS.

### 2.5 Permissions the manifest must declare (P1)

Grounded in `app-platform-trust-model.md` + the `Permissions` dataclass
(`manifest.py`) + the ops_mission_control manifest as a worked example:

```jsonc
"permissions": {
  "api": [
    "/api/apps/rutherford",
    "/api/apps/rutherford/*"
  ],
  "events": ["slots"],          // only if the page subscribes to slot events; likely none for P1
  "storage": false,             // P1 reads Rutherford's own files directly; no app-storage KV needed
  "network": false,             // P1 does not call out; status uses the MCP tools locally
  "mcpTools": [                 // ONLY if the backend invokes Rutherford MCP tools for status (see §5, O3)
    // "capabilities", "doctor", "list_roles", "reload_panels"  ← names TBD, namespaced (see O3)
  ]
}
```

Notes from the trust model that shape this:
- App **HTTP token** scope is deny-by-default confined to `/apps/<name>/*` +
  `/api/apps/<name>/*` plus the `permissions.api` prefixes; everything else → 403.
- The frontend `useAppApi`/`createScopedApi()` checks `permissions.api` **in the
  dashboard page** before issuing a same-origin fetch — a guardrail, not a boundary
  (the page runs with the dashboard user's authority). The enforceable boundary is
  the app-token scope on app-owned processes.
- WS `permissions.events` is tier-gated; P1 likely needs none (pure request/response
  reads). Add `"slots"` only if we poll a live slot.

---

## 3. Phase-1 backend API surface (READ + STATUS)

All routes are declared relative in the `AppRoute` list; the framework serves them
under `/api/apps/rutherford/…`. All P1 routes are **GET**. Response shapes below are
the contracts P2/P3 writes will round-trip against.

> **HR-3 — Every response that surfaces a config/panels/roles FILE MUST include, for
> each file, its resolved absolute native `path`, its `scope`, whether it `exists`,
> and the `platform` it was resolved for** (§2.3). This lets the UI render the real
> Windows/Linux/macOS location on every OS and never shows a path baked for one
> platform. `trusted_workspaces` and `role_dirs` values are split from their env vars
> using the OS path separator (`os.pathsep`, §2.3 HR-2) before being returned as
> arrays.

### `GET /api/apps/rutherford/config?scope=global|workspace`
Reads one config layer. `scope=workspace` also accepts `?cwd=<abs path>` (else the
active project dir). The `path` is resolved per-platform at runtime (§2.3) and
returned verbatim so the UI renders the real native location. Response:

```jsonc
{
  "scope": "global",
  "platform": "windows",                    // "windows" | "linux" | "darwin" — the OS paths were resolved for
  "path": "C:\\Users\\<user>\\AppData\\Roaming\\rutherford\\config.toml",  // resolved absolute native path (Linux/macOS would be e.g. /home/<user>/.config/rutherford/config.toml)
  "resolved_from": "APPDATA",               // which rule produced it: "RUTHERFORD_CONFIG" | "APPDATA" | "XDG_CONFIG_HOME" | "HOME/.config" | "project-discovery"
  "exists": true,
  "raw": "…verbatim TOML text…",          // for the read-only viewer
  "parsed": {                               // structured mirror of §4 schema
    "enabled_agents": ["claude-code", "codex"],
    "default_safety_mode": "read_only",
    "default_timeout_s": 300.0,
    "default_effort": null,
    "trusted_workspaces": ["C:\\Users\\<user>\\Projects\\foo"],  // env form split via os.pathsep (';' Win / ':' POSIX), §2.3 HR-2
    "role_dirs": [],                                             // same os.pathsep split as trusted_workspaces
    "default_persistence": "ephemeral",
    "agents": {
      "claude-code": { "enabled": true, "default_model": null, "env": { "…": "…" } }
    },
    "knobs": { "max_targets": 8, "max_depth": 3, "max_debate_rounds": 4 }
  },
  "imported_acp_json": { "present": false, "path": null }  // loader auto-imports acp.json (see §4)
}
```

### `GET /api/apps/rutherford/status`
"Which CLIs/agents are enabled + reachable." Combines the cheap roster snapshot with
per-agent reachability (§5). Response:

```jsonc
{
  "source": "mcp",                 // "mcp" (invoked doctor/capabilities) — see O3
  "platform": "windows",           // "windows" | "linux" | "darwin" — enabled-state read from these files
  "config_sources": [              // which resolved files the enabled-state was derived from (native paths, §2.3)
    { "scope": "global",  "path": "C:\\Users\\<user>\\AppData\\Roaming\\rutherford\\config.toml", "exists": true },
    { "scope": "workspace", "path": "<cwd>\\.rutherford\\config.toml", "exists": false }
  ],
  "generated_at": "2026-09-09T18:00:00Z",
  "agents": [
    {
      "id": "claude-code",
      "display_name": "Claude Code",
      "provider": "anthropic",
      "command": ["claude", "…"],
      "enabled": true,             // from config enabled_agents / [agents.<id>].enabled
      "reachability": "ok",        // ok | no_answer | handshake_failed | not_installed | error | unknown
      "models": ["…"],             // advertised models when connect_only handshake ran
      "checked": true              // false if status is roster-only (doctor not run)
    }
  ],
  "roster_only": false             // true when only capabilities() ran (no probe)
}
```

`?probe=connect_only|full|none` selects the reachability depth (default `connect_only`
— lighter handshake; `full` runs a real ACP round trip; `none` = roster only).

### `GET /api/apps/rutherford/panels`
Read-only panels list (P1). Response:

```jsonc
{
  "platform": "windows",           // "windows" | "linux" | "darwin"
  "sources": [                     // discovery order, lowest precedence first (§4); paths RESOLVED per-platform (§2.3), never tilde literals
    { "scope": "global",  "path": "C:\\Users\\<user>\\.rutherford\\panels.toon", "exists": true },   // Path.home()/.rutherford — NOT %APPDATA%
    { "scope": "project", "path": "<cwd>\\.rutherford\\panels.toon", "exists": false }
  ],
  "panels": [
    {
      "name": "review-panel",
      "description": "…",
      "strategy": "majority",      // all-voices|unanimous|majority|plurality|weighted|parity-pair|rank
      "targets": [
        { "cli": "claude-code", "model": null, "role": "principal-reviewer",
          "label": null, "weight": 1, "parity": false, "stance": "neutral" }
      ],
      "origin_scope": "global"     // which layer won for this name (closest-scope-wins merge)
    }
  ]
}
```

### `GET /api/apps/rutherford/roles`
Read-only role catalog (P1). Response:

```jsonc
{
  "platform": "windows",           // "windows" | "linux" | "darwin"
  "roles": [
    { "id": "principal-reviewer", "description": "…", "builtin": true, "source_path": null },
    { "id": "my-reviewer", "description": "…", "builtin": false,
      "source_path": "C:\\Users\\<user>\\.rutherford\\roles\\my-reviewer.md" }  // resolved native path
  ],
  "role_dirs": [                   // config role_dirs (os.pathsep-split, §2.3) + default .rutherford/roles, each resolved + scoped
    { "path": "C:\\Users\\<user>\\.rutherford\\roles", "scope": "global", "exists": true }
  ],
  "hot_reload": false              // roles load once at server start (§4)
}
```

**Phasing hook:** P2 adds `PUT /config` (+ per-field validation); P3 adds
`PUT /panels`, `PUT /roles`, and `POST /agents/{id}:enable|disable` — all on these
same route roots, so nothing here is renamed.

---

## 4. Config data model (Step 2) — global vs workspace + precedence

### Paths (resolved per-platform at runtime — §2.3, HARD REQUIREMENT)

The backend derives these from the host OS + env at runtime; the table shows the
resolution rule per platform, and the API returns the **resolved native path** for
whichever OS is running (never a hardcoded literal):

| Scope | Windows | Linux / macOS |
| --- | --- | --- |
| Global | `%APPDATA%\rutherford\config.toml` (`…\AppData\Roaming\rutherford\config.toml`) | `$XDG_CONFIG_HOME/rutherford/config.toml`, fallback `~/.config/rutherford/config.toml` |
| Global override | `RUTHERFORD_CONFIG=<file>` — single explicit file, **skips discovery** (all OSes) | same |
| Project | first of `rutherford.toml`, `.rutherford.toml`, `.rutherford/config.toml` in the working dir (priority order) | same (identical logic, OS separator applied by `pathlib`) |
| Panels | `<home>\.rutherford\panels.toon`, `<cwd>\.rutherford\panels.toon` (`Path.home()/.rutherford`, **not** `%APPDATA%`) | `~/.rutherford/panels.toon`, `<cwd>/.rutherford/panels.toon` |
| Roles | `<home>\.rutherford\roles\`, `<cwd>\.rutherford\roles\`, + `role_dirs` | `~/.rutherford/roles/`, `<cwd>/.rutherford/roles/`, + `role_dirs` |

A missing file is not an error — defaults apply. `RUTHERFORD_CONFIG=<path>` uses that
single file and skips discovery. **Panels and roles use a SEPARATE discovery rooted
at `~/.rutherford/` and `<cwd>/.rutherford/`** — do not resolve them under the
platform config dir (`%APPDATA%`/`$XDG_CONFIG_HOME`).

### Platform-specific path SEPARATOR (HR-2)

`RUTHERFORD_TRUSTED_WORKSPACES` and `RUTHERFORD_ROLE_DIRS` are **delimited by the OS
path separator** — `;` on Windows, `:` on POSIX. The backend MUST split/join with
`os.pathsep`, never a hardcoded delimiter (a hardcoded `:` corrupts `C:\…` drive
paths on Windows). The resolved arrays are what the API returns for
`trusted_workspaces` / `role_dirs`.

### Precedence (lowest → highest)

`global acp.json` → `global config.toml` → `project acp.json` → `project config.toml`
→ `RUTHERFORD_*` env overrides. **Nested tables merge; lists and scalars replace.**
Native TOML wins over an imported `acp.json` at the same scope. The loader
auto-imports an `acp.json` beside global config or in project `.rutherford/`, folding
in its `agent_servers` block.

### Schema (top-level keys — all optional)

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `enabled_agents` | list[str] | omit = all built-in + configured | Allowlist restricting the registry |
| `default_safety_mode` | str | `read_only` | `read_only`\|`propose`\|`write`\|`yolo` |
| `default_timeout_s` | float | 300.0 | Per-run wall-clock timeout |
| `default_effort` | str | omit | `low`\|`medium`\|`high`\|`xhigh` |
| `auto_detect_local_models` | bool | true | Probe Ollama `:11434` / LM Studio `:1234` |
| `max_targets` | int | 8 | Max agents per consensus/debate |
| `trusted_workspaces` | list[str] | — | Abs paths where write/yolo is permitted |
| `default_persistence` | str | `ephemeral` | `ephemeral`\|`job` |
| `jobs_dir` | str | `<cwd>/.rutherford/jobs` | Where persisted runs land |
| `synthesize_default` | bool | false | Consensus writes a combined answer |
| `role_dirs` | list[str] | — | Extra dirs searched for role markdown |

**"Other knobs":** `max_depth` (3), `max_concurrency` (= `max_targets`),
`max_debate_rounds` (4), `min_quorum` (1), `default_time_budget_s` (none),
`default_on_budget` (`harvest`), `verify_read_only` (false), `job_ttl_s` (3600).

**`[agents.<id>]` tables** — override a built-in, define a new agent, or clone one.
Keys: `default_model`, `enabled` (bool — disable a built-in without dropping it from
`enabled_agents`), `command` (list[str], required for a brand-new id unless `base`),
`provider`, `base` (clone a built-in), `backend` (`ollama`|`lmstudio`), `model`
(required with `backend`). **`[agents.<id>.env]`** sets per-agent subprocess env
(canonical Bedrock/Vertex: pin `ANTHROPIC_MODEL`, `ANTHROPIC_CUSTOM_MODEL_OPTION`).

> **Correction to the original brief:** there is **no dedicated `[defaults]` table**.
> The `default_*` values are **top-level keys**, not nested under `[defaults]`. The
> UI must present them as top-level.

**Env overrides** (highest precedence, single-field): `RUTHERFORD_CONFIG`,
`RUTHERFORD_MAX_DEPTH`, `RUTHERFORD_MAX_TARGETS`, `RUTHERFORD_MAX_CONCURRENCY`,
`RUTHERFORD_DEFAULT_TIMEOUT_S`, `RUTHERFORD_DEFAULT_SAFETY`,
`RUTHERFORD_TRUSTED_WORKSPACES`, `RUTHERFORD_ROLE_DIRS` (path-sep delimited).

### Panels & roles are SEPARATE stores (not in config.toml)

- **`panels.toon`** — discovered lowest→highest: `~/.rutherford/panels.toon` →
  `<cwd>/.rutherford/panels.toon` (overrides home for same-named panel) →
  `$RUTHERFORD_CONFIG_DIR/panels.toon` (overrides both). Merge by name, closest scope
  wins. TOON format. Schema: top-level `panels` table; each panel has exactly
  `description`, `strategy`, `targets` (extra keys = validation error). Seat keys:
  `cli` (required, must be a registered agent — validated at load), `model`, `role`,
  `label`, `weight` (≥0), `parity` (bool), `stance` (`for`/`against`/`neutral`).
  **Hot-reloads via `reload_panels`** — no server restart. Malformed → `PANEL_INVALID`,
  no partial load.
- **`roles/`** — markdown with `name`/`description` frontmatter + system-prompt body,
  under a `role_dirs` dir or `.rutherford/roles/`. Five built-ins:
  `principal-reviewer`, `architect`, `debugger`, `security-reviewer`, `explainer`.
  **Do NOT hot-reload** — loaded once at server start; there is no `reload_roles`;
  a server restart is needed before a new/edited role takes effect (else
  `UNKNOWN_ROLE`).

⇒ Three separate stores: `config.toml` (global/project TOML discovery),
`panels.toon` and `roles/` (separate `.rutherford/`-rooted discovery). This directly
shapes P3: writing a panel needs a `reload_panels` call to take effect; writing a
role needs a server restart — the UI must communicate that difference.

---

## 5. Status model — what "which CLIs are enabled" means + data source

Two distinct notions, both surfaced by `GET /status`:

1. **Enabled** (configuration-derived) — an agent is *enabled* if it is in
   `enabled_agents` (or the list is omitted = all) and not disabled via
   `[agents.<id>].enabled = false`. This is read from config (§4), cheaply, no probe.
2. **Reachable** (runtime-derived) — whether the agent's CLI actually drives on this
   machine. Rutherford "never installs or logs in an agent — it reuses each agent's
   own login," so *enabled ≠ reachable*; reachability must be probed.

**Data sources (Rutherford MCP tools, per `tools.md`):**

| Tool | Returns | Cost | Role in `/status` |
| --- | --- | --- | --- |
| `capabilities()` | Roster snapshot: id, display name, launch command, provider | Cheap, **no probe** | Base roster + `enabled` derivation |
| `doctor(agent?, timeout_s=60, connect_only=False)` | Per-agent **real ACP round trip**: `ok`/`no_answer`/`handshake_failed`/`not_installed`/`error`; `connect_only=true` → lighter handshake (`reachable`/`handshake_failed`/`not_installed` + advertised models) | Expensive (invokes each agent) | Authoritative reachability |
| `list_roles()` | Persona catalog (built-in + custom) | Cheap | Feeds `GET /roles` |
| `reload_panels()` | Re-reads panels from disk, validates all, reports problems | Cheap | P3 write path (not P1) |

**Reachability comes from INVOKING the MCP server (doctor), not from reading config.**
`capabilities()` is the config-derived roster; `doctor` is the only source that knows
"actually drives." The UI defaults to `connect_only` (lighter) and offers an explicit
"full check" that runs the real round trip.

> **Design question O2:** default probe depth. Running `doctor` on every page load is
> expensive (a round trip per agent). Proposal: P1 loads roster + `enabled`
> immediately (`capabilities`), shows reachability as "unknown" with a **"Check
> reachability"** action that runs `connect_only`, and a per-agent "full check". This
> keeps the page instant and makes the expensive probe explicit/opt-in.

---

## 6. UI layout (native components, not pixels)

A single `ui.pages` page (`route: /apps/rutherford`, label "Rutherford", a lucide
icon), built with `@kirocrew/app-sdk` primitives (`@kirocrew/app-sdk/ui`) for native
look-and-feel; theme via the SDK's theme channel / CSS variables (exact contract =
O1). Layout is a left rail of sections + a main panel:

- **Overview / Status** — the roster table from `GET /status`: each agent row shows
  display name, provider, an **enabled** badge (from config) and a **reachability**
  chip (ok / not-installed / handshake-failed / unknown), with a "Check reachability"
  action (§5, O2). Native table + badge/chip + button components.
- **Config viewer** — a scope toggle (**Global | Workspace**) driving
  `GET /config?scope=…`. Each scope view MUST **display the resolved native
  `path`** returned by the backend (the real `%APPDATA%\…` on Windows,
  `~/.config/…` on Linux/macOS) with a clear label of **which scope/file** the values
  came from and the **precedence chain** (global `acp.json` → global `config.toml` →
  project `acp.json` → project `config.toml` → `RUTHERFORD_*` env). Two sub-views: a
  **structured** view (the §4 schema as labeled read-only fields/tables, incl.
  per-agent `[agents.<id>]` cards with env; `trusted_workspaces`/`role_dirs` shown as
  the OS-separator-split arrays) and a **raw TOML** view (verbatim `raw`, read-only,
  monospace). A "not present — defaults apply" empty state when `exists=false` (still
  showing the resolved path that *would* be used). The path shown is whatever the
  backend resolved for the host OS — the UI never renders a hardcoded Windows path.
  (P2 turns the structured fields editable in place.)
- **Panels list** — cards from `GET /panels`: name, description, strategy badge, seat
  list (cli/model/role/stance/weight chips), and an `origin_scope` tag showing which
  layer won. Also show the resolved native `sources[]` paths (`~/.rutherford/…` on
  POSIX, `<home>\.rutherford\…` on Windows) with their scope. Read-only in P1.
  (P3 adds create/edit + a `reload_panels` action.)
- **Roles list** — table from `GET /roles`: id, description, built-in vs custom,
  resolved native `source_path`, the resolved `role_dirs` (with scope), plus a "roles
  require a server restart to reload" note. Read-only in P1.

Every path rendered anywhere in the UI comes from a backend-resolved native path
(§2.3/HR-3) tagged with its `platform` — the frontend never constructs or assumes an
OS-specific path itself.

**Native-look guidance:** consume only `@kirocrew/app-sdk/ui` components and the SDK
theme variables; declare fallbacks for every CSS var (per `mcp-apps.md`, the
theming channel is not guaranteed and an app should key off `theme` for light/dark).
No custom design system.

---

## 7. Phasing — exactly what P1 ships and how writes drop in

**P1 ships:**
- `ui/` Vite bundle (path (a)) with the four read-only sections above.
- `backend.routes` external-app module returning `list[AppRoute]` with **GET-only**
  `/config`, `/status`, `/panels`, `/roles`.
- Manifest: `ui.entry` + `ui.pages[]`, `backend.routes`, `permissions.api`
  (`/api/apps/rutherford*`), and `permissions.mcpTools` iff the status backend
  invokes Rutherford MCP tools (O3).

**How writes drop in (no rewrite):**
- **P2 (write config):** add `PUT /config?scope=…` accepting the same `parsed` shape,
  validating fields, writing `config.toml`; add a "reconnect server" prompt (config
  edits need a reconnect per §4). The read model in §3 is already the write model.
- **P3 (write panels + roles + enable/disable):** add `PUT /panels` (then call
  `reload_panels` — hot reload), `PUT /roles` (warn: server restart needed),
  `POST /agents/{id}:enable|disable` (writes `enabled_agents` /
  `[agents.<id>].enabled`). All on existing route roots; the UI sections flip from
  read-only to editable in place. `permissions.mcpTools` gains `reload_panels`.

Because every P1 route root is the noun a later write targets, and the read JSON is
the write JSON, P2/P3 are additive.

---

## 8. Open questions / contracts to confirm

Marked by confidence. **O1 is the load-bearing one** and must be resolved against the
dashboard **website** source before implementation, because the loader/SDK live there,
not in the `backend-dist` Python available in this environment.

- **O1 (frontend loader + SDK — MUST confirm, not determinable from available source):**
  In `website/` (Vite/React), confirm: (i) the code that reads `ui.pages[].entryPoint`
  / `ui.entry`, dynamically imports the app bundle, and calls `mountFunction` — and
  the **exact URL the bundle is fetched from** (an `/api/apps/<name>/…` static route
  was NOT among the backend files read); (ii) the real `@kirocrew/app-sdk` API
  (`useAppApi`, `useAppEvents`, `createScopedApi`, and `@kirocrew/app-sdk/ui`
  component list); (iii) the **mount signature** (`mount(container, sdk?)`); (iv) the
  **theme-variable contract** for native look-and-feel. Grep the website src for
  `entryPoint`, `mountFunction`, `useAppApi`, `app-sdk`, `ui.pages`, `appPages`.
- **O2 (status probe default):** load roster immediately, probe reachability on demand
  (`connect_only`), full `doctor` per-agent explicit — confirm this is acceptable
  latency/UX (see §5).
- **O3 (status data path — invoke MCP vs read config):** decide whether the P1 backend
  calls the Rutherford MCP tools (`capabilities`/`doctor`/`list_roles`) — which
  requires `permissions.mcpTools` with the **namespaced** tool ids (Rutherford tools
  are namespaced, e.g. `@rutherford:rutherford` per commit `a0485d1`; confirm exact
  tool-id strings the platform expects in `permissions.mcpTools`) — **versus** reading
  config for `enabled` and shelling to the CLIs for reachability. Recommendation:
  invoke MCP tools (authoritative, matches `tools.md`), but confirm an app backend
  may call another app's MCP tools and how they are named in the allowlist.
- **O4 (effective/merged config view):** P1 surfaces `global` and `workspace`
  separately. Confirm whether users want a computed **effective** view (`?scope=effective`)
  applying the §4 precedence — deferrable to P2 but the route param is reserved now.
- **O5 (workspace resolution):** how the page learns the "current workspace" cwd for
  `scope=workspace` — from an SDK context field or an explicit picker. Tie to O1's SDK
  API.
- **O6 (asset serving for an installed app):** builtin icons resolve from the
  dashboard's `dist/app-assets/`; installed apps get `/api/apps/blob?repo=…` for
  registry icons. Confirm how Rutherford's own page bundle assets (fonts/icons inside
  the mounted component) are served once installed under `~/.kiro/crew/apps/rutherford/`.
- **O7 (TOON parsing):** `panels.toon` is TOON, not TOML/JSON. Confirm the parser the
  backend should use to read (P1) and later write (P3) TOON faithfully, incl. the
  seat-key validation Rutherford itself enforces.
- **O8 (path-resolver reuse — verified partially; one part undetermined):** The
  app-backend `AppContext` (`apps/context.py`) does **not** expose a cross-platform
  config-path resolver (only the app's own `data_dir` + `AppStorage`), and
  `kiro_crew/config/loader.py` resolves KiroCrew's OWN config, not a third-party
  app's — so neither is reusable for Rutherford's locations. The verified in-tree
  pattern is an app reimplementing resolution with `os`/`pathlib`
  (`apps/builtins/pptx_maker/backend/paths.py`), which is the §2.3 decision.
  **Undetermined from `backend-dist`:** whether Rutherford's **own MCP server**
  exposes an authoritative path/config-location resolver we could call (so the rules
  live in one place instead of being mirrored in our `paths.py`). Confirm against the
  Rutherford server source / its MCP tool list; if it does, prefer calling it over
  duplicating the resolution logic. Until confirmed, the design mirrors `config.md`'s
  rules directly (§2.3).

---

## Summary

For an **installed** app like Rutherford, the dashboard page must be an **app-shipped
Vite/ESM React bundle** (`ui/` → `dist/index.mjs`, declared via `ui.entry` +
`ui.pages[].route`, mounted by the dashboard calling the bundle's `mount` export via
the `@kirocrew/app-sdk`) — **not** a compiled-in component (that path is builtin-only,
which is why `ops_mission_control` ships zero frontend files). The backend uses the
**external-app `AppRoute`/`AppContext` contract** (`register_routes(ctx) ->
list[AppRoute]`, two-arg handlers, framework-supplied `/api/apps/rutherford/` prefix).
P1 is GET-only `/config`, `/status`, `/panels`, `/roles`; status reachability comes
from **invoking `doctor`** (config gives *enabled*, doctor gives *reachable*). The
single load-bearing unverifiable is **O1** — the frontend loader + `@kirocrew/app-sdk`
API — which lives in the dashboard `website/` source not available here and must be
confirmed before coding.

**Cross-platform is a hard requirement (§2.3):** the backend resolves every
config/panels/roles location per-platform at runtime (Windows `%APPDATA%`, Linux/macOS
`$XDG_CONFIG_HOME`→`~/.config`, `~/.rutherford/` for panels/roles), honors
`RUTHERFORD_CONFIG` + `RUTHERFORD_*` overrides, splits multi-path env vars with
`os.pathsep` (`;`/`:`), and returns the resolved native `path` + `scope` + `platform`
in every file-surfacing response so the UI shows the real location on any OS and never
hardcodes a Windows path.
