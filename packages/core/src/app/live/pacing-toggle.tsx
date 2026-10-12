import { Presentation, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/use-locale';
import { liveErrorMessage } from './errors';
import type { LiveData } from './use-live-session';

/** Lets the host switch a running session between host-paced and self-paced. */
export function PacingToggle({ data }: { data: LiveData }) {
  const t = useLocale();
  const [busy, setBusy] = useState(false);
  const session = data.session;
  if (!session || (session.status !== 'active' && session.status !== 'paused')) return null;
  const toSelf = session.mode === 'host';

  const switchMode = async () => {
    setBusy(true);
    try {
      await data.actions.setMode(toSelf ? 'self' : 'host');
      toast.success(toSelf ? t.live.switchedToSelfPaced : t.live.switchedToHostPaced);
    } catch (e) {
      toast.error(liveErrorMessage(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" disabled={busy} onClick={() => void switchMode()}>
      {toSelf ? <Users /> : <Presentation />}
      {toSelf ? t.live.switchToSelfPaced : t.live.switchToHostPaced}
    </Button>
  );
}
