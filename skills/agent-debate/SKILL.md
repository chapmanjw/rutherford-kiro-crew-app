---
name: agent-debate
description: >-
  Run a multi-round debate where several coding agents argue a question, see
  each other's positions, and revise across rounds on persistent sessions, with
  an optional judge and convergence tracking. Use when the user wants agents to
  argue it out, stress-test a decision, or reach consensus on a hard tradeoff.
---

# Agent debate

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

Several agents argue one question across rounds, each watching the others and revising its position. Use this when the value is in the back-and-forth: a hard architecture tradeoff, a decision that needs stress-testing, a claim you want challenged before you commit to it. If you only need each agent's independent take side by side, with no cross-talk, use multi-agent-consensus instead.

## The minimal call

`debate` requires a `prompt` and at least two `targets`. There is no single-agent debate.

```
debate(
  prompt="UUIDv7 or ULID for our event-store primary keys?",
  targets=["codex", "claude_code"],
)
```

Each `targets` entry is a `cli` string (`"codex"`), a `cli:model` string (`"codex:gpt-5.5"`), or an object `{"cli": "claude_code", "model": "opus"}` that may also carry per-seat `role`, `label`, `weight`, `parity`, and `stance`. Argument names match reference/tools.md; when unsure, read `${CLAUDE_PLUGIN_ROOT}/reference/tools.md` rather than guessing.

## How a debate runs

Each voice keeps ONE persistent ACP session for the whole debate. Round one is each voice's independent take on the prompt. Every later round shows a voice the others' latest positions and asks it to rebut and revise. Because the agent remembers its own prior reasoning in-session, only the delta is sent each round, not the whole history. The result carries the full per-round transcript plus a closing synthesis.

## Arguments that matter

- `rounds` (default 2) sets how many rounds run, capped by `max_debate_rounds` (default 4). Two rounds gives one independent take plus one revision; three or four lets positions actually move.
- `judge` names the target that writes the closing summary. Pass `require_independent_judge=true` to keep the judge from also being a debating seat where the roster allows it.
- `synthesize` (default true) adds the closing summary. Pass `false` for just the raw transcript.
- `track_convergence` asks each voice for a one-word verdict each round and stops early when the panel converges (a unanimous verdict) or stalls (the decision holds for the configured tolerance). The `outcome` field reports the termination reason: `converged`, `stalled`, `unresolved`, `budget`, or `quorum_lost`. Reach for this when you want the debate to end as soon as the agents agree rather than burning all the rounds.
- `carry_forward` re-sends the full prior transcript verbatim each round instead of relying on session memory. Use it for an agent whose session memory is weak; it costs more tokens per round, so it is bounded by `time_budget_s`.
- `time_budget_s` is a wall-clock deadline for the whole debate, enforced at round boundaries. A round still in flight at the deadline is cut and the transcript so far is finalized. `on_budget` is `harvest`, `continue`, or `resume` (default follows `default_on_budget`); `continue` runs every round to completion regardless.
- `stances` is not a debate argument; steer a seat by putting `stance` (`for` / `against` / `neutral`) on the target object. A `for`/`against` split is a good way to force a real argument instead of polite agreement.
- `role` (a persona id, see list_roles) and `effort` (`low` / `medium` / `high` / `xhigh`) apply to every voice.

## Read-only only

A debate is read-only deliberation. The voices run on persistent sessions in the working directory with no per-turn sandbox, so a mutating `safety_mode` (`propose` / `write` / `yolo`) is refused. Route any write or propose work through `delegate`, which isolates a single agent in a worktree sandbox. See `${CLAUDE_PLUGIN_ROOT}/reference/safety.md`.

## Panels and async

Pass `panel="<name>"` to run a saved crew instead of spelling out `targets` (mutually exclusive with `targets`; `rounds`, `judge`, and `synthesize` stay call arguments). See configure-panels.

Two strong models over three rounds takes minutes. Run it as a background job with `mode="async"` to get a `job_id` back, then poll with `job_status` / `job_result`. See background-jobs.

## Worked example

Question: UUIDv7 or ULID for event-store primary keys. Three rounds, opposing stances, a named judge.

```
debate(
  prompt="Choose primary keys for our append-only event store: UUIDv7 or ULID? "
         "Argue for time-orderability, index locality, encoding size, and tooling support.",
  targets=[
    {"cli": "codex", "model": "gpt-5.5", "stance": "for", "label": "uuidv7"},
    {"cli": "claude_code", "model": "opus", "stance": "against", "label": "ulid"},
  ],
  rounds=3,
  judge="codex",
  track_convergence=true,
)
```

What you get back: round 1 is each seat's opening case (uuidv7 leans on native DB type support and RFC standardization; ulid leans on the compact 26-char Crockford encoding). Round 2, each seat sees the other's case and concedes or pushes back. Round 3 narrows to where they actually disagree. The judge (codex here) writes the closing synthesis. If the two seats land on the same verdict before round 3, `track_convergence` ends it early with `outcome="converged"`; if neither moves, you get `outcome="stalled"` and the held decision.

## When consensus is the better fit

If the agents don't need to see each other, and you just want parallel independent answers to compare, that is multi-agent-consensus, not a debate. Debate costs more (persistent sessions, multiple rounds) and only pays off when cross-examination changes the answer.
