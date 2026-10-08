import { Pause, Play } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/use-locale';
import { liveErrorMessage } from './errors';
import type { LiveData } from './use-live-session';

export function PauseSessionButton({ data }: { data: LiveData }) {
  const t = useLocale();
  const [busy, setBusy] = useState(false);
  const status = data.session?.status;
  if (status !== 'active' && status !== 'paused') return null;
  const paused = status === 'paused';

  const toggle = async () => {
    setBusy(true);
    try {
      await (paused ? data.actions.resumeSession() : data.actions.pauseSession());
    } catch (e) {
      toast.error(liveErrorMessage(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" disabled={busy} onClick={() => void toggle()}>
      {paused ? <Play /> : <Pause />}
      {paused ? t.live.resume : t.live.pause}
    </Button>
  );
}
