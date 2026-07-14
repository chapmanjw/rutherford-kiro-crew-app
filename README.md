<p align="center">
  <img src="docs/images/logo.png" width="180" alt="Rutherford logo">
</p>

<h1 align="center">Rutherford — Claude Plugin &nbsp;|&nbsp; <a href="https://github.com/chapmanjw/rutherford-mcp-server">MCP Server</a></h1>

<p align="center"><b>Give your AI coding agent a crew.</b></p>

<p align="center">
A <a href="https://code.claude.com">Claude Code</a> plugin that auto-registers the Rutherford MCP server<br>
and ships skills, an orchestrator agent, and slash commands to set up, configure, and drive a crew of<br>
coding agents — Claude Code, Codex, Cursor, Goose, and more — over the
<a href="https://agentclientprotocol.com">Agent Client Protocol</a>.<br>
Hand work to one agent, ask several in parallel, or have them argue it out.
</p>

<p align="center">
  <a href="https://pepy.tech/projects/rutherford-mcp-server"><img src="https://static.pepy.tech/personalized-badge/rutherford-mcp-server?period=total&units=NONE&left_color=GREY&right_color=ORANGE&left_text=downloads" alt="PyPI Downloads"></a>
  <a href="https://github.com/chapmanjw/rutherford-claude-plugin/stargazers"><img src="https://img.shields.io/github/stars/chapmanjw/rutherford-claude-plugin?style=social" alt="GitHub stars"></a>
  <a href="https://pypi.org/project/rutherford-mcp-server/"><img src="https://img.shields.io/pypi/v/rutherford-mcp-server" alt="PyPI version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> ·
  <a href="#whats-inside">What's inside</a> ·
  <a href="#permissions">Permissions</a> ·
  <a href="#the-name">The name</a>
</p>

