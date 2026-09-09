#!/usr/bin/env node
// Validates the plugin without external dependencies. Run: node scripts/validate-plugin.mjs
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

/** Parse and return a JSON file, recording an error on failure. */
function readJson(rel) {
  const path = join(root, rel);
  if (!existsSync(path)) return fail(`missing file: ${rel}`), null;
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

/** Recursively collect Markdown files under a directory (skipping VCS and deps). */
function walkMarkdown(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

// --- plugin manifest ---
const plugin = readJson(".claude-plugin/plugin.json");
if (plugin) {
  if (!plugin.name) fail(`plugin.json: missing required field "name"`);
  else if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(plugin.name)) {
    fail(`plugin.json: name "${plugin.name}" is not kebab-case`);
  }
  if (!plugin.description) fail(`plugin.json: missing required field "description"`);
  if (plugin.version && !/^\d+\.\d+\.\d+/.test(plugin.version)) {
    fail(`plugin.json: version "${plugin.version}" is not semantic`);
  }
}

// --- marketplace manifest ---
const market = readJson(".claude-plugin/marketplace.json");
if (market) {
  if (!market.name) fail(`marketplace.json: missing "name"`);
  if (!market.owner?.name) fail(`marketplace.json: missing "owner.name"`);
  if (!Array.isArray(market.plugins) || market.plugins.length === 0) {
    fail(`marketplace.json: "plugins" must be a non-empty array`);
  } else if (plugin && !market.plugins.some((p) => p.name === plugin.name)) {
    fail(`marketplace.json: no plugin entry matches plugin.json name "${plugin.name}"`);
  }
  // Keep the two versions in lockstep so a release tag means one thing.
  const entry = market.plugins?.find((p) => p.name === plugin?.name);
  if (entry && plugin?.version && entry.version && entry.version !== plugin.version) {
    fail(`version mismatch: plugin.json ${plugin.version} vs marketplace.json ${entry.version}`);
  }
}

// --- bundled MCP config (auto-registers the Rutherford server) ---
const mcp = readJson(".mcp.json");
if (mcp && (!mcp.mcpServers || typeof mcp.mcpServers !== "object")) {
  fail(`.mcp.json: missing top-level "mcpServers" object`);
} else if (mcp && !mcp.mcpServers.rutherford) {
  warn(`.mcp.json: no "rutherford" server entry — skills expect that server name`);
}

// --- skills ---
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

// --- agents (and their skills: references, where present) ---
const agentsDir = join(root, "agents");
if (existsSync(agentsDir)) {
  for (const file of readdirSync(agentsDir)) {
    if (!file.endsWith(".md")) continue;
    const rel = `agents/${file}`;
    const fm = frontmatter(rel);
    if (!fm) continue;
    if (!fmValue(fm, "name")) fail(`${rel}: frontmatter missing "name"`);
    if (!fmValue(fm, "description")) fail(`${rel}: frontmatter missing "description"`);
  }
}

// --- commands ---
const commandsDir = join(root, "commands");
if (existsSync(commandsDir)) {
  for (const file of readdirSync(commandsDir)) {
    if (!file.endsWith(".md")) continue;
    const rel = `commands/${file}`;
    const fm = frontmatter(rel);
    if (!fm) continue;
    if (!fmValue(fm, "description")) fail(`${rel}: frontmatter missing "description"`);
  }
}

// --- bundled-file references (${CLAUDE_PLUGIN_ROOT}/...) must resolve ---
// Skills, the agent, and commands point at bundled docs/examples with the runtime
// ${CLAUDE_PLUGIN_ROOT} token. A typo'd path ships a plugin that reads a file that is not there,
// so verify every referenced path exists on disk.
const PLUGIN_ROOT_REF = /\$\{CLAUDE_PLUGIN_ROOT\}\/([A-Za-z0-9_./-]+)/g;
for (const file of walkMarkdown(root)) {
  const rel = file.slice(root.length + 1).split("\\").join("/");
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(PLUGIN_ROOT_REF)) {
    const ref = m[1].replace(/[).,;:]+$/, ""); // strip trailing sentence punctuation
    if (!existsSync(join(root, ref))) {
      fail(`${rel}: bundled reference \${CLAUDE_PLUGIN_ROOT}/${ref} does not exist`);
    }
  }
}

// --- hooks (plugin event handlers) ---
// hooks/hooks.json is auto-discovered when present. Validate its shape, that handlers use the
// supported "command" type, and that any ${CLAUDE_PLUGIN_ROOT}/... path it runs resolves on disk
// (the markdown scan above does not cover JSON, so the hook's script reference is checked here).
const hooksRel = "hooks/hooks.json";
if (existsSync(join(root, hooksRel))) {
  const hooksCfg = readJson(hooksRel);
  if (hooksCfg && (!hooksCfg.hooks || typeof hooksCfg.hooks !== "object")) {
    fail(`${hooksRel}: missing top-level "hooks" object`);
  } else if (hooksCfg) {
    for (const [event, entries] of Object.entries(hooksCfg.hooks)) {
      if (!Array.isArray(entries)) {
        fail(`${hooksRel}: "${event}" must be an array`);
        continue;
      }
      for (const entry of entries) {
        if (entry === null || typeof entry !== "object") {
          fail(`${hooksRel}: a ${event} entry is not an object`);
          continue;
        }
        // A matcher is optional (events like UserPromptSubmit fire on every prompt with none); when
        // present it must be a string.
        if (entry.matcher !== undefined && typeof entry.matcher !== "string") {
          fail(`${hooksRel}: a ${event} entry "matcher" must be a string when present`);
        }
        if (!Array.isArray(entry.hooks)) {
          fail(`${hooksRel}: a ${event} entry is missing a "hooks" array`);
          continue;
        }
        for (const h of entry.hooks) {
          if (h.type !== "command") {
            fail(`${hooksRel}: ${event} handler type "${h.type}" is unsupported (expected "command")`);
          }
          const strings = [h.command, ...(Array.isArray(h.args) ? h.args : [])].filter(
            (s) => typeof s === "string",
          );
          for (const s of strings) {
            for (const m of s.matchAll(PLUGIN_ROOT_REF)) {
              const ref = m[1].replace(/[).,;:"]+$/, "");
              if (!existsSync(join(root, ref))) {
                fail(`${hooksRel}: hook reference \${CLAUDE_PLUGIN_ROOT}/${ref} does not exist`);
              }
            }
          }
        }
      }
    }
  }
}

// --- report ---
for (const w of warnings) console.warn(`! ${w}`);
if (errors.length) {
  console.error(`✗ validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `✓ plugin, marketplace, MCP config, skills (${skillNames.size}), agents, commands, hooks, and bundled references are valid`,
);
