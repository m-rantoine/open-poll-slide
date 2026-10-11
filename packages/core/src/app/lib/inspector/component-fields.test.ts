import { describe, expect, it } from 'vitest';
import {
  effectiveValues,
  fieldEdit,
  fieldsAttr,
  fieldsFor,
  readFieldsAttr,
} from './component-fields.ts';

const field = (kind: Parameters<typeof fieldsFor>[0], key: string) => {
  const f = fieldsFor(kind).find((x) => x.key === key);
  if (!f) throw new Error(`no field ${key}`);
  return f;
};

describe('component fields', () => {
  it('fills in defaults for what the source leaves out', () => {
    expect(effectiveValues('word_cloud', {})).toMatchObject({
      startLocked: true,
      showResults: false,
      scored: false,
      maxLength: 60,
    });
    expect(effectiveValues('multiple_choice', { scored: false }).scored).toBe(false);
    expect(effectiveValues('multiple_choice', {}).scored).toBe(true);
  });

  it('round-trips through the data attribute', () => {
    const attr = fieldsAttr('clock', { skin: 'flip', title: 'Now' })['data-osd-fields'];
    expect(readFieldsAttr(attr)).toEqual({
      kind: 'clock',
      values: { skin: 'flip', title: 'Now', timeZone: null, showDate: false, showSeconds: true },
    });
    expect(readFieldsAttr('nope')).toBeNull();
  });

  it('removes a setting from the source when it goes back to the default', () => {
    expect(fieldEdit(field('multiple_choice', 'startLocked'), true)).toEqual({
      kind: 'set-question-field',
      field: 'startLocked',
      value: null,
    });
    expect(fieldEdit(field('multiple_choice', 'startLocked'), false)).toEqual({
      kind: 'set-question-field',
      field: 'startLocked',
      value: false,
    });
    expect(fieldEdit(field('countdown_timer', 'skin'), 'digital')).toEqual({
      kind: 'set-attr-string',
      attr: 'skin',
      value: null,
    });
  });

  it('writes tool props with the right kind of attribute', () => {
    expect(fieldEdit(field('countdown_timer', 'sound'), false)).toEqual({
      kind: 'set-attr-bool',
      attr: 'sound',
      value: false,
    });
    expect(fieldEdit(field('countdown_timer', 'duration'), '90')).toEqual({
      kind: 'set-attr-number',
      attr: 'duration',
      value: 90,
    });
    expect(fieldEdit(field('countdown_timer', 'duration'), '1:30')).toEqual({
      kind: 'set-attr-string',
      attr: 'duration',
      value: '1:30',
    });
    expect(fieldEdit(field('solve_steps', 'size'), 90)).toEqual({
      kind: 'set-attr-number',
      attr: 'size',
      value: 90,
    });
  });

  it('clears an empty optional text', () => {
    expect(fieldEdit(field('scale', 'minLabel'), '')).toEqual({
      kind: 'set-question-field',
      field: 'minLabel',
      value: null,
    });
  });
});
