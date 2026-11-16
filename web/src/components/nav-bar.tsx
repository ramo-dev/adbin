import { cn } from '@/lib/utils'
import { NAV, type Tab } from './nav'

export function NavBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
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
                'flex flex-1 flex-col items-center gap-1 rounded-md px-1 py-2.5 text-[10px] font-medium transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="size-[18px]" strokeWidth={active ? 2 : 1.75} />
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
