import config from 'virtual:open-slide/config';
import { lazy, type ReactNode, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { isSlidePrivate } from './lib/slides';
import { useLocale } from './lib/use-locale';
import {
  AuthProvider,
  LivePageFrame,
  LoadingLine,
  useAuth,
  useCanSeePrivateSlides,
} from './live/auth';
import { liveConfigured } from './live/client';
import { HomeShell } from './routes/home-shell';

// Each page is its own chunk, so a student opening /join does not download the editor or the
// presenter.
const JoinPage = lazy(() => import('./live/join').then((m) => ({ default: m.JoinPage })));
const LoginPage = lazy(() => import('./live/login').then((m) => ({ default: m.LoginPage })));
const PlayPage = lazy(() => import('./live/play').then((m) => ({ default: m.PlayPage })));
const ScreenPage = lazy(() => import('./live/screen').then((m) => ({ default: m.ScreenPage })));
const SessionsPage = lazy(() =>
  import('./live/sessions').then((m) => ({ default: m.SessionsPage })),
);
const ResultsListPage = lazy(() =>
  import('./live/results').then((m) => ({ default: m.ResultsListPage })),
);
const ResultsDetailPage = lazy(() =>
  import('./live/results').then((m) => ({ default: m.ResultsDetailPage })),
);
const AssetsPage = lazy(() => import('./routes/assets').then((m) => ({ default: m.AssetsPage })));
const Home = lazy(() => import('./routes/home').then((m) => ({ default: m.Home })));
const Presenter = lazy(() => import('./routes/presenter').then((m) => ({ default: m.Presenter })));
const Preview = lazy(() => import('./routes/preview').then((m) => ({ default: m.Preview })));
const Slide = lazy(() => import('./routes/slide').then((m) => ({ default: m.Slide })));
const ThemeDetailPage = lazy(() =>
  import('./routes/themes').then((m) => ({ default: m.ThemeDetailPage })),
);
const ThemesGalleryPage = lazy(() =>
  import('./routes/themes').then((m) => ({ default: m.ThemesGalleryPage })),
);

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {/* One app-wide provider so adjacent tooltips group: after the first
          opens, moving along a toolbar shows the rest instantly. */}
      <AuthProvider>
        <TooltipProvider delay={200}>
          <Suspense fallback={<LoadingLine />}>
            <Routes>
              {config.build.showSlideBrowser && (
                <Route element={<HomeShell />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/themes" element={<ThemesGalleryPage />} />
                  <Route path="/themes/:themeId" element={<ThemeDetailPage />} />
                  <Route path="/assets" element={<AssetsPage />} />
                  <Route path="/sessions" element={<SessionsPage />} />
                  <Route path="/results" element={<ResultsListPage />} />
                  <Route path="/results/:sessionId" element={<ResultsDetailPage />} />
                </Route>
              )}
              {!config.build.showSlideBrowser && (
                <Route element={<LivePageFrame />}>
                  <Route path="/sessions" element={<SessionsPage />} />
                  <Route path="/results" element={<ResultsListPage />} />
                  <Route path="/results/:sessionId" element={<ResultsDetailPage />} />
                </Route>
              )}
              <Route
                path="/s/:slideId"
                element={
                  <PrivateSlideGate>
                    <Slide />
                  </PrivateSlideGate>
                }
              />
              <Route
                path="/s/:slideId/presenter"
                element={
                  <PrivateSlideGate>
                    <Presenter />
                  </PrivateSlideGate>
                }
              />
              {import.meta.env.DEV && <Route path="/s/:slideId/preview" element={<Preview />} />}
              <Route path="/s/:slideId/screen" element={<ScreenPage />} />
              <Route path="/s/:slideId/play/:sessionId" element={<PlayPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/join" element={<JoinPage />} />
              <Route path="/join/:code" element={<JoinPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </TooltipProvider>
      </AuthProvider>
      <Toaster />
    </BrowserRouter>
  );
}

// Private decks only open directly for hosts; everyone else gets the same page as an unknown deck.
// Participants reach a private deck through its session, which is not behind this gate.
function PrivateSlideGate({ children }: { children: ReactNode }) {
  const { slideId = '' } = useParams();
  const { loading } = useAuth();
  const canSeePrivate = useCanSeePrivateSlides();
  if (!isSlidePrivate(slideId) || canSeePrivate) return children;
  if (liveConfigured && loading) return <LoadingLine />;
  return <NotFound />;
}

function NotFound() {
  const t = useLocale();
  return (
    <div className="grid h-screen place-items-center bg-background px-6 text-center text-foreground">
      <div>
        <p className="folio">{t.notFound.eyebrow}</p>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
          {t.notFound.title}
        </h1>
      </div>
    </div>
  );
}
