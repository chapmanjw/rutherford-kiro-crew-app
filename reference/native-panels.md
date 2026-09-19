# Native panels reference

A native panel is a named crew that runs entirely inside Kiro Crew: every seat is a Kiro Crew subagent
(`spawn_run`, one model per seat), the aggregation is done by the `native-panel` skill, and no external
ACP agent is launched. It is the all-native counterpart to a saved panel (see [panels.md](panels.md)),
added in v3.0.0.

A panel is either ALL native or ALL MCP — there is no mixed mode. Native panels live in their own file,
`native-panels.toon`, NOT `panels.toon`: Rutherford's panels loader rejects the keys a native panel adds
(`engine`, `agent`, `reduction`), so the two shapes cannot share one file.

## Where native panels live

Native panels are stored in a file named `native-panels.toon`, discovered across the same three scopes as
`panels.toon`, lowest precedence first:

1. `~/.rutherford/native-panels.toon` — the global, per-user store.
2. `<cwd>/.rutherford/native-panels.toon` — the project being worked in; overrides home for a same-named panel.
3. `$RUTHERFORD_CONFIG_DIR/native-panels.toon` — an explicit directory; overrides both.

Panels merge by name, the closest scope winning. The file is [TOON](https://toonformat.dev/), the same
format `panels.toon` uses.

## Schema

The file has one top-level `native-panels` table. Each key under it is a panel name. A panel carries
`description`, `engine`, `strategy`, `reduction`, and `targets`. Any other key is a validation error
reported at author time.

```toon
native-panels:
  fast-review:
    description: Three Kiro-hosted models review independently, majority verdict.
    engine: native
    strategy: majority
    targets[3]:
      - model: claude-sonnet-5
        role: principal-reviewer
        label: sonnet
      - model: gpt-5.6-luna
        role: principal-reviewer
        label: gpt
      - model: deepseek-3.2
        role: principal-reviewer
        label: deepseek
```

### Panel keys

| Key | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `description` | string | no | — | A human label for the panel. |
| `engine` | string | yes | — | Must be `native`. Any other value is a validation error; this is what routes the panel through `spawn_run` instead of the Rutherford MCP server. |
| `strategy` | string | no | `all-voices` | How the native panel aggregates. One of `all-voices`, `unanimous`, `majority`, `plurality`, `weighted`, `parity-pair`, `rank`. |
| `reduction` | string | no | — | An optional free-text note naming how the skill should reduce/report (e.g. a synthesis hint). Advisory; the `strategy` drives the vote math. |
| `targets` | list | yes | — | One or more seats. A non-empty list is required. |

### Seat (target) keys

A native seat requires `model`; the rest default. Each seat becomes one `spawn_run` call at that model.

| Key | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `model` | string | yes | — | The Kiro-spawnable model for this seat (e.g. `claude-sonnet-4.5`). This is the native seat's identity — there is no `cli`. Validated against `kiro-cli chat --list-models` at run time. |
| `role` | string | no | — | A ported native role (see [roles-native.md](roles-native.md)) whose prompt text is prepended to the seat task. Plain text, not a Rutherford role id. |
| `label` | string | no | the model | The key this seat appears under in the result. |
| `weight` | number ≥ 0 | no | `1` | Feeds the `weighted` strategy. |
| `parity` | bool | no | `false` | Marks a seat as a parity counterweight (the `parity-pair` strategy). |
| `stance` | string | no | — | `for` / `against` / `neutral` — steers this seat. |
| `agent` | string | no | `kirocrew` | The Kiro Crew agent to spawn for this seat. Omit for the default full-toolset worker. |

## How native seats differ from MCP seats

| | MCP seat (`panels.toon`) | Native seat (`native-panels.toon`) |
| --- | --- | --- |
| Identity | `cli` — a Rutherford ACP agent id (required) | `model` — a Kiro-spawnable model name (required) |
| `model` | optional (agent's default otherwise) | required (it IS the seat) |
| `role` | a Rutherford role id resolved by the server | plain prompt text from `roles-native.md`, prepended by the skill |
| execution | an external ACP CLI launch via the MCP server | a `spawn_run` subagent inside Kiro Crew |
| `agent` | n/a | optional Kiro Crew agent to spawn (default `kirocrew`) |
| `engine` | n/a | required, must be `native` |

## Strategies

All seven `panels.toon` strategies are ported. The native skill runs the same vote math over the seats'
`spawn_run` completions:

| Strategy | What it does |
| --- | --- |
| `all-voices` | Return every seat's full answer, no vote. The default. |
| `unanimous` | Ship the verdict only when every parseable voice agrees; otherwise report the split. |
| `majority` | The verdict held by more than 50% of parseable voices wins; else report the split and "no majority". |
| `plurality` | The most common verdict wins even below 50%; ties are reported as tied. |
| `weighted` | Sum each seat's `weight` (default 1) per verdict; the highest weighted sum wins. |
| `parity-pair` | Split seats into `parity` counterweights and the rest; each group votes by simple majority; report both and whether they agree. |
| `rank` | Two-round Borda: seats answer, then rank the others' answers (anonymized, self-excluded); aggregate to a leaderboard plus a pairwise agreement matrix. |

## Using a native panel

You do not call an MCP tool. You ask the orchestrator to run the panel and it follows the `native-panel`
skill: resolve the panel from `native-panels.toon`, validate it, fan out one `spawn_run` per seat at that
seat's model, collect the completions, reduce by the strategy, and report. Point it at a panel by name:

```
Run the fast-review native panel over the change in src/db/pool.py.
Run design-roundtable natively on: Postgres or DynamoDB for the event store?
```

## Validation

The `native-panel` skill validates a panel before spawning anything and STOPS on the first problem — it
never falls back to MCP. What fails at author time:

- an unknown panel key or an unknown seat key (strict — unlike a bare `panels.toon`, native panels reject
  unknown keys),
- `engine` missing or not equal to `native`,
- a seat missing `model`,
- an unknown `strategy` or `stance`,
- a negative or non-numeric `weight`,
- a non-bool `parity`,
- an empty `targets` list.

A model that is not in `kiro-cli chat --list-models` fails at run time with a clear message ("model 'X' is
not available; use engine: mcp for external ACP agents") — again with no MCP fallback.

## Not ported

`discount_correlated` (the MCP consensus lineage-discount control) has no native analogue in v3. It stays
MCP-only. Everything else — the seven strategies, `require_dissent`, `synthesize`, `stances`,
`min_quorum`, `track_convergence` for native debate — is available on the native path.

See [examples/native-panels.toon](../examples/native-panels.toon) for a ready-to-copy starter with three
panels, and [roles-native.md](roles-native.md) for the built-in role prompt text native seats use.
