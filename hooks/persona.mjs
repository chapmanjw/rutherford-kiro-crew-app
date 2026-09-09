#!/usr/bin/env node
// Persona hook for the Rutherford plugin. One script, three modes (selected by argv[2]):
//
//   (no arg)          PostToolUse  — fires after any Rutherford MCP tool runs (matcher
//                                    mcp__.*rutherford.* in hooks/hooks.json) and injects the persona
//                                    next to the tool result, so Claude narrates it in Sam's voice.
//   UserPromptSubmit  UserPromptSubmit — fires on every prompt and injects a self-gating note: be Sam
//                                    only when the turn is about Rutherford, otherwise ignore it. This
//                                    covers plain Q&A about Rutherford that never calls a tool.
//   SessionStart      SessionStart — fires when a session begins. Reads the hook input on stdin and,
//                                    ONLY on a fresh startup (source === "startup") with the
//                                    rutherford-orchestrator agent active (agent_type), shows the banner
//                                    to the user as a systemMessage. This is the bundled stand-in for the
//                                    agent's initialPrompt, which plugin-shipped agents do not honor.
//                                    Stays silent for every other agent and for resume/clear/compact, so
//                                    it banners once at launch and never re-banners mid-work.
//
// It always prints valid JSON and exits 0, so a hiccup here can never block a tool call or a prompt.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hooksDir = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2];

/** Write one JSON payload and exit 0 once stdout is fully flushed. */
function emit(obj) {
  process.stdout.write(JSON.stringify(obj), () => process.exit(0));
}

/** Read a bundled text file, falling back to a built-in string if it is missing. */
function readText(file, fallback) {
  try {
    return readFileSync(join(hooksDir, file), "utf8").trimEnd();
  } catch {
    return fallback;
  }
}

/** SessionStart: show the banner to the user only when our orchestrator is the active agent. */
function runSessionStart() {
  // The hook input arrives as JSON on stdin. It carries `agent_type` (the active --agent name, present
  // only when one was selected) and `source` (startup | resume | clear | compact).
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    // No or unreadable stdin: stay silent rather than banner the wrong session.
    return emit({});
  }
  const agentType = String(input.agent_type ?? "");
  const source = String(input.source ?? "");
  // Substring match because the exact agent_type for a plugin agent (bare vs. scoped like
  // "rutherford:rutherford-orchestrator") is not documented. Fire only on a fresh startup: skip
  // resume, clear, and compact so the banner shows once at launch, not on every resume or an automatic
  // /compact mid-session.
  const isOrchestrator = agentType.includes("rutherford-orchestrator");
  if (!isOrchestrator || source !== "startup") {
    return emit({});
  }
  // Lead with a newline: Claude Code renders a SessionStart systemMessage on the same line as its
  // "SessionStart:startup says:" prefix, so the break drops the banner onto its own line.
  const banner = readText(
    "persona-session.md",
    "\nEnsign Sam Rutherford reporting for duty! Modes: delegate / consensus / debate / review / plan " +
      "(read-only by default). Describe the task or name a mode.",
  );
  return emit({ systemMessage: banner });
}

if (mode === "SessionStart") {
  runSessionStart();
} else {
  const isPrompt = mode === "UserPromptSubmit";
  const hookEventName = isPrompt ? "UserPromptSubmit" : "PostToolUse";
  const textFile = isPrompt ? "persona-prompt.md" : "persona-injection.md";

  // Minimal fallbacks so the hook still emits valid JSON if the injection text is missing.
  const FALLBACK = isPrompt
    ? "If this turn is about Rutherford (using it, configuring it, or asking what it does), respond as " +
      "Ensign Sam Rutherford (USS Cerritos engineering, Star Trek: Lower Decks) in Claude form: a cheery, " +
      "eager, crew-first engineer. Otherwise ignore this note. The persona never softens a failed check " +
      "or a real warning."
    : "Report this Rutherford result as Ensign Sam Rutherford (USS Cerritos engineering, Star Trek: " +
      "Lower Decks) in Claude form: a cheery, eager, crew-first engineer. The persona is flavor on top of " +
      "accurate, honest work and never softens a failed check or a real warning.";

  const additionalContext = readText(textFile, FALLBACK);
  emit({ hookSpecificOutput: { hookEventName, additionalContext } });
}
