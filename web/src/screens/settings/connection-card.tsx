import { Cable, Loader2, Radar } from 'lucide-react'

import type { MdnsService } from '../../api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SettingsBlock, SettingsRow, SettingsSection } from './parts'

export function ConnectionCard({
  addr,
  onAddr,
  recent,
  busy,
  services,
  discovering,
  onConnect,
  onDiscover,
}: {
  addr: string
  onAddr: (addr: string) => void
  recent: string[]
  busy: string
  services: MdnsService[] | null
  discovering: boolean
  onConnect: (target?: string) => void
  onDiscover: () => void
}) {
  return (
    <SettingsSection
      id="connection"
      title="Connection"
      description="ADB over TCP. The TV forgets wireless debugging on reboot."
    >
      <SettingsRow title="Device address" htmlFor="addr" description="host:port of the ADB transport.">
        <div className="flex gap-2">
          <Input
            id="addr"
            className="h-8 w-[190px] font-mono text-xs"
            value={addr}
            onChange={(e) => onAddr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onConnect()}
            placeholder="192.168.1.10:5555"
          />
          <Button size="sm" onClick={() => onConnect()} disabled={Boolean(busy)}>
            {busy === 'connect' ? <Loader2 className="animate-spin" /> : <Cable />}
            Connect
          </Button>
        </div>
      </SettingsRow>

      {recent.length > 0 && (
        <SettingsBlock className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted-foreground">Recent</span>
          {recent.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onConnect(a)}
              className="rounded-md border border-border px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {a}
            </button>
          ))}
        </SettingsBlock>
      )}

      <SettingsRow
        title="Discovered over mDNS"
        description="Scan for devices advertising the ADB service."
      >
        <Button variant="outline" size="sm" onClick={onDiscover} disabled={discovering}>
          {discovering ? <Loader2 className="animate-spin" /> : <Radar />}
          Scan
        </Button>
      </SettingsRow>

      {services !== null && (
        <SettingsBlock>
          {services.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing found. Use the address above.</p>
          ) : (
            <ul className="space-y-1.5">
              {services.map((s) => (
                <li
                  key={`${s.name}-${s.addr}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{s.name}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      {s.addr} · {s.service}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0"
                    onClick={() => onConnect(s.addr)}
                  >
                    Use
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </SettingsBlock>
      )}
    </SettingsSection>
  )
}
