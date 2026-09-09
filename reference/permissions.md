# Permissions

This plugin cannot grant Claude Code permissions on its own. A plugin ships skills, an agent, commands,
and the MCP server config; the permission allowlist lives in the user's `settings.json`, which only the
user (or Claude, with the user's confirmation) can write. So "setting up permissions" means writing a
small allowlist into the user's settings, which the `configure-permissions` skill does interactively.

## Two gates, and why allowlisting does not weaken safety

A Rutherford operation passes through two independent gates:

1. **Claude Code's tool permissions** — whether Claude may run a file tool (`Read` / `Edit` / `Write`)
   or call an MCP tool at all, before it runs. This is what the allowlist below relaxes.
2. **Rutherford's own safety model** — inside the server, every delegation is `read_only` by default,
   and `write` / `yolo` need a trusted workspace (`trusted_workspaces` or `trust_workspace=true`). See
   [safety.md](safety.md).

Allowlisting a Rutherford tool at gate 1 does not touch gate 2. A `delegate` whose call is allowlisted
still cannot write to a directory unless that directory is trusted inside Rutherford. So allowlisting the
tool removes a redundant prompt; it does not let an agent edit files it could not already reach.

## Who writes the .rutherford directories

This matters, because the two writers hit different gates.

- **The Rutherford MCP server writes** `config.toml` (via `setup` / `discover`), durable jobs (under
  `jobs_dir`), and the `discover` registry cache (`acp-registry.json`). These writes are done by the
  server *process*, which has normal OS file access. They are **not** subject to Claude Code's file
  sandbox — the only gate is approving the MCP tool call. They work in every scope (home, global,
  project) once the tool is approved or allowlisted.
- **Claude writes** `panels.toon` and role files, and sometimes hand-edits `config.toml`. There is no
  MCP tool that writes a panel or a role (`reload_panels` only reads), so the skills have Claude edit
  those with `Write` / `Edit`. These **are** gated by Claude Code's file permissions. The project
  `<cwd>/.rutherford/` is inside the workspace (a normal prompt); the home `~/.rutherford/` is outside
  it (a stricter prompt), which is the main reason to set an allowlist.

## The recommended allowlist

Two parts: file access to the `.rutherford` directories, and the config/inspection Rutherford tools.

### File access to .rutherford (home and project)

Claude Code permission paths are gitignore-style with these anchors:

| Anchor | Means | Example |
| --- | --- | --- |
| `path` or `./path` | the current working directory | `Edit(.rutherford/**)` |
| `/path` | the project root | `Edit(/.rutherford/**)` |
| `~/path` | the home directory | `Edit(~/.rutherford/**)` |
| `//path` | an absolute filesystem path | `Edit(//c/Users/you/.rutherford/**)` |

`Edit(...)` also grants read on the same path, and `Write(...)` covers creating a new file. The rules:

```json
{
  "permissions": {
    "allow": [
      "Read(.rutherford/**)",
      "Edit(.rutherford/**)",
      "Write(.rutherford/**)",
      "Read(~/.rutherford/**)",
      "Edit(~/.rutherford/**)",
      "Write(~/.rutherford/**)"
    ]
  }
}
```

The project rules use the cwd anchor (`.rutherford/**`), which matches where Rutherford discovers a
project's `panels.toon`, roles, and config. The home rules cover the per-user `~/.rutherford/` store.

The global `config.toml` (`%APPDATA%\rutherford\` on Windows, `~/.config/rutherford/` elsewhere) is
normally written by the `setup` tool server-side, so Claude rarely hand-edits it and it usually needs no
file rule. Add one for that platform path only if you edit the global config by hand.

### The Rutherford MCP tools

Allowlist the config and inspection tools so the setup, panels, and discovery flows stop prompting.
**Verify the exact tool prefix first** (see below) — it is `mcp__rutherford__<tool>` for a hand-registered
server, but a plugin install may namespace it differently. Once you know the prefix, allow the safe set:

```json
{
  "permissions": {
    "allow": [
      "mcp__rutherford__setup",
      "mcp__rutherford__discover",
      "mcp__rutherford__reload_panels",
      "mcp__rutherford__capabilities",
      "mcp__rutherford__doctor",
      "mcp__rutherford__list_roles",
      "mcp__rutherford__list_jobs",
      "mcp__rutherford__activity",
      "mcp__rutherford__job_status",
      "mcp__rutherford__job_result",
      "mcp__rutherford__analyze"
    ]
  }
}
```

This list deliberately leaves out `delegate`, `consensus`, `debate`, `review`, `plan`, `continue_job`,
and `cancel_job` — they spawn agents and spend tokens, so a prompt before each run is usually wanted. To
remove every Rutherford prompt, allow the whole server instead with `"mcp__rutherford"` (or
`"mcp__rutherford__*"`). Rutherford's write gate (gate 2) still applies either way.

## Find the real MCP tool prefix

The permission rule must use the tool's canonical name, and a plugin-provided server can be namespaced
differently from a hand-registered one. To find the real prefix:

- Run `/mcp` in the client and read the Rutherford server's tool names, or
- Look at the names of the Rutherford tools already available in the session — they appear as
  `mcp__<prefix>__delegate`, `mcp__<prefix>__doctor`, and so on.

Use that `<prefix>` in the rules above. A permission rule with a wrong name is ignored (with a startup
warning), so matching the canonical name is what makes the allowlist take effect.

## Where to write the rules

| File | Scope | Use it for |
| --- | --- | --- |
| `.claude/settings.local.json` | this project, not committed | the recommended default — project `.rutherford` + the tools, kept local |
| `.claude/settings.json` | this project, shared | a team that wants the allowlist committed |
| `~/.claude/settings.json` | every project for this user | the home `~/.rutherford/` rules and machine-wide tool allowlisting |

`settings.local.json` is intended to stay uncommitted; add it to `.gitignore` if it is not already. The
home `~/.rutherford/**` rules belong in the user settings, since they apply across projects.

The permissions block is `{"permissions": {"allow": [...], "deny": [...], "ask": [...]}}`. Merge new
entries into the existing `allow` array rather than replacing it. A `deny` rule always wins over an
`allow`, at any scope. Claude Code reloads settings without a restart.

There is no `claude` CLI subcommand to add a permission; edit the JSON file directly (or use the
interactive `/permissions` view to inspect the result).
