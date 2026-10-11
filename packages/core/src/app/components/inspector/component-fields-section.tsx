import { useId, useState } from 'react';
import { Section } from '@/components/panel/panel-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/lib/use-locale';
import {
  type FieldDef,
  type FieldsSnapshot,
  type FieldValue,
  fieldEdit,
  fieldsFor,
} from '../../lib/inspector/component-fields';
import type { EditOp } from '../../lib/inspector/use-editor';

export type ComponentFieldsTarget = FieldsSnapshot & { line: number; column: number };

const QUESTION_KINDS = [
  'multiple_choice',
  'word_cloud',
  'drag_drop',
  'association',
  'scale',
  'ranking',
  'points',
  'number',
  'open_text',
];

function BooleanRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-[12px]">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--brand,currentColor)]"
      />
    </label>
  );
}

function EntryRow({
  label,
  value,
  numeric,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: string;
  numeric: boolean;
  min?: number;
  max?: number;
  onCommit: (value: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const id = useId();
  const commit = () => {
    if (local !== value) onCommit(local);
  };
  return (
    <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
      <label htmlFor={id}>{label}</label>
      <Input
        id={id}
        value={local}
        type={numeric ? 'number' : 'text'}
        min={min}
        max={max}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className="h-8 text-xs text-foreground"
      />
    </div>
  );
}

function ChoiceRow({
  label,
  value,
  choices,
  names,
  onChange,
}: {
  label: string;
  value: string;
  choices: string[];
  names: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1">
        {choices.map((c) => (
          <Button
            key={c}
            type="button"
            size="sm"
            variant={c === value ? 'default' : 'outline'}
            className="flex-1"
            aria-pressed={c === value}
            onClick={() => onChange(c)}
          >
            {names[c] ?? c}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Settings for a poll or tool component that live in its props or its question object. */
export function ComponentFieldsSection({
  target,
  applyEdit,
}: {
  target: ComponentFieldsTarget;
  applyEdit: (line: number, column: number, ops: EditOp[]) => Promise<void>;
}) {
  const t = useLocale();
  const labels = t.inspector.fields;
  const fields = fieldsFor(target.kind);
  if (fields.length === 0) return null;
  const set = (field: FieldDef, value: FieldValue) => {
    void applyEdit(target.line, target.column, [fieldEdit(field, value)]);
  };
  const title = QUESTION_KINDS.includes(target.kind) ? labels.questionSettings : labels.settings;

  return (
    <Section title={title}>
      {fields.map((field) => {
        const value = target.values[field.key];
        const label = labels[field.label];
        // A new key remounts the row, so it shows the saved value after an edit or a hot reload.
        const key = `${field.key}:${String(value)}`;
        if (field.type === 'boolean') {
          return (
            <BooleanRow
              key={key}
              label={label}
              value={Boolean(value)}
              onChange={(v) => set(field, v)}
            />
          );
        }
        if (field.type === 'choice') {
          return (
            <ChoiceRow
              key={key}
              label={label}
              value={String(value ?? field.default ?? '')}
              choices={field.choices ?? []}
              names={labels.skins}
              onChange={(v) => set(field, v)}
            />
          );
        }
        const numeric = field.type === 'number';
        return (
          <EntryRow
            key={key}
            label={label}
            value={value === null || value === undefined ? '' : String(value)}
            numeric={numeric}
            min={field.min}
            max={field.max}
            onCommit={(raw) => {
              if (numeric) {
                const n = Number(raw);
                if (raw.trim() === '') set(field, null);
                else if (Number.isFinite(n)) set(field, n);
              } else {
                set(field, raw);
              }
            }}
          />
        );
      })}
    </Section>
  );
}
