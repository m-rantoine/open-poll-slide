import {
  ClockSlide,
  CountdownTimer,
  type DesignSystem,
  type Page,
  type SlideMeta,
  SolveSteps,
} from '@open-slide/core';

export const meta: SlideMeta = {
  title: 'Math, timers and clocks',
  createdAt: '2026-10-11T00:00:00.000Z',
};

export const design: DesignSystem = {
  palette: { bg: '#fffaf0', text: '#1f2937', accent: '#c8102e' },
  fonts: {
    display: 'system-ui, -apple-system, sans-serif',
    body: 'system-ui, -apple-system, sans-serif',
  },
  typeScale: { hero: 160, body: 40 },
  radius: 16,
};

export default [
  () => (
    <SolveSteps
      title="Solve 2x + 3 = 11"
      steps={[
        { tex: '2x + 3 = 11', note: 'Start with the equation' },
        {
          tex: '2x + 3 \\color{#c8102e}{- 3} = 11 \\color{#c8102e}{- 3}',
          note: 'Subtract 3 from both sides',
        },
        { tex: '2x = 8', note: 'Simplify' },
        {
          tex: '\\frac{2x}{\\color{#c8102e}{2}} = \\frac{8}{\\color{#c8102e}{2}}',
          note: 'Divide both sides by 2',
        },
        { tex: 'x = 4', note: 'The solution' },
      ]}
    />
  ),
  () => (
    <SolveSteps
      title="Solve x² − 5x + 6 = 0"
      steps={[
        { tex: 'x^2 - 5x + 6 = 0', note: 'A quadratic equation' },
        { tex: '(x - 2)(x - 3) = 0', note: 'Factor: two numbers that multiply to 6 and add to −5' },
        {
          tex: 'x - 2 = 0 \\quad \\text{or} \\quad x - 3 = 0',
          note: 'A product is zero when a factor is zero',
        },
        { tex: 'x = 2 \\quad \\text{or} \\quad x = 3', note: 'Solve each factor' },
      ]}
    />
  ),
  () => (
    <CountdownTimer title="Break" subtitle="Back in a few minutes" duration="0:45" skin="digital" />
  ),
  () => <CountdownTimer title="Break" duration="0:45" skin="ring" />,
  () => <CountdownTimer title="Activity time" duration="1:30" skin="bar" />,
  () => <CountdownTimer title="Back at the top of the hour" duration="2:00" skin="flip" />,
  () => <ClockSlide title="It is now" skin="analog" showDate />,
  () => <ClockSlide skin="digital" showDate />,
  () => <ClockSlide skin="flip" />,
  () => <ClockSlide skin="minimal" showDate />,
] satisfies Page[];
