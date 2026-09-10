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
  Save, Plus, X, CheckCircle2, Server,
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

type PanelsResp = {
  platform: string
  sources: (Meta & { panels: { name: string; description: string; strategy: string; targets: number | null }[] })[]
}

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

  // Monotonic request id for /config fetches. Every config fetch stamps the id
  // it was issued under and the scope it asked for; a response is applied ONLY
  // if it is still the latest issued request AND its echoed scope matches the
  // scope we currently want. This is the latest-wins guard that stops a
  // superseded / out-of-order fetch from landing the wrong scope's payload into
  // `config` (the root cause of the Global-shows-empty race).
  const configReqRef = useRef(0)

  // Owns ALL /config fetching. Kept OUT of loadAll's parallel batch so a scope
  // toggle never re-fires the whole status/panels/roles batch. The backend
  // response is a Meta whose `scope` field echoes the scope it resolved, so we
  // drop any response whose scope !== the requested scope as a second belt.
  const fetchConfig = useCallback(
    async (scope: 'global' | 'workspace') => {
      const reqId = ++configReqRef.current
      try {
        const c = (await api.get(`${BASE}/config?scope=${scope}`)) as ConfigResp | null
        // Superseded by a newer request → drop.
        if (reqId !== configReqRef.current) return
        // Wrong scope echoed back (out-of-order / mismatched) → drop.
        if (!c || (c as ConfigResp).scope !== scope) return
        setConfig(c)
      } catch (e) {
        if (reqId !== configReqRef.current) return
        setErr(e instanceof Error ? e.message : String(e))
      }
    },
    [api],
  )

  // loadAll no longer fetches /config and no longer depends on configScope, so
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
      const url = `${BASE}/config?scope=${scope}`

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
      // Bump the request sequence so any in-flight scope fetch issued earlier is
      // now stale and cannot overwrite this just-saved payload.
      configReqRef.current++
      setConfig(confirmed)
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
            {tab === 'panels' && <PanelsView panels={panels} />}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'px-2 py-1.5 text-sm rounded bg-[var(--surface-2,#1e1e1e)] border border-[var(--border,#2a2a2a)] text-[var(--fg,#eee)] outline-none focus:border-[var(--accent,#6366f1)]'

function StringList({
  label,
  values,
  onChange,
}: {
  label: string
  values: string[]
  onChange: (v: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
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

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={
          'w-9 h-5 rounded-full transition-colors relative ' +
          (value ? 'bg-[var(--accent,#6366f1)]' : 'bg-[var(--surface-3,#333)]')
        }
      >
        <span
          className={
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ' +
            (value ? 'left-4' : 'left-0.5')
          }
        />
      </button>
      <span className="text-sm text-[var(--fg,#eee)]">{label}</span>
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
  const num = (k: string) => (typeof c[k] === 'number' ? String(c[k]) : '')
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
              <Field label="default_safety_mode">
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
              <Field label="default_timeout_s">
                <input
                  type="number"
                  className={inputCls}
                  value={draft.default_timeout_s}
                  onChange={(e) => patch({ default_timeout_s: e.target.value })}
                />
              </Field>
              <Field label="max_targets">
                <input
                  type="number"
                  className={inputCls}
                  value={draft.max_targets}
                  onChange={(e) => patch({ max_targets: e.target.value })}
                />
              </Field>
              <Field label="default_persistence">
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
                label="auto_detect_local_models"
                value={draft.auto_detect_local_models}
                onChange={(v) => patch({ auto_detect_local_models: v })}
              />
              <Toggle
                label="synthesize_default"
                value={draft.synthesize_default}
                onChange={(v) => patch({ synthesize_default: v })}
              />
            </div>
          </Card>

          <div className="h-3" />

          <Card>
            <CardTitle>Lists</CardTitle>
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))] mt-3">
              <StringList
                label="enabled_agents"
                values={draft.enabled_agents}
                onChange={(v) => patch({ enabled_agents: v })}
              />
              <StringList
                label="trusted_workspaces"
                values={draft.trusted_workspaces}
                onChange={(v) => patch({ trusted_workspaces: v })}
              />
              <StringList
                label="role_dirs"
                values={draft.role_dirs}
                onChange={(v) => patch({ role_dirs: v })}
              />
            </div>
          </Card>

          <div className="h-3" />

          <Card>
            <CardTitle>Agents [agents.*]</CardTitle>
            <div className="mt-3 flex flex-col gap-2">
              {draft.agents.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded bg-[var(--surface-2,#1e1e1e)]"
                >
                  <input
                    className={inputCls + ' w-32'}
                    value={a.id}
                    placeholder="id"
                    onChange={(e) => {
                      const next = draft.agents.slice()
                      next[i] = { ...a, id: e.target.value }
                      patch({ agents: next })
                    }}
                  />
                  <input
                    className={inputCls + ' flex-1'}
                    value={a.default_model ?? ''}
                    placeholder="default_model (blank = agent default)"
                    onChange={(e) => {
                      const next = draft.agents.slice()
                      next[i] = { ...a, default_model: e.target.value }
                      patch({ agents: next })
                    }}
                  />
                  <Toggle
                    label="enabled"
                    value={a.enabled}
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

function PanelsView({ panels }: { panels: PanelsResp | null }) {
  if (!panels) return <p className="text-sm text-muted">No panels.</p>
  const sources = Array.isArray(panels.sources) ? panels.sources : []
  const total = sources.reduce((n, s) => n + (Array.isArray(s.panels) ? s.panels.length : 0), 0)
  if (total === 0) {
    return (
      <Card>
        <CardTitle>Named panels</CardTitle>
        <p className="text-sm text-muted mt-1">
          No <code>panels.toon</code> found (read-only — editing is a later step). Checked:
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
        const sp = Array.isArray(s.panels) ? s.panels : []
        return sp.length === 0 ? null : (
          <div key={s.path} className="mb-4">
            <Card>
              <CardTitle>Panels · {s.scope} (read-only)</CardTitle>
              <PathChip meta={s} />
              <div className="mt-3 flex flex-col gap-2">
                {sp.map((p) => (
                  <div key={p.name} className="p-3 rounded bg-[var(--surface-2,#1e1e1e)]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--fg,#eee)]">{p.name}</span>
                      {p.strategy && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-3,#333)] text-muted">
                          {p.strategy}
                        </span>
                      )}
                      {p.targets != null && (
                        <span className="text-[10px] text-muted">{p.targets} voices</span>
                      )}
                    </div>
                    {p.description && <p className="text-xs text-muted mt-1">{p.description}</p>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )
      })}
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
