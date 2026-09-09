<p align="center">
  <img src="docs/images/logo.png" width="180" alt="Rutherford logo">
</p>

<h1 align="center">Rutherford — Kiro Crew App &nbsp;|&nbsp; <a href="https://github.com/chapmanjw/rutherford-mcp-server">MCP Server</a></h1>

<p align="center"><b>Give your AI coding agent a crew — as a Kiro Crew app.</b></p>

<p align="center">
A <a href="https://kiro.dev/docs/crew/apps/build-first-app/">Kiro Crew app</a> that registers the Rutherford MCP server,
installs the Rutherford skills, and ships the <code>rutherford-orchestrator</code> agent to set up, configure,
and drive a crew of coding agents — Claude Code, Codex, Cursor, Goose, and more — over the
<a href="https://agentclientprotocol.com">Agent Client Protocol</a>.<br>
Hand work to one agent, ask several in parallel, or have them argue it out.
</p>

<p align="center">
  <a href="https://pypi.org/project/rutherford-mcp-server/"><img src="https://img.shields.io/pypi/v/rutherford-mcp-server" alt="PyPI version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>

> **This repo is the Kiro Crew port of the [Rutherford Claude plugin](https://github.com/chapmanjw/rutherford-claude-plugin).**
> Because GitHub does not allow a single account to own both a repo and a fork of it, this is not a GitHub
> "forked from" repo — instead it descends from the plugin's git history and tracks it as the `upstream`
> remote, so `git diff upstream/main` and `git pull upstream main` work as they would on a fork.

---

**Prerequisite: [uv](https://docs.astral.sh/uv/)** on your PATH ([install it](https://docs.astral.sh/uv/getting-started/installation/)) — the app launches the MCP server with `uvx`.

## Install into Kiro Crew

```bash
kirocrew app install /path/to/rutherford-kiro-crew-app
kirocrew app enable rutherford
```

Enabling the app registers the Rutherford MCP server (via `uvx rutherford-mcp-server`), installs the
Rutherford skills into your skills directory, and makes the `rutherford-orchestrator` agent available in
the dashboard agent selector and as a subagent.

Select **rutherford-orchestrator** from the agent dropdown to run a whole session as the crew router: Sam
health-checks the crew with `doctor` and routes each request to the right mode (`delegate`, `consensus`,
`debate`, `review`, or `plan`).

## What this app is

Rutherford gives your coding agent a crew. This is the Kiro Crew-facing package: it registers the
[Rutherford MCP server](https://github.com/chapmanjw/rutherford-mcp-server) — a stdio server that speaks
the [Agent Client Protocol](https://agentclientprotocol.com) to each coding agent — and adds the skills
and an orchestrator agent that drive it.

From inside Kiro Crew you hand one task to one agent, ask several the same question in parallel, have them
argue across rounds, or run a multi-model code review, using agents you already log into. Rutherford reuses
each agent's own login and never calls a model provider's API.

The app launches the server with `uvx rutherford-mcp-server`, which fetches it from PyPI on first run and
caches it, so there is no separate install step. If you would rather install the server yourself,
`uv tool install rutherford-mcp-server` (or `pipx install rutherford-mcp-server`) puts a
`rutherford-mcp-server` command on your PATH; the `setup-rutherford` skill covers that path.

## What's inside

### Skills

Setup and configuration:

| Skill | What it does |
| --- | --- |
| `setup-rutherford` | Verify the connection, run `doctor`, scaffold `config.toml`, install missing ACP adapters. |
| `configure-panels` | Define reusable crews (panels) in `panels.toon`, then hot-reload them. |
| `configure-defaults` | Set `config.toml` defaults: safety posture, trusted workspaces, effort, persistence. |
| `configure-roles` | Author custom role personas, with the server-restart caveat. |
| `add-agents` | Discover installed ACP agents, adopt a local model, or define an agent by hand. |
| `configure-permissions` | Allowlist the Rutherford tools and `.rutherford` directories so they stop prompting. |
| `troubleshoot-connection` | Diagnose why an agent will not drive, from `doctor` states to fixes. |

Driving the crew:

| Skill | What it does |
| --- | --- |
| `delegate-task` | Hand one task to one agent (read-only by default). |
| `multi-agent-consensus` | Ask several agents the same question in parallel; compare or vote. |
| `agent-debate` | A multi-round debate where agents see each other's positions and revise. |
| `code-review-panel` | Review a diff or changed files across agents at a senior/principal bar. |
| `background-jobs` | Run long work as a background job; manage and persist it. |
| `safe-write-delegation` | Let an agent edit code, behind the trusted-workspace gate and a sandbox. |

### Agent

`rutherford-orchestrator` — health-checks the crew with `doctor`, then routes a request to the right mode:
`delegate`, `consensus`, `debate`, `review`, or `plan`. The five original slash commands
(`setup`, `doctor`, `panels`, `permissions`, `consensus`, `debate`, `review`) are folded into this agent's
routing — ask for the mode in plain language and it runs it. Select it from the dashboard agent selector,
or invoke it as a subagent from any session.

### MCP server

The app declares the Rutherford MCP server in its manifest, launched as `uvx rutherford-mcp-server`. It
exposes 18 tools and 19 built-in agents.

```
Kiro Crew
   |  MCP over stdio
rutherford-mcp-server          (the ACP client)
   |  ACP over stdio, one session per voice
   +--> claude-agent-acp, codex-acp, goose acp, cursor-agent acp, ... 19 built-in agents
```

## Safety

Everything defaults to read-only. The `write` and `yolo` modes are explicit opt-in behind a
trusted-workspace gate, and the deliberation tools (`consensus`, `debate`, `review`, `plan`) never write.
See [`reference/safety.md`](reference/safety.md) and the `safe-write-delegation` skill.

## Documentation

The app bundles reference docs that the skills cite:
[tools](reference/tools.md), [safety](reference/safety.md), [panels](reference/panels.md),
[config](reference/config.md), [permissions](reference/permissions.md), and
[persona](reference/persona.md). For the full server reference, see the
[rutherford-mcp-server docs](https://github.com/chapmanjw/rutherford-mcp-server#documentation).

## Relationship to the Claude plugin

This app is a straight port of the [Rutherford Claude plugin](https://github.com/chapmanjw/rutherford-claude-plugin).
The Claude-specific pieces (`.claude-plugin/`, Node persona hooks, `commands/`) are retained in the tree for
provenance, but the live Kiro Crew surface is defined by `app.json`, the converted `agents/*.json`, and the
`skills/` directory. Track upstream changes with:

```bash
git remote -v            # upstream -> rutherford-claude-plugin
git fetch upstream
git diff upstream/main
```

## The name

```
.---------.
|  \/\/\/ |
|  O  [==]|
|    <    |
|  \___/  |
'---------'
-- Ensign Sam Rutherford --
USS Cerritos . Engineering
```

> Named for the cheerful engineer aboard the USS Cerritos in *Star Trek: Lower Decks*, who has a gift for
> getting heterogeneous systems to cooperate. *Star Trek* and *Lower Decks* are trademarks of their
> respective owners; this is an unaffiliated, fan-named open-source project.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [CHANGELOG.md](CHANGELOG.md), and [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).
