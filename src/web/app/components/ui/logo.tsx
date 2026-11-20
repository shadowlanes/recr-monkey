/** Monkey-face badge + wordmark. Used by the dashboard header, landing and consent pages. */
export function MonkeyMark({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`w-[38px] h-[38px] rounded-[14px] bg-accent-soft text-accent-deep flex items-center justify-center shrink-0 ${className}`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="7" />
        <circle cx="4.5" cy="10" r="2.5" />
        <circle cx="19.5" cy="10" r="2.5" />
        <circle cx="9.5" cy="12" r="0.6" />
        <circle cx="14.5" cy="12" r="0.6" />
        <path d="M9.5 16c1.4 1.2 3.6 1.2 5 0" />
      </svg>
    </span>
  );
}

export default function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <MonkeyMark />
      <span className="font-display font-extrabold text-xl tracking-tight whitespace-nowrap">
        recr monkey
      </span>
    </span>
  );
}
