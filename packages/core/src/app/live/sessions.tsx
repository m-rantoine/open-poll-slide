import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/lib/use-document-title';
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
  useDocumentTitle('Active sessions');
  return (
    <RequireAuth heading="Sign in to see sessions">
      <Sessions />
    </RequireAuth>
  );
}

function Sessions() {
  const navigate = useNavigate();
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

  if (rows === null) return <LiveMessage title="Loading sessions…" />;

  return (
    <>
      <header className="mb-6">
        <h1 className="font-heading text-[21px] font-semibold tracking-[-0.015em]">
          Active sessions
        </h1>
      </header>
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No sessions are running right now.</p>
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
                  {s.mode === 'host' ? 'host-paced' : 'self-paced'} · {s.code}
                </div>
              </div>
              {isHost && (
                <Link
                  to={`/results/${s.id}`}
                  className="text-[12.5px] text-muted-foreground underline-offset-4 hover:underline"
                >
                  Overview
                </Link>
              )}
              <Button onClick={() => navigate(`/join/${s.code}`)}>Join</Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
