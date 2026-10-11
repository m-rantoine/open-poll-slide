let ctx: AudioContext | null = null;

/** Three short rising tones. Quiet failure when the browser has not allowed audio yet. */
export function playChime(): void {
  try {
    ctx ??= new AudioContext();
    const audio = ctx;
    void audio.resume();
    const now = audio.currentTime;
    [660, 880, 1100].forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const at = now + i * 0.22;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
      osc.connect(gain).connect(audio.destination);
      osc.start(at);
      osc.stop(at + 0.32);
    });
  } catch {}
}
