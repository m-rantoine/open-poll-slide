import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/lib/use-document-title';
import { format, useLocale } from '@/lib/use-locale';
import { Player } from '../components/player';
import { useIsMobile } from '../lib/use-is-mobile';
import { useSlideModule } from '../lib/use-slide-module';
import { LiveMessage, LoadingLine, RequireAuth, useAuth } from './auth';
import { liveErrorMessage } from './errors';
import { LiveProvider, useQuestionRegistry } from './live-context';
import { ParticipantQuestionCard } from './participant-card';
import { clampIndex } from './stage';
import { useLiveSession, useParticipantPresence } from './use-live-session';

export function PlayPage() {
  const t = useLocale();
  return (
    <RequireAuth heading={t.live.signInToJoin}>
      <Play />
    </RequireAuth>
  );
}

function Play() {
  const { slideId = '', sessionId } = useParams();
  const navigate = useNavigate();
  const t = useLocale();
  const { isHost } = useAuth();
  const { slide, error } = useSlideModule(slideId);
  const data = useLiveSession(sessionId, false);
  const session = data.session;
  useDocumentTitle(slide?.meta?.title);
  useParticipantPresence(sessionId, session?.status === 'active');

  const total = slide?.default.length ?? 0;
  const isSelf = session?.mode === 'self';
  const [localIndex, setLocalIndex] = useState(0);
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || data.selfIndex === null) return;
    restored.current = true;
    setLocalIndex(data.selfIndex);
  }, [data.selfIndex]);
  const navRef = useRef<{ next: () => void; prev: () => void } | null>(null);
  const isMobile = useIsMobile();
  const { ids, Provider } = useQuestionRegistry();

  const index = clampIndex(isSelf ? localIndex : (session?.current_index ?? 0), total);
  const { setPosition } = data.actions;

  const onIndexChange = useCallback(
    (next: number) => {
      if (!isSelf) return;
      setLocalIndex(next);
      void setPosition(next, 0).catch(() => {});
    },
    [isSelf, setPosition],
  );

  if (error) return <LiveMessage title={t.live.couldNotLoadDeck} body={error} />;
  if (data.error) {
    return (
      <LiveMessage
        title={t.live.sessionUnavailable}
        body={isHost ? liveErrorMessage(t, data.error) : t.live.useCodeFromHost}
      />
    );
  }
  if (!slide || data.loading || !session) return <LoadingLine />;

  const questions = {
    ...(slide.questions ?? {}),
    ...((session.questions ?? {}) as NonNullable<typeof slide.questions>),
  };

  return (
    <div className="dark flex h-dvh w-screen flex-col bg-background text-foreground">
      <LiveProvider view="participant" compact={isMobile} data={data} deckId={slideId}>
        <div
          className={isMobile ? 'relative shrink-0' : 'relative min-h-0 flex-1'}
          style={isMobile ? { aspectRatio: '16 / 9' } : undefined}
        >
          <Provider>
            <div className="absolute inset-0">
              <Player
                pages={slide.default}
                design={slide.design}
                transition={slide.transition}
                index={index}
                onIndexChange={onIndexChange}
                onExit={() => {}}
                allowExit={false}
                fullscreen={false}
                contained
                navigation={isSelf ? 'free' : 'locked'}
                controlledRevealed={isSelf ? undefined : session.current_step}
                navRef={navRef}
              />
            </div>
          </Provider>
        </div>
        {isMobile && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {ids
              .map((id) => questions[id])
              .filter(Boolean)
              .map((q) => (
                <ParticipantQuestionCard key={q.id} question={q} />
              ))}
          </div>
        )}
      </LiveProvider>
      <footer className="flex h-11 shrink-0 items-center justify-between border-t border-hairline px-4 text-[12.5px]">
        <span className="font-mono text-muted-foreground">
          {session.code} · {index + 1}/{total}
          {session.status === 'ended' && ` · ${t.live.sessionEndedTag}`}
        </span>
        <div className="flex items-center gap-2">
          {data.score && data.score.graded > 0 && (
            <span className="font-mono text-muted-foreground">
              {format(t.live.score, { correct: data.score.correct, graded: data.score.graded })}
            </span>
          )}
          {isSelf && (
            <>
              <Button
                variant="outline"
                size="icon"
                aria-label={t.live.previous}
                onClick={() => navRef.current?.prev()}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={t.live.next}
                onClick={() => navRef.current?.next()}
              >
                <ChevronRight />
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={() => navigate('/join')}>
            {t.live.leave}
          </Button>
        </div>
      </footer>
    </div>
  );
}
