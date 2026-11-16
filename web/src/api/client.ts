const BASE_KEY = 'adbremote.base'
const TOKEN_KEY = 'adbremote.token'

export function getBase(): string {
  return localStorage.getItem(BASE_KEY) || ''
}

export function saveBase(v: string): void {
  localStorage.setItem(BASE_KEY, v.replace(/\/+$/, ''))
}

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function saveToken(v: string): void {
  localStorage.setItem(TOKEN_KEY, v)
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('X-Auth-Token', token)

  const res = await fetch(getBase() + path, { ...init, headers })
  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await res.json() : await res.text()
  if (!res.ok) {
    const message = data && typeof data === 'object' && 'error' in data ? String(data.error) : res.statusText
    throw new Error(message || `request failed (${res.status})`)
  }
  return data as T
}

/** Multipart upload with progress. fetch() cannot report upload progress. */
export function upload<T>(
  path: string,
  form: FormData,
  onProgress?: (ratio: number) => void,
  signal?: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', getBase() + path)
    const token = getToken()
    if (token) xhr.setRequestHeader('X-Auth-Token', token)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }
    xhr.onload = () => {
      let data: unknown = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        data = xhr.responseText
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T)
        return
      }
      const message =
        data && typeof data === 'object' && 'error' in data
          ? String((data as { error: unknown }).error)
          : xhr.statusText || `request failed (${xhr.status})`
      reject(new Error(message))
    }
    xhr.onerror = () => reject(new Error('network error'))
    xhr.onabort = () => reject(new DOMException('aborted', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(form)
  })
}
