import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { NavZone } from '@/lib/use-click-page-navigation';
import { cn } from '@/lib/utils';

/** Marks the edge where a click would change slides: a soft shadow and a chevron. */
export function NavCue({ zone, edgeRatio }: { zone: NavZone; edgeRatio: number }) {
  const side = (which: 'prev' | 'next') => {
    const on = zone === which;
    const Icon = which === 'prev' ? ChevronLeft : ChevronRight;
    return (
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 z-20 flex items-center transition-opacity duration-150',
          which === 'prev' ? 'left-0 justify-start pl-6' : 'right-0 justify-end pr-6',
          on ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          width: `${edgeRatio * 100}%`,
          background: `linear-gradient(to ${which === 'prev' ? 'right' : 'left'}, rgb(0 0 0 / 0.28), transparent)`,
        }}
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-black/55 text-white shadow-[0_6px_24px_rgb(0_0_0/0.45)]">
          <Icon className="size-8" strokeWidth={2.25} />
        </span>
      </div>
    );
  };
  return (
    <>
      {side('prev')}
      {side('next')}
    </>
  );
}
