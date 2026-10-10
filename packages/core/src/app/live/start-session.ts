import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { SlideModule } from '../lib/sdk';
import { useLocale } from '../lib/use-locale';
import { useAuth } from './auth';
import { getClient, liveConfigured } from './client';
import { liveErrorMessage } from './errors';

export function useStartSession(slideId: string, slide: SlideModule | null) {
  const { isHost, session, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useLocale();

  const start = useCallback(
    async (mode: 'self' | 'host') => {
      if (!slide) return;
      const { data, error } = await getClient().rpc('create_session', {
        p_deck_id: slideId,
        p_deck_title: slide.meta?.title ?? slideId,
        p_mode: mode,
        p_page_count: slide.default.length,
        p_questions: slide.questions ?? {},
      });
      if (error || !data) {
        toast.error(error ? liveErrorMessage(t, error) : t.live.couldNotStart);
        return;
      }
      if (mode === 'host') {
        navigate(`/s/${encodeURIComponent(slideId)}/screen?session=${data.id}`);
      } else {
        navigate(`/results/${data.id}`);
      }
    },
    [slideId, slide, navigate, t],
  );

  return {
    available: liveConfigured && !loading,
    signedIn: Boolean(session),
    canStart: liveConfigured && isHost && Boolean(slide),
    start,
    goSignIn: () => navigate(`/login?next=${encodeURIComponent(pathname)}`),
  };
}
