import { useCallback, useRef, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
import { UploadCloud } from 'lucide-react'

import { cn } from '@/lib/utils'

type Props = {
  onFiles: (files: File[]) => void
  accept?: string
  disabled?: boolean
  className?: string
  title?: string
  hint?: ReactNode
  icon?: ReactNode
}

/**
 * Native drag-and-drop dropzone. Keeps a depth counter so dragging over the
 * inner icon/text does not flicker the highlight on and off.
 */
export function Dropzone({
  onFiles,
  accept,
  disabled,
  className,
  title = 'Drop APKs here',
  hint = 'or click to browse',
  icon,
}: Props) {
  const [over, setOver] = useState(false)
  const depth = useRef(0)
  const input = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    depth.current = 0
    setOver(false)
  }, [])

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault()
    if (disabled) return
    depth.current += 1
    setOver(true)
  }

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (!disabled) e.dataTransfer.dropEffect = 'copy'
  }

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault()
    depth.current -= 1
    if (depth.current <= 0) reset()
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    reset()
    if (disabled) return
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length) onFiles(files)
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          input.current?.click()
        }
      }}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPaste={(e) => {
        if (disabled) return
        const files = Array.from(e.clipboardData.files || [])
        if (files.length) {
          e.preventDefault()
          onFiles(files)
        }
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        over
          ? 'border-foreground/40 bg-accent'
          : 'border-border bg-card hover:border-foreground/25 hover:bg-accent/60',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      <div
        className={cn(
          'grid size-10 place-items-center rounded-md border border-border bg-muted text-muted-foreground',
          over && 'border-foreground/20 text-foreground'
        )}
      >
        {icon || <UploadCloud className="size-5" />}
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{over ? 'Release to add' : title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          if (files.length) onFiles(files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
