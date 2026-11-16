import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { Pause, Play, RefreshCw } from 'lucide-react'

import { api, type Info } from '../api'
import { usePrefs } from '../lib/prefs'
import type { Runner } from '../lib/runner'
import { ScreenHeader } from '@/components/screen-header'
import { Button } from '@/components/ui/button'

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-64 items-center justify-center px-6 text-center text-[13px] text-muted-foreground">
      {children}
    </div>
  )
}

export function ScreenScreen({
  info,
  run,
  disabled,
}: {
  info: Info | null
  run: Runner
  disabled: boolean
}) {
  const prefs = usePrefs()
  const [live, setLive] = useState(true)
  const [src, setSrc] = useState('')
  const [failed, setFailed] = useState(false)
  const [manual, setManual] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const currentUrl = useRef<string | null>(null)

  useEffect(() => {
    if (disabled) return
    let cancelled = false
    let timer = 0

    const tick = async () => {
      try {
        const res = await fetch(api.screenshotUrl(Date.now()), { cache: 'no-store' })
        if (!res.ok) throw new Error(`screenshot failed (${res.status})`)
        const blob = await res.blob()
        if (cancelled) return
        const next = URL.createObjectURL(blob)
        if (currentUrl.current) URL.revokeObjectURL(currentUrl.current)
        currentUrl.current = next
        setSrc(next)
        setFailed(false)
      } catch {
        if (!cancelled) setFailed(true)
      } finally {
        if (!cancelled && live) timer = window.setTimeout(tick, prefs.screenshotInterval)
      }
    }

    tick()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [live, disabled, manual, prefs.screenshotInterval])

  useEffect(() => {
    return () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current)
    }
  }, [])

  const onClick = (e: MouseEvent<HTMLImageElement>) => {
    if (!info || !imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * info.width)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * info.height)
    void run(() => api.tap(x, y))
  }

  return (
    <section className="space-y-5">
      <ScreenHeader
        title="Screen"
        description={info ? `${info.width}×${info.height} · ${info.density || '—'} dpi` : 'No display info'}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setLive((v) => !v)} disabled={disabled}>
              {live ? <Pause /> : <Play />}
              {live ? 'Live' : 'Paused'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFailed(false)
                setManual((m) => m + 1)
              }}
              disabled={disabled}
            >
              <RefreshCw />
              Refresh
            </Button>
          </>
        }
      />

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="overflow-hidden rounded-md border border-border bg-black">
          {disabled ? (
            <Placeholder>Connect a device to see the screen.</Placeholder>
          ) : failed && !src ? (
            <Placeholder>Screenshot failed. Is the device awake?</Placeholder>
          ) : src ? (
            <img
              ref={imgRef}
              src={src}
              alt="Device screen"
              onClick={onClick}
              draggable={false}
              className="block w-full cursor-crosshair"
            />
          ) : (
            <Placeholder>Loading screenshot… (a few seconds on slow devices)</Placeholder>
          )}
        </div>
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          Tap the image to send a touch at that point. Refresh rate is adjustable in Settings.
        </p>
      </div>
    </section>
  )
}
