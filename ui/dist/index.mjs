import { jsxs as a, Fragment as w, jsx as e } from "react/jsx-runtime";
import { useAppApi as K } from "@kirocrew/app-sdk";
import { PageHeader as q, StatCard as z, Card as h, CardTitle as x } from "@kirocrew/app-sdk/ui";
import { useState as g, useCallback as P, useEffect as T } from "react";
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
function C({ meta: t }) {
  return /* @__PURE__ */ a("div", { className: "text-xs text-muted mt-1", children: [
    /* @__PURE__ */ e("span", { className: "opacity-70", children: t.scope }),
    " · ",
    /* @__PURE__ */ e("code", { className: "text-xs", children: t.path }),
    " · ",
    /* @__PURE__ */ e("span", { className: t.exists ? "text-green-500" : "text-muted opacity-60", children: t.exists ? "found" : "not present" }),
    t.error && /* @__PURE__ */ a("span", { className: "text-amber-500", children: [
      " · ",
      t.error
    ] })
  ] });
}
function fe() {
  const t = K(), [n, l] = g("status"), [c, s] = g(!0), [d, i] = g(null), [m, o] = g(null), [b, u] = g("global"), [A, r] = g(null), [v, N] = g(null), [p, V] = g(null), E = P(async () => {
    s(!0), i(null);
    try {
      const [f, _, k, $] = await Promise.all([
        t.get(`${S}/status`),
        t.get(`${S}/config?scope=${b}`),
        t.get(`${S}/panels`),
        t.get(`${S}/roles`)
      ]);
      o(f), r(_), N(k), V($);
    } catch (f) {
      i(f instanceof Error ? f.message : String(f));
    } finally {
      s(!1);
    }
  }, [t, b]);
  T(() => {
    E();
  }, [E]);
  const F = P(async (f) => {
    u(f);
    try {
      const _ = await t.get(`${S}/config?scope=${f}`);
      r(_);
    } catch (_) {
      i(_ instanceof Error ? _.message : String(_));
    }
  }, [t]), M = P(
    async (f, _) => {
      const k = await t.put(`${S}/config?scope=${f}`, _);
      r(k);
      try {
        const $ = await t.get(`${S}/status`);
        o($);
      } catch {
      }
      return k;
    },
    [t]
  );
  return /* @__PURE__ */ a(w, { children: [
    /* @__PURE__ */ e(q, { title: "Rutherford", subtitle: "Config & status — config.toml editing (Phase 2)" }),
    /* @__PURE__ */ a("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ a("div", { className: "flex gap-1 mb-5 border-b border-[var(--border,#2a2a2a)]", children: [
        Z.map(({ id: f, label: _, icon: k }) => /* @__PURE__ */ a(
          "button",
          {
            onClick: () => l(f),
            className: "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors " + (n === f ? "border-[var(--accent,#6366f1)] text-[var(--fg,#eee)]" : "border-transparent text-muted hover:text-[var(--fg,#eee)]"),
            children: [
              /* @__PURE__ */ e(k, { size: 15 }),
              _
            ]
          },
          f
        )),
        /* @__PURE__ */ e(
          "button",
          {
            onClick: () => void E(),
            className: "ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-[var(--fg,#eee)]",
            title: "Reload",
            children: /* @__PURE__ */ e(X, { size: 15, className: c ? "animate-spin" : "" })
          }
        )
      ] }),
      d && /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-sm text-amber-500 mb-4", children: [
        /* @__PURE__ */ e(D, { size: 15 }),
        " ",
        d
      ] }),
      c && !m ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "Loading…" }) : /* @__PURE__ */ a(w, { children: [
        n === "status" && /* @__PURE__ */ e(ae, { status: m }),
        n === "config" && /* @__PURE__ */ e(
          ne,
          {
            config: A,
            scope: b,
            onScope: F,
            onSave: M
          }
        ),
        n === "panels" && /* @__PURE__ */ e(re, { panels: v }),
        n === "roles" && /* @__PURE__ */ e(ce, { roles: p })
      ] })
    ] })
  ] });
}
function ae({ status: t }) {
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No status." });
  const n = t.agents.enabled, l = t.agents.allowlist_configured ? String(n.length) : "All", c = Object.keys(t.env_overrides || {}).filter((s) => s !== "_note");
  return /* @__PURE__ */ a(w, { children: [
    /* @__PURE__ */ a("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mb-6", children: [
      /* @__PURE__ */ e(z, { label: "Platform", value: t.platform }),
      /* @__PURE__ */ e(z, { label: "Agents enabled", value: l, accent: !0 }),
      /* @__PURE__ */ e(z, { label: "Safety mode", value: t.defaults.safety_mode ?? "read_only" }),
      /* @__PURE__ */ e(
        z,
        {
          label: "Local model detect",
          value: t.defaults.auto_detect_local_models ? "on" : "off"
        }
      )
    ] }),
    /* @__PURE__ */ a(h, { children: [
      /* @__PURE__ */ e(x, { children: "Resolved roster" }),
      t.agents.roster && t.agents.roster.length > 0 ? /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1.5", children: t.agents.roster.map((s) => /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ e("span", { className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]", children: s.id }),
        /* @__PURE__ */ e("span", { className: "text-muted text-xs", children: s.default_model ?? "(agent default)" }),
        /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-auto", children: s.source })
      ] }, s.id)) }) : t.agents.allowlist_configured ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-2", children: n.map((s) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          children: s
        },
        s
      )) }) : /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-1", children: [
        "No ",
        /* @__PURE__ */ e("code", { children: "enabled_agents" }),
        " allowlist configured — Rutherford enables every built-in agent plus any configured agent (source: ",
        t.agents.enabled_source,
        ")."
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a(h, { children: [
      /* @__PURE__ */ e(x, { children: "Config locations" }),
      /* @__PURE__ */ e(C, { meta: t.config_locations.global }),
      /* @__PURE__ */ e(C, { meta: t.config_locations.workspace })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a(h, { children: [
      /* @__PURE__ */ e(x, { children: /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(Q, { size: 14 }),
        " acp.json (agent servers)"
      ] }) }),
      t.acp.map((s) => {
        const d = Object.keys(s.agent_servers || {});
        return /* @__PURE__ */ a("div", { className: "mt-2", children: [
          /* @__PURE__ */ e(C, { meta: s }),
          d.length > 0 && /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-1", children: d.map((i) => /* @__PURE__ */ e(
            "span",
            {
              className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
              children: i
            },
            i
          )) })
        ] }, s.path);
      })
    ] }),
    c.length > 0 && /* @__PURE__ */ a(w, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(h, { children: [
        /* @__PURE__ */ e(x, { children: "Environment overrides" }),
        /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1", children: c.map((s) => /* @__PURE__ */ a("div", { className: "text-xs", children: [
          /* @__PURE__ */ e("code", { children: s }),
          " = ",
          /* @__PURE__ */ e("code", { className: "text-muted", children: String(t.env_overrides[s]) })
        ] }, s)) }),
        t.env_overrides._note && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-2", children: String(t.env_overrides._note) })
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a(h, { children: [
      /* @__PURE__ */ e(x, { children: "Reachability" }),
      /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: t.reachability.note })
    ] })
  ] });
}
function R({ label: t, children: n }) {
  return /* @__PURE__ */ a("label", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ e("span", { className: "text-xs text-muted", children: t }),
    n
  ] });
}
const y = "px-2 py-1.5 text-sm rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)] text-[var(--fg,#eee)] outline-none focus:border-[var(--accent,#6366f1)]";
function j({
  label: t,
  values: n,
  onChange: l
}) {
  const [c, s] = g("");
  return /* @__PURE__ */ a("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ e("span", { className: "text-xs text-muted", children: t }),
    /* @__PURE__ */ a("div", { className: "flex flex-col gap-1.5", children: [
      n.map((d, i) => /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: y + " flex-1",
            value: d,
            onChange: (m) => {
              const o = n.slice();
              o[i] = m.target.value, l(o);
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-amber-500",
            onClick: () => l(n.filter((m, o) => o !== i)),
            title: "Remove",
            children: /* @__PURE__ */ e(B, { size: 14 })
          }
        )
      ] }, i)),
      /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: y + " flex-1",
            placeholder: `Add ${t}…`,
            value: c,
            onChange: (d) => s(d.target.value),
            onKeyDown: (d) => {
              d.key === "Enter" && c.trim() && (l([...n, c.trim()]), s(""));
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-[var(--accent,#6366f1)]",
            onClick: () => {
              c.trim() && (l([...n, c.trim()]), s(""));
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
  value: n,
  onChange: l
}) {
  return /* @__PURE__ */ a("label", { className: "flex items-center gap-2 cursor-pointer", children: [
    /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        onClick: () => l(!n),
        className: "w-9 h-5 rounded-full transition-colors relative " + (n ? "bg-[var(--accent,#6366f1)]" : "bg-[var(--surface-3,#333)]"),
        children: /* @__PURE__ */ e(
          "span",
          {
            className: "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all " + (n ? "left-4" : "left-0.5")
          }
        )
      }
    ),
    /* @__PURE__ */ e("span", { className: "text-sm text-[var(--fg,#eee)]", children: t })
  ] });
}
function le(t) {
  const n = t.config || {}, l = (c) => typeof n[c] == "number" ? String(n[c]) : "";
  return {
    default_safety_mode: typeof n.default_safety_mode == "string" ? n.default_safety_mode : "read_only",
    default_timeout_s: l("default_timeout_s"),
    max_targets: l("max_targets"),
    auto_detect_local_models: n.auto_detect_local_models === !0,
    default_persistence: typeof n.default_persistence == "string" ? n.default_persistence : "ephemeral",
    synthesize_default: n.synthesize_default === !0,
    enabled_agents: t.derived.enabled_agents.slice(),
    trusted_workspaces: t.derived.trusted_workspaces.slice(),
    role_dirs: t.derived.role_dirs.slice(),
    agents: (t.agents || []).map((c) => ({ ...c, env: { ...c.env }, extra: { ...c.extra } }))
  };
}
function se(t, n) {
  const l = { ...t.config };
  delete l.agents;
  const c = (i, m) => {
    if (m.trim() === "") delete l[i];
    else {
      const o = Number(m);
      Number.isNaN(o) || (l[i] = o);
    }
  };
  l.default_safety_mode = n.default_safety_mode, c("default_timeout_s", n.default_timeout_s), c("max_targets", n.max_targets), l.auto_detect_local_models = n.auto_detect_local_models, l.default_persistence = n.default_persistence, l.synthesize_default = n.synthesize_default;
  const s = (i, m) => {
    const o = m.map((b) => b.trim()).filter(Boolean);
    o.length ? l[i] = o : delete l[i];
  };
  s("enabled_agents", n.enabled_agents), s("trusted_workspaces", n.trusted_workspaces), s("role_dirs", n.role_dirs);
  const d = {};
  for (const i of n.agents) {
    const m = i.id.trim();
    if (!m) continue;
    const o = { ...i.extra };
    i.default_model != null && String(i.default_model).trim() !== "" && (o.default_model = i.default_model), o.enabled = i.enabled, i.env && Object.keys(i.env).length && (o.env = i.env), d[m] = o;
  }
  return Object.keys(d).length && (l.agents = d), l;
}
function ne({
  config: t,
  scope: n,
  onScope: l,
  onSave: c
}) {
  const [s, d] = g(null), [i, m] = g(!1), [o, b] = g(null);
  T(() => {
    b(null), d(t ? le(t) : null);
  }, [t]);
  const u = (r) => d((v) => v && { ...v, ...r }), A = async () => {
    if (!(!t || !s)) {
      m(!0), b(null);
      try {
        await c(n, se(t, s)), b({ ok: !0, text: `Saved to ${n} config.toml (backup written).` });
      } catch (r) {
        b({ ok: !1, text: r instanceof Error ? r.message : String(r) });
      } finally {
        m(!1);
      }
    }
  };
  return /* @__PURE__ */ a(w, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((r) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => l(r),
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (n === r ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: r === "global" ? "Global" : "Workspace"
        },
        r
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: () => void A(),
          disabled: i || !s,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(Y, { size: 14 }),
            " ",
            i ? "Saving…" : `Save ${n}`
          ]
        }
      )
    ] }),
    o && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (o.ok ? "text-green-500" : "text-amber-500"),
        children: [
          o.ok ? /* @__PURE__ */ e(J, { size: 15 }) : /* @__PURE__ */ e(D, { size: 15 }),
          o.text
        ]
      }
    ),
    !t || !s ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No config." }) : /* @__PURE__ */ a(w, { children: [
      /* @__PURE__ */ a(h, { children: [
        /* @__PURE__ */ e(x, { children: "Defaults" }),
        /* @__PURE__ */ e(C, { meta: t }),
        !t.exists && /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-2", children: [
          "No file at this scope yet — saving creates ",
          /* @__PURE__ */ e("code", { children: t.path }),
          "."
        ] }),
        /* @__PURE__ */ a("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(R, { label: "default_safety_mode", children: /* @__PURE__ */ e(
            "select",
            {
              className: y,
              value: s.default_safety_mode,
              onChange: (r) => u({ default_safety_mode: r.target.value }),
              children: ee.map((r) => /* @__PURE__ */ e("option", { value: r, children: r }, r))
            }
          ) }),
          /* @__PURE__ */ e(R, { label: "default_timeout_s", children: /* @__PURE__ */ e(
            "input",
            {
              type: "number",
              className: y,
              value: s.default_timeout_s,
              onChange: (r) => u({ default_timeout_s: r.target.value })
            }
          ) }),
          /* @__PURE__ */ e(R, { label: "max_targets", children: /* @__PURE__ */ e(
            "input",
            {
              type: "number",
              className: y,
              value: s.max_targets,
              onChange: (r) => u({ max_targets: r.target.value })
            }
          ) }),
          /* @__PURE__ */ e(R, { label: "default_persistence", children: /* @__PURE__ */ e(
            "select",
            {
              className: y,
              value: s.default_persistence,
              onChange: (r) => u({ default_persistence: r.target.value }),
              children: te.map((r) => /* @__PURE__ */ e("option", { value: r, children: r }, r))
            }
          ) })
        ] }),
        /* @__PURE__ */ a("div", { className: "flex flex-wrap gap-6 mt-4", children: [
          /* @__PURE__ */ e(
            L,
            {
              label: "auto_detect_local_models",
              value: s.auto_detect_local_models,
              onChange: (r) => u({ auto_detect_local_models: r })
            }
          ),
          /* @__PURE__ */ e(
            L,
            {
              label: "synthesize_default",
              value: s.synthesize_default,
              onChange: (r) => u({ synthesize_default: r })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(h, { children: [
        /* @__PURE__ */ e(x, { children: "Lists" }),
        /* @__PURE__ */ a("div", { className: "grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            j,
            {
              label: "enabled_agents",
              values: s.enabled_agents,
              onChange: (r) => u({ enabled_agents: r })
            }
          ),
          /* @__PURE__ */ e(
            j,
            {
              label: "trusted_workspaces",
              values: s.trusted_workspaces,
              onChange: (r) => u({ trusted_workspaces: r })
            }
          ),
          /* @__PURE__ */ e(
            j,
            {
              label: "role_dirs",
              values: s.role_dirs,
              onChange: (r) => u({ role_dirs: r })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(h, { children: [
        /* @__PURE__ */ e(x, { children: "Agents [agents.*]" }),
        /* @__PURE__ */ a("div", { className: "mt-3 flex flex-col gap-2", children: [
          s.agents.map((r, v) => /* @__PURE__ */ a(
            "div",
            {
              className: "flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]",
              children: [
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: y + " w-32",
                    value: r.id,
                    placeholder: "id",
                    onChange: (N) => {
                      const p = s.agents.slice();
                      p[v] = { ...r, id: N.target.value }, u({ agents: p });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: y + " flex-1",
                    value: r.default_model ?? "",
                    placeholder: "default_model (blank = agent default)",
                    onChange: (N) => {
                      const p = s.agents.slice();
                      p[v] = { ...r, default_model: N.target.value }, u({ agents: p });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  L,
                  {
                    label: "enabled",
                    value: r.enabled,
                    onChange: (N) => {
                      const p = s.agents.slice();
                      p[v] = { ...r, enabled: N }, u({ agents: p });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "p-1 text-muted hover:text-amber-500",
                    onClick: () => u({ agents: s.agents.filter((N, p) => p !== v) }),
                    title: "Remove agent",
                    children: /* @__PURE__ */ e(B, { size: 14 })
                  }
                )
              ]
            },
            v
          )),
          /* @__PURE__ */ a(
            "button",
            {
              className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
              onClick: () => u({
                agents: [
                  ...s.agents,
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
  return t ? t.sources.reduce((l, c) => l + c.panels.length, 0) === 0 ? /* @__PURE__ */ a(h, { children: [
    /* @__PURE__ */ e(x, { children: "Named panels" }),
    /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-1", children: [
      "No ",
      /* @__PURE__ */ e("code", { children: "panels.toon" }),
      " found (read-only — editing is a later step). Checked:"
    ] }),
    t.sources.map((l) => /* @__PURE__ */ e(C, { meta: l }, l.path))
  ] }) : /* @__PURE__ */ e(w, { children: t.sources.map(
    (l) => l.panels.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ a(h, { children: [
      /* @__PURE__ */ a(x, { children: [
        "Panels · ",
        l.scope,
        " (read-only)"
      ] }),
      /* @__PURE__ */ e(C, { meta: l }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-col gap-2", children: l.panels.map((c) => /* @__PURE__ */ a("div", { className: "p-3 rounded bg-[var(--surface-2,#1e1e1e)]", children: [
        /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ e("span", { className: "text-sm font-medium text-[var(--fg,#eee)]", children: c.name }),
          c.strategy && /* @__PURE__ */ e("span", { className: "px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-3,#333)] text-muted", children: c.strategy }),
          c.targets != null && /* @__PURE__ */ a("span", { className: "text-[10px] text-muted", children: [
            c.targets,
            " voices"
          ] })
        ] }),
        c.description && /* @__PURE__ */ e("p", { className: "text-xs text-muted mt-1", children: c.description })
      ] }, c.name)) })
    ] }) }, l.path)
  ) }) : /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No panels." });
}
function ce({ roles: t }) {
  return t ? t.sources.reduce((l, c) => l + c.roles.length, 0) === 0 ? /* @__PURE__ */ a(h, { children: [
    /* @__PURE__ */ e(x, { children: "Roles" }),
    /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: "No role markdown files found (read-only — editing is a later step). Checked:" }),
    t.sources.map((l) => /* @__PURE__ */ e(C, { meta: l }, l.path))
  ] }) : /* @__PURE__ */ e(w, { children: t.sources.map(
    (l) => l.roles.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ a(h, { children: [
      /* @__PURE__ */ a(x, { children: [
        "Roles · ",
        l.scope,
        " (read-only)"
      ] }),
      /* @__PURE__ */ e(C, { meta: l }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: l.roles.map((c) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-1 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          title: c.path,
          children: c.name
        },
        c.path
      )) })
    ] }) }, l.path)
  ) }) : /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No roles." });
}
export {
  fe as default
};
