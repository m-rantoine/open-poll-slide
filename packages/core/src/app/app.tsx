import config from 'virtual:open-slide/config';
import type { ReactNode } from 'react';
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
import { JoinPage } from './live/join';
import { LoginPage } from './live/login';
import { PlayPage } from './live/play';
import { ResultsDetailPage, ResultsListPage } from './live/results';
import { ScreenPage } from './live/screen';
import { SessionsPage } from './live/sessions';
import { AssetsPage } from './routes/assets';
import { Home } from './routes/home';
import { HomeShell } from './routes/home-shell';
import { Presenter } from './routes/presenter';
import { Slide } from './routes/slide';
import { ThemeDetailPage, ThemesGalleryPage } from './routes/themes';

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {/* One app-wide provider so adjacent tooltips group: after the first
          opens, moving along a toolbar shows the rest instantly. */}
      <AuthProvider>
        <TooltipProvider delay={200}>
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
            <Route path="/s/:slideId/screen" element={<ScreenPage />} />
            <Route path="/s/:slideId/play/:sessionId" element={<PlayPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/join/:code" element={<JoinPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
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
