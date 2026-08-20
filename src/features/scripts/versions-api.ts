import { supabase } from '@/lib/supabase'
import { getScriptWithScenes, type Scene, type Script } from '@/features/scripts/api'
import type { Database, ScriptSnapshot } from '@/types/database'

export type ScriptVersion = Database['public']['Tables']['script_versions']['Row']
export type ScriptVariation = Database['public']['Tables']['script_variations']['Row']

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('not authenticated')
  return data.user.id
}

function toSnapshot(script: Script, scenes: Scene[]): ScriptSnapshot {
  return {
    script: {
      title: script.title,
      description: script.description,
      hook_text: script.hook_text,
      hook_category: script.hook_category,
      hook_score: script.hook_score,
      cta: script.cta,
      framework: script.framework,
      strategy_summary: script.strategy_summary,
      tone: script.tone,
      objective: script.objective,
      target_audience: script.target_audience,
      pain: script.pain,
      desire: script.desire,
      promise: script.promise,
      duration_seconds: script.duration_seconds,
      platform: script.platform,
      funnel_stage: script.funnel_stage,
    },
    scenes: scenes.map((scene) => ({
      order_index: scene.order_index,
      purpose: scene.purpose,
      shot: scene.shot,
      visual: scene.visual,
      action: scene.action,
      voiceover: scene.voiceover,
      on_screen_text: scene.on_screen_text,
      broll: scene.broll,
      editing_direction: scene.editing_direction,
      transition: scene.transition,
      sound_suggestion: scene.sound_suggestion,
    })),
  }
}

/**
 * Versão só em marcos (§9): geração, regeneração, mudança grande e antes de
 * restaurar. O autosave NUNCA chama isto.
 */
export async function createVersion(
  scriptId: string,
  changeDescription: string,
): Promise<number> {
  const { script, scenes } = await getScriptWithScenes(scriptId)
  const { data, error } = await supabase.rpc('create_script_version', {
    p_script_id: scriptId,
    p_snapshot: toSnapshot(script, scenes),
    p_change_description: changeDescription,
  })
  if (error) throw error
  return data
}

export async function listVersions(scriptId: string): Promise<ScriptVersion[]> {
  const { data, error } = await supabase
    .from('script_versions')
    .select('*')
    .eq('script_id', scriptId)
    .order('version_number', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Restaura um snapshot via RPC, em UMA transação.
 * Cria uma versão do estado atual ANTES de sobrescrever, senão restaurar por
 * engano seria irreversível. A troca das cenas é atômica: apagar e reinserir
 * em requests separados deixaria o roteiro sem cenas se o insert falhasse.
 */
export async function restoreVersion(scriptId: string, version: ScriptVersion): Promise<void> {
  await createVersion(scriptId, `Antes de restaurar a versão ${version.version_number}`)

  const { error } = await supabase.rpc('restore_script_version', {
    p_script_id: scriptId,
    p_version_id: version.id,
  })
  if (error) throw error
}

/** Cópia independente: novo id, sem vínculo com o original. */
export async function duplicateScript(scriptId: string): Promise<string> {
  const { script, scenes } = await getScriptWithScenes(scriptId)
  const userId = await currentUserId()

  const {
    id: _id,
    created_at: _c,
    updated_at: _u,
    brand: _brand,
    published_at: _p,
    scheduled_at: _s,
    ...rest
  } = script

  const { data: copy, error } = await supabase
    .from('scripts')
    .insert({
      ...rest,
      title: `${script.title} (cópia)`,
      status: 'roteiro',
      created_by: userId,
    })
    .select('id')
    .single()

  if (error) throw error

  if (scenes.length > 0) {
    const { error: scenesError } = await supabase.from('script_scenes').insert(
      scenes.map(({ id: _sid, created_at: _sc, updated_at: _su, ...scene }) => ({
        ...scene,
        script_id: copy.id,
      })),
    )
    if (scenesError) {
      await supabase.from('scripts').delete().eq('id', copy.id)
      throw scenesError
    }
  }

  return copy.id
}

export async function listVariations(parentScriptId: string): Promise<
  Array<ScriptVariation & { variation: { id: string; title: string; status: string } | null }>
> {
  const { data, error } = await supabase
    .from('script_variations')
    .select('*, variation:scripts!script_variations_variation_script_id_fkey(id, title, status)')
    .eq('parent_script_id', parentScriptId)
    .order('label', { ascending: true })

  if (error) throw error
  return data as unknown as Array<
    ScriptVariation & { variation: { id: string; title: string; status: string } | null }
  >
}

export interface VariationDraft {
  label: string
  title: string
  hook: string
  cta: string
  hypothesis: string
  scenes: Array<{ voiceover: string; on_screen_text: string }>
}

/**
 * Cria a variação como roteiro real e registra a relação com o original.
 * O original não é tocado em momento nenhum (§13 passo 14).
 */
export async function createVariation(
  parentScriptId: string,
  draft: VariationDraft,
): Promise<string> {
  const { script, scenes } = await getScriptWithScenes(parentScriptId)
  const userId = await currentUserId()

  const {
    id: _id,
    created_at: _c,
    updated_at: _u,
    brand: _brand,
    published_at: _p,
    scheduled_at: _s,
    ...rest
  } = script

  const { data: variationScript, error } = await supabase
    .from('scripts')
    .insert({
      ...rest,
      title: draft.title,
      hook_text: draft.hook || script.hook_text,
      cta: draft.cta || script.cta,
      // Score do original não vale para outro hook: zerar é mais honesto (§7.3).
      hook_score: null,
      strategy_summary: draft.hypothesis,
      status: 'roteiro',
      created_by: userId,
    })
    .select('id')
    .single()

  if (error) throw error

  // Mantém direção visual do original e troca só o texto, que é o que varia.
  const newScenes = draft.scenes.map((scene, index) => {
    const base = scenes[index]
    return {
      workspace_id: script.workspace_id,
      script_id: variationScript.id,
      order_index: index,
      purpose: base?.purpose ?? null,
      shot: base?.shot ?? null,
      visual: base?.visual ?? null,
      action: base?.action ?? null,
      broll: base?.broll ?? null,
      editing_direction: base?.editing_direction ?? null,
      transition: base?.transition ?? null,
      sound_suggestion: base?.sound_suggestion ?? null,
      voiceover: scene.voiceover || null,
      on_screen_text: scene.on_screen_text || null,
    }
  })

  const { error: scenesError } = await supabase.from('script_scenes').insert(newScenes)
  if (scenesError) {
    await supabase.from('scripts').delete().eq('id', variationScript.id)
    throw scenesError
  }

  const { error: linkError } = await supabase.from('script_variations').insert({
    workspace_id: script.workspace_id,
    parent_script_id: parentScriptId,
    variation_script_id: variationScript.id,
    label: draft.label,
    created_by: userId,
  })

  if (linkError) {
    await supabase.from('scripts').delete().eq('id', variationScript.id)
    throw linkError
  }

  return variationScript.id
}
