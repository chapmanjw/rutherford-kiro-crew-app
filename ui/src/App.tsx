import { useAppApi } from '@kirocrew/app-sdk'
import { Card, CardTitle, PageHeader, StatCard } from '@kirocrew/app-sdk/ui'
import { useState, useEffect, useCallback, useRef } from 'react'
import lucide from 'lucide-react'

// The dashboard vendor shim for 'lucide-react' only STATICALLY named-exports ~40
// icons; Box/FileCog/Layers/UserSquare are not among them and would throw an ES
// parse-time "does not provide an export named ..." error. The shim's DEFAULT
// export is a forwarding Proxy over the full lucide module, so destructuring off
// the default import resolves any icon name. NEVER reintroduce named
// `from 'lucide-react'` imports — add new icons to THIS destructure instead.
const {
  Box, FileCog, Layers, UserSquare, RefreshCw, AlertTriangle,
  Save, Plus, X, CheckCircle2, Server, Trash2, Info, Pencil, FileText,
} = lucide

const BASE = '/api/apps/rutherford'

type Meta = { path: string; scope: string; platform: string; exists: boolean; error?: string }

type AgentRow = {
  id: string
  default_model: string | null
  enabled: boolean
  env: Record<string, string>
  extra: Record<string, unknown>
}

type AcpSource = Meta & { agent_servers: Record<string, unknown> }

// ---- /rutherford-meta — the option sets the UI renders dropdowns from -------
// Every field is guarded to [] / '' on read (fetch may fail; the UI must degrade
// to free text, never crash). agent_ids_source records HOW agent_ids was sourced
// so the UI can decide select vs free-text-datalist.
type MetaResp = {
  platform: string
  agent_ids: string[]
  agent_ids_builtin: string[]
  agent_ids_config_derived: string[]
  agent_ids_source: string
  strategies: string[]
  safety_modes: string[]
  persistence: string[]
  roles: string[]
  roles_builtin: string[]
  error?: string
}

type StatusResp = {
  platform: string
  agents: {
    enabled: string[]
    enabled_source: string
    allowlist_configured: boolean
    roster: { id: string; default_model: string | null; source: string }[]
  }
  defaults: { safety_mode?: string | null; auto_detect_local_models?: boolean | null }
  config_locations: { global: Meta; workspace: Meta }
  acp: AcpSource[]
  env_overrides: Record<string, unknown>
  reachability: { available: boolean; note: string }
}

type ConfigResp = Meta & {
  config: Record<string, unknown>
  agents: AgentRow[]
  derived: { enabled_agents: string[]; trusted_workspaces: string[]; role_dirs: string[] }
  acp: AcpSource[]
  env_overrides: Record<string, unknown>
  written?: boolean
}

type PanelSeat = {
  cli: string
  model?: string
  role?: string
  label?: string
  weight?: number | string
  parity?: boolean
  stance?: string
  [k: string]: unknown
}

type PanelRec = {
  name: string
  description: string
  strategy: string
  targets: number | null
  seats?: PanelSeat[]
  extra?: Record<string, unknown>
}

type PanelSource = Meta & { panels: PanelRec[] }

type PanelsResp = {
  platform: string
  sources: PanelSource[]
}

// Echoed shape from PUT /rutherford-panels (single scope) — carries written===true
// on a confirmed persist, mirroring the config write contract.
type PanelsWriteResp = Meta & { panels: PanelRec[]; written?: boolean }

// ---- Roles ----------------------------------------------------------------
// GET /rutherford-roles (listing): {platform, sources:[{...meta, editable, roles:[
//   {name,file,path,description?,display_name?}]}], builtin:[{name}]}.
// GET /rutherford-roles?scope&name (single body): {scope,path,exists,role:{name,
//   display_name,description,body,extra}}.
// PUT /rutherford-roles?scope (create/edit/delete): echoes written===true (+ sources).
type RoleListItem = {
  name: string
  file?: string
  path?: string
  description?: string
  display_name?: string
  error?: string
}

type RoleSource = Meta & { editable?: boolean; roles: RoleListItem[] }

type RolesResp = {
  platform: string
  sources: RoleSource[]
  builtin?: { name: string }[]
}

type RoleBody = {
  name: string
  display_name: string
  description: string
  body: string
  extra: Record<string, unknown>
}

type RoleGetResp = {
  scope: string
  path: string
  platform: string
  exists: boolean
  role: RoleBody
  error?: string
}

type RoleWriteResp = {
  scope: string
  path: string
  platform: string
  written?: boolean
  deleted?: boolean
  role?: RoleBody
  sources?: RoleSource[]
  error?: string
}

type Tab = 'status' | 'config' | 'panels' | 'roles'

const TABS: { id: Tab; label: string; icon: typeof Box }[] = [
  { id: 'status', label: 'Overview', icon: Box },
  { id: 'config', label: 'Config', icon: FileCog },
  { id: 'panels', label: 'Panels', icon: Layers },
  { id: 'roles', label: 'Roles', icon: UserSquare },
]

// Fallback option sets, used ONLY when /rutherford-meta could not be fetched.
// The live values come from meta; these keep the dropdowns populated (never
// crash, never empty) if the meta fetch fails.
const FALLBACK_SAFETY_MODES = ['read_only', 'propose', 'write', 'yolo']
const FALLBACK_PERSISTENCE = ['ephemeral', 'job']
const FALLBACK_STRATEGIES = [
  'all-voices', 'unanimous', 'majority', 'plurality', 'weighted', 'parity-pair', 'rank',
]

// True when meta's agent_ids_source signals the roster was NOT authoritatively
// resolved (built-in + config fallback, no live doctor probe) — so the UI must
// offer a free-text datalist combobox rather than a closed <select>, letting the
// user type an id the backend could not enumerate.
function agentIdsAreFallback(meta: MetaResp | null): boolean {
  const src = String(meta?.agent_ids_source || '').toLowerCase()
  if (!src) return true // no meta at all → always allow free text
  return /fallback|no backend mcp|config-derived|unresolved|builtin/.test(src)
}

function PathChip({ meta }: { meta: Meta }) {
  return (
    <div className="text-xs text-muted mt-1">
      <span className="opacity-70">{meta.scope}</span>
      {' · '}
      <code className="text-xs">{meta.path}</code>
      {' · '}
      <span className={meta.exists ? 'text-green-500' : 'text-muted opacity-60'}>
        {meta.exists ? 'found' : 'not present'}
      </span>
      {meta.error && <span className="text-amber-500"> · {meta.error}</span>}
    </div>
  )
}

