import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useLocale } from '@/lib/use-locale';
import { Player } from '../components/player';
import type { StepAggregate } from '../lib/step-context';
import { useSlideModule } from '../lib/use-slide-module';
import { LiveMessage, LoadingLine, RequireHost } from './auth';
import { getClient } from './client';
import { EndSessionButton } from './end-session';
import { liveErrorMessage } from './errors';
import { LiveProvider } from './live-context';
import { joinUrl } from './lobby';
import { PauseSessionButton } from './pause-session';
import { clampIndex } from './stage';
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
      .in('status', ['active', 'paused'])
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
  const t = useLocale();
  const sessionId = useResolvedSessionId(slideId);
  const { slide, error } = useSlideModule(slideId);
  const data = useLiveSession(sessionId ?? undefined, true);
  useDocumentTitle(slide?.meta?.title);
  const total = slide?.default.length ?? 0;
  const session = data.session;
  const index = clampIndex(session?.current_index ?? 0, total);
  const step = session?.current_step ?? 0;
  const { setPosition } = data.actions;

  // Rapid presses must build on the previous press, not on the last row the server echoed back.
  const positionRef = useRef({ index, step });
  positionRef.current = { index, step };

  const move = useCallback(
    (nextIndex: number, nextStep: number) => {
      positionRef.current = { index: nextIndex, step: nextStep };
      setPosition(nextIndex, nextStep).catch((e: unknown) => toast.error(liveErrorMessage(t, e)));
    },
    [setPosition, t],
  );
  const onIndexChange = useCallback((next: number) => move(next, 0), [move]);
  const onStepAggregateChange = useCallback(
    (a: StepAggregate) => {
      // A step host re-registering briefly reports zero steps; that is not a reveal change.
      if (a.stepCount === 0) return;
      if (a.revealed !== positionRef.current.step) move(positionRef.current.index, a.revealed);
    },
    [move],
  );
  const openPresenter = useCallback(() => {
    if (!sessionId) return;
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    window.open(
      `${base}/s/${encodeURIComponent(slideId)}/presenter?session=${sessionId}`,
      '_blank',
    );
  }, [sessionId, slideId]);

  if (error) return <LiveMessage title={t.live.couldNotLoadDeck} body={error} />;
  if (sessionId === null) {
    return <LiveMessage title={t.live.noActiveHostSession} body={t.live.startFromPresentMenu} />;
  }
  if (sessionId === undefined || !slide || data.loading) return <LoadingLine />;
  if (data.error || !session) {
    return (
      <LiveMessage
        title={t.live.sessionUnavailable}
        body={data.error ? liveErrorMessage(t, data.error) : ''}
      />
    );
  }

  return (
    <div className="group/screen relative h-dvh w-screen overflow-hidden bg-black">
      <LiveProvider view="screen" data={data} deckId={slideId}>
        <Player
          pages={slide.default}
          design={slide.design}
          transition={slide.transition}
          index={index}
          onIndexChange={onIndexChange}
          onExit={() => {}}
          allowExit={false}
          controls
          fullscreen={false}
          navigation={session.status === 'active' ? 'free' : 'locked'}
          controlledRevealed={step}
          onStepAggregateChange={onStepAggregateChange}
          onPresenter={openPresenter}
        />
      </LiveProvider>
      <div className="pointer-events-none absolute inset-x-4 top-4 z-50 flex items-start justify-between gap-2">
        <div className="pointer-events-auto flex gap-2 opacity-0 transition-opacity group-hover/screen:opacity-100 [@media(hover:none)]:opacity-100">
          <PauseSessionButton data={data} />
          <EndSessionButton data={data} onEnded={() => navigate(`/results/${session.id}`)} />
        </div>
        {session.status !== 'ended' && (
          <div className="rounded-[8px] bg-black/70 px-4 py-2 text-right text-white">
            <div className="text-[11px] tracking-[0.1em] uppercase opacity-60">
              {joinUrl().replace(/^https?:\/\//, '')}
            </div>
            <div className="font-mono text-2xl font-bold tracking-[0.25em]">{session.code}</div>
          </div>
        )}
      </div>
      {session.status === 'paused' && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black px-6 text-center text-white">
          <div className="flex max-w-md flex-col items-center gap-4">
            <h2 className="font-heading text-3xl font-semibold">{t.live.pausedTitle}</h2>
            <p className="text-[15px] text-white/70">{t.live.pausedHostBody}</p>
            <PauseSessionButton data={data} />
          </div>
        </div>
      )}
      {session.status === 'ended' && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/80 text-white">
          {t.live.sessionEnded}
        </div>
      )}
    </div>
  );
}
