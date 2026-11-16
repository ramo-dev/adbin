export type Device = {
  serial: string
  state: string
  model?: string
  product?: string
  device?: string
  transport?: string
}

export type Status = {
  devices: Device[]
  target: string
  model: string
  ok: boolean
}

export type Info = {
  model: string
  manufacturer: string
  android: string
  sdk: string
  abi: string
  serial: string
  width: number
  height: number
  density: string
  batteryLevel: string
  batteryStatus: string
  uptime: string
  storageTotal: string
  storageFree: string
}

export type AppInfo = {
  package: string
  label: string
  hasIcon: boolean
  iconVersion: number
  resolved: boolean
}

export type ApkMeta = {
  package: string
  label: string
  versionName: string
  versionCode: number
  minSdk: number
  targetSdk: number
  abis: string[] | null
  bundle: boolean
  parts: number
}

export type Upload = {
  id: string
  name: string
  size: number
  bundle: boolean
  parts: number
  meta: ApkMeta
  icon?: string
  metaError?: string
}

export type InstallOptions = {
  reinstall: boolean
  downgrade: boolean
  grantAll: boolean
}

export type InstallResult = {
  ok: boolean
  output: string
  package?: string
  label?: string
  name?: string
  ms?: number
  error?: string
}

export type ServerConfig = {
  version: string
  goVersion: string
  os: string
  arch: string
  uptimeSeconds: number
  adbPath: string
  adbVersion: string
  aapt2: string
  tokenRequired: boolean
  device: string
  cacheDir: string
  iconCount: number
  uploadDir: string
}

export type MdnsService = {
  name: string
  service: string
  addr: string
}
