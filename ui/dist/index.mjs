import { jsxs as a, Fragment as H, jsx as e } from "react/jsx-runtime";
import { useAppApi as _e } from "@kirocrew/app-sdk";
import { PageHeader as we, Card as M, CardTitle as I, StatCard as ae } from "@kirocrew/app-sdk/ui";
import { useState as S, useRef as ke, useCallback as J, useEffect as ee } from "react";
import Se from "lucide-react";
const {
  Box: Ae,
  FileCog: Ce,
  Layers: Re,
  UserSquare: ze,
  RefreshCw: be,
  AlertTriangle: Q,
  Save: se,
  Plus: Z,
  X: le,
  CheckCircle2: te,
  Server: $e,
  Trash2: he,
  Info: re,
  Pencil: ge,
  FileText: Ee,
  Cpu: Te
} = Se, j = "/api/apps/rutherford", De = [
  { id: "status", label: "Overview", icon: Ae },
  { id: "config", label: "Config", icon: Ce },
  { id: "panels", label: "Panels", icon: Re },
  { id: "native", label: "Native Panels", icon: Te },
  { id: "roles", label: "Roles", icon: ze }
], je = ["read_only", "propose", "write", "yolo"], Pe = ["ephemeral", "job"], ve = [
  "all-voices",
  "unanimous",
  "majority",
  "plurality",
  "weighted",
  "parity-pair",
  "rank"
];
function ye(t) {
  const r = String((t == null ? void 0 : t.agent_ids_source) || "").toLowerCase();
  return r ? /fallback|no backend mcp|config-derived|unresolved|builtin/.test(r) : !0;
}
function Y({ meta: t }) {
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
function ot() {
  const t = _e(), [r, n] = S("status"), [c, u] = S(!0), [l, s] = S(null), [m, i] = S(null), [h, y] = S(null), [o, _] = S("global"), [E, R] = S(null), [V, N] = S(null), [U, f] = S(null), [d, w] = S(null), g = ke("global"), x = J(
    async (b) => {
      g.current = b;
      try {
        const C = await t.get(`${j}/rutherford-config?scope=${b}`);
        if (g.current !== b) return;
        if (!C || typeof C != "object") {
          s(`No config returned for ${b} scope.`);
          return;
        }
        R({ ...C, scope: b }), s(null);
      } catch (C) {
        if (g.current !== b) return;
        s(C instanceof Error ? C.message : String(C));
      }
    },
    [t]
  ), A = J(async () => {
    u(!0), s(null);
    try {
      const [b, C, D, P, L] = await Promise.all([
        // Meta is best-effort: catch so a meta failure degrades dropdowns to
        // free text but never fails the whole load.
        t.get(`${j}/rutherford-meta`).catch(() => null),
        t.get(`${j}/status`),
        t.get(`${j}/panels`),
        // Native panels (v3.0.0) — best-effort so an older backend without the
        // route degrades to an empty Native Panels tab instead of failing the load.
        t.get(`${j}/rutherford-native-panels`).catch(() => null),
        // FIX: roles are served at /rutherford-roles (GET+PUT share that base);
        // the old bare /roles path 404s.
        t.get(`${j}/rutherford-roles`)
      ]);
      b && typeof b == "object" && !b.error ? i(b) : i(null), y(C), N(D), P && typeof P == "object" && !P.error ? f(P) : f(null), w(L);
    } catch (b) {
      s(b instanceof Error ? b.message : String(b));
    } finally {
      u(!1);
    }
  }, [t]);
  ee(() => {
    A();
  }, [A]), ee(() => {
    x(o);
  }, [x, o]);
  const F = J((b) => {
    _(b);
  }, []), G = (b) => !!b && typeof b == "object" && b.written === !0, oe = J(
    async (b, C) => {
      const D = `${j}/rutherford-config?scope=${b}`;
      let P = await t.put(D, C);
      G(P) || (await new Promise((T) => setTimeout(T, 600)), P = await t.put(D, C));
      let L = G(P) ? P : null;
      if (!L) {
        const T = await t.get(D);
        if (T && typeof T == "object") {
          const z = T;
          Fe(C, z.config) && (L = z);
        }
      }
      if (!L)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your entered values were kept; try Save again."
        );
      const O = L.scope ?? g.current;
      g.current = O, R({ ...L, scope: O });
      try {
        const T = await t.get(`${j}/status`);
        T && typeof T == "object" && y(T);
      } catch {
      }
      return L;
    },
    [t]
  ), ce = J(
    async (b, C) => {
      var z;
      const D = `${j}/rutherford-panels?scope=${b}`, P = { panels: C }, L = (v) => !!v && typeof v == "object" && v.written === !0;
      let O = await t.put(D, P);
      L(O) || (await new Promise((v) => setTimeout(v, 600)), O = await t.put(D, P));
      let T = L(O) ? O : null;
      if (!T) {
        const v = await t.get(`${j}/panels`), B = (z = v == null ? void 0 : v.sources) == null ? void 0 : z.find((q) => q.scope === b);
        if (B) {
          const q = C.map((W) => W.name).sort(), X = (Array.isArray(B.panels) ? B.panels : []).map((W) => W.name).sort();
          q.length === X.length && q.every((W, ue) => W === X[ue]) && (T = { ...B, written: !0 });
        }
      }
      if (!T)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your edits were kept; try Save again."
        );
      try {
        const v = await t.get(`${j}/panels`);
        v && typeof v == "object" && N(v);
      } catch {
      }
      return T;
    },
    [t]
  ), de = J(
    async (b, C) => {
      var z;
      const D = `${j}/rutherford-native-panels?scope=${b}`, P = { panels: C }, L = (v) => !!v && typeof v == "object" && v.written === !0;
      let O = await t.put(D, P);
      L(O) || (await new Promise((v) => setTimeout(v, 600)), O = await t.put(D, P));
      let T = L(O) ? O : null;
      if (!T) {
        const v = await t.get(`${j}/rutherford-native-panels`), B = (z = v == null ? void 0 : v.sources) == null ? void 0 : z.find((q) => q.scope === b);
        if (B) {
          const q = C.map((W) => W.name).sort(), X = (Array.isArray(B.panels) ? B.panels : []).map((W) => W.name).sort();
          q.length === X.length && q.every((W, ue) => W === X[ue]) && (T = { ...B, written: !0 });
        }
      }
      if (!T)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your edits were kept; try Save again."
        );
      try {
        const v = await t.get(`${j}/rutherford-native-panels`);
        v && typeof v == "object" && f(v);
      } catch {
      }
      return T;
    },
    [t]
  ), p = J(
    async (b, C) => {
      try {
        const D = await t.get(
          `${j}/rutherford-roles?scope=${b}&name=${encodeURIComponent(C)}`
        );
        return D && typeof D == "object" && D.role && typeof D.role == "object" ? D.role : null;
      } catch {
        return null;
      }
    },
    [t]
  ), k = J(
    async (b, C) => {
      const D = `${j}/rutherford-roles?scope=${b}`, P = (z) => !!z && typeof z == "object" && z.written === !0, L = C.op === "delete";
      let O = await t.put(D, C);
      P(O) || (await new Promise((z) => setTimeout(z, 600)), O = await t.put(D, C));
      let T = P(O) ? O : null;
      if (!T)
        if (L) {
          let z = !1;
          try {
            const v = await t.get(
              `${j}/rutherford-roles?scope=${b}&name=${encodeURIComponent(C.name)}`
            );
            v && typeof v == "object" && v.exists === !1 && (z = !0);
          } catch {
          }
          if (!z)
            try {
              const v = await t.get(`${j}/rutherford-roles`), B = Array.isArray(v == null ? void 0 : v.sources) ? v.sources : null, q = B ? B.find((X) => X.scope === b) : void 0;
              q && !q.error && Array.isArray(q.roles) && (q.roles.some((W) => W.name === C.name) || (z = !0));
            } catch {
            }
          z && (T = { scope: b, path: "", platform: "", written: !0, deleted: !0 });
        } else {
          const z = await t.get(`${j}/rutherford-roles`), v = (Array.isArray(z == null ? void 0 : z.sources) ? z.sources : []).find(
            (q) => q.scope === b
          );
          (Array.isArray(v == null ? void 0 : v.roles) ? v.roles : []).some(
            (q) => q.name === C.name
          ) && (T = { scope: b, path: (v == null ? void 0 : v.path) ?? "", platform: "", written: !0 });
        }
      if (!T)
        throw new Error(
          L ? "Delete could not be confirmed — the role file may still exist (a non-404 error, empty response, or unreachable server). Nothing was closed; your draft was kept. Try Delete again." : "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your edits were kept; try Save again."
        );
      try {
        const z = await t.get(`${j}/rutherford-roles`);
        z && typeof z == "object" && w(z);
      } catch {
      }
      return T;
    },
    [t]
  );
  return /* @__PURE__ */ a(H, { children: [
    /* @__PURE__ */ e(we, { title: "Rutherford", subtitle: "Config, panels & roles — config.toml / panels.toon / role files" }),
    /* @__PURE__ */ a("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ a("div", { className: "flex gap-1 mb-5 border-b border-[var(--border,#2a2a2a)]", children: [
        De.map(({ id: b, label: C, icon: D }) => /* @__PURE__ */ a(
          "button",
          {
            onClick: () => n(b),
            className: "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors " + (r === b ? "border-[var(--accent,#6366f1)] text-[var(--fg,#eee)]" : "border-transparent text-muted hover:text-[var(--fg,#eee)]"),
            children: [
              /* @__PURE__ */ e(D, { size: 15 }),
              C
            ]
          },
          b
        )),
        /* @__PURE__ */ e(
          "button",
          {
            onClick: () => void A(),
            className: "ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-[var(--fg,#eee)]",
            title: "Reload",
            children: /* @__PURE__ */ e(be, { size: 15, className: c ? "animate-spin" : "" })
          }
        )
      ] }),
      l && /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-sm text-amber-500 mb-4", children: [
        /* @__PURE__ */ e(Q, { size: 15 }),
        " ",
        l
      ] }),
      c && !h ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "Loading…" }) : /* @__PURE__ */ a(H, { children: [
        r === "status" && /* @__PURE__ */ e(qe, { status: h }),
        r === "config" && /* @__PURE__ */ e(
          Ie,
          {
            config: E,
            meta: m,
            scope: o,
            onScope: F,
            onSave: oe
          }
        ),
        r === "panels" && /* @__PURE__ */ e(He, { panels: V, meta: m, onSave: ce }),
        r === "native" && /* @__PURE__ */ e(et, { nativePanels: U, meta: m, onSave: de }),
        r === "roles" && /* @__PURE__ */ e(at, { roles: d, meta: m, onFetchRole: p, onSave: k })
      ] })
    ] })
  ] });
}
function qe({ status: t }) {
  var i, h, y;
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No status." });
  const r = t.agents || { enabled: [], enabled_source: "", allowlist_configured: !1, roster: [] }, n = Array.isArray(r.enabled) ? r.enabled : [], c = Array.isArray(r.roster) ? r.roster : [], u = Array.isArray(t.acp) ? t.acp : [], l = t.defaults || {}, s = r.allowlist_configured ? String(n.length) : "All", m = Object.keys(t.env_overrides || {}).filter((o) => o !== "_note");
  return /* @__PURE__ */ a(H, { children: [
    /* @__PURE__ */ a(M, { children: [
      /* @__PURE__ */ e(I, { children: "What is Rutherford?" }),
      /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-1", children: [
        "A Kiro Crew app that drives external ACP coding agents (Claude Code, Codex, and others) for multi-agent ",
        /* @__PURE__ */ e("strong", { children: "delegation, consensus, debate, review, and planning" }),
        " — read-only by default."
      ] }),
      /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-2", children: [
        /* @__PURE__ */ e("strong", { children: "Setup:" }),
        " Rutherford runs as an MCP server that the",
        " ",
        /* @__PURE__ */ e("code", { className: "text-xs", children: "rutherford-orchestrator" }),
        " agent drives — there is no",
        " ",
        /* @__PURE__ */ e("code", { className: "text-xs", children: "rutherford" }),
        " command to type in a terminal. To check your crew, ask ",
        /* @__PURE__ */ e("code", { className: "text-xs", children: "rutherford-orchestrator" }),
        " in a Kiro Crew session to run a health check: it calls the ",
        /* @__PURE__ */ e("code", { className: "text-xs", children: "doctor" }),
        " ",
        "tool, a real read-only round trip per agent. To scaffold config the first time, ask it to run ",
        /* @__PURE__ */ e("code", { className: "text-xs", children: "setup (write=true)" }),
        " — everything is read-only by default, so a bare ",
        /* @__PURE__ */ e("code", { className: "text-xs", children: "setup" }),
        " only shows where config lives."
      ] }),
      /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-2", children: /* @__PURE__ */ e("strong", { children: "Two ways to configure it:" }) }),
      /* @__PURE__ */ a("ul", { className: "text-sm text-muted mt-1", style: { paddingLeft: 18, listStyle: "disc" }, children: [
        /* @__PURE__ */ a("li", { style: { marginTop: 2 }, children: [
          /* @__PURE__ */ e("strong", { children: "Manual" }),
          " — use the ",
          /* @__PURE__ */ e("strong", { children: "Config" }),
          ", ",
          /* @__PURE__ */ e("strong", { children: "Panels" }),
          ", and ",
          /* @__PURE__ */ e("strong", { children: "Roles" }),
          " tabs in this app to edit Rutherford's configuration directly (global or workspace ",
          /* @__PURE__ */ e("code", { className: "text-xs", children: "config.toml" }),
          ",",
          " ",
          /* @__PURE__ */ e("code", { className: "text-xs", children: "panels.toon" }),
          ", role files)."
        ] }),
        /* @__PURE__ */ a("li", { style: { marginTop: 4 }, children: [
          /* @__PURE__ */ e("strong", { children: "Conversational" }),
          " — or just talk to Rutherford in a Kiro Crew session using the ",
          /* @__PURE__ */ e("code", { className: "text-xs", children: "rutherford-orchestrator" }),
          " agent. It routes your request to the right mode (delegate / consensus / debate / review / plan), can run ",
          /* @__PURE__ */ e("code", { className: "text-xs", children: "doctor" }),
          " / ",
          /* @__PURE__ */ e("code", { className: "text-xs", children: "setup" }),
          ", and can edit your config for you."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mb-6", children: [
      /* @__PURE__ */ e(ae, { label: "Platform", value: t.platform }),
      /* @__PURE__ */ e(ae, { label: "Agents enabled", value: s, accent: !0 }),
      /* @__PURE__ */ e(ae, { label: "Safety mode", value: l.safety_mode ?? "read_only" }),
      /* @__PURE__ */ e(
        ae,
        {
          label: "Local model detect",
          value: l.auto_detect_local_models ? "on" : "off"
        }
      )
    ] }),
    /* @__PURE__ */ a(M, { children: [
      /* @__PURE__ */ e(I, { children: "Resolved roster" }),
      c.length > 0 ? /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1.5", children: c.map((o) => /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ e("span", { className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]", children: o.id }),
        /* @__PURE__ */ e("span", { className: "text-muted text-xs", children: o.default_model ?? "(agent default)" }),
        /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-auto", children: o.source })
      ] }, o.id)) }) : r.allowlist_configured ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-2", children: n.map((o) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          children: o
        },
        o
      )) }) : /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-1", children: [
        "No ",
        /* @__PURE__ */ e("code", { children: "enabled_agents" }),
        " allowlist configured — Rutherford enables every built-in agent plus any configured agent (source: ",
        r.enabled_source || "default",
        ")."
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a(M, { children: [
      /* @__PURE__ */ e(I, { children: "Config locations" }),
      ((i = t.config_locations) == null ? void 0 : i.global) && /* @__PURE__ */ e(Y, { meta: t.config_locations.global }),
      ((h = t.config_locations) == null ? void 0 : h.workspace) && /* @__PURE__ */ e(Y, { meta: t.config_locations.workspace })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a(M, { children: [
      /* @__PURE__ */ e(I, { children: /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e($e, { size: 14 }),
        " acp.json (agent servers)"
      ] }) }),
      u.map((o) => {
        const _ = Object.keys(o.agent_servers || {});
        return /* @__PURE__ */ a("div", { className: "mt-2", children: [
          /* @__PURE__ */ e(Y, { meta: o }),
          _.length > 0 && /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-1", children: _.map((E) => /* @__PURE__ */ e(
            "span",
            {
              className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
              children: E
            },
            E
          )) })
        ] }, o.path);
      })
    ] }),
    m.length > 0 && /* @__PURE__ */ a(H, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(M, { children: [
        /* @__PURE__ */ e(I, { children: "Environment overrides" }),
        /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1", children: m.map((o) => /* @__PURE__ */ a("div", { className: "text-xs", children: [
          /* @__PURE__ */ e("code", { children: o }),
          " = ",
          /* @__PURE__ */ e("code", { className: "text-muted", children: String((t.env_overrides || {})[o]) })
        ] }, o)) }),
        (t.env_overrides || {})._note && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-2", children: String((t.env_overrides || {})._note) })
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a(M, { children: [
      /* @__PURE__ */ e(I, { children: "Reachability" }),
      /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: ((y = t.reachability) == null ? void 0 : y.note) ?? "—" })
    ] })
  ] });
}
function ne({ text: t }) {
  return t ? /* @__PURE__ */ e(
    "span",
    {
      className: "inline-flex items-center justify-center align-middle ml-1 text-muted opacity-60 hover:opacity-100 cursor-help",
      title: t,
      "aria-label": t,
      role: "img",
      children: /* @__PURE__ */ e(re, { size: 12 })
    }
  ) : null;
}
function Ne({ required: t }) {
  return t ? /* @__PURE__ */ e("span", { className: "text-amber-500 ml-1", title: "Required", children: "*" }) : /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-1.5", children: "optional" });
}
function K({
  label: t,
  hint: r,
  help: n,
  required: c,
  absent: u,
  children: l
}) {
  return /* @__PURE__ */ a("label", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ a("span", { className: "text-sm text-[var(--fg,#eee)] flex items-center flex-wrap", children: [
      t,
      r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r }),
      n && /* @__PURE__ */ e(ne, { text: n }),
      c !== void 0 && /* @__PURE__ */ e(Ne, { required: c })
    ] }),
    u && /* @__PURE__ */ a("span", { className: "text-[11px] text-muted -mt-0.5", children: [
      "absent → ",
      u
    ] }),
    l
  ] });
}
const $ = "px-2 py-1.5 text-sm rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)] text-[var(--fg,#eee)] outline-none focus:border-[var(--accent,#6366f1)]";
function me({
  label: t,
  hint: r,
  help: n,
  required: c,
  absent: u,
  values: l,
  onChange: s
}) {
  const [m, i] = S("");
  return /* @__PURE__ */ a("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ a("span", { className: "text-sm text-[var(--fg,#eee)] flex items-center flex-wrap", children: [
      t,
      r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r }),
      n && /* @__PURE__ */ e(ne, { text: n }),
      c !== void 0 && /* @__PURE__ */ e(Ne, { required: c })
    ] }),
    u && /* @__PURE__ */ a("span", { className: "text-[11px] text-muted -mt-0.5", children: [
      "empty → ",
      u
    ] }),
    /* @__PURE__ */ a("div", { className: "flex flex-col gap-1.5", children: [
      l.map((h, y) => /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: $ + " flex-1",
            value: h,
            onChange: (o) => {
              const _ = l.slice();
              _[y] = o.target.value, s(_);
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-amber-500",
            onClick: () => s(l.filter((o, _) => _ !== y)),
            title: "Remove",
            children: /* @__PURE__ */ e(le, { size: 14 })
          }
        )
      ] }, y)),
      /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: $ + " flex-1",
            placeholder: `Add ${t}…`,
            value: m,
            onChange: (h) => i(h.target.value),
            onKeyDown: (h) => {
              h.key === "Enter" && m.trim() && (s([...l, m.trim()]), i(""));
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-[var(--accent,#6366f1)]",
            onClick: () => {
              m.trim() && (s([...l, m.trim()]), i(""));
            },
            title: "Add",
            children: /* @__PURE__ */ e(Z, { size: 14 })
          }
        )
      ] })
    ] })
  ] });
}
function ie({
  value: t,
  onChange: r,
  srLabel: n
}) {
  const [c, u] = S(!1);
  return /* @__PURE__ */ e(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": t,
      "aria-label": n,
      onClick: () => r(!t),
      onFocus: () => u(!0),
      onBlur: () => u(!1),
      style: {
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        flex: "none",
        width: 40,
        height: 22,
        borderRadius: 9999,
        cursor: "pointer",
        padding: 0,
        boxSizing: "border-box",
        transition: "background-color .15s, border-color .15s",
        outline: "none",
        backgroundColor: t ? "var(--accent, #7c3aed)" : "transparent",
        border: t ? "1px solid var(--accent, #7c3aed)" : "1px solid var(--border, #6b7280)",
        boxShadow: c ? "0 0 0 2px var(--accent, #7c3aed)" : "none"
      },
      children: /* @__PURE__ */ e(
        "span",
        {
          "aria-hidden": "true",
          style: {
            position: "absolute",
            top: 2,
            left: t ? 20 : 2,
            width: 16,
            height: 16,
            borderRadius: 9999,
            backgroundColor: "#ffffff",
            boxShadow: "0 1px 2px rgba(0,0,0,.35)",
            transition: "left .15s"
          }
        }
      )
    }
  );
}
function xe({
  label: t,
  hint: r,
  help: n,
  absent: c,
  value: u,
  onChange: l
}) {
  return /* @__PURE__ */ a("label", { className: "flex items-start gap-2.5 cursor-pointer", children: [
    /* @__PURE__ */ e("span", { className: "mt-0.5", children: /* @__PURE__ */ e(ie, { value: u, onChange: l, srLabel: t || void 0 }) }),
    /* @__PURE__ */ a("span", { className: "flex flex-col", children: [
      /* @__PURE__ */ a("span", { className: "text-sm text-[var(--fg,#eee)] flex items-center flex-wrap", children: [
        t,
        r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r }),
        n && /* @__PURE__ */ e(ne, { text: n })
      ] }),
      c && /* @__PURE__ */ a("span", { className: "text-[11px] text-muted", children: [
        "absent → ",
        c
      ] })
    ] })
  ] });
}
const Le = {
  default_safety_mode: {
    label: "Default safety mode",
    key: "default_safety_mode",
    help: "The safety posture applied to a delegation when the call does not name one. read_only reads only; propose stages a diff; write edits in a sandbox; yolo edits with no sandbox.",
    required: !1,
    absent: "defaults to read_only"
  },
  default_persistence: {
    label: "Run persistence",
    key: "default_persistence",
    help: "Whether a run is kept as a durable job on disk (job) or discarded after it returns (ephemeral), when the call does not specify.",
    required: !1,
    absent: "defaults to ephemeral"
  },
  default_timeout_s: {
    label: "Default timeout (seconds)",
    key: "default_timeout_s",
    help: "Per-voice / per-delegation wall-clock timeout applied when a call does not pass its own timeout_s.",
    required: !1,
    absent: "uses the built-in default"
  },
  max_targets: {
    label: "Max agents per panel",
    key: "max_targets",
    help: "Upper bound on how many agents an auto-expanded (all) panel fans out to.",
    required: !1,
    absent: "uses the built-in default"
  },
  auto_detect_local_models: {
    label: "Auto-detect local models (Ollama / LM Studio)",
    key: "auto_detect_local_models",
    help: "When on, Rutherford probes a local Ollama / LM Studio and offers detected models as free voices.",
    absent: "defaults to off"
  },
  synthesize_default: {
    label: "Synthesize a combined answer by default",
    key: "synthesize_default",
    help: "When on, an all-voices consensus adds a server-side combined answer unless the call overrides it.",
    absent: "defaults to off"
  },
  enabled_agents: {
    label: "Enabled agents (allowlist)",
    key: "enabled_agents",
    help: "An explicit allowlist of agent ids Rutherford may drive. When set, only these are enabled.",
    required: !1,
    absent: "All built-in + configured agents are enabled"
  },
  trusted_workspaces: {
    label: "Trusted workspaces (write/yolo allowed)",
    key: "trusted_workspaces",
    help: "Absolute directories where write & yolo delegations are permitted. A path not on this list can only be read.",
    required: !1,
    absent: "write/yolo not permitted anywhere"
  },
  role_dirs: {
    label: "Custom role directories",
    key: "role_dirs",
    help: "Extra folders scanned for role persona files, in addition to the default ~/.rutherford/roles and <project>/.rutherford/roles.",
    required: !1,
    absent: "only ~/.rutherford/roles and <project>/.rutherford/roles scanned"
  },
  agent_override: {
    help: "A per-agent default model id used when a call to that agent does not name a model. Free text — model ids are open.",
    absent: "uses the agent's built-in default model"
  }
};
function Oe(t) {
  const r = t.config || {}, n = (l) => {
    const s = r[l];
    return typeof s == "number" && Number.isFinite(s) ? String(s) : typeof s == "string" && s.trim() !== "" && Number.isFinite(Number(s)) ? String(Number(s)) : "";
  }, c = t.derived || {}, u = (l) => Array.isArray(l) ? l.filter((s) => typeof s == "string") : [];
  return {
    default_safety_mode: typeof r.default_safety_mode == "string" ? r.default_safety_mode : "read_only",
    default_timeout_s: n("default_timeout_s"),
    max_targets: n("max_targets"),
    auto_detect_local_models: r.auto_detect_local_models === !0,
    default_persistence: typeof r.default_persistence == "string" ? r.default_persistence : "ephemeral",
    synthesize_default: r.synthesize_default === !0,
    enabled_agents: u(c.enabled_agents),
    trusted_workspaces: u(c.trusted_workspaces),
    role_dirs: u(c.role_dirs),
    agents: (Array.isArray(t.agents) ? t.agents : []).map((l) => ({
      ...l,
      env: { ...l.env || {} },
      extra: { ...l.extra || {} }
    }))
  };
}
function Fe(t, r) {
  if (!r || typeof r != "object") return !1;
  const n = (c, u) => String(c) === String(u);
  for (const [c, u] of Object.entries(t)) {
    const l = r[c];
    if (c === "agents") {
      const s = u && typeof u == "object" ? Object.keys(u).sort() : [], m = l && typeof l == "object" ? Object.keys(l).sort() : [];
      if (s.length !== m.length || s.some((i, h) => i !== m[h])) return !1;
      continue;
    }
    if (Array.isArray(u)) {
      if (!Array.isArray(l) || l.length !== u.length || u.some((s, m) => !n(s, l[m]))) return !1;
      continue;
    }
    if (!n(u, l)) return !1;
  }
  return !0;
}
function Me(t, r) {
  const n = { ...t.config };
  delete n.agents;
  const c = (s, m) => {
    if (m.trim() === "") delete n[s];
    else {
      const i = Number(m);
      Number.isNaN(i) || (n[s] = i);
    }
  };
  n.default_safety_mode = r.default_safety_mode, c("default_timeout_s", r.default_timeout_s), c("max_targets", r.max_targets), n.auto_detect_local_models = r.auto_detect_local_models, n.default_persistence = r.default_persistence, n.synthesize_default = r.synthesize_default;
  const u = (s, m) => {
    const i = m.map((h) => h.trim()).filter(Boolean);
    i.length ? n[s] = i : delete n[s];
  };
  u("enabled_agents", r.enabled_agents), u("trusted_workspaces", r.trusted_workspaces), u("role_dirs", r.role_dirs);
  const l = {};
  for (const s of r.agents) {
    const m = s.id.trim();
    if (!m) continue;
    const i = { ...s.extra };
    s.default_model != null && String(s.default_model).trim() !== "" && (i.default_model = s.default_model), i.enabled = s.enabled, s.env && Object.keys(s.env).length && (i.env = s.env), l[m] = i;
  }
  return Object.keys(l).length && (n.agents = l), n;
}
function fe({
  value: t,
  options: r,
  freeText: n,
  onChange: c,
  listId: u,
  placeholder: l
}) {
  const s = Array.isArray(r) ? r : [];
  return n ? /* @__PURE__ */ a(H, { children: [
    /* @__PURE__ */ e(
      "input",
      {
        className: $,
        value: t,
        list: u,
        placeholder: l,
        onChange: (m) => c(m.target.value)
      }
    ),
    /* @__PURE__ */ e("datalist", { id: u, children: s.map((m) => /* @__PURE__ */ e("option", { value: m }, m)) })
  ] }) : /* @__PURE__ */ a("select", { className: $, value: t, onChange: (m) => c(m.target.value), children: [
    t !== "" && !s.includes(t) && /* @__PURE__ */ e("option", { value: t, children: t }),
    s.map((m) => /* @__PURE__ */ e("option", { value: m, children: m }, m))
  ] });
}
function Ie({
  config: t,
  meta: r,
  scope: n,
  onScope: c,
  onSave: u
}) {
  const [l, s] = S(null), [m, i] = S(!1), [h, y] = S(null), o = Array.isArray(r == null ? void 0 : r.safety_modes) && r.safety_modes.length ? r.safety_modes : je, _ = Array.isArray(r == null ? void 0 : r.persistence) && r.persistence.length ? r.persistence : Pe, E = Array.isArray(r == null ? void 0 : r.agent_ids) ? r.agent_ids : [], R = ye(r), V = !!t && t.scope === n;
  ee(() => {
    if (!t || t.scope !== n) {
      s((d) => d ?? null);
      return;
    }
    y(null), s(Oe(t));
  }, [t, n]);
  const N = (d) => s((w) => w && { ...w, ...d }), U = async () => {
    if (!(!t || !l)) {
      i(!0), y(null);
      try {
        await u(n, Me(t, l)), y({ ok: !0, text: `Saved to ${n} config.toml (backup written).` });
      } catch (d) {
        y({ ok: !1, text: d instanceof Error ? d.message : String(d) });
      } finally {
        i(!1);
      }
    }
  }, f = Le;
  return /* @__PURE__ */ a(H, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((d) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => c(d),
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (n === d ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: d === "global" ? "Global" : "Workspace"
        },
        d
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: () => void U(),
          disabled: m || !l,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(se, { size: 14 }),
            " ",
            m ? "Saving…" : `Save ${n}`
          ]
        }
      )
    ] }),
    !r && /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-xs text-muted mb-3", children: [
      /* @__PURE__ */ e(Q, { size: 13 }),
      " Option lists (dropdowns) could not be loaded from the backend — showing free-text inputs instead."
    ] }),
    h && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (h.ok ? "text-green-500" : "text-amber-500"),
        children: [
          h.ok ? /* @__PURE__ */ e(te, { size: 15 }) : /* @__PURE__ */ e(Q, { size: 15 }),
          h.text
        ]
      }
    ),
    !V || !l ? /* @__PURE__ */ a("p", { className: "text-sm text-muted", children: [
      "Loading ",
      n,
      " config…"
    ] }) : /* @__PURE__ */ a(H, { children: [
      /* @__PURE__ */ a(M, { children: [
        /* @__PURE__ */ e(I, { children: "Defaults" }),
        /* @__PURE__ */ e(Y, { meta: t }),
        !t.exists && /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-2", children: [
          "No ",
          /* @__PURE__ */ e("code", { children: "config.toml" }),
          " at this scope yet — no file yet; defaults apply; saving creates it (",
          /* @__PURE__ */ e("code", { children: t.path }),
          ")."
        ] }),
        /* @__PURE__ */ a("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            K,
            {
              label: f.default_safety_mode.label,
              hint: f.default_safety_mode.key,
              help: f.default_safety_mode.help,
              required: f.default_safety_mode.required,
              absent: f.default_safety_mode.absent,
              children: /* @__PURE__ */ e(
                "select",
                {
                  className: $,
                  value: l.default_safety_mode,
                  onChange: (d) => N({ default_safety_mode: d.target.value }),
                  children: o.map((d) => /* @__PURE__ */ e("option", { value: d, children: d }, d))
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            K,
            {
              label: f.default_timeout_s.label,
              hint: f.default_timeout_s.key,
              help: f.default_timeout_s.help,
              required: f.default_timeout_s.required,
              absent: f.default_timeout_s.absent,
              children: /* @__PURE__ */ e(
                "input",
                {
                  type: "number",
                  className: $,
                  value: l.default_timeout_s,
                  onChange: (d) => N({ default_timeout_s: d.target.value })
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            K,
            {
              label: f.max_targets.label,
              hint: f.max_targets.key,
              help: f.max_targets.help,
              required: f.max_targets.required,
              absent: f.max_targets.absent,
              children: /* @__PURE__ */ e(
                "input",
                {
                  type: "number",
                  className: $,
                  value: l.max_targets,
                  onChange: (d) => N({ max_targets: d.target.value })
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            K,
            {
              label: f.default_persistence.label,
              hint: f.default_persistence.key,
              help: f.default_persistence.help,
              required: f.default_persistence.required,
              absent: f.default_persistence.absent,
              children: /* @__PURE__ */ e(
                "select",
                {
                  className: $,
                  value: l.default_persistence,
                  onChange: (d) => N({ default_persistence: d.target.value }),
                  children: _.map((d) => /* @__PURE__ */ e("option", { value: d, children: d }, d))
                }
              )
            }
          )
        ] }),
        /* @__PURE__ */ a("div", { className: "flex flex-wrap gap-6 mt-4", children: [
          /* @__PURE__ */ e(
            xe,
            {
              label: f.auto_detect_local_models.label,
              hint: f.auto_detect_local_models.key,
              help: f.auto_detect_local_models.help,
              absent: f.auto_detect_local_models.absent,
              value: l.auto_detect_local_models,
              onChange: (d) => N({ auto_detect_local_models: d })
            }
          ),
          /* @__PURE__ */ e(
            xe,
            {
              label: f.synthesize_default.label,
              hint: f.synthesize_default.key,
              help: f.synthesize_default.help,
              absent: f.synthesize_default.absent,
              value: l.synthesize_default,
              onChange: (d) => N({ synthesize_default: d })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(M, { children: [
        /* @__PURE__ */ e(I, { children: "Allowlists & directories" }),
        /* @__PURE__ */ a("div", { className: "grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            me,
            {
              label: f.enabled_agents.label,
              hint: f.enabled_agents.key,
              help: f.enabled_agents.help,
              required: f.enabled_agents.required,
              absent: f.enabled_agents.absent,
              values: l.enabled_agents,
              onChange: (d) => N({ enabled_agents: d })
            }
          ),
          /* @__PURE__ */ e(
            me,
            {
              label: f.trusted_workspaces.label,
              hint: f.trusted_workspaces.key,
              help: f.trusted_workspaces.help,
              required: f.trusted_workspaces.required,
              absent: f.trusted_workspaces.absent,
              values: l.trusted_workspaces,
              onChange: (d) => N({ trusted_workspaces: d })
            }
          ),
          /* @__PURE__ */ e(
            me,
            {
              label: f.role_dirs.label,
              hint: f.role_dirs.key,
              help: f.role_dirs.help,
              required: f.role_dirs.required,
              absent: f.role_dirs.absent,
              values: l.role_dirs,
              onChange: (d) => N({ role_dirs: d })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(M, { children: [
        /* @__PURE__ */ e(I, { children: "Per-agent overrides" }),
        /* @__PURE__ */ a("p", { className: "text-[11px] text-muted mt-1 flex items-center flex-wrap", children: [
          /* @__PURE__ */ e("code", { className: "text-[10px] opacity-70", children: "[agents.*]" }),
          /* @__PURE__ */ e("span", { className: "ml-1.5", children: "per-agent default model and enabled flag." }),
          /* @__PURE__ */ e(ne, { text: f.agent_override.help }),
          /* @__PURE__ */ a("span", { className: "ml-1.5", children: [
            "absent → ",
            f.agent_override.absent
          ] })
        ] }),
        /* @__PURE__ */ a("div", { className: "mt-3 flex flex-col gap-2", children: [
          l.agents.length > 0 && /* @__PURE__ */ a("div", { className: "flex items-center gap-2 px-2 text-[10px] uppercase tracking-wide text-muted opacity-70", children: [
            /* @__PURE__ */ e("span", { className: "w-40", children: "Agent (id)" }),
            /* @__PURE__ */ e("span", { className: "flex-1", children: "Default model (free text)" }),
            /* @__PURE__ */ e("span", { children: "Enabled" }),
            /* @__PURE__ */ e("span", { className: "w-6" })
          ] }),
          l.agents.map((d, w) => /* @__PURE__ */ a(
            "div",
            {
              className: "flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]",
              children: [
                /* @__PURE__ */ e("div", { className: "w-40", children: /* @__PURE__ */ e(
                  fe,
                  {
                    value: d.id,
                    options: E,
                    freeText: R,
                    listId: `agent-ids-${w}`,
                    placeholder: "agent id",
                    onChange: (g) => {
                      const x = l.agents.slice();
                      x[w] = { ...d, id: g }, N({ agents: x });
                    }
                  }
                ) }),
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: $ + " flex-1",
                    value: d.default_model ?? "",
                    placeholder: "Default model (blank = agent default)",
                    onChange: (g) => {
                      const x = l.agents.slice();
                      x[w] = { ...d, default_model: g.target.value }, N({ agents: x });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  ie,
                  {
                    value: d.enabled,
                    srLabel: `Enabled: ${d.id || "agent"}`,
                    onChange: (g) => {
                      const x = l.agents.slice();
                      x[w] = { ...d, enabled: g }, N({ agents: x });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "p-1 text-muted hover:text-amber-500",
                    onClick: () => N({ agents: l.agents.filter((g, x) => x !== w) }),
                    title: "Remove agent",
                    children: /* @__PURE__ */ e(le, { size: 14 })
                  }
                )
              ]
            },
            w
          )),
          /* @__PURE__ */ a(
            "button",
            {
              className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
              onClick: () => N({
                agents: [
                  ...l.agents,
                  { id: "", default_model: "", enabled: !0, env: {}, extra: {} }
                ]
              }),
              children: [
                /* @__PURE__ */ e(Z, { size: 14 }),
                " Add agent"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] });
}
const pe = [
  { key: "model", label: "model", placeholder: "agent default (free text)" },
  { key: "label", label: "label", placeholder: "result key" },
  { key: "stance", label: "stance", placeholder: "for / against / neutral" }
];
function Ke(t) {
  return {
    ...t,
    seats: (Array.isArray(t.seats) ? t.seats : []).map((r) => ({ ...r })),
    extra: { ...t.extra || {} }
  };
}
function Be() {
  return {
    name: "",
    description: "",
    strategy: "all-voices",
    targets: 1,
    seats: [{ cli: "" }],
    extra: {}
  };
}
function We(t) {
  return t.map((r) => ({
    name: r.name.trim(),
    description: (r.description || "").trim(),
    strategy: (r.strategy || "").trim(),
    targets: (r.seats || []).length,
    extra: r.extra || {},
    seats: (r.seats || []).map((n) => {
      const c = { cli: String(n.cli || "").trim() };
      for (const [u, l] of Object.entries(n))
        if (u !== "cli" && l != null)
          if (typeof l == "string") {
            const s = l.trim();
            s !== "" && (c[u] = s);
          } else
            c[u] = l;
      return c;
    })
  }));
}
function Ve({
  seat: t,
  meta: r,
  index: n,
  onChange: c,
  onRemove: u
}) {
  const l = (o, _) => c({ ...t, [o]: _ }), s = Array.isArray(r == null ? void 0 : r.agent_ids) ? r.agent_ids : [], m = ye(r), i = Array.isArray(r == null ? void 0 : r.roles) ? r.roles : [], h = /* @__PURE__ */ new Set([
    "cli",
    "role",
    ...pe.map((o) => o.key),
    "weight",
    "parity"
  ]), y = Object.keys(t).filter((o) => !h.has(o));
  return /* @__PURE__ */ a("div", { className: "p-2.5 rounded bg-[var(--surface-3,#232323)] border border-[var(--border,#2a2a2a)]", children: [
    /* @__PURE__ */ a("div", { className: "grid gap-2 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]", children: [
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ a("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: [
          "cli",
          /* @__PURE__ */ e("span", { className: "text-amber-500", children: " *" })
        ] }),
        /* @__PURE__ */ e(
          fe,
          {
            value: t.cli != null ? String(t.cli) : "",
            options: s,
            freeText: m,
            listId: `seat-cli-${n}`,
            placeholder: "agent id (required)",
            onChange: (o) => l("cli", o)
          }
        )
      ] }),
      pe.filter((o) => o.key === "model").map((o) => /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: o.label }),
        /* @__PURE__ */ e(
          "input",
          {
            className: $,
            value: t[o.key] != null ? String(t[o.key]) : "",
            placeholder: o.placeholder,
            onChange: (_) => l(o.key, _.target.value)
          }
        )
      ] }, o.key)),
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "role" }),
        /* @__PURE__ */ a(
          "select",
          {
            className: $,
            value: t.role != null ? String(t.role) : "",
            onChange: (o) => l("role", o.target.value),
            children: [
              /* @__PURE__ */ e("option", { value: "", children: "(none)" }),
              t.role && !i.includes(String(t.role)) && /* @__PURE__ */ e("option", { value: String(t.role), children: String(t.role) }),
              i.map((o) => /* @__PURE__ */ e("option", { value: o, children: o }, o))
            ]
          }
        )
      ] }),
      pe.filter((o) => o.key !== "model").map((o) => /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: o.label }),
        /* @__PURE__ */ e(
          "input",
          {
            className: $,
            value: t[o.key] != null ? String(t[o.key]) : "",
            placeholder: o.placeholder,
            onChange: (_) => l(o.key, _.target.value)
          }
        )
      ] }, o.key)),
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "weight" }),
        /* @__PURE__ */ e(
          "input",
          {
            className: $,
            type: "number",
            value: t.weight != null ? String(t.weight) : "",
            placeholder: "—",
            onChange: (o) => {
              const _ = o.target.value.trim(), E = { ...t };
              _ === "" ? delete E.weight : E.weight = Number(_), c(E);
            }
          }
        )
      ] }),
      /* @__PURE__ */ a("div", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "parity" }),
        /* @__PURE__ */ e("span", { className: "mt-0.5", children: /* @__PURE__ */ e(
          ie,
          {
            value: t.parity === !0,
            srLabel: "Parity counterweight seat",
            onChange: (o) => {
              const _ = { ...t };
              o ? _.parity = !0 : delete _.parity, c(_);
            }
          }
        ) })
      ] })
    ] }),
    y.length > 0 && /* @__PURE__ */ a("p", { className: "text-[10px] text-muted mt-1.5", children: [
      "preserved on save:",
      " ",
      y.map((o) => /* @__PURE__ */ a("code", { className: "mr-1.5", children: [
        o,
        "=",
        String(t[o])
      ] }, o))
    ] }),
    /* @__PURE__ */ a(
      "button",
      {
        className: "mt-1.5 flex items-center gap-1 text-[11px] text-muted hover:text-amber-500",
        onClick: u,
        title: "Remove seat",
        children: [
          /* @__PURE__ */ e(le, { size: 12 }),
          " Remove seat"
        ]
      }
    )
  ] });
}
function Ge({
  panel: t,
  meta: r,
  onChange: n,
  onDelete: c
}) {
  const [u, l] = S(!1), s = Array.isArray(t.seats) ? t.seats : [], m = Array.isArray(r == null ? void 0 : r.strategies) && r.strategies.length ? r.strategies : ve;
  return /* @__PURE__ */ a("div", { className: "p-3 rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)]", children: [
    /* @__PURE__ */ a("div", { className: "grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]", children: [
      /* @__PURE__ */ e(K, { label: "Name", hint: "panel key", required: !0, children: /* @__PURE__ */ e(
        "input",
        {
          className: $,
          value: t.name,
          placeholder: "panel-name",
          onChange: (i) => n({ ...t, name: i.target.value })
        }
      ) }),
      /* @__PURE__ */ e(
        K,
        {
          label: "Strategy",
          hint: "strategy",
          help: "How the panel's voices are reduced to an outcome. all-voices returns every voice; the rest collapse to one verdict (unanimous, majority, plurality, weighted, parity-pair, rank).",
          children: /* @__PURE__ */ a(
            "select",
            {
              className: $,
              value: t.strategy || "all-voices",
              onChange: (i) => n({ ...t, strategy: i.target.value }),
              children: [
                t.strategy && !m.includes(t.strategy) && /* @__PURE__ */ e("option", { value: t.strategy, children: t.strategy }),
                m.map((i) => /* @__PURE__ */ e("option", { value: i, children: i }, i))
              ]
            }
          )
        }
      )
    ] }),
    /* @__PURE__ */ e("div", { className: "mt-2.5", children: /* @__PURE__ */ e(K, { label: "Description", hint: "description", children: /* @__PURE__ */ e(
      "input",
      {
        className: $,
        value: t.description || "",
        placeholder: "Human label for this panel",
        onChange: (i) => n({ ...t, description: i.target.value })
      }
    ) }) }),
    /* @__PURE__ */ a("div", { className: "mt-3", children: [
      /* @__PURE__ */ e("div", { className: "flex items-center gap-2 mb-1.5", children: /* @__PURE__ */ a("span", { className: "text-xs font-medium text-[var(--fg,#eee)]", children: [
        "Seats ",
        /* @__PURE__ */ a("span", { className: "text-muted", children: [
          "(",
          s.length,
          ")"
        ] })
      ] }) }),
      /* @__PURE__ */ a("div", { className: "flex flex-col gap-2", children: [
        s.map((i, h) => /* @__PURE__ */ e(
          Ve,
          {
            seat: i,
            meta: r,
            index: h,
            onChange: (y) => {
              const o = s.slice();
              o[h] = y, n({ ...t, seats: o });
            },
            onRemove: () => n({ ...t, seats: s.filter((y, o) => o !== h) })
          },
          h
        )),
        /* @__PURE__ */ a(
          "button",
          {
            className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
            onClick: () => n({ ...t, seats: [...s, { cli: "" }] }),
            children: [
              /* @__PURE__ */ e(Z, { size: 14 }),
              " Add seat"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "mt-3 pt-2.5 border-t border-[var(--border,#2a2a2a)] flex items-center", children: u ? /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-xs", children: [
      /* @__PURE__ */ a("span", { className: "text-amber-500", children: [
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
    ] }) : /* @__PURE__ */ a(
      "button",
      {
        className: "flex items-center gap-1.5 text-xs text-muted hover:text-amber-500",
        onClick: () => l(!0),
        children: [
          /* @__PURE__ */ e(he, { size: 13 }),
          " Delete panel"
        ]
      }
    ) })
  ] });
}
function He({
  panels: t,
  meta: r,
  onSave: n
}) {
  const [c, u] = S("global"), [l, s] = S(null), [m, i] = S(!1), [h, y] = S(null), [o, _] = S(null), [E, R] = S(!1), N = (Array.isArray(t == null ? void 0 : t.sources) ? t.sources : []).find((g) => g.scope === c) || null, U = JSON.stringify((N == null ? void 0 : N.panels) ?? null) + "|" + c;
  ee(() => {
    if (!N) {
      s(null);
      return;
    }
    y(null), R(!1), s((N.panels || []).map(Ke));
  }, [U]);
  const f = (g, x) => s((A) => A && A.map((F, G) => G === g ? x : F)), d = () => {
    if (!l) return null;
    const g = /* @__PURE__ */ new Set();
    for (const x of l) {
      const A = x.name.trim();
      if (!A) return "Every panel needs a name.";
      if (g.has(A)) return `Duplicate panel name “${A}”.`;
      g.add(A);
      const F = Array.isArray(x.seats) ? x.seats : [];
      if (F.length === 0) return `Panel “${A}” needs at least one seat.`;
      if (F.some((G) => !String(G.cli || "").trim()))
        return `Panel “${A}” has a seat missing a cli.`;
    }
    return null;
  }, w = async () => {
    if (!l) return;
    const g = d();
    if (g) {
      y({ ok: !1, text: g });
      return;
    }
    i(!0), y(null), _(null), R(!1);
    try {
      await n(c, We(l)), y({ ok: !0, text: `Saved to ${c} panels.toon (backup written).` }), _(c);
    } catch (x) {
      y({ ok: !1, text: x instanceof Error ? x.message : String(x) });
    } finally {
      i(!1);
    }
  };
  return /* @__PURE__ */ a(H, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((g) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => {
            _(null), R(!1), u(g);
          },
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (c === g ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: g === "global" ? "Global" : "Workspace"
        },
        g
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: () => void w(),
          disabled: m || !l,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(se, { size: 14 }),
            " ",
            m ? "Saving…" : `Save ${c}`
          ]
        }
      )
    ] }),
    h && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (h.ok ? "text-green-500" : "text-amber-500"),
        children: [
          h.ok ? /* @__PURE__ */ e(te, { size: 15 }) : /* @__PURE__ */ e(Q, { size: 15 }),
          h.text
        ]
      }
    ),
    o === c && /* @__PURE__ */ a("div", { className: "flex items-start gap-2 text-sm mb-4 rounded border border-[var(--border,#333)] bg-[var(--surface-2,#2a2a2a)] px-3 py-2.5", children: [
      /* @__PURE__ */ e(re, { size: 15, className: "mt-0.5 shrink-0 text-[var(--accent,#6366f1)]" }),
      /* @__PURE__ */ a("div", { className: "flex flex-col gap-1.5", children: [
        /* @__PURE__ */ a("span", { className: "text-[var(--fg,#eee)]", children: [
          "Panels were written to disk. A Rutherford server that is already running still holds the OLD panels in memory — it picks these up on its next run, or immediately when you run the ",
          /* @__PURE__ */ e("code", { children: "reload_panels" }),
          " tool."
        ] }),
        /* @__PURE__ */ e("span", { className: "text-xs text-muted", children: "This app cannot reload Rutherford for you: the MCP server runs in a separate process the backend has no client into. Run the tool in your agent session." }),
        /* @__PURE__ */ a(
          "button",
          {
            onClick: () => {
              var A;
              const g = "reload_panels", x = () => {
                R(!0), window.setTimeout(() => R(!1), 2e3);
              };
              try {
                (A = navigator.clipboard) == null || A.writeText(g).then(x, () => R(!1));
              } catch {
                R(!1);
              }
            },
            className: "self-start flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-[var(--surface,#1e1e1e)] border border-[var(--border,#333)] text-[var(--fg,#eee)] hover:border-[var(--accent,#6366f1)]",
            children: [
              E ? /* @__PURE__ */ e(te, { size: 13 }) : /* @__PURE__ */ e(be, { size: 13 }),
              E ? "Copied" : "Copy reload_panels"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ a(M, { children: [
      /* @__PURE__ */ a(I, { children: [
        "Named panels · ",
        c
      ] }),
      N && /* @__PURE__ */ e(Y, { meta: N }),
      (N == null ? void 0 : N.error) && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-1", children: N.error }),
      N && !N.exists && /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-2", children: [
        "No file at this scope yet — saving creates ",
        /* @__PURE__ */ e("code", { children: N.path }),
        "."
      ] }),
      l === null ? /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-2", children: [
        "Loading ",
        c,
        " panels…"
      ] }) : /* @__PURE__ */ a("div", { className: "mt-3 flex flex-col gap-3", children: [
        l.length === 0 && /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No panels defined at this scope. Add one below." }),
        l.map((g, x) => /* @__PURE__ */ e(
          Ge,
          {
            panel: g,
            meta: r,
            onChange: (A) => f(x, A),
            onDelete: () => s((A) => A && A.filter((F, G) => G !== x))
          },
          x
        )),
        /* @__PURE__ */ a(
          "button",
          {
            className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
            onClick: () => s((g) => [...g || [], Be()]),
            children: [
              /* @__PURE__ */ e(Z, { size: 14 }),
              " Add panel"
            ]
          }
        )
      ] })
    ] })
  ] });
}
const Ue = [
  { key: "label", label: "label", placeholder: "result key (default: the model)" },
  { key: "stance", label: "stance", placeholder: "for / against / neutral" },
  { key: "agent", label: "agent", placeholder: "kirocrew (default)" }
];
function Ye(t) {
  return {
    ...t,
    seats: (Array.isArray(t.seats) ? t.seats : []).map((r) => ({ ...r }))
  };
}
function Xe() {
  return {
    name: "",
    description: "",
    engine: "native",
    strategy: "all-voices",
    reduction: "",
    targets: 1,
    seats: [{ model: "" }]
  };
}
function Je(t) {
  return t.map((r) => ({
    name: r.name.trim(),
    description: (r.description || "").trim(),
    engine: "native",
    strategy: (r.strategy || "").trim(),
    reduction: (r.reduction || "").trim(),
    targets: (r.seats || []).length,
    seats: (r.seats || []).map((n) => {
      const c = { model: String(n.model || "").trim() };
      return n.role && String(n.role).trim() && (c.role = String(n.role).trim()), n.label && String(n.label).trim() && (c.label = String(n.label).trim()), n.stance && String(n.stance).trim() && (c.stance = String(n.stance).trim()), n.agent && String(n.agent).trim() && (c.agent = String(n.agent).trim()), n.weight !== void 0 && n.weight !== null && String(n.weight).trim() !== "" && (c.weight = Number(n.weight)), n.parity === !0 && (c.parity = !0), c;
    })
  }));
}
function Ze({
  seat: t,
  meta: r,
  index: n,
  onChange: c,
  onRemove: u
}) {
  const l = (i, h) => c({ ...t, [i]: h }), s = Array.isArray(r == null ? void 0 : r.native_models) ? r.native_models : [], m = Array.isArray(r == null ? void 0 : r.native_roles) ? r.native_roles : [];
  return /* @__PURE__ */ a("div", { className: "p-2.5 rounded bg-[var(--surface-3,#232323)] border border-[var(--border,#2a2a2a)]", children: [
    /* @__PURE__ */ a("div", { className: "grid gap-2 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]", children: [
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ a("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: [
          "model",
          /* @__PURE__ */ e("span", { className: "text-amber-500", children: " *" })
        ] }),
        /* @__PURE__ */ e(
          fe,
          {
            value: t.model != null ? String(t.model) : "",
            options: s,
            freeText: !0,
            listId: `nseat-model-${n}`,
            placeholder: "Kiro model (required)",
            onChange: (i) => l("model", i)
          }
        )
      ] }),
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "role" }),
        /* @__PURE__ */ a(
          "select",
          {
            className: $,
            value: t.role != null ? String(t.role) : "",
            onChange: (i) => l("role", i.target.value),
            children: [
              /* @__PURE__ */ e("option", { value: "", children: "(none)" }),
              t.role && !m.includes(String(t.role)) && /* @__PURE__ */ e("option", { value: String(t.role), children: String(t.role) }),
              m.map((i) => /* @__PURE__ */ e("option", { value: i, children: i }, i))
            ]
          }
        )
      ] }),
      Ue.map((i) => /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: i.label }),
        /* @__PURE__ */ e(
          "input",
          {
            className: $,
            value: t[i.key] != null ? String(t[i.key]) : "",
            placeholder: i.placeholder,
            onChange: (h) => l(i.key, h.target.value)
          }
        )
      ] }, i.key)),
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "weight" }),
        /* @__PURE__ */ e(
          "input",
          {
            className: $,
            type: "number",
            value: t.weight != null ? String(t.weight) : "",
            placeholder: "—",
            onChange: (i) => {
              const h = i.target.value.trim(), y = { ...t };
              h === "" ? delete y.weight : y.weight = Number(h), c(y);
            }
          }
        )
      ] }),
      /* @__PURE__ */ a("div", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "parity" }),
        /* @__PURE__ */ e("span", { className: "mt-0.5", children: /* @__PURE__ */ e(
          ie,
          {
            value: t.parity === !0,
            srLabel: "Parity counterweight seat",
            onChange: (i) => {
              const h = { ...t };
              i ? h.parity = !0 : delete h.parity, c(h);
            }
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ a(
      "button",
      {
        className: "mt-1.5 flex items-center gap-1 text-[11px] text-muted hover:text-amber-500",
        onClick: u,
        title: "Remove seat",
        children: [
          /* @__PURE__ */ e(le, { size: 12 }),
          " Remove seat"
        ]
      }
    )
  ] });
}
function Qe({
  panel: t,
  meta: r,
  onChange: n,
  onDelete: c
}) {
  const [u, l] = S(!1), s = Array.isArray(t.seats) ? t.seats : [], m = Array.isArray(r == null ? void 0 : r.strategies) && r.strategies.length ? r.strategies : ve;
  return /* @__PURE__ */ a("div", { className: "p-3 rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)]", children: [
    /* @__PURE__ */ a("div", { className: "grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]", children: [
      /* @__PURE__ */ e(K, { label: "Name", hint: "panel key", required: !0, children: /* @__PURE__ */ e(
        "input",
        {
          className: $,
          value: t.name,
          placeholder: "panel-name",
          onChange: (i) => n({ ...t, name: i.target.value })
        }
      ) }),
      /* @__PURE__ */ e(
        K,
        {
          label: "Strategy",
          hint: "strategy",
          help: "How the native panel's voices are reduced. all-voices returns every voice; the rest collapse to one verdict (unanimous, majority, plurality, weighted, parity-pair, rank).",
          children: /* @__PURE__ */ a(
            "select",
            {
              className: $,
              value: t.strategy || "all-voices",
              onChange: (i) => n({ ...t, strategy: i.target.value }),
              children: [
                t.strategy && !m.includes(t.strategy) && /* @__PURE__ */ e("option", { value: t.strategy, children: t.strategy }),
                m.map((i) => /* @__PURE__ */ e("option", { value: i, children: i }, i))
              ]
            }
          )
        }
      )
    ] }),
    /* @__PURE__ */ a("div", { className: "mt-2.5 grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]", children: [
      /* @__PURE__ */ e(K, { label: "Description", hint: "description", children: /* @__PURE__ */ e(
        "input",
        {
          className: $,
          value: t.description || "",
          placeholder: "Human label for this panel",
          onChange: (i) => n({ ...t, description: i.target.value })
        }
      ) }),
      /* @__PURE__ */ e(
        K,
        {
          label: "Reduction",
          hint: "reduction",
          help: "Optional free-text note steering how the skill reduces/reports (a synthesis hint). Advisory — the strategy drives the vote math.",
          children: /* @__PURE__ */ e(
            "input",
            {
              className: $,
              value: t.reduction || "",
              placeholder: "optional synthesis hint",
              onChange: (i) => n({ ...t, reduction: i.target.value })
            }
          )
        }
      )
    ] }),
    /* @__PURE__ */ a("p", { className: "text-[11px] text-muted mt-1.5", children: [
      /* @__PURE__ */ e("code", { children: "engine" }),
      " is fixed to ",
      /* @__PURE__ */ e("code", { children: "native" }),
      " for every panel here — that is what routes it through Kiro ",
      /* @__PURE__ */ e("code", { children: "spawn_run" }),
      " instead of an external ACP agent."
    ] }),
    /* @__PURE__ */ a("div", { className: "mt-3", children: [
      /* @__PURE__ */ e("div", { className: "flex items-center gap-2 mb-1.5", children: /* @__PURE__ */ a("span", { className: "text-xs font-medium text-[var(--fg,#eee)]", children: [
        "Seats ",
        /* @__PURE__ */ a("span", { className: "text-muted", children: [
          "(",
          s.length,
          ")"
        ] })
      ] }) }),
      /* @__PURE__ */ a("div", { className: "flex flex-col gap-2", children: [
        s.map((i, h) => /* @__PURE__ */ e(
          Ze,
          {
            seat: i,
            meta: r,
            index: h,
            onChange: (y) => {
              const o = s.slice();
              o[h] = y, n({ ...t, seats: o });
            },
            onRemove: () => n({ ...t, seats: s.filter((y, o) => o !== h) })
          },
          h
        )),
        /* @__PURE__ */ a(
          "button",
          {
            className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
            onClick: () => n({ ...t, seats: [...s, { model: "" }] }),
            children: [
              /* @__PURE__ */ e(Z, { size: 14 }),
              " Add seat"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "mt-3 pt-2.5 border-t border-[var(--border,#2a2a2a)] flex items-center", children: u ? /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-xs", children: [
      /* @__PURE__ */ a("span", { className: "text-amber-500", children: [
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
    ] }) : /* @__PURE__ */ a(
      "button",
      {
        className: "flex items-center gap-1.5 text-xs text-muted hover:text-amber-500",
        onClick: () => l(!0),
        children: [
          /* @__PURE__ */ e(he, { size: 13 }),
          " Delete panel"
        ]
      }
    ) })
  ] });
}
function et({
  nativePanels: t,
  meta: r,
  onSave: n
}) {
  const [c, u] = S("global"), [l, s] = S(null), [m, i] = S(!1), [h, y] = S(null), [o, _] = S(null), R = (Array.isArray(t == null ? void 0 : t.sources) ? t.sources : []).find((w) => w.scope === c) || null, V = JSON.stringify((R == null ? void 0 : R.panels) ?? null) + "|" + c, N = String((r == null ? void 0 : r.native_models_source) || "");
  ee(() => {
    if (!R) {
      s(null);
      return;
    }
    y(null), s((R.panels || []).map(Ye));
  }, [V]);
  const U = (w, g) => s((x) => x && x.map((A, F) => F === w ? g : A)), f = () => {
    if (!l) return null;
    const w = /* @__PURE__ */ new Set();
    for (const g of l) {
      const x = g.name.trim();
      if (!x) return "Every panel needs a name.";
      if (w.has(x)) return `Duplicate panel name “${x}”.`;
      w.add(x);
      const A = Array.isArray(g.seats) ? g.seats : [];
      if (A.length === 0) return `Panel “${x}” needs at least one seat.`;
      if (A.some((F) => !String(F.model || "").trim()))
        return `Panel “${x}” has a seat missing a model (a native seat's model is required).`;
    }
    return null;
  }, d = async () => {
    if (!l) return;
    const w = f();
    if (w) {
      y({ ok: !1, text: w });
      return;
    }
    i(!0), y(null), _(null);
    try {
      await n(c, Je(l)), y({ ok: !0, text: `Saved to ${c} native-panels.toon (backup written).` }), _(c);
    } catch (g) {
      y({ ok: !1, text: g instanceof Error ? g.message : String(g) });
    } finally {
      i(!1);
    }
  };
  return /* @__PURE__ */ a(H, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((w) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => {
            _(null), u(w);
          },
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (c === w ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: w === "global" ? "Global" : "Workspace"
        },
        w
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: () => void d(),
          disabled: m || !l,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(se, { size: 14 }),
            " ",
            m ? "Saving…" : `Save ${c}`
          ]
        }
      )
    ] }),
    /* @__PURE__ */ a("div", { className: "flex items-start gap-2 text-sm mb-4 rounded border border-[var(--border,#333)] bg-[var(--surface-2,#2a2a2a)] px-3 py-2.5", children: [
      /* @__PURE__ */ e(re, { size: 15, className: "mt-0.5 shrink-0 text-[var(--accent,#6366f1)]" }),
      /* @__PURE__ */ a("div", { className: "flex flex-col gap-1.5", children: [
        /* @__PURE__ */ a("span", { className: "text-[var(--fg,#eee)]", children: [
          "Native panels run entirely inside Kiro Crew — every seat is a",
          " ",
          /* @__PURE__ */ e("code", { children: "spawn_run" }),
          " at its ",
          /* @__PURE__ */ e("code", { children: "model" }),
          ", aggregated by the",
          " ",
          /* @__PURE__ */ e("code", { children: "native-panel" }),
          " skill. No external ACP agent launches."
        ] }),
        /* @__PURE__ */ a("span", { className: "text-xs text-muted", children: [
          /* @__PURE__ */ e("code", { children: "min_quorum" }),
          ", ",
          /* @__PURE__ */ e("code", { children: "require_dissent" }),
          ", ",
          /* @__PURE__ */ e("code", { children: "synthesize" }),
          ", and",
          " ",
          /* @__PURE__ */ e("code", { children: "track_convergence" }),
          " are RUN-TIME options passed when you run the panel — not stored here — so they are not editable fields."
        ] }),
        N && /* @__PURE__ */ a("span", { className: "text-xs text-muted", children: [
          "Model list: ",
          N,
          ". Type any Kiro-spawnable model; it is validated at run time."
        ] })
      ] })
    ] }),
    h && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (h.ok ? "text-green-500" : "text-amber-500"),
        children: [
          h.ok ? /* @__PURE__ */ e(te, { size: 15 }) : /* @__PURE__ */ e(Q, { size: 15 }),
          h.text
        ]
      }
    ),
    o === c && /* @__PURE__ */ a("div", { className: "flex items-start gap-2 text-sm mb-4 rounded border border-[var(--border,#333)] bg-[var(--surface-2,#2a2a2a)] px-3 py-2.5", children: [
      /* @__PURE__ */ e(re, { size: 15, className: "mt-0.5 shrink-0 text-[var(--accent,#6366f1)]" }),
      /* @__PURE__ */ a("span", { className: "text-[var(--fg,#eee)]", children: [
        "Written to disk. Unlike ACP panels, there is no running server to reload — the",
        " ",
        /* @__PURE__ */ e("code", { children: "native-panel" }),
        " skill reads ",
        /* @__PURE__ */ e("code", { children: "native-panels.toon" }),
        " fresh on its next run, so your change takes effect the next time you run a native panel."
      ] })
    ] }),
    /* @__PURE__ */ a(M, { children: [
      /* @__PURE__ */ a(I, { children: [
        "Native panels · ",
        c
      ] }),
      R && /* @__PURE__ */ e(Y, { meta: R }),
      (R == null ? void 0 : R.error) && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-1", children: R.error }),
      R && !R.exists && /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-2", children: [
        "No file at this scope yet — saving creates ",
        /* @__PURE__ */ e("code", { children: R.path }),
        "."
      ] }),
      l === null ? /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-2", children: t ? `Loading ${c} native panels…` : "Native panels route unavailable." }) : /* @__PURE__ */ a("div", { className: "mt-3 flex flex-col gap-3", children: [
        l.length === 0 && /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No native panels defined at this scope. Add one below." }),
        l.map((w, g) => /* @__PURE__ */ e(
          Qe,
          {
            panel: w,
            meta: r,
            onChange: (x) => U(g, x),
            onDelete: () => s((x) => x && x.filter((A, F) => F !== g))
          },
          g
        )),
        /* @__PURE__ */ a(
          "button",
          {
            className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
            onClick: () => s((w) => [...w || [], Xe()]),
            children: [
              /* @__PURE__ */ e(Z, { size: 14 }),
              " Add native panel"
            ]
          }
        )
      ] })
    ] })
  ] });
}
function tt() {
  return { name: "", display_name: "", description: "", body: "", extra: {}, _new: !0 };
}
function at({
  roles: t,
  meta: r,
  onFetchRole: n,
  onSave: c
}) {
  const [u, l] = S("global"), [s, m] = S(null), [i, h] = S(null), [y, o] = S(!1), [_, E] = S(null), [R, V] = S(!1), [N, U] = S(null), f = Array.isArray(t == null ? void 0 : t.sources) ? t.sources : [], d = f.find((p) => p.scope === u && p.editable !== !1) || null, w = Array.isArray(d == null ? void 0 : d.roles) ? d.roles : [], g = Array.isArray(r == null ? void 0 : r.roles_builtin) && r.roles_builtin.length ? r.roles_builtin : Array.isArray(t == null ? void 0 : t.builtin) ? t.builtin.map((p) => p.name) : [], x = f.filter((p) => p.editable === !1), A = async (p) => {
    U(p), E(null), V(!1);
    const k = await n(u, p);
    if (U(null), !k) {
      E({ ok: !1, text: `Could not open role “${p}”.` });
      return;
    }
    m({ ...k, extra: k.extra || {} }), h(p);
  }, F = () => {
    E(null), V(!1), m(tt()), h(null);
  }, G = () => {
    m(null), h(null), V(!1);
  }, oe = () => {
    if (!s) return null;
    const p = s.name.trim();
    return p ? /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(p) ? g.includes(p) ? `“${p}” is a built-in role (read-only reference). Choose a different id.` : null : "Role name must be a kebab-case id (letters, digits, . _ -), no path separators." : "Role name is required.";
  }, ce = async () => {
    if (!s) return;
    const p = oe();
    if (p) {
      E({ ok: !1, text: p });
      return;
    }
    o(!0), E(null);
    try {
      const k = s.name.trim();
      if (await c(u, {
        name: k,
        display_name: s.display_name || "",
        description: s.description || "",
        body: s.body || "",
        extra: s.extra || {}
      }), i && i !== k)
        try {
          await c(u, { name: i, op: "delete" });
        } catch {
        }
      E({ ok: !0, text: `Saved role “${k}” to ${u} (backup written).` }), h(k), m((b) => b && { ...b, _new: !1 });
    } catch (k) {
      E({ ok: !1, text: k instanceof Error ? k.message : String(k) });
    } finally {
      o(!1);
    }
  }, de = async () => {
    if (!(!s || !i)) {
      o(!0), E(null);
      try {
        await c(u, { name: i, op: "delete" }), E({ ok: !0, text: `Deleted role “${i}” from ${u} (backup written).` }), G();
      } catch (p) {
        E({ ok: !1, text: p instanceof Error ? p.message : String(p) });
      } finally {
        o(!1);
      }
    }
  };
  return /* @__PURE__ */ a(H, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((p) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => {
            l(p), G(), E(null);
          },
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (u === p ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: p === "global" ? "Global" : "Workspace"
        },
        p
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: F,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white",
          children: [
            /* @__PURE__ */ e(Z, { size: 14 }),
            " New role"
          ]
        }
      )
    ] }),
    _ && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (_.ok ? "text-green-500" : "text-amber-500"),
        children: [
          _.ok ? /* @__PURE__ */ e(te, { size: 15 }) : /* @__PURE__ */ e(Q, { size: 15 }),
          _.text
        ]
      }
    ),
    s && /* @__PURE__ */ a(H, { children: [
      /* @__PURE__ */ a(M, { children: [
        /* @__PURE__ */ e(I, { children: /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-1.5", children: [
          /* @__PURE__ */ e(ge, { size: 14 }),
          " ",
          s._new ? "New role" : `Edit role · ${i}`,
          " · ",
          u
        ] }) }),
        d && /* @__PURE__ */ e(Y, { meta: d }),
        /* @__PURE__ */ a("div", { className: "grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            K,
            {
              label: "Role id (file name)",
              hint: "<id>.md",
              help: "The role's id and file stem. Kebab-case: letters, digits, . _ - — no path separators. Referenced from a panel seat's role field.",
              required: !0,
              children: /* @__PURE__ */ e(
                "input",
                {
                  className: $,
                  value: s.name,
                  placeholder: "my-reviewer",
                  onChange: (p) => m((k) => k && { ...k, name: p.target.value })
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            K,
            {
              label: "Display name",
              hint: "display_name",
              help: "Optional human-friendly name shown in listings.",
              required: !1,
              children: /* @__PURE__ */ e(
                "input",
                {
                  className: $,
                  value: s.display_name,
                  placeholder: "My Reviewer",
                  onChange: (p) => m((k) => k && { ...k, display_name: p.target.value })
                }
              )
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "mt-2.5", children: /* @__PURE__ */ e(
          K,
          {
            label: "Description",
            hint: "description",
            help: "One-line summary of what this persona is for.",
            required: !1,
            children: /* @__PURE__ */ e(
              "input",
              {
                className: $,
                value: s.description,
                placeholder: "Short description of this persona",
                onChange: (p) => m((k) => k && { ...k, description: p.target.value })
              }
            )
          }
        ) }),
        /* @__PURE__ */ e("div", { className: "mt-2.5", children: /* @__PURE__ */ e(
          K,
          {
            label: "System prompt (body)",
            hint: "markdown body",
            help: "The persona's system prompt, prepended to the task. This is the file body below the frontmatter.",
            required: !0,
            children: /* @__PURE__ */ e(
              "textarea",
              {
                className: $ + " min-h-[220px] font-mono text-[12px] leading-relaxed",
                value: s.body,
                placeholder: "You are a principal-level reviewer. …",
                onChange: (p) => m((k) => k && { ...k, body: p.target.value })
              }
            )
          }
        ) }),
        s.extra && Object.keys(s.extra).length > 0 && /* @__PURE__ */ a("p", { className: "text-[10px] text-muted mt-2", children: [
          "preserved frontmatter:",
          " ",
          Object.entries(s.extra).map(([p, k]) => /* @__PURE__ */ a("code", { className: "mr-1.5", children: [
            p,
            "=",
            String(k)
          ] }, p))
        ] }),
        /* @__PURE__ */ a("div", { className: "mt-3 pt-2.5 border-t border-[var(--border,#2a2a2a)] flex items-center gap-2", children: [
          /* @__PURE__ */ a(
            "button",
            {
              onClick: () => void ce(),
              disabled: y,
              className: "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
              children: [
                /* @__PURE__ */ e(se, { size: 14 }),
                " ",
                y ? "Saving…" : `Save to ${u}`
              ]
            }
          ),
          /* @__PURE__ */ e(
            "button",
            {
              onClick: G,
              className: "px-3 py-1.5 text-sm rounded text-muted hover:text-[var(--fg,#eee)]",
              children: "Close"
            }
          ),
          i && !s._new && /* @__PURE__ */ e("div", { className: "ml-auto flex items-center", children: R ? /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-xs", children: [
            /* @__PURE__ */ a("span", { className: "text-amber-500", children: [
              "Delete “",
              i,
              "”?"
            ] }),
            /* @__PURE__ */ e(
              "button",
              {
                className: "px-2 py-0.5 rounded bg-amber-600/80 text-white hover:bg-amber-600 disabled:opacity-50",
                disabled: y,
                onClick: () => void de(),
                children: "Delete"
              }
            ),
            /* @__PURE__ */ e(
              "button",
              {
                className: "px-2 py-0.5 rounded text-muted hover:text-[var(--fg,#eee)]",
                onClick: () => V(!1),
                children: "Cancel"
              }
            )
          ] }) : /* @__PURE__ */ a(
            "button",
            {
              className: "flex items-center gap-1.5 text-xs text-muted hover:text-amber-500",
              onClick: () => V(!0),
              children: [
                /* @__PURE__ */ e(he, { size: 13 }),
                " Delete role"
              ]
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" })
    ] }),
    /* @__PURE__ */ a(M, { children: [
      /* @__PURE__ */ e(I, { children: /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(Ee, { size: 14 }),
        " Role files · ",
        u,
        " (editable)"
      ] }) }),
      d ? /* @__PURE__ */ e(Y, { meta: d }) : /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-1", children: [
        "No editable roles directory resolved for ",
        u,
        "."
      ] }),
      (d == null ? void 0 : d.error) && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-1", children: d.error }),
      d && !d.exists && /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-2", children: [
        "No roles directory at this scope yet — saving a role creates ",
        /* @__PURE__ */ e("code", { children: d.path }),
        "."
      ] }),
      w.length === 0 ? /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-2", children: [
        "No role files at this scope. Click ",
        /* @__PURE__ */ e("strong", { children: "New role" }),
        " to add one."
      ] }) : /* @__PURE__ */ e("div", { className: "mt-3 flex flex-col gap-1.5", children: w.map((p) => /* @__PURE__ */ a(
        "div",
        {
          className: "flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]",
          children: [
            /* @__PURE__ */ e("span", { className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-3,#2a2a2a)] text-[var(--fg,#eee)]", children: p.name }),
            p.description && /* @__PURE__ */ e("span", { className: "text-xs text-muted truncate flex-1", children: p.description }),
            p.error && /* @__PURE__ */ e("span", { className: "text-xs text-amber-500", children: p.error }),
            /* @__PURE__ */ a(
              "button",
              {
                className: "ml-auto flex items-center gap-1 text-xs text-muted hover:text-[var(--accent,#6366f1)]",
                onClick: () => void A(p.name),
                disabled: N === p.name,
                children: [
                  /* @__PURE__ */ e(ge, { size: 12 }),
                  " ",
                  N === p.name ? "Opening…" : "Edit"
                ]
              }
            )
          ]
        },
        p.path || p.name
      )) })
    ] }),
    g.length > 0 && /* @__PURE__ */ a(H, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(M, { children: [
        /* @__PURE__ */ e(I, { children: "Built-in personas (read-only reference)" }),
        /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-1", children: [
          "These ship in the Rutherford server (not files) and cannot be edited here. Reference them from a panel seat's ",
          /* @__PURE__ */ e("code", { children: "role" }),
          " field."
        ] }),
        /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: g.map((p) => /* @__PURE__ */ e(
          "span",
          {
            className: "px-2 py-1 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-muted",
            title: "Built-in persona — read-only",
            children: p
          },
          p
        )) })
      ] })
    ] }),
    x.map(
      (p) => Array.isArray(p.roles) && p.roles.length > 0 ? /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ e("div", { className: "h-3" }),
        /* @__PURE__ */ a(M, { children: [
          /* @__PURE__ */ a(I, { children: [
            "Role files · ",
            p.scope,
            " (read-only)"
          ] }),
          /* @__PURE__ */ e(Y, { meta: p }),
          /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: p.roles.map((k) => /* @__PURE__ */ e(
            "span",
            {
              className: "px-2 py-1 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-muted",
              title: k.path,
              children: k.name
            },
            k.path || k.name
          )) })
        ] })
      ] }, p.path) : null
    )
  ] });
}
export {
  ot as default
};
