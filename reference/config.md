# Configuration reference

Rutherford works with zero config. When you do configure it, a TOML file at the global or project scope
sets the agent roster, defaults, and safety policy. A missing file is not an error; defaults apply.
Invalid config (a parse failure or a schema violation) stops the server at startup with a clear message
rather than serving a broken setup.

The `setup` tool writes a commented starter `config.toml` at the effective defaults — the easiest start.

## Where config lives

| Scope | Path |
| --- | --- |
| Global (Windows) | `%APPDATA%\rutherford\config.toml` |
| Global (Linux / macOS) | `$XDG_CONFIG_HOME/rutherford/config.toml` (fallback `~/.config/rutherford/config.toml`) |
| Project | the first of `rutherford.toml`, `.rutherford.toml`, `.rutherford/config.toml` found in the working directory |

Precedence, lowest to highest: global `acp.json` → global `config.toml` → project `acp.json` → project
`config.toml` → `RUTHERFORD_*` environment overrides. Nested tables merge; lists and scalars replace.
Setting `RUTHERFORD_CONFIG` to a path uses that single file and skips discovery.

Note: panels (`panels.toon`) and custom roles (`roles/`) use a separate discovery rooted at
`~/.rutherford/` and `<cwd>/.rutherford/` — see [panels.md](panels.md).

## The settings you will actually touch

All fields are optional. This is the practical subset; the full schema lives in the Rutherford repo's
`docs/configuration.md`.

```toml
# config.toml

# Restrict the registry to an allowlist (omit to enable every built-in + configured agent).
enabled_agents = ["claude_code", "codex", "goose"]

# Safety posture when a call names none. read_only | propose | write | yolo.
default_safety_mode = "read_only"

# Per-run wall-clock timeout, in seconds.
default_timeout_s = 300.0

# Default reasoning effort when a call names none. low | medium | high | xhigh (omit to let the agent decide).
# default_effort = "high"

# Probe a running Ollama (:11434) and LM Studio (:1234) and register each tool-capable model as a voice.
auto_detect_local_models = true

# Most agents a single consensus / debate call may fan out to.
max_targets = 8

# Absolute paths under which write/yolo delegations are permitted (read_only/propose never need this).
trusted_workspaces = ["/home/you/projects/myapp"]

# Persist runs to disk as replayable jobs. ephemeral (default) keeps nothing unless a call passes
# persist=true; job persists every run unless a call passes persist=false.
default_persistence = "ephemeral"
# jobs_dir = "/abs/path/to/jobs"   # default: <cwd>/.rutherford/jobs

# Have consensus write a combined answer across the voices by default.
synthesize_default = false

# Extra directories to search for role markdown files (see Roles below).
role_dirs = ["/home/you/.config/rutherford/roles"]
```

### Other useful knobs

| Field | Default | Meaning |
| --- | --- | --- |
| `max_depth` | 3 | Maximum delegation depth before a calls-itself chain is refused. |
| `max_concurrency` | `max_targets` | Ceiling on live ACP sessions at once across a panel. |
| `max_debate_rounds` | 4 | Maximum rounds a single `debate` may run. |
| `min_quorum` | 1 | Minimum parseable voices an aggregating strategy needs before it returns a decision. |
| `default_time_budget_s` | none | Default wall-clock budget for a panel / job (none = run to completion). |
| `default_on_budget` | `harvest` | Disposition at a time-budget deadline (`harvest` / `continue` / `resume`). |
| `verify_read_only` | false | Backstop that fails a `read_only` run which mutated its git tree (see safety.md). |
| `job_ttl_s` | 3600 | Seconds a finished in-memory job is retained before eviction. |

## Defining and overriding agents

An `[agents.<id>]` section overrides a built-in, defines a new agent, or clones a built-in and points it
at a local runtime. An id matching a built-in overrides its fields; an unknown id defines a new agent
and must supply `command` (or a `base`).

