import { jsxs as s, Fragment as A, jsx as e } from "react/jsx-runtime";
import { useAppApi as W } from "@kirocrew/app-sdk";
import { PageHeader as X, StatCard as $, Card as v, CardTitle as b } from "@kirocrew/app-sdk/ui";
import { useState as x, useRef as J, useCallback as D, useEffect as M } from "react";
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
} = Q, E = "/api/apps/rutherford", ce = [
  { id: "status", label: "Overview", icon: Z },
  { id: "config", label: "Config", icon: ee },
  { id: "panels", label: "Panels", icon: te },
  { id: "roles", label: "Roles", icon: ae }
], ie = ["read_only", "propose", "write", "yolo"], oe = ["ephemeral", "job"];
function S({ meta: t }) {
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
  const t = W(), [a, o] = x("status"), [r, l] = x(!0), [c, i] = x(null), [m, u] = x(null), [p, _] = x("global"), [d, k] = x(null), [n, y] = x(null), [w, h] = x(null), R = J("global"), B = D(
    async (f) => {
      R.current = f;
      try {
        const g = await t.get(`${E}/rutherford-config?scope=${f}`);
        if (R.current !== f) return;
        if (!g || typeof g != "object") {
          i(`No config returned for ${f} scope.`);
          return;
        }
        k({ ...g, scope: f }), i(null);
      } catch (g) {
        if (R.current !== f) return;
        i(g instanceof Error ? g.message : String(g));
      }
    },
    [t]
  ), L = D(async () => {
    l(!0), i(null);
    try {
      const [f, g, j] = await Promise.all([
        t.get(`${E}/status`),
        t.get(`${E}/panels`),
        t.get(`${E}/roles`)
      ]);
      u(f), y(g), h(j);
    } catch (f) {
      i(f instanceof Error ? f.message : String(f));
    } finally {
      l(!1);
    }
  }, [t]);
  M(() => {
    L();
  }, [L]), M(() => {
    B(p);
  }, [B, p]);
  const I = D((f) => {
    _(f);
  }, []), V = (f) => !!f && typeof f == "object" && f.written === !0, U = D(
    async (f, g) => {
      const j = `${E}/rutherford-config?scope=${f}`;
      let P = await t.put(j, g);
      V(P) || (await new Promise((N) => setTimeout(N, 600)), P = await t.put(j, g));
      let z = V(P) ? P : null;
      if (!z) {
        const N = await t.get(j);
        if (N && typeof N == "object") {
          const K = N;
          ue(g, K.config) && (z = K);
        }
      }
      if (!z)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your entered values were kept; try Save again."
        );
      const q = z.scope ?? R.current;
      R.current = q, k({ ...z, scope: q });
      try {
        const N = await t.get(`${E}/status`);
        N && typeof N == "object" && u(N);
      } catch {
      }
      return z;
    },
    [t]
  );
  return /* @__PURE__ */ s(A, { children: [
    /* @__PURE__ */ e(X, { title: "Rutherford", subtitle: "Config & status — config.toml editing (Phase 2)" }),
    /* @__PURE__ */ s("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ s("div", { className: "flex gap-1 mb-5 border-b border-[var(--border,#2a2a2a)]", children: [
        ce.map(({ id: f, label: g, icon: j }) => /* @__PURE__ */ s(
          "button",
          {
            onClick: () => o(f),
            className: "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors " + (a === f ? "border-[var(--accent,#6366f1)] text-[var(--fg,#eee)]" : "border-transparent text-muted hover:text-[var(--fg,#eee)]"),
            children: [
              /* @__PURE__ */ e(j, { size: 15 }),
              g
            ]
          },
          f
        )),
        /* @__PURE__ */ e(
          "button",
          {
            onClick: () => void L(),
            className: "ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-[var(--fg,#eee)]",
            title: "Reload",
            children: /* @__PURE__ */ e(le, { size: 15, className: r ? "animate-spin" : "" })
          }
        )
      ] }),
      c && /* @__PURE__ */ s("div", { className: "flex items-center gap-2 text-sm text-amber-500 mb-4", children: [
        /* @__PURE__ */ e(Y, { size: 15 }),
        " ",
        c
      ] }),
      r && !m ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "Loading…" }) : /* @__PURE__ */ s(A, { children: [
        a === "status" && /* @__PURE__ */ e(de, { status: m }),
        a === "config" && /* @__PURE__ */ e(
          pe,
          {
            config: d,
            scope: p,
            onScope: I,
            onSave: U
          }
        ),
        a === "panels" && /* @__PURE__ */ e(ge, { panels: n }),
        a === "roles" && /* @__PURE__ */ e(he, { roles: w })
      ] })
    ] })
  ] });
}
function de({ status: t }) {
  var u, p, _;
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No status." });
  const a = t.agents || { enabled: [], enabled_source: "", allowlist_configured: !1, roster: [] }, o = Array.isArray(a.enabled) ? a.enabled : [], r = Array.isArray(a.roster) ? a.roster : [], l = Array.isArray(t.acp) ? t.acp : [], c = t.defaults || {}, i = a.allowlist_configured ? String(o.length) : "All", m = Object.keys(t.env_overrides || {}).filter((d) => d !== "_note");
  return /* @__PURE__ */ s(A, { children: [
    /* @__PURE__ */ s("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mb-6", children: [
      /* @__PURE__ */ e($, { label: "Platform", value: t.platform }),
      /* @__PURE__ */ e($, { label: "Agents enabled", value: i, accent: !0 }),
      /* @__PURE__ */ e($, { label: "Safety mode", value: c.safety_mode ?? "read_only" }),
      /* @__PURE__ */ e(
        $,
        {
          label: "Local model detect",
          value: c.auto_detect_local_models ? "on" : "off"
        }
      )
    ] }),
    /* @__PURE__ */ s(v, { children: [
      /* @__PURE__ */ e(b, { children: "Resolved roster" }),
      r.length > 0 ? /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1.5", children: r.map((d) => /* @__PURE__ */ s("div", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ e("span", { className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]", children: d.id }),
        /* @__PURE__ */ e("span", { className: "text-muted text-xs", children: d.default_model ?? "(agent default)" }),
        /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-auto", children: d.source })
      ] }, d.id)) }) : a.allowlist_configured ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-2", children: o.map((d) => /* @__PURE__ */ e(
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
        a.enabled_source || "default",
        ")."
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ s(v, { children: [
      /* @__PURE__ */ e(b, { children: "Config locations" }),
      ((u = t.config_locations) == null ? void 0 : u.global) && /* @__PURE__ */ e(S, { meta: t.config_locations.global }),
      ((p = t.config_locations) == null ? void 0 : p.workspace) && /* @__PURE__ */ e(S, { meta: t.config_locations.workspace })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ s(v, { children: [
      /* @__PURE__ */ e(b, { children: /* @__PURE__ */ s("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(ne, { size: 14 }),
        " acp.json (agent servers)"
      ] }) }),
      l.map((d) => {
        const k = Object.keys(d.agent_servers || {});
        return /* @__PURE__ */ s("div", { className: "mt-2", children: [
          /* @__PURE__ */ e(S, { meta: d }),
          k.length > 0 && /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-1", children: k.map((n) => /* @__PURE__ */ e(
            "span",
            {
              className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
              children: n
            },
            n
          )) })
        ] }, d.path);
      })
    ] }),
    m.length > 0 && /* @__PURE__ */ s(A, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ s(v, { children: [
        /* @__PURE__ */ e(b, { children: "Environment overrides" }),
        /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1", children: m.map((d) => /* @__PURE__ */ s("div", { className: "text-xs", children: [
          /* @__PURE__ */ e("code", { children: d }),
          " = ",
          /* @__PURE__ */ e("code", { className: "text-muted", children: String((t.env_overrides || {})[d]) })
        ] }, d)) }),
        (t.env_overrides || {})._note && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-2", children: String((t.env_overrides || {})._note) })
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ s(v, { children: [
      /* @__PURE__ */ e(b, { children: "Reachability" }),
      /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: ((_ = t.reachability) == null ? void 0 : _.note) ?? "—" })
    ] })
  ] });
}
function O({
  label: t,
  hint: a,
  desc: o,
  children: r
}) {
  return /* @__PURE__ */ s("label", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ s("span", { className: "text-sm text-[var(--fg,#eee)]", children: [
      t,
      a && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: a })
    ] }),
    o && /* @__PURE__ */ e("span", { className: "text-[11px] text-muted -mt-0.5", children: o }),
    r
  ] });
}
const C = "px-2 py-1.5 text-sm rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)] text-[var(--fg,#eee)] outline-none focus:border-[var(--accent,#6366f1)]";
function T({
  label: t,
  hint: a,
  desc: o,
  values: r,
  onChange: l
}) {
  const [c, i] = x("");
  return /* @__PURE__ */ s("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ s("span", { className: "text-sm text-[var(--fg,#eee)]", children: [
      t,
      a && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: a })
    ] }),
    o && /* @__PURE__ */ e("span", { className: "text-[11px] text-muted -mt-0.5", children: o }),
    /* @__PURE__ */ s("div", { className: "flex flex-col gap-1.5", children: [
      r.map((m, u) => /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: C + " flex-1",
            value: m,
            onChange: (p) => {
              const _ = r.slice();
              _[u] = p.target.value, l(_);
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-amber-500",
            onClick: () => l(r.filter((p, _) => _ !== u)),
            title: "Remove",
            children: /* @__PURE__ */ e(H, { size: 14 })
          }
        )
      ] }, u)),
      /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: C + " flex-1",
            placeholder: `Add ${t}…`,
            value: c,
            onChange: (m) => i(m.target.value),
            onKeyDown: (m) => {
              m.key === "Enter" && c.trim() && (l([...r, c.trim()]), i(""));
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-[var(--accent,#6366f1)]",
            onClick: () => {
              c.trim() && (l([...r, c.trim()]), i(""));
            },
            title: "Add",
            children: /* @__PURE__ */ e(G, { size: 14 })
          }
        )
      ] })
    ] })
  ] });
}
function F({
  label: t,
  hint: a,
  desc: o,
  value: r,
  onChange: l
}) {
  return /* @__PURE__ */ s("label", { className: "flex items-start gap-2 cursor-pointer", children: [
    /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        onClick: () => l(!r),
        className: "mt-0.5 shrink-0 w-9 h-5 rounded-full transition-colors relative " + (r ? "bg-[var(--accent,#6366f1)]" : "bg-[var(--surface-3,#333)]"),
        children: /* @__PURE__ */ e(
          "span",
          {
            className: "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all " + (r ? "left-4" : "left-0.5")
          }
        )
      }
    ),
    /* @__PURE__ */ s("span", { className: "flex flex-col", children: [
      /* @__PURE__ */ s("span", { className: "text-sm text-[var(--fg,#eee)]", children: [
        t,
        a && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: a })
      ] }),
      o && /* @__PURE__ */ e("span", { className: "text-[11px] text-muted", children: o })
    ] })
  ] });
}
function me(t) {
  const a = t.config || {}, o = (c) => {
    const i = a[c];
    return typeof i == "number" && Number.isFinite(i) ? String(i) : typeof i == "string" && i.trim() !== "" && Number.isFinite(Number(i)) ? String(Number(i)) : "";
  }, r = t.derived || {}, l = (c) => Array.isArray(c) ? c.filter((i) => typeof i == "string") : [];
  return {
    default_safety_mode: typeof a.default_safety_mode == "string" ? a.default_safety_mode : "read_only",
    default_timeout_s: o("default_timeout_s"),
    max_targets: o("max_targets"),
    auto_detect_local_models: a.auto_detect_local_models === !0,
    default_persistence: typeof a.default_persistence == "string" ? a.default_persistence : "ephemeral",
    synthesize_default: a.synthesize_default === !0,
    enabled_agents: l(r.enabled_agents),
    trusted_workspaces: l(r.trusted_workspaces),
    role_dirs: l(r.role_dirs),
    agents: (Array.isArray(t.agents) ? t.agents : []).map((c) => ({
      ...c,
      env: { ...c.env || {} },
      extra: { ...c.extra || {} }
    }))
  };
}
function ue(t, a) {
  if (!a || typeof a != "object") return !1;
  const o = (r, l) => String(r) === String(l);
  for (const [r, l] of Object.entries(t)) {
    const c = a[r];
    if (r === "agents") {
      const i = l && typeof l == "object" ? Object.keys(l).sort() : [], m = c && typeof c == "object" ? Object.keys(c).sort() : [];
      if (i.length !== m.length || i.some((u, p) => u !== m[p])) return !1;
      continue;
    }
    if (Array.isArray(l)) {
      if (!Array.isArray(c) || c.length !== l.length || l.some((i, m) => !o(i, c[m]))) return !1;
      continue;
    }
    if (!o(l, c)) return !1;
  }
  return !0;
}
function fe(t, a) {
  const o = { ...t.config };
  delete o.agents;
  const r = (i, m) => {
    if (m.trim() === "") delete o[i];
    else {
      const u = Number(m);
      Number.isNaN(u) || (o[i] = u);
    }
  };
  o.default_safety_mode = a.default_safety_mode, r("default_timeout_s", a.default_timeout_s), r("max_targets", a.max_targets), o.auto_detect_local_models = a.auto_detect_local_models, o.default_persistence = a.default_persistence, o.synthesize_default = a.synthesize_default;
  const l = (i, m) => {
    const u = m.map((p) => p.trim()).filter(Boolean);
    u.length ? o[i] = u : delete o[i];
  };
  l("enabled_agents", a.enabled_agents), l("trusted_workspaces", a.trusted_workspaces), l("role_dirs", a.role_dirs);
  const c = {};
  for (const i of a.agents) {
    const m = i.id.trim();
    if (!m) continue;
    const u = { ...i.extra };
    i.default_model != null && String(i.default_model).trim() !== "" && (u.default_model = i.default_model), u.enabled = i.enabled, i.env && Object.keys(i.env).length && (u.env = i.env), c[m] = u;
  }
  return Object.keys(c).length && (o.agents = c), o;
}
function pe({
  config: t,
  scope: a,
  onScope: o,
  onSave: r
}) {
  const [l, c] = x(null), [i, m] = x(!1), [u, p] = x(null), _ = !!t && t.scope === a;
  M(() => {
    if (!t || t.scope !== a) {
      c((n) => n ?? null);
      return;
    }
    p(null), c(me(t));
  }, [t, a]);
  const d = (n) => c((y) => y && { ...y, ...n }), k = async () => {
    if (!(!t || !l)) {
      m(!0), p(null);
      try {
        await r(a, fe(t, l)), p({ ok: !0, text: `Saved to ${a} config.toml (backup written).` });
      } catch (n) {
        p({ ok: !1, text: n instanceof Error ? n.message : String(n) });
      } finally {
        m(!1);
      }
    }
  };
  return /* @__PURE__ */ s(A, { children: [
    /* @__PURE__ */ s("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((n) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => o(n),
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (a === n ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: n === "global" ? "Global" : "Workspace"
        },
        n
      )),
      /* @__PURE__ */ s(
        "button",
        {
          onClick: () => void k(),
          disabled: i || !l,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(se, { size: 14 }),
            " ",
            i ? "Saving…" : `Save ${a}`
          ]
        }
      )
    ] }),
    u && /* @__PURE__ */ s(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (u.ok ? "text-green-500" : "text-amber-500"),
        children: [
          u.ok ? /* @__PURE__ */ e(re, { size: 15 }) : /* @__PURE__ */ e(Y, { size: 15 }),
          u.text
        ]
      }
    ),
    !_ || !l ? /* @__PURE__ */ s("p", { className: "text-sm text-muted", children: [
      "Loading ",
      a,
      " config…"
    ] }) : /* @__PURE__ */ s(A, { children: [
      /* @__PURE__ */ s(v, { children: [
        /* @__PURE__ */ e(b, { children: "Defaults" }),
        /* @__PURE__ */ e(S, { meta: t }),
        !t.exists && /* @__PURE__ */ s("p", { className: "text-xs text-muted mt-2", children: [
          "No file at this scope yet — saving creates ",
          /* @__PURE__ */ e("code", { children: t.path }),
          "."
        ] }),
        /* @__PURE__ */ s("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            O,
            {
              label: "Default safety mode",
              hint: "default_safety_mode",
              desc: "read_only · propose · write · yolo",
              children: /* @__PURE__ */ e(
                "select",
                {
                  className: C,
                  value: l.default_safety_mode,
                  onChange: (n) => d({ default_safety_mode: n.target.value }),
                  children: ie.map((n) => /* @__PURE__ */ e("option", { value: n, children: n }, n))
                }
              )
            }
          ),
          /* @__PURE__ */ e(O, { label: "Default timeout (seconds)", hint: "default_timeout_s", children: /* @__PURE__ */ e(
            "input",
            {
              type: "number",
              className: C,
              value: l.default_timeout_s,
              onChange: (n) => d({ default_timeout_s: n.target.value })
            }
          ) }),
          /* @__PURE__ */ e(O, { label: "Max agents per panel", hint: "max_targets", children: /* @__PURE__ */ e(
            "input",
            {
              type: "number",
              className: C,
              value: l.max_targets,
              onChange: (n) => d({ max_targets: n.target.value })
            }
          ) }),
          /* @__PURE__ */ e(
            O,
            {
              label: "Run persistence",
              hint: "default_persistence",
              desc: "ephemeral · job",
              children: /* @__PURE__ */ e(
                "select",
                {
                  className: C,
                  value: l.default_persistence,
                  onChange: (n) => d({ default_persistence: n.target.value }),
                  children: oe.map((n) => /* @__PURE__ */ e("option", { value: n, children: n }, n))
                }
              )
            }
          )
        ] }),
        /* @__PURE__ */ s("div", { className: "flex flex-wrap gap-6 mt-4", children: [
          /* @__PURE__ */ e(
            F,
            {
              label: "Auto-detect local models (Ollama / LM Studio)",
              hint: "auto_detect_local_models",
              value: l.auto_detect_local_models,
              onChange: (n) => d({ auto_detect_local_models: n })
            }
          ),
          /* @__PURE__ */ e(
            F,
            {
              label: "Synthesize a combined answer by default",
              hint: "synthesize_default",
              value: l.synthesize_default,
              onChange: (n) => d({ synthesize_default: n })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ s(v, { children: [
        /* @__PURE__ */ e(b, { children: "Allowlists & directories" }),
        /* @__PURE__ */ s("div", { className: "grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            T,
            {
              label: "Enabled agents (allowlist)",
              hint: "enabled_agents",
              desc: "Empty = every configured agent is enabled.",
              values: l.enabled_agents,
              onChange: (n) => d({ enabled_agents: n })
            }
          ),
          /* @__PURE__ */ e(
            T,
            {
              label: "Trusted workspaces (write/yolo allowed)",
              hint: "trusted_workspaces",
              desc: "Paths where write & yolo delegations may run.",
              values: l.trusted_workspaces,
              onChange: (n) => d({ trusted_workspaces: n })
            }
          ),
          /* @__PURE__ */ e(
            T,
            {
              label: "Custom role directories",
              hint: "role_dirs",
              desc: "Extra folders scanned for role persona files.",
              values: l.role_dirs,
              onChange: (n) => d({ role_dirs: n })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ s(v, { children: [
        /* @__PURE__ */ e(b, { children: "Per-agent overrides" }),
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
          l.agents.map((n, y) => /* @__PURE__ */ s(
            "div",
            {
              className: "flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]",
              children: [
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: C + " w-32",
                    value: n.id,
                    placeholder: "agent id",
                    onChange: (w) => {
                      const h = l.agents.slice();
                      h[y] = { ...n, id: w.target.value }, d({ agents: h });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: C + " flex-1",
                    value: n.default_model ?? "",
                    placeholder: "Default model (blank = agent default)",
                    onChange: (w) => {
                      const h = l.agents.slice();
                      h[y] = { ...n, default_model: w.target.value }, d({ agents: h });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  F,
                  {
                    label: "",
                    value: n.enabled,
                    onChange: (w) => {
                      const h = l.agents.slice();
                      h[y] = { ...n, enabled: w }, d({ agents: h });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "p-1 text-muted hover:text-amber-500",
                    onClick: () => d({ agents: l.agents.filter((w, h) => h !== y) }),
                    title: "Remove agent",
                    children: /* @__PURE__ */ e(H, { size: 14 })
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
  return a.reduce((r, l) => r + (Array.isArray(l.panels) ? l.panels.length : 0), 0) === 0 ? /* @__PURE__ */ s(v, { children: [
    /* @__PURE__ */ e(b, { children: "Named panels" }),
    /* @__PURE__ */ s("p", { className: "text-sm text-muted mt-1", children: [
      "No ",
      /* @__PURE__ */ e("code", { children: "panels.toon" }),
      " found (read-only — editing is a later step). Checked:"
    ] }),
    a.map((r) => /* @__PURE__ */ e(S, { meta: r }, r.path))
  ] }) : /* @__PURE__ */ e(A, { children: a.map((r) => {
    const l = Array.isArray(r.panels) ? r.panels : [];
    return l.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ s(v, { children: [
      /* @__PURE__ */ s(b, { children: [
        "Panels · ",
        r.scope,
        " (read-only)"
      ] }),
      /* @__PURE__ */ e(S, { meta: r }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-col gap-2", children: l.map((c) => /* @__PURE__ */ s("div", { className: "p-3 rounded bg-[var(--surface-2,#1e1e1e)]", children: [
        /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ e("span", { className: "text-sm font-medium text-[var(--fg,#eee)]", children: c.name }),
          c.strategy && /* @__PURE__ */ e("span", { className: "px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-3,#333)] text-muted", children: c.strategy }),
          c.targets != null && /* @__PURE__ */ s("span", { className: "text-[10px] text-muted", children: [
            c.targets,
            " voices"
          ] })
        ] }),
        c.description && /* @__PURE__ */ e("p", { className: "text-xs text-muted mt-1", children: c.description })
      ] }, c.name)) })
    ] }) }, r.path);
  }) });
}
function he({ roles: t }) {
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No roles." });
  const a = Array.isArray(t.sources) ? t.sources : [];
  return a.reduce((r, l) => r + (Array.isArray(l.roles) ? l.roles.length : 0), 0) === 0 ? /* @__PURE__ */ s(v, { children: [
    /* @__PURE__ */ e(b, { children: "Roles" }),
    /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: "No role markdown files found (read-only — editing is a later step). Checked:" }),
    a.map((r) => /* @__PURE__ */ e(S, { meta: r }, r.path))
  ] }) : /* @__PURE__ */ e(A, { children: a.map((r) => {
    const l = Array.isArray(r.roles) ? r.roles : [];
    return l.length === 0 ? null : /* @__PURE__ */ e("div", { className: "mb-4", children: /* @__PURE__ */ s(v, { children: [
      /* @__PURE__ */ s(b, { children: [
        "Roles · ",
        r.scope,
        " (read-only)"
      ] }),
      /* @__PURE__ */ e(S, { meta: r }),
      /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: l.map((c) => /* @__PURE__ */ e(
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
  Ne as default
};
