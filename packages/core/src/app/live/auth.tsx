import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, useLocale } from '@/lib/use-locale';
import { allowedEmailDomains, getClient, liveConfigured } from './client';

type AuthState = {
  loading: boolean;
  session: Session | null;
  isHost: boolean;
  displayName: string;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(liveConfigured);

  useEffect(() => {
    if (!liveConfigured) return;
    const supabase = getClient();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setIsHost(false);
        setDisplayName('');
        setLoading(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const supabase = getClient();
    Promise.all([
      supabase.rpc('is_host'),
      supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle(),
    ]).then(([host, profile]) => {
      if (cancelled) return;
      setIsHost(host.data === true);
      setDisplayName(profile.data?.display_name ?? '');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signOut = useCallback(async () => {
    await getClient().auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ loading, session, isHost, displayName, signOut }),
    [loading, session, isHost, displayName, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// Themes are a hosts-only area once live sessions are configured; without them, everyone sees them.
export function useCanSeeThemes(): boolean {
  const { loading, isHost } = useAuth();
  return !liveConfigured || (!loading && isHost);
}

// Private decks are for hosts. Without live sessions nobody can be a host, so they stay hidden.
export function useCanSeePrivateSlides(): boolean {
  const { loading, isHost } = useAuth();
  return liveConfigured && !loading && isHost;
}

export function LiveShell({ children }: { children: ReactNode }) {
  return (
    <div className="dark grid min-h-dvh place-items-center bg-background px-6 text-foreground">
      {children}
    </div>
  );
}

export function LivePageFrame() {
  return (
    <div className="dark min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-8 md:px-10 md:py-12">
        <Outlet />
      </div>
    </div>
  );
}

export function LiveMessage({ title, body }: { title: string; body?: string }) {
  return (
    <LiveShell>
      <div className="max-w-md text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
        {body && <p className="mt-2 text-[13px] text-muted-foreground">{body}</p>}
      </div>
    </LiveShell>
  );
}

export function LoadingLine() {
  return (
    <LiveShell>
      <div className="relative h-px w-56 overflow-hidden bg-border">
        <span
          aria-hidden
          className="line-loader-bar absolute inset-y-[-0.5px] left-0 w-1/4 bg-foreground"
        />
      </div>
    </LiveShell>
  );
}

export function AuthForm({ heading }: { heading: string }) {
  const t = useLocale();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = getClient();
    if (mode === 'sign-in') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name.trim() },
          emailRedirectTo: window.location.href,
        },
      });
      if (err) setError(err.message);
      else if (!data.session) setNotice(t.live.checkEmail);
    }
    setBusy(false);
  };

  return (
    <LiveShell>
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{heading}</h1>
        {mode === 'sign-up' && allowedEmailDomains.length > 0 && (
          <p className="text-[13px] text-muted-foreground">
            {format(t.live.signUpDomainHint, { domains: allowedEmailDomains.join(', ') })}
          </p>
        )}
        {mode === 'sign-up' && (
          <Input
            required
            autoComplete="name"
            placeholder={t.live.yourName}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <Input
          required
          type="email"
          autoComplete="email"
          placeholder={allowedEmailDomains[0] ? `you@${allowedEmailDomains[0]}` : t.live.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          required
          type="password"
          minLength={8}
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          placeholder={t.live.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-[12.5px] text-destructive">{error}</p>}
        {notice && <p className="text-[12.5px] text-emerald-400">{notice}</p>}
        <Button type="submit" disabled={busy} className="h-9">
          {mode === 'sign-in' ? t.live.signIn : t.live.createAccount}
        </Button>
        <button
          type="button"
          className="text-[12.5px] text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            setError(null);
            setNotice(null);
          }}
        >
          {mode === 'sign-in' ? t.live.noAccount : t.live.haveAccount}
        </button>
      </form>
    </LiveShell>
  );
}

export function RequireAuth({ children, heading }: { children: ReactNode; heading: string }) {
  const { loading, session } = useAuth();
  const t = useLocale();
  if (!liveConfigured) {
    return <LiveMessage title={t.live.notConfiguredTitle} body={t.live.notConfiguredBody} />;
  }
  if (loading) return <LoadingLine />;
  if (!session) return <AuthForm heading={heading} />;
  return <>{children}</>;
}

export function RequireHost({ children }: { children: ReactNode }) {
  const { isHost } = useAuth();
  const t = useLocale();
  return (
    <RequireAuth heading={t.live.hostSignIn}>
      {isHost ? (
        children
      ) : (
        <LiveMessage title={t.live.hostsOnlyTitle} body={t.live.hostsOnlyBody} />
      )}
    </RequireAuth>
  );
}
