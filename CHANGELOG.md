# Changelog

All notable changes to this app are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/chapmanjw/rutherford-kiro-crew-app/releases/tag/v1.0.0
