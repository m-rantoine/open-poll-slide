import { type FormEvent, useState } from 'react';
import { useLocale } from '../lib/use-locale';
import { ACCENT, FONT, INK } from './question-style';

/** One free-text or number field with a Send button. Sizes in em, like the rating panes. */
export function TextEntry({
  kind,
  maxLength,
  disabled,
  onSubmit,
  unit,
}: {
  kind: 'number' | 'text';
  maxLength: number;
  disabled: boolean;
  onSubmit: (text: string) => void;
  unit?: string;
}) {
  const t = useLocale();
  const [text, setText] = useState('');
  const send = (e: FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (clean) onSubmit(clean);
  };
  const field = {
    boxSizing: 'border-box' as const,
    width: '100%',
    padding: '0.5em 0.7em',
    fontSize: 'inherit',
    fontFamily: FONT,
    color: INK,
    background: 'transparent',
    border: `0.1em solid color-mix(in srgb, ${INK} 22%, transparent)`,
    borderRadius: 'var(--osd-radius, 0.6em)',
  };
  const placeholder = kind === 'number' ? t.live.numberPlaceholder : t.live.textPlaceholder;
  const blocked = disabled || !text.trim();
  return (
    <form
      onSubmit={send}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6em',
        fontFamily: FONT,
        color: INK,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
        {kind === 'number' ? (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            maxLength={maxLength}
            placeholder={placeholder}
            aria-label={placeholder}
            disabled={disabled}
            style={field}
          />
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-label={placeholder}
            disabled={disabled}
            style={{ ...field, resize: 'none' }}
          />
        )}
        {unit && <span style={{ opacity: 0.7 }}>{unit}</span>}
      </span>
      <button
        type="submit"
        disabled={blocked}
        style={{
          ...field,
          width: 'auto',
          alignSelf: 'flex-start',
          cursor: blocked ? 'default' : 'pointer',
          opacity: blocked ? 0.5 : 1,
          color: 'var(--osd-bg, #fff)',
          background: ACCENT,
          border: 0,
          fontWeight: 600,
        }}
      >
        {t.live.sendWord}
      </button>
    </form>
  );
}
