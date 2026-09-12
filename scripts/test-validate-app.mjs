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
const COPY_ENTRIES = ["app.json", "app-registry.json", "agents", "skills", "scripts", "assets", "reference", "examples", "backend"];

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

// --- F4: backend route-contract guard (config + panels write routes, non-reserved paths) ---
const ROUTES_REL = join("backend", "routes.py");
const readRoutes = (dir) => readFileSync(join(dir, ROUTES_REL), "utf8");
const writeRoutes = (dir, text) => writeFileSync(join(dir, ROUTES_REL), text);

// (y) current backend registers both write routes -> pass (covered by (a) too, but explicit here).
testCase("(y) backend routes.py registers both write routes passes", "pass", null);

// (z) panels write route dropped -> fail
//     Removes the PUT /rutherford-panels registration line; the guard must fail, proving it
//     actually requires the panels write surface rather than merely that routes.py exists.
testCase(
  "(z) missing PUT /rutherford-panels route fails",
  "fail",
  (dir) => {
    const t = readRoutes(dir).replace(
      /\s*AppRoute\("PUT",\s*"\/rutherford-panels",[^)]*\),/,
      "",
    );
    writeRoutes(dir, t);
  },
  /rutherford-panels/i,
);

// (aa) a route reverted to the RESERVED bare "/config" path -> fail
//      Rewrites the config write path to the reserved "/config"; the guard must reject it as a
//      collision with Kiro Crew's reserved app-config route.
testCase(
  '(aa) route at reserved "/config" path fails',
  "fail",
  (dir) => {
    const t = readRoutes(dir).replace(
      'AppRoute("PUT", "/rutherford-config"',
      'AppRoute("PUT", "/config"',
    );
    writeRoutes(dir, t);
  },
  /reserved/i,
);

// (bb) register_routes removed entirely -> fail
testCase(
  "(bb) backend without register_routes fails",
  "fail",
  (dir) => {
    const t = readRoutes(dir).replace(/def\s+register_routes\s*\(/, "def _disabled_register_routes(");
    writeRoutes(dir, t);
  },
  /register_routes/i,
);

// (cc) GET /rutherford-meta route dropped -> fail
//      Removes the meta route registration; the guard must fail, proving the UI's
//      dropdown option-set surface is required (its absence degrades every dropdown
//      to free text silently).
testCase(
  "(cc) missing GET /rutherford-meta route fails",
  "fail",
  (dir) => {
    const t = readRoutes(dir).replace(
      /\s*AppRoute\("GET",\s*"\/rutherford-meta",[^)]*\),/,
      "",
    );
    writeRoutes(dir, t);
  },
  /rutherford-meta/i,
);

// (dd) GET /rutherford-roles route dropped -> fail
//      Removes ONLY the GET roles registration (keeps the PUT), so the ONLY reason
//      to fail is the missing roles read surface. Falsifiable for that assertion.
testCase(
  "(dd) missing GET /rutherford-roles route fails",
  "fail",
  (dir) => {
    const t = readRoutes(dir).replace(
      /\s*AppRoute\("GET",\s*"\/rutherford-roles",[^)]*\),/,
      "",
    );
    writeRoutes(dir, t);
  },
  /rutherford-roles/i,
);

// (ee) PUT /rutherford-roles route dropped -> fail
//      Removes ONLY the PUT roles registration (keeps the GET), so the ONLY reason
//      to fail is the missing roles write surface. Falsifiable for that assertion.
testCase(
  "(ee) missing PUT /rutherford-roles route fails",
  "fail",
  (dir) => {
    const t = readRoutes(dir).replace(
      /\s*AppRoute\("PUT",\s*"\/rutherford-roles",[^)]*\),/,
      "",
    );
    writeRoutes(dir, t);
  },
  /rutherford-roles/i,
);

// --- F5: roles-path BEHAVIORAL tests (guard FIX 1 delete-verification + FIX 2 frontmatter round-trip) ---
//
// These are FALSIFIABLE behavior tests, not registration checks: each fails if the
// corresponding fix is reverted.

