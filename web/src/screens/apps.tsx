import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Search } from 'lucide-react'

import { api, type AppInfo } from '../api'
import type { Notify, Runner } from '../lib/runner'
import { ScreenHeader } from '@/components/screen-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const SKIP_LABEL_PARTS = new Set([
  'tv',
  'app',
  'apps',
  'mobile',
  'android',
  'androidtv',
  'client',
  'stable',
  'mediaclient',
])

function fallbackLabel(pkg: string): string {
  const parts = pkg.split('.')
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i].replace(/[_-]/g, '')
    if (part && !SKIP_LABEL_PARTS.has(part.toLowerCase())) {
      return part.charAt(0).toUpperCase() + part.slice(1)
    }
  }
  return pkg
}

function appLabel(app: AppInfo): string {
  return app.resolved ? app.label : fallbackLabel(app.package)
}

export function AppsScreen({
  run,
  notify,
  disabled,
}: {
  run: Runner
  notify: Notify
  disabled: boolean
}) {
  const [apps, setApps] = useState<AppInfo[]>([])
  const [pending, setPending] = useState(0)
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setBusy(true)
      try {
        const res = await api.apps()
        setApps(res.apps)
        setPending(res.pending)
      } catch (e) {
        if (!silent) notify(e instanceof Error ? e.message : 'failed to list apps', 'err')
      } finally {
        setBusy(false)
        setLoading(false)
      }
    },
    [notify]
  )

  useEffect(() => {
    if (!disabled) load()
  }, [disabled, load])

  useEffect(() => {
    if (disabled || pending <= 0) return
    const id = window.setTimeout(() => load(true), 2500)
    return () => window.clearTimeout(id)
  }, [pending, disabled, load])

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const list = q
      ? apps.filter((a) => appLabel(a).toLowerCase().includes(q) || a.package.toLowerCase().includes(q))
      : apps
    return [...list].sort((a, b) => appLabel(a).localeCompare(appLabel(b)))
  }, [apps, filter])

  return (
    <section>
      <ScreenHeader
        title="Apps"
        description={`${apps.length} apps${pending > 0 ? ` · resolving ${pending} icon${pending === 1 ? '' : 's'}` : ''}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => load()} disabled={disabled || busy}>
            {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Refresh
          </Button>
        }
      />

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8 rounded-md border-border bg-card pl-9 text-[13px]"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search apps…"
          disabled={disabled}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {shown.map((app) => (
          <button
            key={app.package}
            type="button"
            onClick={() => run(() => api.launch(app.package), `launched ${appLabel(app)}`)}
            disabled={disabled}
            className="group flex items-center gap-3 rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:border-foreground/20 hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
              <AppIcon app={app} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium">{appLabel(app)}</div>
              <div className="truncate text-[10px] text-muted-foreground">{app.package}</div>
            </div>
          </button>
        ))}
      </div>

      {loading && <p className="mt-5 text-[13px] text-muted-foreground">Loading apps…</p>}
      {!loading && !shown.length && (
        <p className="mt-5 text-[13px] text-muted-foreground">No apps found.</p>
      )}
    </section>
  )
}

function AppIcon({ app }: { app: AppInfo }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [app.iconVersion, app.hasIcon])

  if (!app.hasIcon || failed) {
    return (
      <span className="text-sm font-semibold text-muted-foreground">
        {appLabel(app).slice(0, 1).toUpperCase()}
      </span>
    )
  }
  return (
    <img
      src={api.iconUrl(app.package, app.iconVersion)}
      alt=""
      loading="lazy"
      className="size-8 object-contain"
      onError={() => setFailed(true)}
    />
  )
}
