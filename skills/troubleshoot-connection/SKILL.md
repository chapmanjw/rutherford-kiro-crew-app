---
name: troubleshoot-connection
description: >-
  Diagnose why Rutherford agents do not drive: read doctor per-agent states (not_installed, handshake_failed, no_answer, model_unavailable, error), run connect_only probes, fix PATH, auth, adapter, and Bedrock/Vertex model-id issues, and handle entitlement cases like Grok. Use when agents fail, doctor reports problems, or a panel returns failed voices.
---

# Troubleshoot a Rutherford connection

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

Use this when an agent will not run: a `delegate` errors, `doctor` flags something,
or a `consensus`/`debate` panel comes back with failed voices. Ground-truth tool
names and arguments are in `${CLAUDE_PLUGIN_ROOT}/reference/tools.md`; config paths
are in `${CLAUDE_PLUGIN_ROOT}/reference/config.md`.

Work the tree top to bottom. Each step narrows the cause.

## Step 0: are the Rutherford tools present at all?

If you have no Rutherford tools (no `doctor`, no `delegate`), the MCP server did not
start. This is a setup problem, not a per-agent one:

- Confirm `uv`/`uvx` is installed and on PATH (Rutherford launches through it).
- Run `/mcp` in the client to see whether the server is connected and what error it reports.
- Restart the client so it re-reads its MCP config.

Then go to the `setup-rutherford` skill. The steps below assume the tools are callable.

## Step 1: run doctor

`doctor` does a real read-only ACP round trip per agent (spawn, handshake, one prompt),
so it tells you which agents actually drive on this machine. Probe everything, or one
agent:

```
doctor()
doctor(agent="codex")
```

Each report is one of these states. Map the state to a cause and fix.

### ok

The agent spawned, handshook, and answered. Nothing to fix. If a panel still excluded
it, the agent is benched or in cooldown (see the bottom of this file).

### not_installed

The agent's CLI, or its npm ACP adapter shim, is not on PATH.

- For most agents: install the agent's own CLI and make sure its binary is on PATH.
- For `codex`, `claude_code`, and `pi`: these launch a separate npm ACP adapter
  (`codex-acp`, `claude-agent-acp`, `pi-acp`). If the underlying CLI is installed but
  the shim is not, `doctor` returns `not_installed` together with an `install_hint`
  of the form `npm i -g <package>`. Run that hint, or have `setup` do it:

  ```
  setup(install_adapters=true)
  ```

  `setup` with `install_adapters=true` runs `npm i -g <package>` for any agent whose
  CLI is present but whose adapter shim is missing. `codex` and `claude_code` reuse
  the existing CLI login, so no API key is needed once the shim is in place.

### handshake_failed

The agent process spawns but the ACP `initialize`/`new_session` exchange fails. This
is a launch or version mismatch, not auth. Check that the agent CLI and its adapter
are recent enough to speak the ACP version Rutherford expects, and that the launch
`command` in config points at the right binary. Re-run `doctor` after upgrading the CLI
or adapter.

### no_answer

The agent handshook but produced no answer to the probe prompt. This is usually auth
(not logged in) or a model problem (the configured model is unavailable). Sign in with
the agent's own login flow, then re-run `doctor`. Rutherford never logs in for you; it
reuses each agent's login. If login is fine, try a known-good model for that agent.

To separate "Rutherford cannot configure this agent" from "a completed turn fails for a
reason outside ACP", drop to the lighter probe in Step 2.

### model_unavailable

The agent spawned and handshook, but the turn failed because the harness or provider
rejected the model id. The connection is healthy; the model/provider config is wrong.
`doctor` reports this distinctly (not `error`) and, for the Claude Code Bedrock case,
attaches a `remediation_hint`.

The common case is `claude_code` returning `400 The provided model identifier is invalid`
on **AWS Bedrock**, **Google Vertex**, or an enterprise wrapper like **Amazon's Toolbox**
build. The third-party `claude-agent-acp` adapter falls back to a bare cloud alias
(`claude-opus-4-8`) that the provider rejects; it needs a full inference-profile id like
`us.anthropic.claude-opus-4-1-20250805-v1:0`. The standalone `claude` CLI works because it
resolves the Bedrock model itself; the SDK/adapter path Rutherford drives does not.

