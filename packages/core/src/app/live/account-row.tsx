import { LogIn, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { useAuth } from './auth';
import { liveConfigured } from './client';

export function useAccountAction() {
  const { loading, session, displayName, signOut } = useAuth();
  const navigate = useNavigate();
  const t = useLocale();
  if (!liveConfigured || loading) return null;
  if (!session) {
    return { Icon: LogIn, label: t.live.signIn, detail: null, run: () => navigate('/login') };
  }
  return {
    Icon: LogOut,
    label: t.live.signOut,
    detail: displayName || session.user.email || null,
    run: () => void signOut(),
  };
}

export function AccountRow() {
  const action = useAccountAction();
  if (!action) return null;
  const { Icon, label, detail, run } = action;
  return (
    <button
      type="button"
      onClick={run}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-[5px] px-2 py-[5px] text-left text-[12.5px] outline-none',
        'text-foreground/70 transition-[background-color,color] duration-150 hover:bg-muted/60 hover:text-foreground',
        'focus-visible:ring-1 focus-visible:ring-brand',
      )}
    >
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {detail && (
        <span className="max-w-[45%] truncate text-[11px] text-muted-foreground">{detail}</span>
      )}
    </button>
  );
}
