import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useLocale } from '@/lib/use-locale';
import { LiveMessage, RequireAuth, useAuth } from './auth';
import { getClient } from './client';
import { SlideThumb } from './slide-thumb';

type ActiveSession = {
  id: string;
  code: string;
  deck_id: string;
  deck_title: string | null;
  mode: 'self' | 'host';
  created_at: string;
};

export function SessionsPage() {
  const t = useLocale();
  useDocumentTitle(t.live.activeSessions);
  return (
    <RequireAuth heading={t.live.signInToSeeSessions}>
      <Sessions />
    </RequireAuth>
  );
}

function Sessions() {
  const navigate = useNavigate();
  const t = useLocale();
  const { isHost } = useAuth();
  const [rows, setRows] = useState<ActiveSession[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await getClient().rpc('list_active_sessions');
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(load, 10_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (rows === null) return <LiveMessage title={t.live.loadingSessions} />;

  return (
    <>
      <header className="mb-6">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.015em]">
          {t.live.activeSessions}
        </h1>
      </header>
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{t.live.noSessionsRunning}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-4 rounded-[8px] border border-hairline bg-card/40 p-3"
            >
              <SlideThumb slideId={s.deck_id} width={96} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium">
                  {s.deck_title ?? s.deck_id}
                </div>
                <div className="font-mono text-[11.5px] text-muted-foreground">
                  {s.mode === 'host' ? t.live.hostPaced : t.live.selfPaced} · {s.code}
                </div>
              </div>
              {isHost && (
                <Link
                  to={`/results/${s.id}`}
                  className="text-[12.5px] text-muted-foreground underline-offset-4 hover:underline"
                >
                  {t.live.overview}
                </Link>
              )}
              <Button onClick={() => navigate(`/join/${s.code}`)}>{t.live.join}</Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