**Prerequisite: [uv](https://docs.astral.sh/uv/)** on your PATH ([install it](https://docs.astral.sh/uv/getting-started/installation/)).

```
/plugin marketplace add chapmanjw/rutherford-claude-plugin
/plugin install rutherford@rutherford-claude
```

Then restart Claude Code. The skills appear under `/rutherford:*`, the `rutherford-orchestrator` agent
becomes available, and the Rutherford MCP server is registered automatically.

After installing, you can run a whole Claude session as the orchestrator. Start Claude with the agent
flag and no prompt:

```
claude --agent rutherford:rutherford-orchestrator
```

Sam opens on the crew menu automatically, health-checks the crew with `doctor`, and routes each request
to the right mode (`delegate`, `consensus`, `debate`, `review`, or `plan`). Pass a task on the command
line instead and he routes it straight away. In an ordinary Claude Code session the same agent is also
available as a subagent for a "just use Rutherford for this" ask.

## What this plugin is

Rutherford gives your coding agent a crew. This is the Claude Code-facing piece: it auto-registers the
[Rutherford MCP server](https://github.com/chapmanjw/rutherford-mcp-server) — a stdio server that speaks
the [Agent Client Protocol](https://agentclientprotocol.com) to each coding agent — and adds the skills,
an orchestrator agent, and slash commands that drive it.

From inside Claude Code you hand one task to one agent, ask several the same question in parallel, have
them argue across rounds, or run a multi-model code review, using agents you already log into. Rutherford
reuses each agent's own login and never calls a model provider's API.

The plugin launches the server with `uvx rutherford-mcp-server`, which fetches it from PyPI on first run
and caches it, so there is no separate install step. If you would rather install the server yourself,
`uv tool install rutherford-mcp-server` (or `pipx install rutherford-mcp-server`) puts a
`rutherford-mcp-server` command on your PATH; the `setup-rutherford` skill covers that path.

## See it work

> Ask Codex, Claude Code, and Gemini where the deadlock in `queue.py` is, and show me all three.

One `consensus` call fans the question out to three agents, each in its own ACP session, and returns
every voice. Run as Rutherford, in character:

```
.---------.
|  \/\/\/ |    Sam Rutherford here — oh, a deadlock hunt, this is a fun one.
|  O  [==]|    Putting the crew on queue.py now.
|    <    |
|  \___/  |
'---------'

consensus   claude_code, codex, gemini
  claude_code   enqueue() holds the lock across the await on flush() — flush() re-enters it
  codex         same root cause; take the lock off the await, or give flush() its own lock
  gemini        classic producer/consumer wait on the shared mutex; reorder the acquire
```

The persona is flavor on top of accurate work, never instead of it: a failed health check, a refused
write, or a real warning is always reported straight. Voice and guardrails live in
[`reference/persona.md`](reference/persona.md).

## Quickstart

```
/rutherford:setup                                   # verify the connection, run doctor, scaffold config
/rutherford:doctor                                  # which agents actually spawn, handshake, and answer
/rutherford:consensus where is the deadlock in queue.py?
```

Bring your own crew. Rutherford never installs or logs in to an agent; it drives the ones you already
run. You need at least two ACP-capable agents installed and signed in (Claude Code and Codex are
enough), or a local model: with [Ollama](https://ollama.com) or [LM Studio](https://lmstudio.ai)
running, Rutherford auto-detects each tool-capable model and registers it as a free voice.

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

`rutherford-orchestrator` — health-checks the crew with `doctor`, then routes a request to the right
mode: `delegate`, `consensus`, `debate`, `review`, or `plan`. Use it for a "just use Rutherford for
this" ask, or for a fresh, independent multi-agent take on your own work. Run an entire session as this
agent with `claude --agent rutherford:rutherford-orchestrator`, or invoke it as a subagent from any
session.

### Slash commands

`/rutherford:setup`, `/rutherford:doctor`, `/rutherford:panels`, `/rutherford:permissions`,
`/rutherford:consensus`, `/rutherford:debate`, `/rutherford:review`.

### Examples

[`examples/panels.toon`](examples/panels.toon) (a code-review, design-roundtable, and ship-vote panel),
[`examples/roles/principal-reviewer.md`](examples/roles/principal-reviewer.md), and
[`examples/config.toml`](examples/config.toml) — copy one and edit.

## The MCP server

This plugin is the Claude-facing piece. The orchestration lives in
[`rutherford-mcp-server`](https://github.com/chapmanjw/rutherford-mcp-server)
([PyPI](https://pypi.org/project/rutherford-mcp-server/)), a stdio MCP server that speaks ACP to each
coding agent. It exposes 18 tools and 19 built-in agents.

```
Claude Code
   |  MCP over stdio
rutherford-mcp-server          (the ACP client)
   |  ACP over stdio, one session per voice
   +--> claude-agent-acp, codex-acp, goose acp, cursor-agent acp, ... 19 built-in agents
```

## Safety

Everything defaults to read-only. The `write` and `yolo` modes are explicit opt-in behind a
trusted-workspace gate, and the deliberation tools (`consensus`, `debate`, `review`, `plan`) never write.
See [`reference/safety.md`](reference/safety.md) and the `safe-write-delegation` skill.

## Permissions

A plugin cannot grant Claude Code permissions, so out of the box Claude prompts before editing files in
the `.rutherford` directories and before each Rutherford tool call. The `configure-permissions` skill
(also run as a step of `/rutherford:setup`) writes a recommended allowlist into your `settings.json` with
your confirmation: read/write access to the project and home `.rutherford` directories, plus the safe
config and inspection tools. It leaves the agent-spawning tools prompting unless you opt in, and it does
not weaken Rutherford's own write gate. See [`reference/permissions.md`](reference/permissions.md).

## Documentation

The plugin bundles reference docs that the skills cite:
[tools](reference/tools.md), [safety](reference/safety.md), [panels](reference/panels.md),
[config](reference/config.md), [permissions](reference/permissions.md), and
[persona](reference/persona.md). For the full server reference, see the
[rutherford-mcp-server docs](https://github.com/chapmanjw/rutherford-mcp-server#documentation).

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
> getting heterogeneous systems to cooperate. That is the job here: one agent hands work to a crew of
> others and brings the results back. *Star Trek* and *Lower Decks* are trademarks of their respective
> owners; this is an unaffiliated, fan-named open-source project.

This plugin leans into the character. The skills and the orchestrator greet you and work in Rutherford's
cheery, crew-first voice — flavor on top of accurate, honest work, never in place of it. The voice,
catchphrases, and the guardrails are in [`reference/persona.md`](reference/persona.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [CHANGELOG.md](CHANGELOG.md), and [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).
