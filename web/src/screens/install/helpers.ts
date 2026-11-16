import type { InstallOptions } from '../../api'
import type { Recent } from './types'

export const ACCEPT = '.apk,.xapk,.apkm,.apks,.zip,application/vnd.android.package-archive'
export const OPTS_KEY = 'adbremote.install.options'
export const RECENT_KEY = 'adbremote.install.recent'

const DEFAULT_OPTIONS: InstallOptions = { reinstall: true, downgrade: false, grantAll: false }

export function loadOptions(): InstallOptions {
  try {
    return { ...DEFAULT_OPTIONS, ...JSON.parse(localStorage.getItem(OPTS_KEY) || '{}') }
  } catch {
    return DEFAULT_OPTIONS
  }
}

export function saveOptions(options: InstallOptions): void {
  localStorage.setItem(OPTS_KEY, JSON.stringify(options))
}

export function loadRecent(): Recent[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function saveRecent(recent: Recent[]): void {
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 8)))
}

export function newKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
