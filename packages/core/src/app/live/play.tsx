import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/lib/use-document-title';
import { format, useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { Player } from '../components/player';
import { designToCssVars } from '../lib/design';
import { useSlideModule } from '../lib/use-slide-module';
import { LiveMessage, LoadingLine, RequireAuth, useAuth } from './auth';
import { liveErrorMessage } from './errors';
import { LiveProvider, useQuestionRegistry } from './live-context';
import { ParticipantQuestionCard } from './participant-card';
import { clampIndex } from './stage';
import { useLiveSession, useParticipantPresence } from './use-live-session';
import { usePortrait } from './use-portrait';

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
  const portrait = usePortrait();
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

  const cards = portrait
    ? ids
        .map((id) => questions[id])
        .filter(Boolean)
        .map((q) => <ParticipantQuestionCard key={q.id} question={q} />)
    : [];
  const surface: CSSProperties | undefined = slide.design
    ? { ...designToCssVars(slide.design), background: slide.design.palette.bg }
    : undefined;

  return (
    <div className="dark flex h-dvh w-screen flex-col bg-background text-foreground">
      <LiveProvider view="participant" compact={portrait} data={data} deckId={slideId}>
        <div className="relative flex min-h-0 flex-1 flex-col" style={surface}>
          {session.status === 'paused' && (
            <div
              role="status"
              className="absolute inset-0 z-40 grid place-items-center px-8 text-center"
              style={{ background: 'var(--osd-bg, #fff)' }}
            >
              <div
                className="flex max-w-sm flex-col gap-3"
                style={{ color: 'var(--osd-text, #0f172a)' }}
              >
                <h2 className="font-heading text-2xl font-semibold">{t.live.pausedTitle}</h2>
                <p className="text-[15px] opacity-70">{t.live.pausedParticipantBody}</p>
              </div>
            </div>
          )}
          <div
            className={cn('relative w-full', portrait ? 'shrink-0' : 'min-h-0 flex-1')}
            style={portrait ? { aspectRatio: '16 / 9', marginTop: '12dvh' } : undefined}
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
          {portrait && (
            <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">{cards}</div>
          )}
        </div>
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
