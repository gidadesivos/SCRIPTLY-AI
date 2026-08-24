import { supabase } from '@/lib/supabase'

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