The fix is a per-agent env block in Rutherford's own config (`config.toml`), which lives
outside the `.claude` tree, so an org wrapper that rewrites `settings.json` on every launch
cannot revert it:

```toml
[agents.claude_code]
default_model = "global.anthropic.claude-opus-4-8[1m]"

[agents.claude_code.env]
ANTHROPIC_MODEL = "global.anthropic.claude-opus-4-8[1m]"
ANTHROPIC_CUSTOM_MODEL_OPTION = "global.anthropic.claude-opus-4-8[1m]"
```

Replace the id with your org's real one (the error's "Try `--model` to switch to ..."
suggestion is a good candidate). `ANTHROPIC_CUSTOM_MODEL_OPTION` is the value that survives
an enforced model allowlist, where `ANTHROPIC_MODEL` alone is rewritten back to the rejected
alias. Reconnect the server (config is read once at start), then re-run
`doctor(agent="claude_code")`. Approaches that do NOT work, and the full mechanism, are in
the server's `docs/bedrock.md`. See `add-agents` and `${CLAUDE_PLUGIN_ROOT}/reference/config.md`
for the `[agents.<id>.env]` feature.

### error

A thrown failure. Read the message in the report; it names the cause (a bad launch
command, a permissions denial, a path that does not exist). Fix what the message says
and re-run `doctor`.

## Step 2: connect_only probe for auth, quota, and entitlement

`connect_only=true` runs a handshake-only check: it spawns the agent and completes the
ACP handshake but sends no prompt. It reports `reachable` / `handshake_failed` /
`not_installed`, plus the models the agent advertises.

```
doctor(agent="grok", connect_only=true)
```

Use this to split two different failures:

- `reachable` plus advertised models means Rutherford can talk to and configure the
  agent. If a full `doctor` turn still fails (`no_answer` or a turn error), the failure
  is outside ACP: auth, quota, or entitlement.
- `handshake_failed` / `not_installed` here means the problem is at the connection layer
  and Step 1's fixes apply.

`grok` is the canonical entitlement case: `connect_only` reports `reachable` and lists
models, but a completed turn returns 403 without a SuperGrok subscription. The 403 shows
up in the agent's stderr, not always in the structured error, so a bare `no_answer` with
a clean `connect_only` points at the subscription, not your config.

## Step 3: PATH problems

A CLI can be installed but live in a directory that is not on PATH. Example: `qoder`
drops `qodercli` under `~/.qoder/bin`, which is not on PATH by default, so `doctor`
reports `not_installed` even though the binary exists. Three ways to fix it:

- Add the directory (e.g. `~/.qoder/bin`) to PATH.
- Point the agent's launch `command` at the full binary path in config:

  ```toml
  [agents.qoder]
  command = ["/home/you/.qoder/bin/qodercli", "acp"]
  ```

- Or let `discover` find installed agents and propose config blocks:

  ```
  discover()
  ```

  `discover` detects ACP agents you already have and proposes `[agents.<id>]` config;
  it does not download anything. Pass `write=true` to append the proposal to your config.

## Step 4: after a config or role change, restart

Edits to `config.toml` and role files do not hot-reload. Reconnect the server (restart
it from your client) before a config or role change takes effect; otherwise a panel that
references a new role fails with `UNKNOWN_ROLE`. Panels are the exception: edit
`panels.toon` and call `reload_panels` with no restart.

## Benched and cooldown agents

An agent that is `ok` in `doctor` can still be skipped from an auto-built panel because
it is benched or in cooldown. That is by design and not a connection fault. An explicit
`delegate(cli="<id>", prompt=...)` still runs that agent directly, so use a delegate to
confirm the agent itself works when a panel leaves it out.

## Where to go next

- Server missing or first-time install: `setup-rutherford`.
- Adding, overriding, or pointing an agent at a local runtime: `add-agents`.
