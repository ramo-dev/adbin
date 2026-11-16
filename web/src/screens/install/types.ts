import type { InstallResult, Upload } from '../../api'

export type QueueStatus = 'uploading' | 'ready' | 'installing' | 'done' | 'error' | 'conflict'

export type QueueItem = {
  key: string
  name: string
  size: number
  status: QueueStatus
  progress: number
  upload?: Upload
  result?: InstallResult
  error?: string
}

export type Recent = {
  name: string
  label: string
  package: string
  at: number
  ok: boolean
}
