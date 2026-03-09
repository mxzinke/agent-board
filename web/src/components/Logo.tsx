export function Logo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none">
      <rect x="10" y="10" width="28" height="100" fill="currentColor" opacity="0.06" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1"/>
      <rect x="14" y="18" width="20" height="12" fill="currentColor" opacity="0.15"/>
      <rect x="14" y="34" width="20" height="12" fill="currentColor" opacity="0.15"/>
      <rect x="44" y="10" width="28" height="100" fill="currentColor" opacity="0.06" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1"/>
      <rect x="48" y="18" width="20" height="12" fill="currentColor" opacity="0.15"/>
      <rect x="48" y="34" width="20" height="12" fill="currentColor"/>
      <rect x="48" y="50" width="20" height="12" fill="currentColor" opacity="0.15"/>
      <rect x="78" y="10" width="28" height="100" fill="currentColor" opacity="0.06" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1"/>
      <rect x="82" y="18" width="20" height="12" fill="currentColor" opacity="0.15"/>
    </svg>
  );
}
