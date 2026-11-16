import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

import { cn } from '@/lib/utils'

export function SettingsSection({
  id,
  title,
  description,
  children,
  className,
}: {
  id?: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn('scroll-mt-24', className)}>
      <div className="mb-3 px-0.5">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {children}
      </div>
    </section>
  )
}

export function SettingsRow({
  title,
  description,
  htmlFor,
  children,
  className,
}: {
  title: string
  description?: string
  htmlFor?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        className
      )}
    >
      <div className="min-w-0 space-y-0.5">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-[13px] font-medium">
            {title}
          </label>
        ) : (
          <p className="text-[13px] font-medium">{title}</p>
        )}
        {description && (
          <p className="max-w-[46ch] text-[13px] leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="shrink-0 sm:pl-4">{children}</div>}
    </div>
  )
}

export function SettingsBlock({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('px-4 py-4', className)}>{children}</div>
}

export function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-4">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('truncate text-right text-[13px]', mono && 'font-mono text-xs')} title={value}>
        {value}
      </dd>
    </div>
  )
}

export function TokenWarning() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="space-y-0.5 text-[13px]">
        <p className="font-medium">This server has no auth token.</p>
        <p className="text-muted-foreground">
          Anyone on this network can control the device and run shell commands. Restart the server
          with <span className="font-mono text-xs">TOKEN=…</span> and set the same token under
          Client.
        </p>
      </div>
    </div>
  )
}
