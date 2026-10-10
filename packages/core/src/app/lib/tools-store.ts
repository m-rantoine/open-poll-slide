import { useSyncExternalStore } from 'react';

export type ClockSkin = 'analog' | 'digital' | 'flip' | 'minimal';
export type TimerSkin = 'digital' | 'ring' | 'bar' | 'flip';

export const CLOCK_SKINS: ClockSkin[] = ['analog', 'digital', 'flip', 'minimal'];
export const TIMER_SKINS: TimerSkin[] = ['digital', 'ring', 'bar', 'flip'];

export type TimerState = {
  durationMs: number;
  /** Wall-clock time the timer reaches zero while running. */
  endsAt: number | null;
  /** Time left while paused; null until the first start. */
  pausedMs: number | null;
};

export type ToolsState = {
  clockOpen: boolean;
  timerOpen: boolean;
  clockSkin: ClockSkin;
  timerSkin: TimerSkin;
  sound: boolean;
  timer: TimerState;
};

const KEY = 'open-slide-tools';
const CHANNEL = 'open-slide-tools';
const DEFAULT_MS = 5 * 60_000;

function loadSaved(): Partial<ToolsState> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<ToolsState>) : {};
  } catch {
    return {};
  }
}

const saved = typeof localStorage === 'undefined' ? {} : loadSaved();

let state: ToolsState = {
  clockOpen: false,
  timerOpen: false,
  clockSkin: saved.clockSkin && CLOCK_SKINS.includes(saved.clockSkin) ? saved.clockSkin : 'analog',
  timerSkin: saved.timerSkin && TIMER_SKINS.includes(saved.timerSkin) ? saved.timerSkin : 'digital',
  sound: saved.sound ?? true,
  timer: { durationMs: saved.timer?.durationMs ?? DEFAULT_MS, endsAt: null, pausedMs: null },
};

const listeners = new Set<() => void>();
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);

function persist() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        clockSkin: state.clockSkin,
        timerSkin: state.timerSkin,
        sound: state.sound,
        timer: { durationMs: state.timer.durationMs },
      }),
    );
  } catch {}
}

function emit() {
  for (const l of listeners) l();
}

function set(patch: Partial<ToolsState>, broadcast?: 'timer') {
  state = { ...state, ...patch };
  persist();
  emit();
  if (broadcast === 'timer') channel?.postMessage({ type: 'timer', timer: state.timer });
}

// The presenter window and the projection window share one timer; overlays open per window.
if (channel) {
  channel.onmessage = (e: MessageEvent) => {
    if (e.data?.type === 'timer') {
      state = { ...state, timer: e.data.timer as TimerState };
      emit();
    }
  };
}

export const toolsStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  toggleClock: () => set({ clockOpen: !state.clockOpen }),
  toggleTimer: () => set({ timerOpen: !state.timerOpen }),
  closeClock: () => set({ clockOpen: false }),
  closeTimer: () => set({ timerOpen: false }),
  cycleClockSkin() {
    const i = CLOCK_SKINS.indexOf(state.clockSkin);
    set({ clockSkin: CLOCK_SKINS[(i + 1) % CLOCK_SKINS.length] });
  },
  cycleTimerSkin() {
    const i = TIMER_SKINS.indexOf(state.timerSkin);
    set({ timerSkin: TIMER_SKINS[(i + 1) % TIMER_SKINS.length] });
  },
  setSound: (sound: boolean) => set({ sound }),
  setDuration(ms: number) {
    const durationMs = Math.max(1000, Math.round(ms));
    set({ timer: { durationMs, endsAt: null, pausedMs: null } }, 'timer');
  },
  start() {
    const { timer } = state;
    const left = timer.pausedMs ?? timer.durationMs;
    set({ timer: { ...timer, endsAt: Date.now() + left, pausedMs: null } }, 'timer');
  },
  pause() {
    const { timer } = state;
    if (timer.endsAt === null) return;
    set(
      { timer: { ...timer, endsAt: null, pausedMs: Math.max(0, timer.endsAt - Date.now()) } },
      'timer',
    );
  },
  reset() {
    set({ timer: { ...state.timer, endsAt: null, pausedMs: null } }, 'timer');
  },
};

export function useTools(): ToolsState {
  return useSyncExternalStore(toolsStore.subscribe, toolsStore.get, toolsStore.get);
}

export function timerRemaining(timer: TimerState, now: number): number {
  if (timer.endsAt !== null) return Math.max(0, timer.endsAt - now);
  return timer.pausedMs ?? timer.durationMs;
}

export function timerRunning(timer: TimerState, now: number): boolean {
  return timer.endsAt !== null && timer.endsAt > now;
}
