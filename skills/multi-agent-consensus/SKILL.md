---
name: multi-agent-consensus
description: >-
  Ask several coding agents the same question in parallel through Rutherford and compare their
  answers, or collapse them to one verdict with a strategy (unanimous, majority, plurality, weighted,
  or rank). Use when the user wants a second and third opinion, a cross-model answer, or a vote.
---

# Multi-agent consensus

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

Several voices, one prompt, run in parallel. Use this skill when the user asks for a second and third
opinion, a cross-model answer, or a vote across agents. The tool is `consensus`. Each target runs in
its own ACP session concurrently; the panel returns every voice, or one aggregated verdict if you pass
a `strategy`.

Ground truth for argument names and defaults is `${CLAUDE_PLUGIN_ROOT}/reference/tools.md`. Read it if
anything here is ambiguous rather than guessing a name.

## The minimal call

```
consensus(prompt="Where is the deadlock in src/queue.py?")
```

With no `targets`, the panel fans out to every registered agent at its default model, capped at
`max_targets`. The result's `skipped` field explains any agent left out (not installed, not signed in,
over the cap). You can write the fan-out explicitly three ways, all equivalent: omit `targets`, pass
`targets="all"`, or pass `expand_all=true`.

To pick the seats yourself, pass `targets`. Each entry is a `cli` string, a `cli:model` string, or a
`{cli, model}` object:

```
consensus(
  prompt="Is this retry loop correct under a network partition?",
  targets=["codex", "claude_code:opus", {"cli": "gemini"}],
  files=["src/net/retry.py"],
)
```

Run `capabilities` for the roster and `doctor` if you are unsure which agents actually drive on this
machine. `files` puts paths in scope for every voice; `working_dir` sets the directory they read from.

## Default strategy: all-voices

With no `strategy` (or `strategy="all-voices"`), the panel returns every voice with no aggregation.
That is the right default when the user wants to read and compare the answers themselves. One failing
voice is a failed result for that seat, not an aborted panel: the others still come back, and `skipped`
plus the per-voice errors tell you what happened.

## Strategies that collapse to one verdict

Pass a `strategy` other than `all-voices` and each voice is asked for a verdict; the panel returns one
outcome (a `StrategyResult`) instead of every answer. Pick by how you want the votes counted:

- `unanimous`: reports agreement only when every eligible voice lands on the same verdict; otherwise it
  reports the split. Use for a high-bar gate where any dissent should block.
- `majority`: the verdict held by more than 50% of all eligible voices wins. Use for a normal ship/no-ship
  vote where you want a real majority, not just a front-runner.
- `plurality`: the top verdict wins even below 50%. Use when there are more than two options and you want
  the leader regardless of an absolute majority.
- `weighted`: votes are weighted by each seat's `weight`. Use when some models should count more (set
  `weight` on the seats, or define it in a panel).
- `parity-pair`: built for seats marked `parity` as counterweights; use it with a panel designed for that.
- `rank`: a two-round Borda protocol. Every voice answers, then ranks the other answers (anonymized and
  self-excluded), aggregated by mean rank into a leaderboard with a pairwise agreement matrix. Use for a
  shoot-out where you want the answers ranked best-to-worst, not just counted.

`min_quorum` (config, default 1) is the floor of parseable voices an aggregating strategy needs before it
returns a decision.

## Synthesis, stances, and integrity controls

`synthesize=true` adds a server-side combined answer written across the voices. It applies to
`all-voices` only and defaults to `synthesize_default` (off out of the box). `judge` names the seat that
writes the synthesis:

```
consensus(
  prompt="Summarize the agreed root cause and the fix.",
  targets=["codex", "claude_code:opus", "gemini"],
  synthesize=true,
  judge="claude_code:opus",
)
```

`stances` is a list parallel to `targets` that steers each voice (`for`, `against`, or `neutral`) to
deliberately seed disagreement instead of letting the panel converge by accident. It cannot combine with
the auto-expanded ("all") panel, since there is no fixed target order to align to.

For the aggregating strategies, three integrity controls guard the vote:

- `require_dissent` surfaces each non-winning position rather than dropping it, so a lone correct minority
  stays visible.
- `require_independent_judge` keeps the seat that writes the synthesis out of the voting pool.
- `discount_correlated` down-weights votes from the same model lineage (vendor as fallback), so a panel of
  "one model in several CLI costumes" counts closer to one effective vote under `majority` / `plurality` /
  `weighted`. Each voice's `lineage_weight` shows the discount applied.

## Bounding the whole panel

`timeout_s` applies to each voice. `time_budget_s` is a wall-clock deadline for the whole panel, distinct
from the per-voice timeout: at the deadline, answered voices are kept, in-flight ones are cut, and the
panel aggregates over the harvest if `min_quorum` usable voices remain (`stop_reason="budget"`). Below
quorum it returns `BUDGET_EXHAUSTED`. `on_budget` is `harvest`, `continue`, or `resume` (defaults to
`default_on_budget`). For a long panel, `mode="async"` returns a `job_id` you poll with `job_status` /
`job_result`; `activity` shows it in flight.

## Read-only by construction

Consensus is read-only deliberation. A `safety_mode` beyond `read_only` (`propose`, `write`, `yolo`) is
refused — there is no coherent way to merge edits from several agents into one tree. Route any write or
propose work through `delegate`, a single agent isolated in a worktree sandbox. See
`${CLAUDE_PLUGIN_ROOT}/reference/safety.md`.

## Reusing a saved crew

`panel="<name>"` runs the panel over a saved crew (its targets plus a default strategy) instead of
spelling out `targets`; the two are mutually exclusive. A one-off tweak goes in `panel_overrides`, a
shallow merge over the panel record:

```
consensus(panel="code-review", prompt="Review the change in the provided files.", files=["src/x.py"])
consensus(panel="code-review", panel_overrides={"strategy": "unanimous"}, prompt="Ship verdict?")
```

See `${CLAUDE_PLUGIN_ROOT}/reference/panels.md` and the configure-panels skill for defining one.

## Worked examples

A side-by-side second and third opinion (read every voice, no vote):

```
consensus(
  prompt="What breaks if two requests hit register_user concurrently?",
  targets=["codex", "claude_code:opus", "gemini"],
  files=["src/users/register.py"],
)
```

A ship/no-ship vote across the panel:

```
consensus(
  prompt="Is this change safe to ship to production as-is? Answer SHIP or HOLD with one reason.",
  targets=["codex", "claude_code:opus", "gemini", "qwen"],
  strategy="majority",
  require_dissent=true,
)
```

A rank shoot-out over candidate approaches:

```
consensus(
  prompt="Propose the cleanest way to make this cache thread-safe.",
  targets=["codex", "claude_code:opus", "gemini"],
  strategy="rank",
  files=["src/cache/store.py"],
)
```

## When to reach for a different tool

- The voices should see each other and revise across rounds, not just answer once -> use the agent-debate
  skill (`debate`). Consensus voices never see each other; debate voices do.
- The task is specifically a code review of a diff or files -> use the code-review-panel skill (`review`),
  a read-only consensus under the `principal-reviewer` persona with synthesis on by default.
- The user wants one agent to actually make a change -> `delegate` in `write` mode. Consensus will refuse it.
