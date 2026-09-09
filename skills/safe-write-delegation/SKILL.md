---
name: safe-write-delegation
description: >-
  Let a coding agent actually edit code through Rutherford in write or yolo mode, behind the trusted-workspace gate and the git-worktree sandbox. Use when the user wants an agent to apply a fix, make changes, or implement something, not just read.
---

# Safe write delegation

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

`delegate` is the one path that edits code. When the user wants an agent to apply a fix, make a
change, or implement something rather than just inspect or plan, route it through `delegate` with a
mutating `safety_mode`. Read `${CLAUDE_PLUGIN_ROOT}/reference/safety.md` and
`${CLAUDE_PLUGIN_ROOT}/reference/tools.md` for the authoritative argument list.

## When to use

- The user asks an agent to fix a bug, add a feature, refactor, write a test, or otherwise change
  files on disk.
- Not for inspection or design: a `read_only` delegation, or `plan` / `review`, handles those. See the
  configure-defaults skill for how the default mode is set.

## The four modes

Pass one via `safety_mode`:

- `read_only` (default) — inspect only; writes, terminal execution, and tool-permission requests are
  denied.
- `propose` — same denials as `read_only`; the agent's edits land in a disposable sandbox and are
  discarded, so you get a proposed diff and nothing reaches the tree.
- `write` — the agent may modify the workspace, subject to its own approval prompts.
- `yolo` — the agent acts without approval prompts (its bypass mode).

`write` and `yolo` are the mutating modes (`is_mutating`). `read_only` and `propose` are not.

## The gate: write and yolo need a trusted workspace

A mutating call is refused before any agent runs unless the target `working_dir` is trusted. Either:

- the `working_dir` is on the configured `trusted_workspaces` allowlist, or
- the call passes `trust_workspace=true`.

Without one of those, `write` / `yolo` is refused up front, so an agent cannot change a directory by
accident. Granting write is always a deliberate act. For the durable allowlist, see the
configure-defaults skill.

## The sandbox

`write`, `yolo`, and `propose` runs do not touch the working directory directly. Rutherford runs the
agent inside an isolated git-worktree off `HEAD`:

- For `write` / `yolo`, the agent mutates the worktree; the resulting diff is reviewed and applied back
  to your tree.
- For `propose`, the agent mutates the worktree; the diff is captured and the worktree is discarded.

`read_only` runs directly in the working directory, since there is nothing to isolate.

Two honest limits. The sandbox is not an OS-level jail: an agent that shells out can still reach the
wider filesystem. And applying the reviewed diff back has a small time-of-check/time-of-use window.
Treat it as containment for honest agents, not a boundary against a hostile one.

## The read-only verifier (opt-in backstop)

`verify_read_only` (off by default, config) fails a `read_only` delegation with `READONLY_VIOLATED` if
the agent mutated its git tree out of band — through its own OS process, outside the ACP file
callbacks. It costs two git reads per delegation, which is why it is opt-in, and it is a no-op for a
non-git `working_dir`.

## Why only delegate writes

`consensus`, `debate`, `review`, and `plan` are read-only by construction and refuse a mutating
`safety_mode`. There is no coherent way to merge edits from several agents into one tree, and `debate`
runs its voices on persistent sessions with no per-turn sandbox. Route any write or propose work
through a single `delegate`.

## Worked example

```
delegate(
  cli="codex",
  prompt="add the missing null check and a covering test",
  working_dir="C:/work/myrepo",
  safety_mode="write",
  trust_workspace=true,
)
```

A `write` / `yolo` delegation never falls back to another agent. If the primary fails, the call fails;
it does not silently hand your write task to a different CLI.
