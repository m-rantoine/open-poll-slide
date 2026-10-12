// Fails a publish when a file that ships imports a relative path the package does not contain.
// The monorepo has every source file, so such an import works here and only breaks for people who
// install the package (this is how `src/live-site.ts` went missing in 0.5.0 and 0.6.0).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packed = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: root,
    encoding: 'utf8',
  }),
)[0].files.map((f) => f.path);
const shipped = new Set(packed);
const suffixes = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.css',
  '.mjs',
  '/index.ts',
  '/index.tsx',
  '/index.js',
];

const missing = [];
for (const file of packed.filter((f) => /^src\/.*\.(tsx?|jsx?)$/.test(f))) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const m of source.matchAll(
    /(?:from\s+|import\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g,
  )) {
    const target = path.posix.join(path.posix.dirname(file), m[1].split('?')[0]);
    if (!suffixes.some((s) => shipped.has(target + s))) missing.push(`${file} imports ${m[1]}`);
  }
}

if (missing.length > 0) {
  console.error(
    `The package would ship files that import files it does not contain:\n  ${missing.join('\n  ')}`,
  );
  console.error(
    'Add the missing files to "files" in package.json, or move them under a shipped folder.',
  );
  process.exit(1);
}
console.log(`check-package: ${packed.length} files, every relative import in src/ resolves`);
