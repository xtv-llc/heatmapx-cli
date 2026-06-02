import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  Project,
  SyntaxKind,
  type ObjectLiteralExpression,
  type ArrayLiteralExpression,
  type PropertyAssignment,
} from 'ts-morph'
import { HeatmapConfigSchema, type HeatmapConfig } from './schema'

// グローバルCLI(`npm i -g heatmapx`)ではユーザーのプロジェクトに heatmapx が
// ローカル依存として入らないため、import を生成しない（解決できず編集機がエラーになる）。
// 設定は素のオブジェクトを default export する。CLI は ts-morph で静的にパースする。
const TEMPLATE = `// heatmap.config.ts — HeatMapX hypothesis config
// docs: https://github.com/xtv-llc/heatmapx-cli

export default __BODY__
`

/**
 * Render a HeatmapConfig back into a heatmap.config.ts source.
 * Used for new file creation (init). Comments not relevant since file is brand new.
 */
export function renderTemplate(config: HeatmapConfig): string {
  const body = JSON.stringify(config, null, 2)
    .replace(/"([^"]+)":/g, '$1:')
    .replace(/"/g, "'")
  return TEMPLATE.replace('__BODY__', body)
}

/**
 * Persist a HeatmapConfig to disk.
 * - If file does not exist: write fresh from template (Phase 1 behavior)
 * - If file exists: mutate AST in place to preserve comments
 */
export function persistConfig(filePath: string, config: HeatmapConfig): void {
  HeatmapConfigSchema.parse(config) // validate before writing
  const absolute = resolve(filePath)

  if (!existsSync(absolute)) {
    writeFileSync(absolute, renderTemplate(config), 'utf8')
    return
  }

  const project = new Project({ useInMemoryFileSystem: false })
  const source = project.addSourceFileAtPath(absolute)
  const obj = findHypothesisObject(source)
  applyConfig(obj, config)
  source.saveSync()
}

/**
 * Load and validate a heatmap.config.ts via ts-morph AST traversal.
 * Walks the literal object and reconstructs a JSON-serializable shape,
 * then validates with zod.
 */
export async function loadConfig(filePath: string): Promise<HeatmapConfig> {
  const absolute = resolve(filePath)
  const project = new Project({ useInMemoryFileSystem: false })
  const source = project.addSourceFileAtPath(absolute)
  const obj = findHypothesisObject(source)
  const raw = objectLiteralToJson(obj)
  return HeatmapConfigSchema.parse(raw)
}

// ---------- helpers ----------

function findHypothesisObject(source: import('ts-morph').SourceFile): ObjectLiteralExpression {
  const exportAssignment = source.getExportAssignment((d) => !d.isExportEquals())
  if (!exportAssignment) {
    throw new Error('No `export default` found in heatmap.config.ts')
  }
  const expr = exportAssignment.getExpression()

  // Form 1 (current): `export default { ... }` — 素のオブジェクト（import不要）
  if (expr.getKind() === SyntaxKind.ObjectLiteralExpression) {
    return expr.asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
  }

  // Form 2 (後方互換): `export default defineHypothesis({ ... })` — 旧テンプレ
  if (expr.getKind() === SyntaxKind.CallExpression) {
    const callExpr = expr.asKindOrThrow(SyntaxKind.CallExpression)
    const args = callExpr.getArguments()
    if (args.length === 0) {
      throw new Error('defineHypothesis() called with no arguments')
    }
    const arg = args[0]
    if (arg.getKind() !== SyntaxKind.ObjectLiteralExpression) {
      throw new Error('defineHypothesis() argument must be an object literal')
    }
    return arg.asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
  }

  throw new Error('`export default` must be an object literal or defineHypothesis({...}) call')
}

