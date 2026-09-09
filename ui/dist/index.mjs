import { jsxs as r, Fragment as p, jsx as e } from "react/jsx-runtime";
import { useAppApi as V } from "@kirocrew/app-sdk";
import { PageHeader as T, StatCard as h, Card as i, CardTitle as d } from "@kirocrew/app-sdk/ui";
import { useState as o, useCallback as C, useEffect as z } from "react";
import { Boxes as B, FileCog as j, Layers as F, UserSquare as O, RefreshCw as q, AlertTriangle as G } from "lucide-react";
const u = "/api/apps/rutherford", H = [
  { id: "status", label: "Overview", icon: B },
  { id: "config", label: "Config", icon: j },
  { id: "panels", label: "Panels", icon: F },
  { id: "roles", label: "Roles", icon: O }
];
function m({ meta: t }) {
  return /* @__PURE__ */ r("div", { className: "text-xs text-muted mt-1", children: [
    /* @__PURE__ */ e("span", { className: "opacity-70", children: t.scope }),
    " · ",
    /* @__PURE__ */ e("code", { className: "text-xs", children: t.path }),
    " · ",
    /* @__PURE__ */ e("span", { className: t.exists ? "text-green-500" : "text-muted opacity-60", children: t.exists ? "found" : "not present" }),
    t.error && /* @__PURE__ */ r("span", { className: "text-amber-500", children: [
      " · ",
      t.error
    ] })
  ] });
}
function Y() {
  const t = V(), [s, a] = o("status"), [l, N] = o(!0), [v, f] = o(null), [y, S] = o(null), [x, R] = o("global"), [_, w] = o(null), [k, P] = o(null), [A, $] = o(null), g = C(async () => {
    N(!0), f(null);
    try {
      const [n, c, b, L] = await Promise.all([
        t.get(`${u}/status`),
        t.get(`${u}/config?scope=${x}`),
        t.get(`${u}/panels`),
        t.get(`${u}/roles`)
      ]);
      S(n), w(c), P(b), $(L);
    } catch (n) {
      f(n instanceof Error ? n.message : String(n));
    } finally {
      N(!1);
    }
  }, [t, x]);
  z(() => {
    g();
  }, [g]);
  const E = C(async (n) => {
    R(n);
    try {
      const c = await t.get(`${u}/config?scope=${n}`);
      w(c);
    } catch (c) {
      f(c instanceof Error ? c.message : String(c));
    }
  }, [t]);
  return /* @__PURE__ */ r(p, { children: [
    /* @__PURE__ */ e(T, { title: "Rutherford", subtitle: "Config & status — read-only (Phase 1)" }),
    /* @__PURE__ */ r("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ r("div", { className: "flex gap-1 mb-5 border-b border-[var(--border,#2a2a2a)]", children: [
        H.map(({ id: n, label: c, icon: b }) => /* @__PURE__ */ r(
          "button",
          {
            onClick: () => a(n),
            className: "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors " + (s === n ? "border-[var(--accent,#6366f1)] text-[var(--fg,#eee)]" : "border-transparent text-muted hover:text-[var(--fg,#eee)]"),
            children: [
              /* @__PURE__ */ e(b, { size: 15 }),
              c
            ]
          },
          n
        )),
        /* @__PURE__ */ e(
          "button",
          {
            onClick: () => void g(),
            className: "ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-[var(--fg,#eee)]",
            title: "Reload",
            children: /* @__PURE__ */ e(q, { size: 15, className: l ? "animate-spin" : "" })
          }
        )
      ] }),
      v && /* @__PURE__ */ r("div", { className: "flex items-center gap-2 text-sm text-amber-500 mb-4", children: [
        /* @__PURE__ */ e(G, { size: 15 }),
        " ",
        v
      ] }),
      l && !y ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "Loading…" }) : /* @__PURE__ */ r(p, { children: [
        s === "status" && /* @__PURE__ */ e(I, { status: y }),
        s === "config" && /* @__PURE__ */ e(J, { config: _, scope: x, onScope: E }),
        s === "panels" && /* @__PURE__ */ e(U, { panels: k }),
        s === "roles" && /* @__PURE__ */ e(W, { roles: A })
      ] })
    ] })
  ] });
}
function I({ status: t }) {
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No status." });
  const s = t.agents.enabled, a = t.agents.allowlist_configured ? String(s.length) : "All";
  return /* @__PURE__ */ r(p, { children: [
    /* @__PURE__ */ r("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mb-6", children: [
      /* @__PURE__ */ e(h, { label: "Platform", value: t.platform }),
      /* @__PURE__ */ e(h, { label: "Agents enabled", value: a, accent: !0 }),
      /* @__PURE__ */ e(h, { label: "Safety mode", value: t.defaults.safety_mode ?? "read_only" }),
      /* @__PURE__ */ e(
        h,
        {
          label: "Local model detect",
          value: t.defaults.auto_detect_local_models ? "on" : "off"
        }
      )
    ] }),
    /* @__PURE__ */ r(i, { children: [
      /* @__PURE__ */ e(d, { children: "Enabled agents / CLIs" }),
      t.agents.allowlist_configured ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-2", children: s.map((l) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          children: l
        },
        l
      )) }) : /* @__PURE__ */ r("p", { className: "text-sm text-muted mt-1", children: [
        "No ",
        /* @__PURE__ */ e("code", { children: "enabled_agents" }),
        " allowlist configured — Rutherford enables every built-in agent plus any configured agent (source: ",
        t.agents.enabled_source,
        ")."
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ r(i, { children: [
      /* @__PURE__ */ e(d, { children: "Config locations" }),
      /* @__PURE__ */ e(m, { meta: t.config_locations.global }),
      /* @__PURE__ */ e(m, { meta: t.config_locations.workspace })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ r(i, { children: [
      /* @__PURE__ */ e(d, { children: "Reachability" }),
      /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: t.reachability.note })
    ] })
  ] });
}
function J({
  config: t,
  scope: s,
  onScope: a
}) {
  return /* @__PURE__ */ r(p, { children: [
    /* @__PURE__ */ e("div", { className: "flex gap-1 mb-4", children: ["global", "workspace"].map((l) => /* @__PURE__ */ e(
      "button",
      {
        onClick: () => a(l),
        className: "px-3 py-1.5 text-sm rounded transition-colors " + (s === l ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
        children: l === "global" ? "Global" : "Workspace"
      },
      l
    )) }),
    t ? /* @__PURE__ */ r(i, { children: [
      /* @__PURE__ */ e(d, { children: "config.toml" }),
      /* @__PURE__ */ e(m, { meta: t }),
      t.error ? /* @__PURE__ */ e("p", { className: "text-sm text-amber-500 mt-2", children: t.error }) : t.exists ? /* @__PURE__ */ e("pre", { className: "text-xs mt-3 p-3 rounded bg-[var(--surface-2,#1e1e1e)] overflow-x-auto whitespace-pre-wrap", children: JSON.stringify(t.config, null, 2) }) : /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-2", children: "No config file at this scope. Rutherford runs with all defaults." })
    ] }) : /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No config." })
  ] });
}
function U({ panels: t }) {
  return t ? t.sources.reduce((a, l) => a + l.panels.length, 0) === 0 ? /* @__PURE__ */ r(i, { children: [
    /* @__PURE__ */ e(d, { children: "Named panels" }),
    /* @__PURE__ */ r("p", { className: "text-sm text-muted mt-1", children: [
      "No ",
      /* @__PURE__ */ e("code", { children: "panels.toon" }),
      " found. Checked:"
    ] }),
    t.sources.map((a) => /* @__PURE__ */ e(m, { meta: a }, a.path))
  ] }) : /* @__PURE__ */ e(p, { children: t.sources.map(
    (a) => a.panels.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ r(i, { children: [
      /* @__PURE__ */ r(d, { children: [
        "Panels · ",
        a.scope
      ] }),
      /* @__PURE__ */ e(m, { meta: a }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-col gap-2", children: a.panels.map((l) => /* @__PURE__ */ r(
        "div",
        {
          className: "p-3 rounded bg-[var(--surface-2,#1e1e1e)]",
          children: [
            /* @__PURE__ */ r("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ e("span", { className: "text-sm font-medium text-[var(--fg,#eee)]", children: l.name }),
              l.strategy && /* @__PURE__ */ e("span", { className: "px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-3,#333)] text-muted", children: l.strategy }),
              l.targets != null && /* @__PURE__ */ r("span", { className: "text-[10px] text-muted", children: [
                l.targets,
                " voices"
              ] })
            ] }),
            l.description && /* @__PURE__ */ e("p", { className: "text-xs text-muted mt-1", children: l.description })
          ]
        },
        l.name
      )) })
    ] }) }, a.path)
  ) }) : /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No panels." });
}
function W({ roles: t }) {
  return t ? t.sources.reduce((a, l) => a + l.roles.length, 0) === 0 ? /* @__PURE__ */ r(i, { children: [
    /* @__PURE__ */ e(d, { children: "Roles" }),
    /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: "No role markdown files found. Checked:" }),
    t.sources.map((a) => /* @__PURE__ */ e(m, { meta: a }, a.path))
  ] }) : /* @__PURE__ */ e(p, { children: t.sources.map(
    (a) => a.roles.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ r(i, { children: [
      /* @__PURE__ */ r(d, { children: [
        "Roles · ",
        a.scope
      ] }),
      /* @__PURE__ */ e(m, { meta: a }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: a.roles.map((l) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-1 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          title: l.path,
          children: l.name
        },
        l.path
      )) })
    ] }) }, a.path)
  ) }) : /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No roles." });
}
export {
  Y as default
};
