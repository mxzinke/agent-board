import { useRef, useState, useCallback, type ReactNode } from 'react';
import { Archive } from 'lucide-react';

interface SwipeableCardProps {
  children: ReactNode;
  onArchive: () => void;
  className?: string;
  onClick?: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  /** Additional props to spread on the outer div */
  [key: string]: unknown;
}

const SWIPE_THRESHOLD = 80; // px to trigger archive
const VELOCITY_THRESHOLD = 0.5; // px/ms — fast swipe triggers even if short

export function SwipeableCard({
  children,
  onArchive,
  className = '',
  onClick,
  onTouchStart: externalTouchStart,
  ...rest
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const stateRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    currentX: number;
    tracking: boolean;
    decided: boolean; // have we decided swipe vs scroll?
    isHorizontal: boolean;
    cancelTimer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Always forward to external handler (for long-press drag)
    externalTouchStart?.(e);

    if (!isTouchDevice) return;

    const touch = e.touches[0];
    // Cancel swipe tracking if direction not decided within 200ms
    // (prevents conflict with long-press drag which activates at 250ms)
    const cancelTimer = setTimeout(() => {
      const s = stateRef.current;
      if (s && !s.decided) {
        s.tracking = false;
      }
    }, 200);
    stateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      tracking: true,
      decided: false,
      isHorizontal: false,
      cancelTimer,
    };
    setTransitioning(false);
  }, [externalTouchStart, isTouchDevice]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const s = stateRef.current;
    if (!s || !s.tracking) return;

    const touch = e.touches[0];
    const dx = touch.clientX - s.startX;
    const dy = touch.clientY - s.startY;

    // Decide direction on first significant movement
    if (!s.decided) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < 5 && absDy < 5) return; // too small to decide
      s.decided = true;
      s.isHorizontal = absDx > absDy;
      if (s.cancelTimer) { clearTimeout(s.cancelTimer); s.cancelTimer = null; }
    }

    if (!s.isHorizontal) {
      // Vertical scroll — stop tracking
      s.tracking = false;
      setTranslateX(0);
      return;
    }

    // Horizontal swipe — prevent scroll
    e.preventDefault();
    s.currentX = touch.clientX;

    // Only allow swipe left (negative), with resistance for right swipe
    const clampedDx = dx > 0 ? dx * 0.15 : dx;
    setTranslateX(clampedDx);
  }, []);

  const handleTouchEnd = useCallback(() => {
    const s = stateRef.current;
    if (s?.cancelTimer) clearTimeout(s.cancelTimer);
    if (!s || !s.tracking || !s.isHorizontal) {
      stateRef.current = null;
      return;
    }

    const dx = s.currentX - s.startX;
    const elapsed = Date.now() - s.startTime;
    const velocity = Math.abs(dx) / elapsed;

    const shouldArchive = dx < 0 && (Math.abs(dx) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD);

    if (shouldArchive) {
      // Animate off screen then archive
      setTranslateX(-window.innerWidth);
      setTransitioning(true);
      setTimeout(() => {
        onArchive();
        setTranslateX(0);
        setTransitioning(false);
      }, 200);
    } else {
      // Snap back
      setTransitioning(true);
      setTranslateX(0);
      setTimeout(() => setTransitioning(false), 200);
    }

    stateRef.current = null;
  }, [onArchive]);

  const handleTouchCancel = useCallback(() => {
    const s = stateRef.current;
    if (s?.cancelTimer) clearTimeout(s.cancelTimer);
    setTransitioning(true);
    setTranslateX(0);
    setTimeout(() => setTransitioning(false), 200);
    stateRef.current = null;
  }, []);

  // On mobile, show the archive background when swiping
  const showArchiveBg = isTouchDevice && translateX < -10;
  const archiveProgress = Math.min(1, Math.abs(translateX) / SWIPE_THRESHOLD);

  return (
    <div className="relative overflow-hidden" style={{ touchAction: 'pan-y' }}>
      {/* Archive background (revealed on swipe) */}
      {showArchiveBg && (
        <div
          className="absolute inset-0 flex items-center justify-end px-5"
          style={{
            background: archiveProgress >= 1
              ? 'rgb(239 68 68)' // red-500
              : 'rgb(252 165 165)', // red-300
            transition: transitioning ? 'background 200ms' : undefined,
          }}
        >
          <Archive
            className="text-white"
            style={{
              width: 20,
              height: 20,
              opacity: archiveProgress,
              transform: `scale(${0.5 + archiveProgress * 0.5})`,
            }}
          />
        </div>
      )}
      {/* Card content */}
      <div
        className={className}
        onClick={onClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={{
          transform: translateX ? `translateX(${translateX}px)` : undefined,
          transition: transitioning ? 'transform 200ms ease-out' : undefined,
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
}
