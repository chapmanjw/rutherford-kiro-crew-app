import { jsxs as l, Fragment as S, jsx as e } from "react/jsx-runtime";
import { useAppApi as U } from "@kirocrew/app-sdk";
import { PageHeader as W, StatCard as $, Card as v, CardTitle as b } from "@kirocrew/app-sdk/ui";
import { useState as x, useRef as X, useCallback as L, useEffect as V } from "react";
import J from "lucide-react";
const {
  Box: Q,
  FileCog: Z,
  Layers: ee,
  UserSquare: te,
  RefreshCw: ae,
  AlertTriangle: I,
  Save: se,
  Plus: K,
  X: Y,
  CheckCircle2: le,
  Server: re
} = J, z = "/api/apps/rutherford", ne = [
  { id: "status", label: "Overview", icon: Q },
  { id: "config", label: "Config", icon: Z },
  { id: "panels", label: "Panels", icon: ee },
  { id: "roles", label: "Roles", icon: te }
], ce = ["read_only", "propose", "write", "yolo"], ie = ["ephemeral", "job"];
function A({ meta: t }) {
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
function ye() {
  const t = U(), [a, d] = x("status"), [c, s] = x(!0), [r, i] = x(null), [u, m] = x(null), [p, R] = x("global"), [o, k] = x(null), [n, _] = x(null), [w, h] = x(null), E = X(0), q = L(
    async (f) => {
      const y = ++E.current;
      try {
        const g = await t.get(`${z}/config?scope=${f}`);
        if (y !== E.current || !g || g.scope !== f) return;
        k(g);
      } catch (g) {
        if (y !== E.current) return;
        i(g instanceof Error ? g.message : String(g));
      }
    },
    [t]
  ), T = L(async () => {
    s(!0), i(null);
    try {
      const [f, y, g] = await Promise.all([
        t.get(`${z}/status`),
        t.get(`${z}/panels`),
        t.get(`${z}/roles`)
      ]);
      m(f), _(y), h(g);
    } catch (f) {
      i(f instanceof Error ? f.message : String(f));
    } finally {
      s(!1);
    }
  }, [t]);
  V(() => {
    T();
  }, [T]), V(() => {
    q(p);
  }, [q, p]);
  const G = L((f) => {
    R(f);
  }, []), F = (f) => !!f && typeof f == "object" && f.written === !0, H = L(
    async (f, y) => {
      const g = `${z}/config?scope=${f}`;
      let P = await t.put(g, y);
      F(P) || (await new Promise((N) => setTimeout(N, 600)), P = await t.put(g, y));
      let j = F(P) ? P : null;
      if (!j) {
        const N = await t.get(g);
        if (N && typeof N == "object") {
          const M = N;
          me(y, M.config) && (j = M);
        }
      }
      if (!j)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your entered values were kept; try Save again."
        );
      E.current++, k(j);
      try {
        const N = await t.get(`${z}/status`);
        N && typeof N == "object" && m(N);
      } catch {
      }
      return j;
    },
    [t]
  );
  return /* @__PURE__ */ l(S, { children: [
    /* @__PURE__ */ e(W, { title: "Rutherford", subtitle: "Config & status — config.toml editing (Phase 2)" }),
    /* @__PURE__ */ l("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ l("div", { className: "flex gap-1 mb-5 border-b border-[var(--border,#2a2a2a)]", children: [
        ne.map(({ id: f, label: y, icon: g }) => /* @__PURE__ */ l(
          "button",
          {
            onClick: () => d(f),
            className: "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors " + (a === f ? "border-[var(--accent,#6366f1)] text-[var(--fg,#eee)]" : "border-transparent text-muted hover:text-[var(--fg,#eee)]"),
            children: [
              /* @__PURE__ */ e(g, { size: 15 }),
              y
            ]
          },
          f
        )),
        /* @__PURE__ */ e(
          "button",
          {
            onClick: () => void T(),
            className: "ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-[var(--fg,#eee)]",
            title: "Reload",
            children: /* @__PURE__ */ e(ae, { size: 15, className: c ? "animate-spin" : "" })
          }
        )
      ] }),
      r && /* @__PURE__ */ l("div", { className: "flex items-center gap-2 text-sm text-amber-500 mb-4", children: [
        /* @__PURE__ */ e(I, { size: 15 }),
        " ",
        r
      ] }),
      c && !u ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "Loading…" }) : /* @__PURE__ */ l(S, { children: [
        a === "status" && /* @__PURE__ */ e(oe, { status: u }),
        a === "config" && /* @__PURE__ */ e(
          fe,
          {
            config: o,
            scope: p,
            onScope: G,
            onSave: H
          }
        ),
        a === "panels" && /* @__PURE__ */ e(pe, { panels: n }),
        a === "roles" && /* @__PURE__ */ e(ge, { roles: w })
      ] })
    ] })
  ] });
}
function oe({ status: t }) {
  var m, p, R;
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No status." });
  const a = t.agents || { enabled: [], enabled_source: "", allowlist_configured: !1, roster: [] }, d = Array.isArray(a.enabled) ? a.enabled : [], c = Array.isArray(a.roster) ? a.roster : [], s = Array.isArray(t.acp) ? t.acp : [], r = t.defaults || {}, i = a.allowlist_configured ? String(d.length) : "All", u = Object.keys(t.env_overrides || {}).filter((o) => o !== "_note");
  return /* @__PURE__ */ l(S, { children: [
    /* @__PURE__ */ l("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mb-6", children: [
      /* @__PURE__ */ e($, { label: "Platform", value: t.platform }),
      /* @__PURE__ */ e($, { label: "Agents enabled", value: i, accent: !0 }),
      /* @__PURE__ */ e($, { label: "Safety mode", value: r.safety_mode ?? "read_only" }),
      /* @__PURE__ */ e(
        $,
        {
          label: "Local model detect",
          value: r.auto_detect_local_models ? "on" : "off"
        }
      )
    ] }),
    /* @__PURE__ */ l(v, { children: [
      /* @__PURE__ */ e(b, { children: "Resolved roster" }),
      c.length > 0 ? /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1.5", children: c.map((o) => /* @__PURE__ */ l("div", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ e("span", { className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]", children: o.id }),
        /* @__PURE__ */ e("span", { className: "text-muted text-xs", children: o.default_model ?? "(agent default)" }),
        /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-auto", children: o.source })
      ] }, o.id)) }) : a.allowlist_configured ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-2", children: d.map((o) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          children: o
        },
        o
      )) }) : /* @__PURE__ */ l("p", { className: "text-sm text-muted mt-1", children: [
        "No ",
        /* @__PURE__ */ e("code", { children: "enabled_agents" }),
        " allowlist configured — Rutherford enables every built-in agent plus any configured agent (source: ",
        a.enabled_source || "default",
        ")."
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ l(v, { children: [
      /* @__PURE__ */ e(b, { children: "Config locations" }),
      ((m = t.config_locations) == null ? void 0 : m.global) && /* @__PURE__ */ e(A, { meta: t.config_locations.global }),
      ((p = t.config_locations) == null ? void 0 : p.workspace) && /* @__PURE__ */ e(A, { meta: t.config_locations.workspace })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ l(v, { children: [
      /* @__PURE__ */ e(b, { children: /* @__PURE__ */ l("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(re, { size: 14 }),
        " acp.json (agent servers)"
      ] }) }),
      s.map((o) => {
        const k = Object.keys(o.agent_servers || {});
        return /* @__PURE__ */ l("div", { className: "mt-2", children: [
          /* @__PURE__ */ e(A, { meta: o }),
          k.length > 0 && /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-1", children: k.map((n) => /* @__PURE__ */ e(
            "span",
            {
              className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
              children: n
            },
            n
          )) })
        ] }, o.path);
      })
    ] }),
    u.length > 0 && /* @__PURE__ */ l(S, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ l(v, { children: [
        /* @__PURE__ */ e(b, { children: "Environment overrides" }),
        /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1", children: u.map((o) => /* @__PURE__ */ l("div", { className: "text-xs", children: [
          /* @__PURE__ */ e("code", { children: o }),
          " = ",
          /* @__PURE__ */ e("code", { className: "text-muted", children: String((t.env_overrides || {})[o]) })
        ] }, o)) }),
        (t.env_overrides || {})._note && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-2", children: String((t.env_overrides || {})._note) })
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ l(v, { children: [
      /* @__PURE__ */ e(b, { children: "Reachability" }),
      /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: ((R = t.reachability) == null ? void 0 : R.note) ?? "—" })
    ] })
  ] });
}
function O({ label: t, children: a }) {
  return /* @__PURE__ */ l("label", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ e("span", { className: "text-xs text-muted", children: t }),
    a
  ] });
}
const C = "px-2 py-1.5 text-sm rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)] text-[var(--fg,#eee)] outline-none focus:border-[var(--accent,#6366f1)]";
function D({
  label: t,
  values: a,
  onChange: d
}) {
  const [c, s] = x("");
  return /* @__PURE__ */ l("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ e("span", { className: "text-xs text-muted", children: t }),
    /* @__PURE__ */ l("div", { className: "flex flex-col gap-1.5", children: [
      a.map((r, i) => /* @__PURE__ */ l("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: C + " flex-1",
            value: r,
            onChange: (u) => {
              const m = a.slice();
              m[i] = u.target.value, d(m);
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-amber-500",
            onClick: () => d(a.filter((u, m) => m !== i)),
            title: "Remove",
            children: /* @__PURE__ */ e(Y, { size: 14 })
          }
        )
      ] }, i)),
      /* @__PURE__ */ l("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: C + " flex-1",
            placeholder: `Add ${t}…`,
            value: c,
            onChange: (r) => s(r.target.value),
            onKeyDown: (r) => {
              r.key === "Enter" && c.trim() && (d([...a, c.trim()]), s(""));
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-[var(--accent,#6366f1)]",
            onClick: () => {
              c.trim() && (d([...a, c.trim()]), s(""));
            },
            title: "Add",
            children: /* @__PURE__ */ e(K, { size: 14 })
          }
        )
      ] })
    ] })
  ] });
}
function B({
  label: t,
  value: a,
  onChange: d
}) {
  return /* @__PURE__ */ l("label", { className: "flex items-center gap-2 cursor-pointer", children: [
    /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        onClick: () => d(!a),
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
function de(t) {
  const a = t.config || {}, d = (r) => typeof a[r] == "number" ? String(a[r]) : "", c = t.derived || {}, s = (r) => Array.isArray(r) ? r.filter((i) => typeof i == "string") : [];
  return {
    default_safety_mode: typeof a.default_safety_mode == "string" ? a.default_safety_mode : "read_only",
    default_timeout_s: d("default_timeout_s"),
    max_targets: d("max_targets"),
    auto_detect_local_models: a.auto_detect_local_models === !0,
    default_persistence: typeof a.default_persistence == "string" ? a.default_persistence : "ephemeral",
    synthesize_default: a.synthesize_default === !0,
    enabled_agents: s(c.enabled_agents),
    trusted_workspaces: s(c.trusted_workspaces),
    role_dirs: s(c.role_dirs),
    agents: (Array.isArray(t.agents) ? t.agents : []).map((r) => ({
      ...r,
      env: { ...r.env || {} },
      extra: { ...r.extra || {} }
    }))
  };
}
function me(t, a) {
  if (!a || typeof a != "object") return !1;
  const d = (c, s) => String(c) === String(s);
  for (const [c, s] of Object.entries(t)) {
    const r = a[c];
    if (c === "agents") {
      const i = s && typeof s == "object" ? Object.keys(s).sort() : [], u = r && typeof r == "object" ? Object.keys(r).sort() : [];
      if (i.length !== u.length || i.some((m, p) => m !== u[p])) return !1;
      continue;
    }
    if (Array.isArray(s)) {
      if (!Array.isArray(r) || r.length !== s.length || s.some((i, u) => !d(i, r[u]))) return !1;
      continue;
    }
    if (!d(s, r)) return !1;
  }
  return !0;
}
function ue(t, a) {
  const d = { ...t.config };
  delete d.agents;
  const c = (i, u) => {
    if (u.trim() === "") delete d[i];
    else {
      const m = Number(u);
      Number.isNaN(m) || (d[i] = m);
    }
  };
  d.default_safety_mode = a.default_safety_mode, c("default_timeout_s", a.default_timeout_s), c("max_targets", a.max_targets), d.auto_detect_local_models = a.auto_detect_local_models, d.default_persistence = a.default_persistence, d.synthesize_default = a.synthesize_default;
  const s = (i, u) => {
    const m = u.map((p) => p.trim()).filter(Boolean);
    m.length ? d[i] = m : delete d[i];
  };
  s("enabled_agents", a.enabled_agents), s("trusted_workspaces", a.trusted_workspaces), s("role_dirs", a.role_dirs);
  const r = {};
  for (const i of a.agents) {
    const u = i.id.trim();
    if (!u) continue;
    const m = { ...i.extra };
    i.default_model != null && String(i.default_model).trim() !== "" && (m.default_model = i.default_model), m.enabled = i.enabled, i.env && Object.keys(i.env).length && (m.env = i.env), r[u] = m;
  }
  return Object.keys(r).length && (d.agents = r), d;
}
function fe({
  config: t,
  scope: a,
  onScope: d,
  onSave: c
}) {
  const [s, r] = x(null), [i, u] = x(!1), [m, p] = x(null), R = !!t && t.scope === a;
  V(() => {
    if (!t || t.scope !== a) {
      r((n) => n ?? null);
      return;
    }
    p(null), r(de(t));
  }, [t, a]);
  const o = (n) => r((_) => _ && { ..._, ...n }), k = async () => {
    if (!(!t || !s)) {
      u(!0), p(null);
      try {
        await c(a, ue(t, s)), p({ ok: !0, text: `Saved to ${a} config.toml (backup written).` });
      } catch (n) {
        p({ ok: !1, text: n instanceof Error ? n.message : String(n) });
      } finally {
        u(!1);
      }
    }
  };
  return /* @__PURE__ */ l(S, { children: [
    /* @__PURE__ */ l("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((n) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => d(n),
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (a === n ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: n === "global" ? "Global" : "Workspace"
        },
        n
      )),
      /* @__PURE__ */ l(
        "button",
        {
          onClick: () => void k(),
          disabled: i || !s,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(se, { size: 14 }),
            " ",
            i ? "Saving…" : `Save ${a}`
          ]
        }
      )
    ] }),
    m && /* @__PURE__ */ l(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (m.ok ? "text-green-500" : "text-amber-500"),
        children: [
          m.ok ? /* @__PURE__ */ e(le, { size: 15 }) : /* @__PURE__ */ e(I, { size: 15 }),
          m.text
        ]
      }
    ),
    !R || !s ? /* @__PURE__ */ l("p", { className: "text-sm text-muted", children: [
      "Loading ",
      a,
      " config…"
    ] }) : /* @__PURE__ */ l(S, { children: [
      /* @__PURE__ */ l(v, { children: [
        /* @__PURE__ */ e(b, { children: "Defaults" }),
        /* @__PURE__ */ e(A, { meta: t }),
        !t.exists && /* @__PURE__ */ l("p", { className: "text-xs text-muted mt-2", children: [
          "No file at this scope yet — saving creates ",
          /* @__PURE__ */ e("code", { children: t.path }),
          "."
        ] }),
        /* @__PURE__ */ l("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(O, { label: "default_safety_mode", children: /* @__PURE__ */ e(
            "select",
            {
              className: C,
              value: s.default_safety_mode,
              onChange: (n) => o({ default_safety_mode: n.target.value }),
              children: ce.map((n) => /* @__PURE__ */ e("option", { value: n, children: n }, n))
            }
          ) }),
          /* @__PURE__ */ e(O, { label: "default_timeout_s", children: /* @__PURE__ */ e(
            "input",
            {
              type: "number",
              className: C,
              value: s.default_timeout_s,
              onChange: (n) => o({ default_timeout_s: n.target.value })
            }
          ) }),
          /* @__PURE__ */ e(O, { label: "max_targets", children: /* @__PURE__ */ e(
            "input",
            {
              type: "number",
              className: C,
              value: s.max_targets,
              onChange: (n) => o({ max_targets: n.target.value })
            }
          ) }),
          /* @__PURE__ */ e(O, { label: "default_persistence", children: /* @__PURE__ */ e(
            "select",
            {
              className: C,
              value: s.default_persistence,
              onChange: (n) => o({ default_persistence: n.target.value }),
              children: ie.map((n) => /* @__PURE__ */ e("option", { value: n, children: n }, n))
            }
          ) })
        ] }),
        /* @__PURE__ */ l("div", { className: "flex flex-wrap gap-6 mt-4", children: [
          /* @__PURE__ */ e(
            B,
            {
              label: "auto_detect_local_models",
              value: s.auto_detect_local_models,
              onChange: (n) => o({ auto_detect_local_models: n })
            }
          ),
          /* @__PURE__ */ e(
            B,
            {
              label: "synthesize_default",
              value: s.synthesize_default,
              onChange: (n) => o({ synthesize_default: n })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ l(v, { children: [
        /* @__PURE__ */ e(b, { children: "Lists" }),
        /* @__PURE__ */ l("div", { className: "grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            D,
            {
              label: "enabled_agents",
              values: s.enabled_agents,
              onChange: (n) => o({ enabled_agents: n })
            }
          ),
          /* @__PURE__ */ e(
            D,
            {
              label: "trusted_workspaces",
              values: s.trusted_workspaces,
              onChange: (n) => o({ trusted_workspaces: n })
            }
          ),
          /* @__PURE__ */ e(
            D,
            {
              label: "role_dirs",
              values: s.role_dirs,
              onChange: (n) => o({ role_dirs: n })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ l(v, { children: [
        /* @__PURE__ */ e(b, { children: "Agents [agents.*]" }),
        /* @__PURE__ */ l("div", { className: "mt-3 flex flex-col gap-2", children: [
          s.agents.map((n, _) => /* @__PURE__ */ l(
            "div",
            {
              className: "flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]",
              children: [
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: C + " w-32",
                    value: n.id,
                    placeholder: "id",
                    onChange: (w) => {
                      const h = s.agents.slice();
                      h[_] = { ...n, id: w.target.value }, o({ agents: h });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: C + " flex-1",
                    value: n.default_model ?? "",
                    placeholder: "default_model (blank = agent default)",
                    onChange: (w) => {
                      const h = s.agents.slice();
                      h[_] = { ...n, default_model: w.target.value }, o({ agents: h });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  B,
                  {
                    label: "enabled",
                    value: n.enabled,
                    onChange: (w) => {
                      const h = s.agents.slice();
                      h[_] = { ...n, enabled: w }, o({ agents: h });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "p-1 text-muted hover:text-amber-500",
                    onClick: () => o({ agents: s.agents.filter((w, h) => h !== _) }),
                    title: "Remove agent",
                    children: /* @__PURE__ */ e(Y, { size: 14 })
                  }
                )
              ]
            },
            _
          )),
          /* @__PURE__ */ l(
            "button",
            {
              className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
              onClick: () => o({
                agents: [
                  ...s.agents,
                  { id: "", default_model: "", enabled: !0, env: {}, extra: {} }
                ]
              }),
              children: [
                /* @__PURE__ */ e(K, { size: 14 }),
                " Add agent"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] });
}
function pe({ panels: t }) {
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No panels." });
  const a = Array.isArray(t.sources) ? t.sources : [];
  return a.reduce((c, s) => c + (Array.isArray(s.panels) ? s.panels.length : 0), 0) === 0 ? /* @__PURE__ */ l(v, { children: [
    /* @__PURE__ */ e(b, { children: "Named panels" }),
    /* @__PURE__ */ l("p", { className: "text-sm text-muted mt-1", children: [
      "No ",
      /* @__PURE__ */ e("code", { children: "panels.toon" }),
      " found (read-only — editing is a later step). Checked:"
    ] }),
    a.map((c) => /* @__PURE__ */ e(A, { meta: c }, c.path))
  ] }) : /* @__PURE__ */ e(S, { children: a.map((c) => {
    const s = Array.isArray(c.panels) ? c.panels : [];
    return s.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ l(v, { children: [
      /* @__PURE__ */ l(b, { children: [
        "Panels · ",
        c.scope,
        " (read-only)"
      ] }),
      /* @__PURE__ */ e(A, { meta: c }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-col gap-2", children: s.map((r) => /* @__PURE__ */ l("div", { className: "p-3 rounded bg-[var(--surface-2,#1e1e1e)]", children: [
        /* @__PURE__ */ l("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ e("span", { className: "text-sm font-medium text-[var(--fg,#eee)]", children: r.name }),
          r.strategy && /* @__PURE__ */ e("span", { className: "px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-3,#333)] text-muted", children: r.strategy }),
          r.targets != null && /* @__PURE__ */ l("span", { className: "text-[10px] text-muted", children: [
            r.targets,
            " voices"
          ] })
        ] }),
        r.description && /* @__PURE__ */ e("p", { className: "text-xs text-muted mt-1", children: r.description })
      ] }, r.name)) })
    ] }) }, c.path);
  }) });
}
function ge({ roles: t }) {
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No roles." });
  const a = Array.isArray(t.sources) ? t.sources : [];
  return a.reduce((c, s) => c + (Array.isArray(s.roles) ? s.roles.length : 0), 0) === 0 ? /* @__PURE__ */ l(v, { children: [
    /* @__PURE__ */ e(b, { children: "Roles" }),
    /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: "No role markdown files found (read-only — editing is a later step). Checked:" }),
    a.map((c) => /* @__PURE__ */ e(A, { meta: c }, c.path))
  ] }) : /* @__PURE__ */ e(S, { children: a.map((c) => {
    const s = Array.isArray(c.roles) ? c.roles : [];
    return s.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ l(v, { children: [
      /* @__PURE__ */ l(b, { children: [
        "Roles · ",
        c.scope,
        " (read-only)"
      ] }),
      /* @__PURE__ */ e(A, { meta: c }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: s.map((r) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-1 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          title: r.path,
          children: r.name
        },
        r.path
      )) })
    ] }) }, c.path);
  }) });
}
export {
  ye as default
};
