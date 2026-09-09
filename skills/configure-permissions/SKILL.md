---
name: configure-permissions
description: >-
  Set up Claude Code permissions so Rutherford's skills and tools stop prompting: allowlist the
  Rutherford MCP tools and read/write access to the .rutherford directories (project and home) in
  settings.json. Use during setup, or when the user is tired of approving every Rutherford config edit
  or tool call.
---

# Configure Rutherford permissions

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

This plugin cannot grant permissions on its own. This skill writes a small allowlist into the user's
Claude Code `settings.json` so the Rutherford flows stop prompting. Do it with the user's confirmation,
showing exactly what you will add.

Ground truth, including the path-anchor table and the safe-tool list, is in
`${CLAUDE_PLUGIN_ROOT}/reference/permissions.md`. Read it before editing settings.

## What the allowlist covers, and what it does not

Two parts:

1. File access (`Read` / `Edit` / `Write`) to the `.rutherford` directories — project (`<cwd>/.rutherford`)
   and home (`~/.rutherford`) — so Claude can write `panels.toon` and role files without a prompt each time.
   The home directory is outside the workspace, so without a rule those edits prompt harder.
2. The Rutherford config and inspection MCP tools (`setup`, `discover`, `reload_panels`, `capabilities`,
   `doctor`, `list_roles`, and the jobs/`analyze` readers), so the setup and panel flows run smoothly.

It deliberately does NOT auto-approve `delegate`, `consensus`, `debate`, `review`, `plan`, `continue_job`,
or `cancel_job` by default — those spawn agents and spend tokens, so a prompt before each is usually
wanted. Offer the all-tools option only if the user asks for zero prompts.

Allowlisting a tool does not weaken Rutherford's own safety: a `write` delegation still needs a trusted
workspace inside Rutherford regardless of the Claude Code allowlist. See
`${CLAUDE_PLUGIN_ROOT}/reference/safety.md`.

## Step 1: find the real MCP tool prefix

The permission rule must use the tool's canonical name, and a plugin-provided server can be namespaced
differently from a hand-registered one. Determine the actual prefix before writing rules:

- Look at the Rutherford tools already available in this session. They appear as `mcp__<prefix>__doctor`,
  `mcp__<prefix>__delegate`, and so on. Take `<prefix>` from those names.
- If you cannot see them, ask the user to run `/mcp` and report the Rutherford server's tool names.

Use that exact `<prefix>` in the rules. For a hand-registered server it is `rutherford`
(`mcp__rutherford__doctor`); a plugin install may differ. A rule with the wrong name is silently ignored,
so this step is what makes the allowlist actually work.

## Step 2: pick the scope

Ask the user which settings file to write, and default to the project-local one:

- `.claude/settings.local.json` (recommended) — applies to this project only and is meant to stay
  uncommitted. Best for the project `.rutherford` rules and the tool allowlist.
- `~/.claude/settings.json` — applies to every project for this user. Put the home `~/.rutherford/**`
  file rules here, since they are user-wide, and use it if the user wants the allowlist machine-wide.
- `.claude/settings.json` — shared/committed project settings, for a team that wants the allowlist in
  version control.

A reasonable split: project tool rules and project `.rutherford` rules in `.claude/settings.local.json`;
the home `~/.rutherford/**` rules in `~/.claude/settings.json`. Offer that, or write everything to one
file if the user prefers simplicity.

If you write `.claude/settings.local.json`, make sure it is gitignored (add `.claude/settings.local.json`
to `.gitignore` if it is not already).

## Step 3: propose, then merge

Show the user the exact block you will add, then merge it into the target file. Do not overwrite the file:
read the existing JSON, append your entries to `permissions.allow` (creating the structure if absent),
de-duplicate, and write it back. A `deny` rule anywhere always wins over an `allow`, so never add a rule
that a deny would silently cancel without telling the user.

The recommended block (substitute the real `<prefix>` from step 1):

```json
{
  "permissions": {
    "allow": [
      "Read(.rutherford/**)",
      "Edit(.rutherford/**)",
      "Write(.rutherford/**)",
      "Read(~/.rutherford/**)",
      "Edit(~/.rutherford/**)",
      "Write(~/.rutherford/**)",
      "mcp__<prefix>__setup",
      "mcp__<prefix>__discover",
      "mcp__<prefix>__reload_panels",
      "mcp__<prefix>__capabilities",
      "mcp__<prefix>__doctor",
      "mcp__<prefix>__list_roles",
      "mcp__<prefix>__list_jobs",
      "mcp__<prefix>__activity",
      "mcp__<prefix>__job_status",
      "mcp__<prefix>__job_result",
      "mcp__<prefix>__analyze"
    ]
  }
}
```

To remove every Rutherford prompt instead (the user asked for zero prompts), replace the eleven
`mcp__<prefix>__<tool>` lines with a single `"mcp__<prefix>"`. Rutherford's write gate still applies.

Path-anchor reminder (from the reference): a bare `path` is the current working directory, `/path` the
project root, `~/path` the home directory, `//path` an absolute filesystem path.

## Step 4: confirm it took

Claude Code reloads settings without a restart. Confirm by re-running the flow that was prompting (for
example call `reload_panels` or `doctor`); it should run without an approval prompt. The user can inspect
the result with `/permissions`.

If a tool still prompts, the most likely cause is a wrong `<prefix>` in the rule (re-check step 1 against
`/mcp`), or a `deny`/`ask` rule at a higher-precedence scope overriding the allow.

## Related skills

- `setup-rutherford` runs this as its permissions step during first-time setup.
- `configure-panels` and `configure-roles` are the skills whose `.rutherford` file edits this unblocks.
- `safe-write-delegation` covers Rutherford's own write gate, which is separate from this allowlist.
