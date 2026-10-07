import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { hasModifier, isBackwardKey, isForwardKey, isTypingTarget } from '@/lib/keys';
import { useDocumentTitle } from '@/lib/use-document-title';
import { pad2 } from '@/lib/utils';
import { SlideCanvas } from '../components/slide-canvas';
import { SlidePageProvider } from '../lib/page-context';
import { useSlideModule } from '../lib/use-slide-module';
import { LiveMessage, LoadingLine, RequireHost } from './auth';
import { LiveProvider, useQuestionRegistry } from './live-context';
import { QuestionPanel, ResultsPanel, StudentsPanel } from './presenter-panels';
import { LiveStage, useHostNavigation } from './stage';
import { useLiveSession } from './use-live-session';

export function LivePresenter({ sessionId }: { sessionId: string }) {
  return (
    <RequireHost>
      <Inner sessionId={sessionId} />
    </RequireHost>
  );
}

function Inner({ sessionId }: { sessionId: string }) {
  const { slideId = '' } = useParams();
  const navigate = useNavigate();
  const { slide, error } = useSlideModule(slideId);
  const data = useLiveSession(sessionId, true);
  const { ids, Provider } = useQuestionRegistry();
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
  if (!slide || data.loading) return <LoadingLine />;
  if (data.error || !data.session)
    return <LiveMessage title="Session unavailable" body={data.error ?? ''} />;

  const session = data.session;
  const questions = {
    ...(slide.questions ?? {}),
    ...(session.questions as typeof slide.questions),
  };
  const panelQuestions = ids.map((id) => questions[id]).filter(Boolean);
  const NextPage = nav.index < total - 1 ? slide.default[nav.index + 1] : null;

  return (
    <div className="dark flex h-dvh w-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-hairline px-6">
        <div className="flex items-center gap-3">
          <span className="eyebrow text-white/45">Live presenter</span>
          <span className="font-heading text-[14px] font-semibold">
            {slide.meta?.title ?? slideId}
          </span>
          <span className="rounded-[3px] border border-border px-1.5 py-0.5 font-mono text-[11px]">
            {session.mode === 'host' ? 'host-paced' : 'self-paced'} · {session.code}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[18px] tabular-nums">
            {pad2(nav.index + 1)} / {pad2(total)}
          </span>
          <Button variant="outline" onClick={() => navigate(`/results/${session.id}`)}>
            Results
          </Button>
          <Button
            variant="outline"
            disabled={session.status === 'ended'}
            onClick={() => void data.actions.endSession()}
          >
            {session.status === 'ended' ? 'Ended' : 'End session'}
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 px-6 pb-4 pt-3 lg:grid-cols-[3fr_2fr]">
        <section className="flex min-h-0 flex-col gap-3">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[8px] bg-black ring-1 ring-border">
            <LiveProvider view="presenter" mirror data={data} deckId={slideId}>
              <LiveStage
                slide={slide}
                index={nav.index}
                step={nav.step}
                active={false}
                controllerRef={nav.controllerRef}
                onAggregate={nav.onAggregate}
                wrap={(children) => <Provider>{children}</Provider>}
              />
            </LiveProvider>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={prev} disabled={nav.index === 0 && nav.step === 0}>
              <ChevronLeft /> Previous
            </Button>
            <Button variant="outline" onClick={next}>
              Next <ChevronRight />
            </Button>
            {NextPage && (
              <div
                className="ml-auto h-16 overflow-hidden rounded-[6px] ring-1 ring-border"
                style={{ aspectRatio: '16/9' }}
              >
                <SlideCanvas flat freezeMotion design={slide.design}>
                  <SlidePageProvider index={nav.index + 1} total={total}>
                    <NextPage />
                  </SlidePageProvider>
                </SlideCanvas>
              </div>
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <LiveProvider view="presenter" data={data} deckId={slideId}>
            {panelQuestions.map((q) => (
              <QuestionPanel key={q.id} question={q} />
            ))}
            {ids.includes('__results__') && <ResultsPanel />}
            <StudentsPanel />
          </LiveProvider>
        </aside>
      </div>
    </div>
  );
}
