/**
 * ADBIN mark: a geometric A whose crossbar is a text cursor — a monogram for
 * the app and a nod to the shell it drives. Inherits the current text color.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M5.5 18.5 12 5.5l6.5 13"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="8.2" y="13.3" width="7.6" height="2.4" rx="1.2" fill="currentColor" />
    </svg>
  )
}
