import fg from 'fast-glob';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface TargetCandidate {
  path: string;
  content: string;
}

const MAX_FILES = 10;
// Character cap (not byte) so multi-byte content (Japanese / emoji) doesn't
// get sliced mid-codepoint and corrupted to U+FFFD.
const MAX_CHARS_PER_FILE = 2500;

// fast-glob (via micromatch) treats `(...)` as an extglob group that requires a
// qualifier (@, +, !, ?, *). Bare `(name)` directories — common in Next.js
// route groups like `app/(marketing)/...` — therefore fail to match. Escape
// unqualified parens so they're treated as literal path segments.
function escapeRouteGroupParens(pattern: string): string {
  return pattern.replace(/(?<![@+!?*\\])\(([^()]*)\)/g, '\\($1\\)');
}

export async function resolveTargets(
  cwd: string,
  patterns: string[],
): Promise<TargetCandidate[]> {
  if (patterns.length === 0) return [];

  const matches = await fg(patterns.map(escapeRouteGroupParens), {
    cwd,
    onlyFiles: true,
    followSymbolicLinks: false,
    dot: false,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
  });

  const limited = matches.slice(0, MAX_FILES);
  const candidates: TargetCandidate[] = [];

  for (const path of limited) {
    const text = await readFile(join(cwd, path), 'utf8');
    candidates.push({ path, content: text.slice(0, MAX_CHARS_PER_FILE) });
  }

  return candidates;
}
