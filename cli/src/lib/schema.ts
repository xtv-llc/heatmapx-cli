import { z } from 'zod'

export const VariantSchema = z.object({
  name: z.string().min(1, 'variant.name is required'),
  description: z.string().optional(),
})

export const HeatmapConfigSchema = z.object({
  site: z.string().url('site must be a valid URL'),
  page: z.string().min(1, 'page is required'),
  goal: z.string().min(1, 'goal is required'),
  variants: z.array(VariantSchema).min(1, 'at least one variant required'),
  targets: z.array(z.string()).default([]),
})

export type HeatmapConfig = z.infer<typeof HeatmapConfigSchema>

/**
 * Optional identity helper. heatmap.config.ts は素のオブジェクトを default export すれば動く
 * （CLI は ts-morph で静的にパースするため import 不要）。両形式を受け付ける:
 *
 *   export default { site: ..., ... }                       // 推奨（import不要）
 *   export default defineHypothesis({ site: ..., ... })     // 後方互換
 *
 * No runtime validation here — validation happens when the CLI loads the file.
 */
export function defineHypothesis<T extends HeatmapConfig>(config: T): T {
  return config
}
