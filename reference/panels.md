# Panels reference

A panel is a named, reusable crew — a set of targets plus an aggregation strategy — so a call can say
`panel="code-review"` instead of spelling out the targets every time. Panels back `consensus`, `debate`,
and `review` (each takes a `panel` argument, mutually exclusive with `targets`).

Panels hot-reload: after editing a panels file, call `reload_panels`. No server restart is needed (that
distinguishes them from roles, which do need a restart).

## Where panels live

Panels are stored in a file named `panels.toon`, discovered across these scopes, lowest precedence
first:

1. `~/.rutherford/panels.toon` — the global, per-user store.
2. `<cwd>/.rutherford/panels.toon` — the project being worked in; overrides home for a same-named panel.
3. `$RUTHERFORD_CONFIG_DIR/panels.toon` — an explicit directory; overrides both.

Panels merge by name, the closest scope winning. The file is [TOON](https://toonformat.dev/), the
format Rutherford speaks on the wire.

## Schema

The file has one top-level `panels` table. Each key under it is a panel name. A panel carries exactly
three keys: `description`, `strategy`, and `targets`. Anything else is a validation error reported at
load.

```toon
panels:
  code-review:
    description: Senior/Principal-bar review. Two models review independently, then debate to consensus.
    strategy: all-voices
    targets[2]:
      - cli: claude_code
        model: opus
        role: principal-reviewer
        label: claude-opus
      - cli: codex
        model: gpt-5.5
        role: principal-reviewer
        label: codex-gpt-5.5
```

### Panel keys

| Key | Type | Required | Meaning |
| --- | --- | --- | --- |
| `description` | string | no | A human label for the panel. |
| `strategy` | string | no | How a consensus over this panel aggregates. Defaults to `all-voices`. One of `all-voices`, `unanimous`, `majority`, `plurality`, `weighted`, `parity-pair`, `rank`. A consensus call adopts it unless the call overrides `strategy`. |
| `targets` | list | yes | One or more seats. A non-empty list is required. |

### Seat (target) keys

A seat requires `cli`; the rest default. The keys map directly onto a consensus target.

| Key | Type | Required | Meaning |
| --- | --- | --- | --- |
| `cli` | string | yes | The agent id. Must be a registered agent (validated at load). |
| `model` | string | no | The model for this seat; the agent's default otherwise. |
| `role` | string | no | A persona id (see `list_roles`) that overrides the call-level role for this seat. |
| `label` | string | no | The key this seat appears under in a result. |
| `weight` | number ≥ 0 | no | Feeds the `weighted` strategy. |
| `parity` | bool | no | Marks a seat as a parity counterweight (the `parity-pair` strategy). |
| `stance` | string | no | `for` / `against` / `neutral` — steers this seat. |

## Using a panel

```
consensus(panel="code-review", prompt="Review the change in the provided files.", files=["src/x.py"])
debate(panel="design-roundtable", prompt="Postgres or DynamoDB for the event store?", rounds=3)
review(panel="code-review", paths=["src/db/pool.py"])
```

`rounds`, `judge`, `synthesize`, and the rest stay call arguments — the panel supplies the roster (and a
default strategy), not the call shape. A one-off tweak goes in `panel_overrides`, a shallow merge over
the panel record:

```
consensus(panel="code-review", panel_overrides={"strategy": "unanimous"}, prompt="...ship verdict...")
```

## Validation

`reload_panels` (and server start) validate every discovered panels file and report every problem in
one pass, naming the file, panel, and seat. Common errors: an unknown key, a `cli` that is not a
registered agent, a negative `weight`, an unknown `strategy` or `stance`, or an empty `targets` list. A
malformed panels file raises `PANEL_INVALID`; it does not partially load.

See [examples/panels.toon](../examples/panels.toon) for a ready-to-copy starter with three panels.