export default function Rutherford() {
  const api = useAppApi()
  const [tab, setTab] = useState<Tab>('status')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [meta, setMeta] = useState<MetaResp | null>(null)
  const [status, setStatus] = useState<StatusResp | null>(null)
  const [configScope, setConfigScope] = useState<'global' | 'workspace'>('global')
  const [config, setConfig] = useState<ConfigResp | null>(null)
  const [panels, setPanels] = useState<PanelsResp | null>(null)
  const [roles, setRoles] = useState<RolesResp | null>(null)

  // Latest-wins keyed on the REQUESTED SCOPE, not a monotonic counter. A
  // monotonic ++id is bumped by ANY re-render/StrictMode double-invoke that
  // re-runs the fetch effect, so an earlier in-flight response is seen as
  // "superseded" and dropped; if every response keeps getting superseded,
  // setConfig NEVER runs and the render gate (scopeReady) sits on
  // "Loading…" forever (the deadlock). Instead we record only the scope the
  // user currently wants: a response is applied iff its requested scope still
  // equals the wanted scope. Two same-scope fetches never supersede each other,
  // so at least one same-scope response ALWAYS lands. We drop only when the user
  // has since switched to a DIFFERENT scope.
  const configScopeRef = useRef<'global' | 'workspace'>('global')

  // Owns ALL /rutherford-config fetching. Kept OUT of loadAll's parallel batch so a scope
  // toggle never re-fires the whole status/panels/roles batch.
  const fetchConfig = useCallback(
    async (scope: 'global' | 'workspace') => {
      // Record the scope this call is asking for; this is what we arbitrate on.
      configScopeRef.current = scope
      try {
        const c = (await api.get(`${BASE}/rutherford-config?scope=${scope}`)) as ConfigResp | null
        // The user switched to a DIFFERENT scope while we were in flight → drop.
        // (A same-scope re-run is NOT a supersede, so it can never deadlock.)
        if (configScopeRef.current !== scope) return
        if (!c || typeof c !== 'object') {
          // Resolved null/empty for the scope we still want → surface it as an
          // error rather than sitting on "Loading…" forever.
          setErr(`No config returned for ${scope} scope.`)
          return
        }
        // Stamp the requested scope so the render guard (config.scope === scope)
        // can't be defeated by a missing/mismatched backend `scope` field.
        setConfig({ ...(c as ConfigResp), scope })
        setErr(null)
      } catch (e) {
        if (configScopeRef.current !== scope) return
        setErr(e instanceof Error ? e.message : String(e))
      }
    },
    [api],
  )

  // loadAll fetches everything EXCEPT /rutherford-config (owned by fetchConfig so a scope
  // toggle never re-fires this batch). Meta is fetched here too — once — and
  // degrades to free-text inputs on failure (never throws the whole batch: it is
  // awaited defensively so a meta 500 doesn't blank status/panels/roles).
  const loadAll = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [m, s, p, r] = await Promise.all([
        // Meta is best-effort: catch so a meta failure degrades dropdowns to
        // free text but never fails the whole load.
        api.get(`${BASE}/rutherford-meta`).catch(() => null),
        api.get(`${BASE}/status`),
        api.get(`${BASE}/panels`),
        // FIX: roles are served at /rutherford-roles (GET+PUT share that base);
        // the old bare /roles path 404s.
        api.get(`${BASE}/rutherford-roles`),
      ])
      if (m && typeof m === 'object' && !(m as MetaResp).error) setMeta(m as MetaResp)
      else setMeta(null)
      setStatus(s as StatusResp)
      setPanels(p as PanelsResp)
      setRoles(r as RolesResp)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [api])

  // Initial + manual full reload (meta/status/panels/roles) plus a config fetch
  // for the current scope. configScope is intentionally NOT a dep of loadAll;
  // the config fetch below re-runs on its own when configScope changes.
  useEffect(() => { void loadAll() }, [loadAll])
  useEffect(() => { void fetchConfig(configScope) }, [fetchConfig, configScope])

  // Scope toggle: flip the scope; the effect above fires the guarded fetch.
  // (Setting state here rather than fetching directly keeps a single fetch path
  // and lets the latest-wins guard arbitrate.)
  const reloadConfig = useCallback((scope: 'global' | 'workspace') => {
    setConfigScope(scope)
  }, [])

  // A PUT succeeded only if the backend echoed the persisted payload with
  // written===true. The host app-sdk `put` RESOLVES null/undefined/empty on a
  // non-OK HTTP response (idiom: `res.ok ? res.json() : null`) instead of
  // throwing — notably on a transient 403 during the host's credential
  // silent-refresh window on a mutating request. So we must inspect the value,
  // not merely rely on the absence of a thrown error.
  const isPersisted = (c: unknown): c is ConfigResp =>
    !!c && typeof c === 'object' && (c as ConfigResp).written === true

  const saveConfig = useCallback(
    async (scope: 'global' | 'workspace', body: Record<string, unknown>) => {
      const url = `${BASE}/rutherford-config?scope=${scope}`

      // Attempt the PUT; on an unconfirmed (null/empty/no-written) response,
      // retry ONCE after a short delay to ride through the silent-refresh 403.
      let resp: unknown = await api.put(url, body)
      if (!isPersisted(resp)) {
        await new Promise((r) => setTimeout(r, 600))
        resp = await api.put(url, body)
      }

      // If the PUT response still doesn't confirm persistence, fall back to a
      // verification GET and confirm the file actually round-tripped the change.
      let confirmed: ConfigResp | null = isPersisted(resp) ? (resp as ConfigResp) : null
      if (!confirmed) {
        const got = await api.get(url)
        if (got && typeof got === 'object') {
          const gc = got as ConfigResp
          // Verify the values we sent are what the file now holds. Comparing the
          // full body is brittle (backend may normalize/round scalars), so we
          // check that every scalar/array key in the body matches the re-read
          // config, which is sufficient to prove the write landed.
          if (bodyMatchesConfig(body, gc.config)) confirmed = gc
        }
      }

      if (!confirmed) {
        // Do NOT update state on failure — keep the user's entered values.
        throw new Error(
          'Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your entered values were kept; try Save again.',
        )
      }

      // Confirmed persisted: reseed from the authoritative server payload.
      // Re-assert the wanted scope so any in-flight fetch for a DIFFERENT scope
      // cannot overwrite this just-saved payload, and stamp the scope on config
      // so the render guard stays satisfied.
      const savedScope = (confirmed.scope as 'global' | 'workspace') ?? configScopeRef.current
      configScopeRef.current = savedScope
      setConfig({ ...confirmed, scope: savedScope })
      // Refresh Overview roster/defaults too.
      try {
        const s = await api.get(`${BASE}/status`)
        if (s && typeof s === 'object') setStatus(s as StatusResp)
      } catch {
        /* non-fatal */
      }
      return confirmed
    },
    [api],
  )

  // Persist the panels list for one scope, using the SAME confirmed-persistence
  // discipline as config: the host `put` resolves (does not throw) on a non-OK
  // response, so we require written===true, retry once through a transient 403,
  // then fall back to a verify GET that confirms the panel-name set round-tripped
  // to disk. On failure we throw (the caller keeps the user's edits) and never
  // report a phantom success.
  const savePanels = useCallback(
    async (scope: 'global' | 'workspace', panelsBody: PanelRec[]) => {
      const url = `${BASE}/rutherford-panels?scope=${scope}`
      const body = { panels: panelsBody }
      const wrote = (v: unknown): v is PanelsWriteResp =>
        !!v && typeof v === 'object' && (v as PanelsWriteResp).written === true

      let resp: unknown = await api.put(url, body)
      if (!wrote(resp)) {
        await new Promise((r) => setTimeout(r, 600))
        resp = await api.put(url, body)
      }

      let confirmed: PanelsWriteResp | null = wrote(resp) ? (resp as PanelsWriteResp) : null
      if (!confirmed) {
        // Verify GET: /panels returns BOTH scopes; pick the one we wrote and
        // confirm the panel-name set matches what we sent.
        const got = (await api.get(`${BASE}/panels`)) as PanelsResp | null
        const src = got?.sources?.find((s) => s.scope === scope)
        if (src) {
          const want = panelsBody.map((p) => p.name).sort()
          const have = (Array.isArray(src.panels) ? src.panels : []).map((p) => p.name).sort()
          if (want.length === have.length && want.every((n, i) => n === have[i])) {
            confirmed = { ...src, written: true }
          }
        }
      }

      if (!confirmed) {
        throw new Error(
          'Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your edits were kept; try Save again.',
        )
      }

      // Refresh the full panels payload (both scopes) from the authoritative GET
      // so the other scope stays correct too.
      try {
        const fresh = (await api.get(`${BASE}/panels`)) as PanelsResp | null
        if (fresh && typeof fresh === 'object') setPanels(fresh)
      } catch {
        /* non-fatal — the write already confirmed */
      }
      return confirmed
    },
    [api],
  )

  // Read one role's full body (for the edit form). Returns null on a miss.
  const fetchRole = useCallback(
    async (scope: 'global' | 'workspace', name: string): Promise<RoleBody | null> => {
      try {
        const got = (await api.get(
          `${BASE}/rutherford-roles?scope=${scope}&name=${encodeURIComponent(name)}`,
        )) as RoleGetResp | null
        if (got && typeof got === 'object' && got.role && typeof got.role === 'object') {
          return got.role
        }
        return null
      } catch {
        return null
      }
    },
    [api],
  )

  // Create/overwrite OR delete a role file. SAME confirmed-persistence discipline
  // as config/panels: require written===true, retry once after 600ms through a
  // transient 403, then fall back to a verify GET (the listing for create/edit;
  // the single-role 404 for delete). On failure we throw so the caller keeps the
  // user's edits and never reports a phantom success.
  const saveRole = useCallback(
    async (
      scope: 'global' | 'workspace',
      payload: { name: string; op?: 'delete' } & Partial<RoleBody>,
    ): Promise<RoleWriteResp> => {
      const url = `${BASE}/rutherford-roles?scope=${scope}`
      const wrote = (v: unknown): v is RoleWriteResp =>
        !!v && typeof v === 'object' && (v as RoleWriteResp).written === true
      const isDelete = payload.op === 'delete'

      let resp: unknown = await api.put(url, payload)
      if (!wrote(resp)) {
        await new Promise((r) => setTimeout(r, 600))
        resp = await api.put(url, payload)
      }

      let confirmed: RoleWriteResp | null = wrote(resp) ? (resp as RoleWriteResp) : null
      if (!confirmed) {
        if (isDelete) {
          // Confirm deletion ONLY on EXPLICIT absence — never infer it from a
          // thrown error or a bare null, which also arise from 403/500/timeout/
          // offline and would falsely report a delete while the file survives.
          //
          // Two explicit-absence signals, either of which confirms:
          //   1. The single-role GET returns a well-formed body with
          //      exists === false (the backend's 404 payload, if the host
          //      surfaces it rather than collapsing a non-OK response to null).
          //   2. The role is absent from a WELL-FORMED roles listing for this
          //      scope (a 200 the host cannot collapse to null). A malformed or
          //      unreachable listing is NOT absence.
          // Any thrown error, or a null/empty single-role response with no
          // corroborating listing, leaves `confirmed` null → we throw below,
          // surfacing an error and RETAINING the editor draft.
          let sawExplicitAbsence = false
          try {
            const got = (await api.get(
              `${BASE}/rutherford-roles?scope=${scope}&name=${encodeURIComponent(payload.name)}`,
            )) as RoleGetResp | null
            if (got && typeof got === 'object' && (got as RoleGetResp).exists === false) {
              sawExplicitAbsence = true
            }
          } catch {
            // A non-404 throw (or a 404 the host raises) is NOT, on its own,
            // proof of deletion — fall through to the authoritative listing.
          }
          if (!sawExplicitAbsence) {
            try {
              const listing = (await api.get(`${BASE}/rutherford-roles`)) as RolesResp | null
              // Require a well-formed listing: a real sources array with an
              // entry for this scope. Absent that, we cannot assert absence.
              const sources = Array.isArray(listing?.sources) ? listing!.sources : null
              const src = sources ? sources.find((s) => s.scope === scope) : undefined
              // The scoped source is authoritative for absence ONLY when it is
              // present, carries NO `error`, and has a well-formed (array)
              // `roles`. The backend emits `{ scope, roles: [], error: "..." }`
              // when directory enumeration fails (permissions/I/O); an empty or
              // incomplete list under an error must NOT read as "role absent",
              // or a failed listing would masquerade as a confirmed delete.
              if (src && !src.error && Array.isArray(src.roles)) {
                const stillThere = src.roles.some((r) => r.name === payload.name)
                if (!stillThere) sawExplicitAbsence = true
              }
            } catch {
              /* unreachable listing is not absence — leave unconfirmed */
            }
          }
          if (sawExplicitAbsence) {
            confirmed = { scope, path: '', platform: '', written: true, deleted: true }
          }
        } else {
          // Verify the role now appears in the scope's listing.
          const listing = (await api.get(`${BASE}/rutherford-roles`)) as RolesResp | null
          const src = (Array.isArray(listing?.sources) ? listing!.sources : []).find(
            (s) => s.scope === scope,
          )
          const found = (Array.isArray(src?.roles) ? src!.roles : []).some(
            (r) => r.name === payload.name,
          )
          if (found) confirmed = { scope, path: src?.path ?? '', platform: '', written: true }
        }
      }

      if (!confirmed) {
        throw new Error(
          isDelete
            ? 'Delete could not be confirmed — the role file may still exist (a non-404 error, empty response, or unreachable server). Nothing was closed; your draft was kept. Try Delete again.'
            : 'Save could not be confirmed (the write did not persist — likely a transient auth refresh). Your edits were kept; try Save again.',
        )
      }

      // Refresh the listing so the Roles tab reflects the change in both scopes.
      try {
        const fresh = (await api.get(`${BASE}/rutherford-roles`)) as RolesResp | null
        if (fresh && typeof fresh === 'object') setRoles(fresh)
      } catch {
        /* non-fatal — the write already confirmed */
      }
      return confirmed
    },
    [api],
  )

  return (
    <>
      <PageHeader title="Rutherford" subtitle="Config, panels & roles — config.toml / panels.toon / role files" />
      <div className="px-6 pb-8 overflow-y-auto flex-1 min-h-0">
        <div className="flex gap-1 mb-5 border-b border-[var(--border,#2a2a2a)]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={
                'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ' +
                (tab === id
                  ? 'border-[var(--accent,#6366f1)] text-[var(--fg,#eee)]'
                  : 'border-transparent text-muted hover:text-[var(--fg,#eee)]')
              }
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
          <button
            onClick={() => void loadAll()}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-[var(--fg,#eee)]"
            title="Reload"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {err && (
          <div className="flex items-center gap-2 text-sm text-amber-500 mb-4">
            <AlertTriangle size={15} /> {err}
          </div>
        )}

        {loading && !status ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <>
            {tab === 'status' && <StatusView status={status} />}
            {tab === 'config' && (
              <ConfigView
                config={config}
                meta={meta}
                scope={configScope}
                onScope={reloadConfig}
                onSave={saveConfig}
              />
            )}
            {tab === 'panels' && <PanelsView panels={panels} meta={meta} onSave={savePanels} />}
            {tab === 'roles' && (
              <RolesView roles={roles} meta={meta} onFetchRole={fetchRole} onSave={saveRole} />
            )}
          </>
        )}
      </div>
    </>
  )
}

