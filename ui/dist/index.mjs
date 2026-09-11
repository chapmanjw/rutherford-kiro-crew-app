import { jsxs as s, Fragment as S, jsx as e } from "react/jsx-runtime";
import { useAppApi as W } from "@kirocrew/app-sdk";
import { PageHeader as X, StatCard as $, Card as v, CardTitle as b } from "@kirocrew/app-sdk/ui";
import { useState as x, useRef as J, useCallback as L, useEffect as V } from "react";
import Q from "lucide-react";
const {
  Box: Z,
  FileCog: ee,
  Layers: te,
  UserSquare: ae,
  RefreshCw: le,
  AlertTriangle: Y,
  Save: se,
  Plus: G,
  X: H,
  CheckCircle2: re,
  Server: ne
} = Q, R = "/api/apps/rutherford", ce = [
  { id: "status", label: "Overview", icon: Z },
  { id: "config", label: "Config", icon: ee },
  { id: "panels", label: "Panels", icon: te },
  { id: "roles", label: "Roles", icon: ae }
], oe = ["read_only", "propose", "write", "yolo"], ie = ["ephemeral", "job"];
function C({ meta: t }) {
  return /* @__PURE__ */ s("div", { className: "text-xs text-muted mt-1", children: [
    /* @__PURE__ */ e("span", { className: "opacity-70", children: t.scope }),
    " · ",
    /* @__PURE__ */ e("code", { className: "text-xs", children: t.path }),
    " · ",
    /* @__PURE__ */ e("span", { className: t.exists ? "text-green-500" : "text-muted opacity-60", children: t.exists ? "found" : "not present" }),
    t.error && /* @__PURE__ */ s("span", { className: "text-amber-500", children: [
      " · ",
      t.error
    ] })
  ] });
}
function Ne() {
  const t = W(), [a, d] = x("status"), [c, l] = x(!0), [r, o] = x(null), [u, m] = x(null), [p, j] = x("global"), [i, A] = x(null), [n, _] = x(null), [N, h] = x(null), E = J("global"), F = L(
    async (f) => {
      E.current = f;
      try {
        const g = await t.get(`${R}/config?scope=${f}`);
        if (E.current !== f) return;
        if (!g || typeof g != "object") {
          o(`No config returned for ${f} scope.`);
          return;
        }
        A({ ...g, scope: f }), o(null);
      } catch (g) {
        if (E.current !== f) return;
        o(g instanceof Error ? g.message : String(g));
      }
    },
    [t]
  ), T = L(async () => {
    l(!0), o(null);
    try {
      const [f, g, k] = await Promise.all([
        t.get(`${R}/status`),
        t.get(`${R}/panels`),
        t.get(`${R}/roles`)
      ]);
      m(f), _(g), h(k);
    } catch (f) {
      o(f instanceof Error ? f.message : String(f));
    } finally {
      l(!1);
    }
  }, [t]);
  V(() => {
    T();
  }, [T]), V(() => {
    F(p);
  }, [F, p]);
  const I = L((f) => {
    j(f);
  }, []), M = (f) => !!f && typeof f == "object" && f.written === !0, U = L(
    async (f, g) => {
      const k = `${R}/config?scope=${f}`;
      let P = await t.put(k, g);
      M(P) || (await new Promise((y) => setTimeout(y, 600)), P = await t.put(k, g));
      let z = M(P) ? P : null;
      if (!z) {
        const y = await t.get(k);
        if (y && typeof y == "object") {
          const K = y;
          ue(g, K.config) && (z = K);
        }
      }
      if (!z)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your entered values were kept; try Save again."
        );
      const q = z.scope ?? E.current;
      E.current = q, A({ ...z, scope: q });
      try {
        const y = await t.get(`${R}/status`);
        y && typeof y == "object" && m(y);
      } catch {
      }
      return z;
    },
    [t]
  );
  return /* @__PURE__ */ s(S, { children: [
    /* @__PURE__ */ e(X, { title: "Rutherford", subtitle: "Config & status — config.toml editing (Phase 2)" }),
    /* @__PURE__ */ s("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ s("div", { className: "flex gap-1 mb-5 border-b border-[var(--border,#2a2a2a)]", children: [
        ce.map(({ id: f, label: g, icon: k }) => /* @__PURE__ */ s(
          "button",
          {
            onClick: () => d(f),
            className: "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors " + (a === f ? "border-[var(--accent,#6366f1)] text-[var(--fg,#eee)]" : "border-transparent text-muted hover:text-[var(--fg,#eee)]"),
            children: [
              /* @__PURE__ */ e(k, { size: 15 }),
              g
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
            children: /* @__PURE__ */ e(le, { size: 15, className: c ? "animate-spin" : "" })
          }
        )
      ] }),
      r && /* @__PURE__ */ s("div", { className: "flex items-center gap-2 text-sm text-amber-500 mb-4", children: [
        /* @__PURE__ */ e(Y, { size: 15 }),
        " ",
        r
      ] }),
      c && !u ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "Loading…" }) : /* @__PURE__ */ s(S, { children: [
        a === "status" && /* @__PURE__ */ e(de, { status: u }),
        a === "config" && /* @__PURE__ */ e(
          pe,
          {
            config: i,
            scope: p,
            onScope: I,
            onSave: U
          }
        ),
        a === "panels" && /* @__PURE__ */ e(ge, { panels: n }),
        a === "roles" && /* @__PURE__ */ e(he, { roles: N })
      ] })
    ] })
  ] });
}
function de({ status: t }) {
  var m, p, j;
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No status." });
  const a = t.agents || { enabled: [], enabled_source: "", allowlist_configured: !1, roster: [] }, d = Array.isArray(a.enabled) ? a.enabled : [], c = Array.isArray(a.roster) ? a.roster : [], l = Array.isArray(t.acp) ? t.acp : [], r = t.defaults || {}, o = a.allowlist_configured ? String(d.length) : "All", u = Object.keys(t.env_overrides || {}).filter((i) => i !== "_note");
  return /* @__PURE__ */ s(S, { children: [
    /* @__PURE__ */ s("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mb-6", children: [
      /* @__PURE__ */ e($, { label: "Platform", value: t.platform }),
      /* @__PURE__ */ e($, { label: "Agents enabled", value: o, accent: !0 }),
      /* @__PURE__ */ e($, { label: "Safety mode", value: r.safety_mode ?? "read_only" }),
      /* @__PURE__ */ e(
        $,
        {
          label: "Local model detect",
          value: r.auto_detect_local_models ? "on" : "off"
        }
      )
    ] }),
    /* @__PURE__ */ s(v, { children: [
      /* @__PURE__ */ e(b, { children: "Resolved roster" }),
      c.length > 0 ? /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1.5", children: c.map((i) => /* @__PURE__ */ s("div", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ e("span", { className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]", children: i.id }),
        /* @__PURE__ */ e("span", { className: "text-muted text-xs", children: i.default_model ?? "(agent default)" }),
        /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-auto", children: i.source })
      ] }, i.id)) }) : a.allowlist_configured ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-2", children: d.map((i) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          children: i
        },
        i
      )) }) : /* @__PURE__ */ s("p", { className: "text-sm text-muted mt-1", children: [
        "No ",
        /* @__PURE__ */ e("code", { children: "enabled_agents" }),
        " allowlist configured — Rutherford enables every built-in agent plus any configured agent (source: ",
        a.enabled_source || "default",
        ")."
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ s(v, { children: [
      /* @__PURE__ */ e(b, { children: "Config locations" }),
      ((m = t.config_locations) == null ? void 0 : m.global) && /* @__PURE__ */ e(C, { meta: t.config_locations.global }),
      ((p = t.config_locations) == null ? void 0 : p.workspace) && /* @__PURE__ */ e(C, { meta: t.config_locations.workspace })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ s(v, { children: [
      /* @__PURE__ */ e(b, { children: /* @__PURE__ */ s("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(ne, { size: 14 }),
        " acp.json (agent servers)"
      ] }) }),
      l.map((i) => {
        const A = Object.keys(i.agent_servers || {});
        return /* @__PURE__ */ s("div", { className: "mt-2", children: [
          /* @__PURE__ */ e(C, { meta: i }),
          A.length > 0 && /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-1", children: A.map((n) => /* @__PURE__ */ e(
            "span",
            {
              className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
              children: n
            },
            n
          )) })
        ] }, i.path);
      })
    ] }),
    u.length > 0 && /* @__PURE__ */ s(S, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ s(v, { children: [
        /* @__PURE__ */ e(b, { children: "Environment overrides" }),
        /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1", children: u.map((i) => /* @__PURE__ */ s("div", { className: "text-xs", children: [
          /* @__PURE__ */ e("code", { children: i }),
          " = ",
          /* @__PURE__ */ e("code", { className: "text-muted", children: String((t.env_overrides || {})[i]) })
        ] }, i)) }),
        (t.env_overrides || {})._note && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-2", children: String((t.env_overrides || {})._note) })
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ s(v, { children: [
      /* @__PURE__ */ e(b, { children: "Reachability" }),
      /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: ((j = t.reachability) == null ? void 0 : j.note) ?? "—" })
    ] })
  ] });
}
function O({ label: t, children: a }) {
  return /* @__PURE__ */ s("label", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ e("span", { className: "text-xs text-muted", children: t }),
    a
  ] });
}
const w = "px-2 py-1.5 text-sm rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)] text-[var(--fg,#eee)] outline-none focus:border-[var(--accent,#6366f1)]";
function D({
  label: t,
  values: a,
  onChange: d
}) {
  const [c, l] = x("");
  return /* @__PURE__ */ s("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ e("span", { className: "text-xs text-muted", children: t }),
    /* @__PURE__ */ s("div", { className: "flex flex-col gap-1.5", children: [
      a.map((r, o) => /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: w + " flex-1",
            value: r,
            onChange: (u) => {
              const m = a.slice();
              m[o] = u.target.value, d(m);
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-amber-500",
            onClick: () => d(a.filter((u, m) => m !== o)),
            title: "Remove",
            children: /* @__PURE__ */ e(H, { size: 14 })
          }
        )
      ] }, o)),
      /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: w + " flex-1",
            placeholder: `Add ${t}…`,
            value: c,
            onChange: (r) => l(r.target.value),
            onKeyDown: (r) => {
              r.key === "Enter" && c.trim() && (d([...a, c.trim()]), l(""));
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-[var(--accent,#6366f1)]",
            onClick: () => {
              c.trim() && (d([...a, c.trim()]), l(""));
            },
            title: "Add",
            children: /* @__PURE__ */ e(G, { size: 14 })
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
  return /* @__PURE__ */ s("label", { className: "flex items-center gap-2 cursor-pointer", children: [
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
function me(t) {
  const a = t.config || {}, d = (r) => typeof a[r] == "number" ? String(a[r]) : "", c = t.derived || {}, l = (r) => Array.isArray(r) ? r.filter((o) => typeof o == "string") : [];
  return {
    default_safety_mode: typeof a.default_safety_mode == "string" ? a.default_safety_mode : "read_only",
    default_timeout_s: d("default_timeout_s"),
    max_targets: d("max_targets"),
    auto_detect_local_models: a.auto_detect_local_models === !0,
    default_persistence: typeof a.default_persistence == "string" ? a.default_persistence : "ephemeral",
    synthesize_default: a.synthesize_default === !0,
    enabled_agents: l(c.enabled_agents),
    trusted_workspaces: l(c.trusted_workspaces),
    role_dirs: l(c.role_dirs),
    agents: (Array.isArray(t.agents) ? t.agents : []).map((r) => ({
      ...r,
      env: { ...r.env || {} },
      extra: { ...r.extra || {} }
    }))
  };
}
function ue(t, a) {
  if (!a || typeof a != "object") return !1;
  const d = (c, l) => String(c) === String(l);
  for (const [c, l] of Object.entries(t)) {
    const r = a[c];
    if (c === "agents") {
      const o = l && typeof l == "object" ? Object.keys(l).sort() : [], u = r && typeof r == "object" ? Object.keys(r).sort() : [];
      if (o.length !== u.length || o.some((m, p) => m !== u[p])) return !1;
      continue;
    }
    if (Array.isArray(l)) {
      if (!Array.isArray(r) || r.length !== l.length || l.some((o, u) => !d(o, r[u]))) return !1;
      continue;
    }
    if (!d(l, r)) return !1;
  }
  return !0;
}
function fe(t, a) {
  const d = { ...t.config };
  delete d.agents;
  const c = (o, u) => {
    if (u.trim() === "") delete d[o];
    else {
      const m = Number(u);
      Number.isNaN(m) || (d[o] = m);
    }
  };
  d.default_safety_mode = a.default_safety_mode, c("default_timeout_s", a.default_timeout_s), c("max_targets", a.max_targets), d.auto_detect_local_models = a.auto_detect_local_models, d.default_persistence = a.default_persistence, d.synthesize_default = a.synthesize_default;
  const l = (o, u) => {
    const m = u.map((p) => p.trim()).filter(Boolean);
    m.length ? d[o] = m : delete d[o];
  };
  l("enabled_agents", a.enabled_agents), l("trusted_workspaces", a.trusted_workspaces), l("role_dirs", a.role_dirs);
  const r = {};
  for (const o of a.agents) {
    const u = o.id.trim();
    if (!u) continue;
    const m = { ...o.extra };
    o.default_model != null && String(o.default_model).trim() !== "" && (m.default_model = o.default_model), m.enabled = o.enabled, o.env && Object.keys(o.env).length && (m.env = o.env), r[u] = m;
  }
  return Object.keys(r).length && (d.agents = r), d;
}
function pe({
  config: t,
  scope: a,
  onScope: d,
  onSave: c
}) {
  const [l, r] = x(null), [o, u] = x(!1), [m, p] = x(null), j = !!t && t.scope === a;
  V(() => {
    if (!t || t.scope !== a) {
      r((n) => n ?? null);
      return;
    }
    p(null), r(me(t));
  }, [t, a]);
  const i = (n) => r((_) => _ && { ..._, ...n }), A = async () => {
    if (!(!t || !l)) {
      u(!0), p(null);
      try {
        await c(a, fe(t, l)), p({ ok: !0, text: `Saved to ${a} config.toml (backup written).` });
      } catch (n) {
        p({ ok: !1, text: n instanceof Error ? n.message : String(n) });
      } finally {
        u(!1);
      }
    }
  };
  return /* @__PURE__ */ s(S, { children: [
    /* @__PURE__ */ s("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((n) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => d(n),
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (a === n ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: n === "global" ? "Global" : "Workspace"
        },
        n
      )),
      /* @__PURE__ */ s(
        "button",
        {
          onClick: () => void A(),
          disabled: o || !l,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(se, { size: 14 }),
            " ",
            o ? "Saving…" : `Save ${a}`
          ]
        }
      )
    ] }),
    m && /* @__PURE__ */ s(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (m.ok ? "text-green-500" : "text-amber-500"),
        children: [
          m.ok ? /* @__PURE__ */ e(re, { size: 15 }) : /* @__PURE__ */ e(Y, { size: 15 }),
          m.text
        ]
      }
    ),
    !j || !l ? /* @__PURE__ */ s("p", { className: "text-sm text-muted", children: [
      "Loading ",
      a,
      " config…"
    ] }) : /* @__PURE__ */ s(S, { children: [
      /* @__PURE__ */ s(v, { children: [
        /* @__PURE__ */ e(b, { children: "Defaults" }),
        /* @__PURE__ */ e(C, { meta: t }),
        !t.exists && /* @__PURE__ */ s("p", { className: "text-xs text-muted mt-2", children: [
          "No file at this scope yet — saving creates ",
          /* @__PURE__ */ e("code", { children: t.path }),
          "."
        ] }),
        /* @__PURE__ */ s("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(O, { label: "default_safety_mode", children: /* @__PURE__ */ e(
            "select",
            {
              className: w,
              value: l.default_safety_mode,
              onChange: (n) => i({ default_safety_mode: n.target.value }),
              children: oe.map((n) => /* @__PURE__ */ e("option", { value: n, children: n }, n))
            }
          ) }),
          /* @__PURE__ */ e(O, { label: "default_timeout_s", children: /* @__PURE__ */ e(
            "input",
            {
              type: "number",
              className: w,
              value: l.default_timeout_s,
              onChange: (n) => i({ default_timeout_s: n.target.value })
            }
          ) }),
          /* @__PURE__ */ e(O, { label: "max_targets", children: /* @__PURE__ */ e(
            "input",
            {
              type: "number",
              className: w,
              value: l.max_targets,
              onChange: (n) => i({ max_targets: n.target.value })
            }
          ) }),
          /* @__PURE__ */ e(O, { label: "default_persistence", children: /* @__PURE__ */ e(
            "select",
            {
              className: w,
              value: l.default_persistence,
              onChange: (n) => i({ default_persistence: n.target.value }),
              children: ie.map((n) => /* @__PURE__ */ e("option", { value: n, children: n }, n))
            }
          ) })
        ] }),
        /* @__PURE__ */ s("div", { className: "flex flex-wrap gap-6 mt-4", children: [
          /* @__PURE__ */ e(
            B,
            {
              label: "auto_detect_local_models",
              value: l.auto_detect_local_models,
              onChange: (n) => i({ auto_detect_local_models: n })
            }
          ),
          /* @__PURE__ */ e(
            B,
            {
              label: "synthesize_default",
              value: l.synthesize_default,
              onChange: (n) => i({ synthesize_default: n })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ s(v, { children: [
        /* @__PURE__ */ e(b, { children: "Lists" }),
        /* @__PURE__ */ s("div", { className: "grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            D,
            {
              label: "enabled_agents",
              values: l.enabled_agents,
              onChange: (n) => i({ enabled_agents: n })
            }
          ),
          /* @__PURE__ */ e(
            D,
            {
              label: "trusted_workspaces",
              values: l.trusted_workspaces,
              onChange: (n) => i({ trusted_workspaces: n })
            }
          ),
          /* @__PURE__ */ e(
            D,
            {
              label: "role_dirs",
              values: l.role_dirs,
              onChange: (n) => i({ role_dirs: n })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ s(v, { children: [
        /* @__PURE__ */ e(b, { children: "Agents [agents.*]" }),
        /* @__PURE__ */ s("div", { className: "mt-3 flex flex-col gap-2", children: [
          l.agents.map((n, _) => /* @__PURE__ */ s(
            "div",
            {
              className: "flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]",
              children: [
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: w + " w-32",
                    value: n.id,
                    placeholder: "id",
                    onChange: (N) => {
                      const h = l.agents.slice();
                      h[_] = { ...n, id: N.target.value }, i({ agents: h });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: w + " flex-1",
                    value: n.default_model ?? "",
                    placeholder: "default_model (blank = agent default)",
                    onChange: (N) => {
                      const h = l.agents.slice();
                      h[_] = { ...n, default_model: N.target.value }, i({ agents: h });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  B,
                  {
                    label: "enabled",
                    value: n.enabled,
                    onChange: (N) => {
                      const h = l.agents.slice();
                      h[_] = { ...n, enabled: N }, i({ agents: h });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "p-1 text-muted hover:text-amber-500",
                    onClick: () => i({ agents: l.agents.filter((N, h) => h !== _) }),
                    title: "Remove agent",
                    children: /* @__PURE__ */ e(H, { size: 14 })
                  }
                )
              ]
            },
            _
          )),
          /* @__PURE__ */ s(
            "button",
            {
              className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
              onClick: () => i({
                agents: [
                  ...l.agents,
                  { id: "", default_model: "", enabled: !0, env: {}, extra: {} }
                ]
              }),
              children: [
                /* @__PURE__ */ e(G, { size: 14 }),
                " Add agent"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] });
}
function ge({ panels: t }) {
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No panels." });
  const a = Array.isArray(t.sources) ? t.sources : [];
  return a.reduce((c, l) => c + (Array.isArray(l.panels) ? l.panels.length : 0), 0) === 0 ? /* @__PURE__ */ s(v, { children: [
    /* @__PURE__ */ e(b, { children: "Named panels" }),
    /* @__PURE__ */ s("p", { className: "text-sm text-muted mt-1", children: [
      "No ",
      /* @__PURE__ */ e("code", { children: "panels.toon" }),
      " found (read-only — editing is a later step). Checked:"
    ] }),
    a.map((c) => /* @__PURE__ */ e(C, { meta: c }, c.path))
  ] }) : /* @__PURE__ */ e(S, { children: a.map((c) => {
    const l = Array.isArray(c.panels) ? c.panels : [];
    return l.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ s(v, { children: [
      /* @__PURE__ */ s(b, { children: [
        "Panels · ",
        c.scope,
        " (read-only)"
      ] }),
      /* @__PURE__ */ e(C, { meta: c }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-col gap-2", children: l.map((r) => /* @__PURE__ */ s("div", { className: "p-3 rounded bg-[var(--surface-2,#1e1e1e)]", children: [
        /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ e("span", { className: "text-sm font-medium text-[var(--fg,#eee)]", children: r.name }),
          r.strategy && /* @__PURE__ */ e("span", { className: "px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-3,#333)] text-muted", children: r.strategy }),
          r.targets != null && /* @__PURE__ */ s("span", { className: "text-[10px] text-muted", children: [
            r.targets,
            " voices"
          ] })
        ] }),
        r.description && /* @__PURE__ */ e("p", { className: "text-xs text-muted mt-1", children: r.description })
      ] }, r.name)) })
    ] }) }, c.path);
  }) });
}
function he({ roles: t }) {
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No roles." });
  const a = Array.isArray(t.sources) ? t.sources : [];
  return a.reduce((c, l) => c + (Array.isArray(l.roles) ? l.roles.length : 0), 0) === 0 ? /* @__PURE__ */ s(v, { children: [
    /* @__PURE__ */ e(b, { children: "Roles" }),
    /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: "No role markdown files found (read-only — editing is a later step). Checked:" }),
    a.map((c) => /* @__PURE__ */ e(C, { meta: c }, c.path))
  ] }) : /* @__PURE__ */ e(S, { children: a.map((c) => {
    const l = Array.isArray(c.roles) ? c.roles : [];
    return l.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ s(v, { children: [
      /* @__PURE__ */ s(b, { children: [
        "Roles · ",
        c.scope,
        " (read-only)"
      ] }),
      /* @__PURE__ */ e(C, { meta: c }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: l.map((r) => /* @__PURE__ */ e(
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
  Ne as default
};
