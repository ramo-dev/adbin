import { Cable, Loader2, Power, Unplug } from 'lucide-react'

import type { Info, Status } from '../../api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Row, SettingsBlock, SettingsSection } from './parts'

export function DeviceCard({
  status,
  info,
  busy,
  onConnect,
  onDisconnect,
  onReboot,
}: {
  status: Status | null
  info: Info | null
  busy: string
  onConnect: () => void
  onDisconnect: () => void
  onReboot: () => void
}) {
  const connected = Boolean(status?.ok)

  return (
    <SettingsSection id="device" title="Device" description="Status and hardware of the connected TV.">
      <SettingsBlock className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">
            {connected ? status?.model || status?.target : 'No device connected'}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {status?.target || 'connect over ADB to begin'}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 gap-1.5 px-2 py-1 text-[11px] font-normal">
          <span
            className={connected ? 'size-1.5 rounded-full bg-foreground' : 'size-1.5 rounded-full bg-muted-foreground/40'}
          />
          {connected ? 'online' : 'offline'}
        </Badge>
      </SettingsBlock>

      <SettingsBlock>
        <dl className="grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
          <Row label="Serial" value={info?.serial || status?.target || '—'} mono />
          <Row label="Android" value={info ? `${info.android} (SDK ${info.sdk})` : '—'} />
          <Row label="Model" value={info?.model || status?.model || '—'} />
          <Row label="ABI" value={info?.abi || '—'} mono />
          <Row
            label="Display"
            value={info ? `${info.width}×${info.height} · ${info.density} dpi` : '—'}
          />
          <Row
            label="Battery"
            value={
              info
                ? `${info.batteryLevel || '—'}%${info.batteryStatus ? ` · ${info.batteryStatus}` : ''}`
                : '—'
            }
          />
          <Row
            label="Storage"
            value={info?.storageFree ? `${info.storageFree} free / ${info.storageTotal}` : '—'}
          />
          <Row
            label="Uptime"
            value={info?.uptime ? info.uptime.split(',')[0] : '—'}
            mono
          />
        </dl>
      </SettingsBlock>

      <SettingsBlock className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onConnect} disabled={Boolean(busy)}>
          {busy === 'connect' ? <Loader2 className="animate-spin" /> : <Cable />}
          Reconnect
        </Button>
        <Button variant="outline" size="sm" onClick={onReboot} disabled={!connected || Boolean(busy)}>
          {busy === 'reboot' ? <Loader2 className="animate-spin" /> : <Power />}
          Reboot
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDisconnect}
          disabled={!connected || Boolean(busy)}
        >
          {busy === 'disconnect' ? <Loader2 className="animate-spin" /> : <Unplug />}
          Disconnect
        </Button>
      </SettingsBlock>
    </SettingsSection>
  )
}
