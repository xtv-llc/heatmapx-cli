import { describe, it, expect } from 'vitest'
import { getByPath, setByPath } from '../lib/dot-path'

const sample = {
  site: 'https://example.com',
  variants: [{ name: 'control' }, { name: 'v2' }],
}

describe('getByPath', () => {
  it('returns top-level value', () => {
    expect(getByPath(sample, 'site')).toBe('https://example.com')
  })
  it('returns nested array value', () => {
    expect(getByPath(sample, 'variants.0.name')).toBe('control')
    expect(getByPath(sample, 'variants.1.name')).toBe('v2')
  })
  it('returns undefined for missing key', () => {
    expect(getByPath(sample, 'missing')).toBeUndefined()
    expect(getByPath(sample, 'variants.99.name')).toBeUndefined()
  })
})

describe('setByPath', () => {
  it('mutates a top-level field', () => {
    const obj: Record<string, unknown> = { site: 'a' }
    setByPath(obj, 'site', 'b')
    expect(obj.site).toBe('b')
  })
  it('mutates a nested array field', () => {
    const obj = { variants: [{ name: 'a' }] }
    setByPath(obj, 'variants.0.name', 'control')
    expect(obj.variants[0].name).toBe('control')
  })
  it('throws when path traverses a non-object', () => {
    const obj = { site: 'a' }
    expect(() => setByPath(obj, 'site.deep', 'x')).toThrow()
  })
})
