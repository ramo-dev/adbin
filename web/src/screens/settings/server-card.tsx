import { ClipboardCopy, Loader2, Power, RotateCcw, Trash2 } from 'lucide-react'

import type { ServerConfig } from '../../api'
import { formatUptime } from '../../lib/format'
import { Button } from '@/components/ui/button'
import { Row, SettingsBlock, SettingsSection } from './parts'

export function ServerCard({
  config,
  addr,
  busy,
  connected,
  onCopyDiagnostics,
  onRestartAdb,
  onClearCache,
  onReboot,
}: {
  config: ServerConfig | null
  addr: string
  busy: string
  connected: boolean
  onCopyDiagnostics: () => void
  onRestartAdb: () => void
  onClearCache: () => void
  onReboot: () => void
}) {
  return (
    <SettingsSection
      id="server"
      title="Server"
      description="Runtime, tools and maintenance for the Go backend."
    >
      <SettingsBlock>
        <dl className="grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
          <Row label="Version" value={config?.version || '—'} mono />
          <Row label="Uptime" value={formatUptime(config?.uptimeSeconds || 0)} />
          <Row label="adb" value={config?.adbVersion || config?.adbPath || '—'} mono />
          <Row label="aapt2" value={config?.aapt2 || 'not found'} mono />
          <Row
            label="Runtime"
            value={config ? `${config.goVersion} · ${config.os}/${config.arch}` : '—'}
            mono
          />
          <Row label="Cached icons" value={config ? String(config.iconCount) : '—'} />
          <Row label="Icon cache" value={config?.cacheDir || '—'} mono />
          <Row label="Upload staging" value={config?.uploadDir || '—'} mono />
        </dl>
      </SettingsBlock>

      <SettingsBlock className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onCopyDiagnostics}>
            <ClipboardCopy />
            Copy diagnostics
          </Button>
          <Button variant="outline" size="sm" onClick={onRestartAdb} disabled={Boolean(busy)}>
            {busy === 'adb' ? <Loader2 className="animate-spin" /> : <RotateCcw />}
            Restart adb
          </Button>
          <Button variant="outline" size="sm" onClick={onClearCache} disabled={Boolean(busy)}>
            {busy === 'cache' ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Clear icon cache
          </Button>
          <Button variant="destructive" size="sm" onClick={onReboot} disabled={!connected || Boolean(busy)}>
            <Power />
            Reboot device
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Restarting adb drops every transport. The server reconnects to{' '}
          <span className="font-mono">{config?.device || addr}</span> automatically when possible.
        </p>
      </SettingsBlock>
    </SettingsSection>
  )
}
