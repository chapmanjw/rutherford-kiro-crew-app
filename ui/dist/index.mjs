import { jsxs as a, Fragment as M, jsx as e } from "react/jsx-runtime";
import { useAppApi as ge } from "@kirocrew/app-sdk";
import { PageHeader as xe, StatCard as Z, Card as D, CardTitle as T } from "@kirocrew/app-sdk/ui";
import { useState as w, useRef as be, useCallback as G, useEffect as J } from "react";
import ye from "lucide-react";
const {
  Box: ve,
  FileCog: _e,
  Layers: Ne,
  UserSquare: we,
  RefreshCw: ke,
  AlertTriangle: H,
  Save: se,
  Plus: U,
  X: ne,
  CheckCircle2: ie,
  Server: Ae,
  Trash2: ue,
  Info: Se,
  Pencil: ce,
  FileText: Ce
} = ye, E = "/api/apps/rutherford", $e = [
  { id: "status", label: "Overview", icon: ve },
  { id: "config", label: "Config", icon: _e },
  { id: "panels", label: "Panels", icon: Ne },
  { id: "roles", label: "Roles", icon: we }
], ze = ["read_only", "propose", "write", "yolo"], Re = ["ephemeral", "job"], Ee = [
  "all-voices",
  "unanimous",
  "majority",
  "plurality",
  "weighted",
  "parity-pair",
  "rank"
];
function me(t) {
  const r = String((t == null ? void 0 : t.agent_ids_source) || "").toLowerCase();
  return r ? /fallback|no backend mcp|config-derived|unresolved|builtin/.test(r) : !0;
}
function K({ meta: t }) {
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
  const t = ge(), [r, d] = w("status"), [f, u] = w(!0), [i, l] = w(null), [m, h] = w(null), [b, y] = w(null), [o, g] = w("global"), [k, I] = w(null), [L, A] = w(null), [_, c] = w(null), n = be("global"), S = G(
    async (x) => {
      n.current = x;
      try {
        const s = await t.get(`${E}/rutherford-config?scope=${x}`);
        if (n.current !== x) return;
        if (!s || typeof s != "object") {
          l(`No config returned for ${x} scope.`);
          return;
        }
        I({ ...s, scope: x }), l(null);
      } catch (s) {
        if (n.current !== x) return;
        l(s instanceof Error ? s.message : String(s));
      }
    },
    [t]
  ), C = G(async () => {
    u(!0), l(null);
    try {
      const [x, s, p, R] = await Promise.all([
        // Meta is best-effort: catch so a meta failure degrades dropdowns to
        // free text but never fails the whole load.
        t.get(`${E}/rutherford-meta`).catch(() => null),
        t.get(`${E}/status`),
        t.get(`${E}/panels`),
        // FIX: roles are served at /rutherford-roles (GET+PUT share that base);
        // the old bare /roles path 404s.
        t.get(`${E}/rutherford-roles`)
      ]);
      x && typeof x == "object" && !x.error ? h(x) : h(null), y(s), A(p), c(R);
    } catch (x) {
      l(x instanceof Error ? x.message : String(x));
    } finally {
      u(!1);
    }
  }, [t]);
  J(() => {
    C();
  }, [C]), J(() => {
    S(o);
  }, [S, o]);
  const j = G((x) => {
    g(x);
  }, []), X = (x) => !!x && typeof x == "object" && x.written === !0, ee = G(
    async (x, s) => {
      const p = `${E}/rutherford-config?scope=${x}`;
      let R = await t.put(p, s);
      X(R) || (await new Promise(($) => setTimeout($, 600)), R = await t.put(p, s));
      let q = X(R) ? R : null;
      if (!q) {
        const $ = await t.get(p);
        if ($ && typeof $ == "object") {
          const N = $;
          qe(s, N.config) && (q = N);
        }
      }
      if (!q)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your entered values were kept; try Save again."
        );
      const O = q.scope ?? n.current;
      n.current = O, I({ ...q, scope: O });
      try {
        const $ = await t.get(`${E}/status`);
        $ && typeof $ == "object" && y($);
      } catch {
      }
      return q;
    },
    [t]
  ), V = G(
    async (x, s) => {
      var N;
      const p = `${E}/rutherford-panels?scope=${x}`, R = { panels: s }, q = (v) => !!v && typeof v == "object" && v.written === !0;
      let O = await t.put(p, R);
      q(O) || (await new Promise((v) => setTimeout(v, 600)), O = await t.put(p, R));
      let $ = q(O) ? O : null;
      if (!$) {
        const v = await t.get(`${E}/panels`), B = (N = v == null ? void 0 : v.sources) == null ? void 0 : N.find((P) => P.scope === x);
        if (B) {
          const P = s.map((W) => W.name).sort(), Y = (Array.isArray(B.panels) ? B.panels : []).map((W) => W.name).sort();
          P.length === Y.length && P.every((W, he) => W === Y[he]) && ($ = { ...B, written: !0 });
        }
      }
      if (!$)
        throw new Error(
          "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your edits were kept; try Save again."
        );
      try {
        const v = await t.get(`${E}/panels`);
        v && typeof v == "object" && A(v);
      } catch {
      }
      return $;
    },
    [t]
  ), te = G(
    async (x, s) => {
      try {
        const p = await t.get(
          `${E}/rutherford-roles?scope=${x}&name=${encodeURIComponent(s)}`
        );
        return p && typeof p == "object" && p.role && typeof p.role == "object" ? p.role : null;
      } catch {
        return null;
      }
    },
    [t]
  ), ae = G(
    async (x, s) => {
      const p = `${E}/rutherford-roles?scope=${x}`, R = (N) => !!N && typeof N == "object" && N.written === !0, q = s.op === "delete";
      let O = await t.put(p, s);
      R(O) || (await new Promise((N) => setTimeout(N, 600)), O = await t.put(p, s));
      let $ = R(O) ? O : null;
      if (!$)
        if (q) {
          let N = !1;
          try {
            const v = await t.get(
              `${E}/rutherford-roles?scope=${x}&name=${encodeURIComponent(s.name)}`
            );
            v && typeof v == "object" && v.exists === !1 && (N = !0);
          } catch {
          }
          if (!N)
            try {
              const v = await t.get(`${E}/rutherford-roles`), B = Array.isArray(v == null ? void 0 : v.sources) ? v.sources : null, P = B ? B.find((Y) => Y.scope === x) : void 0;
              P && Array.isArray(P.roles) && (P.roles.some((W) => W.name === s.name) || (N = !0));
            } catch {
            }
          N && ($ = { scope: x, path: "", platform: "", written: !0, deleted: !0 });
        } else {
          const N = await t.get(`${E}/rutherford-roles`), v = (Array.isArray(N == null ? void 0 : N.sources) ? N.sources : []).find(
            (P) => P.scope === x
          );
          (Array.isArray(v == null ? void 0 : v.roles) ? v.roles : []).some(
            (P) => P.name === s.name
          ) && ($ = { scope: x, path: (v == null ? void 0 : v.path) ?? "", platform: "", written: !0 });
        }
      if (!$)
        throw new Error(
          q ? "Delete could not be confirmed — the role file may still exist (a non-404 error, empty response, or unreachable server). Nothing was closed; your draft was kept. Try Delete again." : "Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your edits were kept; try Save again."
        );
      try {
        const N = await t.get(`${E}/rutherford-roles`);
        N && typeof N == "object" && c(N);
      } catch {
      }
      return $;
    },
    [t]
  );
  return /* @__PURE__ */ a(M, { children: [
    /* @__PURE__ */ e(xe, { title: "Rutherford", subtitle: "Config, panels & roles — config.toml / panels.toon / role files" }),
    /* @__PURE__ */ a("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: [
      /* @__PURE__ */ a("div", { className: "flex gap-1 mb-5 border-b border-[var(--border,#2a2a2a)]", children: [
        $e.map(({ id: x, label: s, icon: p }) => /* @__PURE__ */ a(
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
            onClick: () => void C(),
            className: "ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-[var(--fg,#eee)]",
            title: "Reload",
            children: /* @__PURE__ */ e(ke, { size: 15, className: f ? "animate-spin" : "" })
          }
        )
      ] }),
      i && /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-sm text-amber-500 mb-4", children: [
        /* @__PURE__ */ e(H, { size: 15 }),
        " ",
        i
      ] }),
      f && !b ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "Loading…" }) : /* @__PURE__ */ a(M, { children: [
        r === "status" && /* @__PURE__ */ e(je, { status: b }),
        r === "config" && /* @__PURE__ */ e(
          Pe,
          {
            config: k,
            meta: m,
            scope: o,
            onScope: j,
            onSave: ee
          }
        ),
        r === "panels" && /* @__PURE__ */ e(Ke, { panels: L, meta: m, onSave: V }),
        r === "roles" && /* @__PURE__ */ e(Ge, { roles: _, meta: m, onFetchRole: te, onSave: ae })
      ] })
    ] })
  ] });
}
function je({ status: t }) {
  var h, b, y;
  if (!t) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No status." });
  const r = t.agents || { enabled: [], enabled_source: "", allowlist_configured: !1, roster: [] }, d = Array.isArray(r.enabled) ? r.enabled : [], f = Array.isArray(r.roster) ? r.roster : [], u = Array.isArray(t.acp) ? t.acp : [], i = t.defaults || {}, l = r.allowlist_configured ? String(d.length) : "All", m = Object.keys(t.env_overrides || {}).filter((o) => o !== "_note");
  return /* @__PURE__ */ a(M, { children: [
    /* @__PURE__ */ a("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mb-6", children: [
      /* @__PURE__ */ e(Z, { label: "Platform", value: t.platform }),
      /* @__PURE__ */ e(Z, { label: "Agents enabled", value: l, accent: !0 }),
      /* @__PURE__ */ e(Z, { label: "Safety mode", value: i.safety_mode ?? "read_only" }),
      /* @__PURE__ */ e(
        Z,
        {
          label: "Local model detect",
          value: i.auto_detect_local_models ? "on" : "off"
        }
      )
    ] }),
    /* @__PURE__ */ a(D, { children: [
      /* @__PURE__ */ e(T, { children: "Resolved roster" }),
      f.length > 0 ? /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1.5", children: f.map((o) => /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ e("span", { className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]", children: o.id }),
        /* @__PURE__ */ e("span", { className: "text-muted text-xs", children: o.default_model ?? "(agent default)" }),
        /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-auto", children: o.source })
      ] }, o.id)) }) : r.allowlist_configured ? /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-2", children: d.map((o) => /* @__PURE__ */ e(
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
    /* @__PURE__ */ a(D, { children: [
      /* @__PURE__ */ e(T, { children: "Config locations" }),
      ((h = t.config_locations) == null ? void 0 : h.global) && /* @__PURE__ */ e(K, { meta: t.config_locations.global }),
      ((b = t.config_locations) == null ? void 0 : b.workspace) && /* @__PURE__ */ e(K, { meta: t.config_locations.workspace })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a(D, { children: [
      /* @__PURE__ */ e(T, { children: /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(Ae, { size: 14 }),
        " acp.json (agent servers)"
      ] }) }),
      u.map((o) => {
        const g = Object.keys(o.agent_servers || {});
        return /* @__PURE__ */ a("div", { className: "mt-2", children: [
          /* @__PURE__ */ e(K, { meta: o }),
          g.length > 0 && /* @__PURE__ */ e("div", { className: "flex flex-wrap gap-2 mt-1", children: g.map((k) => /* @__PURE__ */ e(
            "span",
            {
              className: "px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]",
              children: k
            },
            k
          )) })
        ] }, o.path);
      })
    ] }),
    m.length > 0 && /* @__PURE__ */ a(M, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(D, { children: [
        /* @__PURE__ */ e(T, { children: "Environment overrides" }),
        /* @__PURE__ */ e("div", { className: "mt-2 flex flex-col gap-1", children: m.map((o) => /* @__PURE__ */ a("div", { className: "text-xs", children: [
          /* @__PURE__ */ e("code", { children: o }),
          " = ",
          /* @__PURE__ */ e("code", { className: "text-muted", children: String((t.env_overrides || {})[o]) })
        ] }, o)) }),
        (t.env_overrides || {})._note && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-2", children: String((t.env_overrides || {})._note) })
      ] })
    ] }),
    /* @__PURE__ */ e("div", { className: "h-3" }),
    /* @__PURE__ */ a(D, { children: [
      /* @__PURE__ */ e(T, { children: "Reachability" }),
      /* @__PURE__ */ e("p", { className: "text-sm text-muted mt-1", children: ((y = t.reachability) == null ? void 0 : y.note) ?? "—" })
    ] })
  ] });
}
function Q({ text: t }) {
  return t ? /* @__PURE__ */ e(
    "span",
    {
      className: "inline-flex items-center justify-center align-middle ml-1 text-muted opacity-60 hover:opacity-100 cursor-help",
      title: t,
      "aria-label": t,
      role: "img",
      children: /* @__PURE__ */ e(Se, { size: 12 })
    }
  ) : null;
}
function pe({ required: t }) {
  return t ? /* @__PURE__ */ e("span", { className: "text-amber-500 ml-1", title: "Required", children: "*" }) : /* @__PURE__ */ e("span", { className: "text-[10px] text-muted opacity-60 ml-1.5", children: "optional" });
}
function F({
  label: t,
  hint: r,
  help: d,
  required: f,
  absent: u,
  children: i
}) {
  return /* @__PURE__ */ a("label", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ a("span", { className: "text-sm text-[var(--fg,#eee)] flex items-center flex-wrap", children: [
      t,
      r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r }),
      d && /* @__PURE__ */ e(Q, { text: d }),
      f !== void 0 && /* @__PURE__ */ e(pe, { required: f })
    ] }),
    u && /* @__PURE__ */ a("span", { className: "text-[11px] text-muted -mt-0.5", children: [
      "absent → ",
      u
    ] }),
    i
  ] });
}
const z = "px-2 py-1.5 text-sm rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)] text-[var(--fg,#eee)] outline-none focus:border-[var(--accent,#6366f1)]";
function re({
  label: t,
  hint: r,
  help: d,
  required: f,
  absent: u,
  values: i,
  onChange: l
}) {
  const [m, h] = w("");
  return /* @__PURE__ */ a("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ a("span", { className: "text-sm text-[var(--fg,#eee)] flex items-center flex-wrap", children: [
      t,
      r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r }),
      d && /* @__PURE__ */ e(Q, { text: d }),
      f !== void 0 && /* @__PURE__ */ e(pe, { required: f })
    ] }),
    u && /* @__PURE__ */ a("span", { className: "text-[11px] text-muted -mt-0.5", children: [
      "empty → ",
      u
    ] }),
    /* @__PURE__ */ a("div", { className: "flex flex-col gap-1.5", children: [
      i.map((b, y) => /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: z + " flex-1",
            value: b,
            onChange: (o) => {
              const g = i.slice();
              g[y] = o.target.value, l(g);
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-amber-500",
            onClick: () => l(i.filter((o, g) => g !== y)),
            title: "Remove",
            children: /* @__PURE__ */ e(ne, { size: 14 })
          }
        )
      ] }, y)),
      /* @__PURE__ */ a("div", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(
          "input",
          {
            className: z + " flex-1",
            placeholder: `Add ${t}…`,
            value: m,
            onChange: (b) => h(b.target.value),
            onKeyDown: (b) => {
              b.key === "Enter" && m.trim() && (l([...i, m.trim()]), h(""));
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            className: "p-1 text-muted hover:text-[var(--accent,#6366f1)]",
            onClick: () => {
              m.trim() && (l([...i, m.trim()]), h(""));
            },
            title: "Add",
            children: /* @__PURE__ */ e(U, { size: 14 })
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
  return /* @__PURE__ */ a(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": t,
      "aria-label": d,
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
function de({
  label: t,
  hint: r,
  help: d,
  absent: f,
  value: u,
  onChange: i
}) {
  return /* @__PURE__ */ a("label", { className: "flex items-start gap-2.5 cursor-pointer", children: [
    /* @__PURE__ */ e("span", { className: "mt-0.5", children: /* @__PURE__ */ e(oe, { value: u, onChange: i, srLabel: t || void 0 }) }),
    /* @__PURE__ */ a("span", { className: "flex flex-col", children: [
      /* @__PURE__ */ a("span", { className: "text-sm text-[var(--fg,#eee)] flex items-center flex-wrap", children: [
        t,
        r && /* @__PURE__ */ e("code", { className: "ml-1.5 text-[10px] text-muted opacity-70", children: r }),
        d && /* @__PURE__ */ e(Q, { text: d })
      ] }),
      f && /* @__PURE__ */ a("span", { className: "text-[11px] text-muted", children: [
        "absent → ",
        f
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
  const r = t.config || {}, d = (i) => {
    const l = r[i];
    return typeof l == "number" && Number.isFinite(l) ? String(l) : typeof l == "string" && l.trim() !== "" && Number.isFinite(Number(l)) ? String(Number(l)) : "";
  }, f = t.derived || {}, u = (i) => Array.isArray(i) ? i.filter((l) => typeof l == "string") : [];
  return {
    default_safety_mode: typeof r.default_safety_mode == "string" ? r.default_safety_mode : "read_only",
    default_timeout_s: d("default_timeout_s"),
    max_targets: d("max_targets"),
    auto_detect_local_models: r.auto_detect_local_models === !0,
    default_persistence: typeof r.default_persistence == "string" ? r.default_persistence : "ephemeral",
    synthesize_default: r.synthesize_default === !0,
    enabled_agents: u(f.enabled_agents),
    trusted_workspaces: u(f.trusted_workspaces),
    role_dirs: u(f.role_dirs),
    agents: (Array.isArray(t.agents) ? t.agents : []).map((i) => ({
      ...i,
      env: { ...i.env || {} },
      extra: { ...i.extra || {} }
    }))
  };
}
function qe(t, r) {
  if (!r || typeof r != "object") return !1;
  const d = (f, u) => String(f) === String(u);
  for (const [f, u] of Object.entries(t)) {
    const i = r[f];
    if (f === "agents") {
      const l = u && typeof u == "object" ? Object.keys(u).sort() : [], m = i && typeof i == "object" ? Object.keys(i).sort() : [];
      if (l.length !== m.length || l.some((h, b) => h !== m[b])) return !1;
      continue;
    }
    if (Array.isArray(u)) {
      if (!Array.isArray(i) || i.length !== u.length || u.some((l, m) => !d(l, i[m]))) return !1;
      continue;
    }
    if (!d(u, i)) return !1;
  }
  return !0;
}
function Oe(t, r) {
  const d = { ...t.config };
  delete d.agents;
  const f = (l, m) => {
    if (m.trim() === "") delete d[l];
    else {
      const h = Number(m);
      Number.isNaN(h) || (d[l] = h);
    }
  };
  d.default_safety_mode = r.default_safety_mode, f("default_timeout_s", r.default_timeout_s), f("max_targets", r.max_targets), d.auto_detect_local_models = r.auto_detect_local_models, d.default_persistence = r.default_persistence, d.synthesize_default = r.synthesize_default;
  const u = (l, m) => {
    const h = m.map((b) => b.trim()).filter(Boolean);
    h.length ? d[l] = h : delete d[l];
  };
  u("enabled_agents", r.enabled_agents), u("trusted_workspaces", r.trusted_workspaces), u("role_dirs", r.role_dirs);
  const i = {};
  for (const l of r.agents) {
    const m = l.id.trim();
    if (!m) continue;
    const h = { ...l.extra };
    l.default_model != null && String(l.default_model).trim() !== "" && (h.default_model = l.default_model), h.enabled = l.enabled, l.env && Object.keys(l.env).length && (h.env = l.env), i[m] = h;
  }
  return Object.keys(i).length && (d.agents = i), d;
}
function fe({
  value: t,
  options: r,
  freeText: d,
  onChange: f,
  listId: u,
  placeholder: i
}) {
  const l = Array.isArray(r) ? r : [];
  return d ? /* @__PURE__ */ a(M, { children: [
    /* @__PURE__ */ e(
      "input",
      {
        className: z,
        value: t,
        list: u,
        placeholder: i,
        onChange: (m) => f(m.target.value)
      }
    ),
    /* @__PURE__ */ e("datalist", { id: u, children: l.map((m) => /* @__PURE__ */ e("option", { value: m }, m)) })
  ] }) : /* @__PURE__ */ a("select", { className: z, value: t, onChange: (m) => f(m.target.value), children: [
    t !== "" && !l.includes(t) && /* @__PURE__ */ e("option", { value: t, children: t }),
    l.map((m) => /* @__PURE__ */ e("option", { value: m, children: m }, m))
  ] });
}
function Pe({
  config: t,
  meta: r,
  scope: d,
  onScope: f,
  onSave: u
}) {
  const [i, l] = w(null), [m, h] = w(!1), [b, y] = w(null), o = Array.isArray(r == null ? void 0 : r.safety_modes) && r.safety_modes.length ? r.safety_modes : ze, g = Array.isArray(r == null ? void 0 : r.persistence) && r.persistence.length ? r.persistence : Re, k = Array.isArray(r == null ? void 0 : r.agent_ids) ? r.agent_ids : [], I = me(r), L = !!t && t.scope === d;
  J(() => {
    if (!t || t.scope !== d) {
      l((n) => n ?? null);
      return;
    }
    y(null), l(Te(t));
  }, [t, d]);
  const A = (n) => l((S) => S && { ...S, ...n }), _ = async () => {
    if (!(!t || !i)) {
      h(!0), y(null);
      try {
        await u(d, Oe(t, i)), y({ ok: !0, text: `Saved to ${d} config.toml (backup written).` });
      } catch (n) {
        y({ ok: !1, text: n instanceof Error ? n.message : String(n) });
      } finally {
        h(!1);
      }
    }
  }, c = De;
  return /* @__PURE__ */ a(M, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((n) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => f(n),
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (d === n ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: n === "global" ? "Global" : "Workspace"
        },
        n
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: () => void _(),
          disabled: m || !i,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(se, { size: 14 }),
            " ",
            m ? "Saving…" : `Save ${d}`
          ]
        }
      )
    ] }),
    !r && /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-xs text-muted mb-3", children: [
      /* @__PURE__ */ e(H, { size: 13 }),
      " Option lists (dropdowns) could not be loaded from the backend — showing free-text inputs instead."
    ] }),
    b && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (b.ok ? "text-green-500" : "text-amber-500"),
        children: [
          b.ok ? /* @__PURE__ */ e(ie, { size: 15 }) : /* @__PURE__ */ e(H, { size: 15 }),
          b.text
        ]
      }
    ),
    !L || !i ? /* @__PURE__ */ a("p", { className: "text-sm text-muted", children: [
      "Loading ",
      d,
      " config…"
    ] }) : /* @__PURE__ */ a(M, { children: [
      /* @__PURE__ */ a(D, { children: [
        /* @__PURE__ */ e(T, { children: "Defaults" }),
        /* @__PURE__ */ e(K, { meta: t }),
        !t.exists && /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-2", children: [
          "No ",
          /* @__PURE__ */ e("code", { children: "config.toml" }),
          " at this scope yet — no file yet; defaults apply; saving creates it (",
          /* @__PURE__ */ e("code", { children: t.path }),
          ")."
        ] }),
        /* @__PURE__ */ a("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            F,
            {
              label: c.default_safety_mode.label,
              hint: c.default_safety_mode.key,
              help: c.default_safety_mode.help,
              required: c.default_safety_mode.required,
              absent: c.default_safety_mode.absent,
              children: /* @__PURE__ */ e(
                "select",
                {
                  className: z,
                  value: i.default_safety_mode,
                  onChange: (n) => A({ default_safety_mode: n.target.value }),
                  children: o.map((n) => /* @__PURE__ */ e("option", { value: n, children: n }, n))
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            F,
            {
              label: c.default_timeout_s.label,
              hint: c.default_timeout_s.key,
              help: c.default_timeout_s.help,
              required: c.default_timeout_s.required,
              absent: c.default_timeout_s.absent,
              children: /* @__PURE__ */ e(
                "input",
                {
                  type: "number",
                  className: z,
                  value: i.default_timeout_s,
                  onChange: (n) => A({ default_timeout_s: n.target.value })
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            F,
            {
              label: c.max_targets.label,
              hint: c.max_targets.key,
              help: c.max_targets.help,
              required: c.max_targets.required,
              absent: c.max_targets.absent,
              children: /* @__PURE__ */ e(
                "input",
                {
                  type: "number",
                  className: z,
                  value: i.max_targets,
                  onChange: (n) => A({ max_targets: n.target.value })
                }
              )
            }
          ),
          /* @__PURE__ */ e(
            F,
            {
              label: c.default_persistence.label,
              hint: c.default_persistence.key,
              help: c.default_persistence.help,
              required: c.default_persistence.required,
              absent: c.default_persistence.absent,
              children: /* @__PURE__ */ e(
                "select",
                {
                  className: z,
                  value: i.default_persistence,
                  onChange: (n) => A({ default_persistence: n.target.value }),
                  children: g.map((n) => /* @__PURE__ */ e("option", { value: n, children: n }, n))
                }
              )
            }
          )
        ] }),
        /* @__PURE__ */ a("div", { className: "flex flex-wrap gap-6 mt-4", children: [
          /* @__PURE__ */ e(
            de,
            {
              label: c.auto_detect_local_models.label,
              hint: c.auto_detect_local_models.key,
              help: c.auto_detect_local_models.help,
              absent: c.auto_detect_local_models.absent,
              value: i.auto_detect_local_models,
              onChange: (n) => A({ auto_detect_local_models: n })
            }
          ),
          /* @__PURE__ */ e(
            de,
            {
              label: c.synthesize_default.label,
              hint: c.synthesize_default.key,
              help: c.synthesize_default.help,
              absent: c.synthesize_default.absent,
              value: i.synthesize_default,
              onChange: (n) => A({ synthesize_default: n })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(D, { children: [
        /* @__PURE__ */ e(T, { children: "Allowlists & directories" }),
        /* @__PURE__ */ a("div", { className: "grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            re,
            {
              label: c.enabled_agents.label,
              hint: c.enabled_agents.key,
              help: c.enabled_agents.help,
              required: c.enabled_agents.required,
              absent: c.enabled_agents.absent,
              values: i.enabled_agents,
              onChange: (n) => A({ enabled_agents: n })
            }
          ),
          /* @__PURE__ */ e(
            re,
            {
              label: c.trusted_workspaces.label,
              hint: c.trusted_workspaces.key,
              help: c.trusted_workspaces.help,
              required: c.trusted_workspaces.required,
              absent: c.trusted_workspaces.absent,
              values: i.trusted_workspaces,
              onChange: (n) => A({ trusted_workspaces: n })
            }
          ),
          /* @__PURE__ */ e(
            re,
            {
              label: c.role_dirs.label,
              hint: c.role_dirs.key,
              help: c.role_dirs.help,
              required: c.role_dirs.required,
              absent: c.role_dirs.absent,
              values: i.role_dirs,
              onChange: (n) => A({ role_dirs: n })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(D, { children: [
        /* @__PURE__ */ e(T, { children: "Per-agent overrides" }),
        /* @__PURE__ */ a("p", { className: "text-[11px] text-muted mt-1 flex items-center flex-wrap", children: [
          /* @__PURE__ */ e("code", { className: "text-[10px] opacity-70", children: "[agents.*]" }),
          /* @__PURE__ */ e("span", { className: "ml-1.5", children: "per-agent default model and enabled flag." }),
          /* @__PURE__ */ e(Q, { text: c.agent_override.help }),
          /* @__PURE__ */ a("span", { className: "ml-1.5", children: [
            "absent → ",
            c.agent_override.absent
          ] })
        ] }),
        /* @__PURE__ */ a("div", { className: "mt-3 flex flex-col gap-2", children: [
          i.agents.length > 0 && /* @__PURE__ */ a("div", { className: "flex items-center gap-2 px-2 text-[10px] uppercase tracking-wide text-muted opacity-70", children: [
            /* @__PURE__ */ e("span", { className: "w-40", children: "Agent (id)" }),
            /* @__PURE__ */ e("span", { className: "flex-1", children: "Default model (free text)" }),
            /* @__PURE__ */ e("span", { children: "Enabled" }),
            /* @__PURE__ */ e("span", { className: "w-6" })
          ] }),
          i.agents.map((n, S) => /* @__PURE__ */ a(
            "div",
            {
              className: "flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]",
              children: [
                /* @__PURE__ */ e("div", { className: "w-40", children: /* @__PURE__ */ e(
                  fe,
                  {
                    value: n.id,
                    options: k,
                    freeText: I,
                    listId: `agent-ids-${S}`,
                    placeholder: "agent id",
                    onChange: (C) => {
                      const j = i.agents.slice();
                      j[S] = { ...n, id: C }, A({ agents: j });
                    }
                  }
                ) }),
                /* @__PURE__ */ e(
                  "input",
                  {
                    className: z + " flex-1",
                    value: n.default_model ?? "",
                    placeholder: "Default model (blank = agent default)",
                    onChange: (C) => {
                      const j = i.agents.slice();
                      j[S] = { ...n, default_model: C.target.value }, A({ agents: j });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  oe,
                  {
                    value: n.enabled,
                    srLabel: `Enabled: ${n.id || "agent"}`,
                    onChange: (C) => {
                      const j = i.agents.slice();
                      j[S] = { ...n, enabled: C }, A({ agents: j });
                    }
                  }
                ),
                /* @__PURE__ */ e(
                  "button",
                  {
                    className: "p-1 text-muted hover:text-amber-500",
                    onClick: () => A({ agents: i.agents.filter((C, j) => j !== S) }),
                    title: "Remove agent",
                    children: /* @__PURE__ */ e(ne, { size: 14 })
                  }
                )
              ]
            },
            S
          )),
          /* @__PURE__ */ a(
            "button",
            {
              className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
              onClick: () => A({
                agents: [
                  ...i.agents,
                  { id: "", default_model: "", enabled: !0, env: {}, extra: {} }
                ]
              }),
              children: [
                /* @__PURE__ */ e(U, { size: 14 }),
                " Add agent"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] });
}
const le = [
  { key: "model", label: "model", placeholder: "agent default (free text)" },
  { key: "label", label: "label", placeholder: "result key" },
  { key: "stance", label: "stance", placeholder: "for / against / neutral" }
];
function Le(t) {
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
      const f = { cli: String(d.cli || "").trim() };
      for (const [u, i] of Object.entries(d))
        if (u !== "cli" && i != null)
          if (typeof i == "string") {
            const l = i.trim();
            l !== "" && (f[u] = l);
          } else
            f[u] = i;
      return f;
    })
  }));
}
function Ie({
  seat: t,
  meta: r,
  index: d,
  onChange: f,
  onRemove: u
}) {
  const i = (o, g) => f({ ...t, [o]: g }), l = Array.isArray(r == null ? void 0 : r.agent_ids) ? r.agent_ids : [], m = me(r), h = Array.isArray(r == null ? void 0 : r.roles) ? r.roles : [], b = /* @__PURE__ */ new Set([
    "cli",
    "role",
    ...le.map((o) => o.key),
    "weight",
    "parity"
  ]), y = Object.keys(t).filter((o) => !b.has(o));
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
            options: l,
            freeText: m,
            listId: `seat-cli-${d}`,
            placeholder: "agent id (required)",
            onChange: (o) => i("cli", o)
          }
        )
      ] }),
      le.filter((o) => o.key === "model").map((o) => /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: o.label }),
        /* @__PURE__ */ e(
          "input",
          {
            className: z,
            value: t[o.key] != null ? String(t[o.key]) : "",
            placeholder: o.placeholder,
            onChange: (g) => i(o.key, g.target.value)
          }
        )
      ] }, o.key)),
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "role" }),
        /* @__PURE__ */ a(
          "select",
          {
            className: z,
            value: t.role != null ? String(t.role) : "",
            onChange: (o) => i("role", o.target.value),
            children: [
              /* @__PURE__ */ e("option", { value: "", children: "(none)" }),
              t.role && !h.includes(String(t.role)) && /* @__PURE__ */ e("option", { value: String(t.role), children: String(t.role) }),
              h.map((o) => /* @__PURE__ */ e("option", { value: o, children: o }, o))
            ]
          }
        )
      ] }),
      le.filter((o) => o.key !== "model").map((o) => /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: o.label }),
        /* @__PURE__ */ e(
          "input",
          {
            className: z,
            value: t[o.key] != null ? String(t[o.key]) : "",
            placeholder: o.placeholder,
            onChange: (g) => i(o.key, g.target.value)
          }
        )
      ] }, o.key)),
      /* @__PURE__ */ a("label", { className: "flex flex-col gap-0.5", children: [
        /* @__PURE__ */ e("span", { className: "text-[10px] uppercase tracking-wide text-muted opacity-70", children: "weight" }),
        /* @__PURE__ */ e(
          "input",
          {
            className: z,
            type: "number",
            value: t.weight != null ? String(t.weight) : "",
            placeholder: "—",
            onChange: (o) => {
              const g = o.target.value.trim(), k = { ...t };
              g === "" ? delete k.weight : k.weight = Number(g), f(k);
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
            onChange: (o) => {
              const g = { ...t };
              o ? g.parity = !0 : delete g.parity, f(g);
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
          /* @__PURE__ */ e(ne, { size: 12 }),
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
  onDelete: f
}) {
  const [u, i] = w(!1), l = Array.isArray(t.seats) ? t.seats : [], m = Array.isArray(r == null ? void 0 : r.strategies) && r.strategies.length ? r.strategies : Ee;
  return /* @__PURE__ */ a("div", { className: "p-3 rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)]", children: [
    /* @__PURE__ */ a("div", { className: "grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]", children: [
      /* @__PURE__ */ e(F, { label: "Name", hint: "panel key", required: !0, children: /* @__PURE__ */ e(
        "input",
        {
          className: z,
          value: t.name,
          placeholder: "panel-name",
          onChange: (h) => d({ ...t, name: h.target.value })
        }
      ) }),
      /* @__PURE__ */ e(
        F,
        {
          label: "Strategy",
          hint: "strategy",
          help: "How the panel's voices are reduced to an outcome. all-voices returns every voice; the rest collapse to one verdict (unanimous, majority, plurality, weighted, parity-pair, rank).",
          children: /* @__PURE__ */ a(
            "select",
            {
              className: z,
              value: t.strategy || "all-voices",
              onChange: (h) => d({ ...t, strategy: h.target.value }),
              children: [
                t.strategy && !m.includes(t.strategy) && /* @__PURE__ */ e("option", { value: t.strategy, children: t.strategy }),
                m.map((h) => /* @__PURE__ */ e("option", { value: h, children: h }, h))
              ]
            }
          )
        }
      )
    ] }),
    /* @__PURE__ */ e("div", { className: "mt-2.5", children: /* @__PURE__ */ e(F, { label: "Description", hint: "description", children: /* @__PURE__ */ e(
      "input",
      {
        className: z,
        value: t.description || "",
        placeholder: "Human label for this panel",
        onChange: (h) => d({ ...t, description: h.target.value })
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
        l.map((h, b) => /* @__PURE__ */ e(
          Ie,
          {
            seat: h,
            meta: r,
            index: b,
            onChange: (y) => {
              const o = l.slice();
              o[b] = y, d({ ...t, seats: o });
            },
            onRemove: () => d({ ...t, seats: l.filter((y, o) => o !== b) })
          },
          b
        )),
        /* @__PURE__ */ a(
          "button",
          {
            className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
            onClick: () => d({ ...t, seats: [...l, { cli: "" }] }),
            children: [
              /* @__PURE__ */ e(U, { size: 14 }),
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
          onClick: f,
          children: "Delete"
        }
      ),
      /* @__PURE__ */ e("button", { className: "px-2 py-0.5 rounded text-muted hover:text-[var(--fg,#eee)]", onClick: () => i(!1), children: "Cancel" })
    ] }) : /* @__PURE__ */ a(
      "button",
      {
        className: "flex items-center gap-1.5 text-xs text-muted hover:text-amber-500",
        onClick: () => i(!0),
        children: [
          /* @__PURE__ */ e(ue, { size: 13 }),
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
  const [f, u] = w("global"), [i, l] = w(null), [m, h] = w(!1), [b, y] = w(null), g = (Array.isArray(t == null ? void 0 : t.sources) ? t.sources : []).find((_) => _.scope === f) || null, k = JSON.stringify((g == null ? void 0 : g.panels) ?? null) + "|" + f;
  J(() => {
    if (!g) {
      l(null);
      return;
    }
    y(null), l((g.panels || []).map(Le));
  }, [k]);
  const I = (_, c) => l((n) => n && n.map((S, C) => C === _ ? c : S)), L = () => {
    if (!i) return null;
    const _ = /* @__PURE__ */ new Set();
    for (const c of i) {
      const n = c.name.trim();
      if (!n) return "Every panel needs a name.";
      if (_.has(n)) return `Duplicate panel name “${n}”.`;
      _.add(n);
      const S = Array.isArray(c.seats) ? c.seats : [];
      if (S.length === 0) return `Panel “${n}” needs at least one seat.`;
      if (S.some((C) => !String(C.cli || "").trim()))
        return `Panel “${n}” has a seat missing a cli.`;
    }
    return null;
  }, A = async () => {
    if (!i) return;
    const _ = L();
    if (_) {
      y({ ok: !1, text: _ });
      return;
    }
    h(!0), y(null);
    try {
      await d(f, Me(i)), y({ ok: !0, text: `Saved to ${f} panels.toon (backup written).` });
    } catch (c) {
      y({ ok: !1, text: c instanceof Error ? c.message : String(c) });
    } finally {
      h(!1);
    }
  };
  return /* @__PURE__ */ a(M, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((_) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => u(_),
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (f === _ ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: _ === "global" ? "Global" : "Workspace"
        },
        _
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: () => void A(),
          disabled: m || !i,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50",
          children: [
            /* @__PURE__ */ e(se, { size: 14 }),
            " ",
            m ? "Saving…" : `Save ${f}`
          ]
        }
      )
    ] }),
    b && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (b.ok ? "text-green-500" : "text-amber-500"),
        children: [
          b.ok ? /* @__PURE__ */ e(ie, { size: 15 }) : /* @__PURE__ */ e(H, { size: 15 }),
          b.text
        ]
      }
    ),
    /* @__PURE__ */ a(D, { children: [
      /* @__PURE__ */ a(T, { children: [
        "Named panels · ",
        f
      ] }),
      g && /* @__PURE__ */ e(K, { meta: g }),
      (g == null ? void 0 : g.error) && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-1", children: g.error }),
      g && !g.exists && /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-2", children: [
        "No file at this scope yet — saving creates ",
        /* @__PURE__ */ e("code", { children: g.path }),
        "."
      ] }),
      i === null ? /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-2", children: [
        "Loading ",
        f,
        " panels…"
      ] }) : /* @__PURE__ */ a("div", { className: "mt-3 flex flex-col gap-3", children: [
        i.length === 0 && /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "No panels defined at this scope. Add one below." }),
        i.map((_, c) => /* @__PURE__ */ e(
          Be,
          {
            panel: _,
            meta: r,
            onChange: (n) => I(c, n),
            onDelete: () => l((n) => n && n.filter((S, C) => C !== c))
          },
          c
        )),
        /* @__PURE__ */ a(
          "button",
          {
            className: "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start",
            onClick: () => l((_) => [..._ || [], Fe()]),
            children: [
              /* @__PURE__ */ e(U, { size: 14 }),
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
  onSave: f
}) {
  const [u, i] = w("global"), [l, m] = w(null), [h, b] = w(null), [y, o] = w(!1), [g, k] = w(null), [I, L] = w(!1), [A, _] = w(null), c = Array.isArray(t == null ? void 0 : t.sources) ? t.sources : [], n = c.find((s) => s.scope === u && s.editable !== !1) || null, S = Array.isArray(n == null ? void 0 : n.roles) ? n.roles : [], C = Array.isArray(r == null ? void 0 : r.roles_builtin) && r.roles_builtin.length ? r.roles_builtin : Array.isArray(t == null ? void 0 : t.builtin) ? t.builtin.map((s) => s.name) : [], j = c.filter((s) => s.editable === !1), X = async (s) => {
    _(s), k(null), L(!1);
    const p = await d(u, s);
    if (_(null), !p) {
      k({ ok: !1, text: `Could not open role “${s}”.` });
      return;
    }
    m({ ...p, extra: p.extra || {} }), b(s);
  }, ee = () => {
    k(null), L(!1), m(We()), b(null);
  }, V = () => {
    m(null), b(null), L(!1);
  }, te = () => {
    if (!l) return null;
    const s = l.name.trim();
    return s ? /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(s) ? C.includes(s) ? `“${s}” is a built-in role (read-only reference). Choose a different id.` : null : "Role name must be a kebab-case id (letters, digits, . _ -), no path separators." : "Role name is required.";
  }, ae = async () => {
    if (!l) return;
    const s = te();
    if (s) {
      k({ ok: !1, text: s });
      return;
    }
    o(!0), k(null);
    try {
      const p = l.name.trim();
      if (await f(u, {
        name: p,
        display_name: l.display_name || "",
        description: l.description || "",
        body: l.body || "",
        extra: l.extra || {}
      }), h && h !== p)
        try {
          await f(u, { name: h, op: "delete" });
        } catch {
        }
      k({ ok: !0, text: `Saved role “${p}” to ${u} (backup written).` }), b(p), m((R) => R && { ...R, _new: !1 });
    } catch (p) {
      k({ ok: !1, text: p instanceof Error ? p.message : String(p) });
    } finally {
      o(!1);
    }
  }, x = async () => {
    if (!(!l || !h)) {
      o(!0), k(null);
      try {
        await f(u, { name: h, op: "delete" }), k({ ok: !0, text: `Deleted role “${h}” from ${u} (backup written).` }), V();
      } catch (s) {
        k({ ok: !1, text: s instanceof Error ? s.message : String(s) });
      } finally {
        o(!1);
      }
    }
  };
  return /* @__PURE__ */ a(M, { children: [
    /* @__PURE__ */ a("div", { className: "flex items-center gap-1 mb-4", children: [
      ["global", "workspace"].map((s) => /* @__PURE__ */ e(
        "button",
        {
          onClick: () => {
            i(s), V(), k(null);
          },
          className: "px-3 py-1.5 text-sm rounded transition-colors " + (u === s ? "bg-[var(--accent,#6366f1)] text-white" : "bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]"),
          children: s === "global" ? "Global" : "Workspace"
        },
        s
      )),
      /* @__PURE__ */ a(
        "button",
        {
          onClick: ee,
          className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white",
          children: [
            /* @__PURE__ */ e(U, { size: 14 }),
            " New role"
          ]
        }
      )
    ] }),
    g && /* @__PURE__ */ a(
      "div",
      {
        className: "flex items-center gap-2 text-sm mb-4 " + (g.ok ? "text-green-500" : "text-amber-500"),
        children: [
          g.ok ? /* @__PURE__ */ e(ie, { size: 15 }) : /* @__PURE__ */ e(H, { size: 15 }),
          g.text
        ]
      }
    ),
    l && /* @__PURE__ */ a(M, { children: [
      /* @__PURE__ */ a(D, { children: [
        /* @__PURE__ */ e(T, { children: /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-1.5", children: [
          /* @__PURE__ */ e(ce, { size: 14 }),
          " ",
          l._new ? "New role" : `Edit role · ${h}`,
          " · ",
          u
        ] }) }),
        n && /* @__PURE__ */ e(K, { meta: n }),
        /* @__PURE__ */ a("div", { className: "grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] mt-3", children: [
          /* @__PURE__ */ e(
            F,
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
            F,
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
          F,
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
          F,
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
              onClick: () => void ae(),
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
              onClick: V,
              className: "px-3 py-1.5 text-sm rounded text-muted hover:text-[var(--fg,#eee)]",
              children: "Close"
            }
          ),
          h && !l._new && /* @__PURE__ */ e("div", { className: "ml-auto flex items-center", children: I ? /* @__PURE__ */ a("div", { className: "flex items-center gap-2 text-xs", children: [
            /* @__PURE__ */ a("span", { className: "text-amber-500", children: [
              "Delete “",
              h,
              "”?"
            ] }),
            /* @__PURE__ */ e(
              "button",
              {
                className: "px-2 py-0.5 rounded bg-amber-600/80 text-white hover:bg-amber-600 disabled:opacity-50",
                disabled: y,
                onClick: () => void x(),
                children: "Delete"
              }
            ),
            /* @__PURE__ */ e(
              "button",
              {
                className: "px-2 py-0.5 rounded text-muted hover:text-[var(--fg,#eee)]",
                onClick: () => L(!1),
                children: "Cancel"
              }
            )
          ] }) : /* @__PURE__ */ a(
            "button",
            {
              className: "flex items-center gap-1.5 text-xs text-muted hover:text-amber-500",
              onClick: () => L(!0),
              children: [
                /* @__PURE__ */ e(ue, { size: 13 }),
                " Delete role"
              ]
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "h-3" })
    ] }),
    /* @__PURE__ */ a(D, { children: [
      /* @__PURE__ */ e(T, { children: /* @__PURE__ */ a("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ e(Ce, { size: 14 }),
        " Role files · ",
        u,
        " (editable)"
      ] }) }),
      n ? /* @__PURE__ */ e(K, { meta: n }) : /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-1", children: [
        "No editable roles directory resolved for ",
        u,
        "."
      ] }),
      (n == null ? void 0 : n.error) && /* @__PURE__ */ e("p", { className: "text-xs text-amber-500 mt-1", children: n.error }),
      n && !n.exists && /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-2", children: [
        "No roles directory at this scope yet — saving a role creates ",
        /* @__PURE__ */ e("code", { children: n.path }),
        "."
      ] }),
      S.length === 0 ? /* @__PURE__ */ a("p", { className: "text-sm text-muted mt-2", children: [
        "No role files at this scope. Click ",
        /* @__PURE__ */ e("strong", { children: "New role" }),
        " to add one."
      ] }) : /* @__PURE__ */ e("div", { className: "mt-3 flex flex-col gap-1.5", children: S.map((s) => /* @__PURE__ */ a(
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
                onClick: () => void X(s.name),
                disabled: A === s.name,
                children: [
                  /* @__PURE__ */ e(ce, { size: 12 }),
                  " ",
                  A === s.name ? "Opening…" : "Edit"
                ]
              }
            )
          ]
        },
        s.path || s.name
      )) })
    ] }),
    C.length > 0 && /* @__PURE__ */ a(M, { children: [
      /* @__PURE__ */ e("div", { className: "h-3" }),
      /* @__PURE__ */ a(D, { children: [
        /* @__PURE__ */ e(T, { children: "Built-in personas (read-only reference)" }),
        /* @__PURE__ */ a("p", { className: "text-xs text-muted mt-1", children: [
          "These ship in the Rutherford server (not files) and cannot be edited here. Reference them from a panel seat's ",
          /* @__PURE__ */ e("code", { children: "role" }),
          " field."
        ] }),
        /* @__PURE__ */ e("div", { className: "mt-3 flex flex-wrap gap-2", children: C.map((s) => /* @__PURE__ */ e(
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
    j.map(
      (s) => Array.isArray(s.roles) && s.roles.length > 0 ? /* @__PURE__ */ a("div", { children: [
        /* @__PURE__ */ e("div", { className: "h-3" }),
        /* @__PURE__ */ a(D, { children: [
          /* @__PURE__ */ a(T, { children: [
            "Role files · ",
            s.scope,
            " (read-only)"
          ] }),
          /* @__PURE__ */ e(K, { meta: s }),
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
