import { jsxs as l, Fragment as A, jsx as e } from "react/jsx-runtime";
import { useAppApi as K } from "@kirocrew/app-sdk";
import { PageHeader as q, StatCard as z, Card as _, CardTitle as b } from "@kirocrew/app-sdk/ui";
import { useState as v, useCallback as P, useEffect as T } from "react";
import G from "lucide-react";
const {
  Box: H,
  FileCog: I,
  Layers: U,
  UserSquare: W,
  RefreshCw: X,
  AlertTriangle: D,
  Save: Y,
  Plus: O,
  X: B,
  CheckCircle2: J,
  Server: Q
} = G, S = "/api/apps/rutherford", Z = [
  { id: "status", label: "Overview", icon: H },
  { id: "config", label: "Config", icon: I },
  { id: "panels", label: "Panels", icon: U },
  { id: "roles", label: "Roles", icon: W }
], ee = ["read_only", "propose", "write", "yolo"], te = ["ephemeral", "job"];
function w({ meta: t }) {
  return /* @__PURE__ */ l("div", { className: "text-xs text-muted mt-1", children: [
    /* @__PURE__ */ e("span", { className: "opacity-70", children: t.scope }),
    " · ",
    /* @__PURE__ */ e("code", { className: "text-xs", children: t.path }),
    " · ",
    /* @__PURE__ */ e("span", { className: t.exists ? "text-green-500" : "text-muted opacity-60", children: t.exists ? "found" : "not present" }),
    t.error && /* @__PURE__ */ l("span", { className: "text-amber-500", children: [
      " · ",
      t.error
    ] })
  ] });
}
function fe() {
  const t = K(), [a, i] = v("status"), [r, n] = v(!0), [c, o] = v(null), [u, d] = v(null), [h, f] = v("global"), [m, s] = v(null), [p, y] = v(null), [x, V] = v(null), E = P(async () => {
    n(!0), o(null);
    try {
      const [g, N, k, $] = await Promise.all([
        t.get(`${S}/status`),
        t.get(`${S}/config?scope=${h}`),
        t.get(`${S}/panels`),
        t.get(`${S}/roles`)
      ]);
      d(g), s(N), y(k), V($);
    } catch (g) {
      o(g instanceof Error ? g.message : String(g));
    } finally {
      n(!1);
    }
  }, [t, h]);
  T(() => {
    E();
  }, [E]);
  const F = P(async (g) => {
    f(g);
    try {
      const N = await t.get(`${S}/config?scope=${g}`);
      s(N);
    } catch (N) {
      o(N instanceof Error ? N.message : String(N));
    }
  }, [t]), M = P(
    async (g, N) => {
      const k = await t.put(`${S}/config?scope=${g}`, N);
      s(k);
      try {
        const $ = await t.get(`${S}/status`);
        d($);
      } catch {
      }
      return k;
    },
    [t]
  );
  return /* @__PURE__ */ l(A, { children: [
    /* @__PURE__ */ e(q, { title: "Rutherford", subtitle: "Config & status — config.toml editing (Phase 2)" }),
    /* @__PURE__ */ l("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ l("div", { className: "flex gap-1 mb-5 border-b border-[var(--border,#2a2a2a)]", children: [
        Z.map(({ id: g, label: N, icon: k }) => /* @__PURE__ */ l(
          "button",
          {
            onClick: () => i(g),
            className: "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors " + (a === g ? "border-[var(--accent,#6366f1)] text-[var(--fg,#eee)]" : "border-transparent text-muted hover:text-[var(--fg,#eee)]"),
            children: [
              /* @__PURE__ */ e(k, { size: 15 }),
              N
            ]
          },
          g
        )),
        /* @__PURE__ */ e(
          "button",
          {
            onClick: () => void E(),
            className: "ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-[var(--fg,#eee)]",
            title: "Reload",
            children: /* @__PURE__ */ e(X, { size: 15, className: r ? "animate-spin" : "" })
          }
        )
      ] }),
      c && /* @__PURE__ */ l("div", { className: "flex items-center gap-2 text-sm text-amber-500 mb-4", children: [
        /* @__PURE__ */ e(D, { size: 15 }),
        " ",
        c
      ] }),
      r && !u ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "Loading…" }) : /* @__PURE__ */ l(A, { children: [
        a === "status" && /* @__PURE__ */ e(ae, { status: u }),
        a === "config" && /* @__PURE__ */ e(
          ne,
          {
            config: m,
            scope: h,
            onScope: F,
            onSave: M
          }
        ),
        a === "panels" && /* @__PURE__ */ e(re, { panels: p }),
        a === "roles" && /* @__PURE__ */ e(ce, { roles: x })
      ] })
    ] })
  ] });
}
function ae({ status: t }) {
  var d, h, f;
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No status." });
  const a = t.agents || { enabled: [], enabled_source: "", allowlist_configured: !1, roster: [] }, i = Array.isArray(a.enabled) ? a.enabled : [], r = Array.isArray(a.roster) ? a.roster : [], n = Array.isArray(t.acp) ? t.acp : [], c = t.defaults || {}, o = a.allowlist_configured ? String(i.length) : "All", u = Object.keys(t.env_overrides || {}).filter((m) => m !== "_note");
  return /* @__PURE__ */ l(A, { children: [
    /* @__PURE__ */ l("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mb-6", children: [
      /* @__PURE__ */ e(z, { label: "Platform", value: t.platform }),
      /* @__PURE__ */ e(z, { label: "Agents enabled", value: o, accent: !0 }),
      /* @__PURE__ */ e(z, { label: "Safety mode", value: c.safety_mode ?? "read_only" }),
      /* @__PURE__ */ e(
        z,
        {
          label: "Local model detect",
          value: c.auto_detect_local_models ? "on" : "off"
        }
      )
    ] }),
    /* @__PURE__ */ l(_, { children: [
      /* @__PURE__ */ e(b, { children: "Resolved roster" }),
      r.length > 0 ? /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1.5", children: r.map((m) => /* @__PURE__ */ l("div", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ e("span", { className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]", children: m.id }),
        /* @__PURE__ */ e("span", { className: "text-muted text-xs", children: m.default_model ?? "(agent default)" }),
        /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-auto", children: m.source })
      ] }, m.id)) }) : a.allowlist_configured ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-2", children: i.map((m) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          children: m
        },
        m
      )) }) : /* @__PURE__ */ l("p", { className: "text-sm text-muted mt-1", children: [
        "No ",
        /* @__PURE__ */ e("code", { children: "enabled_agents" }),
        " allowlist configured — Rutherford enables every built-in agent plus any configured agent (source: ",
        a.enabled_source || "default",
        ")."
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ l(_, { children: [
      /* @__PURE__ */ e(b, { children: "Config locations" }),
      ((d = t.config_locations) == null ? void 0 : d.global) && /* @__PURE__ */ e(w, { meta: t.config_locations.global }),
      ((h = t.config_locations) == null ? void 0 : h.workspace) && /* @__PURE__ */ e(w, { meta: t.config_locations.workspace })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ l(_, { children: [
      /* @__PURE__ */ e(b, { children: /* @__PURE__ */ l("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(Q, { size: 14 }),
        " acp.json (agent servers)"
      ] }) }),
      n.map((m) => {
        const s = Object.keys(m.agent_servers || {});
        return /* @__PURE__ */ l("div", { className: "mt-2", children: [
          /* @__PURE__ */ e(w, { meta: m }),
          s.length > 0 && /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-1", children: s.map((p) => /* @__PURE__ */ e(
            "span",
            {
              className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
              children: p
            },
            p
          )) })
        ] }, m.path);
      })
    ] }),
    u.length > 0 && /* @__PURE__ */ l(A, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ l(_, { children: [
        /* @__PURE__ */ e(b, { children: "Environment overrides" }),
        /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1", children: u.map((m) => /* @__PURE__ */ l("div", { className: "text-xs", children: [
          /* @__PURE__ */ e("code", { children: m }),
          " = ",
          /* @__PURE__ */ e("code", { className: "text-muted", children: String((t.env_overrides || {})[m]) })
        ] }, m)) }),
        (t.env_overrides || {})._note && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-2", children: String((t.env_overrides || {})._note) })
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ l(_, { children: [
      /* @__PURE__ */ e(b, { children: "Reachability" }),
      /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: ((f = t.reachability) == null ? void 0 : f.note) ?? "—" })
    ] })
  ] });
}
function R({ label: t, children: a }) {
  return /* @__PURE__ */ l("label", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ e("span", { className: "text-xs text-muted", children: t }),
    a
  ] });
}
const C = "px-2 py-1.5 text-sm rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)] text-[var(--fg,#eee)] outline-none focus:border-[var(--accent,#6366f1)]";
function j({
  label: t,
  values: a,
  onChange: i
}) {
  const [r, n] = v("");
  return /* @__PURE__ */ l("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ e("span", { className: "text-xs text-muted", children: t }),
    /* @__PURE__ */ l("div", { className: "flex flex-col gap-1.5", children: [
      a.map((c, o) => /* @__PURE__ */ l("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: C + " flex-1",
            value: c,
            onChange: (u) => {
              const d = a.slice();
              d[o] = u.target.value, i(d);
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-amber-500",
            onClick: () => i(a.filter((u, d) => d !== o)),
            title: "Remove",
            children: /* @__PURE__ */ e(B, { size: 14 })
          }
        )
      ] }, o)),
      /* @__PURE__ */ l("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: C + " flex-1",
            placeholder: `Add ${t}…`,
            value: r,
            onChange: (c) => n(c.target.value),
            onKeyDown: (c) => {
              c.key === "Enter" && r.trim() && (i([...a, r.trim()]), n(""));
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-[var(--accent,#6366f1)]",
            onClick: () => {
              r.trim() && (i([...a, r.trim()]), n(""));
            },
            title: "Add",
            children: /* @__PURE__ */ e(O, { size: 14 })
          }
        )
      ] })
    ] })
  ] });
}
function L({
  label: t,
  value: a,
  onChange: i
}) {
  return /* @__PURE__ */ l("label", { className: "flex items-center gap-2 cursor-pointer", children: [
    /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        onClick: () => i(!a),
        className: "w-9 h-5 rounded-full transition-colors relative " + (a ? "bg-[var(--accent,#6366f1)]" : "bg-[var(--surface-3,#333)]"),
        children: /* @__PURE__ */ e(
          "span",
          {
            className: "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all " + (a ? "left-4" : "left-0.5")
          }
        )
      }
    ),
    /* @__PURE__ */ e("span", { className: "text-sm text-[var(--fg,#eee)]", children: t })
  ] });
}
function le(t) {
  const a = t.config || {}, i = (c) => typeof a[c] == "number" ? String(a[c]) : "", r = t.derived || {}, n = (c) => Array.isArray(c) ? c.filter((o) => typeof o == "string") : [];
  return {
    default_safety_mode: typeof a.default_safety_mode == "string" ? a.default_safety_mode : "read_only",
    default_timeout_s: i("default_timeout_s"),
    max_targets: i("max_targets"),
    auto_detect_local_models: a.auto_detect_local_models === !0,
    default_persistence: typeof a.default_persistence == "string" ? a.default_persistence : "ephemeral",
    synthesize_default: a.synthesize_default === !0,
    enabled_agents: n(r.enabled_agents),
    trusted_workspaces: n(r.trusted_workspaces),
    role_dirs: n(r.role_dirs),
    agents: (Array.isArray(t.agents) ? t.agents : []).map((c) => ({
      ...c,
      env: { ...c.env || {} },
      extra: { ...c.extra || {} }
    }))
  };
}
function se(t, a) {
  const i = { ...t.config };
  delete i.agents;
  const r = (o, u) => {
    if (u.trim() === "") delete i[o];
    else {
      const d = Number(u);
      Number.isNaN(d) || (i[o] = d);
    }
  };
  i.default_safety_mode = a.default_safety_mode, r("default_timeout_s", a.default_timeout_s), r("max_targets", a.max_targets), i.auto_detect_local_models = a.auto_detect_local_models, i.default_persistence = a.default_persistence, i.synthesize_default = a.synthesize_default;
  const n = (o, u) => {
    const d = u.map((h) => h.trim()).filter(Boolean);
    d.length ? i[o] = d : delete i[o];
  };
  n("enabled_agents", a.enabled_agents), n("trusted_workspaces", a.trusted_workspaces), n("role_dirs", a.role_dirs);
  const c = {};
  for (const o of a.agents) {
    const u = o.id.trim();
    if (!u) continue;
    const d = { ...o.extra };
    o.default_model != null && String(o.default_model).trim() !== "" && (d.default_model = o.default_model), d.enabled = o.enabled, o.env && Object.keys(o.env).length && (d.env = o.env), c[u] = d;
  }
  return Object.keys(c).length && (i.agents = c), i;
}
function ne({
  config: t,
  scope: a,
  onScope: i,
  onSave: r
}) {
  const [n, c] = v(null), [o, u] = v(!1), [d, h] = v(null);
  T(() => {
    h(null), c(t ? le(t) : null);
  }, [t]);
  const f = (s) => c((p) => p && { ...p, ...s }), m = async () => {
    if (!(!t || !n)) {
      u(!0), h(null);
      try {
        await r(a, se(t, n)), h({ ok: !0, text: `Saved to ${a} config.toml (backup written).` });
      } catch (s) {
        h({ ok: !1, text: s instanceof Error ? s.message : String(s) });
      } finally {
        u(!1);
      }
    }
  };
  return /* @__PURE__ */ l(A, { children: [
    /* @__PURE__ */ l("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((s) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => i(s),
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (a === s ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: s === "global" ? "Global" : "Workspace"
        },
        s
      )),
      /* @__PURE__ */ l(
        "button",
        {
          onClick: () => void m(),
          disabled: o || !n,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(Y, { size: 14 }),
            " ",
            o ? "Saving…" : `Save ${a}`
          ]
        }
      )
    ] }),
    d && /* @__PURE__ */ l(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (d.ok ? "text-green-500" : "text-amber-500"),
        children: [
          d.ok ? /* @__PURE__ */ e(J, { size: 15 }) : /* @__PURE__ */ e(D, { size: 15 }),
          d.text
        ]
      }
    ),
    !t || !n ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No config." }) : /* @__PURE__ */ l(A, { children: [
      /* @__PURE__ */ l(_, { children: [
        /* @__PURE__ */ e(b, { children: "Defaults" }),
        /* @__PURE__ */ e(w, { meta: t }),
        !t.exists && /* @__PURE__ */ l("p", { className: "text-xs text-muted mt-2", children: [
          "No file at this scope yet — saving creates ",
          /* @__PURE__ */ e("code", { children: t.path }),
          "."
        ] }),
        /* @__PURE__ */ l("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(R, { label: "default_safety_mode", children: /* @__PURE__ */ e(
            "select",
            {
              className: C,
              value: n.default_safety_mode,
              onChange: (s) => f({ default_safety_mode: s.target.value }),
              children: ee.map((s) => /* @__PURE__ */ e("option", { value: s, children: s }, s))
            }
          ) }),
          /* @__PURE__ */ e(R, { label: "default_timeout_s", children: /* @__PURE__ */ e(
            "input",
            {
              type: "number",
              className: C,
              value: n.default_timeout_s,
              onChange: (s) => f({ default_timeout_s: s.target.value })
            }
          ) }),
          /* @__PURE__ */ e(R, { label: "max_targets", children: /* @__PURE__ */ e(
            "input",
            {
              type: "number",
              className: C,
              value: n.max_targets,
              onChange: (s) => f({ max_targets: s.target.value })
            }
          ) }),
          /* @__PURE__ */ e(R, { label: "default_persistence", children: /* @__PURE__ */ e(
            "select",
            {
              className: C,
              value: n.default_persistence,
              onChange: (s) => f({ default_persistence: s.target.value }),
              children: te.map((s) => /* @__PURE__ */ e("option", { value: s, children: s }, s))
            }
          ) })
        ] }),
        /* @__PURE__ */ l("div", { className: "flex flex-wrap gap-6 mt-4", children: [
          /* @__PURE__ */ e(
            L,
            {
              label: "auto_detect_local_models",
              value: n.auto_detect_local_models,
              onChange: (s) => f({ auto_detect_local_models: s })
            }
          ),
          /* @__PURE__ */ e(
            L,
            {
              label: "synthesize_default",
              value: n.synthesize_default,
              onChange: (s) => f({ synthesize_default: s })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ l(_, { children: [
        /* @__PURE__ */ e(b, { children: "Lists" }),
        /* @__PURE__ */ l("div", { className: "grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            j,
            {
              label: "enabled_agents",
              values: n.enabled_agents,
              onChange: (s) => f({ enabled_agents: s })
            }
          ),
          /* @__PURE__ */ e(
            j,
            {
              label: "trusted_workspaces",
              values: n.trusted_workspaces,
              onChange: (s) => f({ trusted_workspaces: s })
            }
          ),
          /* @__PURE__ */ e(
            j,
            {
              label: "role_dirs",
              values: n.role_dirs,
              onChange: (s) => f({ role_dirs: s })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ l(_, { children: [
        /* @__PURE__ */ e(b, { children: "Agents [agents.*]" }),
        /* @__PURE__ */ l("div", { className: "mt-3 flex flex-col gap-2", children: [
          n.agents.map((s, p) => /* @__PURE__ */ l(
            "div",
            {
              className: "flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]",
              children: [
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: C + " w-32",
                    value: s.id,
                    placeholder: "id",
                    onChange: (y) => {
                      const x = n.agents.slice();
                      x[p] = { ...s, id: y.target.value }, f({ agents: x });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: C + " flex-1",
                    value: s.default_model ?? "",
                    placeholder: "default_model (blank = agent default)",
                    onChange: (y) => {
                      const x = n.agents.slice();
                      x[p] = { ...s, default_model: y.target.value }, f({ agents: x });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  L,
                  {
                    label: "enabled",
                    value: s.enabled,
                    onChange: (y) => {
                      const x = n.agents.slice();
                      x[p] = { ...s, enabled: y }, f({ agents: x });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "p-1 text-muted hover:text-amber-500",
                    onClick: () => f({ agents: n.agents.filter((y, x) => x !== p) }),
                    title: "Remove agent",
                    children: /* @__PURE__ */ e(B, { size: 14 })
                  }
                )
              ]
            },
            p
          )),
          /* @__PURE__ */ l(
            "button",
            {
              className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
              onClick: () => f({
                agents: [
                  ...n.agents,
                  { id: "", default_model: "", enabled: !0, env: {}, extra: {} }
                ]
              }),
              children: [
                /* @__PURE__ */ e(O, { size: 14 }),
                " Add agent"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] });
}
function re({ panels: t }) {
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No panels." });
  const a = Array.isArray(t.sources) ? t.sources : [];
  return a.reduce((r, n) => r + (Array.isArray(n.panels) ? n.panels.length : 0), 0) === 0 ? /* @__PURE__ */ l(_, { children: [
    /* @__PURE__ */ e(b, { children: "Named panels" }),
    /* @__PURE__ */ l("p", { className: "text-sm text-muted mt-1", children: [
      "No ",
      /* @__PURE__ */ e("code", { children: "panels.toon" }),
      " found (read-only — editing is a later step). Checked:"
    ] }),
    a.map((r) => /* @__PURE__ */ e(w, { meta: r }, r.path))
  ] }) : /* @__PURE__ */ e(A, { children: a.map((r) => {
    const n = Array.isArray(r.panels) ? r.panels : [];
    return n.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ l(_, { children: [
      /* @__PURE__ */ l(b, { children: [
        "Panels · ",
        r.scope,
        " (read-only)"
      ] }),
      /* @__PURE__ */ e(w, { meta: r }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-col gap-2", children: n.map((c) => /* @__PURE__ */ l("div", { className: "p-3 rounded bg-[var(--surface-2,#1e1e1e)]", children: [
        /* @__PURE__ */ l("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ e("span", { className: "text-sm font-medium text-[var(--fg,#eee)]", children: c.name }),
          c.strategy && /* @__PURE__ */ e("span", { className: "px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-3,#333)] text-muted", children: c.strategy }),
          c.targets != null && /* @__PURE__ */ l("span", { className: "text-[10px] text-muted", children: [
            c.targets,
            " voices"
          ] })
        ] }),
        c.description && /* @__PURE__ */ e("p", { className: "text-xs text-muted mt-1", children: c.description })
      ] }, c.name)) })
    ] }) }, r.path);
  }) });
}
function ce({ roles: t }) {
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No roles." });
  const a = Array.isArray(t.sources) ? t.sources : [];
  return a.reduce((r, n) => r + (Array.isArray(n.roles) ? n.roles.length : 0), 0) === 0 ? /* @__PURE__ */ l(_, { children: [
    /* @__PURE__ */ e(b, { children: "Roles" }),
    /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: "No role markdown files found (read-only — editing is a later step). Checked:" }),
    a.map((r) => /* @__PURE__ */ e(w, { meta: r }, r.path))
  ] }) : /* @__PURE__ */ e(A, { children: a.map((r) => {
    const n = Array.isArray(r.roles) ? r.roles : [];
    return n.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ l(_, { children: [
      /* @__PURE__ */ l(b, { children: [
        "Roles · ",
        r.scope,
        " (read-only)"
      ] }),
      /* @__PURE__ */ e(w, { meta: r }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: n.map((c) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-1 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          title: c.path,
          children: c.name
        },
        c.path
      )) })
    ] }) }, r.path);
  }) });
}
export {
  fe as default
};
