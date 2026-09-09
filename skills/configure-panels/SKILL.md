---
name: configure-panels
description: >-
  Create or edit saved Rutherford panels (reusable crews of agents) in panels.toon — seats, models, per-seat roles and stances, and the aggregation strategy — then hot-reload them with reload_panels. Use when the user wants to define, change, or list a named panel for consensus, debate, or review.
---

# Configure panels

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

A panel is a named, reusable crew: a list of seats (targets) plus a default aggregation strategy. Once
saved, a call says `panel="code-review"` instead of spelling out the targets every time. Panels back
`consensus`, `debate`, and `review`.

## When to use

Use this skill when the user wants to define, rename, or change a saved panel; add or remove a seat; set
a panel's models, per-seat roles, stances, or weights; pick the aggregation strategy; or list what panels
exist. For one-off groupings, pass `targets` inline instead and skip the file.

For ground truth while editing, read `${CLAUDE_PLUGIN_ROOT}/reference/panels.md` and the starter at
`${CLAUDE_PLUGIN_ROOT}/examples/panels.toon`.

## Where panels.toon lives

The file is named `panels.toon` and is discovered across three scopes, lowest precedence first:

1. `~/.rutherford/panels.toon` — the global, per-user store.
2. `<cwd>/.rutherford/panels.toon` — the project being worked in; overrides home for a same-named panel.
3. `$RUTHERFORD_CONFIG_DIR/panels.toon` — an explicit directory; overrides both.

Panels merge by name, the closest scope winning. The file is TOON. Note this is a separate discovery
from `config.toml` (see `${CLAUDE_PLUGIN_ROOT}/reference/config.md`) — panels do not live in the config
file. Edit the global file when the panel should follow the user everywhere; edit the project file when
it belongs to one repo.

## Schema

One top-level `panels` table. Each key under it is a panel name. A panel carries exactly three keys:
`description`, `strategy`, `targets`. Any other key is a validation error reported at load.

Each entry under `targets` is a seat. A seat requires `cli`; the rest default.

| Key | Where | Type | Required | Meaning |
| --- | --- | --- | --- | --- |
| `description` | panel | string | no | A human label for the panel. |
| `strategy` | panel | string | no | Default aggregation, one of the strategies below. Defaults to `all-voices`. |
| `targets` | panel | list | yes | One or more seats. A non-empty list is required. |
| `cli` | seat | string | yes | The agent id. Must be a registered agent (validated at load). |
| `model` | seat | string | no | The model for this seat; the agent's default otherwise. |
| `role` | seat | string | no | A persona id (see `list_roles`) that overrides the call-level role for this seat. |
| `label` | seat | string | no | The key this seat appears under in the result. |
| `weight` | seat | number, `>= 0` | no | Feeds the `weighted` strategy. |
| `parity` | seat | bool | no | Marks a seat as a parity counterweight (the `parity-pair` strategy). |
| `stance` | seat | string | no | `for` / `against` / `neutral` — steers this seat. |

The exact TOON shape (note the `targets[N]:` count header and the `- cli:` seat rows):

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

## Strategy options

The panel's `strategy` is a default that a `consensus` call can override with its own `strategy`
argument.

- `all-voices` (default) — returns every voice, no collapse. Use when the caller wants to read each
  agent's full answer (and optionally a synthesized summary).
- `unanimous` — asks each voice for a verdict; the panel agrees only if every voice agrees.
- `majority` — collapses to the verdict held by more than half the voices.
- `plurality` — collapses to the most common verdict, even without a true majority.
- `weighted` — a verdict tally weighted by each seat's `weight`.
- `parity-pair` — pits seats marked `parity` against the rest as a counterweight check.
- `rank` — a ranked-choice aggregation over each voice's ordering.

Any strategy other than `all-voices` asks each voice for a verdict and collapses the panel to one
outcome.

## Editing workflow

1. Open the right `panels.toon` for the scope (create it if missing; start the file with the
   `panels:` line).
2. Copy a block from `${CLAUDE_PLUGIN_ROOT}/examples/panels.toon` and edit it: rename the panel, set each
   seat's `cli` / `model` / `role` / `label`, and pick `strategy`. Keep the `targets[N]:` count in sync
   with the number of seats you write.
3. Save, then call `reload_panels()` to validate and load from disk. No server restart is needed.

`reload_panels` validates every discovered panels file and reports every problem in one pass, naming the
file, panel, and seat. Common errors: an unknown key, a `cli` that is not a registered agent, a negative
`weight`, an unknown `strategy` or `stance`, an empty `targets` list. A malformed file raises
`PANEL_INVALID` and does not partially load — fix the reported seats and call `reload_panels` again.

## Using a panel in a call

Pass `panel="<name>"` to `consensus`, `debate`, or `review`. `panel` is mutually exclusive with
`targets` — pass one or the other, not both.

```
consensus(panel="code-review", prompt="Review the change in the provided files.", files=["src/x.py"])
debate(panel="design-roundtable", prompt="Postgres or DynamoDB for the event store?", rounds=3)
review(panel="code-review", paths=["src/db/pool.py"])
```

The panel supplies the roster and a default strategy; `rounds`, `judge`, `synthesize`, and the rest stay
call arguments. For a one-off change to a saved panel without editing the file, pass `panel_overrides`, a
shallow merge over the panel record:

```
consensus(panel="code-review", panel_overrides={"strategy": "unanimous"}, prompt="Ship verdict on the diff.")
```

## Gotchas

- A seat's `role=` must name a role that exists. Roles do not hot-reload — `reload_panels` reloads
  panels but not roles, and there is no role-reload tool. After adding or editing a role, the server
  must be restarted (reconnect it from the client) or a panel referencing the new role fails with
  `UNKNOWN_ROLE`. See the `configure-roles` skill.
- A seat's `cli` must be a registered, installed agent. If `reload_panels` rejects a `cli`, confirm the
  id and that the agent drives on this machine with `doctor`. See the `add-agents` skill.
- Keep the `targets[N]:` header equal to the seat count, and quote nothing extra — the loader parses the
  file as TOON.

## Worked example: a 2-seat code-review panel, end to end

Goal: a reusable panel that has Claude (Opus) and Codex (GPT-5.5) each review independently under the
principal-reviewer persona, returning both voices.

1. Write `<cwd>/.rutherford/panels.toon` (project scope) with exactly this content:

```toon
panels:
  code-review:
    description: Two models review independently under the principal-reviewer persona.
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

2. Load it:

```
reload_panels()
```

If it reports a bad seat (for example `codex` not registered, or `principal-reviewer` unknown), fix that
seat and run `reload_panels()` again. `principal-reviewer` is a built-in role, so it resolves without a
restart; a custom role would need one.

3. Use it on a real diff:

```
review(panel="code-review", paths=["src/db/pool.py"])
```

To take a strict ship/no-ship vote from the same seats without touching the file, override the strategy
for that one call:

```
consensus(panel="code-review", panel_overrides={"strategy": "unanimous"}, prompt="Is this diff safe to ship? Verdict only.")
```
