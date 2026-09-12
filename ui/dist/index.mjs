import { jsxs as a, Fragment as I, jsx as e } from "react/jsx-runtime";
import { useAppApi as be } from "@kirocrew/app-sdk";
import { PageHeader as ye, StatCard as J, Card as q, CardTitle as P } from "@kirocrew/app-sdk/ui";
import { useState as k, useRef as ve, useCallback as H, useEffect as Q } from "react";
import _e from "lucide-react";
const {
  Box: Ne,
  FileCog: we,
  Layers: ke,
  UserSquare: Se,
  RefreshCw: ue,
  AlertTriangle: X,
  Save: ne,
  Plus: Z,
  X: ie,
  CheckCircle2: ee,
  Server: Ae,
  Trash2: me,
  Info: pe,
  Pencil: ce,
  FileText: Ce
} = _e, j = "/api/apps/rutherford", Re = [
  { id: "status", label: "Overview", icon: Ne },
  { id: "config", label: "Config", icon: we },
  { id: "panels", label: "Panels", icon: ke },
  { id: "roles", label: "Roles", icon: Se }
], ze = ["read_only", "propose", "write", "yolo"], $e = ["ephemeral", "job"], Ee = [
  "all-voices",
  "unanimous",
  "majority",
  "plurality",
  "weighted",
  "parity-pair",
  "rank"
];
function fe(t) {
  const r = String((t == null ? void 0 : t.agent_ids_source) || "").toLowerCase();
  return r ? /fallback|no backend mcp|config-derived|unresolved|builtin/.test(r) : !0;
}
function V({ meta: t }) {
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
function Ze() {
  const t = be(), [r, d] = k("status"), [u, c] = k(!0), [n, l] = k(null), [m, f] = k(null), [g, _] = k(null), [i, v] = k("global"), [S, D] = k(null), [B, b] = k(null), [W, h] = k(null), o = ve("global"), $ = H(
    async (x) => {
      o.current = x;
      try {
        const s = await t.get(`${j}/rutherford-config?scope=${x}`);
        if (o.current !== x) return;
        if (!s || typeof s != "object") {
          l(`No config returned for ${x} scope.`);
          return;
        }
        D({ ...s, scope: x }), l(null);
      } catch (s) {
        if (o.current !== x) return;
        l(s instanceof Error ? s.message : String(s));
      }
    },
    [t]
  ), y = H(async () => {
    c(!0), l(null);
    try {
      const [x, s, p, E] = await Promise.all([
        // Meta is best-effort: catch so a meta failure degrades dropdowns to
        // free text but never fails the whole load.
        t.get(`${j}/rutherford-meta`).catch(() => null),
        t.get(`${j}/status`),
        t.get(`${j}/panels`),
        // FIX: roles are served at /rutherford-roles (GET+PUT share that base);
        // the old bare /roles path 404s.
        t.get(`${j}/rutherford-roles`)
      ]);
      x && typeof x == "object" && !x.error ? f(x) : f(null), _(s), b(p), h(E);
    } catch (x) {
      l(x instanceof Error ? x.message : String(x));
    } finally {
      c(!1);
    }
  }, [t]);
  Q(() => {
    y();
  }, [y]), Q(() => {
    $(i);
  }, [$, i]);
  const N = H((x) => {
    v(x);
  }, []), C = (x) => !!x && typeof x == "object" && x.written === !0, K = H(
    async (x, s) => {
      const p = `${j}/rutherford-config?scope=${x}`;
      let E = await t.put(p, s);
      C(E) || (await new Promise((R) => setTimeout(R, 600)), E = await t.put(p, s));
      let L = C(E) ? E : null;
      if (!L) {
        const R = await t.get(p);
        if (R && typeof R == "object") {
          const A = R;
          qe(s, A.config) && (L = A);
        }
      }
      if (!L)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your entered values were kept; try Save again."
        );
      const O = L.scope ?? o.current;
      o.current = O, D({ ...L, scope: O });
      try {
        const R = await t.get(`${j}/status`);
        R && typeof R == "object" && _(R);
      } catch {
      }
      return L;
    },
    [t]
  ), F = H(
    async (x, s) => {
      var A;
      const p = `${j}/rutherford-panels?scope=${x}`, E = { panels: s }, L = (w) => !!w && typeof w == "object" && w.written === !0;
      let O = await t.put(p, E);
      L(O) || (await new Promise((w) => setTimeout(w, 600)), O = await t.put(p, E));
      let R = L(O) ? O : null;
      if (!R) {
        const w = await t.get(`${j}/panels`), G = (A = w == null ? void 0 : w.sources) == null ? void 0 : A.find((T) => T.scope === x);
        if (G) {
          const T = s.map((Y) => Y.name).sort(), U = (Array.isArray(G.panels) ? G.panels : []).map((Y) => Y.name).sort();
          T.length === U.length && T.every((Y, ge) => Y === U[ge]) && (R = { ...G, written: !0 });
        }
      }
      if (!R)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your edits were kept; try Save again."
        );
      try {
        const w = await t.get(`${j}/panels`);
        w && typeof w == "object" && b(w);
      } catch {
      }
      return R;
    },
    [t]
  ), ae = H(
    async (x, s) => {
      try {
        const p = await t.get(
          `${j}/rutherford-roles?scope=${x}&name=${encodeURIComponent(s)}`
        );
        return p && typeof p == "object" && p.role && typeof p.role == "object" ? p.role : null;
      } catch {
        return null;
      }
    },
    [t]
  ), re = H(
    async (x, s) => {
      const p = `${j}/rutherford-roles?scope=${x}`, E = (A) => !!A && typeof A == "object" && A.written === !0, L = s.op === "delete";
      let O = await t.put(p, s);
      E(O) || (await new Promise((A) => setTimeout(A, 600)), O = await t.put(p, s));
      let R = E(O) ? O : null;
      if (!R)
        if (L) {
          let A = !1;
          try {
            const w = await t.get(
              `${j}/rutherford-roles?scope=${x}&name=${encodeURIComponent(s.name)}`
            );
            w && typeof w == "object" && w.exists === !1 && (A = !0);
          } catch {
          }
          if (!A)
            try {
              const w = await t.get(`${j}/rutherford-roles`), G = Array.isArray(w == null ? void 0 : w.sources) ? w.sources : null, T = G ? G.find((U) => U.scope === x) : void 0;
              T && !T.error && Array.isArray(T.roles) && (T.roles.some((Y) => Y.name === s.name) || (A = !0));
            } catch {
            }
          A && (R = { scope: x, path: "", platform: "", written: !0, deleted: !0 });
        } else {
          const A = await t.get(`${j}/rutherford-roles`), w = (Array.isArray(A == null ? void 0 : A.sources) ? A.sources : []).find(
            (T) => T.scope === x
          );
          (Array.isArray(w == null ? void 0 : w.roles) ? w.roles : []).some(
            (T) => T.name === s.name
          ) && (R = { scope: x, path: (w == null ? void 0 : w.path) ?? "", platform: "", written: !0 });
        }
      if (!R)
        throw new Error(
          L ? "Delete could not be confirmed — the role file may still exist (a non-404 error, empty response, or unreachable server). Nothing was closed; your draft was kept. Try Delete again." : "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your edits were kept; try Save again."
        );
      try {
        const A = await t.get(`${j}/rutherford-roles`);
        A && typeof A == "object" && h(A);
      } catch {
      }
      return R;
    },
    [t]
  );
  return /* @__PURE__ */ a(I, { children: [
    /* @__PURE__ */ e(ye, { title: "Rutherford", subtitle: "Config, panels & roles — config.toml / panels.toon / role files" }),
    /* @__PURE__ */ a("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ a("div", { className: "flex gap-1 mb-5 border-b border-[var(--border,#2a2a2a)]", children: [
        Re.map(({ id: x, label: s, icon: p }) => /* @__PURE__ */ a(
          "button",
          {
            onClick: () => d(x),
            className: "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors " + (r === x ? "border-[var(--accent,#6366f1)] text-[var(--fg,#eee)]" : "border-transparent text-muted hover:text-[var(--fg,#eee)]"),
            children: [
              /* @__PURE__ */ e(p, { size: 15 }),
              s
            ]
          },
          x
        )),
        /* @__PURE__ */ e(
          "button",
          {
            onClick: () => void y(),
            className: "ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-[var(--fg,#eee)]",
            title: "Reload",
            children: /* @__PURE__ */ e(ue, { size: 15, className: u ? "animate-spin" : "" })
          }
        )
      ] }),
      n && /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-sm text-amber-500 mb-4", children: [
        /* @__PURE__ */ e(X, { size: 15 }),
        " ",
        n
      ] }),
      u && !g ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "Loading…" }) : /* @__PURE__ */ a(I, { children: [
        r === "status" && /* @__PURE__ */ e(je, { status: g }),
        r === "config" && /* @__PURE__ */ e(
          Le,
          {
            config: S,
            meta: m,
            scope: i,
            onScope: N,
            onSave: K
          }
        ),
        r === "panels" && /* @__PURE__ */ e(Ke, { panels: B, meta: m, onSave: F }),
        r === "roles" && /* @__PURE__ */ e(Ge, { roles: W, meta: m, onFetchRole: ae, onSave: re })
      ] })
    ] })
  ] });
}
function je({ status: t }) {
  var f, g, _;
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No status." });
  const r = t.agents || { enabled: [], enabled_source: "", allowlist_configured: !1, roster: [] }, d = Array.isArray(r.enabled) ? r.enabled : [], u = Array.isArray(r.roster) ? r.roster : [], c = Array.isArray(t.acp) ? t.acp : [], n = t.defaults || {}, l = r.allowlist_configured ? String(d.length) : "All", m = Object.keys(t.env_overrides || {}).filter((i) => i !== "_note");
  return /* @__PURE__ */ a(I, { children: [
    /* @__PURE__ */ a("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mb-6", children: [
      /* @__PURE__ */ e(J, { label: "Platform", value: t.platform }),
      /* @__PURE__ */ e(J, { label: "Agents enabled", value: l, accent: !0 }),
      /* @__PURE__ */ e(J, { label: "Safety mode", value: n.safety_mode ?? "read_only" }),
      /* @__PURE__ */ e(
        J,
        {
          label: "Local model detect",
          value: n.auto_detect_local_models ? "on" : "off"
        }
      )
    ] }),
    /* @__PURE__ */ a(q, { children: [
      /* @__PURE__ */ e(P, { children: "Resolved roster" }),
      u.length > 0 ? /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1.5", children: u.map((i) => /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ e("span", { className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]", children: i.id }),
        /* @__PURE__ */ e("span", { className: "text-muted text-xs", children: i.default_model ?? "(agent default)" }),
        /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-auto", children: i.source })
      ] }, i.id)) }) : r.allowlist_configured ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-2", children: d.map((i) => /* @__PURE__ */ e(
        "span",
        {
          className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
          children: i
        },
        i
      )) }) : /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-1", children: [
        "No ",
        /* @__PURE__ */ e("code", { children: "enabled_agents" }),
        " allowlist configured — Rutherford enables every built-in agent plus any configured agent (source: ",
        r.enabled_source || "default",
        ")."
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a(q, { children: [
      /* @__PURE__ */ e(P, { children: "Config locations" }),
      ((f = t.config_locations) == null ? void 0 : f.global) && /* @__PURE__ */ e(V, { meta: t.config_locations.global }),
      ((g = t.config_locations) == null ? void 0 : g.workspace) && /* @__PURE__ */ e(V, { meta: t.config_locations.workspace })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a(q, { children: [
      /* @__PURE__ */ e(P, { children: /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(Ae, { size: 14 }),
        " acp.json (agent servers)"
      ] }) }),
      c.map((i) => {
        const v = Object.keys(i.agent_servers || {});
        return /* @__PURE__ */ a("div", { className: "mt-2", children: [
          /* @__PURE__ */ e(V, { meta: i }),
          v.length > 0 && /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-1", children: v.map((S) => /* @__PURE__ */ e(
            "span",
            {
              className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
              children: S
            },
            S
          )) })
        ] }, i.path);
      })
    ] }),
    m.length > 0 && /* @__PURE__ */ a(I, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(q, { children: [
        /* @__PURE__ */ e(P, { children: "Environment overrides" }),
        /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1", children: m.map((i) => /* @__PURE__ */ a("div", { className: "text-xs", children: [
          /* @__PURE__ */ e("code", { children: i }),
          " = ",
          /* @__PURE__ */ e("code", { className: "text-muted", children: String((t.env_overrides || {})[i]) })
        ] }, i)) }),
        (t.env_overrides || {})._note && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-2", children: String((t.env_overrides || {})._note) })
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a(q, { children: [
      /* @__PURE__ */ e(P, { children: "Reachability" }),
      /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: ((_ = t.reachability) == null ? void 0 : _.note) ?? "—" })
    ] })
  ] });
}
function te({ text: t }) {
  return t ? /* @__PURE__ */ e(
    "span",
    {
      className: "inline-flex items-center justify-center align-middle ml-1 text-muted opacity-60 hover:opacity-100 cursor-help",
      title: t,
      "aria-label": t,
      role: "img",
      children: /* @__PURE__ */ e(pe, { size: 12 })
    }
  ) : null;
}
function he({ required: t }) {
  return t ? /* @__PURE__ */ e("span", { className: "text-amber-500 ml-1", title: "Required", children: "*" }) : /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-1.5", children: "optional" });
}
function M({
  label: t,
  hint: r,
  help: d,
  required: u,
  absent: c,
  children: n
}) {
  return /* @__PURE__ */ a("label", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ a("span", { className: "text-sm text-[var(--fg,#eee)] flex items-center flex-wrap", children: [
      t,
      r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r }),
      d && /* @__PURE__ */ e(te, { text: d }),
      u !== void 0 && /* @__PURE__ */ e(he, { required: u })
    ] }),
    c && /* @__PURE__ */ a("span", { className: "text-[11px] text-muted -mt-0.5", children: [
      "absent → ",
      c
    ] }),
    n
  ] });
}
const z = "px-2 py-1.5 text-sm rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)] text-[var(--fg,#eee)] outline-none focus:border-[var(--accent,#6366f1)]";
function le({
  label: t,
  hint: r,
  help: d,
  required: u,
  absent: c,
  values: n,
  onChange: l
}) {
  const [m, f] = k("");
  return /* @__PURE__ */ a("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ a("span", { className: "text-sm text-[var(--fg,#eee)] flex items-center flex-wrap", children: [
      t,
      r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r }),
      d && /* @__PURE__ */ e(te, { text: d }),
      u !== void 0 && /* @__PURE__ */ e(he, { required: u })
    ] }),
    c && /* @__PURE__ */ a("span", { className: "text-[11px] text-muted -mt-0.5", children: [
      "empty → ",
      c
    ] }),
    /* @__PURE__ */ a("div", { className: "flex flex-col gap-1.5", children: [
      n.map((g, _) => /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: z + " flex-1",
            value: g,
            onChange: (i) => {
              const v = n.slice();
              v[_] = i.target.value, l(v);
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-amber-500",
            onClick: () => l(n.filter((i, v) => v !== _)),
            title: "Remove",
            children: /* @__PURE__ */ e(ie, { size: 14 })
          }
        )
      ] }, _)),
      /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: z + " flex-1",
            placeholder: `Add ${t}…`,
            value: m,
            onChange: (g) => f(g.target.value),
            onKeyDown: (g) => {
              g.key === "Enter" && m.trim() && (l([...n, m.trim()]), f(""));
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-[var(--accent,#6366f1)]",
            onClick: () => {
              m.trim() && (l([...n, m.trim()]), f(""));
            },
            title: "Add",
            children: /* @__PURE__ */ e(Z, { size: 14 })
          }
        )
      ] })
    ] })
  ] });
}
function oe({
  value: t,
  onChange: r,
  srLabel: d
}) {
  const [u, c] = k(!1);
  return /* @__PURE__ */ e(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": t,
      "aria-label": d,
      onClick: () => r(!t),
      onFocus: () => c(!0),
      onBlur: () => c(!1),
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
        boxShadow: u ? "0 0 0 2px var(--accent, #7c3aed)" : "none"
      },
      children: /* @__PURE__ */ e(
        "span",
        {
          "aria-hidden": "true",
          style: {
            position: "absolute",
            top: 2,
            left: t ? 22 : 2,
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
function de({
  label: t,
  hint: r,
  help: d,
  absent: u,
  value: c,
  onChange: n
}) {
  return /* @__PURE__ */ a("label", { className: "flex items-start gap-2.5 cursor-pointer", children: [
    /* @__PURE__ */ e("span", { className: "mt-0.5", children: /* @__PURE__ */ e(oe, { value: c, onChange: n, srLabel: t || void 0 }) }),
    /* @__PURE__ */ a("span", { className: "flex flex-col", children: [
      /* @__PURE__ */ a("span", { className: "text-sm text-[var(--fg,#eee)] flex items-center flex-wrap", children: [
        t,
        r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r }),
        d && /* @__PURE__ */ e(te, { text: d })
      ] }),
      u && /* @__PURE__ */ a("span", { className: "text-[11px] text-muted", children: [
        "absent → ",
        u
      ] })
    ] })
  ] });
}
const De = {
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
function Te(t) {
  const r = t.config || {}, d = (n) => {
    const l = r[n];
    return typeof l == "number" && Number.isFinite(l) ? String(l) : typeof l == "string" && l.trim() !== "" && Number.isFinite(Number(l)) ? String(Number(l)) : "";
  }, u = t.derived || {}, c = (n) => Array.isArray(n) ? n.filter((l) => typeof l == "string") : [];
  return {
    default_safety_mode: typeof r.default_safety_mode == "string" ? r.default_safety_mode : "read_only",
    default_timeout_s: d("default_timeout_s"),
    max_targets: d("max_targets"),
    auto_detect_local_models: r.auto_detect_local_models === !0,
    default_persistence: typeof r.default_persistence == "string" ? r.default_persistence : "ephemeral",
    synthesize_default: r.synthesize_default === !0,
    enabled_agents: c(u.enabled_agents),
    trusted_workspaces: c(u.trusted_workspaces),
    role_dirs: c(u.role_dirs),
    agents: (Array.isArray(t.agents) ? t.agents : []).map((n) => ({
      ...n,
      env: { ...n.env || {} },
      extra: { ...n.extra || {} }
    }))
  };
}
function qe(t, r) {
  if (!r || typeof r != "object") return !1;
  const d = (u, c) => String(u) === String(c);
  for (const [u, c] of Object.entries(t)) {
    const n = r[u];
    if (u === "agents") {
      const l = c && typeof c == "object" ? Object.keys(c).sort() : [], m = n && typeof n == "object" ? Object.keys(n).sort() : [];
      if (l.length !== m.length || l.some((f, g) => f !== m[g])) return !1;
      continue;
    }
    if (Array.isArray(c)) {
      if (!Array.isArray(n) || n.length !== c.length || c.some((l, m) => !d(l, n[m]))) return !1;
      continue;
    }
    if (!d(c, n)) return !1;
  }
  return !0;
}
function Pe(t, r) {
  const d = { ...t.config };
  delete d.agents;
  const u = (l, m) => {
    if (m.trim() === "") delete d[l];
    else {
      const f = Number(m);
      Number.isNaN(f) || (d[l] = f);
    }
  };
  d.default_safety_mode = r.default_safety_mode, u("default_timeout_s", r.default_timeout_s), u("max_targets", r.max_targets), d.auto_detect_local_models = r.auto_detect_local_models, d.default_persistence = r.default_persistence, d.synthesize_default = r.synthesize_default;
  const c = (l, m) => {
    const f = m.map((g) => g.trim()).filter(Boolean);
    f.length ? d[l] = f : delete d[l];
  };
  c("enabled_agents", r.enabled_agents), c("trusted_workspaces", r.trusted_workspaces), c("role_dirs", r.role_dirs);
  const n = {};
  for (const l of r.agents) {
    const m = l.id.trim();
    if (!m) continue;
    const f = { ...l.extra };
    l.default_model != null && String(l.default_model).trim() !== "" && (f.default_model = l.default_model), f.enabled = l.enabled, l.env && Object.keys(l.env).length && (f.env = l.env), n[m] = f;
  }
  return Object.keys(n).length && (d.agents = n), d;
}
function xe({
  value: t,
  options: r,
  freeText: d,
  onChange: u,
  listId: c,
  placeholder: n
}) {
  const l = Array.isArray(r) ? r : [];
  return d ? /* @__PURE__ */ a(I, { children: [
    /* @__PURE__ */ e(
      "input",
      {
        className: z,
        value: t,
        list: c,
        placeholder: n,
        onChange: (m) => u(m.target.value)
      }
    ),
    /* @__PURE__ */ e("datalist", { id: c, children: l.map((m) => /* @__PURE__ */ e("option", { value: m }, m)) })
  ] }) : /* @__PURE__ */ a("select", { className: z, value: t, onChange: (m) => u(m.target.value), children: [
    t !== "" && !l.includes(t) && /* @__PURE__ */ e("option", { value: t, children: t }),
    l.map((m) => /* @__PURE__ */ e("option", { value: m, children: m }, m))
  ] });
}
function Le({
  config: t,
  meta: r,
  scope: d,
  onScope: u,
  onSave: c
}) {
  const [n, l] = k(null), [m, f] = k(!1), [g, _] = k(null), i = Array.isArray(r == null ? void 0 : r.safety_modes) && r.safety_modes.length ? r.safety_modes : ze, v = Array.isArray(r == null ? void 0 : r.persistence) && r.persistence.length ? r.persistence : $e, S = Array.isArray(r == null ? void 0 : r.agent_ids) ? r.agent_ids : [], D = fe(r), B = !!t && t.scope === d;
  Q(() => {
    if (!t || t.scope !== d) {
      l((o) => o ?? null);
      return;
    }
    _(null), l(Te(t));
  }, [t, d]);
  const b = (o) => l(($) => $ && { ...$, ...o }), W = async () => {
    if (!(!t || !n)) {
      f(!0), _(null);
      try {
        await c(d, Pe(t, n)), _({ ok: !0, text: `Saved to ${d} config.toml (backup written).` });
      } catch (o) {
        _({ ok: !1, text: o instanceof Error ? o.message : String(o) });
      } finally {
        f(!1);
      }
    }
  }, h = De;
  return /* @__PURE__ */ a(I, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((o) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => u(o),
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (d === o ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: o === "global" ? "Global" : "Workspace"
        },
        o
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: () => void W(),
          disabled: m || !n,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(ne, { size: 14 }),
            " ",
            m ? "Saving…" : `Save ${d}`
          ]
        }
      )
    ] }),
    !r && /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-xs text-muted mb-3", children: [
      /* @__PURE__ */ e(X, { size: 13 }),
      " Option lists (dropdowns) could not be loaded from the backend — showing free-text inputs instead."
    ] }),
    g && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (g.ok ? "text-green-500" : "text-amber-500"),
        children: [
          g.ok ? /* @__PURE__ */ e(ee, { size: 15 }) : /* @__PURE__ */ e(X, { size: 15 }),
          g.text
        ]
      }
    ),
    !B || !n ? /* @__PURE__ */ a("p", { className: "text-sm text-muted", children: [
      "Loading ",
      d,
      " config…"
    ] }) : /* @__PURE__ */ a(I, { children: [
      /* @__PURE__ */ a(q, { children: [
        /* @__PURE__ */ e(P, { children: "Defaults" }),
        /* @__PURE__ */ e(V, { meta: t }),
        !t.exists && /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-2", children: [
          "No ",
          /* @__PURE__ */ e("code", { children: "config.toml" }),
          " at this scope yet — no file yet; defaults apply; saving creates it (",
          /* @__PURE__ */ e("code", { children: t.path }),
          ")."
        ] }),
        /* @__PURE__ */ a("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            M,
            {
              label: h.default_safety_mode.label,
              hint: h.default_safety_mode.key,
              help: h.default_safety_mode.help,
              required: h.default_safety_mode.required,
              absent: h.default_safety_mode.absent,
              children: /* @__PURE__ */ e(
                "select",
                {
                  className: z,
                  value: n.default_safety_mode,
                  onChange: (o) => b({ default_safety_mode: o.target.value }),
                  children: i.map((o) => /* @__PURE__ */ e("option", { value: o, children: o }, o))
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            M,
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
                  className: z,
                  value: n.default_timeout_s,
                  onChange: (o) => b({ default_timeout_s: o.target.value })
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            M,
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
                  className: z,
                  value: n.max_targets,
                  onChange: (o) => b({ max_targets: o.target.value })
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            M,
            {
              label: h.default_persistence.label,
              hint: h.default_persistence.key,
              help: h.default_persistence.help,
              required: h.default_persistence.required,
              absent: h.default_persistence.absent,
              children: /* @__PURE__ */ e(
                "select",
                {
                  className: z,
                  value: n.default_persistence,
                  onChange: (o) => b({ default_persistence: o.target.value }),
                  children: v.map((o) => /* @__PURE__ */ e("option", { value: o, children: o }, o))
                }
              )
            }
          )
        ] }),
        /* @__PURE__ */ a("div", { className: "flex flex-wrap gap-6 mt-4", children: [
          /* @__PURE__ */ e(
            de,
            {
              label: h.auto_detect_local_models.label,
              hint: h.auto_detect_local_models.key,
              help: h.auto_detect_local_models.help,
              absent: h.auto_detect_local_models.absent,
              value: n.auto_detect_local_models,
              onChange: (o) => b({ auto_detect_local_models: o })
            }
          ),
          /* @__PURE__ */ e(
            de,
            {
              label: h.synthesize_default.label,
              hint: h.synthesize_default.key,
              help: h.synthesize_default.help,
              absent: h.synthesize_default.absent,
              value: n.synthesize_default,
              onChange: (o) => b({ synthesize_default: o })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(q, { children: [
        /* @__PURE__ */ e(P, { children: "Allowlists & directories" }),
        /* @__PURE__ */ a("div", { className: "grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            le,
            {
              label: h.enabled_agents.label,
              hint: h.enabled_agents.key,
              help: h.enabled_agents.help,
              required: h.enabled_agents.required,
              absent: h.enabled_agents.absent,
              values: n.enabled_agents,
              onChange: (o) => b({ enabled_agents: o })
            }
          ),
          /* @__PURE__ */ e(
            le,
            {
              label: h.trusted_workspaces.label,
              hint: h.trusted_workspaces.key,
              help: h.trusted_workspaces.help,
              required: h.trusted_workspaces.required,
              absent: h.trusted_workspaces.absent,
              values: n.trusted_workspaces,
              onChange: (o) => b({ trusted_workspaces: o })
            }
          ),
          /* @__PURE__ */ e(
            le,
            {
              label: h.role_dirs.label,
              hint: h.role_dirs.key,
              help: h.role_dirs.help,
              required: h.role_dirs.required,
              absent: h.role_dirs.absent,
              values: n.role_dirs,
              onChange: (o) => b({ role_dirs: o })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(q, { children: [
        /* @__PURE__ */ e(P, { children: "Per-agent overrides" }),
        /* @__PURE__ */ a("p", { className: "text-[11px] text-muted mt-1 flex items-center flex-wrap", children: [
          /* @__PURE__ */ e("code", { className: "text-[10px] opacity-70", children: "[agents.*]" }),
          /* @__PURE__ */ e("span", { className: "ml-1.5", children: "per-agent default model and enabled flag." }),
          /* @__PURE__ */ e(te, { text: h.agent_override.help }),
          /* @__PURE__ */ a("span", { className: "ml-1.5", children: [
            "absent → ",
            h.agent_override.absent
          ] })
        ] }),
        /* @__PURE__ */ a("div", { className: "mt-3 flex flex-col gap-2", children: [
          n.agents.length > 0 && /* @__PURE__ */ a("div", { className: "flex items-center gap-2 px-2 text-[10px] uppercase tracking-wide text-muted opacity-70", children: [
            /* @__PURE__ */ e("span", { className: "w-40", children: "Agent (id)" }),
            /* @__PURE__ */ e("span", { className: "flex-1", children: "Default model (free text)" }),
            /* @__PURE__ */ e("span", { children: "Enabled" }),
            /* @__PURE__ */ e("span", { className: "w-6" })
          ] }),
          n.agents.map((o, $) => /* @__PURE__ */ a(
            "div",
            {
              className: "flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]",
              children: [
                /* @__PURE__ */ e("div", { className: "w-40", children: /* @__PURE__ */ e(
                  xe,
                  {
                    value: o.id,
                    options: S,
                    freeText: D,
                    listId: `agent-ids-${$}`,
                    placeholder: "agent id",
                    onChange: (y) => {
                      const N = n.agents.slice();
                      N[$] = { ...o, id: y }, b({ agents: N });
                    }
                  }
                ) }),
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: z + " flex-1",
                    value: o.default_model ?? "",
                    placeholder: "Default model (blank = agent default)",
                    onChange: (y) => {
                      const N = n.agents.slice();
                      N[$] = { ...o, default_model: y.target.value }, b({ agents: N });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  oe,
                  {
                    value: o.enabled,
                    srLabel: `Enabled: ${o.id || "agent"}`,
                    onChange: (y) => {
                      const N = n.agents.slice();
                      N[$] = { ...o, enabled: y }, b({ agents: N });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "p-1 text-muted hover:text-amber-500",
                    onClick: () => b({ agents: n.agents.filter((y, N) => N !== $) }),
                    title: "Remove agent",
                    children: /* @__PURE__ */ e(ie, { size: 14 })
                  }
                )
              ]
            },
            $
          )),
          /* @__PURE__ */ a(
            "button",
            {
              className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
              onClick: () => b({
                agents: [
                  ...n.agents,
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
const se = [
  { key: "model", label: "model", placeholder: "agent default (free text)" },
  { key: "label", label: "label", placeholder: "result key" },
  { key: "stance", label: "stance", placeholder: "for / against / neutral" }
];
function Oe(t) {
  return {
    ...t,
    seats: (Array.isArray(t.seats) ? t.seats : []).map((r) => ({ ...r })),
    extra: { ...t.extra || {} }
  };
}
function Fe() {
  return {
    name: "",
    description: "",
    strategy: "all-voices",
    targets: 1,
    seats: [{ cli: "" }],
    extra: {}
  };
}
function Me(t) {
  return t.map((r) => ({
    name: r.name.trim(),
    description: (r.description || "").trim(),
    strategy: (r.strategy || "").trim(),
    targets: (r.seats || []).length,
    extra: r.extra || {},
    seats: (r.seats || []).map((d) => {
      const u = { cli: String(d.cli || "").trim() };
      for (const [c, n] of Object.entries(d))
        if (c !== "cli" && n != null)
          if (typeof n == "string") {
            const l = n.trim();
            l !== "" && (u[c] = l);
          } else
            u[c] = n;
      return u;
    })
  }));
}
function Ie({
  seat: t,
  meta: r,
  index: d,
  onChange: u,
  onRemove: c
}) {
  const n = (i, v) => u({ ...t, [i]: v }), l = Array.isArray(r == null ? void 0 : r.agent_ids) ? r.agent_ids : [], m = fe(r), f = Array.isArray(r == null ? void 0 : r.roles) ? r.roles : [], g = /* @__PURE__ */ new Set([
    "cli",
    "role",
    ...se.map((i) => i.key),
    "weight",
    "parity"
  ]), _ = Object.keys(t).filter((i) => !g.has(i));
  return /* @__PURE__ */ a("div", { className: "p-2.5 rounded bg-[var(--surface-3,#232323)] border border-[var(--border,#2a2a2a)]", children: [
    /* @__PURE__ */ a("div", { className: "grid gap-2 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]", children: [
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ a("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: [
          "cli",
          /* @__PURE__ */ e("span", { className: "text-amber-500", children: " *" })
        ] }),
        /* @__PURE__ */ e(
          xe,
          {
            value: t.cli != null ? String(t.cli) : "",
            options: l,
            freeText: m,
            listId: `seat-cli-${d}`,
            placeholder: "agent id (required)",
            onChange: (i) => n("cli", i)
          }
        )
      ] }),
      se.filter((i) => i.key === "model").map((i) => /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: i.label }),
        /* @__PURE__ */ e(
          "input",
          {
            className: z,
            value: t[i.key] != null ? String(t[i.key]) : "",
            placeholder: i.placeholder,
            onChange: (v) => n(i.key, v.target.value)
          }
        )
      ] }, i.key)),
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "role" }),
        /* @__PURE__ */ a(
          "select",
          {
            className: z,
            value: t.role != null ? String(t.role) : "",
            onChange: (i) => n("role", i.target.value),
            children: [
              /* @__PURE__ */ e("option", { value: "", children: "(none)" }),
              t.role && !f.includes(String(t.role)) && /* @__PURE__ */ e("option", { value: String(t.role), children: String(t.role) }),
              f.map((i) => /* @__PURE__ */ e("option", { value: i, children: i }, i))
            ]
          }
        )
      ] }),
      se.filter((i) => i.key !== "model").map((i) => /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: i.label }),
        /* @__PURE__ */ e(
          "input",
          {
            className: z,
            value: t[i.key] != null ? String(t[i.key]) : "",
            placeholder: i.placeholder,
            onChange: (v) => n(i.key, v.target.value)
          }
        )
      ] }, i.key)),
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "weight" }),
        /* @__PURE__ */ e(
          "input",
          {
            className: z,
            type: "number",
            value: t.weight != null ? String(t.weight) : "",
            placeholder: "—",
            onChange: (i) => {
              const v = i.target.value.trim(), S = { ...t };
              v === "" ? delete S.weight : S.weight = Number(v), u(S);
            }
          }
        )
      ] }),
      /* @__PURE__ */ a("div", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "parity" }),
        /* @__PURE__ */ e("span", { className: "mt-0.5", children: /* @__PURE__ */ e(
          oe,
          {
            value: t.parity === !0,
            srLabel: "Parity counterweight seat",
            onChange: (i) => {
              const v = { ...t };
              i ? v.parity = !0 : delete v.parity, u(v);
            }
          }
        ) })
      ] })
    ] }),
    _.length > 0 && /* @__PURE__ */ a("p", { className: "text-[10px] text-muted mt-1.5", children: [
      "preserved on save:",
      " ",
      _.map((i) => /* @__PURE__ */ a("code", { className: "mr-1.5", children: [
        i,
        "=",
        String(t[i])
      ] }, i))
    ] }),
    /* @__PURE__ */ a(
      "button",
      {
        className: "mt-1.5 flex items-center gap-1 text-[11px] text-muted hover:text-amber-500",
        onClick: c,
        title: "Remove seat",
        children: [
          /* @__PURE__ */ e(ie, { size: 12 }),
          " Remove seat"
        ]
      }
    )
  ] });
}
function Be({
  panel: t,
  meta: r,
  onChange: d,
  onDelete: u
}) {
  const [c, n] = k(!1), l = Array.isArray(t.seats) ? t.seats : [], m = Array.isArray(r == null ? void 0 : r.strategies) && r.strategies.length ? r.strategies : Ee;
  return /* @__PURE__ */ a("div", { className: "p-3 rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)]", children: [
    /* @__PURE__ */ a("div", { className: "grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]", children: [
      /* @__PURE__ */ e(M, { label: "Name", hint: "panel key", required: !0, children: /* @__PURE__ */ e(
        "input",
        {
          className: z,
          value: t.name,
          placeholder: "panel-name",
          onChange: (f) => d({ ...t, name: f.target.value })
        }
      ) }),
      /* @__PURE__ */ e(
        M,
        {
          label: "Strategy",
          hint: "strategy",
          help: "How the panel's voices are reduced to an outcome. all-voices returns every voice; the rest collapse to one verdict (unanimous, majority, plurality, weighted, parity-pair, rank).",
          children: /* @__PURE__ */ a(
            "select",
            {
              className: z,
              value: t.strategy || "all-voices",
              onChange: (f) => d({ ...t, strategy: f.target.value }),
              children: [
                t.strategy && !m.includes(t.strategy) && /* @__PURE__ */ e("option", { value: t.strategy, children: t.strategy }),
                m.map((f) => /* @__PURE__ */ e("option", { value: f, children: f }, f))
              ]
            }
          )
        }
      )
    ] }),
    /* @__PURE__ */ e("div", { className: "mt-2.5", children: /* @__PURE__ */ e(M, { label: "Description", hint: "description", children: /* @__PURE__ */ e(
      "input",
      {
        className: z,
        value: t.description || "",
        placeholder: "Human label for this panel",
        onChange: (f) => d({ ...t, description: f.target.value })
      }
    ) }) }),
    /* @__PURE__ */ a("div", { className: "mt-3", children: [
      /* @__PURE__ */ e("div", { className: "flex items-center gap-2 mb-1.5", children: /* @__PURE__ */ a("span", { className: "text-xs font-medium text-[var(--fg,#eee)]", children: [
        "Seats ",
        /* @__PURE__ */ a("span", { className: "text-muted", children: [
          "(",
          l.length,
          ")"
        ] })
      ] }) }),
      /* @__PURE__ */ a("div", { className: "flex flex-col gap-2", children: [
        l.map((f, g) => /* @__PURE__ */ e(
          Ie,
          {
            seat: f,
            meta: r,
            index: g,
            onChange: (_) => {
              const i = l.slice();
              i[g] = _, d({ ...t, seats: i });
            },
            onRemove: () => d({ ...t, seats: l.filter((_, i) => i !== g) })
          },
          g
        )),
        /* @__PURE__ */ a(
          "button",
          {
            className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
            onClick: () => d({ ...t, seats: [...l, { cli: "" }] }),
            children: [
              /* @__PURE__ */ e(Z, { size: 14 }),
              " Add seat"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "mt-3 pt-2.5 border-t border-[var(--border,#2a2a2a)] flex items-center", children: c ? /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-xs", children: [
      /* @__PURE__ */ a("span", { className: "text-amber-500", children: [
        "Delete “",
        t.name || "unnamed",
        "”?"
      ] }),
      /* @__PURE__ */ e(
        "button",
        {
          className: "px-2 py-0.5 rounded bg-amber-600/80 text-white hover:bg-amber-600",
          onClick: u,
          children: "Delete"
        }
      ),
      /* @__PURE__ */ e("button", { className: "px-2 py-0.5 rounded text-muted hover:text-[var(--fg,#eee)]", onClick: () => n(!1), children: "Cancel" })
    ] }) : /* @__PURE__ */ a(
      "button",
      {
        className: "flex items-center gap-1.5 text-xs text-muted hover:text-amber-500",
        onClick: () => n(!0),
        children: [
          /* @__PURE__ */ e(me, { size: 13 }),
          " Delete panel"
        ]
      }
    ) })
  ] });
}
function Ke({
  panels: t,
  meta: r,
  onSave: d
}) {
  const [u, c] = k("global"), [n, l] = k(null), [m, f] = k(!1), [g, _] = k(null), [i, v] = k(null), [S, D] = k(!1), b = (Array.isArray(t == null ? void 0 : t.sources) ? t.sources : []).find((y) => y.scope === u) || null, W = JSON.stringify((b == null ? void 0 : b.panels) ?? null) + "|" + u;
  Q(() => {
    if (!b) {
      l(null);
      return;
    }
    _(null), D(!1), l((b.panels || []).map(Oe));
  }, [W]);
  const h = (y, N) => l((C) => C && C.map((K, F) => F === y ? N : K)), o = () => {
    if (!n) return null;
    const y = /* @__PURE__ */ new Set();
    for (const N of n) {
      const C = N.name.trim();
      if (!C) return "Every panel needs a name.";
      if (y.has(C)) return `Duplicate panel name “${C}”.`;
      y.add(C);
      const K = Array.isArray(N.seats) ? N.seats : [];
      if (K.length === 0) return `Panel “${C}” needs at least one seat.`;
      if (K.some((F) => !String(F.cli || "").trim()))
        return `Panel “${C}” has a seat missing a cli.`;
    }
    return null;
  }, $ = async () => {
    if (!n) return;
    const y = o();
    if (y) {
      _({ ok: !1, text: y });
      return;
    }
    f(!0), _(null), v(null), D(!1);
    try {
      await d(u, Me(n)), _({ ok: !0, text: `Saved to ${u} panels.toon (backup written).` }), v(u);
    } catch (N) {
      _({ ok: !1, text: N instanceof Error ? N.message : String(N) });
    } finally {
      f(!1);
    }
  };
  return /* @__PURE__ */ a(I, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((y) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => {
            v(null), D(!1), c(y);
          },
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (u === y ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: y === "global" ? "Global" : "Workspace"
        },
        y
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: () => void $(),
          disabled: m || !n,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(ne, { size: 14 }),
            " ",
            m ? "Saving…" : `Save ${u}`
          ]
        }
      )
    ] }),
    g && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (g.ok ? "text-green-500" : "text-amber-500"),
        children: [
          g.ok ? /* @__PURE__ */ e(ee, { size: 15 }) : /* @__PURE__ */ e(X, { size: 15 }),
          g.text
        ]
      }
    ),
    i === u && /* @__PURE__ */ a("div", { className: "flex items-start gap-2 text-sm mb-4 rounded border border-[var(--border,#333)] bg-[var(--surface-2,#2a2a2a)] px-3 py-2.5", children: [
      /* @__PURE__ */ e(pe, { size: 15, className: "mt-0.5 shrink-0 text-[var(--accent,#6366f1)]" }),
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
              var C;
              const y = "reload_panels", N = () => {
                D(!0), window.setTimeout(() => D(!1), 2e3);
              };
              try {
                (C = navigator.clipboard) == null || C.writeText(y).then(N, () => D(!1));
              } catch {
                D(!1);
              }
            },
            className: "self-start flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-[var(--surface,#1e1e1e)] border border-[var(--border,#333)] text-[var(--fg,#eee)] hover:border-[var(--accent,#6366f1)]",
            children: [
              S ? /* @__PURE__ */ e(ee, { size: 13 }) : /* @__PURE__ */ e(ue, { size: 13 }),
              S ? "Copied" : "Copy reload_panels"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ a(q, { children: [
      /* @__PURE__ */ a(P, { children: [
        "Named panels · ",
        u
      ] }),
      b && /* @__PURE__ */ e(V, { meta: b }),
      (b == null ? void 0 : b.error) && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-1", children: b.error }),
      b && !b.exists && /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-2", children: [
        "No file at this scope yet — saving creates ",
        /* @__PURE__ */ e("code", { children: b.path }),
        "."
      ] }),
      n === null ? /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-2", children: [
        "Loading ",
        u,
        " panels…"
      ] }) : /* @__PURE__ */ a("div", { className: "mt-3 flex flex-col gap-3", children: [
        n.length === 0 && /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No panels defined at this scope. Add one below." }),
        n.map((y, N) => /* @__PURE__ */ e(
          Be,
          {
            panel: y,
            meta: r,
            onChange: (C) => h(N, C),
            onDelete: () => l((C) => C && C.filter((K, F) => F !== N))
          },
          N
        )),
        /* @__PURE__ */ a(
          "button",
          {
            className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
            onClick: () => l((y) => [...y || [], Fe()]),
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
function We() {
  return { name: "", display_name: "", description: "", body: "", extra: {}, _new: !0 };
}
function Ge({
  roles: t,
  meta: r,
  onFetchRole: d,
  onSave: u
}) {
  const [c, n] = k("global"), [l, m] = k(null), [f, g] = k(null), [_, i] = k(!1), [v, S] = k(null), [D, B] = k(!1), [b, W] = k(null), h = Array.isArray(t == null ? void 0 : t.sources) ? t.sources : [], o = h.find((s) => s.scope === c && s.editable !== !1) || null, $ = Array.isArray(o == null ? void 0 : o.roles) ? o.roles : [], y = Array.isArray(r == null ? void 0 : r.roles_builtin) && r.roles_builtin.length ? r.roles_builtin : Array.isArray(t == null ? void 0 : t.builtin) ? t.builtin.map((s) => s.name) : [], N = h.filter((s) => s.editable === !1), C = async (s) => {
    W(s), S(null), B(!1);
    const p = await d(c, s);
    if (W(null), !p) {
      S({ ok: !1, text: `Could not open role “${s}”.` });
      return;
    }
    m({ ...p, extra: p.extra || {} }), g(s);
  }, K = () => {
    S(null), B(!1), m(We()), g(null);
  }, F = () => {
    m(null), g(null), B(!1);
  }, ae = () => {
    if (!l) return null;
    const s = l.name.trim();
    return s ? /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(s) ? y.includes(s) ? `“${s}” is a built-in role (read-only reference). Choose a different id.` : null : "Role name must be a kebab-case id (letters, digits, . _ -), no path separators." : "Role name is required.";
  }, re = async () => {
    if (!l) return;
    const s = ae();
    if (s) {
      S({ ok: !1, text: s });
      return;
    }
    i(!0), S(null);
    try {
      const p = l.name.trim();
      if (await u(c, {
        name: p,
        display_name: l.display_name || "",
        description: l.description || "",
        body: l.body || "",
        extra: l.extra || {}
      }), f && f !== p)
        try {
          await u(c, { name: f, op: "delete" });
        } catch {
        }
      S({ ok: !0, text: `Saved role “${p}” to ${c} (backup written).` }), g(p), m((E) => E && { ...E, _new: !1 });
    } catch (p) {
      S({ ok: !1, text: p instanceof Error ? p.message : String(p) });
    } finally {
      i(!1);
    }
  }, x = async () => {
    if (!(!l || !f)) {
      i(!0), S(null);
      try {
        await u(c, { name: f, op: "delete" }), S({ ok: !0, text: `Deleted role “${f}” from ${c} (backup written).` }), F();
      } catch (s) {
        S({ ok: !1, text: s instanceof Error ? s.message : String(s) });
      } finally {
        i(!1);
      }
    }
  };
  return /* @__PURE__ */ a(I, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((s) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => {
            n(s), F(), S(null);
          },
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (c === s ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: s === "global" ? "Global" : "Workspace"
        },
        s
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: K,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white",
          children: [
            /* @__PURE__ */ e(Z, { size: 14 }),
            " New role"
          ]
        }
      )
    ] }),
    v && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (v.ok ? "text-green-500" : "text-amber-500"),
        children: [
          v.ok ? /* @__PURE__ */ e(ee, { size: 15 }) : /* @__PURE__ */ e(X, { size: 15 }),
          v.text
        ]
      }
    ),
    l && /* @__PURE__ */ a(I, { children: [
      /* @__PURE__ */ a(q, { children: [
        /* @__PURE__ */ e(P, { children: /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-1.5", children: [
          /* @__PURE__ */ e(ce, { size: 14 }),
          " ",
          l._new ? "New role" : `Edit role · ${f}`,
          " · ",
          c
        ] }) }),
        o && /* @__PURE__ */ e(V, { meta: o }),
        /* @__PURE__ */ a("div", { className: "grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            M,
            {
              label: "Role id (file name)",
              hint: "<id>.md",
              help: "The role's id and file stem. Kebab-case: letters, digits, . _ - — no path separators. Referenced from a panel seat's role field.",
              required: !0,
              children: /* @__PURE__ */ e(
                "input",
                {
                  className: z,
                  value: l.name,
                  placeholder: "my-reviewer",
                  onChange: (s) => m((p) => p && { ...p, name: s.target.value })
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            M,
            {
              label: "Display name",
              hint: "display_name",
              help: "Optional human-friendly name shown in listings.",
              required: !1,
              children: /* @__PURE__ */ e(
                "input",
                {
                  className: z,
                  value: l.display_name,
                  placeholder: "My Reviewer",
                  onChange: (s) => m((p) => p && { ...p, display_name: s.target.value })
                }
              )
            }
          )
        ] }),
        /* @__PURE__ */ e("div", { className: "mt-2.5", children: /* @__PURE__ */ e(
          M,
          {
            label: "Description",
            hint: "description",
            help: "One-line summary of what this persona is for.",
            required: !1,
            children: /* @__PURE__ */ e(
              "input",
              {
                className: z,
                value: l.description,
                placeholder: "Short description of this persona",
                onChange: (s) => m((p) => p && { ...p, description: s.target.value })
              }
            )
          }
        ) }),
        /* @__PURE__ */ e("div", { className: "mt-2.5", children: /* @__PURE__ */ e(
          M,
          {
            label: "System prompt (body)",
            hint: "markdown body",
            help: "The persona's system prompt, prepended to the task. This is the file body below the frontmatter.",
            required: !0,
            children: /* @__PURE__ */ e(
              "textarea",
              {
                className: z + " min-h-[220px] font-mono text-[12px] leading-relaxed",
                value: l.body,
                placeholder: "You are a principal-level reviewer. …",
                onChange: (s) => m((p) => p && { ...p, body: s.target.value })
              }
            )
          }
        ) }),
        l.extra && Object.keys(l.extra).length > 0 && /* @__PURE__ */ a("p", { className: "text-[10px] text-muted mt-2", children: [
          "preserved frontmatter:",
          " ",
          Object.entries(l.extra).map(([s, p]) => /* @__PURE__ */ a("code", { className: "mr-1.5", children: [
            s,
            "=",
            String(p)
          ] }, s))
        ] }),
        /* @__PURE__ */ a("div", { className: "mt-3 pt-2.5 border-t border-[var(--border,#2a2a2a)] flex items-center gap-2", children: [
          /* @__PURE__ */ a(
            "button",
            {
              onClick: () => void re(),
              disabled: _,
              className: "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
              children: [
                /* @__PURE__ */ e(ne, { size: 14 }),
                " ",
                _ ? "Saving…" : `Save to ${c}`
              ]
            }
          ),
          /* @__PURE__ */ e(
            "button",
            {
              onClick: F,
              className: "px-3 py-1.5 text-sm rounded text-muted hover:text-[var(--fg,#eee)]",
              children: "Close"
            }
          ),
          f && !l._new && /* @__PURE__ */ e("div", { className: "ml-auto flex items-center", children: D ? /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-xs", children: [
            /* @__PURE__ */ a("span", { className: "text-amber-500", children: [
              "Delete “",
              f,
              "”?"
            ] }),
            /* @__PURE__ */ e(
              "button",
              {
                className: "px-2 py-0.5 rounded bg-amber-600/80 text-white hover:bg-amber-600 disabled:opacity-50",
                disabled: _,
                onClick: () => void x(),
                children: "Delete"
              }
            ),
            /* @__PURE__ */ e(
              "button",
              {
                className: "px-2 py-0.5 rounded text-muted hover:text-[var(--fg,#eee)]",
                onClick: () => B(!1),
                children: "Cancel"
              }
            )
          ] }) : /* @__PURE__ */ a(
            "button",
            {
              className: "flex items-center gap-1.5 text-xs text-muted hover:text-amber-500",
              onClick: () => B(!0),
              children: [
                /* @__PURE__ */ e(me, { size: 13 }),
                " Delete role"
              ]
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" })
    ] }),
    /* @__PURE__ */ a(q, { children: [
      /* @__PURE__ */ e(P, { children: /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(Ce, { size: 14 }),
        " Role files · ",
        c,
        " (editable)"
      ] }) }),
      o ? /* @__PURE__ */ e(V, { meta: o }) : /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-1", children: [
        "No editable roles directory resolved for ",
        c,
        "."
      ] }),
      (o == null ? void 0 : o.error) && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-1", children: o.error }),
      o && !o.exists && /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-2", children: [
        "No roles directory at this scope yet — saving a role creates ",
        /* @__PURE__ */ e("code", { children: o.path }),
        "."
      ] }),
      $.length === 0 ? /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-2", children: [
        "No role files at this scope. Click ",
        /* @__PURE__ */ e("strong", { children: "New role" }),
        " to add one."
      ] }) : /* @__PURE__ */ e("div", { className: "mt-3 flex flex-col gap-1.5", children: $.map((s) => /* @__PURE__ */ a(
        "div",
        {
          className: "flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]",
          children: [
            /* @__PURE__ */ e("span", { className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-3,#2a2a2a)] text-[var(--fg,#eee)]", children: s.name }),
            s.description && /* @__PURE__ */ e("span", { className: "text-xs text-muted truncate flex-1", children: s.description }),
            s.error && /* @__PURE__ */ e("span", { className: "text-xs text-amber-500", children: s.error }),
            /* @__PURE__ */ a(
              "button",
              {
                className: "ml-auto flex items-center gap-1 text-xs text-muted hover:text-[var(--accent,#6366f1)]",
                onClick: () => void C(s.name),
                disabled: b === s.name,
                children: [
                  /* @__PURE__ */ e(ce, { size: 12 }),
                  " ",
                  b === s.name ? "Opening…" : "Edit"
                ]
              }
            )
          ]
        },
        s.path || s.name
      )) })
    ] }),
    y.length > 0 && /* @__PURE__ */ a(I, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(q, { children: [
        /* @__PURE__ */ e(P, { children: "Built-in personas (read-only reference)" }),
        /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-1", children: [
          "These ship in the Rutherford server (not files) and cannot be edited here. Reference them from a panel seat's ",
          /* @__PURE__ */ e("code", { children: "role" }),
          " field."
        ] }),
        /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: y.map((s) => /* @__PURE__ */ e(
          "span",
          {
            className: "px-2 py-1 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-muted",
            title: "Built-in persona — read-only",
            children: s
          },
          s
        )) })
      ] })
    ] }),
    N.map(
      (s) => Array.isArray(s.roles) && s.roles.length > 0 ? /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ e("div", { className: "h-3" }),
        /* @__PURE__ */ a(q, { children: [
          /* @__PURE__ */ a(P, { children: [
            "Role files · ",
            s.scope,
            " (read-only)"
          ] }),
          /* @__PURE__ */ e(V, { meta: s }),
          /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: s.roles.map((p) => /* @__PURE__ */ e(
            "span",
            {
              className: "px-2 py-1 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-muted",
              title: p.path,
              children: p.name
            },
            p.path || p.name
          )) })
        ] })
      ] }, s.path) : null
    )
  ] });
}
export {
  Ze as default
};
