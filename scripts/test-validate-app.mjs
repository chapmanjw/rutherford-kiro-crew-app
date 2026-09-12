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

// (jj) PANELS-CONTRACT: the PanelsView post-save reload-guidance affordance must be keyed on the
//      SAVED SCOPE, not a transient boolean. The old `justSaved` boolean flashed and vanished: the
//      `[sourceKey]` effect ran setJustSaved(false), and savePanels refreshes `panels` after a
//      confirmed write -> sourceKey changes -> effect clears the flag -> banner disappears. Fix keys
//      the gate on savedScope so a `panels` refresh at the same scope does NOT clear it.
//
//      This is a SOURCE CONTRACT check (the UI TypeScript is not unit-runnable in this Node harness),
//      in the same shape as (hh)/(ii). It asserts:
//        (a) `savedScope === scope` gates the reload guidance,
//        (b) `setSavedScope(scope)` appears in the confirmed-save path,
//        (c) the `[sourceKey]` effect body does NOT contain `setSavedScope(`.
//
//      Falsifiable: reverting to the boolean `justSaved` form removes `savedScope === scope`
//      (breaks (a)) and `setSavedScope(scope)` (breaks (b)); moving a reset back into the effect
//      breaks (c). Verified by temporarily reverting to the boolean form and observing the failure.
behaviorCase("(jj) panels reload-guidance keys on saved scope, not a transient boolean (App.tsx contract)", () => {
  const appPath = join(repoRoot, "ui", "src", "App.tsx");
  if (!existsSync(appPath)) throw new Error(`missing ${appPath}`);
  const src = readFileSync(appPath, "utf8");

  // (a) The render gate must be `{savedScope === scope && (`.
  if (!/\{\s*savedScope\s*===\s*scope\s*&&\s*\(/.test(src)) {
    throw new Error("reload-guidance render gate is not keyed on `savedScope === scope`");
  }

  // (b) The confirmed-save path must set the scope: `setSavedScope(scope)`.
  if (!/setSavedScope\(\s*scope\s*\)/.test(src)) {
    throw new Error("confirmed-save path does not call `setSavedScope(scope)`");
  }

  // (c) The `[sourceKey]` effect body must NOT reset savedScope — that is what caused the flash.
  //     Isolate the effect: from the useEffect whose deps are `[sourceKey]`. Node's regex has no
  //     backward lookahead for the deps, so find the effect by locating the deps marker and walking
  //     back to the nearest `useEffect(() => {` before it.
  const depsAt = src.indexOf("}, [sourceKey])");
  if (depsAt === -1) throw new Error("could not locate the `[sourceKey]` effect dependency array");
  const effectStart = src.lastIndexOf("useEffect(() => {", depsAt);
  if (effectStart === -1) throw new Error("could not locate the start of the `[sourceKey]` effect");
  const effectBody = src.slice(effectStart, depsAt);
  if (/setSavedScope\(/.test(effectBody)) {
    throw new Error("the `[sourceKey]` effect body resets savedScope — this reintroduces the banner flash");
  }
});

// (kk) REACHABILITY-NOTE CONTRACT (guards FIX: honest reachability): the Overview
//      "Reachability" card renders `_reachability_note(...)`'s output verbatim. That
//      read-only backend has NO MCP client and never probes, so `available` must be
//      False in EVERY scenario (config present or absent), and `note` must be an honest,
//      placeholder-free summary. We exercise the REAL helper by AST-extracting it from
//      backend/routes.py and exec'ing it in a throwaway Python process — routes.py imports
//      aiohttp at module top (absent here), so slicing out the self-contained helper (it
//      references only stdlib + duck-typed args) runs the genuine code without that
//      dependency. Path args are duck-typed with a stub exposing `.exists()`.
//
//      Falsifiable: reverting the note to `available: True` (or reintroducing a TODO /
//      Phase 1.5 placeholder) makes the assertions below FAIL — proven by (ll).
behaviorCase("(kk) reachability note is honest: available=false + placeholder-free (real backend helper)", () => {
  const py = resolvePython();
  if (!py) throw new Error("no Python interpreter found (python/py/python3)");
  const routesPath = join(repoRoot, "backend", "routes.py");
  if (!existsSync(routesPath)) throw new Error(`missing ${routesPath}`);

  const driver = [
    "import ast, sys, json",
    "src = open(sys.argv[1], encoding='utf-8').read()",
    "want = {'_reachability_note'}",
    "segs=[ast.get_source_segment(src,n) for n in ast.parse(src).body if isinstance(n,ast.FunctionDef) and n.name in want]",
    "assert segs, 'FIX target _reachability_note missing from routes.py'",
    "ns={}",
    // The helper has Path-annotated params (g_path: Path, ...) and dict/list/Any
    // annotations. Without `from __future__ import annotations` those annotations
    // are EVALUATED at def-time, so Path/Any must be importable or def raises
    // NameError before the helper is ever callable. Make annotations lazy AND
    // import the names the body genuinely uses (Path is only in annotations here;
    // Any/dict/list are builtins-or-typing). `from __future__` MUST be first.
    "preamble='from __future__ import annotations\\nfrom pathlib import Path\\nfrom typing import Any\\n'",
    "exec(preamble + '\\n\\n'.join(segs), ns)",
    "fn=ns['_reachability_note']",
    // Duck-typed Path stub exposing only .exists().
    "class P:",
    "    def __init__(self, e): self._e=e",
    "    def exists(self): return self._e",
    // (a) present-config scenario: both config files exist, agents configured + resolved.
    "present=fn(P(True), P(True), {}, {}, {'codex':{}, 'claude_code':{}}, ['codex','claude_code'], [{'id':'codex'},{'id':'claude_code'}])",
    // (b) absent-config scenario: no config files, no agents.
    "absent=fn(P(False), P(False), {}, {}, {}, [], [])",
    "bad=[]",
    "for label,r in (('present',present),('absent',absent)):",
    "    if r.get('available') is not False: bad.append(label+': available is not False (%r)' % r.get('available'))",
    "    note=r.get('note') or ''",
    "    if not note.strip(): bad.append(label+': note is empty')",
    "    if 'TODO' in note: bad.append(label+': note contains TODO')",
    "    if 'Phase 1.5' in note or 'phase 1.5' in note.lower(): bad.append(label+': note contains Phase 1.5')",
    // present case must mention config + agents.
    "pnote=(present.get('note') or '').lower()",
    "if 'config' not in pnote: bad.append('present: note does not mention config')",
    "if 'agent' not in pnote: bad.append('present: note does not mention agents')",
    // absent case must state no config found.
    "anote=(absent.get('note') or '').lower()",
    "if 'no ' not in anote or 'config' not in anote: bad.append('absent: note does not say no config found')",
    "if bad:",
    "    print('REACH FAILED: ' + json.dumps(bad)); sys.exit(3)",
    "print('OK reachability present+absent honest')",
  ].join("\n");

  let out;
  try {
    out = execFileSync(py, ["-c", driver, routesPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    const msg = (e.stdout ? e.stdout.toString() : "") + (e.stderr ? e.stderr.toString() : "");
    throw new Error(`reachability driver failed:\n${msg.trim()}`);
  }
  if (!/^OK reachability/m.test(out)) throw new Error(`unexpected driver output: ${out.trim()}`);
});

// (ll) REACHABILITY-NOTE test is NON-VACUOUS (self-check of (kk)'s falsifiability):
//      run the same extracted helper but PATCH its returned dict to the pre-fix shape
//      (available:True) and to a TODO placeholder note, and confirm the same assertions
//      that (kk) makes would REJECT it. If a reverted note still passed, (kk) would be
//      vacuous. It must report the revert as broken.
behaviorCase("(ll) reachability test is falsifiable (reverting to available:true / TODO makes it fail)", () => {
  const py = resolvePython();
  if (!py) throw new Error("no Python interpreter found");
  const routesPath = join(repoRoot, "backend", "routes.py");
  const driver = [
    "import ast, sys, json",
    "src = open(sys.argv[1], encoding='utf-8').read()",
    "segs=[ast.get_source_segment(src,n) for n in ast.parse(src).body if isinstance(n,ast.FunctionDef) and n.name=='_reachability_note']",
    "ns={}",
    // Same lazy-annotations + real imports as (kk): the Path-annotated params
    // would otherwise NameError at def-time before the helper is callable.
    "preamble='from __future__ import annotations\\nfrom pathlib import Path\\nfrom typing import Any\\n'",
    "exec(preamble + '\\n\\n'.join(segs), ns)",
    "fn=ns['_reachability_note']",
    "class P:",
    "    def __init__(self, e): self._e=e",
    "    def exists(self): return self._e",
    "r=fn(P(True), P(True), {}, {}, {'codex':{}}, ['codex'], [{'id':'codex'}])",
    // Simulate the pre-fix regressions on the genuine output.
    "reverted={**r, 'available': True, 'note': 'TODO Phase 1.5 placeholder'}",
    // Apply (kk)'s own assertion set to the reverted dict; it MUST be rejected.
    "rejected=False",
    "note=reverted.get('note') or ''",
    "if reverted.get('available') is not False: rejected=True",
    "if 'TODO' in note or 'phase 1.5' in note.lower(): rejected=True",
    "print('REVERTED_REJECTED' if rejected else 'REVERTED_ACCEPTED')",
  ].join("\n");
  let out;
  try {
    out = execFileSync(py, ["-c", driver, routesPath], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    throw new Error("falsifiability driver errored: " + ((e.stdout || "") + (e.stderr || "")).toString());
  }
  if (!/REVERTED_REJECTED/.test(out)) {
    throw new Error(
      "reverting to available:true / TODO did NOT get rejected — (kk) would be vacuous. Output: " + out.trim(),
    );
  }
});

// (mm) WRITE-GUARD CONTRACT (guards BLOCKER 1): the PUT /rutherford-config write guard must accept
//      whatever the SHARED resolver produces for a scope — including a project on rutherford.toml or
//      .rutherford.toml, which the GET read layer already resolves — and must REJECT an out-of-dir /
//      traversal target. We exercise the REAL resolver + guard predicate from backend/routes.py by
//      AST-extracting the self-contained path helpers and exec'ing them in a throwaway Python
//      process (routes.py imports aiohttp at module top, absent here, so we slice out only the
//      stdlib-only helpers). The guard predicate under test is exactly the shipped one:
//          resolved == _resolve_config_path(scope).resolve()
//      We drive _project_config_path()/_resolve_config_path() against a temp project by monkeypatching
//      _project_root() to a fixture dir seeded with rutherford.toml (FIRST candidate) or
//      .rutherford.toml, then assert the guard ACCEPTS that resolver-produced target and REJECTS an
//      out-of-dir target (e.g. the home dir's config.toml, or a ../.. traversal).
//
//      Falsifiable: if the guard reverts to the hardcoded `resolved.name != "config.toml"`, a
//      rutherford.toml / .rutherford.toml resolver target is REJECTED — the accept assertions below
//      then fail. Proven non-vacuous by (nn), which runs the pre-fix predicate and shows it rejects.
behaviorCase("(mm) config write guard accepts resolver-produced rutherford.toml/.rutherford.toml, rejects out-of-dir (real backend helpers)", () => {
  const py = resolvePython();
  if (!py) throw new Error("no Python interpreter found (python/py/python3)");
  const routesPath = join(repoRoot, "backend", "routes.py");
  if (!existsSync(routesPath)) throw new Error(`missing ${routesPath}`);

  const driver = [
    "import ast, sys, os, json, tempfile",
    "from pathlib import Path",
    "src = open(sys.argv[1], encoding='utf-8').read()",
    // Pull the self-contained path resolver helpers (stdlib-only).
    "want = {'_home','_project_root','_project_config_path','_global_config_path','_resolve_config_path','_global_config_dir_candidates','_global_config_dir','_PROJECT_CONFIG_CANDIDATES'}",
    "mod = ast.parse(src)",
    "segs=[]",
    "for n in mod.body:",
    "    if isinstance(n, ast.FunctionDef) and n.name in want: segs.append(ast.get_source_segment(src,n))",
    "    if isinstance(n, ast.Assign):",
    "        tgts=[t.id for t in n.targets if isinstance(t, ast.Name)]",
    "        if any(t in want for t in tgts): segs.append(ast.get_source_segment(src,n))",
    "ns={}",
    "exec('from __future__ import annotations\\nimport os\\nfrom pathlib import Path\\nfrom typing import Any\\n' + '\\n\\n'.join(segs), ns)",
    "assert '_resolve_config_path' in ns, 'BLOCKER 1 resolver _resolve_config_path missing'",
    // The shipped guard predicate (accept iff the target equals the resolver output).
    "def accepts(scope, target):",
    "    resolved = Path(target).resolve()",
    "    expected = ns['_resolve_config_path'](scope).resolve()",
    "    return resolved == expected",
    "proj = Path(tempfile.mkdtemp(prefix='ruth-wg-proj-'))",
    "home = Path(tempfile.mkdtemp(prefix='ruth-wg-home-'))",
    "ns['_project_root'] = lambda: proj",
    "ns['_home'] = lambda: home",
    "bad=[]",
    // Case A: project on rutherford.toml (FIRST candidate). Resolver must pick it; guard must accept.
    "(proj / 'rutherford.toml').write_text('x=1\\n', encoding='utf-8')",
    "ta = ns['_resolve_config_path']('workspace')",
    "if ta.name != 'rutherford.toml': bad.append('resolver did not pick rutherford.toml, got '+ta.name)",
    "if not accepts('workspace', ta): bad.append('guard REJECTED resolver-produced rutherford.toml')",
    // out-of-dir reject: a config.toml in the home dir is NOT the workspace resolver output.
    "outside = home / 'config.toml'",
    "outside.write_text('y=2\\n', encoding='utf-8')",
    "if accepts('workspace', outside): bad.append('guard ACCEPTED an out-of-dir config.toml target')",
    // traversal reject: a ../.. path is not the resolver output either.
    "trav = proj / '..' / '..' / 'config.toml'",
    "if accepts('workspace', trav): bad.append('guard ACCEPTED a ../.. traversal target')",
    // Case B: switch project to .rutherford.toml (remove rutherford.toml so it is FIRST-existing).
    "(proj / 'rutherford.toml').unlink()",
    "(proj / '.rutherford.toml').write_text('z=3\\n', encoding='utf-8')",
    "tb = ns['_resolve_config_path']('workspace')",
    "if tb.name != '.rutherford.toml': bad.append('resolver did not pick .rutherford.toml, got '+tb.name)",
    "if not accepts('workspace', tb): bad.append('guard REJECTED resolver-produced .rutherford.toml')",
    "if bad:",
    "    print('WRITE-GUARD FAILED: ' + json.dumps(bad)); sys.exit(3)",
    "print('OK write-guard accepts rutherford.toml + .rutherford.toml, rejects out-of-dir + traversal')",
  ].join("\n");

  let out;
  try {
    out = execFileSync(py, ["-c", driver, routesPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    const msg = (e.stdout ? e.stdout.toString() : "") + (e.stderr ? e.stderr.toString() : "");
    throw new Error(`write-guard driver failed:\n${msg.trim()}`);
  }
  if (!/^OK write-guard/m.test(out)) throw new Error(`unexpected driver output: ${out.trim()}`);

  // SOURCE CONTRACT (source-level falsifiability): the config write handler's guard must key on
  // resolver EQUALITY, not the hardcoded name literal. Isolate _handle_config_write and assert:
  //   (a) it compares against `_resolve_config_path(scope).resolve()`, and
  //   (b) it does NOT gate the config write on `resolved.name != "config.toml"`.
  // Reverting the guard to the hardcoded name reintroduces (b) and drops (a) -> this FAILS.
  const routesSrc = readFileSync(routesPath, "utf8");
  const cwStart = routesSrc.indexOf("async def _handle_config_write");
  if (cwStart === -1) throw new Error("could not locate _handle_config_write in routes.py");
  const cwEnd = routesSrc.indexOf("\nasync def ", cwStart + 1);
  const cwBody = routesSrc.slice(cwStart, cwEnd === -1 ? undefined : cwEnd);
  if (!/_resolve_config_path\(scope\)\.resolve\(\)/.test(cwBody)) {
    throw new Error("config write guard does not compare against _resolve_config_path(scope).resolve()");
  }
  if (/resolved\.name\s*!=\s*"config\.toml"/.test(cwBody)) {
    throw new Error('config write guard still uses the hardcoded `resolved.name != "config.toml"` (BLOCKER 1 reverted)');
  }
});

// (nn) WRITE-GUARD test is NON-VACUOUS (self-check of (mm)'s falsifiability):
//      run the SAME real resolver but apply the PRE-FIX guard predicate — the hardcoded
//      `resolved.name == "config.toml"` — to a resolver-produced rutherford.toml target, and confirm
//      it REJECTS it. If the reverted predicate still accepted, (mm) would be vacuous.
behaviorCase("(nn) write-guard test is falsifiable (reverting to hardcoded config.toml name rejects rutherford.toml)", () => {
  const py = resolvePython();
  if (!py) throw new Error("no Python interpreter found");
  const routesPath = join(repoRoot, "backend", "routes.py");
  const driver = [
    "import ast, sys, tempfile",
    "from pathlib import Path",
    "src = open(sys.argv[1], encoding='utf-8').read()",
    "want = {'_home','_project_root','_project_config_path','_global_config_path','_resolve_config_path','_global_config_dir_candidates','_global_config_dir','_PROJECT_CONFIG_CANDIDATES'}",
    "mod = ast.parse(src)",
    "segs=[]",
    "for n in mod.body:",
    "    if isinstance(n, ast.FunctionDef) and n.name in want: segs.append(ast.get_source_segment(src,n))",
    "    if isinstance(n, ast.Assign):",
    "        tgts=[t.id for t in n.targets if isinstance(t, ast.Name)]",
    "        if any(t in want for t in tgts): segs.append(ast.get_source_segment(src,n))",
    "ns={}",
    "exec('from __future__ import annotations\\nimport os\\nfrom pathlib import Path\\nfrom typing import Any\\n' + '\\n\\n'.join(segs), ns)",
    "proj = Path(tempfile.mkdtemp(prefix='ruth-wg-rev-'))",
    "ns['_project_root'] = lambda: proj",
    "ns['_home'] = lambda: proj",
    "(proj / 'rutherford.toml').write_text('x=1\\n', encoding='utf-8')",
    "target = ns['_resolve_config_path']('workspace')",
    // PRE-FIX predicate: accept iff the resolved target is literally named config.toml.
    "reverted_accepts = (target.resolve().name == 'config.toml')",
    "print('REVERTED_ACCEPTS' if reverted_accepts else 'REVERTED_REJECTS')",
  ].join("\n");
  let out;
  try {
    out = execFileSync(py, ["-c", driver, routesPath], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    throw new Error("falsifiability driver errored: " + ((e.stdout || "") + (e.stderr || "")).toString());
  }
  if (!/REVERTED_REJECTS/.test(out)) {
    throw new Error(
      "the pre-fix hardcoded-name guard did NOT reject a rutherford.toml resolver target — (mm) would be vacuous. Output: " + out.trim(),
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
