# Changelog

All notable changes to this app are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-09-18

### Changed
- `rutherford-orchestrator` agent is now write-capable: `fs_write` and `execute_bash` added to its tool grants, matching the default `kirocrew` agent's capability. `allowedTools` is unchanged — both tools remain runtime-gated (not auto-approved), preserving the same approval posture as the default agent.
- Updated orchestrator prompt to reflect the agent's expanded toolset and remove inaccurate read-only self-descriptions.

## [2.0.0] - 2026-09-12

The **editable Config UI** release. Rutherford's dashboard page grows from a read-only viewer into
a full Config / Panels / Roles editor backed by safe, atomic writes.

### Added

- **Editable Config, Panels, and Roles tabs.** The Rutherford page (`ui/src/App.tsx`) now edits all
  three surfaces, each with a per-scope (global / workspace) Save that writes and re-fetches, plus
  inline save success/error state. Panels and Roles are no longer read-only.
- **Backend routes.** `register_routes` (`backend/routes.py`) serves:
  `GET /status`, `GET /rutherford-meta`, `GET`+`PUT /rutherford-config`, `GET /panels` +
  `PUT /rutherford-panels`, and `GET`+`PUT /rutherford-roles`. Write routes deliberately use
  NON-reserved paths because Kiro Crew reserves `/api/apps/<app>/config` for its own store.
- **Meta-driven dropdowns with free-text fallback.** `GET /rutherford-meta` supplies the option sets
  the UI renders (`agent_ids` = built-ins UNIONed with config-declared ids, `strategies`,
  `safety_modes`, `persistence`, `roles`). An in-process backend route has no MCP client, so the
  roster is built-ins + config (not a live probe) and every dropdown degrades to a free-text
  datalist so a user can always type an id we did not enumerate.
- **Centralized field help.** Field descriptions, required/optional markers, and each field's
  absent-meaning are surfaced consistently across the editor.
- **Honest configured-state reachability.** The Overview Reachability card reports what config
  declares (which `config.toml` files exist, agents configured vs. in the effective roster) and
  NEVER live-probes: `available` is always `false` from this read-only backend, with an honest note
  that live per-agent connectivity is checked by running `doctor` in a Rutherford session.
- **Safe atomic writes** for `config.toml`, `panels.toon`, and role `.md` files: a
  parse/serialize/parse (or TOML re-parse) validation before touching disk, a timestamped `.bak`,
  an atomic temp-file + `os.replace`, and traversal / out-of-directory rejection — the write target
  always comes from the shared resolver, never the request.
- **Inline-styled, theme-colored toggle** control for boolean settings.
- **Overview intro** explaining that Rutherford is an MCP server driven by the
  `rutherford-orchestrator` agent.

### Changed

- **Project-config write names accepted (ship-blocker fix).** The `PUT /rutherford-config` guard
  previously hardcoded `config.toml`, so a user whose project config is `rutherford.toml` or
  `.rutherford.toml` (both resolved by the GET read layer) could VIEW but never SAVE. The guard now
  asserts the write target EQUALS the shared resolver's output (`_resolve_config_path(scope)`), so
  GET and PUT agree on all three project-config names while still rejecting any out-of-directory or
  traversal target the resolver can never produce.

## [1.0.1] - 2026-09-09

### Fixed

- Corrected the `rutherford-orchestrator` agent's `@kirocrew-core` tools grant from the per-tool form
  (`@kirocrew-core/spawn_run` + `@kirocrew-core/spawn_list`) to the whole-server form (`@kirocrew-core`).
  The per-tool form does not mount, so native `spawn_run` delegation to Kiro Crew agents was
  unavailable; the whole-server grant makes native `spawn_run` delegation work. `allowedTools` is
  unchanged (auto-approval still scoped to `@kirocrew-core/spawn_list`).

## [1.0.0] - 2026-09-09

First release of the **Rutherford Kiro Crew app** — a fork/port of the
[Rutherford Claude plugin](https://github.com/chapmanjw/rutherford-claude-plugin), adapted to the
Kiro Crew app format.

### Added

- An `app.json` manifest that registers the app as a first-class Kiro Crew app: the
  `rutherford-orchestrator` agent, all 13 skills, and the `rutherford` MCP server (launched as
  `uvx rutherford-mcp-server@3.2.0` — the version is pinned for reproducible v1.0.0 installs rather
  than resolving to whatever is latest), with the app version as the source of truth.
- The Kiro Crew agent (`agents/rutherford-orchestrator.json`) whose `prompt` points at
  `agents/rutherford-orchestrator.prompt.md`, holding the Sam Rutherford persona and the mode-routing
  logic.
- The app icon (`assets/icon.png`), declared by `app.json`'s `iconPath`.
- `scripts/validate-app.mjs`, a dependency-free validator for the app manifest, agent and skill paths,
  the MCP server declaration, the app-namespaced MCP grant, and the `app-registry.json` registry index.
- `app-registry.json` at the repo root, a self-listing external-registry index — so this repo doubles as
  its own registry: a user can add it under **Settings → Apps → Registries** and install Rutherford
  one-click from the App Store.
- Two install paths off the same source: add this repo as a registry and install from the App Store, or
  install from a local checkout (`git clone` then `kirocrew app install <path>`) — both behind a trust
  grant.

[2.1.0]: https://github.com/chapmanjw/rutherford-kiro-crew-app/releases/tag/v2.1.0
[2.0.0]: https://github.com/chapmanjw/rutherford-kiro-crew-app/releases/tag/v2.0.0
[1.0.1]: https://github.com/chapmanjw/rutherford-kiro-crew-app/releases/tag/v1.0.1
[1.0.0]: https://github.com/chapmanjw/rutherford-kiro-crew-app/releases/tag/v1.0.0
