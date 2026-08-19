import { supabase } from '@/lib/supabase'
import type { GeneratedScene } from '@/lib/ai'
import type { Database, FunnelStage, Platform } from '@/types/database'

export type Script = Database['public']['Tables']['scripts']['Row']
export type Scene = Database['public']['Tables']['script_scenes']['Row']
export type ScriptWithBrand = Script & { brand: { id: string; name: string } | null }

export async function getScriptWithScenes(
  id: string,
): Promise<{ script: ScriptWithBrand; scenes: Scene[] }> {
  const [scriptResult, scenesResult] = await Promise.all([
    supabase.from('scripts').select('*, brand:brands(id, name)').eq('id', id).single(),
    supabase
      .from('script_scenes')
      .select('*')
      .eq('script_id', id)
      .order('order_index', { ascending: true }),
  ])

  if (scriptResult.error) throw scriptResult.error
  if (scenesResult.error) throw scenesResult.error

  return {
    script: scriptResult.data as unknown as ScriptWithBrand,
    scenes: scenesResult.data,
  }
}

export async function updateScriptStatus(id: string, status: Script['status']) {
  const { error } = await supabase.from('scripts').update({ status }).eq('id', id)
  if (error) throw error
}

export interface SaveScriptInput {
  workspaceId: string
  brandId: string
  productId: string | null
  title: string
  description: string
  platform: Platform
  objective: string
  funnelStage: FunnelStage | null
  durationSeconds: number
  tone: string
  targetAudience: string
  pain: string
  desire: string
  promise: string
  angleType: string
  angleDescription: string
  hookText: string
  hookCategory: string
  hookScore: number | null
  framework: string
  cta: string
  strategySummary: string
  scenes: GeneratedScene[]
}

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/**
 * Grava roteiro + cenas. Se as cenas falharem, o roteiro órfão é removido:
 * melhor não deixar um roteiro sem corpo no banco (§7.2 — nada parcial).
 */
export async function saveScript(input: SaveScriptInput): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('not authenticated')

  const { data: script, error: scriptError } = await supabase
    .from('scripts')
    .insert({
      workspace_id: input.workspaceId,
      brand_id: input.brandId,
      product_id: input.productId,
      created_by: userData.user.id,
      title: input.title.trim(),
      description: emptyToNull(input.description),
      platform: input.platform,
      objective: emptyToNull(input.objective),
      funnel_stage: input.funnelStage,
      duration_seconds: input.durationSeconds,
      tone: emptyToNull(input.tone),
      target_audience: emptyToNull(input.targetAudience),
      pain: emptyToNull(input.pain),
      desire: emptyToNull(input.desire),
      promise: emptyToNull(input.promise),
      angle_type: emptyToNull(input.angleType),
      angle_description: emptyToNull(input.angleDescription),
      hook_text: emptyToNull(input.hookText),
      hook_category: emptyToNull(input.hookCategory),
      hook_score: input.hookScore,
      framework: emptyToNull(input.framework),
      cta: emptyToNull(input.cta),
      strategy_summary: emptyToNull(input.strategySummary),
      status: 'roteiro',
    })
    .select('id')
    .single()

  if (scriptError) throw scriptError

  const scenes = input.scenes.map((scene, index) => ({
    workspace_id: input.workspaceId,
    script_id: script.id,
    order_index: index,
    purpose: emptyToNull(scene.purpose),
    shot: emptyToNull(scene.shot),
    visual: emptyToNull(scene.visual),
    action: emptyToNull(scene.action),
    voiceover: emptyToNull(scene.voiceover),
    on_screen_text: emptyToNull(scene.on_screen_text),
    broll: emptyToNull(scene.broll),
    editing_direction: emptyToNull(scene.editing_direction),
    transition: emptyToNull(scene.transition),
    sound_suggestion: emptyToNull(scene.sound_suggestion),
  }))

  const { error: scenesError } = await supabase.from('script_scenes').insert(scenes)

  if (scenesError) {
    await supabase.from('scripts').delete().eq('id', script.id)
    throw scenesError
  }

  return script.id
}
