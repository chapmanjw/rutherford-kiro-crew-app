# Rutherford tool reference

The exact tool surface the Rutherford MCP server exposes, with argument names and defaults. Skills in
this plugin cite this file rather than restating it. You call these tools through your MCP client; you
rarely name them yourself, since your agent picks the right one from your request.

Everything defaults to **read-only**. Write and yolo are explicit opt-in behind a trusted workspace
(see [safety.md](safety.md)).

## The 18 tools

| Tool | What it does |
| --- | --- |
| `delegate` | Hand one task to one ACP agent; get one normalized result back. |
| `consensus` | Ask the same prompt of several agents in parallel; return every voice (or an aggregated verdict). |
| `debate` | Have several agents argue across rounds on persistent sessions; return the full transcript. |
| `review` | Review a diff or a set of files across one or more agents (a read-only, reviewer-persona consensus). |
| `plan` | Ask one agent for an implementation plan under the architect persona (read-only by construction). |
| `continue_job` | Resume or build on a completed durable job with a new prompt. |
| `analyze` | Run an offline report over the kept run corpus (`historical_agreement`). |
| `capabilities` | List the registered agents (id, display name, launch command, provider) — the cheap snapshot. |
| `doctor` | Probe each agent with a real read-only ACP round trip and report conformance. |
| `discover` | Detect installed ACP agents from the community registry and propose config blocks. |
| `list_roles` | List the role personas you can pass as `role="<id>"`. |
| `setup` | Show where config lives, scaffold a starter `config.toml`, and install missing npm ACP adapter shims. |
| `reload_panels` | Reload the saved panels from disk without restarting the server. |
| `list_jobs` | List the background jobs being tracked (every status), newest first. |
| `activity` | Show only the jobs in flight right now, each with a live elapsed time. |
| `job_status` | Report one background job's status and timings. |
| `job_result` | Return a finished job's result envelope (identical to the sync envelope). |
| `cancel_job` | Cancel a running background job and tear down its work. |

## The minimal call

Each tool has a small required set and sensible defaults for the rest. You never need to send a fully
populated payload.

| Tool | Required | Example |
| --- | --- | --- |
| `delegate` | `cli`, `prompt` | `{ "cli": "codex", "prompt": "explain src/auth/session.py" }` |
| `consensus` | `prompt` (omit `targets`, or pass `"all"`, to fan out to every agent) | `{ "prompt": "where is the deadlock in queue.py?" }` |
| `debate` | `prompt`, `targets` (at least two) | `{ "prompt": "UUIDv7 or ULID?", "targets": ["codex", "claude_code"] }` |
| `review` | `diff` or `paths` | `{ "paths": ["src/db/pool.py"] }` |
| `plan` | `cli`, `goal` | `{ "cli": "claude_code", "goal": "add rate limiting to the API" }` |
| `doctor` | none | `{}` |

`debate` is the one tool that needs an explicit `targets` (a debate has no single-agent form). Everything
else has a default for every non-required argument.

## Targets

Wherever a tool takes `targets`, each entry is one of:

- a `cli` string: `"codex"`
- a `cli:model` string: `"codex:gpt-5.5"`
- an object: `{ "cli": "claude_code", "model": "opus" }`, which may also carry per-seat `role`, `label`,
  `weight`, `parity`, and `stance`.

For `consensus`, omit `targets`, pass an empty list, pass the sentinel `"all"`, or set `expand_all=true`
to fan out to every registered agent at its default model (capped at `max_targets`). The result's
`skipped` field explains any agent left out.

## Shared arguments

`delegate` / `consensus` / `debate` share: `working_dir`, `files` (paths to put in scope), `safety_mode`,
`timeout_s`, `role`, `effort`, `persist`, and `mode` (`sync` or `async`).

## Per-tool arguments

### `delegate(cli, prompt, ...)`
One task to one agent. Returns the answer, timing, token cost where the agent reports it, and the ACP
`session_id`.

- `model` — the agent's default otherwise.
- `safety_mode` — `read_only` | `propose` | `write` | `yolo`; omitted uses the configured default
  (read_only out of the box). `write` / `yolo` also need a trusted workspace.
- `trust_workspace` (bool) — per-call trust grant for `write` / `yolo` (see safety.md).
- `files` — list of paths to put in scope.
- `role` — a persona id (see `list_roles`), prepended to the prompt.
- `effort` — `low` | `medium` | `high` | `xhigh`; asks the agent to spend more reasoning where it has a
  knob (a reported no-op for an agent with none).
- `fallback` — an ordered list of alternate targets tried only when the primary fails on a
  re-execution-safe failure (a spawn/handshake failure that never ran the prompt). A write/yolo
  delegation never falls back.
- `allow_model_fallback` (default true) — retry the same agent on its configured fallback model on a
  model-unavailable failure.
- `persist` — keep the run as a durable job under `<jobs_dir>/<run_id>/`; `None` follows
  `default_persistence`.
- `session_id` — resume a prior agent session (pass a `session_id` from an earlier result). An agent
  that does not persist its own sessions fails `RESUME_FAILED`.
- `mode` — `sync` (await) or `async` (return a `job_id`).

### `consensus(prompt, ...)`
Several agents, same prompt, in parallel; each in its own ACP session. One failing voice is a failed
result, never an aborted panel.

- `targets` — see Targets above.
- `panel` / `panel_overrides` — name a saved panel instead of `targets` (mutually exclusive). See
  [panels.md](panels.md).
