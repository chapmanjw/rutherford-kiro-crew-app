---
name: code-review-panel
description: >-
  Review a diff or a set of changed files across multiple coding agents at a senior or principal bar — a quick independent multi-model review, or a full review-then-debate-to-consensus flow. Use when the user wants code reviewed, a change checked for ship-readiness, or a multi-model review.
---

# Code review panel

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

Multiple coding agents review the same change at a principal bar, so a defect one model
misses another tends to catch. Three depths, all read-only. Pick by what the user wants:
a fast independent read, a review that argues to consensus, or a single ship/no-ship vote.

Ground truth for every argument name and default is `${CLAUDE_PLUGIN_ROOT}/reference/tools.md`.
Read it if you are unsure. The reviewer persona is `${CLAUDE_PLUGIN_ROOT}/examples/roles/principal-reviewer.md`
and the panels that back these calls are in `${CLAUDE_PLUGIN_ROOT}/examples/panels.toon`.

## When to use which depth

- Quick pass: the user wants a second (and third) opinion on a change, fast. One round, no
  cross-talk. Use the `review` tool.
- Full pass: the change is load-bearing, or the user asked for a real review with a defended
  verdict. Models review independently, then critique each other, then a judge writes the
  consensus. Use `debate` over the `code-review` panel.
- Ship vote: the user wants one decision, not a report. Each voice returns a VERDICT line and
  the panel collapses them to one outcome. Use `consensus` with an aggregating strategy.

## What goes in scope

Every depth takes the change the same two ways. Pick one:

- `paths=["src/db/pool.py", "src/db/query.py"]` puts the files in the agents' scope.
- `diff="<unified diff text>"` inlines a unified diff into the prompt. Use this for an
  uncommitted change or a specific hunk. Generate it with `git diff` and pass the text.

For `debate` and `consensus`, scope is `working_dir="<repo root>"` plus `files=[...]` (the
paths to put in scope). For `review`, it is `paths=[...]` or `diff=...` directly.

## Quick pass — the review tool

`review` is a read-only consensus under the `principal-reviewer` persona. Each agent reviews
the change on its own; you get every voice back plus a combined verdict (`synthesize` defaults
on for `review`). One pass, no cross-review.

    review(paths=["src/db/pool.py"], targets=["claude_code:opus", "codex:gpt-5.5"])

Or name the panel instead of spelling out the seats:

    review(panel="code-review", paths=["src/db/pool.py"])

Diff form:

    review(diff="<unified diff>", panel="code-review")

`targets` and `panel` are mutually exclusive. Omit both and `review` falls out to whatever the
configured default crew is; pass `targets` for an explicit two-or-three-model read.

## Full pass — review, cross-review, consensus via debate

A `debate` over the `code-review` panel runs the cross-review protocol the principal-reviewer
role defines. Round one is each model's independent review. Rounds two and three show each model
the others' latest findings and ask it to engage every one (AGREE / AGREE-UPGRADE /
AGREE-DOWNGRADE / DISAGREE-with-steelman / NEW) and revise its verdict. The judge writes the
closing consensus report.

    debate(
      panel="code-review",
      prompt="<the review prompt scaffold below>",
      working_dir="/path/to/repo",
      files=["src/db/pool.py", "src/db/query.py"],
      rounds=3,
      judge="claude_code:opus",
      mode="async",
    )

`rounds=3` gives one independent round plus two cross-review rounds. `judge` names the seat that
writes the synthesis. `mode="async"` returns a `job_id` immediately because a three-round debate
across two models takes minutes — see [background-jobs](background-jobs) for the full pattern.
Read it back with:

    job_status(job_id="<id>")   # poll until status is succeeded
    job_result(job_id="<id>")   # the full transcript + consensus report

This depth depends on the `code-review` panel and the `principal-reviewer` role existing in the
user's config. Both ship as examples (`${CLAUDE_PLUGIN_ROOT}/examples/panels.toon` and
`${CLAUDE_PLUGIN_ROOT}/examples/roles/`). If a call fails because the panel or role is unknown,
the user has not installed them yet — point them at [configure-panels](configure-panels) to add
the panel (then `reload_panels`) and [configure-roles](configure-roles) to add the persona (a
role needs a server restart, a panel does not).

## Ship vote — consensus with a strategy

When the user wants a single ship decision, run `consensus` over the panel with an aggregating
strategy. Each voice produces a VERDICT line; the strategy collapses the panel to one outcome.

    consensus(
      panel="code-review",
      strategy="unanimous",
      prompt="Review the change in the provided files and give a ship verdict. End with a VERDICT line.",
      working_dir="/path/to/repo",
      files=["src/db/pool.py"],
    )

Strategy picks how the verdicts combine:

- `unanimous` — ship only if every voice approves; any REQUEST_CHANGES / BLOCK fails the vote.
  Good for a strict two-model gate.
- `majority` — true majority of the verdicts. Use it on a three-or-more-seat panel like
  `ship-vote`.
- `plurality` — the most common verdict wins when there is no majority.

A two-seat panel can only be unanimous or split, so for a real majority/plurality vote use a
larger panel (the bundled `ship-vote` panel has three seats). The result tells you the decision
and, on a split, which voice dissented.

## The review prompt scaffold

The `principal-reviewer` role already carries the standard, the dimensions, the finding format,
and the VERDICT line, so the prompt only has to point the panel at the change and the priorities.
A workable prompt:

    Review the change in the provided files (or the inlined diff) at a Senior/Principal bar.
    Work the dimensions in priority order: correctness and concurrency first, then test depth,
    security, interface design, observability, and deployment safety. Confirm the change
    description matches the behavior. Scope yourself to what the change touches; note
    pre-existing issues separately rather than blocking on them. Emit findings in the standard
    format with severity and category, and end with a single VERDICT line.

If you are reviewing without the `principal-reviewer` role available, fold the bar and the
VERDICT instruction into the prompt yourself, because a bare panel will not hold the line on its
own.

## Notes

- All three depths are read-only. `review`, `consensus`, and `debate` refuse any `safety_mode`
  past `read_only` — they deliberate, they do not edit. To act on the findings, route the actual
  change through `delegate` in write mode (see [delegate-task](delegate-task)).
- The high bar and the cross-review behavior come from the `principal-reviewer` role, not from
  the tool. A panel without that role gives a shallower review.
- For a single-model review with no panel, `review(paths=[...], targets=["codex"])` is the
  cheapest call; reach for `debate` only when a defended consensus is worth the extra rounds.
