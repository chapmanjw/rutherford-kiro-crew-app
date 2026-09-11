import { useAppApi } from '@kirocrew/app-sdk'
import { Card, CardTitle, PageHeader, StatCard } from '@kirocrew/app-sdk/ui'
import { useState, useEffect, useCallback, useRef } from 'react'
import lucide from 'lucide-react'

// The dashboard vendor shim for 'lucide-react' only STATICALLY named-exports ~40
// icons; Box/FileCog/Layers/UserSquare are not among them and would throw an ES
// parse-time "does not provide an export named ..." error. The shim's DEFAULT
// export is a forwarding Proxy over the full lucide module, so destructuring off
// the default import resolves any icon name. NEVER reintroduce named
// `from 'lucide-react'` imports.
const {
  Box, FileCog, Layers, UserSquare, RefreshCw, AlertTriangle,
  Save, Plus, X, CheckCircle2, Server, Trash2,
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

type RolesResp = {
  platform: string
  sources: (Meta & { roles: { name: string; file: string; path: string }[] })[]
}

type Tab = 'status' | 'config' | 'panels' | 'roles'

const TABS: { id: Tab; label: string; icon: typeof Box }[] = [
  { id: 'status', label: 'Overview', icon: Box },
  { id: 'config', label: 'Config', icon: FileCog },
  { id: 'panels', label: 'Panels', icon: Layers },
  { id: 'roles', label: 'Roles', icon: UserSquare },
]

const SAFETY_MODES = ['read_only', 'propose', 'write', 'yolo'] as const
const PERSISTENCE = ['ephemeral', 'job'] as const

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

  // loadAll no longer fetches /rutherford-config and no longer depends on configScope, so
  // toggling scope does NOT re-run this batch. Config is fetched separately.
  const loadAll = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [s, p, r] = await Promise.all([
        api.get(`${BASE}/status`),
        api.get(`${BASE}/panels`),
        api.get(`${BASE}/roles`),
      ])
      setStatus(s as StatusResp)
      setPanels(p as PanelsResp)
      setRoles(r as RolesResp)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [api])

  // Initial + manual full reload (status/panels/roles) plus a config fetch for
  // the current scope. configScope is intentionally NOT a dep of loadAll; the
  // config fetch below re-runs on its own when configScope changes.
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

  return (
    <>
      <PageHeader title="Rutherford" subtitle="Config & status — config.toml editing (Phase 2)" />
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
                scope={configScope}
                onScope={reloadConfig}
                onSave={saveConfig}
              />
            )}
            {tab === 'panels' && <PanelsView panels={panels} onSave={savePanels} />}
            {tab === 'roles' && <RolesView roles={roles} />}
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

