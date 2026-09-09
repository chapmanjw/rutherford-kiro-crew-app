# Security

## Reporting a vulnerability

Report a suspected vulnerability privately through this repository's GitHub security advisories, or open
an issue that describes the problem without disclosing exploit detail. Please do not post a working
exploit publicly before a fix is available.

## Trust model

What this plugin does on install:

- It registers one local stdio MCP server, launched with `uvx rutherford-mcp-server`, which fetches the
  published package from PyPI and runs it on your machine. There are no bundled binaries and no embedded
  secrets.
- The server reuses each coding agent's own login and never calls a model provider's API directly. The
  only outbound network traffic is whatever those agents already make under your accounts.
- The plugin and the server emit no telemetry.

Safety defaults you should know:

- Every delegation runs `read_only` by default. The `write` and `yolo` modes are explicit opt-in and
  require a trusted workspace — the target directory must be on the `trusted_workspaces` allowlist, or
  the call must pass `trust_workspace=true`. The deliberation tools (`consensus`, `debate`, `review`,
  `plan`) cannot write at all.
- `write` / `yolo` / `propose` runs execute the agent in an isolated git-worktree sandbox. This is
  containment for an honest agent, not an OS-level jail: an agent that shells out can still reach the
  wider filesystem. See [`reference/safety.md`](reference/safety.md).
- Project-scoped Rutherford config (`config.toml`, `acp.json`) can set an agent's launch command and
  subprocess environment, so it is trusted as code. Only run Rutherford in a workspace you trust.

For the orchestration engine's own security policy, see the
[rutherford-mcp-server](https://github.com/chapmanjw/rutherford-mcp-server) repository.
