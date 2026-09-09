# Contributing

Thanks for helping improve the Rutherford Kiro Crew app.

## Validate before you push

```sh
node scripts/validate-app.mjs
```

It checks `app.json` (name, semver `version`, `displayName`, description, that every declared agent and
skill exists on disk, and that a well-formed `rutherford` MCP server is declared and granted to the
orchestrator app-namespaced as `@rutherford:rutherford`) and the frontmatter of every skill and agent —
including that each skill's `name` matches its folder. CI runs the same script on every push and pull
request.

## Test it locally

Install your working copy as a Kiro Crew app, grant it trust, then enable it:

```sh
kirocrew app install /path/to/rutherford-kiro-crew-app
# add "rutherford" to agent.apps_trusted in ~/.kiro/crew/config.json (or trust it in the dashboard Settings)
kirocrew app enable rutherford
```

The trust grant is required: Kiro Crew gates a third-party app's agent and MCP server, so without it
`enable` registers nothing executable. Once enabled, select the `rutherford-orchestrator` agent and run
`doctor` to confirm the MCP server registered and at least one agent drives. Editing a skill takes effect
after the app reloads; manifest, agent, and MCP changes need a re-enable (`kirocrew app disable rutherford`
then `kirocrew app enable rutherford`).

## Conventions

- A skill body is an instruction set for Claude, not documentation for a human reader. Make the
  `description` a concrete trigger.
- Refer to Rutherford's MCP tools by plain name; do not hardcode an `mcp__...` tool id or add an
  `allowed-tools` frontmatter key.
- Keep every tool name and argument in step with [`reference/tools.md`](reference/tools.md), the source
  of truth the skills cite. If the server changes a tool, update the reference first.
- Reference bundled docs from a skill with `~/.kiro/crew/apps/rutherford/...`, the path an installed app
  unpacks to.
- Writing style: direct and specific, no AI tropes (no "not X, it's Y" reframes, no bold-first bullets,
  sparing em dashes), straight quotes, ASCII arrows.

## Changes and releases

Commit to the default branch. The version for the Kiro Crew surface lives in `app.json` — the sole
version source of truth, validated by `scripts/validate-app.mjs`. Add a dated entry to
[`CHANGELOG.md`](CHANGELOG.md) and tag a release `vX.Y.Z`.

For the orchestration engine itself (tools, agents, safety model), open issues and PRs against
[rutherford-mcp-server](https://github.com/chapmanjw/rutherford-mcp-server).
