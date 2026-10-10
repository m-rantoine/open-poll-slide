import { Clock, Palette, Pause, Play, RotateCcw, Timer, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { hasModifier, isTypingTarget } from '@/lib/keys';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { playChime } from '../../lib/chime';
import { timerRemaining, timerRunning, toolsStore, useTools } from '../../lib/tools-store';
import { ClockFace, TimerFace, useNow } from './faces';

const PRESETS = [1, 5, 10, 15];

function useToolsHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTypingTarget(e.target) || hasModifier(e)) return;
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        toolsStore.toggleClock();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        toolsStore.toggleTimer();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

const panelVars = {
  '--osd-text': '#f8fafc',
  '--osd-bg': '#0f172a',
  '--osd-accent': '#60a5fa',
} as React.CSSProperties;

function Card({
  title,
  onStyle,
  onClose,
  children,
}: {
  title: string;
  onStyle: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const t = useLocale();
  const iconButton =
    'flex size-7 items-center justify-center rounded-[6px] text-white/70 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40';
  return (
    <div
      data-osd-chrome
      style={panelVars}
      className="pointer-events-auto w-[300px] rounded-[14px] border border-white/10 bg-black/70 p-3 text-white shadow-[0_12px_40px_-10px_oklch(0_0_0/0.7)] backdrop-blur-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-[0.12em] text-white/60 uppercase">
          {title}
        </span>
        <span className="flex items-center gap-0.5">
          <button
            type="button"
            className={iconButton}
            onClick={onStyle}
            aria-label={t.tools.changeStyle}
            title={t.tools.changeStyle}
          >
            <Palette className="size-4" />
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={onClose}
            aria-label={t.tools.close}
            title={t.tools.close}
          >
            <X className="size-4" />
          </button>
        </span>
      </div>
      {children}
    </div>
  );
}

function ClockCard() {
  const t = useLocale();
  const { clockSkin } = useTools();
  const now = useNow(1000);
  return (
    <Card title={t.tools.clock} onStyle={toolsStore.cycleClockSkin} onClose={toolsStore.closeClock}>
      <div style={{ width: '100%', height: 190 }}>
        <ClockFace skin={clockSkin} now={now} showDate />
      </div>
    </Card>
  );
}

function TimerCard() {
  const t = useLocale();
  const { timer, timerSkin, sound } = useTools();
  const now = useNow(250);
  const remaining = timerRemaining(timer, now);
  const running = timerRunning(timer, now);
  const [minutes, setMinutes] = useState(String(Math.round(timer.durationMs / 60_000)));
  const chimed = useRef(false);

  useEffect(() => {
    if (running) chimed.current = false;
  }, [running]);

  // Only a window that shows the timer chimes, so two windows do not both ring.
  useEffect(() => {
    if (sound && timer.endsAt !== null && remaining <= 0 && !chimed.current) {
      chimed.current = true;
      playChime();
    }
  }, [sound, timer.endsAt, remaining]);

  const applyMinutes = (value: string) => {
    setMinutes(value);
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) toolsStore.setDuration(n * 60_000);
  };
  const chip =
    'rounded-[6px] border border-white/15 px-2 py-1 text-[12px] text-white/80 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40';

  return (
    <Card title={t.tools.timer} onStyle={toolsStore.cycleTimerSkin} onClose={toolsStore.closeTimer}>
      <div style={{ width: '100%', height: 170 }}>
        <TimerFace
          skin={timerSkin}
          remainingMs={remaining}
          totalMs={timer.durationMs}
          doneText={t.tools.timesUp}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => (running ? toolsStore.pause() : toolsStore.start())}
          className="flex h-8 items-center gap-1.5 rounded-[8px] bg-white px-3 text-[12.5px] font-medium text-black outline-none hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {running ? t.tools.timerPause : t.tools.timerStart}
        </button>
        <button
          type="button"
          onClick={toolsStore.reset}
          className={cn(chip, 'flex h-8 items-center gap-1')}
          aria-label={t.tools.timerReset}
          title={t.tools.timerReset}
        >
          <RotateCcw className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => toolsStore.setSound(!sound)}
          className={cn(chip, 'flex h-8 items-center')}
          aria-label={sound ? t.tools.soundOn : t.tools.soundOff}
          title={sound ? t.tools.soundOn : t.tools.soundOff}
        >
          {sound ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
        </button>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {PRESETS.map((m) => (
          <button key={m} type="button" className={chip} onClick={() => applyMinutes(String(m))}>
            {m}′
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1 text-[11px] text-white/60">
          {t.tools.timerMinutes}
          <input
            type="number"
            min={1}
            max={600}
            value={minutes}
            onChange={(e) => applyMinutes(e.target.value)}
            className="w-14 rounded-[6px] border border-white/15 bg-white/5 px-1.5 py-1 text-[12px] text-white outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          />
        </label>
      </div>
    </Card>
  );
}

/** Clock and timer overlays plus the T and C shortcuts. Mount once per presenting window. */
export function ToolsLayer() {
  useToolsHotkeys();
  const { clockOpen, timerOpen } = useTools();
  if (!clockOpen && !timerOpen) return null;
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[70] flex flex-col items-end gap-3">
      {clockOpen && <ClockCard />}
      {timerOpen && <TimerCard />}
    </div>
  );
}

/** A small menu that opens the clock and timer overlays. `direction` is where the menu opens. */
export function ToolsMenu({
  direction = 'up',
  className,
  buttonClassName,
}: {
  direction?: 'up' | 'down';
  className?: string;
  buttonClassName?: string;
}) {
  const t = useLocale();
  const { clockOpen, timerOpen } = useTools();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item =
    'flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left text-[12.5px] text-white/90 outline-none hover:bg-white/10 focus-visible:bg-white/10';
  return (
    <div ref={rootRef} className={cn('relative', className)} data-osd-chrome>
      <button
        type="button"
        aria-label={t.tools.menu}
        title={t.tools.menu}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex size-8 items-center justify-center rounded-full text-white/85 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40',
          (clockOpen || timerOpen) && 'bg-white/15 text-white',
          buttonClassName,
        )}
      >
        <Timer className="size-4" />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 z-[80] w-52 rounded-[10px] border border-white/10 bg-black/85 p-1 shadow-[0_12px_40px_-10px_oklch(0_0_0/0.7)] backdrop-blur-md',
            direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              toolsStore.toggleClock();
              setOpen(false);
            }}
          >
            <Clock className="size-4" />
            <span className="flex-1">{clockOpen ? t.tools.hideClock : t.tools.showClock}</span>
            <kbd className="font-mono text-[10px] text-white/50">C</kbd>
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              toolsStore.toggleTimer();
              setOpen(false);
            }}
          >
            <Timer className="size-4" />
            <span className="flex-1">{timerOpen ? t.tools.hideTimer : t.tools.showTimer}</span>
            <kbd className="font-mono text-[10px] text-white/50">T</kbd>
          </button>
        </div>
      )}
    </div>
  );
}
