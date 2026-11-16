import { AlertTriangle, Check, FileArchive, Loader2, RefreshCw, Trash2, X } from 'lucide-react'

import { fmtBytes } from '../../lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { QueueItem, QueueStatus } from './types'

export function QueueRow({
  item,
  disabled,
  confirm,
  onRemove,
  onRetry,
  onUninstallRetry,
}: {
  item: QueueItem
  disabled: boolean
  confirm: boolean
  onRemove: () => void
  onRetry: () => void
  onUninstallRetry: () => void
}) {
  const meta = item.upload?.meta
  const busy = item.status === 'uploading' || item.status === 'installing'
  const label = meta?.label || item.name

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-muted">
          {item.upload?.icon ? (
            <img src={item.upload.icon} alt="" className="size-8 object-contain" />
          ) : (
            <FileArchive className="size-4 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{label}</p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">{meta?.package || item.name}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {meta?.versionName && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                v{meta.versionName}
              </Badge>
            )}
            {meta?.minSdk ? (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                minSdk {meta.minSdk}
              </Badge>
            ) : null}
            {item.upload?.bundle ? (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                split ×{item.upload.parts}
              </Badge>
            ) : null}
            <span className="text-[10px] text-muted-foreground">{fmtBytes(item.size)}</span>
          </div>

          {busy && (
            <div className="space-y-1 pt-0.5">
              <Progress value={item.status === 'installing' ? 100 : item.progress * 100} />
              <p className="text-[10px] text-muted-foreground">
                {item.status === 'uploading'
                  ? `uploading ${Math.round(item.progress * 100)}%`
                  : 'installing on device…'}
              </p>
            </div>
          )}

          {item.error && !busy && (
            <div className="flex items-start gap-1.5 pt-0.5 text-[11px] text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span className="break-words">{item.error}</span>
            </div>
          )}

          {item.status === 'conflict' && (
            <Button size="sm" variant="outline" onClick={onUninstallRetry} disabled={disabled}>
              <Trash2 />
              Uninstall {item.upload?.meta.package} and retry
            </Button>
          )}

          {item.result?.output && (
            <details>
              <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                installer output
              </summary>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/40 p-2 font-mono text-[10px] text-foreground">
                {item.result.output}
              </pre>
            </details>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          {item.status === 'error' || item.status === 'conflict' ? (
            <Button size="icon" variant="ghost" className="size-7" title="Retry" onClick={onRetry} disabled={disabled}>
              <RefreshCw className="size-3.5" />
            </Button>
          ) : null}
          {!busy && (
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground"
              title="Remove"
              onClick={() => {
                if (!confirm || item.status === 'done' || item.status === 'error' || item.status === 'conflict') onRemove()
                else if (window.confirm('Discard this upload?')) onRemove()
              }}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function StatusBadge({ status }: { status: QueueStatus }) {
  switch (status) {
    case 'uploading':
      return (
        <Badge variant="secondary" className="shrink-0 gap-1 px-2 py-0.5 text-[10px]">
          <Loader2 className="size-3 animate-spin" /> upload
        </Badge>
      )
    case 'installing':
      return (
        <Badge variant="secondary" className="shrink-0 gap-1 px-2 py-0.5 text-[10px]">
          <Loader2 className="size-3 animate-spin" /> install
        </Badge>
      )
    case 'ready':
      return (
        <Badge variant="outline" className="shrink-0 px-2 py-0.5 text-[10px]">
          ready
        </Badge>
      )
    case 'done':
      return (
        <Badge className="shrink-0 gap-1 px-2 py-0.5 text-[10px]">
          <Check className="size-3" /> installed
        </Badge>
      )
    case 'conflict':
      return (
        <Badge variant="destructive" className="shrink-0 px-2 py-0.5 text-[10px]">
          conflict
        </Badge>
      )
    case 'error':
      return (
        <Badge variant="destructive" className="shrink-0 px-2 py-0.5 text-[10px]">
          failed
        </Badge>
      )
    default:
      return null
  }
}
