#!/usr/bin/env node
// Validates the Kiro Crew app without external dependencies. Run: node scripts/validate-app.mjs
//
// The validated surface is app.json + agents/*.json + skills/ — the live Kiro Crew app.
// app.json is the SOLE version source of truth (a spec-compliant semver). There is no Claude
// plugin manifest in this repo: the plugin lives in its own repo (tracked as the `upstream`
// remote), so nothing here validates plugin.json/marketplace.json/.mcp.json/hooks/commands.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, isAbsolute, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// Full, anchored semantic version — the official SemVer.org spec-compliant pattern. Allows optional
// prerelease (-rc1, -alpha, -beta.1, -preview.1) and build metadata (+build) — release.yml treats
// ANY prerelease component as a prerelease — while rejecting leading zeros in numeric identifiers,
// empty prerelease identifiers, and trailing junk like "1.0.0broken".
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/** Parse and return a JSON file. records an error on failure unless optional (then null, no error). */
function readJson(rel, { optional = false } = {}) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    if (!optional) fail(`missing file: ${rel}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    return fail(`${rel}: invalid JSON — ${e.message}`), null;
  }
}

/** Extract the YAML frontmatter block of a Markdown file, or null. */
function frontmatter(rel) {
  const text = readFileSync(join(root, rel), "utf8");
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!m) return fail(`${rel}: missing YAML frontmatter`), null;
  return m[1];
}

/** Read a top-level scalar key from a frontmatter block. */
function fmValue(block, key) {
  const m = new RegExp(`^${key}:\\s*(.*)$`, "m").exec(block);
  return m ? m[1].trim() : null;
}

/** True when a string is present and non-empty after trimming. */
const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;

/**
 * Mirrors Kiro Crew's install-time rule that a resource path (agents/skills) must be RELATIVE and
 * CONTAINED within the app root — no absolute paths, no `..` traversal that escapes the root.
 * Returns null when the entry is safe, or a short reason string when it must be rejected.
 * Cross-platform and belt-and-suspenders:
 *   - reject a non-string,
 *   - reject a `..` path segment (split on BOTH `/` and `\`),
 *   - reject an absolute path (path.isAbsolute, a leading `/`, or a Windows drive/backslash-absolute),
 *   - and finally resolve against the root and require the result to stay inside it.
 */
function containmentReason(entry) {
  if (typeof entry !== "string") return "must be a string";
  const segments = entry.split(/[\\/]+/);
  if (segments.some((s) => s === "..")) return "contains a '..' segment";
  const isWindowsAbsolute = /^[A-Za-z]:[\\/]/.test(entry) || /^[\\/]/.test(entry);
  if (isAbsolute(entry) || isWindowsAbsolute) return "is an absolute path";
  const rootResolved = resolve(root);
  const resolved = resolve(rootResolved, entry);
  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + sep)) {
    return "escapes the app root";
  }
  return null;
}

/**
 * F1 — regression guard for the namespaced MCP tool grant.
 *
 * A Kiro Crew app namespaces the MCP servers it DECLARES (app.json.mcpServers) as
 * `@<app>:<server>` when it grants them to an agent. Reverting the fix to a bare, un-namespaced
 * `@<server>` (e.g. `@rutherford` instead of `@rutherford:rutherford`) recreates the original
 * dangling-ref bug — but a validator that only checks that each agent JSON has a non-empty
 * `name` would let that revert pass CI green. This guard closes that hole.
 *
 * Two distinct assertions, deliberately scoped differently:
 *
 * 1. REQUIRED EXACT GRANT (orchestrator only). For EVERY server key `<server>` the app itself
 *    declares in app.json.mcpServers, the app's ORCHESTRATOR agent MUST grant the EXACT
 *    app-namespaced form `@<app>:<server>` (optionally with a `/<tool>` suffix) in its `tools`
 *    array. `tools` is what MOUNTS the tool; `allowedTools` only controls prompting — a grant that
 *    lives ONLY in `allowedTools` never mounts the server, so it does NOT satisfy this requirement.
 *    We identify the orchestrator by JSON `name === "rutherford-orchestrator"`, falling back to the
 *    app.json agents-entry path `agents/rutherford-orchestrator.json`. We FAIL on:
 *      - MISSING  — no `tools` grant references the server at all
 *    Scoping this to the orchestrator lets a future narrow / read-only agent be added without being
 *    forced to grant every declared MCP server (least privilege).
 *
 * 2. MALFORMED-TOKEN CHECKS (ALL agents, BOTH lists). For every declared agent, scanning BOTH
 *    `tools` and `allowedTools`, we FAIL on:
 *      - BARE       — an un-namespaced `@<server>` (or `@<server>/<tool>`), the original bug
 *      - MISSPELLED — an `@<app>:<wrong>` that does not equal any real `@<app>:<server>`
 *    A malformed token anywhere is a failure regardless of which agent carries it.
 *
 * We only enforce this for the app's OWN declared servers — host servers such as `@kirocrew-core`
 * are declared by the host, not by this app.json, so their grants (`@kirocrew-core`,
 * `@kirocrew-core/spawn_run`, …) are left untouched.
 *
 * Grant-token grammar we recognize (a leading `@`):
 *   @kirocrew-core                  host server, whole-server grant        (ignored — not our server)
 *   @kirocrew-core/spawn_run        host server, single-tool grant         (ignored)
 *   @rutherford                     BARE app server — the bug              -> FAIL (any agent)
 *   @rutherford/<tool>              BARE app server, single-tool grant     -> FAIL (any agent)
 *   @rutherford:rutherfordx         MISSPELLED app-namespaced server       -> FAIL (any agent)
 *   @rutherford:rutherford          app-namespaced whole-server grant      -> OK
 *   @rutherford:rutherford/<tool>   app-namespaced single-tool grant       -> OK
 */
function enforceNamespacedMcpGrants(appManifest) {
  const appName = appManifest?.name;
  const servers = appManifest?.mcpServers;
  if (!nonEmpty(appName) || !servers || typeof servers !== "object" || Array.isArray(servers)) {
    return; // nothing well-formed to enforce against — other checks already flagged it
  }
  const ownServers = Object.keys(servers);
  if (ownServers.length === 0) return;

  // The set of app-namespaced server prefixes this app legitimately owns, e.g. "@rutherford:rutherford".
  // Used to detect a MISSPELLED namespaced grant: an `@<app>:<x>` whose `<x>` is not a real server.
  const validNamespaced = new Set(ownServers.map((s) => `@${appName}:${s}`));

  // The orchestrator is the one agent required to grant the app's servers. Identify it by JSON
  // `name`, falling back to the conventional app.json agents-entry path. Every OTHER agent is only
  // subject to the malformed-token checks — never to the required-grant assertion (least privilege).
  const ORCHESTRATOR_NAME = "rutherford-orchestrator";
  const ORCHESTRATOR_PATH = "agents/rutherford-orchestrator.json";

  for (const agentPath of Array.isArray(appManifest.agents) ? appManifest.agents : []) {
    // Containment/type guard FIRST — mirror the agents loop's `containmentReason` check. A
    // non-string (e.g. `null`), a `..`-traversal, or an absolute entry was already recorded
    // invalid in the agents loop; skip it here so we never `join(root, null)` / read a bad path
    // and crash with a TypeError. The validator then reports the clean error and exits nonzero.
    if (containmentReason(agentPath)) continue;
    if (!existsSync(join(root, agentPath))) continue; // existence already reported above
    const agentJson = readJson(agentPath, { optional: true });
    if (!agentJson) continue;

    const toolsList = Array.isArray(agentJson.tools) ? agentJson.tools : [];
    const allowedList = Array.isArray(agentJson.allowedTools) ? agentJson.allowedTools : [];

    // `tools` alone satisfies the REQUIRED grant (it is what mounts the server). Both lists are
    // scanned for MALFORMED tokens.
    const toolsGrants = toolsList.filter((t) => typeof t === "string");
    const allGrants = [...toolsList, ...allowedList].filter((t) => typeof t === "string");

    // The server portion of each grant token (drop any "/tool" suffix), for scanning.
    const toolsServerParts = toolsGrants.map((token) => token.split("/", 1)[0]);
    const allServerParts = allGrants.map((token) => token.split("/", 1)[0]);

    const isOrchestrator =
      agentJson.name === ORCHESTRATOR_NAME || agentPath === ORCHESTRATOR_PATH;

    for (const server of ownServers) {
      const namespaced = `@${appName}:${server}`; // e.g. @rutherford:rutherford
      const bare = `@${server}`; // e.g. @rutherford

      // --- MALFORMED-TOKEN CHECKS: all agents, BOTH lists ---
      for (let i = 0; i < allGrants.length; i++) {
        const token = allGrants[i];
        const serverPart = allServerParts[i];

        // Correct app-namespaced form for THIS server — nothing to flag.
        if (serverPart === namespaced) continue;

        // BARE: an un-namespaced grant of THIS app-owned server. The original dangling-ref bug.
        // (`@rutherford` or `@rutherford/<tool>` — but NOT `@rutherford:rutherford`, whose
        // serverPart is the namespaced string handled above.)
        if (serverPart === bare) {
          fail(
            `${agentPath}: grant "${token}" references the app's own MCP server "${server}" ` +
              `un-namespaced. This app namespaces its MCP servers as @<app>:<server>, so it must ` +
              `be "${namespaced}" (optionally "${namespaced}/<tool>"), not the bare "${bare}".`,
          );
        } else if (
          // MISSPELLED: an `@<app>:<something>` that is NOT a real server of this app.
          serverPart.startsWith(`@${appName}:`) &&
          !validNamespaced.has(serverPart)
        ) {
          fail(
            `${agentPath}: grant "${token}" uses the app namespace "@${appName}:" but names an ` +
              `unknown server. This app declares [${ownServers.join(", ")}]; the correct grant for ` +
              `"${server}" is "${namespaced}" (optionally "${namespaced}/<tool>").`,
          );
        }
      }

      // --- REQUIRED EXACT GRANT: orchestrator only, must be in `tools` (not allowedTools) ---
      if (isOrchestrator) {
        const grantedInTools = toolsServerParts.some((part) => part === namespaced);
        if (!grantedInTools) {
          fail(
            `${agentPath}: app declares MCP server "${server}" but the orchestrator agent grants no ` +
              `"${namespaced}" reference in its "tools" array. A declared MCP server must be MOUNTED ` +
              `by granting it app-namespaced as "${namespaced}" (optionally "${namespaced}/<tool>") ` +
              `in "tools" — a grant in "allowedTools" only controls prompting and does not mount it.`,
          );
        }
      }
    }
  }
}

