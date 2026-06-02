import { describe, it, expect } from 'vitest';
import { extractSuggestions } from '../lib/analysis-loader';

describe('extractSuggestions', () => {
  it('「## 改善提案」セクション以下の ### N. <title> を順に抽出', () => {
    const md = `## 観察
ファーストビューで...

## 改善提案（優先度順 3件）
### 1. Hero の見出しを変更
- 観察した課題：弱い
- 改善案：強調
- 期待効果：CTR↑

### 2. CTAボタン文言を変更
- 観察した課題：曖昧
- 改善案：具体化

## 次のテスト案
A/B テスト...
`;
    const result = extractSuggestions(md);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      index: 1,
      title: 'Hero の見出しを変更',
      body: expect.stringContaining('観察した課題：弱い'),
    });
    expect(result[1].title).toBe('CTAボタン文言を変更');
  });

  it('「## 改善提案」が無い場合は空配列', () => {
    expect(extractSuggestions('# Title\n本文のみ')).toEqual([]);
  });

  it('提案セクションがあるが ### が無い場合は空配列', () => {
    expect(extractSuggestions('## 改善提案\n本文だけ')).toEqual([]);
  });
});
