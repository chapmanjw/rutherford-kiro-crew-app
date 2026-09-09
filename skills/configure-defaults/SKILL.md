---
name: configure-defaults
description: >-
  Configure Rutherford's config.toml defaults: safety posture, trusted workspaces, the
  enabled-agent allowlist, default effort and timeouts, persistence, and local-model
  auto-detection. Use when the user wants to change Rutherford's default behavior or write
  or edit its config file.
---

# Configure Rutherford defaults

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

Rutherford reads a TOML config that sets the agent roster, the per-call defaults, and the
safety policy. Every field is optional and a missing file is fine -- defaults apply. This
skill covers editing that file. Named panels and custom roles are discovered separately and
are NOT in `config.toml`; for those see the `configure-panels` and `configure-roles` skills.

## Where the file lives, and which one wins

Two scopes, plus environment overrides on top.

| Scope | Path |
| --- | --- |
| Global (Windows) | `%APPDATA%\rutherford\config.toml` |
| Global (Linux / macOS) | `$XDG_CONFIG_HOME/rutherford/config.toml`, fallback `~/.config/rutherford/config.toml` |
| Project | first found in the working dir of `rutherford.toml`, `.rutherford.toml`, `.rutherford/config.toml` |

Precedence, lowest to highest: global `config.toml` -> project `config.toml` -> `RUTHERFORD_*`
env vars. Nested tables merge; lists and scalars replace. Setting `RUTHERFORD_CONFIG` to a path
uses that one file and skips discovery.

Edit the project file for a single repo, the global file for machine-wide defaults.

## The settings you will actually touch

Read these one-liners, then edit the matching key. Values shown are the defaults from
`${CLAUDE_PLUGIN_ROOT}/examples/config.toml`.

- `enabled_agents` -- allowlist that restricts the registry, e.g. `["claude_code", "codex", "goose"]`. Omit it to enable every built-in plus any configured agent.
- `default_safety_mode` -- posture a call adopts when it names none: `read_only` (default) | `propose` | `write` | `yolo`. `write`/`yolo` need a trusted workspace (see below).
- `default_timeout_s` -- per-run wall-clock timeout in seconds, default `300.0`.
- `default_effort` -- reasoning effort when a call names none: `low` | `medium` | `high` | `xhigh`. Commented out by default so the agent decides.
- `auto_detect_local_models` -- when `true`, probe a running Ollama (:11434) and LM Studio (:1234) and register each tool-capable model as a free voice.
- `max_targets` -- most agents one `consensus` / `debate` call may fan out to, default `8`.
- `trusted_workspaces` -- absolute paths under which `write`/`yolo` delegations are allowed. `read_only`/`propose` never need this.
- `default_persistence` -- `ephemeral` (default; keeps nothing unless a call passes `persist=true`) or `job` (persists every run unless a call passes `persist=false`).
- `jobs_dir` -- where durable jobs are written, default `<cwd>/.rutherford/jobs`.
- `synthesize_default` -- when `true`, `consensus` writes one combined answer across the voices by default.
- `role_dirs` -- extra directories to search for role markdown files (roles do not hot-reload; restart to load them).

For the full schema, including `max_depth`, `max_concurrency`, `max_debate_rounds`,
`min_quorum`, `verify_read_only`, and the time-budget knobs, read
`${CLAUDE_PLUGIN_ROOT}/reference/config.md`.

## How to write the file

Two paths. Prefer `setup` to scaffold, then edit by hand.

Scaffold a commented starter at the effective defaults (it never clobbers an existing file):

```
setup(scope="project", write=true)
```

Use `scope="global"` to write the machine-wide file instead. To add the current directory to
`trusted_workspaces` at the same time, pass `trust_workspace=true`:

```
setup(scope="project", write=true, trust_workspace=true)
```

After scaffolding, open the written `config.toml` and edit the keys you need. To edit an
existing config, just change the file directly -- the example at
`${CLAUDE_PLUGIN_ROOT}/examples/config.toml` is a good template to copy keys from.

## Changes take effect on restart

This is the gotcha. `config.toml` is loaded once at server start. A change does NOT hot-reload
the way a panel does -- reconnect the Rutherford server in your client for it to take effect.

Invalid config (a TOML parse failure or a schema violation) stops the server at startup with a
clear message rather than serving a broken setup. If the server fails to start after an edit,
the error names the bad field; fix it and reconnect.

## One-off changes without editing the file

For a temporary override, set an environment variable before the server starts instead of
editing the file. These override a single field after the files merge:

- `RUTHERFORD_DEFAULT_SAFETY`
- `RUTHERFORD_DEFAULT_TIMEOUT_S`
- `RUTHERFORD_MAX_TARGETS`
- `RUTHERFORD_MAX_CONCURRENCY`
- `RUTHERFORD_MAX_DEPTH`
- `RUTHERFORD_TRUSTED_WORKSPACES` (path-separator delimited)
- `RUTHERFORD_ROLE_DIRS` (path-separator delimited)
- `RUTHERFORD_CONFIG` (point at one file, skipping discovery)

## Related

- `trusted_workspaces` is the gate that lets a `write`/`yolo` delegation actually modify files. For how that gate plays out at call time, see the `safe-write-delegation` skill.
- To add or override an agent, write an `[agents.<id>]` section in this same file; see the `add-agents` skill.
