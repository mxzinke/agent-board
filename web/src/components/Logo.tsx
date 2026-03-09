export function Logo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none">
      {/* Light square (human) — behind, offset top-left */}
      <rect x="12" y="12" width="60" height="60" fill="currentColor" opacity="0.15" />
      {/* Dark square (agent) — front, offset bottom-right */}
      <rect x="48" y="48" width="60" height="60" fill="currentColor" />
    </svg>
  );
}