- `strategy` — `all-voices` (default, returns every voice) | `unanimous` | `majority` | `plurality` |
  `weighted` | `parity-pair` | `rank`. A strategy other than `all-voices` asks each voice for a verdict
  and collapses the panel to one outcome.
- `synthesize` — add a server-side combined answer (`all-voices` only); defaults to `synthesize_default`
  (off out of the box). `judge` names the seat that writes it.
- `stances` — a list parallel to `targets` steering each voice (`for` / `against` / `neutral`).
- `require_dissent`, `require_independent_judge`, `discount_correlated` — integrity controls for the
  aggregating strategies (see the consensus skill).
- `expand_all` — fan out to every registered agent.
- `time_budget_s` / `on_budget` — a wall-clock deadline for the whole panel (distinct from each voice's
  `timeout_s`); `on_budget` is `harvest` | `continue` | `resume`.
- Consensus is read-only deliberation: a `safety_mode` beyond `read_only` is refused. Route write work
  through `delegate`.

### `debate(prompt, targets, ...)`
Several agents argue across rounds. Each voice keeps one persistent ACP session across all rounds:
round one is each voice's independent take; each later round shows a voice the others' latest positions
and asks it to revise.

- `rounds` (default 2) — capped by `max_debate_rounds` (default 4).
- `judge` — names a target to write the closing synthesis. `require_independent_judge` (default false)
  insists the judge is a non-participant.
- `synthesize` (default true) — the closing summary.
- `carry_forward` — re-send the full prior transcript each round instead of relying on session memory.
- `track_convergence` — ask each voice for a one-word verdict each round and stop early on convergence
  or stall; `outcome` reports the termination reason, one of `converged`, `stalled`, `unresolved`,
  `budget`, `quorum_lost`.
- `panel` / `panel_overrides`, `role`, `effort`, `time_budget_s` / `on_budget`, `persist`, `mode` — as
  above. Read-only deliberation: a mutating `safety_mode` is refused.

### `review(paths | diff, ...)`
A read-only consensus under the `principal-reviewer` persona. Provide `diff` (a unified diff, inlined
into the prompt) or `paths` (files put in scope). `targets` or a saved `panel`; `synthesize` defaults
on. Always read-only.

### `plan(cli, goal, ...)`
A read-only delegate under the `architect` persona: the agent designs an approach rather than
implementing it. `files` puts paths in scope. Implementing the plan is `delegate` in write mode.

### `continue_job(job_id, prompt, ...)`
Continue a completed durable job with a new direction. A `delegate` job resumes its session; a
`consensus` panel resumes each voice and re-aggregates; a `debate` argues `rounds` more rounds. The
continuation is a fresh child run linked to the parent (`continued_from`); the parent is never mutated.
The trust gate is re-applied and defaults to `read_only`.

### Inspection and health
- `capabilities()` — the instant roster snapshot (id, display name, launch command, provider).
- `doctor(agent=None, timeout_s=60, connect_only=False)` — a real read-only ACP round trip per agent.
  Each report is `ok` / `no_answer` / `handshake_failed` / `not_installed` / `error`. `connect_only=true`
  runs the lighter handshake-only check and reports `reachable` / `handshake_failed` / `not_installed`
  plus advertised models — useful when a model call fails for a reason outside ACP (auth / entitlement).
- `discover(refresh=False, probe=True, write=False, scope="project")` — find installed ACP agents via
  the community registry and propose `[agents.<id>]` config; `write=true` appends it to the config.
- `list_roles()` — the persona catalog.

### Config and panels
- `setup(scope="project", write=False, trust_workspace=False, install_adapters=False)` — show where
  config lives and scaffold a starter `config.toml` (never clobbers). `install_adapters=true` runs
  `npm i -g <package>` for any agent whose CLI is installed but whose npm ACP adapter shim is missing.
- `reload_panels()` — re-read the saved panels from disk after editing a `panels.toon`.

### Jobs
- `list_jobs()` — every tracked job, newest first.
- `activity()` — only the jobs in flight right now, each with a live elapsed time, longest-running first.
- `job_status(job_id)` — one job's status and timings.
- `job_result(job_id)` — a finished job's result envelope (identical to the sync path's).
- `cancel_job(job_id)` — cancel a running job and tear down its work.

Jobs are in-memory: a finished one is evicted after `job_ttl_s` (default 3600s), and a server restart
clears them all. Durable, replayable runs are a separate thing — pass `persist=true` (see the
background-jobs skill).

### Analysis
- `analyze(report="historical_agreement")` — scans the consensus panels you kept and reports how often
  two distinct model lineages reached the same verdict when they co-voted. An observational signal for
  your roster choice, not a vote discount. An empty corpus returns an empty report.

## The agent roster

Rutherford ships **19 built-in agents** with curated launch commands. On a given machine only the ones
you have installed and signed in will actually drive — run `doctor` to see which. The built-ins, by id:

`goose`, `opencode`, `vibe`, `cline`, `junie`, `kimi`, `openhands`, `codex`, `claude_code`, `copilot`,
`qwen`, `droid`, `cursor`, `kiro`, `pi`, `hermes`, `gemini`, `qoder`, `grok`.

`codex` and `claude_code` launch through the official Zed ACP adapters (`codex-acp`,
`claude-agent-acp`) and reuse the existing CLI login — no API key. With Ollama or LM Studio running,
Rutherford auto-detects each tool-capable local model and registers it as a `goose`-based agent
(ids like `ollama-qwen3-8b`), so you can run a panel for free with no paid subscription.

Rutherford never installs or logs in to an agent. It reuses each agent's own login. Sign in with each
agent's own flow before starting, then confirm with `doctor`.
