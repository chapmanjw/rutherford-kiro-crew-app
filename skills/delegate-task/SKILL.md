---
name: delegate-task
description: >-
  Hand one task to one coding agent through Rutherford and get a normalized result — read-only by default, with files in scope, a chosen model, an effort tier, a role, or a resumed session. Use when the user wants a single agent (Codex, Claude Code, Cursor, and so on) to read, explain, or analyze something.
---

# Delegate one task to one agent

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

Use this when the user wants exactly one coding agent to read, explain, or analyze
something. One agent, one prompt, one normalized result.

For ground-truth argument names and defaults, read `${CLAUDE_PLUGIN_ROOT}/reference/tools.md`
(the `delegate` section) and `${CLAUDE_PLUGIN_ROOT}/reference/safety.md`.

## The minimal call

```
delegate(cli="codex", prompt="explain src/auth/session.py")
```

`cli` is an agent id. Run `capabilities` for the roster on this machine, or `doctor` to
see which agents are actually installed and signed in. The result carries the answer, the
timing, the token cost where the agent reports it, and the ACP `session_id` you can resume
later.

## Read-only by default

A delegate inspects; it does not edit your files. With `safety_mode` omitted, the call uses
the configured `default_safety_mode`, which is `read_only` out of the box: reads are served,
writes and terminal execution are denied. To let an agent modify code you opt into `write`
or `yolo` behind a trusted workspace — that path lives in the `safe-write-delegation` skill,
not here.

## Useful arguments

Pass only what the task needs; every non-required argument has a default.

- `model` picks a specific model for the agent. Example:
  `delegate(cli="codex", model="gpt-5.5", prompt="summarize this module")`. Without it the
  agent's default model runs.
- `files` puts paths in scope so the agent can read them. Example:
  `delegate(cli="claude_code", prompt="explain the retry logic", files=["src/net/retry.py"])`.
- `working_dir` sets the directory the agent runs in (where relative paths resolve). A
  `read_only` delegate runs directly there.
- `role` prepends a persona's system prompt. Run `list_roles` for the catalog, or see the
  `configure-roles` skill. Example:
  `delegate(cli="codex", prompt="explain this parser", role="explainer", files=["src/parse.py"])`.
- `effort` is `low` | `medium` | `high` | `xhigh`, asking the agent to spend more reasoning
  where it has a knob (a reported no-op for an agent with none). Example:
  `delegate(cli="codex", prompt="trace this race condition", effort="high")`.
- `session_id` resumes an earlier delegate's session for a follow-up turn. Pass the
  `session_id` from a prior result and the agent reloads that conversation instead of
  starting fresh. An agent that does not persist its own sessions fails `RESUME_FAILED`.
- `fallback` is an ordered list of alternate targets, tried only when the primary fails on a
  re-execution-safe spawn or handshake failure (one that never ran the prompt). A write/yolo
  delegation never falls back. Example:
  `delegate(cli="codex", prompt="...", fallback=["claude_code", "gemini"])`.
- `allow_model_fallback` (default true) retries the same agent on its configured fallback
  model when the requested model is unavailable.

## Async for a long task

`mode="async"` returns a `job_id` instead of awaiting the answer, so a long delegation runs
in the background:

```
delegate(cli="codex", prompt="audit the whole package for unchecked errors", mode="async")
```

Poll and collect it with the tools in the `background-jobs` skill (`job_status`,
`job_result`, `activity`).

## Worked examples

Explain a file, read-only, naming the path in the prompt:

```
delegate(cli="claude_code", prompt="explain what src/queue.py does and where it could deadlock")
```

The same idea with the path passed via `files` instead of in the prose (both work; `files`
is cleaner when the path is long or there are several):

```
delegate(cli="claude_code", prompt="explain what this module does and where it could deadlock", files=["src/queue.py"])
```

Review two files for leaked secrets, read-only, under the security persona:

```
delegate(cli="codex", prompt="check these files for hardcoded credentials or tokens", role="security-reviewer", files=["src/config.py", "src/auth/client.py"])
```

Ask a named model to summarize, with extra reasoning budget:

```
delegate(cli="codex", model="gpt-5.5", prompt="summarize the public API of this file for a new contributor", files=["src/api/handlers.py"], effort="high")
```

## When to reach for another skill

- Several opinions on the same question -> `multi-agent-consensus`.
- Argue a tradeoff across rounds -> `agent-debate`.
- Actually edit code, not just inspect it -> `safe-write-delegation`.
- An implementation plan rather than the implementation -> the `plan` tool (a read-only
  delegate under the architect persona).
- Resume a finished durable job with a new direction -> `continue_job`.