/**
 * F2 — regression guard for the orchestrator's implementation-spawn directive.
 *
 * BUG this closes: the orchestrator's "Spawning Kiro Crew agents for implementation" section once
 * told the router to `spawn_run` a subagent for implementation WITHOUT naming an agent. Kiro Crew
 * defaults an unnamed spawn to the PARENT agent — so rutherford-orchestrator (read-only:
 * fs_read/grep/glob) would spawn ANOTHER rutherford-orchestrator, which cannot edit files or run
 * shell, and implementation requests would recurse into read-only routers and never do the work.
 *
 * The fix is a prompt directive: implementation spawns MUST name a write-capable agent
 * (`agent="kirocrew"` / `agent: "kirocrew"`), never leaving `spawn_run` to default to the parent.
 * This guard asserts that directive is present so the fix cannot silently regress. We assert:
 *   - the orchestrator prompt file exists, and
 *   - it contains an explicit named-implementation-agent token — `agent="kirocrew"` or
 *     `agent: "kirocrew"` (quote style / spacing tolerant).
 * Dependency-free: a plain substring/regex scan of the prompt text.
 */
function enforceImplementationAgentDirective() {
  const rel = "agents/rutherford-orchestrator.prompt.md";
  const path = join(root, rel);
  if (!existsSync(path)) {
    // The prompt file is also referenced elsewhere; flag it here too so this guard is self-contained.
    fail(`${rel}: orchestrator prompt file is missing (cannot verify the implementation-agent directive)`);
    return;
  }
  const text = readFileSync(path, "utf8");
  // Accept `agent="kirocrew"` and `agent: "kirocrew"` (JSON-ish and prose forms), any spacing.
  const NAMED_IMPL_AGENT = /agent\s*[:=]\s*"kirocrew"/;
  if (!NAMED_IMPL_AGENT.test(text)) {
    fail(
      `${rel}: the implementation-spawn section must direct spawning work with an explicit ` +
        `write-capable agent (e.g. agent="kirocrew" or agent: "kirocrew"). An unnamed spawn_run ` +
        `inherits the read-only rutherford-orchestrator agent and cannot edit files or run shell — ` +
        `implementation would recurse into read-only routers. Name the worker agent explicitly.`,
    );
  }
}

