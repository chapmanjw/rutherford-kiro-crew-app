import { useAppApi } from '@kirocrew/app-sdk'
import { Card, CardTitle, PageHeader, StatCard } from '@kirocrew/app-sdk/ui'
import { useState, useEffect, useCallback } from 'react'
import { Boxes, FileCog, Layers, UserSquare, RefreshCw, AlertTriangle } from 'lucide-react'

const BASE = '/api/apps/rutherford'

type Meta = { path: string; scope: string; platform: string; exists: boolean; error?: string }

type StatusResp = {
  platform: string
  agents: { enabled: string[]; enabled_source: string; allowlist_configured: boolean }
  defaults: { safety_mode?: string | null; auto_detect_local_models?: boolean | null }
  config_locations: { global: Meta; workspace: Meta }
  reachability: { available: boolean; note: string }
}

type ConfigResp = Meta & {
  config: Record<string, unknown>
  derived: { enabled_agents: string[]; trusted_workspaces: string[]; role_dirs: string[] }
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

const TABS: { id: Tab; label: string; icon: typeof Boxes }[] = [
  { id: 'status', label: 'Overview', icon: Boxes },
  { id: 'config', label: 'Config', icon: FileCog },
  { id: 'panels', label: 'Panels', icon: Layers },
  { id: 'roles', label: 'Roles', icon: UserSquare },
]

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
      {meta.error && (
        <span className="text-amber-500"> · {meta.error}</span>
      )}
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

  const loadAll = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [s, c, p, r] = await Promise.all([
        api.get(`${BASE}/status`),
        api.get(`${BASE}/config?scope=${configScope}`),
        api.get(`${BASE}/panels`),
        api.get(`${BASE}/roles`),
      ])
      setStatus(s as StatusResp)
      setConfig(c as ConfigResp)
      setPanels(p as PanelsResp)
      setRoles(r as RolesResp)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [api, configScope])

  useEffect(() => { void loadAll() }, [loadAll])

  const reloadConfig = useCallback(async (scope: 'global' | 'workspace') => {
    setConfigScope(scope)
    try {
      const c = await api.get(`${BASE}/config?scope=${scope}`)
      setConfig(c as ConfigResp)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }, [api])

  return (
    <>
      <PageHeader title="Rutherford" subtitle="Config & status — read-only (Phase 1)" />
      <div className="px-6 pb-8 overflow-y-auto flex-1 min-h-0">
        {/* Tab bar */}
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
              <ConfigView config={config} scope={configScope} onScope={reloadConfig} />
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
  const enabled = status.agents.enabled
  const rosterValue = status.agents.allowlist_configured
    ? String(enabled.length)
    : 'All'
  return (
    <>
      <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] mb-6">
        <StatCard label="Platform" value={status.platform} />
        <StatCard label="Agents enabled" value={rosterValue} accent />
        <StatCard label="Safety mode" value={status.defaults.safety_mode ?? 'read_only'} />
        <StatCard
          label="Local model detect"
          value={status.defaults.auto_detect_local_models ? 'on' : 'off'}
        />
      </div>

      <Card>
        <CardTitle>Enabled agents / CLIs</CardTitle>
        {status.agents.allowlist_configured ? (
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
            built-in agent plus any configured agent (source: {status.agents.enabled_source}).
          </p>
        )}
      </Card>

      <div className="h-3" />

      <Card>
        <CardTitle>Config locations</CardTitle>
        <PathChip meta={status.config_locations.global} />
        <PathChip meta={status.config_locations.workspace} />
      </Card>

      <div className="h-3" />

      <Card>
        <CardTitle>Reachability</CardTitle>
        <p className="text-sm text-muted mt-1">{status.reachability.note}</p>
      </Card>
    </>
  )
}

function ConfigView({
  config,
  scope,
  onScope,
}: {
  config: ConfigResp | null
  scope: 'global' | 'workspace'
  onScope: (s: 'global' | 'workspace') => void
}) {
  return (
    <>
      <div className="flex gap-1 mb-4">
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
      </div>

      {!config ? (
        <p className="text-sm text-muted">No config.</p>
      ) : (
        <Card>
          <CardTitle>config.toml</CardTitle>
          <PathChip meta={config} />
          {config.error ? (
            <p className="text-sm text-amber-500 mt-2">{config.error}</p>
          ) : !config.exists ? (
            <p className="text-sm text-muted mt-2">
              No config file at this scope. Rutherford runs with all defaults.
            </p>
          ) : (
            <pre className="text-xs mt-3 p-3 rounded bg-[var(--surface-2,#1e1e1e)] overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(config.config, null, 2)}
            </pre>
          )}
        </Card>
      )}
    </>
  )
}

function PanelsView({ panels }: { panels: PanelsResp | null }) {
  if (!panels) return <p className="text-sm text-muted">No panels.</p>
  const total = panels.sources.reduce((n, s) => n + s.panels.length, 0)
  if (total === 0) {
    return (
      <Card>
        <CardTitle>Named panels</CardTitle>
        <p className="text-sm text-muted mt-1">
          No <code>panels.toon</code> found. Checked:
        </p>
        {panels.sources.map((s) => (
          <PathChip key={s.path} meta={s} />
        ))}
      </Card>
    )
  }
  return (
    <>
      {panels.sources.map((s) =>
        s.panels.length === 0 ? null : (
          <div key={s.path} className="mb-4">
            <Card>
              <CardTitle>Panels · {s.scope}</CardTitle>
              <PathChip meta={s} />
              <div className="mt-3 flex flex-col gap-2">
                {s.panels.map((p) => (
                  <div
                    key={p.name}
                    className="p-3 rounded bg-[var(--surface-2,#1e1e1e)]"
                  >
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
                    {p.description && (
                      <p className="text-xs text-muted mt-1">{p.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ),
      )}
    </>
  )
}

function RolesView({ roles }: { roles: RolesResp | null }) {
  if (!roles) return <p className="text-sm text-muted">No roles.</p>
  const total = roles.sources.reduce((n, s) => n + s.roles.length, 0)
  if (total === 0) {
    return (
      <Card>
        <CardTitle>Roles</CardTitle>
        <p className="text-sm text-muted mt-1">No role markdown files found. Checked:</p>
        {roles.sources.map((s) => (
          <PathChip key={s.path} meta={s} />
        ))}
      </Card>
    )
  }
  return (
    <>
      {roles.sources.map((s) =>
        s.roles.length === 0 ? null : (
          <div key={s.path} className="mb-4">
            <Card>
              <CardTitle>Roles · {s.scope}</CardTitle>
              <PathChip meta={s} />
              <div className="mt-3 flex flex-wrap gap-2">
                {s.roles.map((r) => (
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
        ),
      )}
    </>
  )
}
