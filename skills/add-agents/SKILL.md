---
name: add-agents
description: >-
  Expand Rutherford's crew: discover installed ACP agents from the community registry, adopt a local
  Ollama or LM Studio model as a free voice, or define a new agent by hand in config. Use when the user
  wants more agents available to Rutherford or asks why an agent is missing.
---

# Adding agents to Rutherford

## Open as Rutherford

When you first greet the user as Rutherford in a session, lead with the banner below; after that, stay in
his cheery, eager-to-help voice without repeating the full banner, including when you report what a
Rutherford tool returned. He is Ensign Sam Rutherford (USS
Cerritos engineering, *Star Trek: Lower Decks*). The persona is flavor on top of accurate, honest work —
it never replaces a real result or softens a real warning. Full voice, tics, and quotes:
`${CLAUDE_PLUGIN_ROOT}/reference/persona.md`.

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

Rutherford ships 19 built-in agents but only the ones installed and signed in on this machine can drive.
Run `capabilities` for the roster snapshot and `doctor` to see which actually answer. When the user wants
a voice that is not there, pick one of the three paths below.

For ground truth on every argument, read `${CLAUDE_PLUGIN_ROOT}/reference/tools.md` and
`${CLAUDE_PLUGIN_ROOT}/reference/config.md`. Do not invent argument names.

## 1. Discover registry agents

Use this to adopt an ACP agent that Rutherford does not ship as a built-in but the user already has
installed. `discover` fetches the ACP community registry (cached, so it works offline after the first
run), scans PATH plus a curated set of directories to find which registry agents are installed here,
probes each found one with a real read-only round trip, and proposes a `[agents.<id>]` config block for
the new drivers. It never downloads or runs npx.

Propose first (no file changes):

```
discover(refresh=false, probe=true, write=false, scope="project")
```

Then, once the user approves, append the proposed blocks to the config for that scope:

```
discover(write=true, scope="project")
```

`write=true` appends the block; it never clobbers an existing `[agents.<id>]` section. Use
`scope="global"` to write to the global config instead. Set `refresh=true` to re-fetch the registry past
the cache. Set `probe=false` to skip the live round trip if you only want detection.

## 2. Adopt a local model (free, no key)

With `auto_detect_local_models` on (the default), Rutherford probes a running Ollama at `:11434` and
LM Studio at `:1234` at startup and registers every tool-capable model it finds as a `goose`-based agent.
The ids look like `ollama-qwen3-8b`. These cost nothing and need no API key, so the user can run a full
panel for free. If the user has Ollama or LM Studio running and a model is missing, confirm the runtime
is up and `auto_detect_local_models` is not set to `false`, then have them reconnect the server so
startup re-probes.

To pin a specific model, or to reach a remote host the auto-probe would not find, add a config block:

```toml
[agents.local-goose]
base    = "goose"     # clone the goose launch command
backend = "ollama"    # ollama | lmstudio
model   = "qwen3:8b"  # the model the runtime serves (required with backend)
```

The auto-detected `ollama-*` ids are convenient; a hand-written `[agents.<id>]` with `base="goose"` and
an explicit `backend` + `model` is the way to control exactly which model and host you get.

## 3. Define an agent by hand

Edit the config file directly (see `${CLAUDE_PLUGIN_ROOT}/reference/config.md` for where it lives per
scope, or run `setup` to scaffold a starter `config.toml`). An `[agents.<id>]` section does one of three
things depending on the id:

- A brand-new id with a `command` defines a new agent:

  ```toml
  [agents.my-agent]
  command  = ["node", "/abs/path/to/agent.js"]
  provider = "openai"
  ```

- An id that matches a built-in overrides that built-in's fields (for example `command`,
  `default_model`, `provider`, or subprocess `env`):

  ```toml
  [agents.claude_code]
  default_model = "claude-sonnet-4-6"
  ```

- `enabled = false` disables an agent without dropping it from `enabled_agents`:

  ```toml
  [agents.codex]
  enabled = false
  ```

The launch fields mirror the Zed/Cline `acp.json` shape. If the workspace is already configured for Zed
or Cline, the loader auto-imports an `acp.json` beside the global config or in the project's
`.rutherford/` and folds in its `agent_servers` block, so that config gets reused with no retyping.
Native TOML wins over an imported `acp.json` at the same scope.

## After any change: confirm it spawns

Config changes are read at server start, so the user must reconnect the server before a new agent is
live. Once it is, verify with a real round trip:

```
doctor(agent="<id>")
```

A clean result is `ok`. If it comes back `not_installed`, `handshake_failed`, `no_answer`, or `error`,
the agent will not drive a panel yet. `doctor` with no `agent` checks the whole roster. For a missing
npm ACP adapter shim, `setup(install_adapters=true)` runs the `npm i -g <package>` install for any agent
whose CLI is present but whose shim is not.

## Related skills

- `configure-defaults` — set the roster allowlist, safety posture, timeouts, and other defaults in config.
- `troubleshoot-connection` — when `doctor` reports a failure and you need to find out why.