/**
 * F3 — validate app-registry.json, the self-listing external-registry index.
 *
 * This repo doubles as its own external registry: its root `app-registry.json` is the index Kiro Crew's
 * `_fetch_external_registry_index()` reads when a user adds this repo under Settings → Apps → Registries.
 * The parser requires a JSON ARRAY of object entries; each entry needs a `name` (matched against the
 * cloned app.json at install time by the identity gate) and a clone URL, which the resolver reads from
 * `gitUrl` first and falls back to `repo`. `branch` is optional (defaults to `main`); `subdirectory` is
 * optional and, when omitted, resolves app.json at the repo ROOT — which is where THIS app's app.json
 * lives, so a self-listing entry must NOT declare a subdirectory (and never `"."`, which the core's
 * `_is_safe_registry_subdir` rejects as a `.` path segment).
 *
 * We assert, dependency-free:
 *   - the file exists and parses,
 *   - it is a non-empty JSON array,
 *   - EVERY entry is an object with a non-empty `name` and a non-empty `gitUrl` or `repo`,
 *   - if a `subdirectory` is present it is neither "." nor "" (i.e. it is only present when meaningful),
 *   - EXACTLY ONE entry names THIS app (matches app.json.name), so the repo actually lists itself.
 * The app.json name match is skipped when app.json itself is malformed (already failed above).
 */
