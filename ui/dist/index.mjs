import { jsxs as a, Fragment as G, jsx as e } from "react/jsx-runtime";
import { useAppApi as Se } from "@kirocrew/app-sdk";
import { PageHeader as Ae, Card as W, CardTitle as U, StatCard as le } from "@kirocrew/app-sdk/ui";
import { useState as w, useRef as Ce, useCallback as Z, useEffect as ne } from "react";
import Re from "lucide-react";
const {
  Box: $e,
  FileCog: ze,
  Layers: Te,
  UserSquare: Ee,
  RefreshCw: ye,
  AlertTriangle: te,
  Save: ce,
  Plus: ae,
  X: de,
  CheckCircle2: se,
  Server: De,
  Trash2: fe,
  Info: ie,
  Pencil: ge,
  FileText: je,
  Cpu: qe
} = Re, O = "/api/apps/rutherford", Pe = [
  { id: "status", label: "Overview", icon: $e },
  { id: "config", label: "Config", icon: ze },
  { id: "panels", label: "Panels", icon: Te },
  { id: "native", label: "Native Panels", icon: qe },
  { id: "roles", label: "Roles", icon: Ee }
], Le = ["read_only", "propose", "write", "yolo"], Oe = ["ephemeral", "job"], Ne = [
  "all-voices",
  "unanimous",
  "majority",
  "plurality",
  "weighted",
  "parity-pair",
  "rank"
];
function _e(t) {
  const r = String((t == null ? void 0 : t.agent_ids_source) || "").toLowerCase();
  return r ? /fallback|no backend mcp|config-derived|unresolved|builtin/.test(r) : !0;
}
function X({ meta: t }) {
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
function mt() {
  const t = Se(), [r, i] = w("status"), [o, u] = w(!0), [l, s] = w(null), [m, c] = w(null), [g, v] = w(null), [n, x] = w("global"), [A, M] = w(null), [P, f] = w(null), [H, h] = w(null), [d, j] = w(null), y = Ce("global"), k = Z(
    async (b) => {
      y.current = b;
      try {
        const C = await t.get(`${O}/rutherford-config?scope=${b}`);
        if (y.current !== b) return;
        if (!C || typeof C != "object") {
          s(`No config returned for ${b} scope.`);
          return;
        }
        M({ ...C, scope: b }), s(null);
      } catch (C) {
        if (y.current !== b) return;
        s(C instanceof Error ? C.message : String(C));
      }
    },
    [t]
  ), z = Z(async () => {
    u(!0), s(null);
    try {
      const [b, C, q, F, K] = await Promise.all([
        // Meta is best-effort: catch so a meta failure degrades dropdowns to
        // free text but never fails the whole load.
        t.get(`${O}/rutherford-meta`).catch(() => null),
        t.get(`${O}/status`),
        t.get(`${O}/panels`),
        // Native panels (v3.0.0) — best-effort so an older backend without the
        // route degrades to an empty Native Panels tab instead of failing the load.
        t.get(`${O}/rutherford-native-panels`).catch(() => null),
        // FIX: roles are served at /rutherford-roles (GET+PUT share that base);
        // the old bare /roles path 404s.
        t.get(`${O}/rutherford-roles`)
      ]);
      b && typeof b == "object" && !b.error ? c(b) : c(null), v(C), f(q), F && typeof F == "object" && !F.error ? h(F) : h(null), j(K);
    } catch (b) {
      s(b instanceof Error ? b.message : String(b));
    } finally {
      u(!1);
    }
  }, [t]);
  ne(() => {
    z();
  }, [z]), ne(() => {
    k(n);
  }, [k, n]);
  const _ = Z((b) => {
    x(b);
  }, []), $ = (b) => !!b && typeof b == "object" && b.written === !0, L = Z(
    async (b, C) => {
      const q = `${O}/rutherford-config?scope=${b}`;
      let F = await t.put(q, C);
      $(F) || (await new Promise((D) => setTimeout(D, 600)), F = await t.put(q, C));
      let K = $(F) ? F : null;
      if (!K) {
        const D = await t.get(q);
        if (D && typeof D == "object") {
          const R = D;
          Ke(C, R.config) && (K = R);
        }
      }
      if (!K)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your entered values were kept; try Save again."
        );
      const B = K.scope ?? y.current;
      y.current = B, M({ ...K, scope: B });
      try {
        const D = await t.get(`${O}/status`);
        D && typeof D == "object" && v(D);
      } catch {
      }
      return K;
    },
    [t]
  ), Y = Z(
    async (b, C) => {
      var R;
      const q = `${O}/rutherford-panels?scope=${b}`, F = { panels: C }, K = (S) => !!S && typeof S == "object" && S.written === !0;
      let B = await t.put(q, F);
      K(B) || (await new Promise((S) => setTimeout(S, 600)), B = await t.put(q, F));
      let D = K(B) ? B : null;
      if (!D) {
        const S = await t.get(`${O}/panels`), E = (R = S == null ? void 0 : S.sources) == null ? void 0 : R.find((I) => I.scope === b);
        if (E) {
          const I = C.map((ee) => ee.name).sort(), Q = (Array.isArray(E.panels) ? E.panels : []).map((ee) => ee.name).sort();
          I.length === Q.length && I.every((ee, ke) => ee === Q[ke]) && (D = { ...E, written: !0 });
        }
      }
      if (!D)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your edits were kept; try Save again."
        );
      try {
        const S = await t.get(`${O}/panels`);
        S && typeof S == "object" && f(S);
      } catch {
      }
      return D;
    },
    [t]
  ), J = Z(
    async (b, C) => {
      var S;
      const q = `${O}/rutherford-native-panels?scope=${encodeURIComponent(b)}`, F = { panels: C }, K = (E) => !!E && typeof E == "object" && E.written === !0, B = (E) => K(E) && ve(
        C,
        Array.isArray(E.panels) ? E.panels : []
      );
      let D = await t.put(q, F);
      B(D) || (await new Promise((E) => setTimeout(E, 600)), D = await t.put(q, F));
      let R = B(D) ? D : null;
      if (!R) {
        const E = await t.get(`${O}/rutherford-native-panels`), I = (S = E == null ? void 0 : E.sources) == null ? void 0 : S.find((Q) => Q.scope === b);
        I && ve(C, Array.isArray(I.panels) ? I.panels : []) && (R = { ...I, written: !0 });
      }
      if (!R)
        throw new Error(
          "Save could not be confirmed — the file on disk does not match what you saved. The backend may have rejected the panel (a validation error) or a transient auth refresh dropped the write. Your edits were kept; fix any reported error and Save again."
        );
      try {
        const E = await t.get(`${O}/rutherford-native-panels`);
        E && typeof E == "object" && h(E);
      } catch {
      }
      return R;
    },
    [t]
  ), p = Z(
    async (b, C) => {
      try {
        const q = await t.get(
          `${O}/rutherford-roles?scope=${b}&name=${encodeURIComponent(C)}`
        );
        return q && typeof q == "object" && q.role && typeof q.role == "object" ? q.role : null;
      } catch {
        return null;
      }
    },
    [t]
  ), N = Z(
    async (b, C) => {
      const q = `${O}/rutherford-roles?scope=${b}`, F = (R) => !!R && typeof R == "object" && R.written === !0, K = C.op === "delete";
      let B = await t.put(q, C);
      F(B) || (await new Promise((R) => setTimeout(R, 600)), B = await t.put(q, C));
      let D = F(B) ? B : null;
      if (!D)
        if (K) {
          let R = !1;
          try {
            const S = await t.get(
              `${O}/rutherford-roles?scope=${b}&name=${encodeURIComponent(C.name)}`
            );
            S && typeof S == "object" && S.exists === !1 && (R = !0);
          } catch {
          }
          if (!R)
            try {
              const S = await t.get(`${O}/rutherford-roles`), E = Array.isArray(S == null ? void 0 : S.sources) ? S.sources : null, I = E ? E.find((Q) => Q.scope === b) : void 0;
              I && !I.error && Array.isArray(I.roles) && (I.roles.some((ee) => ee.name === C.name) || (R = !0));
            } catch {
            }
          R && (D = { scope: b, path: "", platform: "", written: !0, deleted: !0 });
        } else {
          const R = await t.get(`${O}/rutherford-roles`), S = (Array.isArray(R == null ? void 0 : R.sources) ? R.sources : []).find(
            (I) => I.scope === b
          );
          (Array.isArray(S == null ? void 0 : S.roles) ? S.roles : []).some(
            (I) => I.name === C.name
          ) && (D = { scope: b, path: (S == null ? void 0 : S.path) ?? "", platform: "", written: !0 });
        }
      if (!D)
        throw new Error(
          K ? "Delete could not be confirmed — the role file may still exist (a non-404 error, empty response, or unreachable server). Nothing was closed; your draft was kept. Try Delete again." : "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your edits were kept; try Save again."
        );
      try {
        const R = await t.get(`${O}/rutherford-roles`);
        R && typeof R == "object" && j(R);
      } catch {
      }
      return D;
    },
    [t]
  );
  return /* @__PURE__ */ a(G, { children: [
    /* @__PURE__ */ e(Ae, { title: "Rutherford", subtitle: "Config, panels & roles — config.toml / panels.toon / role files" }),
    /* @__PURE__ */ a("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ a("div", { className: "flex gap-1 mb-5 border-b border-[var(--border,#2a2a2a)]", children: [
        Pe.map(({ id: b, label: C, icon: q }) => /* @__PURE__ */ a(
          "button",
          {
            onClick: () => i(b),
            className: "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors " + (r === b ? "border-[var(--accent,#6366f1)] text-[var(--fg,#eee)]" : "border-transparent text-muted hover:text-[var(--fg,#eee)]"),
            children: [
              /* @__PURE__ */ e(q, { size: 15 }),
              C
            ]
          },
          b
        )),
        /* @__PURE__ */ e(
          "button",
          {
            onClick: () => void z(),
            className: "ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-[var(--fg,#eee)]",
            title: "Reload",
            children: /* @__PURE__ */ e(ye, { size: 15, className: o ? "animate-spin" : "" })
          }
        )
      ] }),
      l && /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-sm text-amber-500 mb-4", children: [
        /* @__PURE__ */ e(te, { size: 15 }),
        " ",
        l
      ] }),
      o && !g ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "Loading…" }) : /* @__PURE__ */ a(G, { children: [
        r === "status" && /* @__PURE__ */ e(Me, { status: g }),
        r === "config" && /* @__PURE__ */ e(
          We,
          {
            config: A,
            meta: m,
            scope: n,
            onScope: _,
            onSave: L
          }
        ),
        r === "panels" && /* @__PURE__ */ e(Je, { panels: P, meta: m, onSave: Y }),
        r === "native" && /* @__PURE__ */ e(nt, { nativePanels: H, meta: m, onSave: J }),
        r === "roles" && /* @__PURE__ */ e(lt, { roles: d, meta: m, onFetchRole: p, onSave: N })
      ] })
    ] })
  ] });
}
function Me({ status: t }) {
  var c, g, v;
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No status." });
  const r = t.agents || { enabled: [], enabled_source: "", allowlist_configured: !1, roster: [] }, i = Array.isArray(r.enabled) ? r.enabled : [], o = Array.isArray(r.roster) ? r.roster : [], u = Array.isArray(t.acp) ? t.acp : [], l = t.defaults || {}, s = r.allowlist_configured ? String(i.length) : "All", m = Object.keys(t.env_overrides || {}).filter((n) => n !== "_note");
  return /* @__PURE__ */ a(G, { children: [
    /* @__PURE__ */ a(W, { children: [
      /* @__PURE__ */ e(U, { children: "What is Rutherford?" }),
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
      /* @__PURE__ */ e(le, { label: "Platform", value: t.platform }),
      /* @__PURE__ */ e(le, { label: "Agents enabled", value: s, accent: !0 }),
      /* @__PURE__ */ e(le, { label: "Safety mode", value: l.safety_mode ?? "read_only" }),
      /* @__PURE__ */ e(
        le,
        {
          label: "Local model detect",
          value: l.auto_detect_local_models ? "on" : "off"
        }
      )
    ] }),
    /* @__PURE__ */ a(W, { children: [
      /* @__PURE__ */ e(U, { children: "Resolved roster" }),
      o.length > 0 ? /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1.5", children: o.map((n) => /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ e("span", { className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]", children: n.id }),
        /* @__PURE__ */ e("span", { className: "text-muted text-xs", children: n.default_model ?? "(agent default)" }),
        /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-auto", children: n.source })
      ] }, n.id)) }) : r.allowlist_configured ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-2", children: i.map((n) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          children: n
        },
        n
      )) }) : /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-1", children: [
        "No ",
        /* @__PURE__ */ e("code", { children: "enabled_agents" }),
        " allowlist configured — Rutherford enables every built-in agent plus any configured agent (source: ",
        r.enabled_source || "default",
        ")."
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a(W, { children: [
      /* @__PURE__ */ e(U, { children: "Config locations" }),
      ((c = t.config_locations) == null ? void 0 : c.global) && /* @__PURE__ */ e(X, { meta: t.config_locations.global }),
      ((g = t.config_locations) == null ? void 0 : g.workspace) && /* @__PURE__ */ e(X, { meta: t.config_locations.workspace })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a(W, { children: [
      /* @__PURE__ */ e(U, { children: /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(De, { size: 14 }),
        " acp.json (agent servers)"
      ] }) }),
      u.map((n) => {
        const x = Object.keys(n.agent_servers || {});
        return /* @__PURE__ */ a("div", { className: "mt-2", children: [
          /* @__PURE__ */ e(X, { meta: n }),
          x.length > 0 && /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-1", children: x.map((A) => /* @__PURE__ */ e(
            "span",
            {
              className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
              children: A
            },
            A
          )) })
        ] }, n.path);
      })
    ] }),
    m.length > 0 && /* @__PURE__ */ a(G, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(W, { children: [
        /* @__PURE__ */ e(U, { children: "Environment overrides" }),
        /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1", children: m.map((n) => /* @__PURE__ */ a("div", { className: "text-xs", children: [
          /* @__PURE__ */ e("code", { children: n }),
          " = ",
          /* @__PURE__ */ e("code", { className: "text-muted", children: String((t.env_overrides || {})[n]) })
        ] }, n)) }),
        (t.env_overrides || {})._note && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-2", children: String((t.env_overrides || {})._note) })
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a(W, { children: [
      /* @__PURE__ */ e(U, { children: "Reachability" }),
      /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: ((v = t.reachability) == null ? void 0 : v.note) ?? "—" })
    ] })
  ] });
}
function ue({ text: t }) {
  return t ? /* @__PURE__ */ e(
    "span",
    {
      className: "inline-flex items-center justify-center align-middle ml-1 text-muted opacity-60 hover:opacity-100 cursor-help",
      title: t,
      "aria-label": t,
      role: "img",
      children: /* @__PURE__ */ e(ie, { size: 12 })
    }
  ) : null;
}
function we({ required: t }) {
  return t ? /* @__PURE__ */ e("span", { className: "text-amber-500 ml-1", title: "Required", children: "*" }) : /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-1.5", children: "optional" });
}
function V({
  label: t,
  hint: r,
  help: i,
  required: o,
  absent: u,
  children: l
}) {
  return /* @__PURE__ */ a("label", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ a("span", { className: "text-sm text-[var(--fg,#eee)] flex items-center flex-wrap", children: [
      t,
      r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r }),
      i && /* @__PURE__ */ e(ue, { text: i }),
      o !== void 0 && /* @__PURE__ */ e(we, { required: o })
    ] }),
    u && /* @__PURE__ */ a("span", { className: "text-[11px] text-muted -mt-0.5", children: [
      "absent → ",
      u
    ] }),
    l
  ] });
}
const T = "px-2 py-1.5 text-sm rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)] text-[var(--fg,#eee)] outline-none focus:border-[var(--accent,#6366f1)]";
function pe({
  label: t,
  hint: r,
  help: i,
  required: o,
  absent: u,
  values: l,
  onChange: s
}) {
  const [m, c] = w("");
  return /* @__PURE__ */ a("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ a("span", { className: "text-sm text-[var(--fg,#eee)] flex items-center flex-wrap", children: [
      t,
      r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r }),
      i && /* @__PURE__ */ e(ue, { text: i }),
      o !== void 0 && /* @__PURE__ */ e(we, { required: o })
    ] }),
    u && /* @__PURE__ */ a("span", { className: "text-[11px] text-muted -mt-0.5", children: [
      "empty → ",
      u
    ] }),
    /* @__PURE__ */ a("div", { className: "flex flex-col gap-1.5", children: [
      l.map((g, v) => /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: T + " flex-1",
            value: g,
            onChange: (n) => {
              const x = l.slice();
              x[v] = n.target.value, s(x);
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-amber-500",
            onClick: () => s(l.filter((n, x) => x !== v)),
            title: "Remove",
            children: /* @__PURE__ */ e(de, { size: 14 })
          }
        )
      ] }, v)),
      /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: T + " flex-1",
            placeholder: `Add ${t}…`,
            value: m,
            onChange: (g) => c(g.target.value),
            onKeyDown: (g) => {
              g.key === "Enter" && m.trim() && (s([...l, m.trim()]), c(""));
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-[var(--accent,#6366f1)]",
            onClick: () => {
              m.trim() && (s([...l, m.trim()]), c(""));
            },
            title: "Add",
            children: /* @__PURE__ */ e(ae, { size: 14 })
          }
        )
      ] })
    ] })
  ] });
}
function me({
  value: t,
  onChange: r,
  srLabel: i
}) {
  const [o, u] = w(!1);
  return /* @__PURE__ */ e(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": t,
      "aria-label": i,
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
        boxShadow: o ? "0 0 0 2px var(--accent, #7c3aed)" : "none"
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
  help: i,
  absent: o,
  value: u,
  onChange: l
}) {
  return /* @__PURE__ */ a("label", { className: "flex items-start gap-2.5 cursor-pointer", children: [
    /* @__PURE__ */ e("span", { className: "mt-0.5", children: /* @__PURE__ */ e(me, { value: u, onChange: l, srLabel: t || void 0 }) }),
    /* @__PURE__ */ a("span", { className: "flex flex-col", children: [
      /* @__PURE__ */ a("span", { className: "text-sm text-[var(--fg,#eee)] flex items-center flex-wrap", children: [
        t,
        r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r }),
        i && /* @__PURE__ */ e(ue, { text: i })
      ] }),
      o && /* @__PURE__ */ a("span", { className: "text-[11px] text-muted", children: [
        "absent → ",
        o
      ] })
    ] })
  ] });
}
const Fe = {
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
function Ie(t) {
  const r = t.config || {}, i = (l) => {
    const s = r[l];
    return typeof s == "number" && Number.isFinite(s) ? String(s) : typeof s == "string" && s.trim() !== "" && Number.isFinite(Number(s)) ? String(Number(s)) : "";
  }, o = t.derived || {}, u = (l) => Array.isArray(l) ? l.filter((s) => typeof s == "string") : [];
  return {
    default_safety_mode: typeof r.default_safety_mode == "string" ? r.default_safety_mode : "read_only",
    default_timeout_s: i("default_timeout_s"),
    max_targets: i("max_targets"),
    auto_detect_local_models: r.auto_detect_local_models === !0,
    default_persistence: typeof r.default_persistence == "string" ? r.default_persistence : "ephemeral",
    synthesize_default: r.synthesize_default === !0,
    enabled_agents: u(o.enabled_agents),
    trusted_workspaces: u(o.trusted_workspaces),
    role_dirs: u(o.role_dirs),
    agents: (Array.isArray(t.agents) ? t.agents : []).map((l) => ({
      ...l,
      env: { ...l.env || {} },
      extra: { ...l.extra || {} }
    }))
  };
}
function Ke(t, r) {
  if (!r || typeof r != "object") return !1;
  const i = (o, u) => String(o) === String(u);
  for (const [o, u] of Object.entries(t)) {
    const l = r[o];
    if (o === "agents") {
      const s = u && typeof u == "object" ? Object.keys(u).sort() : [], m = l && typeof l == "object" ? Object.keys(l).sort() : [];
      if (s.length !== m.length || s.some((c, g) => c !== m[g])) return !1;
      continue;
    }
    if (Array.isArray(u)) {
      if (!Array.isArray(l) || l.length !== u.length || u.some((s, m) => !i(s, l[m]))) return !1;
      continue;
    }
    if (!i(u, l)) return !1;
  }
  return !0;
}
function Be(t, r) {
  const i = { ...t.config };
  delete i.agents;
  const o = (s, m) => {
    if (m.trim() === "") delete i[s];
    else {
      const c = Number(m);
      Number.isNaN(c) || (i[s] = c);
    }
  };
  i.default_safety_mode = r.default_safety_mode, o("default_timeout_s", r.default_timeout_s), o("max_targets", r.max_targets), i.auto_detect_local_models = r.auto_detect_local_models, i.default_persistence = r.default_persistence, i.synthesize_default = r.synthesize_default;
  const u = (s, m) => {
    const c = m.map((g) => g.trim()).filter(Boolean);
    c.length ? i[s] = c : delete i[s];
  };
  u("enabled_agents", r.enabled_agents), u("trusted_workspaces", r.trusted_workspaces), u("role_dirs", r.role_dirs);
  const l = {};
  for (const s of r.agents) {
    const m = s.id.trim();
    if (!m) continue;
    const c = { ...s.extra };
    s.default_model != null && String(s.default_model).trim() !== "" && (c.default_model = s.default_model), c.enabled = s.enabled, s.env && Object.keys(s.env).length && (c.env = s.env), l[m] = c;
  }
  return Object.keys(l).length && (i.agents = l), i;
}
function oe({
  value: t,
  options: r,
  freeText: i,
  onChange: o,
  listId: u,
  placeholder: l
}) {
  const s = Array.isArray(r) ? r : [];
  return i ? /* @__PURE__ */ a(G, { children: [
    /* @__PURE__ */ e(
      "input",
      {
        className: T,
        value: t,
        list: u,
        placeholder: l,
        onChange: (m) => o(m.target.value)
      }
    ),
    /* @__PURE__ */ e("datalist", { id: u, children: s.map((m) => /* @__PURE__ */ e("option", { value: m }, m)) })
  ] }) : /* @__PURE__ */ a("select", { className: T, value: t, onChange: (m) => o(m.target.value), children: [
    t !== "" && !s.includes(t) && /* @__PURE__ */ e("option", { value: t, children: t }),
    s.map((m) => /* @__PURE__ */ e("option", { value: m, children: m }, m))
  ] });
}
function We({
  config: t,
  meta: r,
  scope: i,
  onScope: o,
  onSave: u
}) {
  const [l, s] = w(null), [m, c] = w(!1), [g, v] = w(null), n = Array.isArray(r == null ? void 0 : r.safety_modes) && r.safety_modes.length ? r.safety_modes : Le, x = Array.isArray(r == null ? void 0 : r.persistence) && r.persistence.length ? r.persistence : Oe, A = Array.isArray(r == null ? void 0 : r.agent_ids) ? r.agent_ids : [], M = _e(r), P = !!t && t.scope === i;
  ne(() => {
    if (!t || t.scope !== i) {
      s((d) => d ?? null);
      return;
    }
    v(null), s(Ie(t));
  }, [t, i]);
  const f = (d) => s((j) => j && { ...j, ...d }), H = async () => {
    if (!(!t || !l)) {
      c(!0), v(null);
      try {
        await u(i, Be(t, l)), v({ ok: !0, text: `Saved to ${i} config.toml (backup written).` });
      } catch (d) {
        v({ ok: !1, text: d instanceof Error ? d.message : String(d) });
      } finally {
        c(!1);
      }
    }
  }, h = Fe;
  return /* @__PURE__ */ a(G, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((d) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => o(d),
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (i === d ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: d === "global" ? "Global" : "Workspace"
        },
        d
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: () => void H(),
          disabled: m || !l,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(ce, { size: 14 }),
            " ",
            m ? "Saving…" : `Save ${i}`
          ]
        }
      )
    ] }),
    !r && /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-xs text-muted mb-3", children: [
      /* @__PURE__ */ e(te, { size: 13 }),
      " Option lists (dropdowns) could not be loaded from the backend — showing free-text inputs instead."
    ] }),
    g && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (g.ok ? "text-green-500" : "text-amber-500"),
        children: [
          g.ok ? /* @__PURE__ */ e(se, { size: 15 }) : /* @__PURE__ */ e(te, { size: 15 }),
          g.text
        ]
      }
    ),
    !P || !l ? /* @__PURE__ */ a("p", { className: "text-sm text-muted", children: [
      "Loading ",
      i,
      " config…"
    ] }) : /* @__PURE__ */ a(G, { children: [
      /* @__PURE__ */ a(W, { children: [
        /* @__PURE__ */ e(U, { children: "Defaults" }),
        /* @__PURE__ */ e(X, { meta: t }),
        !t.exists && /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-2", children: [
          "No ",
          /* @__PURE__ */ e("code", { children: "config.toml" }),
          " at this scope yet — no file yet; defaults apply; saving creates it (",
          /* @__PURE__ */ e("code", { children: t.path }),
          ")."
        ] }),
        /* @__PURE__ */ a("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            V,
            {
              label: h.default_safety_mode.label,
              hint: h.default_safety_mode.key,
              help: h.default_safety_mode.help,
              required: h.default_safety_mode.required,
              absent: h.default_safety_mode.absent,
              children: /* @__PURE__ */ e(
                "select",
                {
                  className: T,
                  value: l.default_safety_mode,
                  onChange: (d) => f({ default_safety_mode: d.target.value }),
                  children: n.map((d) => /* @__PURE__ */ e("option", { value: d, children: d }, d))
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            V,
            {
              label: h.default_timeout_s.label,
              hint: h.default_timeout_s.key,
              help: h.default_timeout_s.help,
              required: h.default_timeout_s.required,
              absent: h.default_timeout_s.absent,
              children: /* @__PURE__ */ e(
                "input",
                {
                  type: "number",
                  className: T,
                  value: l.default_timeout_s,
                  onChange: (d) => f({ default_timeout_s: d.target.value })
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            V,
            {
              label: h.max_targets.label,
              hint: h.max_targets.key,
              help: h.max_targets.help,
              required: h.max_targets.required,
              absent: h.max_targets.absent,
              children: /* @__PURE__ */ e(
                "input",
                {
                  type: "number",
                  className: T,
                  value: l.max_targets,
                  onChange: (d) => f({ max_targets: d.target.value })
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            V,
            {
              label: h.default_persistence.label,
              hint: h.default_persistence.key,
              help: h.default_persistence.help,
              required: h.default_persistence.required,
              absent: h.default_persistence.absent,
              children: /* @__PURE__ */ e(
                "select",
                {
                  className: T,
                  value: l.default_persistence,
                  onChange: (d) => f({ default_persistence: d.target.value }),
                  children: x.map((d) => /* @__PURE__ */ e("option", { value: d, children: d }, d))
                }
              )
            }
          )
        ] }),
        /* @__PURE__ */ a("div", { className: "flex flex-wrap gap-6 mt-4", children: [
          /* @__PURE__ */ e(
            xe,
            {
              label: h.auto_detect_local_models.label,
              hint: h.auto_detect_local_models.key,
              help: h.auto_detect_local_models.help,
              absent: h.auto_detect_local_models.absent,
              value: l.auto_detect_local_models,
              onChange: (d) => f({ auto_detect_local_models: d })
            }
          ),
          /* @__PURE__ */ e(
            xe,
            {
              label: h.synthesize_default.label,
              hint: h.synthesize_default.key,
              help: h.synthesize_default.help,
              absent: h.synthesize_default.absent,
              value: l.synthesize_default,
              onChange: (d) => f({ synthesize_default: d })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(W, { children: [
        /* @__PURE__ */ e(U, { children: "Allowlists & directories" }),
        /* @__PURE__ */ a("div", { className: "grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            pe,
            {
              label: h.enabled_agents.label,
              hint: h.enabled_agents.key,
              help: h.enabled_agents.help,
              required: h.enabled_agents.required,
              absent: h.enabled_agents.absent,
              values: l.enabled_agents,
              onChange: (d) => f({ enabled_agents: d })
            }
          ),
          /* @__PURE__ */ e(
            pe,
            {
              label: h.trusted_workspaces.label,
              hint: h.trusted_workspaces.key,
              help: h.trusted_workspaces.help,
              required: h.trusted_workspaces.required,
              absent: h.trusted_workspaces.absent,
              values: l.trusted_workspaces,
              onChange: (d) => f({ trusted_workspaces: d })
            }
          ),
          /* @__PURE__ */ e(
            pe,
            {
              label: h.role_dirs.label,
              hint: h.role_dirs.key,
              help: h.role_dirs.help,
              required: h.role_dirs.required,
              absent: h.role_dirs.absent,
              values: l.role_dirs,
              onChange: (d) => f({ role_dirs: d })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(W, { children: [
        /* @__PURE__ */ e(U, { children: "Per-agent overrides" }),
        /* @__PURE__ */ a("p", { className: "text-[11px] text-muted mt-1 flex items-center flex-wrap", children: [
          /* @__PURE__ */ e("code", { className: "text-[10px] opacity-70", children: "[agents.*]" }),
          /* @__PURE__ */ e("span", { className: "ml-1.5", children: "per-agent default model and enabled flag." }),
          /* @__PURE__ */ e(ue, { text: h.agent_override.help }),
          /* @__PURE__ */ a("span", { className: "ml-1.5", children: [
            "absent → ",
            h.agent_override.absent
          ] })
        ] }),
        /* @__PURE__ */ a("div", { className: "mt-3 flex flex-col gap-2", children: [
          l.agents.length > 0 && /* @__PURE__ */ a("div", { className: "flex items-center gap-2 px-2 text-[10px] uppercase tracking-wide text-muted opacity-70", children: [
            /* @__PURE__ */ e("span", { className: "w-40", children: "Agent (id)" }),
            /* @__PURE__ */ e("span", { className: "flex-1", children: "Default model (free text)" }),
            /* @__PURE__ */ e("span", { children: "Enabled" }),
            /* @__PURE__ */ e("span", { className: "w-6" })
          ] }),
          l.agents.map((d, j) => /* @__PURE__ */ a(
            "div",
            {
              className: "flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]",
              children: [
                /* @__PURE__ */ e("div", { className: "w-40", children: /* @__PURE__ */ e(
                  oe,
                  {
                    value: d.id,
                    options: A,
                    freeText: M,
                    listId: `agent-ids-${j}`,
                    placeholder: "agent id",
                    onChange: (y) => {
                      const k = l.agents.slice();
                      k[j] = { ...d, id: y }, f({ agents: k });
                    }
                  }
                ) }),
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: T + " flex-1",
                    value: d.default_model ?? "",
                    placeholder: "Default model (blank = agent default)",
                    onChange: (y) => {
                      const k = l.agents.slice();
                      k[j] = { ...d, default_model: y.target.value }, f({ agents: k });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  me,
                  {
                    value: d.enabled,
                    srLabel: `Enabled: ${d.id || "agent"}`,
                    onChange: (y) => {
                      const k = l.agents.slice();
                      k[j] = { ...d, enabled: y }, f({ agents: k });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "p-1 text-muted hover:text-amber-500",
                    onClick: () => f({ agents: l.agents.filter((y, k) => k !== j) }),
                    title: "Remove agent",
                    children: /* @__PURE__ */ e(de, { size: 14 })
                  }
                )
              ]
            },
            j
          )),
          /* @__PURE__ */ a(
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
                /* @__PURE__ */ e(ae, { size: 14 }),
                " Add agent"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] });
}
const he = [
  { key: "model", label: "model", placeholder: "agent default (free text)" },
  { key: "label", label: "label", placeholder: "result key" },
  { key: "stance", label: "stance", placeholder: "for / against / neutral" }
];
function Ue(t) {
  return {
    ...t,
    seats: (Array.isArray(t.seats) ? t.seats : []).map((r) => ({ ...r })),
    extra: { ...t.extra || {} }
  };
}
function Ve() {
  return {
    name: "",
    description: "",
    strategy: "all-voices",
    targets: 1,
    seats: [{ cli: "" }],
    extra: {}
  };
}
function Ge(t) {
  return t.map((r) => ({
    name: r.name.trim(),
    description: (r.description || "").trim(),
    strategy: (r.strategy || "").trim(),
    targets: (r.seats || []).length,
    extra: r.extra || {},
    seats: (r.seats || []).map((i) => {
      const o = { cli: String(i.cli || "").trim() };
      for (const [u, l] of Object.entries(i))
        if (u !== "cli" && l != null)
          if (typeof l == "string") {
            const s = l.trim();
            s !== "" && (o[u] = s);
          } else
            o[u] = l;
      return o;
    })
  }));
}
function He({
  seat: t,
  meta: r,
  index: i,
  onChange: o,
  onRemove: u
}) {
  const l = (n, x) => o({ ...t, [n]: x }), s = Array.isArray(r == null ? void 0 : r.agent_ids) ? r.agent_ids : [], m = _e(r), c = Array.isArray(r == null ? void 0 : r.roles) ? r.roles : [], g = /* @__PURE__ */ new Set([
    "cli",
    "role",
    ...he.map((n) => n.key),
    "weight",
    "parity"
  ]), v = Object.keys(t).filter((n) => !g.has(n));
  return /* @__PURE__ */ a("div", { className: "p-2.5 rounded bg-[var(--surface-3,#232323)] border border-[var(--border,#2a2a2a)]", children: [
    /* @__PURE__ */ a("div", { className: "grid gap-2 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]", children: [
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ a("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: [
          "cli",
          /* @__PURE__ */ e("span", { className: "text-amber-500", children: " *" })
        ] }),
        /* @__PURE__ */ e(
          oe,
          {
            value: t.cli != null ? String(t.cli) : "",
            options: s,
            freeText: m,
            listId: `seat-cli-${i}`,
            placeholder: "agent id (required)",
            onChange: (n) => l("cli", n)
          }
        )
      ] }),
      he.filter((n) => n.key === "model").map((n) => /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: n.label }),
        /* @__PURE__ */ e(
          "input",
          {
            className: T,
            value: t[n.key] != null ? String(t[n.key]) : "",
            placeholder: n.placeholder,
            onChange: (x) => l(n.key, x.target.value)
          }
        )
      ] }, n.key)),
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "role" }),
        /* @__PURE__ */ a(
          "select",
          {
            className: T,
            value: t.role != null ? String(t.role) : "",
            onChange: (n) => l("role", n.target.value),
            children: [
              /* @__PURE__ */ e("option", { value: "", children: "(none)" }),
              t.role && !c.includes(String(t.role)) && /* @__PURE__ */ e("option", { value: String(t.role), children: String(t.role) }),
              c.map((n) => /* @__PURE__ */ e("option", { value: n, children: n }, n))
            ]
          }
        )
      ] }),
      he.filter((n) => n.key !== "model").map((n) => /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: n.label }),
        /* @__PURE__ */ e(
          "input",
          {
            className: T,
            value: t[n.key] != null ? String(t[n.key]) : "",
            placeholder: n.placeholder,
            onChange: (x) => l(n.key, x.target.value)
          }
        )
      ] }, n.key)),
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "weight" }),
        /* @__PURE__ */ e(
          "input",
          {
            className: T,
            type: "number",
            value: t.weight != null ? String(t.weight) : "",
            placeholder: "—",
            onChange: (n) => {
              const x = n.target.value.trim(), A = { ...t };
              x === "" ? delete A.weight : A.weight = Number(x), o(A);
            }
          }
        )
      ] }),
      /* @__PURE__ */ a("div", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "parity" }),
        /* @__PURE__ */ e("span", { className: "mt-0.5", children: /* @__PURE__ */ e(
          me,
          {
            value: t.parity === !0,
            srLabel: "Parity counterweight seat",
            onChange: (n) => {
              const x = { ...t };
              n ? x.parity = !0 : delete x.parity, o(x);
            }
          }
        ) })
      ] })
    ] }),
    v.length > 0 && /* @__PURE__ */ a("p", { className: "text-[10px] text-muted mt-1.5", children: [
      "preserved on save:",
      " ",
      v.map((n) => /* @__PURE__ */ a("code", { className: "mr-1.5", children: [
        n,
        "=",
        String(t[n])
      ] }, n))
    ] }),
    /* @__PURE__ */ a(
      "button",
      {
        className: "mt-1.5 flex items-center gap-1 text-[11px] text-muted hover:text-amber-500",
        onClick: u,
        title: "Remove seat",
        children: [
          /* @__PURE__ */ e(de, { size: 12 }),
          " Remove seat"
        ]
      }
    )
  ] });
}
function Ye({
  panel: t,
  meta: r,
  onChange: i,
  onDelete: o
}) {
  const [u, l] = w(!1), s = Array.isArray(t.seats) ? t.seats : [], m = Array.isArray(r == null ? void 0 : r.strategies) && r.strategies.length ? r.strategies : Ne;
  return /* @__PURE__ */ a("div", { className: "p-3 rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)]", children: [
    /* @__PURE__ */ a("div", { className: "grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]", children: [
      /* @__PURE__ */ e(V, { label: "Name", hint: "panel key", required: !0, children: /* @__PURE__ */ e(
        "input",
        {
          className: T,
          value: t.name,
          placeholder: "panel-name",
          onChange: (c) => i({ ...t, name: c.target.value })
        }
      ) }),
      /* @__PURE__ */ e(
        V,
        {
          label: "Strategy",
          hint: "strategy",
          help: "How the panel's voices are reduced to an outcome. all-voices returns every voice; the rest collapse to one verdict (unanimous, majority, plurality, weighted, parity-pair, rank).",
          children: /* @__PURE__ */ a(
            "select",
            {
              className: T,
              value: t.strategy || "all-voices",
              onChange: (c) => i({ ...t, strategy: c.target.value }),
              children: [
                t.strategy && !m.includes(t.strategy) && /* @__PURE__ */ e("option", { value: t.strategy, children: t.strategy }),
                m.map((c) => /* @__PURE__ */ e("option", { value: c, children: c }, c))
              ]
            }
          )
        }
      )
    ] }),
    /* @__PURE__ */ e("div", { className: "mt-2.5", children: /* @__PURE__ */ e(V, { label: "Description", hint: "description", children: /* @__PURE__ */ e(
      "input",
      {
        className: T,
        value: t.description || "",
        placeholder: "Human label for this panel",
        onChange: (c) => i({ ...t, description: c.target.value })
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
        s.map((c, g) => /* @__PURE__ */ e(
          He,
          {
            seat: c,
            meta: r,
            index: g,
            onChange: (v) => {
              const n = s.slice();
              n[g] = v, i({ ...t, seats: n });
            },
            onRemove: () => i({ ...t, seats: s.filter((v, n) => n !== g) })
          },
          g
        )),
        /* @__PURE__ */ a(
          "button",
          {
            className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
            onClick: () => i({ ...t, seats: [...s, { cli: "" }] }),
            children: [
              /* @__PURE__ */ e(ae, { size: 14 }),
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
          onClick: o,
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
          /* @__PURE__ */ e(fe, { size: 13 }),
          " Delete panel"
        ]
      }
    ) })
  ] });
}
function Je({
  panels: t,
  meta: r,
  onSave: i
}) {
  const [o, u] = w("global"), [l, s] = w(null), [m, c] = w(!1), [g, v] = w(null), [n, x] = w(null), [A, M] = w(!1), f = (Array.isArray(t == null ? void 0 : t.sources) ? t.sources : []).find((y) => y.scope === o) || null, H = JSON.stringify((f == null ? void 0 : f.panels) ?? null) + "|" + o;
  ne(() => {
    if (!f) {
      s(null);
      return;
    }
    v(null), M(!1), s((f.panels || []).map(Ue));
  }, [H]);
  const h = (y, k) => s((z) => z && z.map((_, $) => $ === y ? k : _)), d = () => {
    if (!l) return null;
    const y = /* @__PURE__ */ new Set();
    for (const k of l) {
      const z = k.name.trim();
      if (!z) return "Every panel needs a name.";
      if (y.has(z)) return `Duplicate panel name “${z}”.`;
      y.add(z);
      const _ = Array.isArray(k.seats) ? k.seats : [];
      if (_.length === 0) return `Panel “${z}” needs at least one seat.`;
      if (_.some(($) => !String($.cli || "").trim()))
        return `Panel “${z}” has a seat missing a cli.`;
    }
    return null;
  }, j = async () => {
    if (!l) return;
    const y = d();
    if (y) {
      v({ ok: !1, text: y });
      return;
    }
    c(!0), v(null), x(null), M(!1);
    try {
      await i(o, Ge(l)), v({ ok: !0, text: `Saved to ${o} panels.toon (backup written).` }), x(o);
    } catch (k) {
      v({ ok: !1, text: k instanceof Error ? k.message : String(k) });
    } finally {
      c(!1);
    }
  };
  return /* @__PURE__ */ a(G, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((y) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => {
            x(null), M(!1), u(y);
          },
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (o === y ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: y === "global" ? "Global" : "Workspace"
        },
        y
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: () => void j(),
          disabled: m || !l,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(ce, { size: 14 }),
            " ",
            m ? "Saving…" : `Save ${o}`
          ]
        }
      )
    ] }),
    g && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (g.ok ? "text-green-500" : "text-amber-500"),
        children: [
          g.ok ? /* @__PURE__ */ e(se, { size: 15 }) : /* @__PURE__ */ e(te, { size: 15 }),
          g.text
        ]
      }
    ),
    n === o && /* @__PURE__ */ a("div", { className: "flex items-start gap-2 text-sm mb-4 rounded border border-[var(--border,#333)] bg-[var(--surface-2,#2a2a2a)] px-3 py-2.5", children: [
      /* @__PURE__ */ e(ie, { size: 15, className: "mt-0.5 shrink-0 text-[var(--accent,#6366f1)]" }),
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
              var z;
              const y = "reload_panels", k = () => {
                M(!0), window.setTimeout(() => M(!1), 2e3);
              };
              try {
                (z = navigator.clipboard) == null || z.writeText(y).then(k, () => M(!1));
              } catch {
                M(!1);
              }
            },
            className: "self-start flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-[var(--surface,#1e1e1e)] border border-[var(--border,#333)] text-[var(--fg,#eee)] hover:border-[var(--accent,#6366f1)]",
            children: [
              A ? /* @__PURE__ */ e(se, { size: 13 }) : /* @__PURE__ */ e(ye, { size: 13 }),
              A ? "Copied" : "Copy reload_panels"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ a(W, { children: [
      /* @__PURE__ */ a(U, { children: [
        "Named panels · ",
        o
      ] }),
      f && /* @__PURE__ */ e(X, { meta: f }),
      (f == null ? void 0 : f.error) && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-1", children: f.error }),
      f && !f.exists && /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-2", children: [
        "No file at this scope yet — saving creates ",
        /* @__PURE__ */ e("code", { children: f.path }),
        "."
      ] }),
      l === null ? /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-2", children: [
        "Loading ",
        o,
        " panels…"
      ] }) : /* @__PURE__ */ a("div", { className: "mt-3 flex flex-col gap-3", children: [
        l.length === 0 && /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No panels defined at this scope. Add one below." }),
        l.map((y, k) => /* @__PURE__ */ e(
          Ye,
          {
            panel: y,
            meta: r,
            onChange: (z) => h(k, z),
            onDelete: () => s((z) => z && z.filter((_, $) => $ !== k))
          },
          k
        )),
        /* @__PURE__ */ a(
          "button",
          {
            className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
            onClick: () => s((y) => [...y || [], Ve()]),
            children: [
              /* @__PURE__ */ e(ae, { size: 14 }),
              " Add panel"
            ]
          }
        )
      ] })
    ] })
  ] });
}
const Xe = [
  { key: "label", label: "label", placeholder: "result key (default: the model)" },
  { key: "stance", label: "stance", placeholder: "for / against / neutral" },
  { key: "agent", label: "agent", placeholder: "kirocrew (default)" }
];
function Ze(t) {
  return {
    ...t,
    seats: (Array.isArray(t.seats) ? t.seats : []).map((r) => ({ ...r }))
  };
}
function Qe() {
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
function et(t) {
  return t.map((r) => ({
    name: r.name.trim(),
    description: (r.description || "").trim(),
    engine: "native",
    strategy: (r.strategy || "").trim(),
    reduction: (r.reduction || "").trim(),
    targets: (r.seats || []).length,
    seats: (r.seats || []).map((i) => {
      const o = { model: String(i.model || "").trim() };
      return i.role && String(i.role).trim() && (o.role = String(i.role).trim()), i.label && String(i.label).trim() && (o.label = String(i.label).trim()), i.stance && String(i.stance).trim() && (o.stance = String(i.stance).trim()), i.agent && String(i.agent).trim() && (o.agent = String(i.agent).trim()), i.backend && String(i.backend).trim() && (o.backend = String(i.backend).trim()), i.weight !== void 0 && i.weight !== null && String(i.weight).trim() !== "" && (o.weight = Number(i.weight)), i.parity === !0 && (o.parity = !0), o;
    })
  }));
}
function re(t) {
  return t === "global" ? "Global" : t === "workspace" ? "Workspace" : t === "config_dir" ? "Config Dir" : t;
}
function tt(t) {
  const r = t.weight, i = r == null || String(r).trim() === "" ? "" : String(Number(r));
  return {
    model: String(t.model ?? "").trim(),
    role: String(t.role ?? "").trim(),
    label: String(t.label ?? "").trim(),
    stance: String(t.stance ?? "").trim(),
    agent: String(t.agent ?? "").trim(),
    backend: String(t.backend ?? "").trim(),
    weight: i,
    parity: t.parity === !0
  };
}
function be(t) {
  return {
    name: String(t.name ?? "").trim(),
    description: String(t.description ?? "").trim(),
    strategy: String(t.strategy ?? "").trim(),
    reduction: String(t.reduction ?? "").trim(),
    seats: (Array.isArray(t.seats) ? t.seats : []).map(tt)
  };
}
function ve(t, r) {
  return t.length !== r.length ? !1 : JSON.stringify(t.map(be)) === JSON.stringify(r.map(be));
}
function at({
  seat: t,
  meta: r,
  index: i,
  onChange: o,
  onRemove: u
}) {
  const l = (n, x) => o({ ...t, [n]: x }), s = String(t.backend ?? "").trim(), m = s === "" || s === "kiro", c = m && Array.isArray(r == null ? void 0 : r.native_models) ? r.native_models : [], g = Array.isArray(r == null ? void 0 : r.native_backends) ? r.native_backends : [], v = Array.isArray(r == null ? void 0 : r.native_roles) ? r.native_roles : [];
  return /* @__PURE__ */ a("div", { className: "p-2.5 rounded bg-[var(--surface-3,#232323)] border border-[var(--border,#2a2a2a)]", children: [
    /* @__PURE__ */ a("div", { className: "grid gap-2 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]", children: [
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ a("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: [
          "model",
          /* @__PURE__ */ e("span", { className: "text-amber-500", children: " *" })
        ] }),
        /* @__PURE__ */ e(
          oe,
          {
            value: t.model != null ? String(t.model) : "",
            options: c,
            freeText: !0,
            listId: `nseat-model-${i}`,
            placeholder: m ? "Kiro model (required)" : `${s} model id (required)`,
            onChange: (n) => l("model", n)
          }
        )
      ] }),
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "backend" }),
        /* @__PURE__ */ e(
          oe,
          {
            value: t.backend != null ? String(t.backend) : "",
            options: g,
            freeText: !0,
            listId: `nseat-backend-${i}`,
            placeholder: "default (Kiro Crew's own harness)",
            onChange: (n) => l("backend", n)
          }
        ),
        /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-70", title: String((r == null ? void 0 : r.native_backends_source) || ""), children: "model ids come from this backend's own list" })
      ] }),
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "role" }),
        /* @__PURE__ */ a(
          "select",
          {
            className: T,
            value: t.role != null ? String(t.role) : "",
            onChange: (n) => l("role", n.target.value),
            children: [
              /* @__PURE__ */ e("option", { value: "", children: "(none)" }),
              t.role && !v.includes(String(t.role)) && /* @__PURE__ */ e("option", { value: String(t.role), children: String(t.role) }),
              v.map((n) => /* @__PURE__ */ e("option", { value: n, children: n }, n))
            ]
          }
        )
      ] }),
      Xe.map((n) => /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: n.label }),
        /* @__PURE__ */ e(
          "input",
          {
            className: T,
            value: t[n.key] != null ? String(t[n.key]) : "",
            placeholder: n.placeholder,
            onChange: (x) => l(n.key, x.target.value)
          }
        )
      ] }, n.key)),
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "weight" }),
        /* @__PURE__ */ e(
          "input",
          {
            className: T,
            type: "number",
            value: t.weight != null ? String(t.weight) : "",
            placeholder: "—",
            onChange: (n) => {
              const x = n.target.value.trim(), A = { ...t };
              x === "" ? delete A.weight : A.weight = Number(x), o(A);
            }
          }
        )
      ] }),
      /* @__PURE__ */ a("div", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "parity" }),
        /* @__PURE__ */ e("span", { className: "mt-0.5", children: /* @__PURE__ */ e(
          me,
          {
            value: t.parity === !0,
            srLabel: "Parity counterweight seat",
            onChange: (n) => {
              const x = { ...t };
              n ? x.parity = !0 : delete x.parity, o(x);
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
          /* @__PURE__ */ e(de, { size: 12 }),
          " Remove seat"
        ]
      }
    )
  ] });
}
function rt({
  panel: t,
  meta: r,
  onChange: i,
  onDelete: o
}) {
  const [u, l] = w(!1), s = Array.isArray(t.seats) ? t.seats : [], m = Array.isArray(r == null ? void 0 : r.strategies) && r.strategies.length ? r.strategies : Ne;
  return /* @__PURE__ */ a("div", { className: "p-3 rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)]", children: [
    /* @__PURE__ */ a("div", { className: "grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]", children: [
      /* @__PURE__ */ e(V, { label: "Name", hint: "panel key", required: !0, children: /* @__PURE__ */ e(
        "input",
        {
          className: T,
          value: t.name,
          placeholder: "panel-name",
          onChange: (c) => i({ ...t, name: c.target.value })
        }
      ) }),
      /* @__PURE__ */ e(
        V,
        {
          label: "Strategy",
          hint: "strategy",
          help: "How the native panel's voices are reduced. all-voices returns every voice; the rest collapse to one verdict (unanimous, majority, plurality, weighted, parity-pair, rank).",
          children: /* @__PURE__ */ a(
            "select",
            {
              className: T,
              value: t.strategy || "all-voices",
              onChange: (c) => i({ ...t, strategy: c.target.value }),
              children: [
                t.strategy && !m.includes(t.strategy) && /* @__PURE__ */ e("option", { value: t.strategy, children: t.strategy }),
                m.map((c) => /* @__PURE__ */ e("option", { value: c, children: c }, c))
              ]
            }
          )
        }
      )
    ] }),
    /* @__PURE__ */ a("div", { className: "mt-2.5 grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]", children: [
      /* @__PURE__ */ e(V, { label: "Description", hint: "description", children: /* @__PURE__ */ e(
        "input",
        {
          className: T,
          value: t.description || "",
          placeholder: "Human label for this panel",
          onChange: (c) => i({ ...t, description: c.target.value })
        }
      ) }),
      /* @__PURE__ */ e(
        V,
        {
          label: "Reduction",
          hint: "reduction",
          help: "Optional free-text note steering how the skill reduces/reports (a synthesis hint). Advisory — the strategy drives the vote math.",
          children: /* @__PURE__ */ e(
            "input",
            {
              className: T,
              value: t.reduction || "",
              placeholder: "optional synthesis hint",
              onChange: (c) => i({ ...t, reduction: c.target.value })
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
        s.map((c, g) => /* @__PURE__ */ e(
          at,
          {
            seat: c,
            meta: r,
            index: g,
            onChange: (v) => {
              const n = s.slice();
              n[g] = v, i({ ...t, seats: n });
            },
            onRemove: () => i({ ...t, seats: s.filter((v, n) => n !== g) })
          },
          g
        )),
        /* @__PURE__ */ a(
          "button",
          {
            className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
            onClick: () => i({ ...t, seats: [...s, { model: "" }] }),
            children: [
              /* @__PURE__ */ e(ae, { size: 14 }),
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
          onClick: o,
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
          /* @__PURE__ */ e(fe, { size: 13 }),
          " Delete panel"
        ]
      }
    ) })
  ] });
}
function nt({
  nativePanels: t,
  meta: r,
  onSave: i
}) {
  const [o, u] = w("global"), [l, s] = w(null), [m, c] = w(!1), [g, v] = w(null), [n, x] = w(null), A = Array.isArray(t == null ? void 0 : t.sources) ? t.sources : [], M = Array.isArray(t == null ? void 0 : t.scopes) && t.scopes.length > 0 ? t.scopes : A.map((_) => _.scope), P = M.includes(o) ? o : M[0] || "global", f = A.find((_) => _.scope === P) || null, H = JSON.stringify((f == null ? void 0 : f.panels) ?? null) + "|" + P, h = String((r == null ? void 0 : r.native_models_source) || ""), d = String((r == null ? void 0 : r.native_backends_source) || ""), j = ((f == null ? void 0 : f.panels) || []).filter((_) => _.resolved === !1);
  ne(() => {
    if (!f) {
      s(null);
      return;
    }
    v(null), s((f.panels || []).map(Ze));
  }, [H]);
  const y = (_, $) => s((L) => L && L.map((Y, J) => J === _ ? $ : Y)), k = () => {
    if (!l) return null;
    const _ = /* @__PURE__ */ new Set();
    for (const $ of l) {
      const L = $.name.trim();
      if (!L) return "Every panel needs a name.";
      if (_.has(L)) return `Duplicate panel name “${L}”.`;
      _.add(L);
      const Y = Array.isArray($.seats) ? $.seats : [];
      if (Y.length === 0) return `Panel “${L}” needs at least one seat.`;
      if (Y.some((J) => !String(J.model || "").trim()))
        return `Panel “${L}” has a seat missing a model (a native seat's model is required).`;
    }
    return null;
  }, z = async () => {
    if (!l) return;
    const _ = k();
    if (_) {
      v({ ok: !1, text: _ });
      return;
    }
    c(!0), v(null), x(null);
    try {
      await i(P, et(l)), v({
        ok: !0,
        text: `Saved to ${re(P)} native-panels.toon (backup written).`
      }), x(P);
    } catch ($) {
      v({ ok: !1, text: $ instanceof Error ? $.message : String($) });
    } finally {
      c(!1);
    }
  };
  return /* @__PURE__ */ a(G, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      M.map((_) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => {
            x(null), u(_);
          },
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (P === _ ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: re(_)
        },
        _
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: () => void z(),
          disabled: m || !l,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(ce, { size: 14 }),
            " ",
            m ? "Saving…" : `Save ${re(P)}`
          ]
        }
      )
    ] }),
    /* @__PURE__ */ a("div", { className: "flex items-start gap-2 text-sm mb-4 rounded border border-[var(--border,#333)] bg-[var(--surface-2,#2a2a2a)] px-3 py-2.5", children: [
      /* @__PURE__ */ e(ie, { size: 15, className: "mt-0.5 shrink-0 text-[var(--accent,#6366f1)]" }),
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
        h && /* @__PURE__ */ a("span", { className: "text-xs text-muted", children: [
          "Model list: ",
          h,
          ". The skill validates models only when the seat's backend is omitted or ",
          /* @__PURE__ */ e("code", { children: "kiro" }),
          "; a model requested on another backend stays unvalidated, and an unknown id may run that backend's default model."
        ] }),
        d && /* @__PURE__ */ a("span", { className: "text-xs text-muted", children: [
          "Backend list: ",
          d,
          "."
        ] })
      ] })
    ] }),
    g && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (g.ok ? "text-green-500" : "text-amber-500"),
        children: [
          g.ok ? /* @__PURE__ */ e(se, { size: 15 }) : /* @__PURE__ */ e(te, { size: 15 }),
          g.text
        ]
      }
    ),
    n === P && /* @__PURE__ */ a("div", { className: "flex items-start gap-2 text-sm mb-4 rounded border border-[var(--border,#333)] bg-[var(--surface-2,#2a2a2a)] px-3 py-2.5", children: [
      /* @__PURE__ */ e(ie, { size: 15, className: "mt-0.5 shrink-0 text-[var(--accent,#6366f1)]" }),
      /* @__PURE__ */ a("span", { className: "text-[var(--fg,#eee)]", children: [
        "Written to disk. Unlike ACP panels, there is no running server to reload — the",
        " ",
        /* @__PURE__ */ e("code", { children: "native-panel" }),
        " skill reads ",
        /* @__PURE__ */ e("code", { children: "native-panels.toon" }),
        " fresh on its next run, so your change takes effect the next time you run a native panel."
      ] })
    ] }),
    j.length > 0 && /* @__PURE__ */ a("div", { className: "flex items-start gap-2 text-sm mb-4 rounded border border-amber-500/40 bg-[var(--surface-2,#2a2a2a)] px-3 py-2.5", children: [
      /* @__PURE__ */ e(te, { size: 15, className: "mt-0.5 shrink-0 text-amber-500" }),
      /* @__PURE__ */ a("span", { className: "text-[var(--fg,#eee)]", children: [
        j.length === 1 ? "This panel is" : "These panels are",
        " defined here but",
        " ",
        /* @__PURE__ */ e("b", { children: "overridden" }),
        " at a higher-precedence scope, so the skill runs the other copy:",
        " ",
        j.map((_, $) => /* @__PURE__ */ a("span", { children: [
          $ > 0 && ", ",
          /* @__PURE__ */ e("code", { children: _.name }),
          " → ",
          re(String(_.resolved_scope || ""))
        ] }, _.name)),
        ". Edit it there to change what actually runs."
      ] })
    ] }),
    /* @__PURE__ */ a(W, { children: [
      /* @__PURE__ */ a(U, { children: [
        "Native panels · ",
        re(P)
      ] }),
      f && /* @__PURE__ */ e(X, { meta: f }),
      (f == null ? void 0 : f.error) && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-1", children: f.error }),
      f && !f.exists && /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-2", children: [
        "No file at this scope yet — saving creates ",
        /* @__PURE__ */ e("code", { children: f.path }),
        "."
      ] }),
      l === null ? /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-2", children: t ? `Loading ${re(P)} native panels…` : "Native panels route unavailable." }) : /* @__PURE__ */ a("div", { className: "mt-3 flex flex-col gap-3", children: [
        l.length === 0 && /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No native panels defined at this scope. Add one below." }),
        l.map((_, $) => /* @__PURE__ */ e(
          rt,
          {
            panel: _,
            meta: r,
            onChange: (L) => y($, L),
            onDelete: () => s((L) => L && L.filter((Y, J) => J !== $))
          },
          $
        )),
        /* @__PURE__ */ a(
          "button",
          {
            className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
            onClick: () => s((_) => [..._ || [], Qe()]),
            children: [
              /* @__PURE__ */ e(ae, { size: 14 }),
              " Add native panel"
            ]
          }
        )
      ] })
    ] })
  ] });
}
function st() {
  return { name: "", display_name: "", description: "", body: "", extra: {}, _new: !0 };
}
function lt({
  roles: t,
  meta: r,
  onFetchRole: i,
  onSave: o
}) {
  const [u, l] = w("global"), [s, m] = w(null), [c, g] = w(null), [v, n] = w(!1), [x, A] = w(null), [M, P] = w(!1), [f, H] = w(null), h = Array.isArray(t == null ? void 0 : t.sources) ? t.sources : [], d = h.find((p) => p.scope === u && p.editable !== !1) || null, j = Array.isArray(d == null ? void 0 : d.roles) ? d.roles : [], y = Array.isArray(r == null ? void 0 : r.roles_builtin) && r.roles_builtin.length ? r.roles_builtin : Array.isArray(t == null ? void 0 : t.builtin) ? t.builtin.map((p) => p.name) : [], k = h.filter((p) => p.editable === !1), z = async (p) => {
    H(p), A(null), P(!1);
    const N = await i(u, p);
    if (H(null), !N) {
      A({ ok: !1, text: `Could not open role “${p}”.` });
      return;
    }
    m({ ...N, extra: N.extra || {} }), g(p);
  }, _ = () => {
    A(null), P(!1), m(st()), g(null);
  }, $ = () => {
    m(null), g(null), P(!1);
  }, L = () => {
    if (!s) return null;
    const p = s.name.trim();
    return p ? /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(p) ? y.includes(p) ? `“${p}” is a built-in role (read-only reference). Choose a different id.` : null : "Role name must be a kebab-case id (letters, digits, . _ -), no path separators." : "Role name is required.";
  }, Y = async () => {
    if (!s) return;
    const p = L();
    if (p) {
      A({ ok: !1, text: p });
      return;
    }
    n(!0), A(null);
    try {
      const N = s.name.trim();
      if (await o(u, {
        name: N,
        display_name: s.display_name || "",
        description: s.description || "",
        body: s.body || "",
        extra: s.extra || {}
      }), c && c !== N)
        try {
          await o(u, { name: c, op: "delete" });
        } catch {
        }
      A({ ok: !0, text: `Saved role “${N}” to ${u} (backup written).` }), g(N), m((b) => b && { ...b, _new: !1 });
    } catch (N) {
      A({ ok: !1, text: N instanceof Error ? N.message : String(N) });
    } finally {
      n(!1);
    }
  }, J = async () => {
    if (!(!s || !c)) {
      n(!0), A(null);
      try {
        await o(u, { name: c, op: "delete" }), A({ ok: !0, text: `Deleted role “${c}” from ${u} (backup written).` }), $();
      } catch (p) {
        A({ ok: !1, text: p instanceof Error ? p.message : String(p) });
      } finally {
        n(!1);
      }
    }
  };
  return /* @__PURE__ */ a(G, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((p) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => {
            l(p), $(), A(null);
          },
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (u === p ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: p === "global" ? "Global" : "Workspace"
        },
        p
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: _,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white",
          children: [
            /* @__PURE__ */ e(ae, { size: 14 }),
            " New role"
          ]
        }
      )
    ] }),
    x && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (x.ok ? "text-green-500" : "text-amber-500"),
        children: [
          x.ok ? /* @__PURE__ */ e(se, { size: 15 }) : /* @__PURE__ */ e(te, { size: 15 }),
          x.text
        ]
      }
    ),
    s && /* @__PURE__ */ a(G, { children: [
      /* @__PURE__ */ a(W, { children: [
        /* @__PURE__ */ e(U, { children: /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-1.5", children: [
          /* @__PURE__ */ e(ge, { size: 14 }),
          " ",
          s._new ? "New role" : `Edit role · ${c}`,
          " · ",
          u
        ] }) }),
        d && /* @__PURE__ */ e(X, { meta: d }),
        /* @__PURE__ */ a("div", { className: "grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            V,
            {
              label: "Role id (file name)",
              hint: "<id>.md",
              help: "The role's id and file stem. Kebab-case: letters, digits, . _ - — no path separators. Referenced from a panel seat's role field.",
              required: !0,
              children: /* @__PURE__ */ e(
                "input",
                {
                  className: T,
                  value: s.name,
                  placeholder: "my-reviewer",
                  onChange: (p) => m((N) => N && { ...N, name: p.target.value })
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            V,
            {
              label: "Display name",
              hint: "display_name",
              help: "Optional human-friendly name shown in listings.",
              required: !1,
              children: /* @__PURE__ */ e(
                "input",
                {
                  className: T,
                  value: s.display_name,
                  placeholder: "My Reviewer",
                  onChange: (p) => m((N) => N && { ...N, display_name: p.target.value })
                }
              )
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "mt-2.5", children: /* @__PURE__ */ e(
          V,
          {
            label: "Description",
            hint: "description",
            help: "One-line summary of what this persona is for.",
            required: !1,
            children: /* @__PURE__ */ e(
              "input",
              {
                className: T,
                value: s.description,
                placeholder: "Short description of this persona",
                onChange: (p) => m((N) => N && { ...N, description: p.target.value })
              }
            )
          }
        ) }),
        /* @__PURE__ */ e("div", { className: "mt-2.5", children: /* @__PURE__ */ e(
          V,
          {
            label: "System prompt (body)",
            hint: "markdown body",
            help: "The persona's system prompt, prepended to the task. This is the file body below the frontmatter.",
            required: !0,
            children: /* @__PURE__ */ e(
              "textarea",
              {
                className: T + " min-h-[220px] font-mono text-[12px] leading-relaxed",
                value: s.body,
                placeholder: "You are a principal-level reviewer. …",
                onChange: (p) => m((N) => N && { ...N, body: p.target.value })
              }
            )
          }
        ) }),
        s.extra && Object.keys(s.extra).length > 0 && /* @__PURE__ */ a("p", { className: "text-[10px] text-muted mt-2", children: [
          "preserved frontmatter:",
          " ",
          Object.entries(s.extra).map(([p, N]) => /* @__PURE__ */ a("code", { className: "mr-1.5", children: [
            p,
            "=",
            String(N)
          ] }, p))
        ] }),
        /* @__PURE__ */ a("div", { className: "mt-3 pt-2.5 border-t border-[var(--border,#2a2a2a)] flex items-center gap-2", children: [
          /* @__PURE__ */ a(
            "button",
            {
              onClick: () => void Y(),
              disabled: v,
              className: "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
              children: [
                /* @__PURE__ */ e(ce, { size: 14 }),
                " ",
                v ? "Saving…" : `Save to ${u}`
              ]
            }
          ),
          /* @__PURE__ */ e(
            "button",
            {
              onClick: $,
              className: "px-3 py-1.5 text-sm rounded text-muted hover:text-[var(--fg,#eee)]",
              children: "Close"
            }
          ),
          c && !s._new && /* @__PURE__ */ e("div", { className: "ml-auto flex items-center", children: M ? /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-xs", children: [
            /* @__PURE__ */ a("span", { className: "text-amber-500", children: [
              "Delete “",
              c,
              "”?"
            ] }),
            /* @__PURE__ */ e(
              "button",
              {
                className: "px-2 py-0.5 rounded bg-amber-600/80 text-white hover:bg-amber-600 disabled:opacity-50",
                disabled: v,
                onClick: () => void J(),
                children: "Delete"
              }
            ),
            /* @__PURE__ */ e(
              "button",
              {
                className: "px-2 py-0.5 rounded text-muted hover:text-[var(--fg,#eee)]",
                onClick: () => P(!1),
                children: "Cancel"
              }
            )
          ] }) : /* @__PURE__ */ a(
            "button",
            {
              className: "flex items-center gap-1.5 text-xs text-muted hover:text-amber-500",
              onClick: () => P(!0),
              children: [
                /* @__PURE__ */ e(fe, { size: 13 }),
                " Delete role"
              ]
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" })
    ] }),
    /* @__PURE__ */ a(W, { children: [
      /* @__PURE__ */ e(U, { children: /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(je, { size: 14 }),
        " Role files · ",
        u,
        " (editable)"
      ] }) }),
      d ? /* @__PURE__ */ e(X, { meta: d }) : /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-1", children: [
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
      j.length === 0 ? /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-2", children: [
        "No role files at this scope. Click ",
        /* @__PURE__ */ e("strong", { children: "New role" }),
        " to add one."
      ] }) : /* @__PURE__ */ e("div", { className: "mt-3 flex flex-col gap-1.5", children: j.map((p) => /* @__PURE__ */ a(
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
                onClick: () => void z(p.name),
                disabled: f === p.name,
                children: [
                  /* @__PURE__ */ e(ge, { size: 12 }),
                  " ",
                  f === p.name ? "Opening…" : "Edit"
                ]
              }
            )
          ]
        },
        p.path || p.name
      )) })
    ] }),
    y.length > 0 && /* @__PURE__ */ a(G, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(W, { children: [
        /* @__PURE__ */ e(U, { children: "Built-in personas (read-only reference)" }),
        /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-1", children: [
          "These ship in the Rutherford server (not files) and cannot be edited here. Reference them from a panel seat's ",
          /* @__PURE__ */ e("code", { children: "role" }),
          " field."
        ] }),
        /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: y.map((p) => /* @__PURE__ */ e(
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
    k.map(
      (p) => Array.isArray(p.roles) && p.roles.length > 0 ? /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ e("div", { className: "h-3" }),
        /* @__PURE__ */ a(W, { children: [
          /* @__PURE__ */ a(U, { children: [
            "Role files · ",
            p.scope,
            " (read-only)"
          ] }),
          /* @__PURE__ */ e(X, { meta: p }),
          /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: p.roles.map((N) => /* @__PURE__ */ e(
            "span",
            {
              className: "px-2 py-1 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-muted",
              title: N.path,
              children: N.name
            },
            N.path || N.name
          )) })
        ] })
      ] }, p.path) : null
    )
  ] });
}
export {
  mt as default
};
