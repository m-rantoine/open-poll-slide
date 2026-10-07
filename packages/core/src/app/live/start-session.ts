import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { SlideModule } from '../lib/sdk';
import { useAuth } from './auth';
import { getClient, liveConfigured } from './client';

export function useStartSession(slideId: string, slide: SlideModule | null) {
  const { isHost, session } = useAuth();
  const navigate = useNavigate();

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
        toast.error(error?.message ?? 'Could not start the session');
        return;
      }
      if (mode === 'host') {
        navigate(`/s/${encodeURIComponent(slideId)}/screen?session=${data.id}`);
      } else {
        navigate(`/results/${data.id}`);
      }
    },
    [slideId, slide, navigate],
  );

  return {
    available: liveConfigured,
    signedIn: Boolean(session),
    canStart: liveConfigured && isHost && Boolean(slide),
    start,
    goSignIn: () => navigate('/sessions'),
  };
}