function validateAppRegistryIndex(appManifest) {
  const rel = "app-registry.json";
  const path = join(root, rel);
  if (!existsSync(path)) {
    fail(`missing file: ${rel} (this repo is its own registry and must list itself)`);
    return;
  }
  let index;
  try {
    index = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(`${rel}: invalid JSON — ${e.message}`);
    return;
  }
  if (!Array.isArray(index)) {
    fail(`${rel}: must be a JSON array of registry entries`);
    return;
  }
  if (index.length === 0) {
    fail(`${rel}: is an empty array — it must list at least this app`);
    return;
  }
  const appName = nonEmpty(appManifest?.name) ? appManifest.name : null;
  let selfListings = 0;
  index.forEach((entry, i) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`${rel}: entry [${i}] must be an object`);
      return;
    }
    if (!nonEmpty(entry.name)) {
      fail(`${rel}: entry [${i}] is missing a non-empty "name"`);
    }
    // Core reads the clone URL from gitUrl first, then falls back to repo (_entry_git_url).
    if (!nonEmpty(entry.gitUrl) && !nonEmpty(entry.repo)) {
      fail(`${rel}: entry [${i}] ("${entry.name ?? "?"}") needs a clone URL in "gitUrl" (or legacy "repo")`);
    }
    // subdirectory is optional; when present it must be meaningful. A root-level app OMITS it —
    // "." is rejected by the core's _is_safe_registry_subdir (a "." path segment), and "" is
    // pointless. Flag either so a root app never ships a subdirectory that breaks or misleads.
    if (entry.subdirectory !== undefined && (entry.subdirectory === "." || entry.subdirectory === "")) {
      fail(
        `${rel}: entry [${i}] ("${entry.name ?? "?"}") declares subdirectory ${JSON.stringify(
          entry.subdirectory,
        )} — omit "subdirectory" for a repo-root app ("." is rejected by Kiro Crew and "" is a no-op)`,
      );
    }
    if (appName && entry.name === appName) selfListings++;
  });
  if (appName && selfListings !== 1) {
    fail(
      `${rel}: must list this app ("${appName}") exactly once, found ${selfListings} — ` +
        `the repo doubles as its own registry, so its index must contain a single self-listing entry`,
    );
  }
}

