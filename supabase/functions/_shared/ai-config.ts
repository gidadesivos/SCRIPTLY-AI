/**
 * Ponto único de configuração da IA (§7.5).
 * O nome do modelo aparece SÓ aqui — não replicar em prompt nem em operação.
 */

/**
 * gemini-2.5-flash foi descontinuado para contas novas: a API responde
 * "no longer available to new users" e manda usar a 3.6. Trocado depois de
 * ver esse erro na telemetria de ai_generations.
 */
export const AI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash'

export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export const REQUEST_TIMEOUT_MS = 30_000

/** Retry só em 429/5xx/timeout, com backoff exponencial. */
export const MAX_RETRIES = 2
export const RETRY_BASE_DELAY_MS = 600

/** Uma única tentativa de reparo quando o Zod recusa a saída (§7.2 do pipeline). */
export const MAX_REPAIR_ATTEMPTS = 1

export const RATE_LIMIT = {
  perUserPerMinute: 20,
  perWorkspacePerMinute: 60,
} as const

export type OperationName =
  | 'parseFreeformIdea'
  | 'completeBrief'
  | 'generateAngles'
  | 'generateHooks'
  | 'generateScript'
  | 'rewriteSection'
  | 'generateVariations'

/**
 * Temperatura por operação: extração precisa ser literal, criação precisa variar.
 */
export const TEMPERATURE: Record<OperationName, number> = {
  parseFreeformIdea: 0.1,
  completeBrief: 0.4,
  generateAngles: 0.9,
  generateHooks: 1.0,
  generateScript: 0.7,
  // Cirúrgico: baixa temperatura, para alterar o alvo sem reinventar o resto.
  rewriteSection: 0.5,
  generateVariations: 0.9,
}

export const MAX_OUTPUT_TOKENS: Record<OperationName, number> = {
  parseFreeformIdea: 1024,
  completeBrief: 2048,
  generateAngles: 4096,
  generateHooks: 4096,
  generateScript: 8192,
  rewriteSection: 1024,
  generateVariations: 8192,
}

/** Anti-repetição (§7.4): quantos títulos/textos recentes enviar como "evite". */
export const ANTI_REPETITION_SAMPLE = 30
