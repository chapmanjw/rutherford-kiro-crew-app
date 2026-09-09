---
name: background-jobs
description: >-
  Run long Rutherford work as a background job (mode=async) and manage it: list jobs,
  watch activity, poll status, fetch the result, cancel, continue a durable job, or
  persist a run to disk. Use when a delegation, consensus, or debate will take minutes,
  or the user wants to keep working while it runs.
---

# Background jobs

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

Run Rutherford work off the request path and manage it while it runs. Two separate
features live here:

- Async (`mode="async"`) moves a single call into the background so it doesn't block.
- Durable (`persist=true`) writes a replayable job to disk that survives a restart.

They compose, but they are different things. Read the distinction below before mixing them.

## When to use

- A `delegate`, `consensus`, or `debate` will take minutes and you (or the user) want to
  keep working while it runs -> async.
- You want a finished run on disk to resume or re-aggregate later, or to survive a server
  restart -> durable (`persist=true`), then `continue_job`.
- You want an offline read over the kept consensus corpus -> `analyze`.

For the deliberation calls themselves, see the sibling skills `delegate-task`,
`multi-agent-consensus`, and `agent-debate`. This skill is about running them in the
background and managing the lifecycle.

## Async: move a call into the background

Pass `mode="async"` to `delegate`, `consensus`, or `debate`. The call returns a small
envelope immediately instead of awaiting:

```
debate(
  prompt="UUIDv7 or ULID for our event ids? argue both sides and converge",
  targets=["codex", "claude_code"],
  rounds=3,
  mode="async"
)
-> { "job_id": "...", "status": "running", "tool": "debate" }
```

The work runs as an in-memory task. When it finishes, `job_result` returns a result
envelope that is byte-for-byte identical to what the same call would have returned in
`sync` mode. Nothing about the answer changes; only when you receive it does.

## Manage the running job

- `list_jobs()` — every tracked job, any status, newest first.
- `activity()` — only the jobs in flight right now, each with a live elapsed time,
  longest-running first. Use this to see what is still working.
- `job_status(job_id)` — one job's status and timings.
- `job_result(job_id)` — a finished job's result envelope (the sync envelope).
- `cancel_job(job_id)` — kill a running job and tear down its work.

```
job_status(job_id="...")   -> status + start/elapsed timings
job_result(job_id="...")   -> the full result, once status is finished
cancel_job(job_id="...")   -> stops the run and releases its sessions
```

Poll with `job_status` (or scan `activity` across several jobs); read the answer with
`job_result` once it is finished.

## Lifecycle gotcha

In-memory jobs are evicted after `job_ttl_s` (default 3600s), and a server restart clears
all of them. Fetch the result with `job_result` before then. If you need the run to outlive
a restart, that is what durable persistence is for.

## Durable runs (a separate thing)

`persist=true` on `delegate`, `consensus`, or `debate` writes a replayable job to disk under
`jobs_dir` (a `state.json` plus answer / diff / transcript artifacts). A durable job survives a
server restart, where an async-only job does not. The two are independent: a run can be sync
and durable, async and ephemeral, or both async and durable.

```
consensus(
  prompt="where is the deadlock in queue.py?",
  persist=true
)
```

`default_persistence` in `config.toml` sets the default (`ephemeral` keeps nothing unless a
call passes `persist=true`; `job` persists every run unless a call passes `persist=false`).
See `configure-defaults` to change it.

## Continue a durable job

`continue_job(job_id, prompt)` resumes or builds on a completed durable job with a new
direction:

- a `delegate` job resumes its agent session,
- a `consensus` panel resumes each voice and re-aggregates,
- a `debate` argues `rounds` more rounds.

The continuation is a fresh child run linked to the parent (`continued_from`); the parent is
never mutated. The trust gate is re-applied and defaults to `read_only`, so a continuation
that needs to write must opt in again (`safety_mode="write"` plus a trusted workspace — see
`safe-write-delegation`).

```
continue_job(
  job_id="<parent durable job id>",
  prompt="now factor the chosen approach into a migration checklist"
)
```

## analyze: offline report over kept runs

`analyze(report="historical_agreement")` scans the consensus panels you kept and reports how
often two distinct model lineages reached the same verdict when they co-voted. It is an
observational signal for your roster choice, not a vote discount applied to any live panel. An
empty corpus returns an empty report.

```
analyze(report="historical_agreement")
```

## Worked example: long async debate

1. Kick it off in the background:

   ```
   debate(
     prompt="design the retry policy for the payments worker; argue tradeoffs and converge",
     targets=["codex", "claude_code", "gemini"],
     rounds=3,
     mode="async"
   )
   -> { "job_id": "JOB123", "status": "running", "tool": "debate" }
   ```

2. Go do other work. To check on it, list everything or look at just what's in flight:

   ```
   list_jobs()
   activity()         -> JOB123 still running, elapsed 00:02:14
   ```

3. When `job_status(job_id="JOB123")` reports it finished, read the transcript:

   ```
   job_result(job_id="JOB123")
   ```

   Read it before `job_ttl_s` (default 3600s) elapses or before a restart, since the job is
   in-memory. If you wanted it to survive a restart, you would have passed `persist=true`,
   then later picked it back up with `continue_job`.