// =============================================================================
// Kiro Crew app manifest (app.json) — the live app + the SOLE version source of truth.
// =============================================================================
const app = readJson("app.json");
// app.json MUST be a plain JSON object. A JSON `null`, a non-object (array, string, number),
// or a missing file must FAIL — not silently skip every manifest check below.
if (app === null || typeof app !== "object" || Array.isArray(app)) {
  fail(`app.json must be a JSON object`);
} else {
  if (!nonEmpty(app.name)) fail(`app.json: missing/empty required field "name"`);
  // Mirrors Kiro Crew's install-time rule: AppManifest enforces the app name as kebab-case via
  // ^[a-z0-9]+(?:-[a-z0-9]+)*$ — lowercase alphanumeric with single hyphens, no leading/trailing/
  // double hyphen. A name that fails this is rejected at install, so reject it here too.
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(app.name)) {
    fail(`app.json: name '${app.name}' must be kebab-case (lowercase alphanumeric + hyphens)`);
  }
  if (!nonEmpty(app.version)) fail(`app.json: missing/empty required field "version"`);
  else if (!SEMVER.test(app.version)) {
    fail(`app.json: version "${app.version}" is not semantic`);
  }
  if (!nonEmpty(app.displayName)) fail(`app.json: missing/empty required field "displayName"`);
  if (!nonEmpty(app.description)) fail(`app.json: missing/empty required field "description"`);

  // iconPath, when declared, must point at a file that exists on disk.
  if (app.iconPath !== undefined) {
    if (!nonEmpty(app.iconPath)) fail(`app.json: "iconPath" is empty`);
    else if (!existsSync(join(root, app.iconPath))) {
      fail(`app.json: iconPath "${app.iconPath}" does not exist`);
    }
  }

  // Every declared agent must exist on disk and be valid JSON that names itself.
  // A PRESENT `agents` key that is not an array must FAIL (an absent key is legal — empty).
  if (app.agents !== undefined && !Array.isArray(app.agents)) {
    fail(`app.json: 'agents' must be an array`);
  }
  for (const agentPath of Array.isArray(app.agents) ? app.agents : []) {
    // Containment first: a path Kiro Crew would reject at install (absolute or `..`-escaping)
    // must fail here BEFORE we join/read it.
    const reason = containmentReason(agentPath);
    if (reason) {
      fail(`app.json: agents path '${agentPath}' escapes the app root`);
      continue;
    }
    if (!existsSync(join(root, agentPath))) {
      fail(`app.json: agent path "${agentPath}" does not exist`);
      continue;
    }
    // A declared agent file must be a JSON OBJECT that names itself. Parse inline rather than via
    // readJson(): readJson returns null for BOTH a parse error AND a literal JSON `null`, so a
    // `null` agent file would be indistinguishable from a failure-already-reported and slip past
    // the `name` check. Here we FAIL explicitly on a parse error, on a literal `null`, and on any
    // non-object (array/scalar) — none of which name themselves.
    let agentJson;
    try {
      agentJson = JSON.parse(readFileSync(join(root, agentPath), "utf8"));
    } catch (e) {
      fail(`${agentPath}: invalid JSON — ${e.message}`);
      continue;
    }
    if (agentJson === null || typeof agentJson !== "object" || Array.isArray(agentJson)) {
      fail(`${agentPath}: must be a JSON object`);
    } else if (!nonEmpty(agentJson.name)) {
      fail(`${agentPath}: missing "name"`);
    }
  }

  // Every declared skill must be a directory that exists and holds a SKILL.md.
  // A PRESENT `skills` key that is not an array must FAIL (an absent key is legal — empty).
  if (app.skills !== undefined && !Array.isArray(app.skills)) {
    fail(`app.json: 'skills' must be an array`);
  }
  for (const skillPath of Array.isArray(app.skills) ? app.skills : []) {
    // Containment first: reject an absolute or `..`-escaping skills path before joining it.
    const reason = containmentReason(skillPath);
    if (reason) {
      fail(`app.json: skills path '${skillPath}' escapes the app root`);
      continue;
    }
    const dir = join(root, skillPath);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      fail(`app.json: skill "${skillPath}" is not a directory that exists`);
    } else if (!existsSync(join(dir, "SKILL.md"))) {
      fail(`app.json: skill "${skillPath}" is missing SKILL.md`);
    }
  }

  // The MCP server the skills expect must be declared, AND its entry must be well-formed.
  // A truthiness-only check would let `{"rutherford": {}}` (or a non-object) slip through and
  // ship an app whose MCP server never launches. Require the full shape:
  //   - an object,
  //   - a non-empty string `command`,
  //   - an `args` that is an array of strings.
  // The current manifest is `{"command":"uvx","args":["rutherford-mcp-server"]}` — i.e. the
  // expected invocation is `uvx rutherford-mcp-server`. We assert the SHAPE, not the exact
  // "uvx" value, so a future runner swap stays green without editing the validator.
  const mcpServers = app.mcpServers;
  if (!mcpServers || typeof mcpServers !== "object" || Array.isArray(mcpServers)) {
    fail(`app.json: "mcpServers" must be an object`);
  } else if (!mcpServers.rutherford) {
    fail(`app.json: missing "rutherford" entry in "mcpServers"`);
  } else {
    const rutherford = mcpServers.rutherford;
    if (typeof rutherford !== "object" || rutherford === null || Array.isArray(rutherford)) {
      fail(`app.json: "mcpServers.rutherford" must be an object`);
    } else {
      if (!nonEmpty(rutherford.command)) {
        fail(`app.json: "mcpServers.rutherford.command" must be a non-empty string (expected e.g. "uvx")`);
      }
      if (!Array.isArray(rutherford.args)) {
        fail(`app.json: "mcpServers.rutherford.args" must be an array (expected e.g. ["rutherford-mcp-server"])`);
      } else if (!rutherford.args.every((a) => typeof a === "string")) {
        fail(`app.json: "mcpServers.rutherford.args" must be an array of strings`);
      }
    }
  }

  // Regression guard for the namespaced MCP tool grant (F1). See enforceNamespacedMcpGrants above.
  // The app namespaces its OWN MCP servers as `@<app>:<server>` when it grants them to an agent,
  // so agents/rutherford-orchestrator.json must grant `@rutherford:rutherford`, NOT a bare
  // `@rutherford`, a misspelled `@rutherford:rutherfordx`, or nothing at all. Only servers the app
  // itself declares in app.json.mcpServers are enforced — host servers like @kirocrew-core are
  // left alone.
  enforceNamespacedMcpGrants(app);
}

