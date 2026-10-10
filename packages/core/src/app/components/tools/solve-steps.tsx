import type { HTMLAttributes, ReactNode } from 'react';
import temml from 'temml';
import { splitAtEquals } from '../../lib/split-equation';
import { Step, Steps } from '../../lib/step-context';

export type SolveStep = {
  /** LaTeX for this line, for example `2x + 3 = 11`. Colour a changed part with `\color{#c8102e}{…}`. */
  tex: string;
  /** What was done to get here, for example "Subtract 3 from both sides". */
  note?: ReactNode;
};

export type SolveStepsProps = {
  /** The first step is shown straight away; each later one appears on the next press. */
  steps: SolveStep[];
  /** Heading above the working. */
  title?: ReactNode;
  /** Size of the equations in pixels. Default 76. */
  size?: number;
} & Omit<HTMLAttributes<HTMLDivElement>, 'title'>;

// The Temml rules that matter for MathML in browsers without a maths font set up.
const MATH_CSS = `
.osd-solve math{font-family:"Cambria Math","STIX Two Math","Noto Sans Math","Latin Modern Math",math;font-style:normal;font-weight:normal;line-height:normal;font-size-adjust:none;text-indent:0;text-transform:none;letter-spacing:normal;word-wrap:normal;direction:ltr;font-feature-settings:"dtls" off}
.osd-solve math *{border-color:currentColor}
.osd-solve mfrac>:nth-child(2),.osd-solve msqrt,.osd-solve mover>:first-child{math-shift:compact}
.osd-solve{display:grid;grid-template-columns:auto auto minmax(0,1fr);column-gap:0.35em;row-gap:0.55em;align-items:center}
.osd-solve>*{grid-column:1/-1;display:grid;grid-template-columns:subgrid;align-items:center}
.osd-solve>*:has(+[data-osd-step="revealed"])>*{opacity:.38}
.osd-solve>*>*{transition:opacity 180ms ease}
`;

function render(tex: string): string {
  if (!tex) return '';
  return temml.renderToString(tex, { displayMode: false, throwOnError: false });
}

function Row({ step }: { step: SolveStep }) {
  const [lhs, rhs] = splitAtEquals(step.tex);
  return (
    <>
      <span
        style={{ justifySelf: 'end', whiteSpace: 'nowrap' }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Temml's MathML output for the author's own LaTeX
        dangerouslySetInnerHTML={{ __html: render(lhs) }}
      />
      <span
        style={{ justifySelf: 'start', whiteSpace: 'nowrap' }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Temml's MathML output for the author's own LaTeX
        dangerouslySetInnerHTML={{ __html: render(rhs) }}
      />
      <span
        style={{
          fontSize: '0.38em',
          lineHeight: 1.25,
          color: 'var(--osd-accent, #2563eb)',
          paddingLeft: '1.2em',
          fontFamily: 'var(--osd-font-body, system-ui, sans-serif)',
        }}
      >
        {step.note}
      </span>
    </>
  );
}

export function SolveSteps({ steps, title, size = 76, style, ...rest }: SolveStepsProps) {
  const [first, ...more] = steps;
  return (
    <div
      {...rest}
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '80px 128px',
        display: 'flex',
        flexDirection: 'column',
        gap: 56,
        background: 'var(--osd-bg, #fff)',
        color: 'var(--osd-text, #0f172a)',
        fontFamily: 'var(--osd-font-body, system-ui, sans-serif)',
        ...style,
      }}
    >
      <style>{MATH_CSS}</style>
      {title && (
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--osd-font-display, inherit)',
            fontSize: 64,
            lineHeight: 1.1,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
      )}
      <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', alignItems: 'center' }}>
        <div className="osd-solve" style={{ fontSize: size, width: '100%' }}>
          {first && (
            <div>
              <Row step={first} />
            </div>
          )}
          <Steps>
            {more.map((step, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: steps are positional
              <Step key={i}>
                <Row step={step} />
              </Step>
            ))}
          </Steps>
        </div>
      </div>
    </div>
  );
}
