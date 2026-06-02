import { createTwoFilesPatch } from 'diff';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * ASCII-safe filename slug. For non-Latin titles (e.g., 全文日本語), the
 * primary slug ends up empty; we then append a short stable hash of the
 * original input so two such titles never collide on disk.
 */
export function slugify(input: string): string {
  const ascii = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (ascii) return ascii;
  const hash = simpleHash(input).toString(16).padStart(8, '0').slice(0, 8);
  return `untitled-${hash}`;
}

function simpleHash(s: string): number {
  // Deterministic 32-bit hash (djb2 variant). Not cryptographic — just
  // enough to disambiguate filenames. Returns unsigned 32-bit.
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

/**
 * Build a git-apply compatible unified diff with a/ and b/ prefixes.
 * Strips the leading `Index:` and `===` lines that jsdiff emits, since
 * `git apply` expects the diff to start at `--- a/<path>`.
 */
export function buildUnifiedDiff(
  filePath: string,
  original: string,
  modified: string,
): string {
  const raw = createTwoFilesPatch(
    `a/${filePath}`,
    `b/${filePath}`,
    original,
    modified,
    '',
    '',
    { context: 3 },
  );
  return raw.replace(/^Index: .*\n=+\n/, '');
}

export interface WritePatchInput {
  outputDir: string;
  date: string;
  slug: string;
  diff: string;
}

export async function writePatchFile(input: WritePatchInput): Promise<string> {
  await mkdir(input.outputDir, { recursive: true });
  const filename = `${input.date}-${input.slug}.patch`;
  const fullPath = join(input.outputDir, filename);
  await writeFile(fullPath, input.diff, 'utf8');
  return fullPath;
}

export function todayString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
