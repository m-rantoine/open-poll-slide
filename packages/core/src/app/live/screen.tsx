import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { hasModifier, isBackwardKey, isForwardKey, isTypingTarget } from '@/lib/keys';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useSlideModule } from '../lib/use-slide-module';
import { LiveMessage, LoadingLine, RequireHost } from './auth';
import { getClient } from './client';
import { LiveProvider } from './live-context';
import { joinUrl } from './lobby';
import { LiveStage, useHostNavigation } from './stage';
import { useLiveSession } from './use-live-session';

export function useResolvedSessionId(slideId: string): string | null | undefined {
  const [params] = useSearchParams();
  const fromQuery = params.get('session');
  const [resolved, setResolved] = useState<string | null | undefined>(fromQuery ?? undefined);

  useEffect(() => {
    if (fromQuery) {
      setResolved(fromQuery);
      return;
    }
    let cancelled = false;
    getClient()
      .from('sessions')
      .select('id')
      .eq('deck_id', slideId)
      .eq('status', 'active')
      .eq('mode', 'host')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (!cancelled) setResolved(data?.[0]?.id ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [fromQuery, slideId]);

  return resolved;
}

export function ScreenPage() {
  return (
    <RequireHost>
      <Screen />
    </RequireHost>
  );
}

function Screen() {
  const { slideId = '' } = useParams();
  const navigate = useNavigate();
  const sessionId = useResolvedSessionId(slideId);
  const { slide, error } = useSlideModule(slideId);
  const data = useLiveSession(sessionId ?? undefined, true);
  useDocumentTitle(slide?.meta?.title);
  const total = slide?.default.length ?? 0;
  const nav = useHostNavigation(data, total);
  const { next, prev } = nav;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTypingTarget(e.target) || hasModifier(e)) return;
      if (isForwardKey(e)) {
        e.preventDefault();
        next();
      } else if (isBackwardKey(e)) {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  if (error) return <LiveMessage title="Could not load this deck" body={error} />;
  if (sessionId === null) {
    return (
      <LiveMessage
        title="No active host-paced session"
        body="Start a session from the slide's Present menu first."
      />
    );
  }
  if (sessionId === undefined || !slide || data.loading) return <LoadingLine />;
  if (data.error || !data.session)
    return <LiveMessage title="Session unavailable" body={data.error ?? ''} />;

  const session = data.session;
  return (
    <div className="group/screen relative h-dvh w-screen overflow-hidden bg-black">
      <LiveProvider view="screen" data={data} deckId={slideId}>
        <LiveStage
          slide={slide}
          index={nav.index}
          step={nav.step}
          controllerRef={nav.controllerRef}
          onAggregate={nav.onAggregate}
        />
      </LiveProvider>
      {session.status === 'active' && (
        <div className="pointer-events-none absolute top-4 right-4 rounded-[8px] bg-black/70 px-4 py-2 text-right text-white">
          <div className="text-[11px] tracking-[0.1em] uppercase opacity-60">
            {joinUrl().replace(/^https?:\/\//, '')}
          </div>
          <div className="font-mono text-2xl font-bold tracking-[0.25em]">{session.code}</div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 flex gap-2 opacity-0 transition-opacity group-hover/screen:opacity-100">
        <Button
          variant="outline"
          onClick={() =>
            window.open(
              `${import.meta.env.BASE_URL.replace(/\/$/, '')}/s/${encodeURIComponent(slideId)}/presenter?session=${session.id}`,
              'open-slide-presenter',
              'popup,width=1280,height=800',
            )
          }
        >
          Open presenter view
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            await data.actions.endSession();
            navigate(`/results/${session.id}`);
          }}
        >
          End session
        </Button>
      </div>
      {session.status === 'ended' && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 text-white">
          Session ended
        </div>
      )}
    </div>
  );
}