function StatusView({ status }: { status: StatusResp | null }) {
  if (!status) return <p className="text-sm text-muted">No status.</p>
  const agents = status.agents || { enabled: [], enabled_source: '', allowlist_configured: false, roster: [] }
  const enabled = Array.isArray(agents.enabled) ? agents.enabled : []
  const roster = Array.isArray(agents.roster) ? agents.roster : []
  const acpSources = Array.isArray(status.acp) ? status.acp : []
  const defaults = status.defaults || {}
  const rosterValue = agents.allowlist_configured ? String(enabled.length) : 'All'
  const envKeys = Object.keys(status.env_overrides || {}).filter((k) => k !== '_note')
  return (
    <>
      <Card>
        <CardTitle>What is Rutherford?</CardTitle>
        <p className="text-sm text-muted mt-1">
          A Kiro Crew app that drives external ACP coding agents (Claude Code, Codex, and
          others) for multi-agent <strong>delegation, consensus, debate, review, and
          planning</strong> — read-only by default.
        </p>
        <p className="text-sm text-muted mt-2">
          <strong>Setup:</strong> run <code className="text-xs">rutherford doctor</code> — a
          real read-only per-agent health check that confirms your crew is installed and
          answering. If nothing is installed yet, the setup-rutherford flow /{' '}
          <code className="text-xs">rutherford setup</code> scaffolds config.
        </p>
        <p className="text-sm text-muted mt-2">
          <strong>Two ways to configure it:</strong>
        </p>
        <ul className="text-sm text-muted mt-1" style={{ paddingLeft: 18, listStyle: 'disc' }}>
          <li style={{ marginTop: 2 }}>
            <strong>Manual</strong> — use the <strong>Config</strong>, <strong>Panels</strong>,
            and <strong>Roles</strong> tabs in this app to edit Rutherford's configuration
            directly (global or workspace <code className="text-xs">config.toml</code>,{' '}
            <code className="text-xs">panels.toon</code>, role files).
          </li>
          <li style={{ marginTop: 4 }}>
            <strong>Conversational</strong> — or just talk to Rutherford in a Kiro Crew session
            using the <code className="text-xs">rutherford-orchestrator</code> agent. It routes
            your request to the right mode (delegate / consensus / debate / review / plan) and
            can configure Rutherford for you.
          </li>
        </ul>
      </Card>

      <div className="h-3" />

      <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mb-6">
        <StatCard label="Platform" value={status.platform} />
        <StatCard label="Agents enabled" value={rosterValue} accent />
        <StatCard label="Safety mode" value={defaults.safety_mode ?? 'read_only'} />
        <StatCard
          label="Local model detect"
          value={defaults.auto_detect_local_models ? 'on' : 'off'}
        />
      </div>

      <Card>
        <CardTitle>Resolved roster</CardTitle>
        {roster.length > 0 ? (
          <div className="mt-2 flex flex-col gap-1.5">
            {roster.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span className="px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]">
                  {a.id}
                </span>
                <span className="text-muted text-xs">
                  {a.default_model ?? '(agent default)'}
                </span>
                <span className="text-[10px] text-muted opacity-60 ml-auto">{a.source}</span>
              </div>
            ))}
          </div>
        ) : agents.allowlist_configured ? (
          <div className="flex flex-wrap gap-2 mt-2">
            {enabled.map((a) => (
              <span
                key={a}
                className="px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]"
              >
                {a}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted mt-1">
            No <code>enabled_agents</code> allowlist configured — Rutherford enables every
            built-in agent plus any configured agent (source: {agents.enabled_source || 'default'}).
          </p>
        )}
      </Card>

      <div className="h-3" />

      <Card>
        <CardTitle>Config locations</CardTitle>
        {status.config_locations?.global && <PathChip meta={status.config_locations.global} />}
        {status.config_locations?.workspace && <PathChip meta={status.config_locations.workspace} />}
      </Card>

      <div className="h-3" />

      <Card>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            <Server size={14} /> acp.json (agent servers)
          </span>
        </CardTitle>
        {acpSources.map((s) => {
          const keys = Object.keys(s.agent_servers || {})
          return (
            <div key={s.path} className="mt-2">
              <PathChip meta={s} />
              {keys.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {keys.map((k) => (
                    <span
                      key={k}
                      className="px-2 py-0.5 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </Card>

      {envKeys.length > 0 && (
        <>
          <div className="h-3" />
          <Card>
            <CardTitle>Environment overrides</CardTitle>
            <div className="mt-2 flex flex-col gap-1">
              {envKeys.map((k) => (
                <div key={k} className="text-xs">
                  <code>{k}</code>
                  {' = '}
                  <code className="text-muted">{String((status.env_overrides || {})[k])}</code>
                </div>
              ))}
            </div>
            {(status.env_overrides || {})['_note'] && (
              <p className="text-xs text-amber-500 mt-2">{String((status.env_overrides || {})['_note'])}</p>
            )}
          </Card>
        </>
      )}

      <div className="h-3" />

      <Card>
        <CardTitle>Reachability</CardTitle>
        <p className="text-sm text-muted mt-1">{status.reachability?.note ?? '—'}</p>
      </Card>
    </>
  )
}

// ---- editable primitives -------------------------------------------------

// A small "?" help affordance: a hoverable/tappable info dot whose tooltip is the
// native title (works everywhere, no portal). Presentational only.
function HelpDot({ text }: { text: string }) {
  if (!text) return null
  return (
    <span
      className="inline-flex items-center justify-center align-middle ml-1 text-muted opacity-60 hover:opacity-100 cursor-help"
      title={text}
      aria-label={text}
      role="img"
    >
      <Info size={12} />
    </span>
  )
}

// A required/optional marker. required → amber "*"; optional → muted "optional".
function ReqMark({ required }: { required: boolean }) {
  return required ? (
    <span className="text-amber-500 ml-1" title="Required">*</span>
  ) : (
    <span className="text-[10px] text-muted opacity-60 ml-1.5">optional</span>
  )
}

// A labelled form control driven by a field descriptor. `label` is the
// human-readable title; `hint` is the raw config key shown small + muted so the
// mapping stays unambiguous; `help` is the tooltip; `required` renders the
// marker; `absent` is the "what an absent value means" note rendered muted below.
function Field({
  label,
  hint,
  help,
  required,
  absent,
  children,
}: {
  label: string
  hint?: string
  help?: string
  required?: boolean
  absent?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-[var(--fg,#eee)] flex items-center flex-wrap">
        {label}
        {hint && <code className="ml-1.5 text-[10px] text-muted opacity-70">{hint}</code>}
        {help && <HelpDot text={help} />}
        {required !== undefined && <ReqMark required={required} />}
      </span>
      {absent && <span className="text-[11px] text-muted -mt-0.5">absent → {absent}</span>}
      {children}
    </label>
  )
}

const inputCls =
  'px-2 py-1.5 text-sm rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)] text-[var(--fg,#eee)] outline-none focus:border-[var(--accent,#6366f1)]'

function StringList({
  label,
  hint,
  help,
  required,
  absent,
  values,
  onChange,
}: {
  label: string
  hint?: string
  help?: string
  required?: boolean
  absent?: string
  values: string[]
  onChange: (v: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-[var(--fg,#eee)] flex items-center flex-wrap">
        {label}
        {hint && <code className="ml-1.5 text-[10px] text-muted opacity-70">{hint}</code>}
        {help && <HelpDot text={help} />}
        {required !== undefined && <ReqMark required={required} />}
      </span>
      {absent && <span className="text-[11px] text-muted -mt-0.5">empty → {absent}</span>}
      <div className="flex flex-col gap-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              className={inputCls + ' flex-1'}
              value={v}
              onChange={(e) => {
                const next = values.slice()
                next[i] = e.target.value
                onChange(next)
              }}
            />
            <button
              className="p-1 text-muted hover:text-amber-500"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              title="Remove"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <input
            className={inputCls + ' flex-1'}
            placeholder={`Add ${label}…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) {
                onChange([...values, draft.trim()])
                setDraft('')
              }
            }}
          />
          <button
            className="p-1 text-muted hover:text-[var(--accent,#6366f1)]"
            onClick={() => {
              if (draft.trim()) {
                onChange([...values, draft.trim()])
                setDraft('')
              }
            }}
            title="Add"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// An unambiguous switch. Styled entirely with INLINE styles because this app
// ships NO CSS and NO Tailwind compiler — arbitrary Tailwind utility class names
// (h-6 w-12 left-[26px] bg-[#4f46e5] etc.) only render if the host dashboard's
// stylesheet happens to define them, which it does not, so class-driven track
// geometry and fill never paint. Inline styles ALWAYS render, independent of any
// stylesheet. Renders a pill TRACK + a KNOB that slides left(off)/right(on).
// ON = filled in the THEME color var(--accent) (purple), with a #7c3aed purple
// fallback when --accent is unset. OFF = empty (transparent) with a grey border.
// No "ON"/"OFF" text — fill vs empty conveys state. Proper role="switch" +
// aria-checked for assistive tech. `srLabel` gives an accessible name to a bare
// (label-less) switch, e.g. a per-agent Enabled cell.
function Switch({
  value,
  onChange,
  srLabel,
}: {
  value: boolean
  onChange: (v: boolean) => void
  srLabel?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={srLabel}
      onClick={() => onChange(!value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        flex: 'none',
        width: 40,
        height: 22,
        borderRadius: 9999,
        cursor: 'pointer',
        padding: 0,
        boxSizing: 'border-box',
        transition: 'background-color .15s, border-color .15s',
        outline: 'none',
        backgroundColor: value ? 'var(--accent, #7c3aed)' : 'transparent',
        border: value
          ? '1px solid var(--accent, #7c3aed)'
          : '1px solid var(--border, #6b7280)',
        boxShadow: focused ? '0 0 0 2px var(--accent, #7c3aed)' : 'none',
      }}
    >
      {/* Sliding knob — slides on a 40px track: OFF sits 2px from the left,
          ON sits 2px from the right (40 - 16 - 2 = 22). Vertically centered:
          22px track, 16px knob, top:2 leaves 2px + 2px = centered (border 1px
          each side is included in box-sizing:border-box on the track). */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 2,
          left: value ? 20 : 2,
          width: 16,
          height: 16,
          borderRadius: 9999,
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 2px rgba(0,0,0,.35)',
          transition: 'left .15s',
        }}
      />
    </button>
  )
}

// A labelled switch row: the Switch plus its human label / config-key hint /
// help / absent-meaning. Used for the Defaults toggles.
function Toggle({
  label,
  hint,
  help,
  absent,
  value,
  onChange,
}: {
  label: string
  hint?: string
  help?: string
  absent?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <span className="mt-0.5">
        <Switch value={value} onChange={onChange} srLabel={label || undefined} />
      </span>
      <span className="flex flex-col">
        <span className="text-sm text-[var(--fg,#eee)] flex items-center flex-wrap">
          {label}
          {hint && <code className="ml-1.5 text-[10px] text-muted opacity-70">{hint}</code>}
          {help && <HelpDot text={help} />}
        </span>
        {absent && <span className="text-[11px] text-muted">absent → {absent}</span>}
      </span>
    </label>
  )
}

// ---- Centralized Config field descriptors --------------------------------
//
// ONE source of truth for every Config field's label, raw config key (hint),
// help text, required|optional status, and absent-meaning. Every Config control
// reads its metadata from here so the help affordance / required marker /
// absent-meaning wording stays consistent and is defined in exactly one place.
// The verbatim absent-meaning wording is the reviewer-specified copy.
type FieldKey =
  | 'default_safety_mode'
  | 'default_persistence'
  | 'default_timeout_s'
  | 'max_targets'
  | 'auto_detect_local_models'
  | 'synthesize_default'
  | 'enabled_agents'
  | 'trusted_workspaces'
  | 'role_dirs'
  | 'agent_override'

type FieldDesc = {
  label: string
  key: string // raw config key hint
  help: string
  required: boolean
  absent: string // what an absent/empty value means
}

const CONFIG_FIELDS: Record<FieldKey, FieldDesc> = {
  default_safety_mode: {
    label: 'Default safety mode',
    key: 'default_safety_mode',
    help: 'The safety posture applied to a delegation when the call does not name one. read_only reads only; propose stages a diff; write edits in a sandbox; yolo edits with no sandbox.',
    required: false,
    absent: 'defaults to read_only',
  },
  default_persistence: {
    label: 'Run persistence',
    key: 'default_persistence',
    help: 'Whether a run is kept as a durable job on disk (job) or discarded after it returns (ephemeral), when the call does not specify.',
    required: false,
    absent: 'defaults to ephemeral',
  },
  default_timeout_s: {
    label: 'Default timeout (seconds)',
    key: 'default_timeout_s',
    help: 'Per-voice / per-delegation wall-clock timeout applied when a call does not pass its own timeout_s.',
    required: false,
    absent: 'uses the built-in default',
  },
  max_targets: {
    label: 'Max agents per panel',
    key: 'max_targets',
    help: 'Upper bound on how many agents an auto-expanded (all) panel fans out to.',
    required: false,
    absent: 'uses the built-in default',
  },
  auto_detect_local_models: {
    label: 'Auto-detect local models (Ollama / LM Studio)',
    key: 'auto_detect_local_models',
    help: 'When on, Rutherford probes a local Ollama / LM Studio and offers detected models as free voices.',
    required: false,
    absent: 'defaults to off',
  },
  synthesize_default: {
    label: 'Synthesize a combined answer by default',
    key: 'synthesize_default',
    help: 'When on, an all-voices consensus adds a server-side combined answer unless the call overrides it.',
    required: false,
    absent: 'defaults to off',
  },
  enabled_agents: {
    label: 'Enabled agents (allowlist)',
    key: 'enabled_agents',
    help: 'An explicit allowlist of agent ids Rutherford may drive. When set, only these are enabled.',
    required: false,
    absent: 'All built-in + configured agents are enabled',
  },
  trusted_workspaces: {
    label: 'Trusted workspaces (write/yolo allowed)',
    key: 'trusted_workspaces',
    help: 'Absolute directories where write & yolo delegations are permitted. A path not on this list can only be read.',
    required: false,
    absent: 'write/yolo not permitted anywhere',
  },
  role_dirs: {
    label: 'Custom role directories',
    key: 'role_dirs',
    help: 'Extra folders scanned for role persona files, in addition to the default ~/.rutherford/roles and <project>/.rutherford/roles.',
    required: false,
    absent: 'only ~/.rutherford/roles and <project>/.rutherford/roles scanned',
  },
  agent_override: {
    label: 'Default model',
    key: '[agents.<id>].default_model',
    help: 'A per-agent default model id used when a call to that agent does not name a model. Free text — model ids are open.',
    required: false,
    absent: "uses the agent's built-in default model",
  },
}

// ---- Config tab (editable) ----------------------------------------------

type Draft = {
  default_safety_mode: string
  default_timeout_s: string
  max_targets: string
  auto_detect_local_models: boolean
  default_persistence: string
  synthesize_default: boolean
  enabled_agents: string[]
  trusted_workspaces: string[]
  role_dirs: string[]
  agents: AgentRow[]
}

function toDraft(config: ConfigResp): Draft {
  const c = config.config || {}
  // Bind a number field to the LOADED value. A TOML scalar parses to a JS
  // number (int OR float), which is the normal case; a hand-quoted value
  // ("1800") arrives as a numeric string and must still bind rather than
  // silently blanking to a default. Only a genuinely ABSENT key (undefined) or
  // a non-numeric value falls back to '' (the "unset — use Rutherford's own
  // default" state), which is exactly how max_targets already binds correctly.
  const num = (k: string): string => {
    const v = c[k]
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
      return String(Number(v))
    }
    return ''
  }
  const derived = config.derived || ({} as ConfigResp['derived'])
  const asList = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  return {
    default_safety_mode: typeof c.default_safety_mode === 'string' ? c.default_safety_mode : 'read_only',
    default_timeout_s: num('default_timeout_s'),
    max_targets: num('max_targets'),
    auto_detect_local_models: c.auto_detect_local_models === true,
    default_persistence:
      typeof c.default_persistence === 'string' ? c.default_persistence : 'ephemeral',
    synthesize_default: c.synthesize_default === true,
    enabled_agents: asList(derived.enabled_agents),
    trusted_workspaces: asList(derived.trusted_workspaces),
    role_dirs: asList(derived.role_dirs),
    agents: (Array.isArray(config.agents) ? config.agents : []).map((a) => ({
      ...a,
      env: { ...(a.env || {}) },
      extra: { ...(a.extra || {}) },
    })),
  }
}

// Confirm a write landed: every scalar/array key we SENT must equal what the
// re-read config now holds. Used as a fallback proof-of-persistence when the
// PUT response itself doesn't carry written===true (host `put` can resolve
// empty on a non-OK response). Scalars are compared loosely (String()) so a
// backend numeric normalization (e.g. 30 vs 30.0) still counts as a match; the
// nested `agents` table is compared by the set of declared agent ids, which is
// enough to prove the mutation reached disk without reimplementing TOML
// round-trip semantics here.
function bodyMatchesConfig(
  body: Record<string, unknown>,
  config: Record<string, unknown> | undefined,
): boolean {
  if (!config || typeof config !== 'object') return false
  const scalarEq = (a: unknown, b: unknown) => String(a) === String(b)
  for (const [k, v] of Object.entries(body)) {
    const got = config[k]
    if (k === 'agents') {
      const sent = v && typeof v === 'object' ? Object.keys(v as object).sort() : []
      const have = got && typeof got === 'object' ? Object.keys(got as object).sort() : []
      if (sent.length !== have.length || sent.some((x, i) => x !== have[i])) return false
      continue
    }
    if (Array.isArray(v)) {
      if (!Array.isArray(got) || got.length !== v.length) return false
      if (v.some((x, i) => !scalarEq(x, (got as unknown[])[i]))) return false
      continue
    }
    if (!scalarEq(v, got)) return false
  }
  return true
}

// Build the write body, preserving any config keys we don't surface as editable
// (so a save doesn't silently drop settings the UI doesn't expose).
function toBody(config: ConfigResp, d: Draft): Record<string, unknown> {
  const body: Record<string, unknown> = { ...config.config }
  delete body.agents

  const setNum = (k: string, s: string) => {
    if (s.trim() === '') delete body[k]
    else {
      const n = Number(s)
      if (!Number.isNaN(n)) body[k] = n
    }
  }
  body.default_safety_mode = d.default_safety_mode
  setNum('default_timeout_s', d.default_timeout_s)
  setNum('max_targets', d.max_targets)
  body.auto_detect_local_models = d.auto_detect_local_models
  body.default_persistence = d.default_persistence
  body.synthesize_default = d.synthesize_default

  const setList = (k: string, v: string[]) => {
    const clean = v.map((s) => s.trim()).filter(Boolean)
    if (clean.length) body[k] = clean
    else delete body[k]
  }
  setList('enabled_agents', d.enabled_agents)
  setList('trusted_workspaces', d.trusted_workspaces)
  setList('role_dirs', d.role_dirs)

  const agents: Record<string, unknown> = {}
  for (const a of d.agents) {
    const id = a.id.trim()
    if (!id) continue
    const tbl: Record<string, unknown> = { ...a.extra }
    if (a.default_model != null && String(a.default_model).trim() !== '') {
      tbl.default_model = a.default_model
    }
    tbl.enabled = a.enabled
    if (a.env && Object.keys(a.env).length) tbl.env = a.env
    agents[id] = tbl
  }
  if (Object.keys(agents).length) body.agents = agents

  return body
}

// A <select> driven by meta, OR — when the options come from an unresolved
// fallback (agentIdsAreFallback) — a free-text <input> backed by a <datalist> so
// the user can still type an id the backend could not enumerate. `options` is
// always guarded to [] by the caller.
function ComboSelect({
  value,
  options,
  freeText,
  onChange,
  listId,
  placeholder,
}: {
  value: string
  options: string[]
  freeText: boolean
  onChange: (v: string) => void
  listId: string
  placeholder?: string
}) {
  const opts = Array.isArray(options) ? options : []
  if (freeText) {
    return (
      <>
        <input
          className={inputCls}
          value={value}
          list={listId}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        <datalist id={listId}>
          {opts.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      </>
    )
  }
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {/* Ensure the current value is always selectable even if not in options. */}
      {value !== '' && !opts.includes(value) && <option value={value}>{value}</option>}
      {opts.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function ConfigView({
  config,
  meta,
  scope,
  onScope,
  onSave,
}: {
  config: ConfigResp | null
  meta: MetaResp | null
  scope: 'global' | 'workspace'
  onScope: (s: 'global' | 'workspace') => void
  onSave: (s: 'global' | 'workspace', body: Record<string, unknown>) => Promise<ConfigResp>
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Option sets from meta, guarded to the fallback constants when meta is absent.
  const safetyModes = Array.isArray(meta?.safety_modes) && meta!.safety_modes.length
    ? meta!.safety_modes : FALLBACK_SAFETY_MODES
  const persistence = Array.isArray(meta?.persistence) && meta!.persistence.length
    ? meta!.persistence : FALLBACK_PERSISTENCE
  const agentIds = Array.isArray(meta?.agent_ids) ? meta!.agent_ids : []
  const agentFreeText = agentIdsAreFallback(meta)

  // Render guard: the loaded config must match the selected scope. Until the
  // scope-matched fetch lands, `config` may still hold the previous scope's
  // payload — showing it would let Global render a Workspace payload (the race
  // symptom). Gate the form on config.scope === scope; otherwise show loading.
  const scopeReady = !!config && config.scope === scope

  useEffect(() => {
    // (Re)seed the draft only from a scope-matched config that carries data. A
    // null/mismatched/empty config (e.g. an unconfirmed save that resolved
    // empty, or a not-yet-arrived scope switch) must NEVER blank the user's
    // in-progress fields — keep the prior draft.
    if (!config || config.scope !== scope) {
      setDraft((d) => d ?? null)
      return
    }
    setSaveMsg(null)
    setDraft(toDraft(config))
  }, [config, scope])

  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d))

  const handleSave = async () => {
    if (!config || !draft) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await onSave(scope, toBody(config, draft))
      setSaveMsg({ ok: true, text: `Saved to ${scope} config.toml (backup written).` })
    } catch (e) {
      setSaveMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  const F = CONFIG_FIELDS

  return (
    <>
      <div className="flex items-center gap-1 mb-4">
        {(['global', 'workspace'] as const).map((s) => (
          <button
            key={s}
            onClick={() => onScope(s)}
            className={
              'px-3 py-1.5 text-sm rounded transition-colors ' +
              (scope === s
                ? 'bg-[var(--accent,#6366f1)] text-white'
                : 'bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]')
            }
          >
            {s === 'global' ? 'Global' : 'Workspace'}
          </button>
        ))}
        <button
          onClick={() => void handleSave()}
          disabled={saving || !draft}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50"
        >
          <Save size={14} /> {saving ? 'Saving…' : `Save ${scope}`}
        </button>
      </div>

      {!meta && (
        <div className="flex items-center gap-2 text-xs text-muted mb-3">
          <AlertTriangle size={13} /> Option lists (dropdowns) could not be loaded from the
          backend — showing free-text inputs instead.
        </div>
      )}

      {saveMsg && (
        <div
          className={
            'flex items-center gap-2 text-sm mb-4 ' +
            (saveMsg.ok ? 'text-green-500' : 'text-amber-500')
          }
        >
          {saveMsg.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {saveMsg.text}
        </div>
      )}

      {!scopeReady || !draft ? (
        <p className="text-sm text-muted">Loading {scope} config…</p>
      ) : (
        <>
          <Card>
            <CardTitle>Defaults</CardTitle>
            <PathChip meta={config} />
            {!config.exists && (
              <p className="text-xs text-muted mt-2">
                No <code>config.toml</code> at this scope yet — no file yet; defaults apply; saving
                creates it (<code>{config.path}</code>).
              </p>
            )}
            <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] mt-3">
              <Field
                label={F.default_safety_mode.label}
                hint={F.default_safety_mode.key}
                help={F.default_safety_mode.help}
                required={F.default_safety_mode.required}
                absent={F.default_safety_mode.absent}
              >
                <select
                  className={inputCls}
                  value={draft.default_safety_mode}
                  onChange={(e) => patch({ default_safety_mode: e.target.value })}
                >
                  {safetyModes.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={F.default_timeout_s.label}
                hint={F.default_timeout_s.key}
                help={F.default_timeout_s.help}
                required={F.default_timeout_s.required}
                absent={F.default_timeout_s.absent}
              >
                <input
                  type="number"
                  className={inputCls}
                  value={draft.default_timeout_s}
                  onChange={(e) => patch({ default_timeout_s: e.target.value })}
                />
              </Field>
              <Field
                label={F.max_targets.label}
                hint={F.max_targets.key}
                help={F.max_targets.help}
                required={F.max_targets.required}
                absent={F.max_targets.absent}
              >
                <input
                  type="number"
                  className={inputCls}
                  value={draft.max_targets}
                  onChange={(e) => patch({ max_targets: e.target.value })}
                />
              </Field>
              <Field
                label={F.default_persistence.label}
                hint={F.default_persistence.key}
                help={F.default_persistence.help}
                required={F.default_persistence.required}
                absent={F.default_persistence.absent}
              >
                <select
                  className={inputCls}
                  value={draft.default_persistence}
                  onChange={(e) => patch({ default_persistence: e.target.value })}
                >
                  {persistence.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex flex-wrap gap-6 mt-4">
              <Toggle
                label={F.auto_detect_local_models.label}
                hint={F.auto_detect_local_models.key}
                help={F.auto_detect_local_models.help}
                absent={F.auto_detect_local_models.absent}
                value={draft.auto_detect_local_models}
                onChange={(v) => patch({ auto_detect_local_models: v })}
              />
              <Toggle
                label={F.synthesize_default.label}
                hint={F.synthesize_default.key}
                help={F.synthesize_default.help}
                absent={F.synthesize_default.absent}
                value={draft.synthesize_default}
                onChange={(v) => patch({ synthesize_default: v })}
              />
            </div>
          </Card>

          <div className="h-3" />

          <Card>
            <CardTitle>Allowlists &amp; directories</CardTitle>
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] mt-3">
              <StringList
                label={F.enabled_agents.label}
                hint={F.enabled_agents.key}
                help={F.enabled_agents.help}
                required={F.enabled_agents.required}
                absent={F.enabled_agents.absent}
                values={draft.enabled_agents}
                onChange={(v) => patch({ enabled_agents: v })}
              />
              <StringList
                label={F.trusted_workspaces.label}
                hint={F.trusted_workspaces.key}
                help={F.trusted_workspaces.help}
                required={F.trusted_workspaces.required}
                absent={F.trusted_workspaces.absent}
                values={draft.trusted_workspaces}
                onChange={(v) => patch({ trusted_workspaces: v })}
              />
              <StringList
                label={F.role_dirs.label}
                hint={F.role_dirs.key}
                help={F.role_dirs.help}
                required={F.role_dirs.required}
                absent={F.role_dirs.absent}
                values={draft.role_dirs}
                onChange={(v) => patch({ role_dirs: v })}
              />
            </div>
          </Card>

          <div className="h-3" />

          <Card>
            <CardTitle>Per-agent overrides</CardTitle>
            <p className="text-[11px] text-muted mt-1 flex items-center flex-wrap">
              <code className="text-[10px] opacity-70">[agents.*]</code>
              <span className="ml-1.5">per-agent default model and enabled flag.</span>
              <HelpDot text={F.agent_override.help} />
              <span className="ml-1.5">absent → {F.agent_override.absent}</span>
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {draft.agents.length > 0 && (
                <div className="flex items-center gap-2 px-2 text-[10px] uppercase tracking-wide text-muted opacity-70">
                  <span className="w-40">Agent (id)</span>
                  <span className="flex-1">Default model (free text)</span>
                  <span>Enabled</span>
                  <span className="w-6" />
                </div>
              )}
              {draft.agents.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]"
                >
                  <div className="w-40">
                    <ComboSelect
                      value={a.id}
                      options={agentIds}
                      freeText={agentFreeText}
                      listId={`agent-ids-${i}`}
                      placeholder="agent id"
                      onChange={(v) => {
                        const next = draft.agents.slice()
                        next[i] = { ...a, id: v }
                        patch({ agents: next })
                      }}
                    />
                  </div>
                  <input
                    className={inputCls + ' flex-1'}
                    value={a.default_model ?? ''}
                    placeholder="Default model (blank = agent default)"
                    onChange={(e) => {
                      const next = draft.agents.slice()
                      next[i] = { ...a, default_model: e.target.value }
                      patch({ agents: next })
                    }}
                  />
                  <Switch
                    value={a.enabled}
                    srLabel={`Enabled: ${a.id || 'agent'}`}
                    onChange={(v) => {
                      const next = draft.agents.slice()
                      next[i] = { ...a, enabled: v }
                      patch({ agents: next })
                    }}
                  />
                  <button
                    className="p-1 text-muted hover:text-amber-500"
                    onClick={() => patch({ agents: draft.agents.filter((_, j) => j !== i) })}
                    title="Remove agent"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start"
                onClick={() =>
                  patch({
                    agents: [
                      ...draft.agents,
                      { id: '', default_model: '', enabled: true, env: {}, extra: {} },
                    ],
                  })
                }
              >
                <Plus size={14} /> Add agent
              </button>
            </div>
          </Card>
        </>
      )}
    </>
  )
}

// Seat keys we surface as first-class editable fields. Any OTHER key present on
// a seat (an unknown/future key) is carried through untouched on save — never
// dropped — because the editor deep-clones the whole seat object. `cli` and
// `role` are rendered specially (meta-driven dropdowns) so they are excluded
// from this generic text-field list.
const SEAT_TEXT_FIELDS: { key: keyof PanelSeat; label: string; placeholder: string }[] = [
  { key: 'model', label: 'model', placeholder: 'agent default (free text)' },
  { key: 'label', label: 'label', placeholder: 'result key' },
  { key: 'stance', label: 'stance', placeholder: 'for / against / neutral' },
]

// Deep-clone a panel into an editable draft, preserving every seat key.
function clonePanel(p: PanelRec): PanelRec {
  return {
    ...p,
    seats: (Array.isArray(p.seats) ? p.seats : []).map((s) => ({ ...s })),
    extra: { ...(p.extra || {}) },
  }
}

function emptyPanel(): PanelRec {
  return {
    name: '',
    description: '',
    strategy: 'all-voices',
    targets: 1,
    seats: [{ cli: '' }],
    extra: {},
  }
}

// Build the write body: strip empty-string optional seat fields (so we don't
// serialize blank keys) while preserving unknown keys. `cli` is always kept.
function panelsToBody(drafts: PanelRec[]): PanelRec[] {
  return drafts.map((p) => ({
    name: p.name.trim(),
    description: (p.description || '').trim(),
    strategy: (p.strategy || '').trim(),
    targets: (p.seats || []).length,
    extra: p.extra || {},
    seats: (p.seats || []).map((s) => {
      const out: PanelSeat = { cli: String(s.cli || '').trim() }
      for (const [k, v] of Object.entries(s)) {
        if (k === 'cli') continue
        if (v === undefined || v === null) continue
        if (typeof v === 'string') {
          const t = v.trim()
          if (t !== '') out[k] = t
        } else {
          out[k] = v as never
        }
      }
      return out
    }),
  }))
}

function SeatEditor({
  seat,
  meta,
  index,
  onChange,
  onRemove,
}: {
  seat: PanelSeat
  meta: MetaResp | null
  index: number
  onChange: (s: PanelSeat) => void
  onRemove: () => void
}) {
  const set = (k: keyof PanelSeat, v: string) => onChange({ ...seat, [k]: v })
  const agentIds = Array.isArray(meta?.agent_ids) ? meta!.agent_ids : []
  const agentFreeText = agentIdsAreFallback(meta)
  const roleIds = Array.isArray(meta?.roles) ? meta!.roles : []
  // Unknown keys (anything not a surfaced field) — shown read-only so the user
  // knows they're preserved on save.
  const surfaced = new Set<string>([
    'cli', 'role', ...SEAT_TEXT_FIELDS.map((f) => f.key as string), 'weight', 'parity',
  ])
  const unknownKeys = Object.keys(seat).filter((k) => !surfaced.has(k))
  return (
    <div className="p-2.5 rounded bg-[var(--surface-3,#232323)] border border-[var(--border,#2a2a2a)]">
      <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
        {/* cli — meta-driven agent-id dropdown (or datalist combobox on fallback) */}
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-muted opacity-70">
            cli<span className="text-amber-500"> *</span>
          </span>
          <ComboSelect
            value={seat.cli != null ? String(seat.cli) : ''}
            options={agentIds}
            freeText={agentFreeText}
            listId={`seat-cli-${index}`}
            placeholder="agent id (required)"
            onChange={(v) => set('cli', v)}
          />
        </label>
        {/* model — free text (model ids are open) */}
        {SEAT_TEXT_FIELDS.filter((f) => f.key === 'model').map((f) => (
          <label key={f.key as string} className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-muted opacity-70">{f.label}</span>
            <input
              className={inputCls}
              value={seat[f.key] != null ? String(seat[f.key]) : ''}
              placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </label>
        ))}
        {/* role — meta-driven role dropdown; free-text option kept selectable */}
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-muted opacity-70">role</span>
          <select
            className={inputCls}
            value={seat.role != null ? String(seat.role) : ''}
            onChange={(e) => set('role', e.target.value)}
          >
            <option value="">(none)</option>
            {seat.role && !roleIds.includes(String(seat.role)) && (
              <option value={String(seat.role)}>{String(seat.role)}</option>
            )}
            {roleIds.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        {/* label + stance — free text */}
        {SEAT_TEXT_FIELDS.filter((f) => f.key !== 'model').map((f) => (
          <label key={f.key as string} className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-muted opacity-70">{f.label}</span>
            <input
              className={inputCls}
              value={seat[f.key] != null ? String(seat[f.key]) : ''}
              placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </label>
        ))}
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-muted opacity-70">weight</span>
          <input
            className={inputCls}
            type="number"
            value={seat.weight != null ? String(seat.weight) : ''}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value.trim()
              const next = { ...seat }
              if (v === '') delete next.weight
              else next.weight = Number(v)
              onChange(next)
            }}
          />
        </label>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-muted opacity-70">parity</span>
          <span className="mt-0.5">
            <Switch
              value={seat.parity === true}
              srLabel="Parity counterweight seat"
              onChange={(v) => {
                const next = { ...seat }
                if (v) next.parity = true
                else delete next.parity
                onChange(next)
              }}
            />
          </span>
        </div>
      </div>
      {unknownKeys.length > 0 && (
        <p className="text-[10px] text-muted mt-1.5">
          preserved on save:{' '}
          {unknownKeys.map((k) => (
            <code key={k} className="mr-1.5">
              {k}={String(seat[k])}
            </code>
          ))}
        </p>
      )}
      <button
        className="mt-1.5 flex items-center gap-1 text-[11px] text-muted hover:text-amber-500"
        onClick={onRemove}
        title="Remove seat"
      >
        <X size={12} /> Remove seat
      </button>
    </div>
  )
}

function PanelEditor({
  panel,
  meta,
  onChange,
  onDelete,
}: {
  panel: PanelRec
  meta: MetaResp | null
  onChange: (p: PanelRec) => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const seats = Array.isArray(panel.seats) ? panel.seats : []
  const strategies = Array.isArray(meta?.strategies) && meta!.strategies.length
    ? meta!.strategies : FALLBACK_STRATEGIES
  return (
    <div className="p-3 rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)]">
      <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        <Field label="Name" hint="panel key" required>
          <input
            className={inputCls}
            value={panel.name}
            placeholder="panel-name"
            onChange={(e) => onChange({ ...panel, name: e.target.value })}
          />
        </Field>
        <Field
          label="Strategy"
          hint="strategy"
          help="How the panel's voices are reduced to an outcome. all-voices returns every voice; the rest collapse to one verdict (unanimous, majority, plurality, weighted, parity-pair, rank)."
        >
          <select
            className={inputCls}
            value={panel.strategy || 'all-voices'}
            onChange={(e) => onChange({ ...panel, strategy: e.target.value })}
          >
            {/* Keep an unknown loaded strategy selectable. */}
            {panel.strategy && !strategies.includes(panel.strategy) && (
              <option value={panel.strategy}>{panel.strategy}</option>
            )}
            {strategies.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-2.5">
        <Field label="Description" hint="description">
          <input
            className={inputCls}
            value={panel.description || ''}
            placeholder="Human label for this panel"
            onChange={(e) => onChange({ ...panel, description: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-medium text-[var(--fg,#eee)]">
            Seats <span className="text-muted">({seats.length})</span>
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {seats.map((s, i) => (
            <SeatEditor
              key={i}
              seat={s}
              meta={meta}
              index={i}
              onChange={(ns) => {
                const next = seats.slice()
                next[i] = ns
                onChange({ ...panel, seats: next })
              }}
              onRemove={() => onChange({ ...panel, seats: seats.filter((_, j) => j !== i) })}
            />
          ))}
          <button
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start"
            onClick={() => onChange({ ...panel, seats: [...seats, { cli: '' }] })}
          >
            <Plus size={14} /> Add seat
          </button>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-[var(--border,#2a2a2a)] flex items-center">
        {!confirmDelete ? (
          <button
            className="flex items-center gap-1.5 text-xs text-muted hover:text-amber-500"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={13} /> Delete panel
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-500">Delete “{panel.name || 'unnamed'}”?</span>
            <button
              className="px-2 py-0.5 rounded bg-amber-600/80 text-white hover:bg-amber-600"
              onClick={onDelete}
            >
              Delete
            </button>
            <button className="px-2 py-0.5 rounded text-muted hover:text-[var(--fg,#eee)]" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function PanelsView({
  panels,
  meta,
  onSave,
}: {
  panels: PanelsResp | null
  meta: MetaResp | null
  onSave: (scope: 'global' | 'workspace', body: PanelRec[]) => Promise<PanelsWriteResp>
}) {
  const [scope, setScope] = useState<'global' | 'workspace'>('global')
  const [drafts, setDrafts] = useState<PanelRec[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  // True only after a confirmed disk write for the CURRENT scope. Gates the
  // honest "how to make a running Rutherford pick this up" affordance below —
  // the app backend CANNOT itself invoke the reload_panels MCP tool (the
  // AppContext SDK exposes cron/events/storage/spawn/job only; the Rutherford
  // MCP server runs in a separate uvx process the backend has no client into),
  // so we tell the user the truth instead of faking a reload.
  const [savedScope, setSavedScope] = useState<'global' | 'workspace' | null>(null)
  const [copied, setCopied] = useState(false)

  const sources = Array.isArray(panels?.sources) ? panels!.sources : []
  const source = sources.find((s) => s.scope === scope) || null
  // Serialize the CURRENT scope's server panels to a stable key so the effect
  // reseeds the draft only when the underlying data (or scope) actually changes,
  // never on every render.
  const sourceKey = JSON.stringify(source?.panels ?? null) + '|' + scope

  useEffect(() => {
    if (!source) {
      setDrafts(null)
      return
    }
    setSaveMsg(null)
    setCopied(false)
    setDrafts((source.panels || []).map(clonePanel))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey])

  const patchPanel = (i: number, p: PanelRec) =>
    setDrafts((d) => (d ? d.map((x, j) => (j === i ? p : x)) : d))

  const validationError = (): string | null => {
    if (!drafts) return null
    const names = new Set<string>()
    for (const p of drafts) {
      const n = p.name.trim()
      if (!n) return 'Every panel needs a name.'
      if (names.has(n)) return `Duplicate panel name “${n}”.`
      names.add(n)
      const seats = Array.isArray(p.seats) ? p.seats : []
      if (seats.length === 0) return `Panel “${n}” needs at least one seat.`
      if (seats.some((s) => !String(s.cli || '').trim()))
        return `Panel “${n}” has a seat missing a cli.`
    }
    return null
  }

  const handleSave = async () => {
    if (!drafts) return
    const verr = validationError()
    if (verr) {
      setSaveMsg({ ok: false, text: verr })
      return
    }
    setSaving(true)
    setSaveMsg(null)
    setSavedScope(null)
    setCopied(false)
    try {
      await onSave(scope, panelsToBody(drafts))
      setSaveMsg({ ok: true, text: `Saved to ${scope} panels.toon (backup written).` })
      setSavedScope(scope)
    } catch (e) {
      setSaveMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1 mb-4">
        {(['global', 'workspace'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setSavedScope(null); setCopied(false); setScope(s) }}
            className={
              'px-3 py-1.5 text-sm rounded transition-colors ' +
              (scope === s
                ? 'bg-[var(--accent,#6366f1)] text-white'
                : 'bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]')
            }
          >
            {s === 'global' ? 'Global' : 'Workspace'}
          </button>
        ))}
        <button
          onClick={() => void handleSave()}
          disabled={saving || !drafts}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50"
        >
          <Save size={14} /> {saving ? 'Saving…' : `Save ${scope}`}
        </button>
      </div>

      {saveMsg && (
        <div
          className={
            'flex items-center gap-2 text-sm mb-4 ' +
            (saveMsg.ok ? 'text-green-500' : 'text-amber-500')
          }
        >
          {saveMsg.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {saveMsg.text}
        </div>
      )}

      {savedScope === scope && (
        <div className="flex items-start gap-2 text-sm mb-4 rounded border border-[var(--border,#333)] bg-[var(--surface-2,#2a2a2a)] px-3 py-2.5">
          <Info size={15} className="mt-0.5 shrink-0 text-[var(--accent,#6366f1)]" />
          <div className="flex flex-col gap-1.5">
            <span className="text-[var(--fg,#eee)]">
              Panels were written to disk. A Rutherford server that is already running
              still holds the OLD panels in memory — it picks these up on its next run,
              or immediately when you run the <code>reload_panels</code> tool.
            </span>
            <span className="text-xs text-muted">
              This app cannot reload Rutherford for you: the MCP server runs in a separate
              process the backend has no client into. Run the tool in your agent session.
            </span>
            <button
              onClick={() => {
                const instr = 'reload_panels'
                const done = () => {
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 2000)
                }
                try {
                  navigator.clipboard?.writeText(instr).then(done, () => setCopied(false))
                } catch {
                  setCopied(false)
                }
              }}
              className="self-start flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-[var(--surface,#1e1e1e)] border border-[var(--border,#333)] text-[var(--fg,#eee)] hover:border-[var(--accent,#6366f1)]"
            >
              {copied ? <CheckCircle2 size={13} /> : <RefreshCw size={13} />}
              {copied ? 'Copied' : 'Copy reload_panels'}
            </button>
          </div>
        </div>
      )}

      <Card>
        <CardTitle>Named panels · {scope}</CardTitle>
        {source && <PathChip meta={source} />}
        {source?.error && <p className="text-xs text-amber-500 mt-1">{source.error}</p>}
        {source && !source.exists && (
          <p className="text-xs text-muted mt-2">
            No file at this scope yet — saving creates <code>{source.path}</code>.
          </p>
        )}

        {drafts === null ? (
          <p className="text-sm text-muted mt-2">Loading {scope} panels…</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {drafts.length === 0 && (
              <p className="text-sm text-muted">
                No panels defined at this scope. Add one below.
              </p>
            )}
            {drafts.map((p, i) => (
              <PanelEditor
                key={i}
                panel={p}
                meta={meta}
                onChange={(np) => patchPanel(i, np)}
                onDelete={() => setDrafts((d) => (d ? d.filter((_, j) => j !== i) : d))}
              />
            ))}
            <button
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted hover:text-[var(--accent,#6366f1)] self-start"
              onClick={() => setDrafts((d) => [...(d || []), emptyPanel()])}
            >
              <Plus size={14} /> Add panel
            </button>
          </div>
        )}
      </Card>
    </>
  )
}

// ---- Roles tab (editable, parity with Panels) ----------------------------

type RoleDraft = RoleBody & { _new?: boolean }

function emptyRoleDraft(): RoleDraft {
  return { name: '', display_name: '', description: '', body: '', extra: {}, _new: true }
}

function RolesView({
  roles,
  meta,
  onFetchRole,
  onSave,
}: {
  roles: RolesResp | null
  meta: MetaResp | null
  onFetchRole: (scope: 'global' | 'workspace', name: string) => Promise<RoleBody | null>
  onSave: (
    scope: 'global' | 'workspace',
    payload: { name: string; op?: 'delete' } & Partial<RoleBody>,
  ) => Promise<RoleWriteResp>
}) {
  const [scope, setScope] = useState<'global' | 'workspace'>('global')
  const [draft, setDraft] = useState<RoleDraft | null>(null)
  const [origName, setOrigName] = useState<string | null>(null) // the file being edited (rename guard)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [opening, setOpening] = useState<string | null>(null)

  const sources = Array.isArray(roles?.sources) ? roles!.sources : []
  // Only the two writable scopes are editable; config:role_dirs is reference.
  const editableSource = sources.find((s) => s.scope === scope && s.editable !== false) || null
  const editableRoles = Array.isArray(editableSource?.roles) ? editableSource!.roles : []

  // Built-in personas, read-only reference. Prefer meta.roles_builtin; fall back
  // to the roles.builtin listing shape.
  const builtinRoles = Array.isArray(meta?.roles_builtin) && meta!.roles_builtin.length
    ? meta!.roles_builtin
    : (Array.isArray(roles?.builtin) ? roles!.builtin.map((b) => b.name) : [])

  // Reference (non-editable) role_dirs sources, shown read-only like built-ins.
  const referenceSources = sources.filter((s) => s.editable === false)

  const openRole = async (name: string) => {
    setOpening(name)
    setSaveMsg(null)
    setConfirmDelete(false)
    const body = await onFetchRole(scope, name)
    setOpening(null)
    if (!body) {
      setSaveMsg({ ok: false, text: `Could not open role “${name}”.` })
      return
    }
    setDraft({ ...body, extra: body.extra || {} })
    setOrigName(name)
  }

  const startNew = () => {
    setSaveMsg(null)
    setConfirmDelete(false)
    setDraft(emptyRoleDraft())
    setOrigName(null)
  }

  const closeEditor = () => {
    setDraft(null)
    setOrigName(null)
    setConfirmDelete(false)
  }

  const validation = (): string | null => {
    if (!draft) return null
    const n = draft.name.trim()
    if (!n) return 'Role name is required.'
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(n))
      return 'Role name must be a kebab-case id (letters, digits, . _ -), no path separators.'
    if (builtinRoles.includes(n))
      return `“${n}” is a built-in role (read-only reference). Choose a different id.`
    return null
  }

  const handleSave = async () => {
    if (!draft) return
    const verr = validation()
    if (verr) {
      setSaveMsg({ ok: false, text: verr })
      return
    }
    setSaving(true)
    setSaveMsg(null)
    try {
      const newName = draft.name.trim()
      await onSave(scope, {
        name: newName,
        display_name: draft.display_name || '',
        description: draft.description || '',
        body: draft.body || '',
        extra: draft.extra || {},
      })
      // Rename: the file id changed on an existing role → delete the old file so
      // we don't leave an orphan. Best-effort; the new file already persisted.
      if (origName && origName !== newName) {
        try {
          await onSave(scope, { name: origName, op: 'delete' })
        } catch {
          /* non-fatal — new role saved; old file left in place */
        }
      }
      setSaveMsg({ ok: true, text: `Saved role “${newName}” to ${scope} (backup written).` })
      setOrigName(newName)
      setDraft((d) => (d ? { ...d, _new: false } : d))
    } catch (e) {
      setSaveMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!draft || !origName) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await onSave(scope, { name: origName, op: 'delete' })
      setSaveMsg({ ok: true, text: `Deleted role “${origName}” from ${scope} (backup written).` })
      closeEditor()
    } catch (e) {
      setSaveMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1 mb-4">
        {(['global', 'workspace'] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setScope(s)
              closeEditor()
              setSaveMsg(null)
            }}
            className={
              'px-3 py-1.5 text-sm rounded transition-colors ' +
              (scope === s
                ? 'bg-[var(--accent,#6366f1)] text-white'
                : 'bg-[var(--surface-2,#2a2a2a)] text-muted hover:text-[var(--fg,#eee)]')
            }
          >
            {s === 'global' ? 'Global' : 'Workspace'}
          </button>
        ))}
        <button
          onClick={startNew}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white"
        >
          <Plus size={14} /> New role
        </button>
      </div>

      {saveMsg && (
        <div
          className={
            'flex items-center gap-2 text-sm mb-4 ' +
            (saveMsg.ok ? 'text-green-500' : 'text-amber-500')
          }
        >
          {saveMsg.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {saveMsg.text}
        </div>
      )}

      {/* Editor */}
      {draft && (
        <>
          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                <Pencil size={14} /> {draft._new ? 'New role' : `Edit role · ${origName}`} · {scope}
              </span>
            </CardTitle>
            {editableSource && <PathChip meta={editableSource} />}
            <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] mt-3">
              <Field
                label="Role id (file name)"
                hint="<id>.md"
                help="The role's id and file stem. Kebab-case: letters, digits, . _ - — no path separators. Referenced from a panel seat's role field."
                required
              >
                <input
                  className={inputCls}
                  value={draft.name}
                  placeholder="my-reviewer"
                  onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                />
              </Field>
              <Field
                label="Display name"
                hint="display_name"
                help="Optional human-friendly name shown in listings."
                required={false}
              >
                <input
                  className={inputCls}
                  value={draft.display_name}
                  placeholder="My Reviewer"
                  onChange={(e) => setDraft((d) => (d ? { ...d, display_name: e.target.value } : d))}
                />
              </Field>
            </div>
            <div className="mt-2.5">
              <Field
                label="Description"
                hint="description"
                help="One-line summary of what this persona is for."
                required={false}
              >
                <input
                  className={inputCls}
                  value={draft.description}
                  placeholder="Short description of this persona"
                  onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))}
                />
              </Field>
            </div>
            <div className="mt-2.5">
              <Field
                label="System prompt (body)"
                hint="markdown body"
                help="The persona's system prompt, prepended to the task. This is the file body below the frontmatter."
                required
              >
                <textarea
                  className={inputCls + ' min-h-[220px] font-mono text-[12px] leading-relaxed'}
                  value={draft.body}
                  placeholder="You are a principal-level reviewer. …"
                  onChange={(e) => setDraft((d) => (d ? { ...d, body: e.target.value } : d))}
                />
              </Field>
            </div>
            {draft.extra && Object.keys(draft.extra).length > 0 && (
              <p className="text-[10px] text-muted mt-2">
                preserved frontmatter:{' '}
                {Object.entries(draft.extra).map(([k, v]) => (
                  <code key={k} className="mr-1.5">
                    {k}={String(v)}
                  </code>
                ))}
              </p>
            )}
            <div className="mt-3 pt-2.5 border-t border-[var(--border,#2a2a2a)] flex items-center gap-2">
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-[var(--accent,#6366f1)] text-white disabled:opacity-50"
              >
                <Save size={14} /> {saving ? 'Saving…' : `Save to ${scope}`}
              </button>
              <button
                onClick={closeEditor}
                className="px-3 py-1.5 text-sm rounded text-muted hover:text-[var(--fg,#eee)]"
              >
                Close
              </button>
              {/* Delete only for an existing file (inline confirm). */}
              {origName && !draft._new && (
                <div className="ml-auto flex items-center">
                  {!confirmDelete ? (
                    <button
                      className="flex items-center gap-1.5 text-xs text-muted hover:text-amber-500"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 size={13} /> Delete role
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-amber-500">Delete “{origName}”?</span>
                      <button
                        className="px-2 py-0.5 rounded bg-amber-600/80 text-white hover:bg-amber-600 disabled:opacity-50"
                        disabled={saving}
                        onClick={() => void handleDelete()}
                      >
                        Delete
                      </button>
                      <button
                        className="px-2 py-0.5 rounded text-muted hover:text-[var(--fg,#eee)]"
                        onClick={() => setConfirmDelete(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
          <div className="h-3" />
        </>
      )}

      {/* Editable role files for the current scope */}
      <Card>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            <FileText size={14} /> Role files · {scope} (editable)
          </span>
        </CardTitle>
        {editableSource ? <PathChip meta={editableSource} /> : (
          <p className="text-xs text-muted mt-1">No editable roles directory resolved for {scope}.</p>
        )}
        {editableSource?.error && <p className="text-xs text-amber-500 mt-1">{editableSource.error}</p>}
        {editableSource && !editableSource.exists && (
          <p className="text-xs text-muted mt-2">
            No roles directory at this scope yet — saving a role creates <code>{editableSource.path}</code>.
          </p>
        )}
        {editableRoles.length === 0 ? (
          <p className="text-sm text-muted mt-2">
            No role files at this scope. Click <strong>New role</strong> to add one.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-1.5">
            {editableRoles.map((r) => (
              <div
                key={r.path || r.name}
                className="flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]"
              >
                <span className="px-2 py-0.5 rounded text-xs bg-[var(--surface-3,#2a2a2a)] text-[var(--fg,#eee)]">
                  {r.name}
                </span>
                {r.description && (
                  <span className="text-xs text-muted truncate flex-1">{r.description}</span>
                )}
                {r.error && <span className="text-xs text-amber-500">{r.error}</span>}
                <button
                  className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-[var(--accent,#6366f1)]"
                  onClick={() => void openRole(r.name)}
                  disabled={opening === r.name}
                >
                  <Pencil size={12} /> {opening === r.name ? 'Opening…' : 'Edit'}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Built-in personas — read-only reference */}
      {builtinRoles.length > 0 && (
        <>
          <div className="h-3" />
          <Card>
            <CardTitle>Built-in personas (read-only reference)</CardTitle>
            <p className="text-xs text-muted mt-1">
              These ship in the Rutherford server (not files) and cannot be edited here. Reference
              them from a panel seat's <code>role</code> field.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {builtinRoles.map((name) => (
                <span
                  key={name}
                  className="px-2 py-1 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-muted"
                  title="Built-in persona — read-only"
                >
                  {name}
                </span>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Reference role_dirs sources (from config) — read-only listing */}
      {referenceSources.map((s) =>
        Array.isArray(s.roles) && s.roles.length > 0 ? (
          <div key={s.path}>
            <div className="h-3" />
            <Card>
              <CardTitle>Role files · {s.scope} (read-only)</CardTitle>
              <PathChip meta={s} />
              <div className="mt-3 flex flex-wrap gap-2">
                {s.roles.map((r) => (
                  <span
                    key={r.path || r.name}
                    className="px-2 py-1 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-muted"
                    title={r.path}
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        ) : null,
      )}
    </>
  )
}