// A labelled form control. `label` is the human-readable title; `hint` is the
// raw config key shown small + muted so the mapping stays unambiguous; `desc`
// is an optional one-line explanation. Presentational only.
function Field({
  label,
  hint,
  desc,
  children,
}: {
  label: string
  hint?: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-[var(--fg,#eee)]">
        {label}
        {hint && <code className="ml-1.5 text-[10px] text-muted opacity-70">{hint}</code>}
      </span>
      {desc && <span className="text-[11px] text-muted -mt-0.5">{desc}</span>}
      {children}
    </label>
  )
}

const inputCls =
  'px-2 py-1.5 text-sm rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)] text-[var(--fg,#eee)] outline-none focus:border-[var(--accent,#6366f1)]'

function StringList({
  label,
  hint,
  desc,
  values,
  onChange,
}: {
  label: string
  hint?: string
  desc?: string
  values: string[]
  onChange: (v: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-[var(--fg,#eee)]">
        {label}
        {hint && <code className="ml-1.5 text-[10px] text-muted opacity-70">{hint}</code>}
      </span>
      {desc && <span className="text-[11px] text-muted -mt-0.5">{desc}</span>}
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

// An unambiguous switch. Renders a pill TRACK + a KNOB that slides
// left(off)/right(on); the track is accent-filled when ON and muted/grey when
// OFF, with a small "ON"/"OFF" text affordance INSIDE the track so state reads
// at a glance even for a viewer who can't distinguish the accent hue. Proper
// role="switch" + aria-checked for assistive tech. `srLabel` gives an
// accessible name to a bare (label-less) switch, e.g. a per-agent Enabled cell.
function Switch({
  value,
  onChange,
  srLabel,
}: {
  value: boolean
  onChange: (v: boolean) => void
  srLabel?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={srLabel}
      onClick={() => onChange(!value)}
      className={
        'relative inline-flex items-center shrink-0 h-6 w-12 rounded-full ' +
        'transition-colors duration-150 outline-none ' +
        'focus-visible:ring-2 focus-visible:ring-[var(--accent,#6366f1)] focus-visible:ring-offset-1 ' +
        'focus-visible:ring-offset-[var(--surface,#111)] border ' +
        (value
          ? 'bg-[var(--accent,#6366f1)] border-[var(--accent,#6366f1)]'
          : 'bg-[var(--surface-3,#3a3a3a)] border-[var(--border,#4a4a4a)]')
      }
    >
      {/* State text affordance: ON hugs the left under the knob-at-right; OFF
          hugs the right under the knob-at-left. */}
      <span
        className={
          'absolute text-[9px] font-semibold leading-none tracking-wide select-none ' +
          (value ? 'left-1.5 text-white' : 'right-1.5 text-[var(--fg,#eee)] opacity-70')
        }
        aria-hidden="true"
      >
        {value ? 'ON' : 'OFF'}
      </span>
      {/* Sliding knob */}
      <span
        className={
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm ' +
          'transition-all duration-150 ' +
          (value ? 'left-[26px]' : 'left-0.5')
        }
        aria-hidden="true"
      />
    </button>
  )
}

// A labelled switch row: the Switch plus its human label / config-key hint /
// description. Used for the Defaults toggles.
function Toggle({
  label,
  hint,
  desc,
  value,
  onChange,
}: {
  label: string
  hint?: string
  desc?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <span className="mt-0.5">
        <Switch value={value} onChange={onChange} srLabel={label || undefined} />
      </span>
      <span className="flex flex-col">
        <span className="text-sm text-[var(--fg,#eee)]">
          {label}
          {hint && <code className="ml-1.5 text-[10px] text-muted opacity-70">{hint}</code>}
        </span>
        {desc && <span className="text-[11px] text-muted">{desc}</span>}
      </span>
    </label>
  )
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

function ConfigView({
  config,
  scope,
  onScope,
  onSave,
}: {
  config: ConfigResp | null
  scope: 'global' | 'workspace'
  onScope: (s: 'global' | 'workspace') => void
  onSave: (s: 'global' | 'workspace', body: Record<string, unknown>) => Promise<ConfigResp>
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

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
                No file at this scope yet — saving creates <code>{config.path}</code>.
              </p>
            )}
            <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] mt-3">
              <Field
                label="Default safety mode"
                hint="default_safety_mode"
                desc="read_only · propose · write · yolo"
              >
                <select
                  className={inputCls}
                  value={draft.default_safety_mode}
                  onChange={(e) => patch({ default_safety_mode: e.target.value })}
                >
                  {SAFETY_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Default timeout (seconds)" hint="default_timeout_s">
                <input
                  type="number"
                  className={inputCls}
                  value={draft.default_timeout_s}
                  onChange={(e) => patch({ default_timeout_s: e.target.value })}
                />
              </Field>
              <Field label="Max agents per panel" hint="max_targets">
                <input
                  type="number"
                  className={inputCls}
                  value={draft.max_targets}
                  onChange={(e) => patch({ max_targets: e.target.value })}
                />
              </Field>
              <Field
                label="Run persistence"
                hint="default_persistence"
                desc="ephemeral · job"
              >
                <select
                  className={inputCls}
                  value={draft.default_persistence}
                  onChange={(e) => patch({ default_persistence: e.target.value })}
                >
                  {PERSISTENCE.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex flex-wrap gap-6 mt-4">
              <Toggle
                label="Auto-detect local models (Ollama / LM Studio)"
                hint="auto_detect_local_models"
                value={draft.auto_detect_local_models}
                onChange={(v) => patch({ auto_detect_local_models: v })}
              />
              <Toggle
                label="Synthesize a combined answer by default"
                hint="synthesize_default"
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
                label="Enabled agents (allowlist)"
                hint="enabled_agents"
                desc="Empty = every configured agent is enabled."
                values={draft.enabled_agents}
                onChange={(v) => patch({ enabled_agents: v })}
              />
              <StringList
                label="Trusted workspaces (write/yolo allowed)"
                hint="trusted_workspaces"
                desc="Paths where write & yolo delegations may run."
                values={draft.trusted_workspaces}
                onChange={(v) => patch({ trusted_workspaces: v })}
              />
              <StringList
                label="Custom role directories"
                hint="role_dirs"
                desc="Extra folders scanned for role persona files."
                values={draft.role_dirs}
                onChange={(v) => patch({ role_dirs: v })}
              />
            </div>
          </Card>

          <div className="h-3" />

          <Card>
            <CardTitle>Per-agent overrides</CardTitle>
            <p className="text-[11px] text-muted mt-1">
              <code className="text-[10px] opacity-70">[agents.*]</code> — per-agent
              default model and enabled flag.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {draft.agents.length > 0 && (
                <div className="flex items-center gap-2 px-2 text-[10px] uppercase tracking-wide text-muted opacity-70">
                  <span className="w-32">Agent</span>
                  <span className="flex-1">Default model</span>
                  <span>Enabled</span>
                  <span className="w-6" />
                </div>
              )}
              {draft.agents.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]"
                >
                  <input
                    className={inputCls + ' w-32'}
                    value={a.id}
                    placeholder="agent id"
                    onChange={(e) => {
                      const next = draft.agents.slice()
                      next[i] = { ...a, id: e.target.value }
                      patch({ agents: next })
                    }}
                  />
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

const STRATEGIES = [
  'all-voices',
  'unanimous',
  'majority',
  'plurality',
  'weighted',
  'parity-pair',
  'rank',
] as const

// Seat keys we surface as first-class editable fields. Any OTHER key present on
// a seat (an unknown/future key) is carried through untouched on save — never
// dropped — because the editor deep-clones the whole seat object.
const SEAT_FIELDS: { key: keyof PanelSeat; label: string; placeholder: string }[] = [
  { key: 'cli', label: 'cli', placeholder: 'agent id (required)' },
  { key: 'model', label: 'model', placeholder: 'agent default' },
  { key: 'role', label: 'role', placeholder: 'persona id' },
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
  onChange,
  onRemove,
}: {
  seat: PanelSeat
  onChange: (s: PanelSeat) => void
  onRemove: () => void
}) {
  const set = (k: keyof PanelSeat, v: string) => onChange({ ...seat, [k]: v })
  // Unknown keys (anything not a surfaced field) — shown read-only so the user
  // knows they're preserved on save.
  const surfaced = new Set<string>([...SEAT_FIELDS.map((f) => f.key as string), 'weight', 'parity'])
  const unknownKeys = Object.keys(seat).filter((k) => !surfaced.has(k))
  return (
    <div className="p-2.5 rounded bg-[var(--surface-3,#232323)] border border-[var(--border,#2a2a2a)]">
      <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
        {SEAT_FIELDS.map((f) => (
          <label key={f.key as string} className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-muted opacity-70">
              {f.label}
              {f.key === 'cli' && <span className="text-amber-500"> *</span>}
            </span>
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
  onChange,
  onDelete,
}: {
  panel: PanelRec
  onChange: (p: PanelRec) => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const seats = Array.isArray(panel.seats) ? panel.seats : []
  return (
    <div className="p-3 rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)]">
      <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        <Field label="Name" hint="panel key">
          <input
            className={inputCls}
            value={panel.name}
            placeholder="panel-name"
            onChange={(e) => onChange({ ...panel, name: e.target.value })}
          />
        </Field>
        <Field label="Strategy" hint="strategy">
          <select
            className={inputCls}
            value={panel.strategy || 'all-voices'}
            onChange={(e) => onChange({ ...panel, strategy: e.target.value })}
          >
            {STRATEGIES.map((s) => (
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
  onSave,
}: {
  panels: PanelsResp | null
  onSave: (scope: 'global' | 'workspace', body: PanelRec[]) => Promise<PanelsWriteResp>
}) {
  const [scope, setScope] = useState<'global' | 'workspace'>('global')
  const [drafts, setDrafts] = useState<PanelRec[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

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
    try {
      await onSave(scope, panelsToBody(drafts))
      setSaveMsg({ ok: true, text: `Saved to ${scope} panels.toon (backup written).` })
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
            onClick={() => setScope(s)}
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

function RolesView({ roles }: { roles: RolesResp | null }) {
  if (!roles) return <p className="text-sm text-muted">No roles.</p>
  const sources = Array.isArray(roles.sources) ? roles.sources : []
  const total = sources.reduce((n, s) => n + (Array.isArray(s.roles) ? s.roles.length : 0), 0)
  if (total === 0) {
    return (
      <Card>
        <CardTitle>Roles</CardTitle>
        <p className="text-sm text-muted mt-1">
          No role markdown files found (read-only — editing is a later step). Checked:
        </p>
        {sources.map((s) => (
          <PathChip key={s.path} meta={s} />
        ))}
      </Card>
    )
  }
  return (
    <>
      {sources.map((s) => {
        const sr = Array.isArray(s.roles) ? s.roles : []
        return sr.length === 0 ? null : (
          <div key={s.path} className="mb-4">
            <Card>
              <CardTitle>Roles · {s.scope} (read-only)</CardTitle>
              <PathChip meta={s} />
              <div className="mt-3 flex flex-wrap gap-2">
                {sr.map((r) => (
                  <span
                    key={r.path}
                    className="px-2 py-1 rounded text-xs bg-[var(--surface-2,#2a2a2a)] text-[var(--fg,#eee)]"
                    title={r.path}
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        )
      })}
    </>
  )
}
