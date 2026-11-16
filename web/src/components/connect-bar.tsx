import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import { api } from '../api'
import type { Notify } from '../lib/runner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEFAULT_ADDR } from '@/screens/settings/helpers'

export function ConnectBar({ onDone, notify }: { onDone: () => void; notify: Notify }) {
  const [addr, setAddr] = useState(() => localStorage.getItem('adbremote.addr') || DEFAULT_ADDR)
  const [busy, setBusy] = useState(false)

  const connect = async () => {
    const target = addr.trim()
    if (!target) return
    setBusy(true)
    try {
      localStorage.setItem('adbremote.addr', target)
      await api.connect(target)
      onDone()
      notify(`connected to ${target}`)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'connect failed', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
      <span className="mr-1 text-[13px] text-muted-foreground">No device connected</span>
      <Input
        className="h-8 max-w-[220px] flex-1 font-mono text-xs"
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
        placeholder="192.168.1.10:5555"
        onKeyDown={(e) => e.key === 'Enter' && connect()}
      />
      <Button size="sm" onClick={connect} disabled={busy || !addr.trim()}>
        {busy && <Loader2 className="animate-spin" />}
        Connect
      </Button>
    </div>
  )
}
