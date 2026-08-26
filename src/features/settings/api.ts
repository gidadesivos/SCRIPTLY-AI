import { supabase } from '@/lib/supabase'
import { NotAllowedError } from '@/features/scripts/api'
import type { ProviderName } from '@/lib/ai'

export interface PlanUsage {
  plan: string
  label: string
  description: string
  /** null = sem limite. */
  generationsPerMinute: number | null
  generationsPerMonth: number | null
  usedThisMonth: number
}

interface PlanRow {
  plan: string
  plan_limits: {
    label: string
    description: string
    generations_per_minute: number | null
    generations_per_month: number | null
  }
}

/**
 * Plano do workspace mais o consumo do mês.
 *
 * A contagem vem da função workspace_generations_this_month, a MESMA que o rate
 * limit usa. Contar aqui com um SQL parecido faria a tela e a regra divergirem
 * com o tempo, e um usuário barrado veria "12 de 30" na tela.
 */
export async function fetchPlanUsage(workspaceId: string): Promise<PlanUsage> {
  const [planResult, usageResult] = await Promise.all([
    supabase
      .from('workspaces')
      .select(
        'plan, plan_limits!inner(label, description, generations_per_minute, generations_per_month)',
      )
      .eq('id', workspaceId)
      .single<PlanRow>(),
    supabase.rpc('workspace_generations_this_month', { p_workspace_id: workspaceId }),
  ])

  if (planResult.error) throw planResult.error
  if (usageResult.error) throw usageResult.error

  const limits = planResult.data.plan_limits
  return {
    plan: planResult.data.plan,
    label: limits.label,
    description: limits.description,
    generationsPerMinute: limits.generations_per_minute,
    generationsPerMonth: limits.generations_per_month,
    usedThisMonth: (usageResult.data as number | null) ?? 0,
  }
}

export interface ProviderUsageRow {
  provider: string
  total: number
  sucessos: number
  quota: number
  erros: number
  input_tokens: number
  output_tokens: number
  media_ms: number
}

/** Consumo por provedor nos últimos N dias, contado pelo banco. */
export async function fetchProviderUsage(
  workspaceId: string,
  days = 30,
): Promise<ProviderUsageRow[]> {
  const { data, error } = await supabase.rpc('provider_usage', {
    p_workspace_id: workspaceId,
    p_days: days,
  })

  if (error) throw error
  return (data as ProviderUsageRow[] | null) ?? []
}

export interface DailyUsageRow {
  dia: string
  provider: string
  total: number
  falhas: number
}

/** Gerações por dia. Responde "estou acelerando?", que o total do mês esconde. */
export async function fetchDailyUsage(workspaceId: string, days = 30): Promise<DailyUsageRow[]> {
  const { data, error } = await supabase.rpc('daily_ai_usage', {
    p_workspace_id: workspaceId,
    p_days: days,
  })

  if (error) throw error
  return (data as DailyUsageRow[] | null) ?? []
}

export interface WorkspaceModel {
  id: string
  provider: string
  model_id: string
  label: string
  position: number
  enabled: boolean
}

export async function listWorkspaceModels(workspaceId: string): Promise<WorkspaceModel[]> {
  const { data, error } = await supabase
    .from('workspace_ai_models')
    .select('id, provider, model_id, label, position, enabled')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true })
    .returns<WorkspaceModel[]>()

  if (error) throw error
  return data
}

export async function addWorkspaceModel(input: {
  workspaceId: string
  provider: ProviderName
  modelId: string
  label: string
  position: number
}): Promise<void> {
  const { data, error } = await supabase
    .from('workspace_ai_models')
    .insert({
      workspace_id: input.workspaceId,
      provider: input.provider,
      model_id: input.modelId,
      label: input.label,
      position: input.position,
    })
    .select('id')

  if (error) throw error
  if (!data?.length) {
    throw new NotAllowedError('Só owner e admin podem mudar os modelos do workspace.')
  }
}

export async function removeWorkspaceModel(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('workspace_ai_models')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) throw error
  if (!data?.length) {
    throw new NotAllowedError('Só owner e admin podem mudar os modelos do workspace.')
  }
}

/** Reordena a cadeia. Posições não têm restrição de unicidade: paralelo é seguro. */
export async function reorderWorkspaceModels(
  ordered: Array<{ id: string; position: number }>,
): Promise<void> {
  const results = await Promise.all(
    ordered.map(({ id, position }) =>
      supabase.from('workspace_ai_models').update({ position }).eq('id', id),
    ),
  )
  const failed = results.find((result) => result.error)
  if (failed?.error) throw failed.error
}
