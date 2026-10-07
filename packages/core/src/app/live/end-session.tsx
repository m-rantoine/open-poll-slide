import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/lib/use-locale';
import { liveErrorMessage } from './errors';
import type { LiveData } from './use-live-session';

export function EndSessionButton({ data, onEnded }: { data: LiveData; onEnded?: () => void }) {
  const t = useLocale();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ended = data.session?.status === 'ended';

  const confirm = async () => {
    setBusy(true);
    try {
      await data.actions.endSession();
      setOpen(false);
      onEnded?.();
    } catch (e) {
      toast.error(liveErrorMessage(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" disabled={ended} onClick={() => setOpen(true)}>
        {ended ? t.live.ended : t.live.endSession}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <span className="eyebrow text-destructive/80">{t.live.endDialogEyebrow}</span>
            <DialogTitle>{t.live.endDialogTitle}</DialogTitle>
            <DialogDescription>{t.live.endDialogDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" size="sm" disabled={busy} onClick={confirm}>
              {t.live.endSession}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