function objectLiteralToJson(obj: ObjectLiteralExpression): unknown {
  const out: Record<string, unknown> = {}
  for (const prop of obj.getProperties()) {
    if (prop.getKind() !== SyntaxKind.PropertyAssignment) continue
    const assignment = prop.asKindOrThrow(SyntaxKind.PropertyAssignment)
    const name = assignment.getName().replace(/^['"]|['"]$/g, '')
    out[name] = literalToValue(assignment.getInitializerOrThrow())
  }
  return out
}

function literalToValue(node: import('ts-morph').Node): unknown {
  const k = node.getKind()
  if (k === SyntaxKind.StringLiteral || k === SyntaxKind.NoSubstitutionTemplateLiteral) {
    return (node as import('ts-morph').StringLiteral).getLiteralValue()
  }
  if (k === SyntaxKind.NumericLiteral) {
    return Number(node.getText())
  }
  if (k === SyntaxKind.TrueKeyword) return true
  if (k === SyntaxKind.FalseKeyword) return false
  if (k === SyntaxKind.NullKeyword) return null
  if (k === SyntaxKind.ArrayLiteralExpression) {
    const arr = node.asKindOrThrow(SyntaxKind.ArrayLiteralExpression)
    return arr.getElements().map((el) => literalToValue(el))
  }
  if (k === SyntaxKind.ObjectLiteralExpression) {
    return objectLiteralToJson(node.asKindOrThrow(SyntaxKind.ObjectLiteralExpression))
  }
  throw new Error(`Unsupported literal kind: ${SyntaxKind[k]}`)
}

function applyConfig(obj: ObjectLiteralExpression, config: HeatmapConfig): void {
  setStringProp(obj, 'site', config.site)
  setStringProp(obj, 'page', config.page)
  setStringProp(obj, 'goal', config.goal)
  setVariants(obj, config.variants)
}

function setStringProp(obj: ObjectLiteralExpression, name: string, value: string): void {
  const prop = obj.getProperty(name)
  const safe = value.replace(/'/g, "\\'")
  if (prop && prop.getKind() === SyntaxKind.PropertyAssignment) {
    prop.asKindOrThrow(SyntaxKind.PropertyAssignment).setInitializer(`'${safe}'`)
  } else {
    obj.addPropertyAssignment({ name, initializer: `'${safe}'` })
  }
}

function setVariants(obj: ObjectLiteralExpression, variants: HeatmapConfig['variants']): void {
  const prop = obj.getProperty('variants')
  if (!prop || prop.getKind() !== SyntaxKind.PropertyAssignment) {
    obj.addPropertyAssignment({
      name: 'variants',
      initializer: variantsToCode(variants),
    })
    return
  }
  const arrayInit = prop.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializerOrThrow()
  if (arrayInit.getKind() !== SyntaxKind.ArrayLiteralExpression) {
    prop.asKindOrThrow(SyntaxKind.PropertyAssignment).setInitializer(variantsToCode(variants))
    return
  }
  const arr = arrayInit.asKindOrThrow(SyntaxKind.ArrayLiteralExpression)
  // Update existing entries in-place when count matches; otherwise replace whole array
  const existing = arr.getElements()
  if (existing.length !== variants.length) {
    prop.asKindOrThrow(SyntaxKind.PropertyAssignment).setInitializer(variantsToCode(variants))
    return
  }
  variants.forEach((v, i) => {
    const el = existing[i]
    if (el.getKind() !== SyntaxKind.ObjectLiteralExpression) {
      // Replace whole element
      arr.removeElement(i)
      arr.insertElement(i, variantToCode(v))
      return
    }
    const objEl = el.asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
    setStringProp(objEl, 'name', v.name)
    if (v.description !== undefined) setStringProp(objEl, 'description', v.description)
  })
}

function variantsToCode(variants: HeatmapConfig['variants']): string {
  const lines = variants.map((v) => `  ${variantToCode(v)},`).join('\n')
  return `[\n${lines}\n]`
}

function variantToCode(v: HeatmapConfig['variants'][number]): string {
  const parts = [`name: '${v.name.replace(/'/g, "\\'")}'`]
  if (v.description !== undefined) parts.push(`description: '${v.description.replace(/'/g, "\\'")}'`)
  return `{ ${parts.join(', ')} }`
}
