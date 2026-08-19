import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { RATE_LIMIT } from './ai-config.ts'

export interface RateLimitVerdict {
  allowed: boolean
  scope?: 'user' | 'workspace'
  retryAfterSeconds?: number
}

/**
 * Conta gerações na última janela de 60s (§7.6). Usa ai_generations como fonte:
 * a mesma tabela da telemetria, sem estado extra para manter sincronizado.
 */
export async function checkRateLimit(
  admin: SupabaseClient,
  userId: string,
  workspaceId: string,
): Promise<RateLimitVerdict> {
  const windowStart = new Date(Date.now() - 60_000).toISOString()

  const [userCount, workspaceCount] = await Promise.all([
    admin
      .from('ai_generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', windowStart),
    admin
      .from('ai_generations')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', windowStart),
  ])

  if ((userCount.count ?? 0) >= RATE_LIMIT.perUserPerMinute) {
    return { allowed: false, scope: 'user', retryAfterSeconds: 60 }
  }
  if ((workspaceCount.count ?? 0) >= RATE_LIMIT.perWorkspacePerMinute) {
    return { allowed: false, scope: 'workspace', retryAfterSeconds: 60 }
  }

  return { allowed: true }
}

export interface TelemetryEntry {
  workspaceId: string
  userId: string
  generationType: string
  promptVersion: string
  model: string
  status: 'success' | 'invalid_output' | 'error' | 'rate_limited'
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
