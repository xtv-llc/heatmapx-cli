import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveTargets } from '../lib/target-resolver';

describe('resolveTargets', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'hmx-resolver-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('glob にマッチしたファイル一覧を内容付きで返す', async () => {
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(join(dir, 'src/Hero.tsx'), 'export const Hero = () => null;');
    await writeFile(join(dir, 'src/Footer.tsx'), 'export const Footer = () => null;');
    await writeFile(join(dir, 'src/notes.md'), '# notes');

    const candidates = await resolveTargets(dir, ['src/**/*.tsx']);
    const paths = candidates.map((c) => c.path).sort();
    expect(paths).toEqual(['src/Footer.tsx', 'src/Hero.tsx']);
    expect(candidates[0].content.length).toBeGreaterThan(0);
  });

  it('2500文字を超える内容は先頭 2500 文字に切り詰める（ASCII）', async () => {
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(join(dir, 'src/big.tsx'), 'x'.repeat(10_000));
    const candidates = await resolveTargets(dir, ['src/**/*.tsx']);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].content.length).toBe(2500);
  });

  it('日本語ファイルでも codepoint 境界で切り詰める（U+FFFD を含まない）', async () => {
    await mkdir(join(dir, 'src'), { recursive: true });
    // 3000 「あ」 ≒ 9000 bytes UTF-8。2500 文字に切り詰められる。
    await writeFile(join(dir, 'src/jp.tsx'), 'あ'.repeat(3000));
    const candidates = await resolveTargets(dir, ['src/**/*.tsx']);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].content.length).toBe(2500);
    // U+FFFD (replacement char) が混入していない
    expect(candidates[0].content).not.toContain('�');
    // 全ての文字が 'あ' のまま
    expect(candidates[0].content).toBe('あ'.repeat(2500));
  });

  it('10ファイルを超えたら先頭10件のみ返す', async () => {
    await mkdir(join(dir, 'src'), { recursive: true });
    for (let i = 0; i < 15; i++) {
      await writeFile(join(dir, `src/f${i}.tsx`), 'a');
    }
    const candidates = await resolveTargets(dir, ['src/**/*.tsx']);
    expect(candidates).toHaveLength(10);
  });

  it('targets が空配列なら空を返す', async () => {
    const candidates = await resolveTargets(dir, []);
    expect(candidates).toEqual([]);
  });

  it('Next.js ルートグループ `(marketing)` を含むパスでもマッチする', async () => {
    await mkdir(join(dir, 'src/app/(marketing)/ja/pricing'), { recursive: true });
    await writeFile(
      join(dir, 'src/app/(marketing)/ja/pricing/page.tsx'),
      'export default function Page() { return null; }',
    );

    const candidates = await resolveTargets(dir, [
      'src/app/(marketing)/ja/pricing/**/*.tsx',
    ]);
    expect(candidates.map((c) => c.path)).toEqual([
      'src/app/(marketing)/ja/pricing/page.tsx',
    ]);
  });
});
