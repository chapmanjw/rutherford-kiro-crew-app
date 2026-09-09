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

### 2.3 Global-vs-workspace config reading

The backend reads Rutherford's config files directly from disk (it is Python running
in the gateway with full filesystem access per the trust model). Paths and precedence
are the Rutherford ones (§4). A `scope` query param selects which layer to surface:
`?scope=global` reads only the global file; `?scope=workspace` reads only the
project file for a supplied/looked-up working directory; a merged/effective view is a
separate concern (see §3, `?scope=effective` open question O4).

### 2.4 Permissions the manifest must declare (P1)

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

### `GET /api/apps/rutherford/config?scope=global|workspace`
Reads one config layer. `scope=workspace` also accepts `?cwd=<abs path>` (else the
active project dir). Response:

```jsonc
{
  "scope": "global",
  "path": "C:\\Users\\<user>\\AppData\\Roaming\\rutherford\\config.toml",
  "exists": true,
  "raw": "…verbatim TOML text…",          // for the read-only viewer
  "parsed": {                               // structured mirror of §4 schema
    "enabled_agents": ["claude-code", "codex"],
    "default_safety_mode": "read_only",
    "default_timeout_s": 300.0,
    "default_effort": null,
    "trusted_workspaces": ["C:\\Users\\<user>\\Projects\\foo"],
    "role_dirs": [],
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
  "sources": [                     // discovery order, lowest precedence first (§4)
    { "scope": "global", "path": "~/.rutherford/panels.toon", "exists": true },
    { "scope": "project", "path": "<cwd>/.rutherford/panels.toon", "exists": false }
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
  "roles": [
    { "id": "principal-reviewer", "description": "…", "builtin": true, "source_path": null },
    { "id": "my-reviewer", "description": "…", "builtin": false,
      "source_path": "C:\\…\\.rutherford\\roles\\my-reviewer.md" }
  ],
  "role_dirs": ["…"],              // from config role_dirs + default .rutherford/roles
  "hot_reload": false              // roles load once at server start (§4)
}
```

**Phasing hook:** P2 adds `PUT /config` (+ per-field validation); P3 adds
`PUT /panels`, `PUT /roles`, and `POST /agents/{id}:enable|disable` — all on these
same route roots, so nothing here is renamed.

---

## 4. Config data model (Step 2) — global vs workspace + precedence

### Paths

| Scope | Path |
| --- | --- |
| Global (Windows) | `%APPDATA%\rutherford\config.toml`  (i.e. `…\AppData\Roaming\rutherford\config.toml`) |
| Global (Linux/macOS) | `$XDG_CONFIG_HOME/rutherford/config.toml` (fallback `~/.config/rutherford/config.toml`) |
| Project | first of `rutherford.toml`, `.rutherford.toml`, `.rutherford/config.toml` found in the working directory (priority order) |

A missing file is not an error — defaults apply. `RUTHERFORD_CONFIG=<path>` uses that
single file and skips discovery.

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
  `GET /config?scope=…`. Two sub-views: a **structured** view (the §4 schema as
  labeled read-only fields/tables, incl. per-agent `[agents.<id>]` cards with env)
  and a **raw TOML** view (verbatim `raw`, read-only, monospace). A "not present —
  defaults apply" empty state when `exists=false`. (P2 turns the structured fields
  editable in place.)
- **Panels list** — cards from `GET /panels`: name, description, strategy badge, seat
  list (cli/model/role/stance/weight chips), and an `origin_scope` tag showing which
  layer won. Read-only in P1. (P3 adds create/edit + a `reload_panels` action.)
- **Roles list** — table from `GET /roles`: id, description, built-in vs custom,
  source path, plus a "roles require a server restart to reload" note. Read-only in
  P1.

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
