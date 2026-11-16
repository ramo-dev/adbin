import { Moon, Sun } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { prefersDark, toggleTheme, usePrefs } from '@/lib/prefs'
import { Logo } from './logo'
import { NAV, type Tab } from './nav'

export function AppHeader({
  tab,
  onChange,
  connected,
  deviceLabel,
  now,
}: {
  tab: Tab
  onChange: (tab: Tab) => void
  connected: boolean
  deviceLabel: string
  now: Date
}) {
  usePrefs() // re-render when the theme preference changes
  const dark = prefersDark()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="grid size-7 place-items-center rounded-md bg-foreground text-background">
            <Logo className="size-[18px]" />
          </div>
          <span className="text-[13px] font-semibold tracking-tight">ADBIN</span>
        </div>

        <nav className="hidden h-full flex-1 items-stretch md:flex" aria-label="Main">
          {NAV.map((item) => {
            const active = item.id === tab
            return (
              <button
                key={item.id}
                type="button"
                data-nav={item.id}
                onClick={() => onChange(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center px-3 text-[13px] font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
                <span
                  className={cn(
                    'absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-opacity',
                    active ? 'bg-foreground opacity-100' : 'opacity-0'
                  )}
                />
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                'size-1.5 rounded-full',
                connected ? 'bg-foreground' : 'bg-muted-foreground/40'
              )}
            />
            <span className="hidden max-w-[180px] truncate sm:inline">{deviceLabel}</span>
          </span>
          <span className="hidden text-xs tabular-nums text-muted-foreground lg:block">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            onClick={toggleTheme}
            title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>
    </header>
  )
}
