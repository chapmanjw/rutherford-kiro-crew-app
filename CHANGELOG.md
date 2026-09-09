# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.4] - 2026-06-25

### Added

- **Bedrock / Vertex / enterprise-wrapper troubleshooting for `claude_code`.** The `troubleshoot-connection`
  skill gains a `model_unavailable` section for the `400 The provided model identifier is invalid` failure on
  AWS Bedrock, Google Vertex, or an enterprise wrapper (Amazon Toolbox), with the per-agent
  `[agents.claude_code.env]` fix that survives a wrapper rewriting `settings.json`. `reference/config.md`
  documents `[agents.<id>.env]` as a first-class block with the Bedrock example, and the `setup-rutherford`
  skill plus the `/rutherford:doctor` command note the `model_unavailable` state and its `remediation_hint`.

## [0.2.3] - 2026-06-16

### Added

- A `SessionStart` hook (in `hooks/hooks.json`, handled by `hooks/persona.mjs`) shows the Rutherford
  banner to the user at launch. It reads the hook input on stdin and self-gates: it fires only on a
  fresh `source: startup` with `agent_type` naming the orchestrator, returning the banner as a
  `systemMessage`. It stays silent for every other agent and for `resume`, `/clear`, and automatic
  compaction, so it banners once at launch and never re-fires mid-session. New `hooks/persona-session.md`
  holds the banner text.

### Fixed

- The launch banner now actually surfaces for the plugin-shipped `rutherford-orchestrator` agent. Claude
  Code does not honor `initialPrompt` on plugin agents (the field sits outside the plugin-agent
  frontmatter allowlist), so the auto-greet documented in 0.2.1 never fired; the `SessionStart` hook is
  the bundled replacement. The `initialPrompt: Hello` frontmatter is kept as a no-op marker of intent for
  the day the allowlist widens. `CLAUDE.md` is corrected to describe this.

## [0.2.2] - 2026-06-15

### Changed

- The `rutherford-orchestrator` agent's `color` is now `yellow` (was `cyan`), and the inline comment
  documenting the `initialPrompt: Hello` auto-greet is dropped from its frontmatter (the behavior is
  still documented in `CLAUDE.md`).

## [0.2.1] - 2026-06-15

### Added

- The `rutherford-orchestrator` agent sets `initialPrompt: Hello`, so a bare
  `claude --agent rutherford:rutherford-orchestrator` launch (no prompt in the command) auto-submits
  "Hello" and opens on the crew menu.
- An "Opening a session" section in the agent body: it leads with the banner and crew menu on a
  greeting-only first turn, and routes immediately when the first turn already carries a task (so the
  prepended `Hello` does not derail routing).
- README documents running a whole Claude session as the orchestrator with the `--agent` flag, as a
  getting-started step after install (both in the install block and the Agent section).

### Changed

- `CLAUDE.md` persona section now documents the `--agent` launch behavior (`initialPrompt` auto-greet and
  `color`), and notes that headless `claude -p` needs an explicit prompt and is not a valid way to test
  it.

## [0.2.0] - 2026-06-15

### Added

- A `PostToolUse` hook (`hooks/hooks.json` + `hooks/persona.mjs`) that injects the Sam Rutherford
  persona next to the result of any Rutherford MCP tool call. This is what makes the voice and the ASCII
  banner show up on a bare tool call, where no skill or slash command text loads. The regex matcher
  `mcp__.*rutherford.*` catches both the hand-registered (`mcp__rutherford__*`) and plugin-bundled
  (`mcp__plugin_rutherford_rutherford__*`) tool names.
- A `UserPromptSubmit` hook (the same `hooks/persona.mjs`, run in its prompt mode) that injects a
  self-gating note on every prompt: be Sam when the turn is about Rutherford, otherwise ignore it. This
  covers plain Q&A about Rutherford that never calls a tool, and puts the voice in front of the first
  reply rather than only after the first tool result.
- The Rutherford persona on all seven slash commands, so `/rutherford:*` opens in his voice and banner
  the way the skills already did.

### Changed

- The skill persona block now tells Claude to stay in voice when reporting a tool's result, not only
  when first greeting.
- `scripts/validate-plugin.mjs` validates `hooks/hooks.json`: its shape, the supported `command` handler
  type, and that its `${CLAUDE_PLUGIN_ROOT}/...` references resolve.

### Fixed

- The persona reached only the skills (which load on explicit invocation) and the orchestrator agent
  (whose voice does not surface to the main conversation), so direct MCP tool calls and slash commands
  came back in plain Claude voice with no banner. Coverage now reaches every entry point.

## [0.1.0] - 2026-06-15

Initial release.

### Added

- Auto-registration of the Rutherford MCP server via a bundled `.mcp.json` that launches
  `uvx rutherford-mcp-server`, so install is one step.
- Thirteen skills. Setup and configuration: `setup-rutherford`, `configure-panels`,
  `configure-defaults`, `configure-roles`, `add-agents`, `configure-permissions`,
  `troubleshoot-connection`. Driving the crew: `delegate-task`, `multi-agent-consensus`, `agent-debate`,
  `code-review-panel`, `background-jobs`, `safe-write-delegation`.
- A `rutherford-orchestrator` agent that health-checks the crew and routes a request to the right mode.
- Seven slash commands: `/rutherford:setup`, `/rutherford:doctor`, `/rutherford:panels`,
  `/rutherford:permissions`, `/rutherford:consensus`, `/rutherford:debate`, `/rutherford:review`.
- A `configure-permissions` skill (and a `setup-rutherford` step) that writes a recommended Claude Code
  permission allowlist for the Rutherford tools and the `.rutherford` directories, with the user's
  confirmation.
- Reference docs the skills cite: `reference/tools.md`, `reference/safety.md`, `reference/panels.md`,
  `reference/config.md`, `reference/permissions.md`, `reference/persona.md`.
- The Rutherford persona: every skill and the orchestrator greet and work in the cheery, crew-first voice
  of Ensign Sam Rutherford (*Star Trek: Lower Decks*), opening with an ASCII banner. `reference/persona.md`
  holds the voice, the verbatim show quotes, the greeting protocol, and the guardrail that the character
  never overrides accurate, honest work or a safety gate.
- The project logo (`docs/images/logo.png`) and a "The name" section in the README, carried over from the
  Rutherford MCP server.
- Examples to copy: `examples/panels.toon` (code-review, design-roundtable, ship-vote), the
  `principal-reviewer` role, and a commented `config.toml`.
- `scripts/validate-plugin.mjs` plus CI (`ci.yml`) and release (`release.yml`) workflows. Validation
  covers the manifests, the bundled MCP config, skill/agent/command frontmatter, version lockstep, and
  that every `${CLAUDE_PLUGIN_ROOT}/...` reference resolves; the release workflow enforces tag↔version
  match and publishes a GitHub Release from the changelog on a `vX.Y.Z` tag.
- Passive usage badges (PyPI downloads, version, stars) with a note that the plugin emits no telemetry.

[0.2.2]: https://github.com/chapmanjw/rutherford-claude-plugin/releases/tag/v0.2.2
[0.2.1]: https://github.com/chapmanjw/rutherford-claude-plugin/releases/tag/v0.2.1
[0.2.0]: https://github.com/chapmanjw/rutherford-claude-plugin/releases/tag/v0.2.0
[0.1.0]: https://github.com/chapmanjw/rutherford-claude-plugin/releases/tag/v0.1.0
