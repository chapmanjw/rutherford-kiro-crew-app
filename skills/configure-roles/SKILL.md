---
name: configure-roles
description: >-
  Author or override Rutherford role personas (reusable system prompts) under a role_dirs or
  .rutherford/roles directory, and apply the restart needed for roles to load. Use when the user
  wants a custom reviewer, architect, or other persona, or to add or edit a Rutherford role.
---

# Configure roles

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

## When to use

The user wants a custom persona for Rutherford calls (a reviewer with a house standard, an architect tuned to their stack, a domain explainer), or wants to edit one that already exists. A role is a markdown file you author once and then reference by id.

If the user instead wants a reusable crew (a set of seats plus an aggregation strategy), that is a panel, not a role -> see configure-panels. Roles and panels compose: a panel seat can carry a `role`.

## What a role is

A role is a named persona. Its markdown body is prepended to the prompt as a system prompt before the agent runs. You apply it by passing `role="<id>"` to `delegate`, `consensus`, or `debate`, or as a per-seat `role` key inside a panel.

```
delegate(cli="claude_code", prompt="Review the change in the provided files.", role="principal-reviewer", files=["src/db/pool.py"])
consensus(prompt="Where is the deadlock in queue.py?", targets=["codex", "claude_code"], role="debugger")
```

`review` already runs under the `principal-reviewer` persona and `plan` under `architect`, so you rarely set `role` on those two.

## File format

A role file is markdown with a small frontmatter block, then the body. The body is the system prompt verbatim.

```markdown
---
name: principal-reviewer
display_name: Principal Reviewer
description: Senior/Principal-bar code review with a cross-review debate protocol that drives a panel to consensus.
---

You are reviewing code at the bar of a Senior or Principal Software Engineer...
(the rest of the body is the system prompt the agent receives)
```

Frontmatter keys: `name` (the id; kebab-case, must match how callers reference it), `description`, and the optional `display_name`. Everything after the frontmatter is the prompt text. The shipped `${CLAUDE_PLUGIN_ROOT}/examples/roles/principal-reviewer.md` is the model to copy from — it shows the depth and structure a strong role carries (priority-ordered inspection dimensions, an output format, a cross-review protocol).

## Where roles live and which one wins

Rutherford collects role files from:

- each directory in `role_dirs` from config (set `role_dirs = ["/abs/path/to/roles"]` in `config.toml`, or the `RUTHERFORD_ROLE_DIRS` env override, path-separator delimited),
- `~/.rutherford/roles/` (the global, per-user store),
- `<cwd>/.rutherford/roles/` (the project being worked in).

A file whose id matches a built-in overrides that built-in. The five built-ins: `principal-reviewer`, `architect`, `debugger`, `security-reviewer`, `explainer`. To retune one, drop a file with the same `name` into one of the directories above and edit its body. `list_roles` enumerates the full catalog and reports each role's source (`builtin` or `user`).

## The key caveat: roles do not hot-reload

Rutherford loads roles once, at server start. There is no `reload_roles` tool (panels hot-reload via `reload_panels`; roles do not). After you add or edit a role file, the running server still has the old catalog.

To apply a role change:

1. Write or edit the role file.
2. Restart the Rutherford server — reconnect it from your client (disconnect and reconnect the MCP server).
3. Confirm it loaded with `list_roles`. The new or edited role should appear, with source `user` for a custom one.

A call or panel that references a role the running server has not loaded fails with `UNKNOWN_ROLE`. If you hit that error after adding a role, the cause is almost always a missed restart (or an id typo — check it against `list_roles`).

## Worked example: add a custom reviewer

1. Copy the shipped example into your per-user roles directory:

```
mkdir -p ~/.rutherford/roles
cp ${CLAUDE_PLUGIN_ROOT}/examples/roles/principal-reviewer.md ~/.rutherford/roles/house-reviewer.md
```

2. Edit `~/.rutherford/roles/house-reviewer.md`: set `name: house-reviewer` in the frontmatter (the id must match the filename intent and how you will call it), then adjust the body to your house standard.

3. Restart the Rutherford server (reconnect the MCP server from your client).

4. Confirm:

```
list_roles()
```

`house-reviewer` should be listed with source `user`.

5. Use it — directly, or as a panel seat (see configure-panels):

```
consensus(prompt="Review the change in the provided files.", targets=[{"cli": "claude_code", "model": "opus", "role": "house-reviewer"}, {"cli": "codex", "model": "gpt-5.5", "role": "house-reviewer"}], files=["src/x.py"])
```

If you wired the role into a saved panel's seat, that panel will fail with `UNKNOWN_ROLE` until the server is restarted, the same caveat as a direct call.

## Gotchas

- No hot-reload. Every role add or edit needs a server restart before it takes effect. This is the single most common mistake.
- `UNKNOWN_ROLE` after adding a role almost always means you skipped the restart, or the id you passed does not match the file's `name`. Check `list_roles`.
- An id that matches a built-in silently overrides it. Pick a distinct id (like `house-reviewer`) unless you intend to replace a built-in.
- A role only changes the system prompt. It does not grant write access — safety mode is governed separately (see configure-defaults). A role passed to `consensus`, `debate`, `review`, or `plan` runs read-only regardless of the persona's wording.
