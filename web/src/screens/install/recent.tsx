import { CheckCircle2, XCircle } from 'lucide-react'

import { timeAgo } from '../../lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Recent } from './types'

export function RecentCard({ recent }: { recent: Recent[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Recent</CardTitle>
        <CardDescription className="text-xs">Kept in this browser only.</CardDescription>
      </CardHeader>
      <CardContent>
        {!recent.length && <p className="text-sm text-muted-foreground">No installs yet.</p>}
        <ul className="space-y-2">
          {recent.map((r, i) => (
            <li key={`${r.package}-${r.at}-${i}`} className="flex items-center gap-3">
              {r.ok ? (
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
              ) : (
                <XCircle className="size-4 shrink-0 text-destructive" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.label || r.package || r.name}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{r.package || r.name}</p>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(r.at)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
