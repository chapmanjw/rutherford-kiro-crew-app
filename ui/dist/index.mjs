import { jsxs as r, Fragment as S, jsx as e } from "react/jsx-runtime";
import { useAppApi as H } from "@kirocrew/app-sdk";
import { PageHeader as I, StatCard as R, Card as _, CardTitle as y } from "@kirocrew/app-sdk/ui";
import { useState as b, useCallback as O, useEffect as V } from "react";
import U from "lucide-react";
const {
  Box: W,
  FileCog: X,
  Layers: J,
  UserSquare: Q,
  RefreshCw: Z,
  AlertTriangle: F,
  Save: ee,
  Plus: M,
  X: q,
  CheckCircle2: te,
  Server: ae
} = U, z = "/api/apps/rutherford", le = [
  { id: "status", label: "Overview", icon: W },
  { id: "config", label: "Config", icon: X },
  { id: "panels", label: "Panels", icon: J },
  { id: "roles", label: "Roles", icon: Q }
], se = ["read_only", "propose", "write", "yolo"], re = ["ephemeral", "job"];
function A({ meta: t }) {
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
function ve() {
  const t = H(), [a, o] = b("status"), [c, l] = b(!0), [n, i] = b(null), [m, d] = b(null), [g, f] = b("global"), [u, s] = b(null), [h, w] = b(null), [v, K] = b(null), $ = O(async () => {
    l(!0), i(null);
    try {
      const [p, x, k, j] = await Promise.all([
        t.get(`${z}/status`),
        t.get(`${z}/config?scope=${g}`),
        t.get(`${z}/panels`),
        t.get(`${z}/roles`)
      ]);
      d(p), s(x), w(k), K(j);
    } catch (p) {
      i(p instanceof Error ? p.message : String(p));
    } finally {
      l(!1);
    }
  }, [t, g]);
  V(() => {
    $();
  }, [$]);
  const Y = O(async (p) => {
    f(p);
    try {
      const x = await t.get(`${z}/config?scope=${p}`);
      s(x);
    } catch (x) {
      i(x instanceof Error ? x.message : String(x));
    }
  }, [t]), D = (p) => !!p && typeof p == "object" && p.written === !0, G = O(
    async (p, x) => {
      const k = `${z}/config?scope=${p}`;
      let j = await t.put(k, x);
      D(j) || (await new Promise((N) => setTimeout(N, 600)), j = await t.put(k, x));
      let E = D(j) ? j : null;
      if (!E) {
        const N = await t.get(k);
        if (N && typeof N == "object") {
          const B = N;
          ie(x, B.config) && (E = B);
        }
      }
      if (!E)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your entered values were kept; try Save again."
        );
      s(E);
      try {
        const N = await t.get(`${z}/status`);
        N && typeof N == "object" && d(N);
      } catch {
      }
      return E;
    },
    [t]
  );
  return /* @__PURE__ */ r(S, { children: [
    /* @__PURE__ */ e(I, { title: "Rutherford", subtitle: "Config & status — config.toml editing (Phase 2)" }),
    /* @__PURE__ */ r("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ r("div", { className: "flex gap-1 mb-5 border-b border-[var(--border,#2a2a2a)]", children: [
        le.map(({ id: p, label: x, icon: k }) => /* @__PURE__ */ r(
          "button",
          {
            onClick: () => o(p),
            className: "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors " + (a === p ? "border-[var(--accent,#6366f1)] text-[var(--fg,#eee)]" : "border-transparent text-muted hover:text-[var(--fg,#eee)]"),
            children: [
              /* @__PURE__ */ e(k, { size: 15 }),
              x
            ]
          },
          p
        )),
        /* @__PURE__ */ e(
          "button",
          {
            onClick: () => void $(),
            className: "ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-[var(--fg,#eee)]",
            title: "Reload",
            children: /* @__PURE__ */ e(Z, { size: 15, className: c ? "animate-spin" : "" })
          }
        )
      ] }),
      n && /* @__PURE__ */ r("div", { className: "flex items-center gap-2 text-sm text-amber-500 mb-4", children: [
        /* @__PURE__ */ e(F, { size: 15 }),
        " ",
        n
      ] }),
      c && !m ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "Loading…" }) : /* @__PURE__ */ r(S, { children: [
        a === "status" && /* @__PURE__ */ e(ne, { status: m }),
        a === "config" && /* @__PURE__ */ e(
          de,
          {
            config: u,
            scope: g,
            onScope: Y,
            onSave: G
          }
        ),
        a === "panels" && /* @__PURE__ */ e(me, { panels: h }),
        a === "roles" && /* @__PURE__ */ e(ue, { roles: v })
      ] })
    ] })
  ] });
}
function ne({ status: t }) {
  var d, g, f;
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No status." });
  const a = t.agents || { enabled: [], enabled_source: "", allowlist_configured: !1, roster: [] }, o = Array.isArray(a.enabled) ? a.enabled : [], c = Array.isArray(a.roster) ? a.roster : [], l = Array.isArray(t.acp) ? t.acp : [], n = t.defaults || {}, i = a.allowlist_configured ? String(o.length) : "All", m = Object.keys(t.env_overrides || {}).filter((u) => u !== "_note");
  return /* @__PURE__ */ r(S, { children: [
    /* @__PURE__ */ r("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mb-6", children: [
      /* @__PURE__ */ e(R, { label: "Platform", value: t.platform }),
      /* @__PURE__ */ e(R, { label: "Agents enabled", value: i, accent: !0 }),
      /* @__PURE__ */ e(R, { label: "Safety mode", value: n.safety_mode ?? "read_only" }),
      /* @__PURE__ */ e(
        R,
        {
          label: "Local model detect",
          value: n.auto_detect_local_models ? "on" : "off"
        }
      )
    ] }),
    /* @__PURE__ */ r(_, { children: [
      /* @__PURE__ */ e(y, { children: "Resolved roster" }),
      c.length > 0 ? /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1.5", children: c.map((u) => /* @__PURE__ */ r("div", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ e("span", { className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]", children: u.id }),
        /* @__PURE__ */ e("span", { className: "text-muted text-xs", children: u.default_model ?? "(agent default)" }),
        /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-auto", children: u.source })
      ] }, u.id)) }) : a.allowlist_configured ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-2", children: o.map((u) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          children: u
        },
        u
      )) }) : /* @__PURE__ */ r("p", { className: "text-sm text-muted mt-1", children: [
        "No ",
        /* @__PURE__ */ e("code", { children: "enabled_agents" }),
        " allowlist configured — Rutherford enables every built-in agent plus any configured agent (source: ",
        a.enabled_source || "default",
        ")."
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ r(_, { children: [
      /* @__PURE__ */ e(y, { children: "Config locations" }),
      ((d = t.config_locations) == null ? void 0 : d.global) && /* @__PURE__ */ e(A, { meta: t.config_locations.global }),
      ((g = t.config_locations) == null ? void 0 : g.workspace) && /* @__PURE__ */ e(A, { meta: t.config_locations.workspace })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ r(_, { children: [
      /* @__PURE__ */ e(y, { children: /* @__PURE__ */ r("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(ae, { size: 14 }),
        " acp.json (agent servers)"
      ] }) }),
      l.map((u) => {
        const s = Object.keys(u.agent_servers || {});
        return /* @__PURE__ */ r("div", { className: "mt-2", children: [
          /* @__PURE__ */ e(A, { meta: u }),
          s.length > 0 && /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-1", children: s.map((h) => /* @__PURE__ */ e(
            "span",
            {
              className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
              children: h
            },
            h
          )) })
        ] }, u.path);
      })
    ] }),
    m.length > 0 && /* @__PURE__ */ r(S, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ r(_, { children: [
        /* @__PURE__ */ e(y, { children: "Environment overrides" }),
        /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1", children: m.map((u) => /* @__PURE__ */ r("div", { className: "text-xs", children: [
          /* @__PURE__ */ e("code", { children: u }),
          " = ",
          /* @__PURE__ */ e("code", { className: "text-muted", children: String((t.env_overrides || {})[u]) })
        ] }, u)) }),
        (t.env_overrides || {})._note && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-2", children: String((t.env_overrides || {})._note) })
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ r(_, { children: [
      /* @__PURE__ */ e(y, { children: "Reachability" }),
      /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: ((f = t.reachability) == null ? void 0 : f.note) ?? "—" })
    ] })
  ] });
}
function P({ label: t, children: a }) {
  return /* @__PURE__ */ r("label", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ e("span", { className: "text-xs text-muted", children: t }),
    a
  ] });
}
const C = "px-2 py-1.5 text-sm rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)] text-[var(--fg,#eee)] outline-none focus:border-[var(--accent,#6366f1)]";
function L({
  label: t,
  values: a,
  onChange: o
}) {
  const [c, l] = b("");
  return /* @__PURE__ */ r("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ e("span", { className: "text-xs text-muted", children: t }),
    /* @__PURE__ */ r("div", { className: "flex flex-col gap-1.5", children: [
      a.map((n, i) => /* @__PURE__ */ r("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: C + " flex-1",
            value: n,
            onChange: (m) => {
              const d = a.slice();
              d[i] = m.target.value, o(d);
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-amber-500",
            onClick: () => o(a.filter((m, d) => d !== i)),
            title: "Remove",
            children: /* @__PURE__ */ e(q, { size: 14 })
          }
        )
      ] }, i)),
      /* @__PURE__ */ r("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: C + " flex-1",
            placeholder: `Add ${t}…`,
            value: c,
            onChange: (n) => l(n.target.value),
            onKeyDown: (n) => {
              n.key === "Enter" && c.trim() && (o([...a, c.trim()]), l(""));
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-[var(--accent,#6366f1)]",
            onClick: () => {
              c.trim() && (o([...a, c.trim()]), l(""));
            },
            title: "Add",
            children: /* @__PURE__ */ e(M, { size: 14 })
          }
        )
      ] })
    ] })
  ] });
}
function T({
  label: t,
  value: a,
  onChange: o
}) {
  return /* @__PURE__ */ r("label", { className: "flex items-center gap-2 cursor-pointer", children: [
    /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        onClick: () => o(!a),
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
function ce(t) {
  const a = t.config || {}, o = (n) => typeof a[n] == "number" ? String(a[n]) : "", c = t.derived || {}, l = (n) => Array.isArray(n) ? n.filter((i) => typeof i == "string") : [];
  return {
    default_safety_mode: typeof a.default_safety_mode == "string" ? a.default_safety_mode : "read_only",
    default_timeout_s: o("default_timeout_s"),
    max_targets: o("max_targets"),
    auto_detect_local_models: a.auto_detect_local_models === !0,
    default_persistence: typeof a.default_persistence == "string" ? a.default_persistence : "ephemeral",
    synthesize_default: a.synthesize_default === !0,
    enabled_agents: l(c.enabled_agents),
    trusted_workspaces: l(c.trusted_workspaces),
    role_dirs: l(c.role_dirs),
    agents: (Array.isArray(t.agents) ? t.agents : []).map((n) => ({
      ...n,
      env: { ...n.env || {} },
      extra: { ...n.extra || {} }
    }))
  };
}
function ie(t, a) {
  if (!a || typeof a != "object") return !1;
  const o = (c, l) => String(c) === String(l);
  for (const [c, l] of Object.entries(t)) {
    const n = a[c];
    if (c === "agents") {
      const i = l && typeof l == "object" ? Object.keys(l).sort() : [], m = n && typeof n == "object" ? Object.keys(n).sort() : [];
      if (i.length !== m.length || i.some((d, g) => d !== m[g])) return !1;
      continue;
    }
    if (Array.isArray(l)) {
      if (!Array.isArray(n) || n.length !== l.length || l.some((i, m) => !o(i, n[m]))) return !1;
      continue;
    }
    if (!o(l, n)) return !1;
  }
  return !0;
}
function oe(t, a) {
  const o = { ...t.config };
  delete o.agents;
  const c = (i, m) => {
    if (m.trim() === "") delete o[i];
    else {
      const d = Number(m);
      Number.isNaN(d) || (o[i] = d);
    }
  };
  o.default_safety_mode = a.default_safety_mode, c("default_timeout_s", a.default_timeout_s), c("max_targets", a.max_targets), o.auto_detect_local_models = a.auto_detect_local_models, o.default_persistence = a.default_persistence, o.synthesize_default = a.synthesize_default;
  const l = (i, m) => {
    const d = m.map((g) => g.trim()).filter(Boolean);
    d.length ? o[i] = d : delete o[i];
  };
  l("enabled_agents", a.enabled_agents), l("trusted_workspaces", a.trusted_workspaces), l("role_dirs", a.role_dirs);
  const n = {};
  for (const i of a.agents) {
    const m = i.id.trim();
    if (!m) continue;
    const d = { ...i.extra };
    i.default_model != null && String(i.default_model).trim() !== "" && (d.default_model = i.default_model), d.enabled = i.enabled, i.env && Object.keys(i.env).length && (d.env = i.env), n[m] = d;
  }
  return Object.keys(n).length && (o.agents = n), o;
}
function de({
  config: t,
  scope: a,
  onScope: o,
  onSave: c
}) {
  const [l, n] = b(null), [i, m] = b(!1), [d, g] = b(null);
  V(() => {
    if (!t) {
      n((s) => s ?? null);
      return;
    }
    g(null), n(ce(t));
  }, [t]);
  const f = (s) => n((h) => h && { ...h, ...s }), u = async () => {
    if (!(!t || !l)) {
      m(!0), g(null);
      try {
        await c(a, oe(t, l)), g({ ok: !0, text: `Saved to ${a} config.toml (backup written).` });
      } catch (s) {
        g({ ok: !1, text: s instanceof Error ? s.message : String(s) });
      } finally {
        m(!1);
      }
    }
  };
  return /* @__PURE__ */ r(S, { children: [
    /* @__PURE__ */ r("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((s) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => o(s),
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (a === s ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: s === "global" ? "Global" : "Workspace"
        },
        s
      )),
      /* @__PURE__ */ r(
        "button",
        {
          onClick: () => void u(),
          disabled: i || !l,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(ee, { size: 14 }),
            " ",
            i ? "Saving…" : `Save ${a}`
          ]
        }
      )
    ] }),
    d && /* @__PURE__ */ r(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (d.ok ? "text-green-500" : "text-amber-500"),
        children: [
          d.ok ? /* @__PURE__ */ e(te, { size: 15 }) : /* @__PURE__ */ e(F, { size: 15 }),
          d.text
        ]
      }
    ),
    !t || !l ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No config." }) : /* @__PURE__ */ r(S, { children: [
      /* @__PURE__ */ r(_, { children: [
        /* @__PURE__ */ e(y, { children: "Defaults" }),
        /* @__PURE__ */ e(A, { meta: t }),
        !t.exists && /* @__PURE__ */ r("p", { className: "text-xs text-muted mt-2", children: [
          "No file at this scope yet — saving creates ",
          /* @__PURE__ */ e("code", { children: t.path }),
          "."
        ] }),
        /* @__PURE__ */ r("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(P, { label: "default_safety_mode", children: /* @__PURE__ */ e(
            "select",
            {
              className: C,
              value: l.default_safety_mode,
              onChange: (s) => f({ default_safety_mode: s.target.value }),
              children: se.map((s) => /* @__PURE__ */ e("option", { value: s, children: s }, s))
            }
          ) }),
          /* @__PURE__ */ e(P, { label: "default_timeout_s", children: /* @__PURE__ */ e(
            "input",
            {
              type: "number",
              className: C,
              value: l.default_timeout_s,
              onChange: (s) => f({ default_timeout_s: s.target.value })
            }
          ) }),
          /* @__PURE__ */ e(P, { label: "max_targets", children: /* @__PURE__ */ e(
            "input",
            {
              type: "number",
              className: C,
              value: l.max_targets,
              onChange: (s) => f({ max_targets: s.target.value })
            }
          ) }),
          /* @__PURE__ */ e(P, { label: "default_persistence", children: /* @__PURE__ */ e(
            "select",
            {
              className: C,
              value: l.default_persistence,
              onChange: (s) => f({ default_persistence: s.target.value }),
              children: re.map((s) => /* @__PURE__ */ e("option", { value: s, children: s }, s))
            }
          ) })
        ] }),
        /* @__PURE__ */ r("div", { className: "flex flex-wrap gap-6 mt-4", children: [
          /* @__PURE__ */ e(
            T,
            {
              label: "auto_detect_local_models",
              value: l.auto_detect_local_models,
              onChange: (s) => f({ auto_detect_local_models: s })
            }
          ),
          /* @__PURE__ */ e(
            T,
            {
              label: "synthesize_default",
              value: l.synthesize_default,
              onChange: (s) => f({ synthesize_default: s })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ r(_, { children: [
        /* @__PURE__ */ e(y, { children: "Lists" }),
        /* @__PURE__ */ r("div", { className: "grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            L,
            {
              label: "enabled_agents",
              values: l.enabled_agents,
              onChange: (s) => f({ enabled_agents: s })
            }
          ),
          /* @__PURE__ */ e(
            L,
            {
              label: "trusted_workspaces",
              values: l.trusted_workspaces,
              onChange: (s) => f({ trusted_workspaces: s })
            }
          ),
          /* @__PURE__ */ e(
            L,
            {
              label: "role_dirs",
              values: l.role_dirs,
              onChange: (s) => f({ role_dirs: s })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ r(_, { children: [
        /* @__PURE__ */ e(y, { children: "Agents [agents.*]" }),
        /* @__PURE__ */ r("div", { className: "mt-3 flex flex-col gap-2", children: [
          l.agents.map((s, h) => /* @__PURE__ */ r(
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
                    onChange: (w) => {
                      const v = l.agents.slice();
                      v[h] = { ...s, id: w.target.value }, f({ agents: v });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: C + " flex-1",
                    value: s.default_model ?? "",
                    placeholder: "default_model (blank = agent default)",
                    onChange: (w) => {
                      const v = l.agents.slice();
                      v[h] = { ...s, default_model: w.target.value }, f({ agents: v });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  T,
                  {
                    label: "enabled",
                    value: s.enabled,
                    onChange: (w) => {
                      const v = l.agents.slice();
                      v[h] = { ...s, enabled: w }, f({ agents: v });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "p-1 text-muted hover:text-amber-500",
                    onClick: () => f({ agents: l.agents.filter((w, v) => v !== h) }),
                    title: "Remove agent",
                    children: /* @__PURE__ */ e(q, { size: 14 })
                  }
                )
              ]
            },
            h
          )),
          /* @__PURE__ */ r(
            "button",
            {
              className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
              onClick: () => f({
                agents: [
                  ...l.agents,
                  { id: "", default_model: "", enabled: !0, env: {}, extra: {} }
                ]
              }),
              children: [
                /* @__PURE__ */ e(M, { size: 14 }),
                " Add agent"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] });
}
function me({ panels: t }) {
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No panels." });
  const a = Array.isArray(t.sources) ? t.sources : [];
  return a.reduce((c, l) => c + (Array.isArray(l.panels) ? l.panels.length : 0), 0) === 0 ? /* @__PURE__ */ r(_, { children: [
    /* @__PURE__ */ e(y, { children: "Named panels" }),
    /* @__PURE__ */ r("p", { className: "text-sm text-muted mt-1", children: [
      "No ",
      /* @__PURE__ */ e("code", { children: "panels.toon" }),
      " found (read-only — editing is a later step). Checked:"
    ] }),
    a.map((c) => /* @__PURE__ */ e(A, { meta: c }, c.path))
  ] }) : /* @__PURE__ */ e(S, { children: a.map((c) => {
    const l = Array.isArray(c.panels) ? c.panels : [];
    return l.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ r(_, { children: [
      /* @__PURE__ */ r(y, { children: [
        "Panels · ",
        c.scope,
        " (read-only)"
      ] }),
      /* @__PURE__ */ e(A, { meta: c }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-col gap-2", children: l.map((n) => /* @__PURE__ */ r("div", { className: "p-3 rounded bg-[var(--surface-2,#1e1e1e)]", children: [
        /* @__PURE__ */ r("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ e("span", { className: "text-sm font-medium text-[var(--fg,#eee)]", children: n.name }),
          n.strategy && /* @__PURE__ */ e("span", { className: "px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-3,#333)] text-muted", children: n.strategy }),
          n.targets != null && /* @__PURE__ */ r("span", { className: "text-[10px] text-muted", children: [
            n.targets,
            " voices"
          ] })
        ] }),
        n.description && /* @__PURE__ */ e("p", { className: "text-xs text-muted mt-1", children: n.description })
      ] }, n.name)) })
    ] }) }, c.path);
  }) });
}
function ue({ roles: t }) {
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No roles." });
  const a = Array.isArray(t.sources) ? t.sources : [];
  return a.reduce((c, l) => c + (Array.isArray(l.roles) ? l.roles.length : 0), 0) === 0 ? /* @__PURE__ */ r(_, { children: [
    /* @__PURE__ */ e(y, { children: "Roles" }),
    /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: "No role markdown files found (read-only — editing is a later step). Checked:" }),
    a.map((c) => /* @__PURE__ */ e(A, { meta: c }, c.path))
  ] }) : /* @__PURE__ */ e(S, { children: a.map((c) => {
    const l = Array.isArray(c.roles) ? c.roles : [];
    return l.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ r(_, { children: [
      /* @__PURE__ */ r(y, { children: [
        "Roles · ",
        c.scope,
        " (read-only)"
      ] }),
      /* @__PURE__ */ e(A, { meta: c }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: l.map((n) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-1 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          title: n.path,
          children: n.name
        },
        n.path
      )) })
    ] }) }, c.path);
  }) });
}
export {
  ve as default
};