// A lightweight assertion recorder for behavior tests that don't run the JS validator.
function behaviorCase(label, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${label}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${label} — ${e && e.message ? e.message : e}`);
  }
}

console.log("\nRoles-path behavior tests:\n");

// Resolve a Python interpreter for the round-trip test. On this platform `python`,
// `py`, and `python3` are all viable; pick the first that answers --version.
function resolvePython() {
  for (const cand of ["python", "py", "python3"]) {
    try {
      execFileSync(cand, ["--version"], { stdio: ["ignore", "pipe", "pipe"] });
      return cand;
    } catch {
      /* try next */
    }
  }
  return null;
}

// (ff) FRONTMATTER ROUND-TRIP (guards FIX 2): the REAL backend serializer/parser must
//      satisfy parse(emit(x)) == x for values containing a double quote, a backslash,
//      both, a leading/trailing space, a colon, and a normal value.
//
//      We exercise the ACTUAL functions in backend/routes.py — not a JS re-implementation —
//      by AST-extracting the pure frontmatter helpers from the source and exec'ing them in a
//      throwaway Python process. routes.py imports aiohttp at module top (absent in the plain
//      interpreter), so importing the module wholesale is not possible here; slicing out the
//      self-contained stdlib-only helpers runs the genuine code without that dependency.
//
//      Falsifiable: if FIX 2's unescaping is reverted (parser stops reversing \\ and \"),
//      the quote/backslash/both cases no longer round-trip and this test FAILS.
behaviorCase("(ff) role frontmatter round-trips a quote + backslash (real backend helpers)", () => {
  const py = resolvePython();
  if (!py) throw new Error("no Python interpreter found (python/py/python3)");
  const routesPath = join(repoRoot, "backend", "routes.py");
  if (!existsSync(routesPath)) throw new Error(`missing ${routesPath}`);

  // Python driver: AST-extract the pure helpers, exec them, assert round-trip for all cases.
  const driver = [
    "import ast, sys, json",
    "src = open(sys.argv[1], encoding='utf-8').read()",
    "want = {'_parse_role_md','_fm_scalar_needs_quote','_emit_fm_scalar','_unescape_fm_double_quoted','_serialize_role_md','_role_roundtrip_ok'}",
    "segs=[ast.get_source_segment(src,n) for n in ast.parse(src).body if isinstance(n,ast.FunctionDef) and n.name in want]",
    "ns={}",
    "exec('from typing import Any\\n' + '\\n\\n'.join(segs), ns)",
    // Fail loudly if FIX 2's helper never made it into the source.
    "assert '_unescape_fm_double_quoted' in ns, 'FIX 2 helper _unescape_fm_double_quoted missing from routes.py'",
    "cases=['She said \\\"hi\\\"','back\\\\slash','q\\\"and\\\\b',' leading','trailing ','a: colon','normal value','\\\"','\\\\','\\\\\\\"']",
    "bad=[]",
    "for c in cases:",
    "    role={'name':'x','display_name':'','description':c,'body':'\\nBody\\n','extra':{'note':c}}",
    "    text=ns['_serialize_role_md'](role)",
    "    p=ns['_parse_role_md'](text)",
    "    if not (ns['_role_roundtrip_ok'](text) and p['description']==c and p['extra'].get('note')==c):",
    "        bad.append(c)",
    "if bad:",
    "    print('ROUNDTRIP FAILED for: ' + json.dumps(bad)); sys.exit(3)",
    "print('OK ' + str(len(cases)) + ' cases')",
  ].join("\n");

  let out;
  try {
    out = execFileSync(py, ["-c", driver, routesPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    const msg = (e.stdout ? e.stdout.toString() : "") + (e.stderr ? e.stderr.toString() : "");
    throw new Error(`round-trip driver failed:\n${msg.trim()}`);
  }
  if (!/^OK \d+ cases/m.test(out)) throw new Error(`unexpected driver output: ${out.trim()}`);
});

// (gg) FRONTMATTER ROUND-TRIP is NON-VACUOUS (self-check of (ff)'s falsifiability):
//      Prove the driver actually FAILS when the unescaping is reverted, by running the same
//      helpers with `_unescape_fm_double_quoted` stubbed to identity (the pre-FIX-2 behavior).
//      If this "reverted" variant still passed, (ff) would be vacuous. It must report failure.
behaviorCase("(gg) round-trip test is falsifiable (reverting FIX 2 makes it fail)", () => {
  const py = resolvePython();
  if (!py) throw new Error("no Python interpreter found");
  const routesPath = join(repoRoot, "backend", "routes.py");
  const driver = [
    "import ast, sys, json",
    "src = open(sys.argv[1], encoding='utf-8').read()",
    "want = {'_parse_role_md','_fm_scalar_needs_quote','_emit_fm_scalar','_unescape_fm_double_quoted','_serialize_role_md','_role_roundtrip_ok'}",
    "segs=[ast.get_source_segment(src,n) for n in ast.parse(src).body if isinstance(n,ast.FunctionDef) and n.name in want]",
    "ns={}",
    "exec('from typing import Any\\n' + '\\n\\n'.join(segs), ns)",
    // Simulate the pre-fix parser: unescaping becomes a no-op (identity).
    "ns['_unescape_fm_double_quoted']=lambda v: v",
    // Rebuild _parse_role_md so it uses the stubbed unescape from ns:
    "exec(ast.get_source_segment(src,[n for n in ast.parse(src).body if isinstance(n,ast.FunctionDef) and n.name=='_parse_role_md'][0]), ns)",
    // Cases chosen to FORCE quoting (a colon / leading quote makes _fm_scalar_needs_quote true),
    // so the emitter actually escapes and the reverted parser's missing unescape truly breaks.
    "cases=['a: said \\\"hi\\\"','\\\"lead quote','has: back\\\\slash']",
    "roundtrips=True",
    "for c in cases:",
    "    role={'name':'x','display_name':'','description':c,'body':'\\nB\\n','extra':{}}",
    "    text=ns['_serialize_role_md'](role)",
    "    if ns['_parse_role_md'](text)['description']!=c:",
    "        roundtrips=False",
    "print('REVERTED_ROUNDTRIPS' if roundtrips else 'REVERTED_BROKEN')",
  ].join("\n");
  let out;
  try {
    out = execFileSync(py, ["-c", driver, routesPath], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    throw new Error("falsifiability driver errored: " + ((e.stdout || "") + (e.stderr || "")).toString());
  }
  if (!/REVERTED_BROKEN/.test(out)) {
    throw new Error(
      "reverting the unescape did NOT break the round-trip — (ff) would be vacuous. Output: " + out.trim(),
    );
  }
});

// (hh) DELETE-VERIFICATION CONTRACT (guards FIX 1): the role delete branch in ui/src/App.tsx must
//      confirm deletion ONLY on explicit absence, and must NOT treat a thrown error or a bare null
//      as a successful delete. The UI TypeScript is not unit-runnable in this Node harness, so we
//      assert the SOURCE CONTRACT of saveRole's delete branch directly (a real, executable check —
//      it reads the shipped source and fails if the permissive patterns return).
//
//      Falsifiable: reverting FIX 1 reintroduces `if (!got || ... exists === false)` and/or a
//      `catch { confirmed = { ... deleted: true } }` in the delete branch, which this test rejects.
behaviorCase("(hh) role delete confirms only on explicit absence (App.tsx contract)", () => {
  const appPath = join(repoRoot, "ui", "src", "App.tsx");
  if (!existsSync(appPath)) throw new Error(`missing ${appPath}`);
  const src = readFileSync(appPath, "utf8");

  // Isolate the delete branch: from `if (isDelete) {` to the `} else {` that begins the create/edit
  // verification branch inside saveRole.
  const start = src.indexOf("if (isDelete) {");
  if (start === -1) throw new Error("could not locate the isDelete branch in saveRole");
  const elseAt = src.indexOf("} else {", start);
  if (elseAt === -1) throw new Error("could not locate the end of the isDelete branch");
  const branch = src.slice(start, elseAt);

  // 1) The bare-null-as-deletion pattern must be gone. Pre-fix code confirmed on `!got`.
  if (/if\s*\(\s*!got\b/.test(branch)) {
    throw new Error("delete branch still confirms on a bare null single-role response (`if (!got ...)`)");
  }
  // 2) A catch block must NOT set a confirmed/deleted success. Pre-fix code did
  //    `catch { confirmed = { ... deleted: true } }`.
  const catchBlocks = branch.match(/catch\s*(?:\([^)]*\))?\s*\{[\s\S]*?\}/g) || [];
  for (const cb of catchBlocks) {
    if (/confirmed\s*=/.test(cb) && /deleted:\s*true/.test(cb)) {
      throw new Error("delete branch treats a thrown error as a successful delete (catch sets deleted:true)");
    }
  }
  // 3) Positive contract: confirmation must be predicated on an explicit-absence signal —
  //    an `exists === false` body OR absence from a well-formed listing (`!stillThere`/`!found`).
  const hasExplicitAbsence =
    /exists\s*===\s*false/.test(branch) &&
    /(?:!\s*stillThere|!\s*found|!\s*\w*[Ss]tillThere)/.test(branch);
  if (!hasExplicitAbsence) {
    throw new Error(
      "delete branch no longer predicates confirmation on explicit absence (exists===false AND listing-absence)",
    );
  }
});

// (ii) DELETE-VERIFICATION rejects an ERRORED role listing as deletion proof (guards FIX 1's
//      listing-absence fallback): the backend emits `{ scope, roles: [], error: "..." }` when
//      directory enumeration fails (permissions/I/O). An empty roles array under an `error` must
//      NOT read as "role absent" — otherwise an unconfirmed delete PLUS a failed listing would
//      falsely confirm a delete while the file still exists. The delete branch's listing-absence
//      path must require the scoped source to be ERROR-FREE before treating it as authoritative.
//
//      Falsifiable: removing the `!src.error` guard (back to `if (src && Array.isArray(src.roles))`)
//      makes this test FAIL. Verified by temporarily reverting the guard.
behaviorCase("(ii) role delete rejects an errored listing as deletion proof (App.tsx contract)", () => {
  const appPath = join(repoRoot, "ui", "src", "App.tsx");
  if (!existsSync(appPath)) throw new Error(`missing ${appPath}`);
  const src = readFileSync(appPath, "utf8");

  const start = src.indexOf("if (isDelete) {");
  if (start === -1) throw new Error("could not locate the isDelete branch in saveRole");
  const elseAt = src.indexOf("} else {", start);
  if (elseAt === -1) throw new Error("could not locate the end of the isDelete branch");
  const branch = src.slice(start, elseAt);

  // Locate the listing-absence guard: the `if (src && ...)` condition that gates
  // reading src.roles for a `stillThere` check within the delete branch.
  const guardMatch = branch.match(/if\s*\(\s*src\s*&&[\s\S]*?\)\s*\{[\s\S]*?stillThere/);
  if (!guardMatch) {
    throw new Error("could not locate the scoped-source listing-absence guard in the delete branch");
  }
  const guard = guardMatch[0];
  // The guard MUST reject a source carrying an `error` (e.g. `!src.error` / `!src?.error`
  // / `src.error == null`). Without it, `{ scope, roles: [], error }` reads as absence.
  const guardsAgainstError =
    /!\s*src\??\.error\b/.test(guard) ||
    /src\??\.error\s*(?:==|===)\s*(?:null|undefined)/.test(guard) ||
    /!\s*\w*[Ee]rror\b/.test(guard.replace(/\.some[\s\S]*$/, ""));
  if (!guardsAgainstError) {
    throw new Error(
      "delete branch treats an errored role listing ({ scope, roles: [], error }) as deletion proof — " +
        "the scoped-source absence guard must require the source to be error-free (e.g. `!src.error`)",
    );
  }
});

// --- report ---
const total = passed + failed;
if (failed) {
  console.error(`✗ validator tests: ${passed}/${total} passed, ${failed} failed`);
  process.exit(1);
}
console.log(`✓ validator tests: ${passed}/${total} passed`);
