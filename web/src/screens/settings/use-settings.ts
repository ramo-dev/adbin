import { useCallback, useEffect, useState } from 'react'

import {
  api,
  getBase,
  getToken,
  saveBase,
  saveToken,
  type Info,
  type MdnsService,
  type ServerConfig,
  type Status,
} from '../../api'
import type { Notify } from '../../lib/runner'
import { ADDR_KEY, DEFAULT_ADDR, loadRecentAddrs, rememberAddr } from './helpers'
import { NAV_GROUPS } from './nav'
import type { RebootMode } from './reboot-dialog'

export function useSettings({
  status,
  info,
  refresh,
  notify,
}: {
  status: Status | null
  info: Info | null
  refresh: () => void
  notify: Notify
}) {
  const [config, setConfig] = useState<ServerConfig | null>(null)
  const [base, setBase] = useState(getBase())
  const [token, setToken] = useState(getToken())
  const [showToken, setShowToken] = useState(false)
  const [addr, setAddr] = useState(() => localStorage.getItem(ADDR_KEY) || DEFAULT_ADDR)
  const [recent, setRecent] = useState<string[]>(loadRecentAddrs)
  const [services, setServices] = useState<MdnsService[] | null>(null)
  const [discovering, setDiscovering] = useState(false)
  const [busy, setBusy] = useState('')
  const [rebootMode, setRebootMode] = useState<RebootMode>('system')
  const [confirmReboot, setConfirmReboot] = useState(false)
  const [active, setActive] = useState('device')

  const connected = Boolean(status?.ok)

  const loadConfig = useCallback(async () => {
    try {
      setConfig(await api.config())
    } catch {
      setConfig(null)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig, connected])

  useEffect(() => {
    const sections = NAV_GROUPS.flatMap((g) => g.items)
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => Boolean(el))
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-88px 0px -65% 0px', threshold: 0 }
    )
    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const jump = (id: string) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const saveClient = () => {
    saveBase(base)
    saveToken(token)
    notify('client settings saved')
    loadConfig()
  }

  const connect = async (target?: string) => {
    const value = (target ?? addr).trim()
    if (!value) return
    setBusy('connect')
    try {
      localStorage.setItem(ADDR_KEY, value)
      rememberAddr(value)
      setRecent(loadRecentAddrs())
      setAddr(value)
      await api.connect(value)
      refresh()
      notify(`connected to ${value}`)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'connect failed', 'err')
    } finally {
      setBusy('')
    }
  }

  const disconnect = async () => {
    setBusy('disconnect')
    try {
      await api.disconnect(addr)
      refresh()
      notify(`disconnected ${addr}`)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'disconnect failed', 'err')
    } finally {
      setBusy('')
    }
  }

  const discover = async () => {
    setDiscovering(true)
    try {
      const res = await api.discover()
      setServices(res.services || [])
      if (!res.services?.length) notify('no mdns devices found')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'discovery failed', 'err')
    } finally {
      setDiscovering(false)
    }
  }

  const restartAdb = async () => {
    setBusy('adb')
    try {
      const res = await api.restartAdb()
      refresh()
      notify(res.output ? 'adb server restarted' : 'adb restarted')
      loadConfig()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'restart failed', 'err')
    } finally {
      setBusy('')
    }
  }

  const clearCache = async () => {
    setBusy('cache')
    try {
      await api.clearCache()
      notify('icon cache cleared')
      loadConfig()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'clear failed', 'err')
    } finally {
      setBusy('')
    }
  }

  const reboot = async () => {
    setConfirmReboot(false)
    setBusy('reboot')
    try {
      const res = await api.reboot(rebootMode === 'system' ? '' : rebootMode)
      notify(res.output || 'reboot requested')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'reboot failed', 'err')
    } finally {
      setBusy('')
    }
  }

  const copyDiagnostics = async () => {
    const payload = {
      server: config,
      device: status,
      info,
      client: { base: getBase() || '(same origin)', tokenSet: Boolean(getToken()) },
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      notify('diagnostics copied')
    } catch {
      notify('clipboard unavailable', 'err')
    }
  }

  return {
    config,
    base,
    setBase,
    token,
    setToken,
    showToken,
    setShowToken,
    addr,
    setAddr,
    recent,
    services,
    discovering,
    busy,
    rebootMode,
    setRebootMode,
    confirmReboot,
    setConfirmReboot,
    active,
    connected,
    loadConfig,
    jump,
    saveClient,
    connect,
    disconnect,
    discover,
    restartAdb,
    clearCache,
    reboot,
    copyDiagnostics,
  }
}
