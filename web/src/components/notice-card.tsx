import { useState } from 'react'
import { ShieldAlert, X } from 'lucide-react'

const DISMISSED_KEY = 'adbremote.notice-dismissed'

/**
 * Pale-yellow version of the token warning. Shown once per browser until the
 * user dismisses it; the point is that nobody points this at a stranger's TV.
 */
export function NoticeCard() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1'
  )

  if (dismissed) return null

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="mt-5 flex items-start gap-3 rounded-lg border border-notice-border bg-notice px-4 py-3 text-notice-foreground">
      <ShieldAlert className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 space-y-0.5 text-[13px]">
        <p className="font-medium">Lab project — only use this on devices you own.</p>
        <p className="leading-relaxed text-notice-muted">
          It is an experiment, not a product. ADB is remote shell access: keep the server on a
          trusted LAN, set a token, and never point it at hardware you do not have permission to
          control.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notice"
        title="Dismiss"
        className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-md text-notice-muted transition-colors hover:bg-notice-border/40 hover:text-notice-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
