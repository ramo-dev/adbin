import {
  Clipboard,
  Copy,
  Eraser,
  Hash,
  Plug,
  RotateCw,
  ScrollText,
  SquareTerminal,
} from 'lucide-react'

import { setPrefs, usePrefs } from '../../lib/prefs'
import { ScreenHeader } from '@/components/screen-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { SNIPPETS } from './snippets'
import { FONT_SIZES } from './theme'
import { useTerminal } from './use-terminal'

export function ShellScreen({ disabled }: { disabled: boolean }) {
  const prefs = usePrefs()
  const { hostRef, termRef, phase, root, setRoot, userClosed, reconnect, focus, copy, paste, insert } =
    useTerminal(disabled)

  const fontSize = prefs.terminalFontSize
  const status = disabled ? 'offline' : phase
  const live = phase === 'open' && !disabled

  return (
    <section className="space-y-5">
      <ScreenHeader
        title="Shell"
        description="A real PTY on the device: interactive sh, colours, job control and su, over a WebSocket."
        actions={
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn('size-1.5 rounded-full', live ? 'bg-foreground' : 'bg-muted-foreground/40')} />
            {status}
          </span>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-border py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 px-2 font-mono text-[10px] font-normal text-muted-foreground">
              <SquareTerminal className="size-3" />
              adb shell
            </Badge>
            <label className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1">
              <Hash className={cn('size-3.5', root ? 'text-foreground' : 'text-muted-foreground')} />
              <span className="text-xs font-medium">root</span>
              <Switch
                checked={root}
                onCheckedChange={(v) => {
                  setRoot(v)
                  focus()
                }}
                disabled={disabled}
                aria-label="Run a root shell"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <Select
              value={String(fontSize)}
              onValueChange={(v) => setPrefs({ terminalFontSize: Number(v) })}
            >
              <SelectTrigger className="w-[88px] text-xs">
                <ScrollText className="size-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent onCloseAutoFocus={(e) => { e.preventDefault(); focus() }}>
                {FONT_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                void copy()
                focus()
              }}
              title="Copy selection"
            >
              <Copy className="size-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                void paste()
                focus()
              }}
              title="Paste clipboard"
            >
              <Clipboard className="size-3.5" />
              <span className="hidden sm:inline">Paste</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                termRef.current?.clear()
                focus()
              }}
              title="Clear scrollback"
            >
              <Eraser className="size-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                reconnect()
                focus()
              }}
              disabled={disabled}
            >
              {phase === 'connecting' ? (
                <RotateCw className="size-3.5 animate-spin" />
              ) : (
                <Plug className="size-3.5" />
              )}
              <span className="hidden sm:inline">{phase === 'closed' ? 'Reconnect' : 'Restart'}</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {disabled ? (
            <div className="flex h-[46vh] min-h-[300px] items-center justify-center px-6 text-center text-[13px] text-muted-foreground">
              Connect a device to open a shell.
            </div>
          ) : (
            <div
              className="h-[min(58vh,620px)] min-h-[320px] w-full overflow-hidden bg-[#0b0b0b] p-2"
              onPointerDown={() => focus()}
            >
              <div ref={hostRef} className="h-full w-full" />
            </div>
          )}
        </CardContent>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>
            Ctrl+C interrupts · Ctrl+D exits · select to copy ·{' '}
            {root ? 'root shell via su 0' : 'shell user (uid 2000)'}
          </span>
          {phase === 'closed' && !disabled && (
            <span className="text-destructive">{userClosed ? 'closed' : 'reconnecting…'}</span>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Snippets</CardTitle>
            <span className="text-[11px] text-muted-foreground">click to insert, then press enter</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {SNIPPETS.map((g) => (
            <div key={g.group} className="flex flex-wrap items-center gap-1.5">
              <span className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                {g.group}
              </span>
              {g.items.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => insert(cmd)}
                  disabled={disabled}
                  className="rounded-md border border-border bg-background/50 px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  {cmd}
                </button>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
