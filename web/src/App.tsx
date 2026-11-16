import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { api, type Info, type Status } from './api'
import { AppHeader } from './components/app-header'
import { ConnectBar } from './components/connect-bar'
import { NavBar } from './components/nav-bar'
import { NoticeCard } from './components/notice-card'
import type { Tab } from './components/nav'
import { applyTheme, usePrefs } from './lib/prefs'
import type { Notify, Runner } from './lib/runner'
import { AppsScreen } from './screens/apps'
import { InstallScreen } from './screens/install'
import { RemoteScreen } from './screens/remote'
import { ScreenScreen } from './screens/screen'
import { SettingsScreen } from './screens/settings'
import { ShellScreen } from './screens/shell'
import { Toaster } from '@/components/ui/sonner'

const TABS: Tab[] = ['apps', 'remote', 'screen', 'install', 'shell', 'settings']

function tabFromHash(): Tab {
  const value = window.location.hash.replace('#', '')
  return TABS.includes(value as Tab) ? (value as Tab) : 'apps'
}

export default function App() {
  const [tab, setTabState] = useState<Tab>(tabFromHash)
  const [status, setStatus] = useState<Status | null>(null)
  const [info, setInfo] = useState<Info | null>(null)
  const [now, setNow] = useState(() => new Date())
  const prefs = usePrefs()

  const setTab = useCallback((next: Tab) => {
    setTabState(next)
    window.history.replaceState(null, '', `#${next}`)
  }, [])

  useEffect(() => {
    const onHash = () => setTabState(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const notify = useCallback<Notify>((text, kind = 'ok') => {
    if (kind === 'err') toast.error(text)
    else toast.success(text)
  }, [])

  const refresh = useCallback(async () => {
    try {
      setStatus(await api.status())
    } catch {
      setStatus({ devices: [], target: '', model: '', ok: false })
    }
  }, [])

  useEffect(() => {
    applyTheme()
  }, [])

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, 5000)
    return () => window.clearInterval(id)
  }, [refresh])

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!status?.ok) {
      setInfo(null)
      return
    }
    let cancelled = false
    api
      .info()
      .then((v) => {
        if (!cancelled) setInfo(v)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [status?.ok, status?.target])

  const run = useCallback<Runner>(
    async (fn, ok) => {
      try {
        await fn()
        if (ok) notify(ok)
      } catch (e) {
        notify(e instanceof Error ? e.message : 'request failed', 'err')
      }
    },
    [notify]
  )

  const connected = Boolean(status?.ok)
  const deviceLabel = connected ? status?.model || status?.target || 'device' : 'not connected'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader
        tab={tab}
        onChange={setTab}
        connected={connected}
        deviceLabel={deviceLabel}
        now={now}
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 md:pb-12 md:pt-8">
        {!connected && <ConnectBar onDone={refresh} notify={notify} />}

        <NoticeCard />

        <main className="mt-6">
          {tab === 'apps' && <AppsScreen run={run} notify={notify} disabled={!connected} />}
          {tab === 'remote' && <RemoteScreen run={run} disabled={!connected} />}
          {tab === 'screen' && <ScreenScreen info={info} run={run} disabled={!connected} />}
          {tab === 'install' && <InstallScreen info={info} notify={notify} disabled={!connected} />}
          {tab === 'shell' && <ShellScreen disabled={!connected} />}
          {tab === 'settings' && (
            <SettingsScreen status={status} info={info} refresh={refresh} notify={notify} />
          )}
        </main>
      </div>

      <NavBar tab={tab} onChange={setTab} />
      <Toaster theme={prefs.theme} position="bottom-center" />
    </div>
  )
}
