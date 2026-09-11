import { jsxs as s, Fragment as $, jsx as e } from "react/jsx-runtime";
import { useAppApi as ne } from "@kirocrew/app-sdk";
import { PageHeader as ie, StatCard as G, Card as S, CardTitle as C } from "@kirocrew/app-sdk/ui";
import { useState as b, useRef as ce, useCallback as V, useEffect as I } from "react";
import oe from "lucide-react";
const {
  Box: de,
  FileCog: me,
  Layers: ue,
  UserSquare: fe,
  RefreshCw: pe,
  AlertTriangle: W,
  Save: te,
  Plus: Y,
  X: J,
  CheckCircle2: ae,
  Server: he,
  Trash2: ge
} = oe, R = "/api/apps/rutherford", xe = [
  { id: "status", label: "Overview", icon: de },
  { id: "config", label: "Config", icon: me },
  { id: "panels", label: "Panels", icon: ue },
  { id: "roles", label: "Roles", icon: fe }
], ve = ["read_only", "propose", "write", "yolo"], be = ["ephemeral", "job"];
function F({ meta: t }) {
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
function Fe() {
  const t = ne(), [r, c] = b("status"), [o, l] = b(!0), [n, a] = b(null), [m, u] = b(null), [p, k] = b("global"), [d, z] = b(null), [i, y] = b(null), [A, f] = b(null), g = ce("global"), x = V(
    async (h) => {
      g.current = h;
      try {
        const v = await t.get(`${R}/rutherford-config?scope=${h}`);
        if (g.current !== h) return;
        if (!v || typeof v != "object") {
          a(`No config returned for ${h} scope.`);
          return;
        }
        z({ ...v, scope: h }), a(null);
      } catch (v) {
        if (g.current !== h) return;
        a(v instanceof Error ? v.message : String(v));
      }
    },
    [t]
  ), j = V(async () => {
    l(!0), a(null);
    try {
      const [h, v, E] = await Promise.all([
        t.get(`${R}/status`),
        t.get(`${R}/panels`),
        t.get(`${R}/roles`)
      ]);
      u(h), y(v), f(E);
    } catch (h) {
      a(h instanceof Error ? h.message : String(h));
    } finally {
      l(!1);
    }
  }, [t]);
  I(() => {
    j();
  }, [j]), I(() => {
    x(p);
  }, [x, p]);
  const D = V((h) => {
    k(h);
  }, []), X = (h) => !!h && typeof h == "object" && h.written === !0, re = V(
    async (h, v) => {
      const E = `${R}/rutherford-config?scope=${h}`;
      let O = await t.put(E, v);
      X(O) || (await new Promise((N) => setTimeout(N, 600)), O = await t.put(E, v));
      let P = X(O) ? O : null;
      if (!P) {
        const N = await t.get(E);
        if (N && typeof N == "object") {
          const M = N;
          _e(v, M.config) && (P = M);
        }
      }
      if (!P)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your entered values were kept; try Save again."
        );
      const T = P.scope ?? g.current;
      g.current = T, z({ ...P, scope: T });
      try {
        const N = await t.get(`${R}/status`);
        N && typeof N == "object" && u(N);
      } catch {
      }
      return P;
    },
    [t]
  ), se = V(
    async (h, v) => {
      var M;
      const E = `${R}/rutherford-panels?scope=${h}`, O = { panels: v }, P = (_) => !!_ && typeof _ == "object" && _.written === !0;
      let T = await t.put(E, O);
      P(T) || (await new Promise((_) => setTimeout(_, 600)), T = await t.put(E, O));
      let N = P(T) ? T : null;
      if (!N) {
        const _ = await t.get(`${R}/panels`), K = (M = _ == null ? void 0 : _.sources) == null ? void 0 : M.find((q) => q.scope === h);
        if (K) {
          const q = v.map((B) => B.name).sort(), Q = (Array.isArray(K.panels) ? K.panels : []).map((B) => B.name).sort();
          q.length === Q.length && q.every((B, le) => B === Q[le]) && (N = { ...K, written: !0 });
        }
      }
      if (!N)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your edits were kept; try Save again."
        );
      try {
        const _ = await t.get(`${R}/panels`);
        _ && typeof _ == "object" && y(_);
      } catch {
      }
      return N;
    },
    [t]
  );
  return /* @__PURE__ */ s($, { children: [
    /* @__PURE__ */ e(ie, { title: "Rutherford", subtitle: "Config & status — config.toml editing (Phase 2)" }),
    /* @__PURE__ */ s("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ s("div", { className: "flex gap-1 mb-5 border-b border-[var(--border,#2a2a2a)]", children: [
        xe.map(({ id: h, label: v, icon: E }) => /* @__PURE__ */ s(
          "button",
          {
            onClick: () => c(h),
            className: "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors " + (r === h ? "border-[var(--accent,#6366f1)] text-[var(--fg,#eee)]" : "border-transparent text-muted hover:text-[var(--fg,#eee)]"),
            children: [
              /* @__PURE__ */ e(E, { size: 15 }),
              v
            ]
          },
          h
        )),
        /* @__PURE__ */ e(
          "button",
          {
            onClick: () => void j(),
            className: "ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-[var(--fg,#eee)]",
            title: "Reload",
            children: /* @__PURE__ */ e(pe, { size: 15, className: o ? "animate-spin" : "" })
          }
        )
      ] }),
      n && /* @__PURE__ */ s("div", { className: "flex items-center gap-2 text-sm text-amber-500 mb-4", children: [
        /* @__PURE__ */ e(W, { size: 15 }),
        " ",
        n
      ] }),
      o && !m ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "Loading…" }) : /* @__PURE__ */ s($, { children: [
        r === "status" && /* @__PURE__ */ e(ye, { status: m }),
        r === "config" && /* @__PURE__ */ e(
          ke,
          {
            config: d,
            scope: p,
            onScope: D,
            onSave: re
          }
        ),
        r === "panels" && /* @__PURE__ */ e(Pe, { panels: i, onSave: se }),
        r === "roles" && /* @__PURE__ */ e(Re, { roles: A })
      ] })
    ] })
  ] });
}
function ye({ status: t }) {
  var u, p, k;
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No status." });
  const r = t.agents || { enabled: [], enabled_source: "", allowlist_configured: !1, roster: [] }, c = Array.isArray(r.enabled) ? r.enabled : [], o = Array.isArray(r.roster) ? r.roster : [], l = Array.isArray(t.acp) ? t.acp : [], n = t.defaults || {}, a = r.allowlist_configured ? String(c.length) : "All", m = Object.keys(t.env_overrides || {}).filter((d) => d !== "_note");
  return /* @__PURE__ */ s($, { children: [
    /* @__PURE__ */ s("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mb-6", children: [
      /* @__PURE__ */ e(G, { label: "Platform", value: t.platform }),
      /* @__PURE__ */ e(G, { label: "Agents enabled", value: a, accent: !0 }),
      /* @__PURE__ */ e(G, { label: "Safety mode", value: n.safety_mode ?? "read_only" }),
      /* @__PURE__ */ e(
        G,
        {
          label: "Local model detect",
          value: n.auto_detect_local_models ? "on" : "off"
        }
      )
    ] }),
    /* @__PURE__ */ s(S, { children: [
      /* @__PURE__ */ e(C, { children: "Resolved roster" }),
      o.length > 0 ? /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1.5", children: o.map((d) => /* @__PURE__ */ s("div", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ e("span", { className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]", children: d.id }),
        /* @__PURE__ */ e("span", { className: "text-muted text-xs", children: d.default_model ?? "(agent default)" }),
        /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-auto", children: d.source })
      ] }, d.id)) }) : r.allowlist_configured ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-2", children: c.map((d) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          children: d
        },
        d
      )) }) : /* @__PURE__ */ s("p", { className: "text-sm text-muted mt-1", children: [
        "No ",
        /* @__PURE__ */ e("code", { children: "enabled_agents" }),
        " allowlist configured — Rutherford enables every built-in agent plus any configured agent (source: ",
        r.enabled_source || "default",
        ")."
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ s(S, { children: [
      /* @__PURE__ */ e(C, { children: "Config locations" }),
      ((u = t.config_locations) == null ? void 0 : u.global) && /* @__PURE__ */ e(F, { meta: t.config_locations.global }),
      ((p = t.config_locations) == null ? void 0 : p.workspace) && /* @__PURE__ */ e(F, { meta: t.config_locations.workspace })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ s(S, { children: [
      /* @__PURE__ */ e(C, { children: /* @__PURE__ */ s("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(he, { size: 14 }),
        " acp.json (agent servers)"
      ] }) }),
      l.map((d) => {
        const z = Object.keys(d.agent_servers || {});
        return /* @__PURE__ */ s("div", { className: "mt-2", children: [
          /* @__PURE__ */ e(F, { meta: d }),
          z.length > 0 && /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-1", children: z.map((i) => /* @__PURE__ */ e(
            "span",
            {
              className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
              children: i
            },
            i
          )) })
        ] }, d.path);
      })
    ] }),
    m.length > 0 && /* @__PURE__ */ s($, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ s(S, { children: [
        /* @__PURE__ */ e(C, { children: "Environment overrides" }),
        /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1", children: m.map((d) => /* @__PURE__ */ s("div", { className: "text-xs", children: [
          /* @__PURE__ */ e("code", { children: d }),
          " = ",
          /* @__PURE__ */ e("code", { className: "text-muted", children: String((t.env_overrides || {})[d]) })
        ] }, d)) }),
        (t.env_overrides || {})._note && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-2", children: String((t.env_overrides || {})._note) })
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ s(S, { children: [
      /* @__PURE__ */ e(C, { children: "Reachability" }),
      /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: ((k = t.reachability) == null ? void 0 : k.note) ?? "—" })
    ] })
  ] });
}
function L({
  label: t,
  hint: r,
  desc: c,
  children: o
}) {
  return /* @__PURE__ */ s("label", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ s("span", { className: "text-sm text-[var(--fg,#eee)]", children: [
      t,
      r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r })
    ] }),
    c && /* @__PURE__ */ e("span", { className: "text-[11px] text-muted -mt-0.5", children: c }),
    o
  ] });
}
const w = "px-2 py-1.5 text-sm rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)] text-[var(--fg,#eee)] outline-none focus:border-[var(--accent,#6366f1)]";
function H({
  label: t,
  hint: r,
  desc: c,
  values: o,
  onChange: l
}) {
  const [n, a] = b("");
  return /* @__PURE__ */ s("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ s("span", { className: "text-sm text-[var(--fg,#eee)]", children: [
      t,
      r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r })
    ] }),
    c && /* @__PURE__ */ e("span", { className: "text-[11px] text-muted -mt-0.5", children: c }),
    /* @__PURE__ */ s("div", { className: "flex flex-col gap-1.5", children: [
      o.map((m, u) => /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: w + " flex-1",
            value: m,
            onChange: (p) => {
              const k = o.slice();
              k[u] = p.target.value, l(k);
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-amber-500",
            onClick: () => l(o.filter((p, k) => k !== u)),
            title: "Remove",
            children: /* @__PURE__ */ e(J, { size: 14 })
          }
        )
      ] }, u)),
      /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: w + " flex-1",
            placeholder: `Add ${t}…`,
            value: n,
            onChange: (m) => a(m.target.value),
            onKeyDown: (m) => {
              m.key === "Enter" && n.trim() && (l([...o, n.trim()]), a(""));
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-[var(--accent,#6366f1)]",
            onClick: () => {
              n.trim() && (l([...o, n.trim()]), a(""));
            },
            title: "Add",
            children: /* @__PURE__ */ e(Y, { size: 14 })
          }
        )
      ] })
    ] })
  ] });
}
function U({
  value: t,
  onChange: r,
  srLabel: c
}) {
  return /* @__PURE__ */ s(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": t,
      "aria-label": c,
      onClick: () => r(!t),
      className: "relative inline-flex items-center shrink-0 h-6 w-12 rounded-full transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#6366f1)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface,#111)] border " + (t ? "bg-[var(--accent,#6366f1)] border-[var(--accent,#6366f1)]" : "bg-[var(--surface-3,#3a3a3a)] border-[var(--border,#4a4a4a)]"),
      children: [
        /* @__PURE__ */ e(
          "span",
          {
            className: "absolute text-[9px] font-semibold leading-none tracking-wide select-none " + (t ? "left-1.5 text-white" : "right-1.5 text-[var(--fg,#eee)] opacity-70"),
            "aria-hidden": "true",
            children: t ? "ON" : "OFF"
          }
        ),
        /* @__PURE__ */ e(
          "span",
          {
            className: "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-150 " + (t ? "left-[26px]" : "left-0.5"),
            "aria-hidden": "true"
          }
        )
      ]
    }
  );
}
function Z({
  label: t,
  hint: r,
  desc: c,
  value: o,
  onChange: l
}) {
  return /* @__PURE__ */ s("label", { className: "flex items-start gap-2.5 cursor-pointer", children: [
    /* @__PURE__ */ e("span", { className: "mt-0.5", children: /* @__PURE__ */ e(U, { value: o, onChange: l, srLabel: t || void 0 }) }),
    /* @__PURE__ */ s("span", { className: "flex flex-col", children: [
      /* @__PURE__ */ s("span", { className: "text-sm text-[var(--fg,#eee)]", children: [
        t,
        r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r })
      ] }),
      c && /* @__PURE__ */ e("span", { className: "text-[11px] text-muted", children: c })
    ] })
  ] });
}
function Ne(t) {
  const r = t.config || {}, c = (n) => {
    const a = r[n];
    return typeof a == "number" && Number.isFinite(a) ? String(a) : typeof a == "string" && a.trim() !== "" && Number.isFinite(Number(a)) ? String(Number(a)) : "";
  }, o = t.derived || {}, l = (n) => Array.isArray(n) ? n.filter((a) => typeof a == "string") : [];
  return {
    default_safety_mode: typeof r.default_safety_mode == "string" ? r.default_safety_mode : "read_only",
    default_timeout_s: c("default_timeout_s"),
    max_targets: c("max_targets"),
    auto_detect_local_models: r.auto_detect_local_models === !0,
    default_persistence: typeof r.default_persistence == "string" ? r.default_persistence : "ephemeral",
    synthesize_default: r.synthesize_default === !0,
    enabled_agents: l(o.enabled_agents),
    trusted_workspaces: l(o.trusted_workspaces),
    role_dirs: l(o.role_dirs),
    agents: (Array.isArray(t.agents) ? t.agents : []).map((n) => ({
      ...n,
      env: { ...n.env || {} },
      extra: { ...n.extra || {} }
    }))
  };
}
function _e(t, r) {
  if (!r || typeof r != "object") return !1;
  const c = (o, l) => String(o) === String(l);
  for (const [o, l] of Object.entries(t)) {
    const n = r[o];
    if (o === "agents") {
      const a = l && typeof l == "object" ? Object.keys(l).sort() : [], m = n && typeof n == "object" ? Object.keys(n).sort() : [];
      if (a.length !== m.length || a.some((u, p) => u !== m[p])) return !1;
      continue;
    }
    if (Array.isArray(l)) {
      if (!Array.isArray(n) || n.length !== l.length || l.some((a, m) => !c(a, n[m]))) return !1;
      continue;
    }
    if (!c(l, n)) return !1;
  }
  return !0;
}
function we(t, r) {
  const c = { ...t.config };
  delete c.agents;
  const o = (a, m) => {
    if (m.trim() === "") delete c[a];
    else {
      const u = Number(m);
      Number.isNaN(u) || (c[a] = u);
    }
  };
  c.default_safety_mode = r.default_safety_mode, o("default_timeout_s", r.default_timeout_s), o("max_targets", r.max_targets), c.auto_detect_local_models = r.auto_detect_local_models, c.default_persistence = r.default_persistence, c.synthesize_default = r.synthesize_default;
  const l = (a, m) => {
    const u = m.map((p) => p.trim()).filter(Boolean);
    u.length ? c[a] = u : delete c[a];
  };
  l("enabled_agents", r.enabled_agents), l("trusted_workspaces", r.trusted_workspaces), l("role_dirs", r.role_dirs);
  const n = {};
  for (const a of r.agents) {
    const m = a.id.trim();
    if (!m) continue;
    const u = { ...a.extra };
    a.default_model != null && String(a.default_model).trim() !== "" && (u.default_model = a.default_model), u.enabled = a.enabled, a.env && Object.keys(a.env).length && (u.env = a.env), n[m] = u;
  }
  return Object.keys(n).length && (c.agents = n), c;
}
function ke({
  config: t,
  scope: r,
  onScope: c,
  onSave: o
}) {
  const [l, n] = b(null), [a, m] = b(!1), [u, p] = b(null), k = !!t && t.scope === r;
  I(() => {
    if (!t || t.scope !== r) {
      n((i) => i ?? null);
      return;
    }
    p(null), n(Ne(t));
  }, [t, r]);
  const d = (i) => n((y) => y && { ...y, ...i }), z = async () => {
    if (!(!t || !l)) {
      m(!0), p(null);
      try {
        await o(r, we(t, l)), p({ ok: !0, text: `Saved to ${r} config.toml (backup written).` });
      } catch (i) {
        p({ ok: !1, text: i instanceof Error ? i.message : String(i) });
      } finally {
        m(!1);
      }
    }
  };
  return /* @__PURE__ */ s($, { children: [
    /* @__PURE__ */ s("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((i) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => c(i),
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (r === i ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: i === "global" ? "Global" : "Workspace"
        },
        i
      )),
      /* @__PURE__ */ s(
        "button",
        {
          onClick: () => void z(),
          disabled: a || !l,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(te, { size: 14 }),
            " ",
            a ? "Saving…" : `Save ${r}`
          ]
        }
      )
    ] }),
    u && /* @__PURE__ */ s(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (u.ok ? "text-green-500" : "text-amber-500"),
        children: [
          u.ok ? /* @__PURE__ */ e(ae, { size: 15 }) : /* @__PURE__ */ e(W, { size: 15 }),
          u.text
        ]
      }
    ),
    !k || !l ? /* @__PURE__ */ s("p", { className: "text-sm text-muted", children: [
      "Loading ",
      r,
      " config…"
    ] }) : /* @__PURE__ */ s($, { children: [
      /* @__PURE__ */ s(S, { children: [
        /* @__PURE__ */ e(C, { children: "Defaults" }),
        /* @__PURE__ */ e(F, { meta: t }),
        !t.exists && /* @__PURE__ */ s("p", { className: "text-xs text-muted mt-2", children: [
          "No file at this scope yet — saving creates ",
          /* @__PURE__ */ e("code", { children: t.path }),
          "."
        ] }),
        /* @__PURE__ */ s("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            L,
            {
              label: "Default safety mode",
              hint: "default_safety_mode",
              desc: "read_only · propose · write · yolo",
              children: /* @__PURE__ */ e(
                "select",
                {
                  className: w,
                  value: l.default_safety_mode,
                  onChange: (i) => d({ default_safety_mode: i.target.value }),
                  children: ve.map((i) => /* @__PURE__ */ e("option", { value: i, children: i }, i))
                }
              )
            }
          ),
          /* @__PURE__ */ e(L, { label: "Default timeout (seconds)", hint: "default_timeout_s", children: /* @__PURE__ */ e(
            "input",
            {
              type: "number",
              className: w,
              value: l.default_timeout_s,
              onChange: (i) => d({ default_timeout_s: i.target.value })
            }
          ) }),
          /* @__PURE__ */ e(L, { label: "Max agents per panel", hint: "max_targets", children: /* @__PURE__ */ e(
            "input",
            {
              type: "number",
              className: w,
              value: l.max_targets,
              onChange: (i) => d({ max_targets: i.target.value })
            }
          ) }),
          /* @__PURE__ */ e(
            L,
            {
              label: "Run persistence",
              hint: "default_persistence",
              desc: "ephemeral · job",
              children: /* @__PURE__ */ e(
                "select",
                {
                  className: w,
                  value: l.default_persistence,
                  onChange: (i) => d({ default_persistence: i.target.value }),
                  children: be.map((i) => /* @__PURE__ */ e("option", { value: i, children: i }, i))
                }
              )
            }
          )
        ] }),
        /* @__PURE__ */ s("div", { className: "flex flex-wrap gap-6 mt-4", children: [
          /* @__PURE__ */ e(
            Z,
            {
              label: "Auto-detect local models (Ollama / LM Studio)",
              hint: "auto_detect_local_models",
              value: l.auto_detect_local_models,
              onChange: (i) => d({ auto_detect_local_models: i })
            }
          ),
          /* @__PURE__ */ e(
            Z,
            {
              label: "Synthesize a combined answer by default",
              hint: "synthesize_default",
              value: l.synthesize_default,
              onChange: (i) => d({ synthesize_default: i })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ s(S, { children: [
        /* @__PURE__ */ e(C, { children: "Allowlists & directories" }),
        /* @__PURE__ */ s("div", { className: "grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            H,
            {
              label: "Enabled agents (allowlist)",
              hint: "enabled_agents",
              desc: "Empty = every configured agent is enabled.",
              values: l.enabled_agents,
              onChange: (i) => d({ enabled_agents: i })
            }
          ),
          /* @__PURE__ */ e(
            H,
            {
              label: "Trusted workspaces (write/yolo allowed)",
              hint: "trusted_workspaces",
              desc: "Paths where write & yolo delegations may run.",
              values: l.trusted_workspaces,
              onChange: (i) => d({ trusted_workspaces: i })
            }
          ),
          /* @__PURE__ */ e(
            H,
            {
              label: "Custom role directories",
              hint: "role_dirs",
              desc: "Extra folders scanned for role persona files.",
              values: l.role_dirs,
              onChange: (i) => d({ role_dirs: i })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ s(S, { children: [
        /* @__PURE__ */ e(C, { children: "Per-agent overrides" }),
        /* @__PURE__ */ s("p", { className: "text-[11px] text-muted mt-1", children: [
          /* @__PURE__ */ e("code", { className: "text-[10px] opacity-70", children: "[agents.*]" }),
          " — per-agent default model and enabled flag."
        ] }),
        /* @__PURE__ */ s("div", { className: "mt-3 flex flex-col gap-2", children: [
          l.agents.length > 0 && /* @__PURE__ */ s("div", { className: "flex items-center gap-2 px-2 text-[10px] uppercase tracking-wide text-muted opacity-70", children: [
            /* @__PURE__ */ e("span", { className: "w-32", children: "Agent" }),
            /* @__PURE__ */ e("span", { className: "flex-1", children: "Default model" }),
            /* @__PURE__ */ e("span", { children: "Enabled" }),
            /* @__PURE__ */ e("span", { className: "w-6" })
          ] }),
          l.agents.map((i, y) => /* @__PURE__ */ s(
            "div",
            {
              className: "flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]",
              children: [
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: w + " w-32",
                    value: i.id,
                    placeholder: "agent id",
                    onChange: (A) => {
                      const f = l.agents.slice();
                      f[y] = { ...i, id: A.target.value }, d({ agents: f });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: w + " flex-1",
                    value: i.default_model ?? "",
                    placeholder: "Default model (blank = agent default)",
                    onChange: (A) => {
                      const f = l.agents.slice();
                      f[y] = { ...i, default_model: A.target.value }, d({ agents: f });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  U,
                  {
                    value: i.enabled,
                    srLabel: `Enabled: ${i.id || "agent"}`,
                    onChange: (A) => {
                      const f = l.agents.slice();
                      f[y] = { ...i, enabled: A }, d({ agents: f });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "p-1 text-muted hover:text-amber-500",
                    onClick: () => d({ agents: l.agents.filter((A, f) => f !== y) }),
                    title: "Remove agent",
                    children: /* @__PURE__ */ e(J, { size: 14 })
                  }
                )
              ]
            },
            y
          )),
          /* @__PURE__ */ s(
            "button",
            {
              className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
              onClick: () => d({
                agents: [
                  ...l.agents,
                  { id: "", default_model: "", enabled: !0, env: {}, extra: {} }
                ]
              }),
              children: [
                /* @__PURE__ */ e(Y, { size: 14 }),
                " Add agent"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] });
}
const Se = [
  "all-voices",
  "unanimous",
  "majority",
  "plurality",
  "weighted",
  "parity-pair",
  "rank"
], ee = [
  { key: "cli", label: "cli", placeholder: "agent id (required)" },
  { key: "model", label: "model", placeholder: "agent default" },
  { key: "role", label: "role", placeholder: "persona id" },
  { key: "label", label: "label", placeholder: "result key" },
  { key: "stance", label: "stance", placeholder: "for / against / neutral" }
];
function Ce(t) {
  return {
    ...t,
    seats: (Array.isArray(t.seats) ? t.seats : []).map((r) => ({ ...r })),
    extra: { ...t.extra || {} }
  };
}
function Ae() {
  return {
    name: "",
    description: "",
    strategy: "all-voices",
    targets: 1,
    seats: [{ cli: "" }],
    extra: {}
  };
}
function Ee(t) {
  return t.map((r) => ({
    name: r.name.trim(),
    description: (r.description || "").trim(),
    strategy: (r.strategy || "").trim(),
    targets: (r.seats || []).length,
    extra: r.extra || {},
    seats: (r.seats || []).map((c) => {
      const o = { cli: String(c.cli || "").trim() };
      for (const [l, n] of Object.entries(c))
        if (l !== "cli" && n != null)
          if (typeof n == "string") {
            const a = n.trim();
            a !== "" && (o[l] = a);
          } else
            o[l] = n;
      return o;
    })
  }));
}
function ze({
  seat: t,
  onChange: r,
  onRemove: c
}) {
  const o = (a, m) => r({ ...t, [a]: m }), l = /* @__PURE__ */ new Set([...ee.map((a) => a.key), "weight", "parity"]), n = Object.keys(t).filter((a) => !l.has(a));
  return /* @__PURE__ */ s("div", { className: "p-2.5 rounded bg-[var(--surface-3,#232323)] border border-[var(--border,#2a2a2a)]", children: [
    /* @__PURE__ */ s("div", { className: "grid gap-2 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]", children: [
      ee.map((a) => /* @__PURE__ */ s("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ s("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: [
          a.label,
          a.key === "cli" && /* @__PURE__ */ e("span", { className: "text-amber-500", children: " *" })
        ] }),
        /* @__PURE__ */ e(
          "input",
          {
            className: w,
            value: t[a.key] != null ? String(t[a.key]) : "",
            placeholder: a.placeholder,
            onChange: (m) => o(a.key, m.target.value)
          }
        )
      ] }, a.key)),
      /* @__PURE__ */ s("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "weight" }),
        /* @__PURE__ */ e(
          "input",
          {
            className: w,
            type: "number",
            value: t.weight != null ? String(t.weight) : "",
            placeholder: "—",
            onChange: (a) => {
              const m = a.target.value.trim(), u = { ...t };
              m === "" ? delete u.weight : u.weight = Number(m), r(u);
            }
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "parity" }),
        /* @__PURE__ */ e("span", { className: "mt-0.5", children: /* @__PURE__ */ e(
          U,
          {
            value: t.parity === !0,
            srLabel: "Parity counterweight seat",
            onChange: (a) => {
              const m = { ...t };
              a ? m.parity = !0 : delete m.parity, r(m);
            }
          }
        ) })
      ] })
    ] }),
    n.length > 0 && /* @__PURE__ */ s("p", { className: "text-[10px] text-muted mt-1.5", children: [
      "preserved on save:",
      " ",
      n.map((a) => /* @__PURE__ */ s("code", { className: "mr-1.5", children: [
        a,
        "=",
        String(t[a])
      ] }, a))
    ] }),
    /* @__PURE__ */ s(
      "button",
      {
        className: "mt-1.5 flex items-center gap-1 text-[11px] text-muted hover:text-amber-500",
        onClick: c,
        title: "Remove seat",
        children: [
          /* @__PURE__ */ e(J, { size: 12 }),
          " Remove seat"
        ]
      }
    )
  ] });
}
function je({
  panel: t,
  onChange: r,
  onDelete: c
}) {
  const [o, l] = b(!1), n = Array.isArray(t.seats) ? t.seats : [];
  return /* @__PURE__ */ s("div", { className: "p-3 rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)]", children: [
    /* @__PURE__ */ s("div", { className: "grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]", children: [
      /* @__PURE__ */ e(L, { label: "Name", hint: "panel key", children: /* @__PURE__ */ e(
        "input",
        {
          className: w,
          value: t.name,
          placeholder: "panel-name",
          onChange: (a) => r({ ...t, name: a.target.value })
        }
      ) }),
      /* @__PURE__ */ e(L, { label: "Strategy", hint: "strategy", children: /* @__PURE__ */ e(
        "select",
        {
          className: w,
          value: t.strategy || "all-voices",
          onChange: (a) => r({ ...t, strategy: a.target.value }),
          children: Se.map((a) => /* @__PURE__ */ e("option", { value: a, children: a }, a))
        }
      ) })
    ] }),
    /* @__PURE__ */ e("div", { className: "mt-2.5", children: /* @__PURE__ */ e(L, { label: "Description", hint: "description", children: /* @__PURE__ */ e(
      "input",
      {
        className: w,
        value: t.description || "",
        placeholder: "Human label for this panel",
        onChange: (a) => r({ ...t, description: a.target.value })
      }
    ) }) }),
    /* @__PURE__ */ s("div", { className: "mt-3", children: [
      /* @__PURE__ */ e("div", { className: "flex items-center gap-2 mb-1.5", children: /* @__PURE__ */ s("span", { className: "text-xs font-medium text-[var(--fg,#eee)]", children: [
        "Seats ",
        /* @__PURE__ */ s("span", { className: "text-muted", children: [
          "(",
          n.length,
          ")"
        ] })
      ] }) }),
      /* @__PURE__ */ s("div", { className: "flex flex-col gap-2", children: [
        n.map((a, m) => /* @__PURE__ */ e(
          ze,
          {
            seat: a,
            onChange: (u) => {
              const p = n.slice();
              p[m] = u, r({ ...t, seats: p });
            },
            onRemove: () => r({ ...t, seats: n.filter((u, p) => p !== m) })
          },
          m
        )),
        /* @__PURE__ */ s(
          "button",
          {
            className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
            onClick: () => r({ ...t, seats: [...n, { cli: "" }] }),
            children: [
              /* @__PURE__ */ e(Y, { size: 14 }),
              " Add seat"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "mt-3 pt-2.5 border-t border-[var(--border,#2a2a2a)] flex items-center", children: o ? /* @__PURE__ */ s("div", { className: "flex items-center gap-2 text-xs", children: [
      /* @__PURE__ */ s("span", { className: "text-amber-500", children: [
        "Delete “",
        t.name || "unnamed",
        "”?"
      ] }),
      /* @__PURE__ */ e(
        "button",
        {
          className: "px-2 py-0.5 rounded bg-amber-600/80 text-white hover:bg-amber-600",
          onClick: c,
          children: "Delete"
        }
      ),
      /* @__PURE__ */ e("button", { className: "px-2 py-0.5 rounded text-muted hover:text-[var(--fg,#eee)]", onClick: () => l(!1), children: "Cancel" })
    ] }) : /* @__PURE__ */ s(
      "button",
      {
        className: "flex items-center gap-1.5 text-xs text-muted hover:text-amber-500",
        onClick: () => l(!0),
        children: [
          /* @__PURE__ */ e(ge, { size: 13 }),
          " Delete panel"
        ]
      }
    ) })
  ] });
}
function Pe({
  panels: t,
  onSave: r
}) {
  const [c, o] = b("global"), [l, n] = b(null), [a, m] = b(!1), [u, p] = b(null), d = (Array.isArray(t == null ? void 0 : t.sources) ? t.sources : []).find((f) => f.scope === c) || null, z = JSON.stringify((d == null ? void 0 : d.panels) ?? null) + "|" + c;
  I(() => {
    if (!d) {
      n(null);
      return;
    }
    p(null), n((d.panels || []).map(Ce));
  }, [z]);
  const i = (f, g) => n((x) => x && x.map((j, D) => D === f ? g : j)), y = () => {
    if (!l) return null;
    const f = /* @__PURE__ */ new Set();
    for (const g of l) {
      const x = g.name.trim();
      if (!x) return "Every panel needs a name.";
      if (f.has(x)) return `Duplicate panel name “${x}”.`;
      f.add(x);
      const j = Array.isArray(g.seats) ? g.seats : [];
      if (j.length === 0) return `Panel “${x}” needs at least one seat.`;
      if (j.some((D) => !String(D.cli || "").trim()))
        return `Panel “${x}” has a seat missing a cli.`;
    }
    return null;
  }, A = async () => {
    if (!l) return;
    const f = y();
    if (f) {
      p({ ok: !1, text: f });
      return;
    }
    m(!0), p(null);
    try {
      await r(c, Ee(l)), p({ ok: !0, text: `Saved to ${c} panels.toon (backup written).` });
    } catch (g) {
      p({ ok: !1, text: g instanceof Error ? g.message : String(g) });
    } finally {
      m(!1);
    }
  };
  return /* @__PURE__ */ s($, { children: [
    /* @__PURE__ */ s("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((f) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => o(f),
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (c === f ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: f === "global" ? "Global" : "Workspace"
        },
        f
      )),
      /* @__PURE__ */ s(
        "button",
        {
          onClick: () => void A(),
          disabled: a || !l,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(te, { size: 14 }),
            " ",
            a ? "Saving…" : `Save ${c}`
          ]
        }
      )
    ] }),
    u && /* @__PURE__ */ s(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (u.ok ? "text-green-500" : "text-amber-500"),
        children: [
          u.ok ? /* @__PURE__ */ e(ae, { size: 15 }) : /* @__PURE__ */ e(W, { size: 15 }),
          u.text
        ]
      }
    ),
    /* @__PURE__ */ s(S, { children: [
      /* @__PURE__ */ s(C, { children: [
        "Named panels · ",
        c
      ] }),
      d && /* @__PURE__ */ e(F, { meta: d }),
      (d == null ? void 0 : d.error) && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-1", children: d.error }),
      d && !d.exists && /* @__PURE__ */ s("p", { className: "text-xs text-muted mt-2", children: [
        "No file at this scope yet — saving creates ",
        /* @__PURE__ */ e("code", { children: d.path }),
        "."
      ] }),
      l === null ? /* @__PURE__ */ s("p", { className: "text-sm text-muted mt-2", children: [
        "Loading ",
        c,
        " panels…"
      ] }) : /* @__PURE__ */ s("div", { className: "mt-3 flex flex-col gap-3", children: [
        l.length === 0 && /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No panels defined at this scope. Add one below." }),
        l.map((f, g) => /* @__PURE__ */ e(
          je,
          {
            panel: f,
            onChange: (x) => i(g, x),
            onDelete: () => n((x) => x && x.filter((j, D) => D !== g))
          },
          g
        )),
        /* @__PURE__ */ s(
          "button",
          {
            className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
            onClick: () => n((f) => [...f || [], Ae()]),
            children: [
              /* @__PURE__ */ e(Y, { size: 14 }),
              " Add panel"
            ]
          }
        )
      ] })
    ] })
  ] });
}
function Re({ roles: t }) {
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No roles." });
  const r = Array.isArray(t.sources) ? t.sources : [];
  return r.reduce((o, l) => o + (Array.isArray(l.roles) ? l.roles.length : 0), 0) === 0 ? /* @__PURE__ */ s(S, { children: [
    /* @__PURE__ */ e(C, { children: "Roles" }),
    /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: "No role markdown files found (read-only — editing is a later step). Checked:" }),
    r.map((o) => /* @__PURE__ */ e(F, { meta: o }, o.path))
  ] }) : /* @__PURE__ */ e($, { children: r.map((o) => {
    const l = Array.isArray(o.roles) ? o.roles : [];
    return l.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ s(S, { children: [
      /* @__PURE__ */ s(C, { children: [
        "Roles · ",
        o.scope,
        " (read-only)"
      ] }),
      /* @__PURE__ */ e(F, { meta: o }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: l.map((n) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-1 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          title: n.path,
          children: n.name
        },
        n.path
      )) })
    ] }) }, o.path);
  }) });
}
export {
  Fe as default
};
