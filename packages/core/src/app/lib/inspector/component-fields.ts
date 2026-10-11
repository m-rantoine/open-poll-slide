// The settings the inspector offers for the poll and tool components. Each component puts its
// current values on its root element as `data-osd-fields`; the panel reads that attribute and writes
// changes back to the source, either to a prop on the JSX element (`attr`) or to a field of the
// `question` object it points at (`question`). Lists such as options, items, zones, correct answers
// and equation steps are edited in the code.

export type FieldValue = string | number | boolean | null;

export type FieldLabel =
  | 'startLocked'
  | 'showResults'
  | 'scored'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'minLabel'
  | 'maxLabel'
  | 'total'
  | 'tolerance'
  | 'unit'
  | 'duration'
  | 'skin'
  | 'title'
  | 'subtitle'
  | 'autoStart'
  | 'sound'
  | 'timeZone'
  | 'showDate'
  | 'showSeconds'
  | 'size';

export type FieldDef = {
  key: string;
  /** `question` edits the question object; `attr` edits a prop on the component. */
  source: 'question' | 'attr';
  type: 'boolean' | 'number' | 'text' | 'choice' | 'duration';
  label: FieldLabel;
  /** Value used when the source leaves it out. `undefined` means the prop is required. */
  default?: FieldValue;
  min?: number;
  max?: number;
  choices?: string[];
};

export type ComponentKind =
  | 'multiple_choice'
  | 'word_cloud'
  | 'drag_drop'
  | 'association'
  | 'scale'
  | 'ranking'
  | 'points'
  | 'number'
  | 'open_text'
  | 'lobby'
  | 'class_results'
  | 'countdown_timer'
  | 'clock'
  | 'solve_steps';

const SCORED_BY_DEFAULT: ComponentKind[] = [
  'multiple_choice',
  'drag_drop',
  'association',
  'ranking',
  'number',
];

function questionBase(kind: ComponentKind): FieldDef[] {
  return [
    {
      key: 'startLocked',
      source: 'question',
      type: 'boolean',
      label: 'startLocked',
      default: true,
    },
    {
      key: 'showResults',
      source: 'question',
      type: 'boolean',
      label: 'showResults',
      default: false,
    },
    {
      key: 'scored',
      source: 'question',
      type: 'boolean',
      label: 'scored',
      default: SCORED_BY_DEFAULT.includes(kind),
    },
  ];
}

const num = (
  key: string,
  label: FieldLabel,
  extra: Partial<FieldDef> = {},
  source: FieldDef['source'] = 'question',
): FieldDef => ({ key, source, type: 'number', label, default: null, ...extra });

const text = (
  key: string,
  label: FieldLabel,
  source: FieldDef['source'] = 'question',
): FieldDef => ({ key, source, type: 'text', label, default: null });

export function fieldsFor(kind: ComponentKind): FieldDef[] {
  switch (kind) {
    case 'word_cloud':
      return [
        ...questionBase(kind),
        num('maxLength', 'maxLength', { default: 60, min: 1, max: 60 }),
      ];
    case 'open_text':
      return [
        ...questionBase(kind),
        num('maxLength', 'maxLength', { default: 500, min: 1, max: 1000 }),
      ];
    case 'scale':
      return [
        ...questionBase(kind),
        num('min', 'min', { default: 1 }),
        num('max', 'max', { default: 5 }),
        text('minLabel', 'minLabel'),
        text('maxLabel', 'maxLabel'),
      ];
    case 'points':
      return [...questionBase(kind), num('total', 'total', { default: 100, min: 1 })];
    case 'number':
      return [
        ...questionBase(kind),
        num('tolerance', 'tolerance', { default: 0, min: 0 }),
        num('min', 'min'),
        num('max', 'max'),
        text('unit', 'unit'),
      ];
    case 'multiple_choice':
    case 'drag_drop':
    case 'association':
    case 'ranking':
      return questionBase(kind);
    case 'lobby':
    case 'class_results':
      return [text('title', 'title', 'attr')];
    case 'countdown_timer':
      return [
        { key: 'duration', source: 'attr', type: 'duration', label: 'duration' },
        {
          key: 'skin',
          source: 'attr',
          type: 'choice',
          label: 'skin',
          default: 'digital',
          choices: ['digital', 'ring', 'bar', 'flip'],
        },
        text('title', 'title', 'attr'),
        text('subtitle', 'subtitle', 'attr'),
        { key: 'autoStart', source: 'attr', type: 'boolean', label: 'autoStart', default: true },
        { key: 'sound', source: 'attr', type: 'boolean', label: 'sound', default: true },
      ];
    case 'clock':
      return [
        {
          key: 'skin',
          source: 'attr',
          type: 'choice',
          label: 'skin',
          default: 'analog',
          choices: ['analog', 'digital', 'flip', 'minimal'],
        },
        text('title', 'title', 'attr'),
        text('timeZone', 'timeZone', 'attr'),
        { key: 'showDate', source: 'attr', type: 'boolean', label: 'showDate', default: false },
        {
          key: 'showSeconds',
          source: 'attr',
          type: 'boolean',
          label: 'showSeconds',
          default: true,
        },
      ];
    case 'solve_steps':
      return [
        text('title', 'title', 'attr'),
        num('size', 'size', { default: 76, min: 16, max: 200 }, 'attr'),
      ];
  }
}

export type FieldsSnapshot = { kind: ComponentKind; values: Record<string, FieldValue> };

/** The value a field shows: what the source sets, or its default. */
export function effectiveValues(
  kind: ComponentKind,
  raw: Record<string, unknown>,
): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const f of fieldsFor(kind)) {
    const v = raw[f.key];
    out[f.key] =
      typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
        ? v
        : (f.default ?? null);
  }
  return out;
}

/** Spread onto a component's root so the inspector can read its settings. */
export function fieldsAttr(kind: ComponentKind, raw: Record<string, unknown>) {
  const snapshot: FieldsSnapshot = { kind, values: effectiveValues(kind, raw) };
  return { 'data-osd-fields': JSON.stringify(snapshot) };
}

export function readFieldsAttr(value: string | undefined): FieldsSnapshot | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as FieldsSnapshot;
    return parsed && typeof parsed.kind === 'string' && parsed.values ? parsed : null;
  } catch {
    return null;
  }
}

export type FieldEditOp =
  | { kind: 'set-question-field'; field: string; value: string | number | boolean | null }
  | { kind: 'set-attr-bool'; attr: string; value: boolean | null }
  | { kind: 'set-attr-number'; attr: string; value: number | null }
  | { kind: 'set-attr-string'; attr: string; value: string | null };

/** The edit that sets `field` to `value`, leaving the source tidy when it equals the default. */
export function fieldEdit(field: FieldDef, value: FieldValue): FieldEditOp {
  const isDefault =
    field.default !== undefined && field.default !== null && value === field.default;
  const cleared = value === '' || value === null || isDefault;
  const next = cleared ? null : value;
  if (field.source === 'question') {
    return { kind: 'set-question-field', field: field.key, value: next };
  }
  if (field.type === 'boolean') {
    return { kind: 'set-attr-bool', attr: field.key, value: next as boolean | null };
  }
  if (
    field.type === 'number' ||
    (field.type === 'duration' && /^\d+(\.\d+)?$/.test(String(value)))
  ) {
    return { kind: 'set-attr-number', attr: field.key, value: next === null ? null : Number(next) };
  }
  return { kind: 'set-attr-string', attr: field.key, value: next === null ? null : String(next) };
}
