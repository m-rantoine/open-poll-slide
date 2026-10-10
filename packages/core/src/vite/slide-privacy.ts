import * as t from '@babel/types';
import { tryParse } from '../editing/babel-walk.ts';

/** `export const isPrivate = true | false` in a deck's source; null when absent or not a literal. */
export function extractPrivacy(src: string): boolean | null {
  if (!src.includes('isPrivate')) return null;
  const ast = tryParse(src);
  if (!ast) return null;
  for (const node of ast.program.body) {
    if (!t.isExportNamedDeclaration(node) || !t.isVariableDeclaration(node.declaration)) continue;
    for (const decl of node.declaration.declarations) {
      if (!t.isIdentifier(decl.id) || decl.id.name !== 'isPrivate') continue;
      return t.isBooleanLiteral(decl.init) ? decl.init.value : null;
    }
  }
  return null;
}

/** `SLIDES_DEFAULT_AS_PRIVATE`: true / 1 / yes (any case) means private; anything else is public. */
export function defaultPrivateFromEnv(value: string | undefined): boolean {
  return /^(1|true|yes)$/i.test(value?.trim() ?? '');
}
