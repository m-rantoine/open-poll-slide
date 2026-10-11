import { Eraser, Minus, Palette, Pencil, Pin, Square, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { distanceToSegment } from './laser-geometry';

const TRAIL_HOLD_DURATION = 2_500;
const TRAIL_FADE_DURATION = 500;
const TRAIL_DURATION = TRAIL_HOLD_DURATION + TRAIL_FADE_DURATION;
const TRAIL_FADE_STEPS = 50;
const DEFAULT_TRAIL_WIDTH = 16;
const MAX_STROKES = 100;
const MAX_POINTS = 8_000;
const COLORS = ['#ff3038', '#ff8a24', '#ffd43b', '#35d07f', '#409eff', '#b56bff', '#fff5f5'];

type DrawMode = 'freehand' | 'line' | 'rectangle' | 'eraser';
type StrokeMode = Exclude<DrawMode, 'eraser'>;
type TrailPoint = { x: number; y: number; time: number };
type TrailStroke = {
  id: number;
  mode: StrokeMode;
  color: string;
  width: number;
  persist: boolean;
  lastDrawTime: number;
  points: TrailPoint[];
};

function LaserToolbar({
  color,
  mode,
  persist,
  width,
  onColor,
  onMode,
  onPersist,
  onWidth,
  onClear,
}: {
  color: string;
  mode: DrawMode;
  persist: boolean;
  width: number;
  onColor: (color: string) => void;
  onMode: (mode: DrawMode) => void;
  onPersist: () => void;
  onWidth: (width: number) => void;
  onClear: () => void;
}) {
  const t = useLocale();
  const toolClass =
    'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-white/85 transition-[background-color,color,scale] duration-150 hover:bg-white/12 focus-visible:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 active:scale-[0.94]';
  const modeButton = (tool: DrawMode, label: string, icon: React.ReactNode) => (
    <button
      key={tool}
      type="button"
      aria-label={label}
      aria-pressed={mode === tool}
      title={label}
      onClick={() => onMode(tool)}
      className={cn(toolClass, mode === tool && 'bg-[var(--brand,#e5484d)]/85 text-white')}
    >
      {icon}
    </button>
  );

  return (
    <div
      data-laser-toolbar
      data-osd-chrome
      role="toolbar"
      aria-label={t.present.laserToolbar}
      className="pointer-events-auto fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-[70] flex w-max max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-2xl border border-white/10 bg-black/65 p-1.5 text-white/85 shadow-[0_8px_30px_-8px_oklch(0_0_0/0.65)] backdrop-blur-md"
    >
      <div className="flex items-center gap-0.5">
        {COLORS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={`${t.present.laserColor} ${preset}`}
            aria-pressed={color === preset}
            title={`${t.present.laserColor} ${preset}`}
            onClick={() => onColor(preset)}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-95',
              color === preset && 'ring-2 ring-white/90 ring-offset-1 ring-offset-black',
            )}
          >
            <span
              className="size-3.5 rounded-full border border-white/35"
              style={{ background: preset }}
            />
          </button>
        ))}
        <label
          title={t.present.laserCustomColor}
          className={cn(toolClass, 'relative cursor-pointer overflow-hidden')}
        >
          <Palette className="size-4" />
          <input
            type="color"
            aria-label={t.present.laserCustomColor}
            value={color}
            onChange={(event) => onColor(event.currentTarget.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </div>

      <span aria-hidden className="mx-0.5 h-5 w-px bg-white/15" />

      <div className="flex items-center gap-0.5">
        {modeButton('freehand', t.present.laserFreehand, <Pencil className="size-4" />)}
        {modeButton('line', t.present.laserLine, <Minus className="size-4" />)}
        {modeButton('rectangle', t.present.laserRectangle, <Square className="size-4" />)}
        {modeButton('eraser', t.present.laserEraser, <Eraser className="size-4" />)}
      </div>

      <span aria-hidden className="mx-0.5 h-5 w-px bg-white/15" />

      <label className="flex h-8 items-center gap-1.5 px-1" title={t.present.laserWidth}>
        <span className="sr-only">{t.present.laserWidth}</span>
        <input
          type="range"
          min={6}
          max={40}
          step={1}
          value={width}
          aria-label={t.present.laserWidth}
          onChange={(event) => onWidth(Number(event.currentTarget.value))}
          className="h-1 w-16 cursor-pointer accent-white sm:w-20"
        />
      </label>

      <button
        type="button"
        aria-label={t.present.laserPersist}
        aria-pressed={persist}
        title={t.present.laserPersist}
        onClick={onPersist}
        className={cn(toolClass, persist && 'bg-[var(--brand,#e5484d)]/85 text-white')}
      >
        <Pin className="size-4" />
      </button>
      <button
        type="button"
        aria-label={t.present.laserClear}
        title={t.present.laserClear}
        onClick={onClear}
        className={toolClass}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

/**
 * Glowing pointer and drawing tools for the presentation laser.
 * Hides the system cursor on the player root via a `cursor-none` class
 * applied by the parent.
 */
export function PresentLaserPointer({ enabled }: { enabled: boolean }) {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const posRef = useRef<{ x: number; y: number } | null>(null);
  const strokesRef = useRef<TrailStroke[]>([]);
  const pointCountRef = useRef(0);
  const activePointerRef = useRef<number | null>(null);
  const activeStrokeRef = useRef<TrailStroke | null>(null);
  const nextStrokeIdRef = useRef(0);
  const rafRef = useRef(0);
  const modeRef = useRef<DrawMode>('freehand');
  const colorRef = useRef(COLORS[0]);
  const widthRef = useRef(DEFAULT_TRAIL_WIDTH);
  const persistRef = useRef(false);
  const [mode, setMode] = useState<DrawMode>('freehand');
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(DEFAULT_TRAIL_WIDTH);
  const [persist, setPersist] = useState(false);
  const [tracking, setTracking] = useState(false);

  modeRef.current = mode;
  colorRef.current = color;
  widthRef.current = width;
  persistRef.current = persist;

  useEffect(() => {
    if (!enabled) {
      setTracking(false);
      setMode('freehand');
      setPersist(false);
      posRef.current = null;
      strokesRef.current = [];
      pointCountRef.current = 0;
      activePointerRef.current = null;
      activeStrokeRef.current = null;
      return;
    }
    const scheduleRender = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(render);
    };
    const eraseAt = (x: number, y: number) => {
      let nearestIndex = -1;
      let nearestDistance = Number.POSITIVE_INFINITY;
      const cursor = { x, y };
      for (let i = 0; i < strokesRef.current.length; i++) {
        const stroke = strokesRef.current[i];
        const points =
          stroke.mode === 'rectangle' && stroke.points.length >= 2
            ? (() => {
                const [start, end] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
                return [
                  start,
                  { x: end.x, y: start.y, time: end.time },
                  end,
                  { x: start.x, y: end.y, time: end.time },
                  start,
                ];
              })()
            : stroke.points;
        for (let j = 1; j < points.length; j++) {
          const distance = distanceToSegment(cursor, points[j - 1], points[j]);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = i;
          }
        }
      }
      if (
        nearestIndex >= 0 &&
        nearestDistance <= Math.max(12, strokesRef.current[nearestIndex].width * 0.65)
      ) {
        const [removed] = strokesRef.current.splice(nearestIndex, 1);
        pointCountRef.current -= removed.points.length;
        scheduleRender();
      }
    };
    const startStroke = (e: PointerEvent) => {
      const now = performance.now();
      const point = { x: e.clientX, y: e.clientY, time: now };
      posRef.current = point;
      if (modeRef.current === 'eraser') {
        activeStrokeRef.current = null;
        eraseAt(point.x, point.y);
        return;
      }
      const stroke: TrailStroke = {
        id: nextStrokeIdRef.current++,
        mode: modeRef.current,
        color: colorRef.current,
        width: widthRef.current,
        persist: persistRef.current,
        lastDrawTime: now,
        points: [point],
      };
      strokesRef.current.push(stroke);
      pointCountRef.current += 1;
      if (strokesRef.current.length > MAX_STROKES) {
        const [removed] = strokesRef.current.splice(0, 1);
        pointCountRef.current -= removed.points.length;
      }
      activeStrokeRef.current = stroke;
      scheduleRender();
    };
    const addPoint = (e: PointerEvent) => {
      const stroke = activeStrokeRef.current;
      if (!stroke) {
        eraseAt(e.clientX, e.clientY);
        return;
      }
      const point = { x: e.clientX, y: e.clientY, time: performance.now() };
      stroke.lastDrawTime = point.time;
      if (stroke.mode === 'freehand') {
        const previous = stroke.points[stroke.points.length - 1];
        if (Math.hypot(point.x - previous.x, point.y - previous.y) > 0.5) {
          stroke.points.push(point);
          pointCountRef.current += 1;
          while (pointCountRef.current > MAX_POINTS && strokesRef.current.length > 0) {
            const oldest = strokesRef.current[0];
            if (oldest.points.length > 2) {
              oldest.points.shift();
              pointCountRef.current -= 1;
            } else if (oldest !== stroke) {
              const [removed] = strokesRef.current.splice(0, 1);
              pointCountRef.current -= removed.points.length;
            } else {
              break;
            }
          }
        }
      } else if (stroke.points.length === 1) {
        stroke.points.push(point);
      } else {
        stroke.points[stroke.points.length - 1] = point;
      }
      scheduleRender();
    };

    function render() {
      rafRef.current = 0;
      const el = dotRef.current;
      const cursor = posRef.current;
      if (el && cursor) {
        el.style.transform = `translate3d(${cursor.x - 9}px, ${cursor.y - 9}px, 0)`;
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      if (
        canvas.width !== Math.round(viewportWidth * dpr) ||
        canvas.height !== Math.round(viewportHeight * dpr)
      ) {
        canvas.width = Math.round(viewportWidth * dpr);
        canvas.height = Math.round(viewportHeight * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewportWidth, viewportHeight);

      const now = performance.now();
      const strokes = strokesRef.current;
      for (let i = strokes.length - 1; i >= 0; i--) {
        const stroke = strokes[i];
        if (stroke.persist) continue;
        if (stroke.mode !== 'freehand') {
          if (now - stroke.lastDrawTime > TRAIL_DURATION) {
            pointCountRef.current -= stroke.points.length;
            strokes.splice(i, 1);
          }
          continue;
        }
        while (stroke.points.length > 1 && now - stroke.points[0].time > TRAIL_DURATION) {
          stroke.points.shift();
          pointCountRef.current -= 1;
        }
        if (stroke.points.length < 2 && now - stroke.lastDrawTime > TRAIL_DURATION) {
          pointCountRef.current -= stroke.points.length;
          strokes.splice(i, 1);
        }
      }

      type RibbonRun = {
        strokeId: number;
        path: Path2D;
        corePath: Path2D;
        points: { x: number; y: number; time: number; width: number }[];
        color: string;
        opacity: number;
      };
      const runs = new Map<string, RibbonRun[]>();

      const addSegment = (
        stroke: TrailStroke,
        start: TrailPoint,
        end: TrailPoint,
        before: TrailPoint,
        after: TrailPoint,
      ) => {
        const age = now - (start.time + end.time) / 2;
        if (!stroke.persist && age > TRAIL_DURATION) return;
        const alpha = stroke.persist
          ? 1
          : Math.max(0, 1 - Math.max(0, age - TRAIL_HOLD_DURATION) / TRAIL_FADE_DURATION);
        const fadeStep = Math.round(alpha * TRAIL_FADE_STEPS);
        if (fadeStep === 0) return;
        const key = `${stroke.id}:${fadeStep}`;
        const control1 = {
          x: start.x + (end.x - before.x) / 6,
          y: start.y + (end.y - before.y) / 6,
        };
        const control2 = {
          x: end.x - (after.x - start.x) / 6,
          y: end.y - (after.y - start.y) / 6,
        };
        const curve: TrailPoint[] = [];
        const sampleCount = stroke.mode === 'freehand' ? 6 : 1;
        for (let sample = 0; sample <= sampleCount; sample++) {
          const t = sample / sampleCount;
          const inverseT = 1 - t;
          curve.push({
            x:
              inverseT ** 3 * start.x +
              3 * inverseT ** 2 * t * control1.x +
              3 * inverseT * t ** 2 * control2.x +
              t ** 3 * end.x,
            y:
              inverseT ** 3 * start.y +
              3 * inverseT ** 2 * t * control1.y +
              3 * inverseT * t ** 2 * control2.y +
              t ** 3 * end.y,
            time: start.time + (end.time - start.time) * t,
          });
        }
        let batch = runs.get(key);
        if (!batch) {
          batch = [];
          runs.set(key, batch);
        }
        let run = batch[batch.length - 1];
        if (
          !run ||
          run.strokeId !== stroke.id ||
          Math.hypot(
            run.points[run.points.length - 1].x - curve[0].x,
            run.points[run.points.length - 1].y - curve[0].y,
          ) > 0.5
        ) {
          run = {
            strokeId: stroke.id,
            path: new Path2D(),
            corePath: new Path2D(),
            points: [],
            color: stroke.color,
            opacity: fadeStep / TRAIL_FADE_STEPS,
          };
          batch.push(run);
        }
        for (let i = 0; i < curve.length; i++) {
          if (run.points.length > 0 && i === 0) continue;
          const point = curve[i];
          const pointAge = now - point.time;
          const widthTaper = 1 - 0.5 * Math.min(1, Math.max(0, pointAge / TRAIL_DURATION));
          run.points.push({ ...point, width: stroke.width * widthTaper });
        }
      };

      for (const stroke of strokes) {
        let points = stroke.points;
        if (stroke.mode === 'rectangle' && points.length >= 2) {
          const [start, end] = [points[0], points[points.length - 1]];
          const time = end.time;
          points = [
            start,
            { x: end.x, y: start.y, time },
            end,
            { x: start.x, y: end.y, time },
            start,
          ];
        }
        if (points.length < 2) continue;
        for (let i = 1; i < points.length; i++) {
          const previous = points[i - 1];
          const current = points[i];
          const before = stroke.mode === 'freehand' && i > 1 ? points[i - 2] : previous;
          const after =
            stroke.mode === 'freehand' && i < points.length - 1 ? points[i + 1] : current;
          addSegment(stroke, previous, current, before, after);
        }
      }

      const buildRibbon = (run: RibbonRun, widthScale: number) => {
        const path = new Path2D();
        const outline: { x: number; y: number }[] = [];
        for (let i = 0; i < run.points.length; i++) {
          const point = run.points[i];
          const previous = run.points[Math.max(0, i - 1)];
          const next = run.points[Math.min(run.points.length - 1, i + 1)];
          const tangentX = next.x - previous.x;
          const tangentY = next.y - previous.y;
          const tangentLength = Math.hypot(tangentX, tangentY) || 1;
          const radius = (point.width * widthScale) / 2;
          outline.push({
            x: point.x - (tangentY / tangentLength) * radius,
            y: point.y + (tangentX / tangentLength) * radius,
          });
        }
        for (let i = run.points.length - 1; i >= 0; i--) {
          const point = run.points[i];
          const previous = run.points[Math.max(0, i - 1)];
          const next = run.points[Math.min(run.points.length - 1, i + 1)];
          const tangentX = next.x - previous.x;
          const tangentY = next.y - previous.y;
          const tangentLength = Math.hypot(tangentX, tangentY) || 1;
          const radius = (point.width * widthScale) / 2;
          outline.push({
            x: point.x + (tangentY / tangentLength) * radius,
            y: point.y - (tangentX / tangentLength) * radius,
          });
        }
        path.moveTo(outline[0].x, outline[0].y);
        for (let i = 1; i < outline.length; i++) path.lineTo(outline[i].x, outline[i].y);
        path.closePath();
        for (const point of [run.points[0], run.points[run.points.length - 1]]) {
          const radius = (point.width * widthScale) / 2;
          path.moveTo(point.x + radius, point.y);
          path.arc(point.x, point.y, radius, 0, Math.PI * 2);
        }
        return path;
      };

      for (const batch of runs.values()) {
        for (const run of batch) {
          if (run.points.length < 2) continue;
          run.path = buildRibbon(run, 1);
          run.corePath = buildRibbon(run, 0.32);
        }
      }

      for (const blur of [40, 16]) {
        ctx.shadowBlur = blur;
        for (const batch of runs.values()) {
          for (const run of batch) {
            if (run.points.length < 2) continue;
            ctx.fillStyle = run.color;
            ctx.shadowColor = run.color;
            ctx.globalAlpha = run.opacity * (blur === 40 ? 0.42 : 0.75);
            ctx.fill(run.path);
          }
        }
      }
      ctx.shadowBlur = 0;
      for (const batch of runs.values()) {
        for (const run of batch) {
          if (run.points.length < 2) continue;
          ctx.fillStyle = run.color;
          ctx.globalAlpha = run.opacity;
          ctx.fill(run.path);
        }
      }
      ctx.shadowColor = 'rgb(255 90 100)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgb(255 225 225)';
      for (const batch of runs.values()) {
        for (const run of batch) {
          if (run.points.length < 2) continue;
          ctx.globalAlpha = run.opacity;
          ctx.fill(run.corePath);
        }
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      if (strokes.some((stroke) => !stroke.persist)) scheduleRender();
    }

    const isToolbarTarget = (target: EventTarget | null) =>
      target instanceof Element && target.closest('[data-laser-toolbar]') !== null;
    const onDown = (e: PointerEvent) => {
      if (isToolbarTarget(e.target)) return;
      if (
        !e.isPrimary ||
        (activePointerRef.current !== null && activePointerRef.current !== e.pointerId) ||
        (e.pointerType === 'mouse' && (!e.isPrimary || e.button !== 0)) ||
        (e.pointerType === 'pen' && (e.buttons & 1) === 0)
      ) {
        return;
      }
      activePointerRef.current = e.pointerId;
      startStroke(e);
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      setTracking(true);
      scheduleRender();
      if (isToolbarTarget(e.target)) return;
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        if ((e.buttons & 1) === 0) {
          if (activePointerRef.current === e.pointerId) {
            activePointerRef.current = null;
            activeStrokeRef.current = null;
          }
          return;
        }
        if (activePointerRef.current !== e.pointerId) {
          activePointerRef.current = e.pointerId;
          startStroke(e);
        }
      } else if (activePointerRef.current !== e.pointerId) {
        return;
      }
      e.preventDefault();
      const coalesced = e.getCoalescedEvents?.();
      for (const event of coalesced?.length ? coalesced : [e]) addPoint(event);
    };
    const onUp = (e: PointerEvent) => {
      if (activePointerRef.current !== e.pointerId) return;
      activePointerRef.current = null;
      activeStrokeRef.current = null;
      scheduleRender();
    };
    const onBlur = () => {
      activePointerRef.current = null;
      activeStrokeRef.current = null;
      scheduleRender();
    };

    window.addEventListener('pointerdown', onDown, { passive: false });
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    // Strokes are in window coordinates, so they would no longer line up after a resize.
    const onResize = () => {
      strokesRef.current = [];
      pointCountRef.current = 0;
      activeStrokeRef.current = null;
      scheduleRender();
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onBlur);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      strokesRef.current = [];
      pointCountRef.current = 0;
      activePointerRef.current = null;
      activeStrokeRef.current = null;
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <canvas
        ref={canvasRef}
        data-laser-canvas
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[59]"
        style={{ width: '100vw', height: '100vh' }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className={cn(
          'pointer-events-none fixed top-0 left-0 z-[60] motion-safe:transition-opacity motion-safe:duration-150',
          tracking ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          width: 18,
          height: 18,
          willChange: 'transform',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color} 30%, transparent 70%)`,
          boxShadow: `0 0 18px 4px color-mix(in srgb, ${color} 55%, transparent)`,
        }}
      />
      <LaserToolbar
        color={color}
        mode={mode}
        persist={persist}
        width={width}
        onColor={setColor}
        onMode={setMode}
        onPersist={() => setPersist((value) => !value)}
        onWidth={setWidth}
        onClear={() => {
          strokesRef.current = [];
          pointCountRef.current = 0;
          activePointerRef.current = null;
          activeStrokeRef.current = null;
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }}
      />
    </>
  );
}
