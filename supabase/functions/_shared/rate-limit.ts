import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/**
 * Limites vindos do plano do workspace. null = sem limite.
 *
 * Nada aqui é constante no código: os números moram em plan_limits, no banco,
 * para que a tela de assinatura mostre exatamente o que o rate limit aplica e
 * mudar um limite não exija deploy desta function.
 */
export interface PlanLimits {
  plan: string
  label: string
  generationsPerMinute: number | null
  generationsPerMonth: number | null
}

export interface RateLimitVerdict {
  allowed: boolean
  plan: PlanLimits
  /** Qual janela estourou. Só vem quando allowed é false. */
  scope?: 'minute' | 'month'
  used?: number
  limit?: number
  retryAfterSeconds?: number
}

interface PlanRow {
  plan: string
  plan_limits: {
    label: string
    generations_per_minute: number | null
    generations_per_month: number | null
  }
}

/** Segundos até o primeiro instante do mês que vem, para o Retry-After mensal. */
function secondsUntilNextMonth(): number {
  const now = new Date()
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000))
}

export async function loadPlan(
  admin: SupabaseClient,
  workspaceId: string,
): Promise<PlanLimits> {
  const { data, error } = await admin
    .from('workspaces')
    .select('plan, plan_limits!inner(label, generations_per_minute, generations_per_month)')
    .eq('id', workspaceId)
    .single<PlanRow>()

  if (error || !data) {
    throw new Error(`Não foi possível ler o plano do workspace: ${error?.message ?? 'sem dados'}`)
  }

  return {
    plan: data.plan,
    label: data.plan_limits.label,
    generationsPerMinute: data.plan_limits.generations_per_minute,
    generationsPerMonth: data.plan_limits.generations_per_month,
  }
}

/**
 * Aplica os limites do plano (§7.6). Fonte de contagem: ai_generations, a mesma
 * tabela da telemetria, sem estado extra para manter sincronizado.
 *
 * Duas decisões que valem explicar:
 *
 * - O escopo é o workspace, não o usuário. Antes havia também um teto por
 *   usuário, com um número inventado no código; com plano, o workspace é quem
 *   tem cota, e quem divide entre os membros é o dono dele.
 *
 * - Geração recusada não consome cota. Sem esse filtro, bater no limite
 *   prolongava o bloqueio: as próprias recusas contavam para o minuto seguinte.
 */
export async function checkRateLimit(
  admin: SupabaseClient,
  workspaceId: string,
): Promise<RateLimitVerdict> {
  const plan = await loadPlan(admin, workspaceId)

  // Plano ilimitado nem consulta: o caminho mais caro do produto é também o
  // que menos pergunta ao banco.
  if (plan.generationsPerMinute === null && plan.generationsPerMonth === null) {
    return { allowed: true, plan }
  }

  const minuteStart = new Date(Date.now() - 60_000).toISOString()
  const monthStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
  ).toISOString()

  const [minuteCount, monthCount] = await Promise.all([
    plan.generationsPerMinute === null
      ? Promise.resolve({ count: 0 })
      : admin
          .from('ai_generations')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .neq('status', 'rate_limited')
          .gte('created_at', minuteStart),
    plan.generationsPerMonth === null
      ? Promise.resolve({ count: 0 })
      : admin
          .from('ai_generations')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .neq('status', 'rate_limited')
          .gte('created_at', monthStart),
  ])

  const usedThisMinute = minuteCount.count ?? 0
  const usedThisMonth = monthCount.count ?? 0

  if (plan.generationsPerMonth !== null && usedThisMonth >= plan.generationsPerMonth) {
    return {
      allowed: false,
      plan,
      scope: 'month',
      used: usedThisMonth,
      limit: plan.generationsPerMonth,
      retryAfterSeconds: secondsUntilNextMonth(),
    }
  }

  if (plan.generationsPerMinute !== null && usedThisMinute >= plan.generationsPerMinute) {
    return {
      allowed: false,
      plan,
      scope: 'minute',
      used: usedThisMinute,
      limit: plan.generationsPerMinute,
      retryAfterSeconds: 60,
    }
  }

  return { allowed: true, plan }
}

export interface TelemetryEntry {
  workspaceId: string
  userId: string
  generationType: string
  promptVersion: string
  model: string
  /** Quem atendeu. Default no banco é 'gemini', para as linhas antigas. */
  provider?: string
  status: 'success' | 'invalid_output' | 'error' | 'rate_limited' | 'quota_exceeded'
  latencyMs?: number
  inputTokens?: number | null
  outputTokens?: number | null
  errorMessage?: string
  relatedEntityType?: string
  relatedEntityId?: string
}

/** Telemetria nunca deve derrubar a requisição — falha aqui é só log. */
export async function recordGeneration(admin: SupabaseClient, entry: TelemetryEntry) {
  const { error } = await admin.from('ai_generations').insert({
    workspace_id: entry.workspaceId,
    user_id: entry.userId,
    generation_type: entry.generationType,
    prompt_version: entry.promptVersion,
    model: entry.model,
    provider: entry.provider ?? 'gemini',
    status: entry.status,
    latency_ms: entry.latencyMs ?? null,
    input_tokens: entry.inputTokens ?? null,
    output_tokens: entry.outputTokens ?? null,
    // Truncado: mensagem de erro não deve virar dump de payload.
    error_message: entry.errorMessage?.slice(0, 500) ?? null,
    related_entity_type: entry.relatedEntityType ?? null,
    related_entity_id: entry.relatedEntityId ?? null,
  })

  if (error) console.error('Falha ao gravar telemetria:', error.message)
}