// Regression guard for the orchestrator's implementation-spawn directive (F2). Runs unconditionally
// (it does its own existence check on the prompt file) so it fires even if app.json is malformed.
enforceImplementationAgentDirective();

// Validate the self-listing external-registry index (F3). Runs unconditionally (its own existence
// check) so it fires even if app.json is malformed; the self-listing name match is skipped when
// app.json's name is absent/invalid (already reported above). `app` may be null here — the helper
// reads `appManifest?.name` defensively.
validateAppRegistryIndex(app);

// =============================================================================
// skills/ (the live Kiro Crew skills)
// =============================================================================
const skillNames = new Set();
const skillsDir = join(root, "skills");
if (!existsSync(skillsDir)) {
  fail("missing skills/ directory");
} else {
  for (const name of readdirSync(skillsDir)) {
    const dir = join(skillsDir, name);
    if (!statSync(dir).isDirectory()) continue;
    skillNames.add(name);
    const rel = `skills/${name}/SKILL.md`;
    if (!existsSync(join(root, rel))) {
      fail(`${rel}: missing SKILL.md`);
      continue;
    }
    const fm = frontmatter(rel);
    if (!fm) continue;
    const skillName = fmValue(fm, "name");
    if (!skillName) fail(`${rel}: frontmatter missing "name"`);
    else if (skillName !== name) {
      fail(`${rel}: name "${skillName}" does not match folder "${name}"`);
    }
    if (!fmValue(fm, "description")) fail(`${rel}: frontmatter missing "description"`);
  }
}

