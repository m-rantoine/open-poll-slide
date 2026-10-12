import { TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format, plural, useLocale } from '../lib/use-locale';
import { questionsMissingKeys } from './derive';
import type { LiveData } from './use-live-session';

/**
 * Tells the host when questions have a correct answer in the slide but the database has no key for
 * them. Without it their answers are never graded and nothing says why.
 */
export function MissingKeysNotice({ data, className }: { data: LiveData; className?: string }) {
  const t = useLocale();
  const [dismissed, setDismissed] = useState(false);
  if (data.loading || !data.session || data.session.status === 'ended' || dismissed) return null;
  const missing = questionsMissingKeys(
    data.session.questions as Record<string, unknown>,
    data.keys,
  );
  if (missing.length === 0) return null;

  return (
    <div
      role="alert"
      data-osd-chrome
      className={cn(
        'flex max-w-xl items-start gap-3 rounded-[8px] border border-amber-500/40 bg-amber-50 px-4 py-3 text-[13px] text-amber-950 shadow-sm',
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{t.live.missingKeysTitle}</div>
        <p className="mt-0.5 leading-snug">
          {format(plural(missing.length, t.live.missingKeysBody), { count: missing.length })}
        </p>
      </div>
      <button
        type="button"
        aria-label={t.common.close}
        onClick={() => setDismissed(true)}
        className="-mr-1 flex size-6 shrink-0 items-center justify-center rounded-[4px] hover:bg-amber-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