```toml
# Override a built-in's default model.
[agents.claude_code]
default_model = "claude-sonnet-4-6"

# Disable a built-in without dropping it from enabled_agents.
[agents.codex]
enabled = false

# Define a brand-new agent from a launch command.
[agents.my-agent]
command = ["node", "/abs/path/to/agent.js"]
provider = "openai"

# A local Ollama model as a first-class voice.
[agents.local-goose]
base    = "goose"     # clone this built-in's launch command
backend = "ollama"    # ollama | lmstudio
model   = "qwen3:8b"  # the model the runtime serves (required with backend)
```

The launch fields mirror the Zed/Cline `acp.json` shape. The loader also auto-imports an `acp.json`
beside the global config or in the project's `.rutherford/`, folding in its `agent_servers` block, so a
workspace already configured for Zed or Cline reuses that config. Native TOML wins over an imported
`acp.json` at the same scope.

### Per-agent environment: `[agents.<id>.env]`

`[agents.<id>.env]` sets environment variables for that one agent's subprocess, layered on top of the
inherited environment. Because it lives in Rutherford's own config — outside the `.claude` tree — it
survives an enterprise wrapper that rewrites `~/.claude/settings.json` on every launch.

The canonical use is a Claude Code seat on **AWS Bedrock**, **Google Vertex**, or an enterprise wrapper
like **Amazon's Toolbox** build, where a turn fails with `400 The provided model identifier is invalid`.
Pin a valid provider model id for the seat:

```toml
[agents.claude_code]
default_model = "global.anthropic.claude-opus-4-8[1m]"

[agents.claude_code.env]
ANTHROPIC_MODEL = "global.anthropic.claude-opus-4-8[1m]"
ANTHROPIC_CUSTOM_MODEL_OPTION = "global.anthropic.claude-opus-4-8[1m]"
```

Replace the id with your org's real one. `ANTHROPIC_CUSTOM_MODEL_OPTION` is the value that survives an
enforced model allowlist (where `ANTHROPIC_MODEL` alone is rewritten back to the rejected alias). Reconnect
the server after editing config. The full mechanism, the approaches that do not work, and how `doctor`
flags this case are in the Rutherford repo's `docs/bedrock.md`; the `troubleshoot-connection` skill walks
the fix.

## Roles

A role is a named persona whose text is prepended to your prompt. Pass `role="<id>"` to `delegate` /
`consensus` / `debate`. Five built-ins ship with Rutherford:

| id | persona |
| --- | --- |
| `principal-reviewer` | a rigorous senior reviewer who separates must-fix from nits |
| `architect` | a system designer who weighs tradeoffs and names the failure modes |
| `debugger` | a root-cause debugger who proposes the smallest correct fix |
| `security-reviewer` | a threat-modeling reviewer who rates findings by severity |
| `explainer` | a clear teacher who explains code from the reader's understanding |

Add your own as markdown files under a `role_dirs` directory (or under a `.rutherford/roles/`). A role
file is markdown with a small `name` / `description` frontmatter block; the body is the system prompt. A
file whose id matches a built-in overrides it. `list_roles` enumerates the catalog.

Roles do **not** hot-reload. Rutherford loads them once at server start and there is no `reload_roles`
tool. After adding or editing a role file, restart the server (reconnect it from your client) before the
role takes effect, or a panel that references it fails with `UNKNOWN_ROLE`.

## Environment overrides

These override single fields after the files merge: `RUTHERFORD_CONFIG`, `RUTHERFORD_MAX_DEPTH`,
`RUTHERFORD_MAX_TARGETS`, `RUTHERFORD_MAX_CONCURRENCY`, `RUTHERFORD_DEFAULT_TIMEOUT_S`,
`RUTHERFORD_DEFAULT_SAFETY`, `RUTHERFORD_TRUSTED_WORKSPACES` (path-separator delimited), and
`RUTHERFORD_ROLE_DIRS` (path-separator delimited).
