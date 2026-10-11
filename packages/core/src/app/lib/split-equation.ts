/** Split at the first `=` that is not inside braces, so `x = 4` lines up on its equals sign. */
export function splitAtEquals(tex: string): [string, string] {
  let depth = 0;
  for (let i = 0; i < tex.length; i++) {
    const c = tex[i];
    if (c === '\\') {
      i++;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
    } else if (c === '=' && depth === 0) {
      return [tex.slice(0, i).trim(), tex.slice(i).trim()];
    }
  }
  return [tex.trim(), ''];
}
