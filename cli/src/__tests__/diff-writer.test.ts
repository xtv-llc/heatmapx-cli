import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildUnifiedDiff, writePatchFile, slugify } from '../lib/diff-writer';

describe('slugify', () => {
  it('日本語と記号を ASCII セーフに変換', () => {
    expect(slugify('Hero の見出しを変更！')).toMatch(/^[a-z0-9-]+$/);
  });
  it('空文字列はハッシュ付き untitled にフォールバック', () => {
    expect(slugify('')).toMatch(/^untitled-[0-9a-f]{8}$/);
  });
  it('Latin文字を含まない（全文日本語）タイトルは衝突しないようハッシュ付与', () => {
    const a = slugify('見出しを変更');
    const b = slugify('ボタンを大きく');
    expect(a).toMatch(/^untitled-[0-9a-f]{8}$/);
    expect(b).toMatch(/^untitled-[0-9a-f]{8}$/);
    expect(a).not.toBe(b);
  });
  it('同じ入力には同じ slug を返す（決定的）', () => {
    expect(slugify('見出しを変更')).toBe(slugify('見出しを変更'));
  });
  it('Latin が部分的に含まれる場合は通常 slug（fallback しない）', () => {
    expect(slugify('CTAを強化')).toBe('cta');
  });
});

describe('buildUnifiedDiff', () => {
  it('git-apply 互換の unified diff を返す（a/ と b/ prefix）', () => {
    const orig = 'line1\nline2\nline3\n';
    const mod = 'line1\nLINE2\nline3\n';
    const diff = buildUnifiedDiff('src/Hero.tsx', orig, mod);
    expect(diff).toMatch(/--- a\/src\/Hero\.tsx/);
    expect(diff).toMatch(/\+\+\+ b\/src\/Hero\.tsx/);
    expect(diff).toContain('-line2');
    expect(diff).toContain('+LINE2');
    expect(diff).not.toMatch(/^Index:/);
  });
});

describe('writePatchFile', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'hmx-diff-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('指定ディレクトリに patch ファイルを書き出す', async () => {
    const out = await writePatchFile({
      outputDir: dir,
      date: '2026-05-08',
      slug: 'hero-headline',
      diff: '--- a/x\n+++ b/x\n',
    });
    expect(out).toBe(join(dir, '2026-05-08-hero-headline.patch'));
    const content = await readFile(out, 'utf8');
    expect(content).toContain('--- a/x');
  });
});
