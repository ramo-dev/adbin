import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light' | 'system'

export type Prefs = {
  theme: Theme
  terminalFontSize: number
  screenshotInterval: number
  confirmDestructive: boolean
  terminalReconnect: boolean
}

const KEY = 'adbremote.prefs'

const DEFAULTS: Prefs = {
  theme: 'dark',
  terminalFontSize: 14,
  screenshotInterval: 1200,
  confirmDestructive: true,
  terminalReconnect: true,
}

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) }
  } catch {
    return DEFAULTS
  }
}

let current = load()
const listeners = new Set<() => void>()

export function getPrefs(): Prefs {
  return current
}

export function setPrefs(patch: Partial<Prefs>): void {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* storage disabled */
  }
  applyTheme()
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getPrefs, getPrefs)
}

export function prefersDark(): boolean {
  const pref = current.theme
  return (
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  )
}

export function toggleTheme(): void {
  setPrefs({ theme: prefersDark() ? 'light' : 'dark' })
}

export function applyTheme(): void {
  const pref = current.theme
  const dark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.classList.toggle('light', !dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#0b0b0f' : '#ffffff')
}
