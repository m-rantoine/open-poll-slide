import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDocumentTitle } from '@/lib/use-document-title';
import { format, useLocale } from '@/lib/use-locale';
import { LiveMessage, LiveShell, RequireAuth, useAuth } from './auth';
import { getClient } from './client';
import { liveErrorMessage } from './errors';

type MySession = {
  id: string;
  code: string;
  deck_id: string;
  deck_title: string | null;
  status: 'active' | 'paused' | 'ended';
};

export function JoinPage() {
  const t = useLocale();
  useDocumentTitle(t.live.joinSession);
  return (
    <RequireAuth heading={t.live.joinYourClass}>
      <JoinForm />
    </RequireAuth>
  );
}

function JoinForm() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const t = useLocale();
  const { displayName, signOut } = useAuth();
  const [code, setCode] = useState(codeParam ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<MySession[]>([]);
  const autoRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void getClient()
      .rpc('list_my_sessions')
      .then(({ data }) => {
        if (!cancelled) setMine(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const join = async (value: string) => {
    setBusy(true);
    setError(null);
    const { data, error: err } = await getClient().rpc('join_session', { p_code: value });
    setBusy(false);
    if (err || !data) {
      setError(liveErrorMessage(t, err ?? 'session_not_found'));
      return;
    }
    navigate(`/s/${encodeURIComponent(data.deck_id)}/play/${data.id}`, { replace: true });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-join once from the URL
  useEffect(() => {
    if (codeParam && !autoRef.current) {
      autoRef.current = true;
      void join(codeParam);
    }
  }, [codeParam]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void join(code);
  };

  if (codeParam && busy && !error) return <LiveMessage title={t.live.joining} />;

  return (
    <LiveShell>
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3 text-center">
        <p className="text-[13px] text-muted-foreground">
          {format(t.live.signedInAs, { name: displayName })}
        </p>
        {mine.length > 0 && (
          <div className="flex flex-col gap-2 text-left">
            <h2 className="eyebrow">{t.live.yourSessions}</h2>
            {mine.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                disabled={busy}
                className="h-auto justify-between gap-3 py-2"
                onClick={() => void join(s.code)}
              >
                <span className="min-w-0 truncate text-left">
                  {s.deck_title ?? s.deck_id}
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {s.code}
                    {s.status === 'paused' && ` · ${t.live.statusPaused}`}
                  </span>
                </span>
                <span className="shrink-0">{t.live.rejoin}</span>
              </Button>
            ))}
          </div>
        )}
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t.live.enterCode}</h1>
        <Input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="ABC123"
          className="h-14 text-center font-mono text-3xl tracking-[0.3em] uppercase"
        />
        {error && <p className="text-[12.5px] text-destructive">{error}</p>}
        <Button type="submit" disabled={busy || code.length < 4} className="h-9">
          {t.live.join}
        </Button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-[12.5px] text-muted-foreground underline-offset-4 hover:underline"
        >
          {t.live.signOut}
        </button>
      </form>
    </LiveShell>
  );
}
