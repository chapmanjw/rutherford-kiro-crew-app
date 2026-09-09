# Contributing

Thanks for helping improve the Rutherford Claude plugin.

## Validate before you push

```sh
node scripts/validate-plugin.mjs
```

It checks the plugin and marketplace manifests, the bundled `.mcp.json`, and the frontmatter of every
skill, agent, and command — including that each skill's `name` matches its folder and that the two
manifest versions stay in lockstep. CI runs the same script on every push and pull request.

## Test it locally

Add your working copy as a marketplace and install from it:

```
/plugin marketplace add /path/to/rutherford-claude-plugin
/plugin install rutherford@rutherford-claude
```

Restart Claude Code, then run `/rutherford:doctor` to confirm the server registered and at least one
agent drives. Editing a skill or command takes effect after the plugin reloads.

## Conventions

- A skill body is an instruction set for Claude, not documentation for a human reader. Make the
  `description` a concrete trigger.
- Refer to Rutherford's MCP tools by plain name; do not hardcode an `mcp__...` tool id or add an
  `allowed-tools` frontmatter key.
- Keep every tool name and argument in step with [`reference/tools.md`](reference/tools.md), the source
  of truth the skills cite. If the server changes a tool, update the reference first.
- Reference bundled files with `${CLAUDE_PLUGIN_ROOT}/...`.
- Writing style: direct and specific, no AI tropes (no "not X, it's Y" reframes, no bold-first bullets,
  sparing em dashes), straight quotes, ASCII arrows.

## Changes and releases

This repo follows a simple flow: commit to the default branch, keep `plugin.json` and `marketplace.json`
versions in lockstep, and add a dated entry to [`CHANGELOG.md`](CHANGELOG.md). Tag a release `vX.Y.Z`.

For the orchestration engine itself (tools, agents, safety model), open issues and PRs against
[rutherford-mcp-server](https://github.com/chapmanjw/rutherford-mcp-server).
