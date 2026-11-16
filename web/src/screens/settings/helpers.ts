export const ADDR_KEY = 'adbremote.addr'
export const RECENT_ADDR_KEY = 'adbremote.addresses'
export const DEFAULT_ADDR = ''

export function loadRecentAddrs(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_ADDR_KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function rememberAddr(addr: string): void {
  const next = [addr, ...loadRecentAddrs().filter((a) => a !== addr)].slice(0, 5)
  localStorage.setItem(RECENT_ADDR_KEY, JSON.stringify(next))
}
