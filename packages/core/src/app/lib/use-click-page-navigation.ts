import { type RefObject, useEffect } from 'react';

// Clicks that land on (or inside) these never navigate — interactive slide
// content keeps its click, and present chrome is excluded via data-osd-chrome.
// Authors can opt any element out with a data-osd-interactive attribute.
const NAV_PASSTHROUGH =
  'a, button, input, textarea, select, label, summary, iframe, video, audio, embed, object, [role="button"], [role="link"], [contenteditable="true"], [data-osd-interactive], [data-osd-chrome]';

type UseClickPageNavigationOptions<T extends HTMLElement> = {
  ref: RefObject<T | null>;
  enabled?: boolean;
  /** Fraction of the width on each side that navigates; the center is inert. */
  edgeRatio?: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onViewportClick?: (point: { x: number; y: number }) => void;
  /** Which edge a click at the pointer would navigate toward, or null. Mouse pointers only. */
  onZoneChange?: (zone: NavZone) => void;
};

export type NavZone = 'prev' | 'next' | null;

export function useClickPageNavigation<T extends HTMLElement>({
  ref,
  enabled = true,
  edgeRatio = 0.3,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onViewportClick,
  onZoneChange,
}: UseClickPageNavigationOptions<T>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof Element && target.closest(NAV_PASSTHROUGH)) return;
      if (window.getSelection()?.toString()) return;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      const x = (event.clientX - rect.left) / rect.width;
      const y = rect.height === 0 ? 0 : (event.clientY - rect.top) / rect.height;
      onViewportClick?.({ x, y });
      if (x < edgeRatio) {
        if (canPrev) onPrev();
      } else if (x > 1 - edgeRatio) {
        if (canNext) onNext();
      }
    };

    el.addEventListener('click', onClick);

    // The cue uses the same rules as the click, so it never promises a slide change that will not
    // happen.
    let zone: NavZone = null;
    const setZone = (next: NavZone) => {
      if (next === zone) return;
      zone = next;
      onZoneChange?.(next);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return setZone(null);
      const target = event.target;
      if (target instanceof Element && target.closest(NAV_PASSTHROUGH)) return setZone(null);
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return setZone(null);
      const x = (event.clientX - rect.left) / rect.width;
      if (x < edgeRatio) setZone(canPrev ? 'prev' : null);
      else if (x > 1 - edgeRatio) setZone(canNext ? 'next' : null);
      else setZone(null);
    };
    const onLeave = () => setZone(null);
    if (onZoneChange) {
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
    }
    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      if (zone !== null) onZoneChange?.(null);
    };
  }, [ref, enabled, edgeRatio, canPrev, canNext, onPrev, onNext, onViewportClick, onZoneChange]);
}
