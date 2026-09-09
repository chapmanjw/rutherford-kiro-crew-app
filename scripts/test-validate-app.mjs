#!/usr/bin/env node
// Falsifiable tests for scripts/validate-app.mjs — dependency-free, Node 20+.
// Run: node scripts/test-validate-app.mjs   (exits non-zero if any case fails)
//
// validate-app.mjs resolves its repo `root` from its OWN location (import.meta.url + ".."),
// so we cannot point it at an arbitrary tree via an argument without refactoring it. To keep the
// validator's no-arg default behavior IDENTICAL, each case instead builds a self-contained temp
// copy of the app — including a copy of scripts/validate-app.mjs — mutates the fixture there, and
// runs the copied validator with `node`. Because the copied validator sits at
// <tempApp>/scripts/validate-app.mjs, its `root` resolves to <tempApp>, exactly as in the real repo.
//
// The real tracked repo is only ever READ (copied); it is never mutated.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// Files/dirs a validation run actually touches. Copying just these keeps each fixture cheap and
// avoids dragging the 1.5 MB docs/images/logo.png and .git into every temp copy.
const COPY_ENTRIES = ["app.json", "app-registry.json", "agents", "skills", "scripts", "assets", "reference", "examples"];

let passed = 0;
let failed = 0;

/** Run the copied validator in `appDir`; return { code, stdout, stderr }. Never throws. */
function runValidator(appDir) {
  try {
    const stdout = execFileSync("node", ["scripts/validate-app.mjs"], {
      cwd: appDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    return {
      code: typeof e.status === "number" ? e.status : 1,
      stdout: e.stdout ? e.stdout.toString() : "",
      stderr: e.stderr ? e.stderr.toString() : "",
    };
  }
}

/** Copy the app surface into a fresh temp dir, run `mutate(appDir)`, return the temp appDir. */
function makeFixture(mutate) {
  const dir = mkdtempSync(join(tmpdir(), "rutherford-validate-test-"));
  for (const entry of COPY_ENTRIES) {
    const src = join(repoRoot, entry);
    if (existsSync(src)) cpSync(src, join(dir, entry), { recursive: true });
  }
  if (mutate) mutate(dir);
  return dir;
}

const readAgent = (appDir) =>
  JSON.parse(readFileSync(join(appDir, "agents", "rutherford-orchestrator.json"), "utf8"));
const writeAgent = (appDir, obj) =>
  writeFileSync(
    join(appDir, "agents", "rutherford-orchestrator.json"),
    JSON.stringify(obj, null, 2),
  );

/**
 * A test case: build a fixture, run the validator, assert on exit code.
 * expect === "pass" -> validator must exit 0; expect === "fail" -> must exit non-zero.
 * When `expectMessage` (a RegExp) is given on a "fail" case, the combined stdout+stderr MUST also
 * match it — so the case asserts WHY it failed, not merely that it did. This makes a case
 * falsifiable for the specific diagnostic it claims to exercise.
 */
function testCase(label, expect, mutate, expectMessage) {
  let dir;
  try {
    dir = makeFixture(mutate);
    const { code, stdout, stderr } = runValidator(dir);
    const out = (stdout + stderr).trim();
    const codeOk = expect === "pass" ? code === 0 : code !== 0;
    const msgOk = !expectMessage || expectMessage.test(out);
    const ok = codeOk && msgOk;
    if (ok) {
      passed++;
      console.log(`  ✓ ${label} (expected ${expect}, exit ${code})`);
    } else {
      failed++;
      if (codeOk && !msgOk) {
        console.error(
          `  ✗ ${label} (exit ${code} as expected, but message did not match ${expectMessage})`,
        );
      } else {
        console.error(`  ✗ ${label} (expected ${expect}, got exit ${code})`);
      }
      if (out) console.error(out.split("\n").map((l) => `      ${l}`).join("\n"));
    }
  } catch (e) {
    failed++;
    console.error(`  ✗ ${label} — test harness error: ${e.message}`);
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
}

console.log("Validator behavior tests:\n");

// (a) VALID current repo -> pass/exit 0
testCase("(a) valid current repo passes", "pass", null);

// (b) agent tools with a BARE @rutherford grant -> fail
//     Isolated from the required-grant check (mirrors case (c)): the fixture KEEPS the valid
//     @rutherford:rutherford grant AND ADDS the un-namespaced @rutherford as an extra token. So the
//     ONLY reason to fail is the bare/un-namespaced token — if the bare-token check were removed,
//     this case would (correctly) start passing, making it falsifiable for that behavior. We also
//     assert the diagnostic names the un-namespaced/bare problem, not merely that exit != 0.
testCase(
  "(b) bare @rutherford extra grant fails (un-namespaced), valid grant kept",
  "fail",
  (dir) => {
    const a = readAgent(dir);
    // Keep the existing valid grant untouched; append the bare token.
    a.tools = [...(a.tools || []), "@rutherford"];
    writeAgent(dir, a);
  },
  /un-namespaced|bare/i,
);

// (c) MISSPELLED @rutherford:rutherfordx grant -> fail
//     Isolated from the required-grant check: the fixture KEEPS the valid @rutherford:rutherford
//     grant AND ADDS the misspelled @rutherford:rutherfordx as an extra token. So the ONLY reason
//     to fail is the unknown-server token — if the misspelled/unknown-server check were removed,
//     this case would (correctly) start passing, making it falsifiable for that behavior. We also
//     assert the diagnostic names the unknown/misspelled server, not merely that exit != 0.
testCase(
  "(c) misspelled @rutherford:rutherfordx extra grant fails (unknown server), valid grant kept",
  "fail",
  (dir) => {
    const a = readAgent(dir);
    // Keep the existing valid grant untouched; append the misspelled token.
    a.tools = [...(a.tools || []), "@rutherford:rutherfordx"];
    writeAgent(dir, a);
  },
  /names an unknown server|unknown server/i,
);

// (d) MISSING rutherford grant (drop it from both lists) -> fail
testCase("(d) missing rutherford grant fails", "fail", (dir) => {
  const a = readAgent(dir);
  const drop = (t) => t !== "@rutherford:rutherford" && !t.startsWith("@rutherford:rutherford/");
  a.tools = (a.tools || []).filter(drop);
  a.allowedTools = (a.allowedTools || []).filter(drop);
  writeAgent(dir, a);
});

// (e) agent JSON = null -> fail (the FIX 2 guard)
testCase("(e) agent JSON literal null fails", "fail", (dir) => {
  writeFileSync(join(dir, "agents", "rutherford-orchestrator.json"), "null\n");
});

// (e2) FIX 1: app.json.agents entry = null -> clean FAIL, NO crash.
//      A `null` entry is not a string, so containmentReason rejects it in the agents loop AND the
//      enforceNamespacedMcpGrants guard skips it instead of `join(root, null)` throwing a
//      TypeError. Assert BOTH: nonzero exit AND the validator's clean actionable error is present.
//      If the guard were missing, join(root, null) would throw a TypeError and this message would
//      never print — so requiring it (and forbidding "TypeError") proves the crash is gone.
testCase(
  "(e2) app.json agents [null] fails cleanly (no TypeError/stack trace)",
  "fail",
  (dir) => {
    const app = JSON.parse(readFileSync(join(dir, "app.json"), "utf8"));
    app.agents = [null];
    writeFileSync(join(dir, "app.json"), JSON.stringify(app, null, 2));
  },
  /^(?![\s\S]*TypeError)[\s\S]*escapes the app root/,
);

// (f1) non-array agents -> fail
testCase("(f) non-array app.json 'agents' fails", "fail", (dir) => {
  const app = JSON.parse(readFileSync(join(dir, "app.json"), "utf8"));
  app.agents = { path: "agents/rutherford-orchestrator.json" };
  writeFileSync(join(dir, "app.json"), JSON.stringify(app, null, 2));
});

// (f2) non-array skills -> fail
testCase("(f) non-array app.json 'skills' fails", "fail", (dir) => {
  const app = JSON.parse(readFileSync(join(dir, "app.json"), "utf8"));
  app.skills = "skills/setup-rutherford";
  writeFileSync(join(dir, "app.json"), JSON.stringify(app, null, 2));
});

// (g) app.json iconPath points at a missing file -> fail
testCase("(g) app.json iconPath missing file fails", "fail", (dir) => {
  const app = JSON.parse(readFileSync(join(dir, "app.json"), "utf8"));
  app.iconPath = "assets/does-not-exist.png";
  writeFileSync(join(dir, "app.json"), JSON.stringify(app, null, 2));
});

// (h) required grant present ONLY in allowedTools (removed from tools) -> fail
//     Proves the FIX 2 tools-specific requirement: `tools` MOUNTS the server; a grant that lives
//     only in `allowedTools` controls prompting and does not mount it, so it must NOT satisfy the
//     required-grant assertion.
testCase("(h) @rutherford:rutherford only in allowedTools (not tools) fails", "fail", (dir) => {
  const a = readAgent(dir);
  const isRuth = (t) =>
    t === "@rutherford:rutherford" || t.startsWith("@rutherford:rutherford/");
  a.tools = (a.tools || []).filter((t) => !isRuth(t));
  // Ensure the exact grant is still present in allowedTools (so the ONLY difference from a pass is
  // its list). If it wasn't already there, add it.
  a.allowedTools = a.allowedTools || [];
  if (!a.allowedTools.some(isRuth)) a.allowedTools.push("@rutherford:rutherford");
  writeAgent(dir, a);
});

// A minimal valid second agent used by the orchestrator-scoping cases below.
const writeHelperAgent = (dir, tools) => {
  writeFileSync(
    join(dir, "agents", "helper.json"),
    JSON.stringify(
      {
        name: "helper",
        displayName: "Helper",
        description: "A minimal second agent that does not grant the app's MCP server.",
        model: "auto",
        tools,
      },
      null,
      2,
    ),
  );
};
const registerHelperAgent = (dir) => {
  const app = JSON.parse(readFileSync(join(dir, "app.json"), "utf8"));
  app.agents = [...(app.agents || []), "agents/helper.json"];
  writeFileSync(join(dir, "app.json"), JSON.stringify(app, null, 2));
};

// (i) a SECOND valid agent that does NOT grant @rutherford:rutherford -> pass
//     Proves the required-exact-grant assertion is ORCHESTRATOR-ONLY (FIX 3, least privilege):
//     a narrow/read-only agent may exist without being forced to grant every declared MCP server.
testCase("(i) second agent without rutherford grant passes (orchestrator-only requirement)", "pass", (dir) => {
  writeHelperAgent(dir, ["fs_read", "grep", "glob"]);
  registerHelperAgent(dir);
});

// (j) that same second agent with a BARE @rutherford in its tools -> fail
//     Proves the MALFORMED-token checks still apply to ALL agents, not just the orchestrator.
testCase("(j) second agent with bare @rutherford grant fails (malformed check on all agents)", "fail", (dir) => {
  writeHelperAgent(dir, ["fs_read", "grep", "glob", "@rutherford"]);
  registerHelperAgent(dir);
});

// --- FIX 1: app name must be kebab-case (mirrors Kiro Crew's install-time rule) ---
const setAppName = (dir, name) => {
  const app = JSON.parse(readFileSync(join(dir, "app.json"), "utf8"));
  app.name = name;
  writeFileSync(join(dir, "app.json"), JSON.stringify(app, null, 2));
};

// (k) name with an underscore + uppercase -> fail
testCase("(k) non-kebab app name 'Rutherford_App' fails", "fail", (dir) => {
  setAppName(dir, "Rutherford_App");
});

// (l) name with a double hyphen -> fail
testCase("(l) double-hyphen app name 'rutherford--x' fails", "fail", (dir) => {
  setAppName(dir, "rutherford--x");
});

// (m) name with a leading hyphen -> fail
testCase("(m) leading-hyphen app name '-rutherford' fails", "fail", (dir) => {
  setAppName(dir, "-rutherford");
});

// --- FIX 2: resource-path containment (mirrors Kiro Crew's install-time rule) ---
const setAgents = (dir, agents) => {
  const app = JSON.parse(readFileSync(join(dir, "app.json"), "utf8"));
  app.agents = agents;
  writeFileSync(join(dir, "app.json"), JSON.stringify(app, null, 2));
};
const setSkills = (dir, skills) => {
  const app = JSON.parse(readFileSync(join(dir, "app.json"), "utf8"));
  app.skills = skills;
  writeFileSync(join(dir, "app.json"), JSON.stringify(app, null, 2));
};

// (n) agents entry with a `..` traversal -> fail
testCase("(n) agents traversal path '../evil.json' fails", "fail", (dir) => {
  setAgents(dir, ["../evil.json"]);
});

// (o) agents entry with an absolute path -> fail
testCase("(o) agents absolute path '/etc/passwd' fails", "fail", (dir) => {
  setAgents(dir, ["/etc/passwd"]);
});

// (p) skills entry with a `..` traversal -> fail
testCase("(p) skills traversal path '../something' fails", "fail", (dir) => {
  setSkills(dir, ["../something"]);
});

// --- F2: orchestrator implementation-spawn directive guard ---
const PROMPT_REL = join("agents", "rutherford-orchestrator.prompt.md");

// (q) prompt stripped of the named-agent directive -> fail
//     Removes every `agent="kirocrew"` / `agent: "kirocrew"` token from the prompt. With the
//     directive gone, the guard MUST fail — proving it actually depends on the directive being
//     present, not merely that the file exists. We also assert the diagnostic names the problem.
testCase(
  "(q) orchestrator prompt without named impl agent fails",
  "fail",
  (dir) => {
    const p = join(dir, PROMPT_REL);
    const stripped = readFileSync(p, "utf8").replace(/agent\s*[:=]\s*"kirocrew"/g, "agent=SPAWN");
    writeFileSync(p, stripped);
  },
  /explicit write-capable agent|agent="kirocrew"|implementation-spawn/i,
);

// (r) prompt file missing entirely -> fail
//     Deletes the prompt file; the guard must fail with a clear "missing" diagnostic rather than
//     throwing. (Other checks also reference the prompt, but this proves the guard is self-contained.)
testCase(
  "(r) missing orchestrator prompt file fails",
  "fail",
  (dir) => {
    rmSync(join(dir, PROMPT_REL), { force: true });
  },
);

// --- F3: app-registry.json self-listing index guard ---
const REGISTRY_REL = "app-registry.json";
const writeRegistry = (dir, value) =>
  writeFileSync(join(dir, REGISTRY_REL), typeof value === "string" ? value : JSON.stringify(value, null, 2));

// (s) missing app-registry.json -> fail
//     Deletes the index; the guard must fail with a "missing file" diagnostic. Proves the check
//     actually requires the index to exist rather than passing when it is absent.
testCase(
  "(s) missing app-registry.json fails",
  "fail",
  (dir) => {
    rmSync(join(dir, REGISTRY_REL), { force: true });
  },
  /app-registry\.json/i,
);

// (t) app-registry.json that is a JSON object (not an array) -> fail
testCase(
  "(t) non-array app-registry.json fails",
  "fail",
  (dir) => {
    writeRegistry(dir, { name: "rutherford", gitUrl: "https://github.com/chapmanjw/rutherford-kiro-crew-app" });
  },
  /must be a JSON array/i,
);

// (u) self-listing entry name does NOT match app.json.name -> fail
//     Keeps a well-formed single-entry array but renames the entry, so the ONLY reason to fail is
//     the missing self-listing. Falsifiable for the exactly-one-self-listing assertion.
testCase(
  "(u) app-registry.json that does not list this app fails",
  "fail",
  (dir) => {
    writeRegistry(dir, [
      { name: "not-rutherford", gitUrl: "https://github.com/chapmanjw/rutherford-kiro-crew-app", branch: "main" },
    ]);
  },
  /must list this app|exactly once/i,
);

// (v) self-listing entry declaring subdirectory: "." -> fail
//     A root-level app must omit subdirectory; "." is rejected by the core's _is_safe_registry_subdir.
//     Falsifiable for the subdirectory guard: with it removed this would pass.
testCase(
  '(v) app-registry.json entry with subdirectory "." fails',
  "fail",
  (dir) => {
    writeRegistry(dir, [
      {
        name: "rutherford",
        gitUrl: "https://github.com/chapmanjw/rutherford-kiro-crew-app",
        branch: "main",
        subdirectory: ".",
      },
    ]);
  },
  /subdirectory/i,
);

// (w) entry missing any clone URL (no gitUrl, no repo) -> fail
testCase(
  "(w) app-registry.json entry without a clone URL fails",
  "fail",
  (dir) => {
    writeRegistry(dir, [{ name: "rutherford", branch: "main" }]);
  },
  /clone URL|gitUrl/i,
);

// (x) legacy `repo` (instead of gitUrl) still resolves the clone URL -> pass
//     The core reads gitUrl first and falls back to repo; the validator must accept a repo-only entry.
testCase(
  "(x) app-registry.json entry using legacy repo (no gitUrl) passes",
  "pass",
  (dir) => {
    writeRegistry(dir, [
      { name: "rutherford", repo: "https://github.com/chapmanjw/rutherford-kiro-crew-app", branch: "main" },
    ]);
  },
);

// --- report ---
const total = passed + failed;
if (failed) {
  console.error(`✗ validator tests: ${passed}/${total} passed, ${failed} failed`);
  process.exit(1);
}
console.log(`✓ validator tests: ${passed}/${total} passed`);
