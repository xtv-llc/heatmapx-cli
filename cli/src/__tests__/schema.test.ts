import { describe, it, expect } from 'vitest'
import { HeatmapConfigSchema, defineHypothesis } from '../lib/schema'

describe('HeatmapConfigSchema', () => {
  it('accepts a valid config', () => {
    const valid = {
      site: 'https://example.com',
      page: '/pricing',
      goal: 'Lift CTA reach rate',
      variants: [{ name: 'control' }, { name: 'cta-above-fold' }],
    }
    expect(() => HeatmapConfigSchema.parse(valid)).not.toThrow()
  })

  it('rejects empty site', () => {
    expect(() =>
      HeatmapConfigSchema.parse({
        site: '',
        page: '/',
        goal: 'g',
        variants: [{ name: 'control' }],
      }),
    ).toThrow()
  })

  it('rejects empty variants', () => {
    expect(() =>
      HeatmapConfigSchema.parse({
        site: 'https://example.com',
        page: '/',
        goal: 'g',
        variants: [],
      }),
    ).toThrow()
  })

  it('defineHypothesis returns its input unchanged at runtime', () => {
    const cfg = {
      site: 'https://example.com',
      page: '/',
      goal: 'g',
      variants: [{ name: 'control' }],
    }
    expect(defineHypothesis(cfg)).toBe(cfg)
  })
})

describe('HeatmapConfigSchema.targets', () => {
  it('既定値は空配列', () => {
    const parsed = HeatmapConfigSchema.parse({
      site: 'https://example.com',
      page: '/',
      goal: 'g',
      variants: [{ name: 'control' }],
    });
    expect(parsed.targets).toEqual([]);
  });

  it('文字列配列を受け入れる', () => {
    const parsed = HeatmapConfigSchema.parse({
      site: 'https://example.com',
      page: '/',
      goal: 'g',
      variants: [{ name: 'control' }],
      targets: ['src/**/*.tsx', 'app/**/*.ts'],
    });
    expect(parsed.targets).toEqual(['src/**/*.tsx', 'app/**/*.ts']);
  });

  it('数値要素を含む targets は拒否', () => {
    expect(() =>
      HeatmapConfigSchema.parse({
        site: 'https://example.com',
        page: '/',
        goal: 'g',
        variants: [{ name: 'control' }],
        targets: [1, 2],
      })
    ).toThrow();
  });
})
