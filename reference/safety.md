# Safety model

Rutherford is the permission authority at the moment of each ACP tool call. It answers an agent's
filesystem-write, terminal-execution, and tool-permission requests according to the safety mode of the
delegation. The default is the most restrictive mode, and the modes that can change your files are
explicit opt-in behind a trusted-workspace gate.

## The four modes

| Mode | Meaning |
| --- | --- |
| `read_only` (default) | Inspect only. Reads are served; writes, terminal execution, and tool-permission requests are denied. |
| `propose` | Same denials as `read_only` — the agent may describe changes (e.g. a diff) but not apply them. Its edits land in a disposable sandbox and are discarded. |
| `write` | The agent may modify the workspace, subject to the agent's own approvals. |
| `yolo` | The agent may act without approval prompts (the agent's bypass mode). |

A call that omits `safety_mode` adopts the configured `default_safety_mode` (`read_only` out of the
box). An explicit value always wins.

`read_only` and `propose` are non-mutating, so they need no trust check. `write` and `yolo` are mutating
and gated.

## The trust gate

`write` and `yolo` require a trusted workspace. The target `working_dir` must either be on the
configured `trusted_workspaces` allowlist, or the call must pass `trust_workspace=true`. Without one of
those, a mutating call is refused before any agent runs. This means an agent cannot modify a directory
by accident — granting write access is always a deliberate act.

Set a durable allowlist in `config.toml`:

```toml
trusted_workspaces = [
    "/home/you/projects/myapp",
    "C:\\Users\\you\\work\\myrepo",
]
```

Or grant trust for a single call with `trust_workspace=true`.

## The sandbox

`write`, `yolo`, and `propose` runs do not execute in your working directory directly. Rutherford runs
the agent inside an isolated git-worktree sandbox built off `HEAD`:

- For `write` / `yolo`, the agent mutates the sandbox; the resulting diff is reviewed and applied back.
- For `propose`, the agent mutates the sandbox; the diff is captured and the sandbox is discarded, so
  nothing reaches your tree.

`read_only` runs directly in the working directory — there is nothing to isolate.

Two documented limits of the sandbox: it is not an OS-level jail (an agent that shells out can still
reach the wider filesystem), and applying the reviewed diff back is subject to a small
time-of-check/time-of-use window. Treat the sandbox as containment for honest agents, not as a
security boundary against a hostile one.

## Why deliberation modes refuse to write

`consensus`, `debate`, `review`, and `plan` are read-only by construction and refuse a mutating
`safety_mode`:

- For `consensus` / `review`, there is no coherent way to merge edits from several agents into one tree.
- For `debate`, the voices run on persistent sessions in the working directory with no per-turn sandbox.

Route any write or propose work through `delegate` — a single agent isolated in a worktree sandbox.

## The read-only verifier (opt-in)

`verify_read_only` (off by default) adds a backstop for `read_only` delegations whose `working_dir` is a
git repo: Rutherford fingerprints the tree (status plus the staged and unstaged diffs) before and after
the turn and fails the result with `READONLY_VIOLATED` if it changed. This catches an agent that touched
the disk out of band — through its own OS process, outside the ACP file callbacks. It costs two git
reads per delegation, which is why it is opt-in. It is a no-op for a non-git `working_dir`.

## Config discovery is trusted as code

Project-scoped config can set an agent's launch `command` and subprocess `env`, so it is trusted as
code. Discovery keys off the process working directory: only start Rutherford in a workspace you trust.
The trust gate covers write/yolo delegations; it does not cover config discovery.
