import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { isBackwardKey, isForwardKey, isTypingTarget } from '@/lib/keys';
import { useDocumentTitle } from '@/lib/use-document-title';
import type { StepController } from '../lib/step-context';
import { useIsMobile } from '../lib/use-is-mobile';
import { useSlideModule } from '../lib/use-slide-module';
import { LiveMessage, LoadingLine, RequireAuth, useAuth } from './auth';
import { LiveProvider, useQuestionRegistry } from './live-context';
import { ParticipantQuestionCard } from './participant-card';
import { clampIndex, LiveStage } from './stage';
import { useLiveSession, useParticipantPresence } from './use-live-session';

export function PlayPage() {
  return (
    <RequireAuth heading="Sign in to join">
      <Play />
    </RequireAuth>
  );
}

function Play() {
  const { slideId = '', sessionId } = useParams();
  const navigate = useNavigate();
  const { isHost } = useAuth();
  const { slide, error } = useSlideModule(slideId);
  const data = useLiveSession(sessionId, false);
  const session = data.session;
  useDocumentTitle(slide?.meta?.title);
  useParticipantPresence(sessionId, session?.status === 'active');

  const total = slide?.default.length ?? 0;
  const isSelf = session?.mode === 'self';
  const [localIndex, setLocalIndex] = useState(0);
  const controllerRef = useRef<StepController | null>(null);
  const isMobile = useIsMobile();
  const { ids, Provider } = useQuestionRegistry();

  const index = clampIndex(isSelf ? localIndex : (session?.current_index ?? 0), total);
  const { setPosition } = data.actions;

  const go = useCallback(
    (next: number) => {
      const i = clampIndex(next, total);
      setLocalIndex(i);
      void setPosition(i, 0).catch(() => {});
    },
    [total, setPosition],
  );
  const goNext = useCallback(() => {
    if (controllerRef.current?.advance()) return;
    go(index + 1);
  }, [go, index]);
  const goPrev = useCallback(() => {
    if (controllerRef.current?.retreat()) return;
    go(index - 1);
  }, [go, index]);

  useEffect(() => {
    if (!isSelf) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.defaultPrevented) return;
      if (isForwardKey(e)) {
        e.preventDefault();
        goNext();
      } else if (isBackwardKey(e)) {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSelf, goNext, goPrev]);

  if (error) return <LiveMessage title="Could not load this deck" body={error} />;
  if (data.error) {
    return (
      <LiveMessage
        title="Session unavailable"
        body={isHost ? data.error : 'Use the code from your host to join.'}
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
          className={isMobile ? 'shrink-0' : 'min-h-0 flex-1'}
          style={isMobile ? { aspectRatio: '16 / 9' } : undefined}
        >
          <LiveStage
            slide={slide}
            index={index}
            step={isSelf ? undefined : session.current_step}
            controllerRef={controllerRef}
            wrap={(children) => <Provider>{children}</Provider>}
          />
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
          {session.status === 'ended' && ' · session ended'}
        </span>
        <div className="flex items-center gap-2">
          {data.score && data.score.graded > 0 && (
            <span className="font-mono text-muted-foreground">
              Score {data.score.correct}/{data.score.graded}
            </span>
          )}
          {isSelf && (
            <>
              <Button variant="outline" size="icon" aria-label="Previous" onClick={goPrev}>
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="icon" aria-label="Next" onClick={goNext}>
                <ChevronRight />
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={() => navigate('/join')}>
            Leave
          </Button>
        </div>
      </footer>
    </div>
  );
}
