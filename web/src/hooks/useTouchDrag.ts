import { useRef, useCallback } from 'react';

interface DragState {
  goalId: string;
  ghost: HTMLElement | null;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
  startX: number;
  startY: number;
  active: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  origElement: HTMLElement;
  docMoveHandler: ((e: TouchEvent) => void) | null;
  docEndHandler: ((e: TouchEvent) => void) | null;
  docCancelHandler: ((e: TouchEvent) => void) | null;
  scrollRAF: number;
  highlightedEl: HTMLElement | null;
}

interface UseTouchDragOptions {
  onDrop: (goalId: string, targetStatus: string) => void;
  statusAttr?: string;
}

export function useTouchDrag({ onDrop, statusAttr = 'data-status' }: UseTouchDragOptions) {
  const stateRef = useRef<DragState | null>(null);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const cleanup = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    s.ghost?.remove();
    s.origElement.style.opacity = '';
    if (s.timer) clearTimeout(s.timer);
    if (s.docMoveHandler) document.removeEventListener('touchmove', s.docMoveHandler);
    if (s.docEndHandler) document.removeEventListener('touchend', s.docEndHandler);
    if (s.docCancelHandler) document.removeEventListener('touchcancel', s.docCancelHandler);
    cancelAnimationFrame(s.scrollRAF);
    if (s.highlightedEl) {
      s.highlightedEl.style.removeProperty('outline');
      s.highlightedEl.style.removeProperty('outline-offset');
    }
    stateRef.current = null;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent, goalId: string) => {
    cleanup();

    const touch = e.touches[0];
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

    const s: DragState = {
      goalId,
      ghost: null,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
      currentX: touch.clientX,
      currentY: touch.clientY,
      startX: touch.clientX,
      startY: touch.clientY,
      active: false,
      timer: null,
      origElement: el,
      docMoveHandler: null,
      docEndHandler: null,
      docCancelHandler: null,
      scrollRAF: 0,
      highlightedEl: null,
    };

    stateRef.current = s;

    // Track finger movement before activation (passive, allows scrolling)
    const trackMove = (te: TouchEvent) => {
      s.currentX = te.touches[0].clientX;
      s.currentY = te.touches[0].clientY;
    };
    document.addEventListener('touchmove', trackMove, { passive: true });

    // Cancel on early touchend (tap, not long-press)
    const earlyEnd = () => {
      document.removeEventListener('touchmove', trackMove);
      document.removeEventListener('touchend', earlyEnd);
      document.removeEventListener('touchcancel', earlyEnd);
      if (s.timer) clearTimeout(s.timer);
      if (!s.active) stateRef.current = null;
    };
    document.addEventListener('touchend', earlyEnd);
    document.addEventListener('touchcancel', earlyEnd);

    // Long-press activation
    s.timer = setTimeout(() => {
      // Remove pre-activation listeners
      document.removeEventListener('touchmove', trackMove);
      document.removeEventListener('touchend', earlyEnd);
      document.removeEventListener('touchcancel', earlyEnd);

      // If finger moved too far, user was scrolling — cancel
      if (Math.abs(s.currentX - s.startX) > 10 || Math.abs(s.currentY - s.startY) > 10) {
        stateRef.current = null;
        return;
      }

      // Activate drag
      s.active = true;
      if (navigator.vibrate) navigator.vibrate(30);

      // Clear any text selection caused by long-press
      window.getSelection()?.removeAllRanges();

      // Create ghost
      const r = el.getBoundingClientRect();
      const ghost = el.cloneNode(true) as HTMLElement;
      ghost.style.cssText = [
        'position:fixed',
        `left:${r.left}px`,
        `top:${r.top}px`,
        `width:${r.width}px`,
        'z-index:9999',
        'opacity:0.9',
        'pointer-events:none',
        'transform:scale(1.03)',
        'box-shadow:0 8px 25px rgba(0,0,0,0.15)',
      ].join(';');
      document.body.appendChild(ghost);
      s.ghost = ghost;
      el.style.opacity = '0.3';

      // Recalculate offset (element may have scrolled slightly)
      s.offsetX = s.currentX - r.left;
      s.offsetY = s.currentY - r.top;

      // Prevent next click (after drag ends, don't open goal)
      const preventClick = (ce: Event) => {
        ce.preventDefault();
        ce.stopPropagation();
        document.removeEventListener('click', preventClick, true);
      };
      document.addEventListener('click', preventClick, true);

      // Drag move handler (non-passive to prevent scroll)
      const moveHandler = (te: TouchEvent) => {
        te.preventDefault();
        const t = te.touches[0];
        s.currentX = t.clientX;
        s.currentY = t.clientY;

        if (s.ghost) {
          s.ghost.style.left = `${t.clientX - s.offsetX}px`;
          s.ghost.style.top = `${t.clientY - s.offsetY}px`;
        }

        // Highlight drop target
        const below = document.elementFromPoint(t.clientX, t.clientY);
        const target = below?.closest(`[${statusAttr}]`) as HTMLElement | null;
        if (target !== s.highlightedEl) {
          if (s.highlightedEl) {
            s.highlightedEl.style.removeProperty('outline');
            s.highlightedEl.style.removeProperty('outline-offset');
          }
          if (target) {
            target.style.outline = '2px dashed rgba(161,161,170,0.4)';
            target.style.outlineOffset = '-2px';
          }
          s.highlightedEl = target;
        }

        // Auto-scroll near edges
        cancelAnimationFrame(s.scrollRAF);
        const threshold = 50;
        const speed = 6;
        const vh = window.innerHeight;
        let delta = 0;
        if (t.clientY < threshold) delta = -speed;
        else if (t.clientY > vh - threshold) delta = speed;
        if (delta) {
          const scrollStep = () => {
            window.scrollBy(0, delta);
            if (s.active) s.scrollRAF = requestAnimationFrame(scrollStep);
          };
          s.scrollRAF = requestAnimationFrame(scrollStep);
        }
      };

      // Drop handler
      const endHandler = () => {
        if (!s.active) { cleanup(); return; }
        // Hide ghost briefly so elementFromPoint sees through
        if (s.ghost) s.ghost.style.display = 'none';
        const below = document.elementFromPoint(s.currentX, s.currentY);
        const target = below?.closest(`[${statusAttr}]`) as HTMLElement | null;
        const targetStatus = target?.getAttribute(statusAttr);
        if (targetStatus) {
          onDropRef.current(s.goalId, targetStatus);
        }
        cleanup();
      };

      const cancelHandler = () => cleanup();

      s.docMoveHandler = moveHandler;
      s.docEndHandler = endHandler;
      s.docCancelHandler = cancelHandler;
      document.addEventListener('touchmove', moveHandler, { passive: false });
      document.addEventListener('touchend', endHandler);
      document.addEventListener('touchcancel', cancelHandler);
    }, 250);
  }, [cleanup, statusAttr]);

  return { onTouchStart };
}
