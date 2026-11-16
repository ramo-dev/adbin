import { RefreshCw } from 'lucide-react'

import type { Info, Status } from '../../api'
import type { Notify } from '../../lib/runner'
import { ScreenHeader } from '@/components/screen-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ClientCard } from './client-card'
import { ConnectionCard } from './connection-card'
import { DeviceCard } from './device-card'
import { NAV_GROUPS } from './nav'
import { TokenWarning } from './parts'
import { PreferencesCard } from './preferences-card'
import { RebootDialog } from './reboot-dialog'
import { ServerCard } from './server-card'
import { useSettings } from './use-settings'

export function SettingsScreen({
  status,
  info,
  refresh,
  notify,
}: {
  status: Status | null
  info: Info | null
  refresh: () => void
  notify: Notify
}) {
  const s = useSettings({ status, info, refresh, notify })
  const busy = Boolean(s.busy)

  return (
    <div className="lg:grid lg:grid-cols-[168px_minmax(0,1fr)] lg:gap-12">
      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => s.jump(item.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                      s.active === item.id
                        ? 'bg-accent font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                    )}
                  >
                    <item.icon className="size-4 opacity-70" strokeWidth={1.75} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="min-w-0 space-y-8">
        <ScreenHeader
          title="Settings"
          description="Connection, appearance, server diagnostics and the sharp edges."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refresh()
                s.loadConfig()
              }}
            >
              <RefreshCw />
              Refresh
            </Button>
          }
        />

        {s.config && !s.config.tokenRequired && <TokenWarning />}

        <DeviceCard
          status={status}
          info={info}
          busy={s.busy}
          onConnect={() => void s.connect(status?.target || s.addr)}
          onDisconnect={() => void s.disconnect()}
          onReboot={() => s.setConfirmReboot(true)}
        />
        <ConnectionCard
          addr={s.addr}
          onAddr={s.setAddr}
          recent={s.recent}
          busy={s.busy}
          services={s.services}
          discovering={s.discovering}
          onConnect={(target) => void s.connect(target)}
          onDiscover={() => void s.discover()}
        />
        <PreferencesCard />
        <ClientCard
          config={s.config}
          base={s.base}
          onBase={s.setBase}
          token={s.token}
          onToken={s.setToken}
          showToken={s.showToken}
          onToggleToken={() => s.setShowToken((v) => !v)}
          onSave={s.saveClient}
        />
        <ServerCard
          config={s.config}
          addr={s.addr}
          busy={s.busy}
          connected={s.connected}
          onCopyDiagnostics={() => void s.copyDiagnostics()}
          onRestartAdb={() => void s.restartAdb()}
          onClearCache={() => void s.clearCache()}
          onReboot={() => s.setConfirmReboot(true)}
        />
      </div>

      <RebootDialog
        open={s.confirmReboot}
        onOpenChange={s.setConfirmReboot}
        mode={s.rebootMode}
        onMode={s.setRebootMode}
        onConfirm={() => void s.reboot()}
      />
    </div>
  )
}