// =============================================================================
// agents/ — the live Kiro Crew agent is JSON (validated via app.json above); its "*.prompt.md"
// body is a plain prompt with no frontmatter. Any other agent markdown (with frontmatter) still
// gets frontmatter checks.
// =============================================================================
const agentsDir = join(root, "agents");
if (existsSync(agentsDir)) {
  for (const file of readdirSync(agentsDir)) {
    if (!file.endsWith(".md") || file.endsWith(".prompt.md")) continue;
    const rel = `agents/${file}`;
    const fm = frontmatter(rel);
    if (!fm) continue;
    if (!fmValue(fm, "name")) fail(`${rel}: frontmatter missing "name"`);
    if (!fmValue(fm, "description")) fail(`${rel}: frontmatter missing "description"`);
  }
}

// =============================================================================
// LIVE-surface bundled-file references (~/.kiro/crew/apps|skills/rutherford/...) must resolve.
// An installed Kiro Crew app unpacks its own files to ~/.kiro/crew/apps/rutherford/ and its skills
// to ~/.kiro/crew/skills/rutherford/. Map those install paths back to this repo and FAIL on any
// cited path that has no file on disk, so a stale doc reference is caught before release.
//   ~/.kiro/crew/apps/rutherford/<path>   -> <repo root>/<path>
//   ~/.kiro/crew/skills/rutherford/<path> -> <repo root>/skills/<path>
// =============================================================================
const LIVE_REF = /~\/\.kiro\/crew\/(apps|skills)\/rutherford\/([A-Za-z0-9_./-]+)/g;
const liveRefResolves = (kind, ref) => {
  if (kind === "apps") {
    return existsSync(join(root, ref));
  }
  // kind === "skills"
  return existsSync(join(root, "skills", ref));
};
const liveRefFiles = [
  "agents/rutherford-orchestrator.prompt.md",
  ...(existsSync(skillsDir)
    ? readdirSync(skillsDir)
        .map((name) => `skills/${name}/SKILL.md`)
        .filter((rel) => existsSync(join(root, rel)))
    : []),
];
for (const rel of liveRefFiles) {
  if (!existsSync(join(root, rel))) continue;
  const text = readFileSync(join(root, rel), "utf8");
  for (const m of text.matchAll(LIVE_REF)) {
    const ref = m[2].replace(/[).,;:`"]+$/, ""); // strip trailing markdown/sentence punctuation
    if (!liveRefResolves(m[1], ref)) {
      fail(`${rel}: live reference ~/.kiro/crew/${m[1]}/rutherford/${ref} does not exist`);
    }
  }
}

// Each app.json agent's `prompt` file:// target must resolve. A file://~/.kiro/crew/apps/rutherford/<path>
// pointer names the installed location; map it back to the repo root and assert the file is present.
for (const agentPath of Array.isArray(app?.agents) ? app.agents : []) {
  if (containmentReason(agentPath)) continue; // non-string/traversal/absolute already reported
  const agentJson = readJson(agentPath, { optional: true });
  const prompt = agentJson?.prompt;
  if (typeof prompt !== "string" || !prompt.startsWith("file://")) continue;
  const target = prompt.slice("file://".length);
  const m = /^~\/\.kiro\/crew\/apps\/rutherford\/(.+)$/.exec(target);
  if (!m) continue; // absolute or other scheme — not ours to resolve here
  if (!existsSync(join(root, m[1]))) {
    fail(`${agentPath}: prompt target ${prompt} does not resolve to ${m[1]} in the repo`);
  }
}

// --- report ---
for (const w of warnings) console.warn(`! ${w}`);
if (errors.length) {
  console.error(`✗ validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ app.json (primary), skills (${skillNames.size}), and agents are valid`);
