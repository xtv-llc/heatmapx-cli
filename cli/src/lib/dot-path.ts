type Indexable = Record<string, unknown> | unknown[]

function isIndexable(v: unknown): v is Indexable {
  return v !== null && (typeof v === 'object' || Array.isArray(v))
}

export function getByPath(obj: Indexable, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const p of parts) {
    if (!isIndexable(current)) return undefined
    current = (current as Record<string, unknown>)[p]
  }
  return current
}

export function setByPath(
  obj: Indexable,
  path: string,
  value: unknown,
): void {
  const parts = path.split('.')
  let current: unknown = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    if (!isIndexable(current)) {
      throw new Error(`Cannot traverse non-object at "${parts.slice(0, i + 1).join('.')}"`)
    }
    current = (current as Record<string, unknown>)[p]
  }
  if (!isIndexable(current)) {
    throw new Error(`Cannot set on non-object at "${parts.slice(0, -1).join('.')}"`)
  }
  ;(current as Record<string, unknown>)[parts[parts.length - 1]] = value
}
