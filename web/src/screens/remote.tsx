import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  FastForward,
  Home,
  Info,
  Menu,
  Pause,
  Power,
  Rewind,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'

import { api } from '../api'
import type { Runner } from '../lib/runner'
import { ScreenHeader } from '@/components/screen-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function HoldButton({
  onPress,
  className,
  variant = 'secondary',
  size = 'default',
  disabled,
  title,
  children,
}: {
  onPress: () => void
  className?: string
  variant?: ComponentProps<typeof Button>['variant']
  size?: ComponentProps<typeof Button>['size']
  disabled?: boolean
  title?: string
  children: ReactNode
}) {
  const holdTimer = useRef<number | null>(null)
  const repeatTimer = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current)
    if (repeatTimer.current) window.clearInterval(repeatTimer.current)
    holdTimer.current = null
    repeatTimer.current = null
  }, [])

  useEffect(() => stop, [stop])

  const start = () => {
    if (disabled) return
    onPress()
    holdTimer.current = window.setTimeout(() => {
      repeatTimer.current = window.setInterval(onPress, 130)
    }, 420)
  }

  return (
    <Button
      type="button"
      title={title}
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </Button>
  )
}

export function RemoteScreen({ run, disabled }: { run: Runner; disabled: boolean }) {
  const [text, setText] = useState('')
  const press = useCallback((key: string) => void run(() => api.key(key)), [run])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      const map: Record<string, string> = {
        ArrowUp: 'KEYCODE_DPAD_UP',
        ArrowDown: 'KEYCODE_DPAD_DOWN',
        ArrowLeft: 'KEYCODE_DPAD_LEFT',
        ArrowRight: 'KEYCODE_DPAD_RIGHT',
        Enter: 'KEYCODE_DPAD_CENTER',
        Backspace: 'KEYCODE_BACK',
        Escape: 'KEYCODE_HOME',
      }
      const key = map[e.key]
      if (key) {
        e.preventDefault()
        press(key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press])

  const sendText = async () => {
    if (!text.trim()) return
    await run(() => api.text(text), 'text sent')
  }

  return (
    <section className="space-y-5">
      <ScreenHeader title="Remote" description="D-pad, media keys, volume and text input." />

      <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-8">
          <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
            <div />
            <HoldButton
              className="h-14 w-14"
              size="icon"
              onPress={() => press('KEYCODE_DPAD_UP')}
              disabled={disabled}
              title="Up"
            >
              <ArrowUp className="size-5" strokeWidth={1.75} />
            </HoldButton>
            <div />
            <HoldButton
              className="h-14 w-14"
              size="icon"
              onPress={() => press('KEYCODE_DPAD_LEFT')}
              disabled={disabled}
              title="Left"
            >
              <ArrowLeft className="size-5" strokeWidth={1.75} />
            </HoldButton>
            <HoldButton
              className="h-14 w-14 rounded-md text-xs font-semibold tracking-wide"
              size="icon"
              variant="default"
              onPress={() => press('KEYCODE_DPAD_CENTER')}
              disabled={disabled}
              title="OK"
            >
              OK
            </HoldButton>
            <HoldButton
              className="h-14 w-14"
              size="icon"
              onPress={() => press('KEYCODE_DPAD_RIGHT')}
              disabled={disabled}
              title="Right"
            >
              <ArrowRight className="size-5" strokeWidth={1.75} />
            </HoldButton>
            <div />
            <HoldButton
              className="h-14 w-14"
              size="icon"
              onPress={() => press('KEYCODE_DPAD_DOWN')}
              disabled={disabled}
              title="Down"
            >
              <ArrowDown className="size-5" strokeWidth={1.75} />
            </HoldButton>
            <div />
          </div>

          <div className="grid gap-1.5">
            <HoldButton className="h-8 w-28 justify-start" onPress={() => press('KEYCODE_BACK')} disabled={disabled}>
              Back
            </HoldButton>
            <HoldButton className="h-8 w-28 justify-start" onPress={() => press('KEYCODE_HOME')} disabled={disabled}>
              <Home />
              Home
            </HoldButton>
            <HoldButton className="h-8 w-28 justify-start" onPress={() => press('KEYCODE_MENU')} disabled={disabled}>
              <Menu />
              Menu
            </HoldButton>
            <HoldButton
              className="h-8 w-28 justify-start"
              onPress={() => press('KEYCODE_POWER')}
              disabled={disabled}
            >
              <Power />
              Power
            </HoldButton>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-1.5 border-t border-border pt-4">
          <HoldButton size="icon" onPress={() => press('KEYCODE_MEDIA_PREVIOUS')} disabled={disabled} title="Previous">
            <SkipBack className="size-4" />
          </HoldButton>
          <HoldButton size="icon" onPress={() => press('KEYCODE_MEDIA_REWIND')} disabled={disabled} title="Rewind">
            <Rewind className="size-4" />
          </HoldButton>
          <HoldButton size="icon" onPress={() => press('KEYCODE_MEDIA_PLAY_PAUSE')} disabled={disabled} title="Play/Pause">
            <Pause className="size-4" />
          </HoldButton>
          <HoldButton
            size="icon"
            onPress={() => press('KEYCODE_MEDIA_FAST_FORWARD')}
            disabled={disabled}
            title="Forward"
          >
            <FastForward className="size-4" />
          </HoldButton>
          <HoldButton size="icon" onPress={() => press('KEYCODE_MEDIA_NEXT')} disabled={disabled} title="Next">
            <SkipForward className="size-4" />
          </HoldButton>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <HoldButton onPress={() => press('KEYCODE_VOLUME_DOWN')} disabled={disabled} title="Volume down">
            <Volume1 />
            Vol −
          </HoldButton>
          <HoldButton onPress={() => press('KEYCODE_VOLUME_MUTE')} disabled={disabled} title="Mute">
            <VolumeX />
            Mute
          </HoldButton>
          <HoldButton onPress={() => press('KEYCODE_VOLUME_UP')} disabled={disabled} title="Volume up">
            <Volume2 />
            Vol +
          </HoldButton>
          <HoldButton onPress={() => press('KEYCODE_INFO')} disabled={disabled} title="Info">
            <Info />
            Info
          </HoldButton>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
          <Input
            className="h-8 text-[13px]"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type text or paste a URL…"
            onKeyDown={(e) => e.key === 'Enter' && sendText()}
            disabled={disabled}
          />
          <Button size="sm" onClick={sendText} disabled={disabled || !text.trim()}>
            Send
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setText('')} disabled={!text}>
            Clear
          </Button>
        </div>
      </div>
    </section>
  )
}
