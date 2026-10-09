import path from 'node:path';
import * as t from '@babel/types';
import type { Plugin } from 'vite';
import { tryParse, walkAll } from '../editing/babel-walk.ts';

export type FoundAnswerKey = {
  questionId: string | null;
  /** null when `correct` is not an array of string literals. */
  correct: string[] | null;
  start: number;
  end: number;
};

function propName(p: t.ObjectProperty): string | null {
  if (p.computed) return null;
  if (t.isIdentifier(p.key)) return p.key.name;
  if (t.isStringLiteral(p.key)) return p.key.value;
  return null;
}

function literalStrings(node: t.Node): string[] | null {
  if (!t.isArrayExpression(node)) return null;
  const out: string[] = [];
  for (const el of node.elements) {
    if (!t.isStringLiteral(el)) return null;
    out.push(el.value);
  }
  return out;
}

export function findAnswerKeys(code: string): FoundAnswerKey[] {
  if (!code.includes('correct')) return [];
  const ast = tryParse(code);
  if (!ast) return [];
  const found: FoundAnswerKey[] = [];
  walkAll(ast, (node) => {
    if (!t.isObjectExpression(node)) return;
    const props = new Map<string, t.ObjectProperty>();
    for (const p of node.properties) {
      if (!t.isObjectProperty(p)) continue;
      const name = propName(p);
      if (name) props.set(name, p);
    }
    const correct = props.get('correct');
    const type = props.get('type')?.value;
    const isWordCloud = Boolean(type && t.isStringLiteral(type) && type.value === 'word_cloud');
    if (!correct || !props.has('question') || !(props.has('options') || isWordCloud)) return;
    const id = props.get('id')?.value;
    found.push({
      questionId: id && t.isStringLiteral(id) ? id.value : null,
      correct: literalStrings(correct.value),
      start: correct.start ?? 0,
      end: correct.end ?? 0,
    });
  });
  return found;
}

/** Blank out every answer key, keeping offsets and line numbers intact for later transforms. */
export function stripAnswerKeys(code: string): string | null {
  const keys = findAnswerKeys(code);
  if (keys.length === 0) return null;
  let next = code;
  for (const { start, end: propEnd } of keys) {
    let end = propEnd;
    const comma = /^\s*,/.exec(next.slice(end));
    if (comma) end += comma[0].length;
    next = next.slice(0, start) + next.slice(start, end).replace(/[^\n]/g, ' ') + next.slice(end);
  }
  return next;
}

const SOURCE_RE = /\.(tsx|ts|jsx|js)$/;

// The browser bundle is public, so answer keys must never reach it. They live in the database
// (`open-slide live keys` uploads them) and participants learn correctness from submit_answer.
export function answerKeysPlugin(opts: { userCwd: string; slidesDir?: string }): Plugin {
  const slidesRoot = path.resolve(opts.userCwd, opts.slidesDir ?? 'slides').replace(/\\/g, '/');
  return {
    name: 'open-slide:answer-keys',
    enforce: 'pre',
    transform(code, id, options) {
      if (options?.ssr) return null;
      const filePath = id.split(/[?#]/)[0].replace(/\\/g, '/');
      if (!filePath.startsWith(`${slidesRoot}/`) || !SOURCE_RE.test(filePath)) return null;
      const next = stripAnswerKeys(code);
      return next === null ? null : { code: next, map: null };
    },
  };
}
