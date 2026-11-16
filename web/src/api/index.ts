import { getBase, getToken, request, upload } from './client'
import type {
  AppInfo,
  Info,
  InstallOptions,
  InstallResult,
  MdnsService,
  ServerConfig,
  Status,
  Upload,
} from './types'

export * from './types'
export { getBase, getToken, saveBase, saveToken } from './client'

export const api = {
  status: () => request<Status>('/api/status'),
  info: () => request<Info>('/api/info'),
  config: () => request<ServerConfig>('/api/config'),
  connect: (addr: string) =>
    request<{ output: string }>('/api/connect', { method: 'POST', body: JSON.stringify({ addr }) }),
  disconnect: (addr: string) =>
    request<{ output: string }>('/api/disconnect', { method: 'POST', body: JSON.stringify({ addr }) }),
  key: (key: string) => request('/api/key', { method: 'POST', body: JSON.stringify({ key }) }),
  text: (text: string) => request('/api/text', { method: 'POST', body: JSON.stringify({ text }) }),
  tap: (x: number, y: number) => request('/api/tap', { method: 'POST', body: JSON.stringify({ x, y }) }),
  swipe: (x1: number, y1: number, x2: number, y2: number, duration = 300) =>
    request('/api/swipe', { method: 'POST', body: JSON.stringify({ x1, y1, x2, y2, duration }) }),
  apps: (all = false) => request<{ apps: AppInfo[]; pending: number }>(`/api/apps${all ? '?all=1' : ''}`),
  iconUrl: (pkg: string, v: number) => {
    const token = getToken()
    return `${getBase()}/api/apps/icon?pkg=${encodeURIComponent(pkg)}&v=${v}${token ? `&token=${encodeURIComponent(token)}` : ''}`
  },
  launch: (pkg: string) =>
    request('/api/apps/launch', { method: 'POST', body: JSON.stringify({ package: pkg }) }),
  uninstall: (pkg: string) =>
    request('/api/apps/uninstall', { method: 'POST', body: JSON.stringify({ package: pkg }) }),
  uploadApk: (file: File, onProgress?: (ratio: number) => void, signal?: AbortSignal) => {
    const fd = new FormData()
    fd.append('apk', file)
    return upload<{ files: Upload[] }>('/api/apk/upload', fd, onProgress, signal)
  },
  fetchApk: (url: string) =>
    request<{ file: Upload }>('/api/apk/url', { method: 'POST', body: JSON.stringify({ url }) }),
  installApk: (id: string, opts: InstallOptions) =>
    request<InstallResult>('/api/apk/install', {
      method: 'POST',
      body: JSON.stringify({ id, ...opts }),
    }),
  discardApk: (id: string) =>
    request('/api/apk/discard', { method: 'POST', body: JSON.stringify({ id }) }),
  pushFile: (file: File, dir: string, onProgress?: (ratio: number) => void, signal?: AbortSignal) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('dir', dir)
    return upload<{ pushed: { name: string; remote: string; output: string }[] }>(
      '/api/push',
      fd,
      onProgress,
      signal
    )
  },
  discover: () => request<{ services: MdnsService[] }>('/api/discover'),
  restartAdb: () => request<{ output: string }>('/api/adb/restart', { method: 'POST' }),
  reboot: (mode = '') =>
    request<{ output: string }>('/api/device/reboot', { method: 'POST', body: JSON.stringify({ mode }) }),
  clearCache: () => request<{ ok: boolean }>('/api/cache/clear', { method: 'POST' }),
  shell: (cmd: string) =>
    request<{ output: string }>('/api/shell', { method: 'POST', body: JSON.stringify({ cmd }) }),
  screenshotUrl: (t: number) => {
    const token = getToken()
    return `${getBase()}/api/screenshot?t=${t}${token ? `&token=${encodeURIComponent(token)}` : ''}`
  },
  terminalUrl: (root: boolean, cols: number, rows: number) => {
    const url = new URL('/api/ws/terminal', getBase() || window.location.origin)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    const token = getToken()
    if (token) url.searchParams.set('token', token)
    url.searchParams.set('cols', String(cols))
    url.searchParams.set('rows', String(rows))
    if (root) url.searchParams.set('root', '1')
    return url.toString()
  },
}
