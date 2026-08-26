import { supabase } from '@/lib/supabase'
import { strings } from '@/i18n/pt-BR'

/**
 * Quem atende a chamada de IA. Espelha o ProviderName da Edge Function.
 *
 * Fica num lugar só de propósito: esta união estava repetida em quatro
 * arquivos com DUAS definições diferentes, e a divergência quebrou o build —
 * o seletor oferecia 'gemini' para uma função que só aceitava os outros dois.
 */
export type ProviderName = 'gemini' | 'openrouter' | 'groq'

/** Referência ao modelo explícito escolhido pelo usuário. */
export interface ModelRef {
  provider: ProviderName
  modelId: string
}

export interface Brief {
  title: string
  description: string
  target_audience: string
  pain: string
  desire: string
  promise: string
  objective: string
  tone: string
}

export interface Angle {
  type: string
  title: string
  description: string
  rationale: string
}

export interface Hook {
  text: string
  category: string
  score: number
  subscores: Record<string, number>
  strength: string
  issue: string
  recommendation: string
}

export interface GeneratedScene {
  purpose: string
  shot: string
  visual: string
  action: string
  voiceover: string
  on_screen_text: string
  broll: string
  editing_direction: string
  transition: string
  sound_suggestion: string
}

export interface GeneratedScript {
  title: string
  framework: string
  cta: string
  strategy_summary: string
  scenes: GeneratedScene[]
}

/** Erro já traduzido para exibição direta na UI. */
export class AiError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'AiError'
    this.code = code
  }
}

const MESSAGE_BY_CODE: Record<string, string> = {
  unauthorized: strings.errors.sessionExpired,
  forbidden: strings.errors.forbidden,
  invalid_request: strings.errors.unexpected,
  rate_limited: strings.aiErrors.rateLimited,
  ai_unavailable: strings.aiErrors.unavailable,
  invalid_ai_output: strings.aiErrors.invalidOutput,
  unexpected: strings.errors.unexpected,
}

interface ErrorBody {
  error?: { code?: string; detail?: string }
}

function isResponse(value: unknown): value is Response {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as Response).json === 'function'
  )
}

async function invoke<T>(payload: Record<string, unknown>): Promise<T> {
  if (!navigator.onLine) throw new AiError(strings.errors.offline, 'offline')

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) throw new AiError(strings.errors.sessionExpired, 'unauthorized')

  const { data, error } = await supabase.functions.invoke<{ data: T }>('ai-generate', {
    body: payload,
  })

  if (error) {
    // O erro real nunca deve sumir: sem isto, "algo deu errado" não dá para depurar.
    console.error('[ai-generate] falha na invocação:', error)

    const context = (error as { context?: unknown }).context

    // FunctionsHttpError: non-2xx. context é a Response, e é dela que vem nosso código.
    if (isResponse(context)) {
      const body = (await context.json().catch(() => null)) as ErrorBody | null
      const code = body?.error?.code

      if (code) {
        throw new AiError(
          body?.error?.detail || MESSAGE_BY_CODE[code] || strings.errors.unexpected,
          code,
        )
      }

      // Sem corpo reconhecível: o status já diz muito.
      if (context.status === 404) {
        throw new AiError(strings.aiErrors.notDeployed, 'not_deployed')
      }
      if (context.status === 401 || context.status === 403) {
        throw new AiError(strings.errors.sessionExpired, 'unauthorized')
      }
      throw new AiError(
        `${strings.aiErrors.functionFailed} (HTTP ${context.status})`,
        'function_error',
      )
    }

    // FunctionsFetchError / FunctionsRelayError: a requisição nem chegou à function.
    // Na prática isso é function não publicada, CORS ou rede.
    throw new AiError(strings.aiErrors.notDeployed, 'not_deployed')
  }

  if (!data) throw new AiError(strings.errors.unexpected, 'unexpected')
  return data.data
}

interface ContextRef {
  workspaceId: string
  brandId: string
  productId?: string | null
}

export function parseFreeformIdea(workspaceId: string, idea: string, model?: ModelRef) {
  return invoke<Brief>({ operation: 'parseFreeformIdea', workspaceId, idea, model })
}

export function completeBrief(ref: ContextRef, brief: Partial<Brief>, model?: ModelRef) {
  return invoke<Brief>({ operation: 'completeBrief', ...ref, brief, model })
}

export function generateAngles(ref: ContextRef, brief: Partial<Brief>, model?: ModelRef) {
  return invoke<{ angles: Angle[] }>({ operation: 'generateAngles', ...ref, brief, model })
}

export function generateHooks(
  ref: ContextRef,
  brief: Partial<Brief>,
  angle: { type: string; description: string },
  model?: ModelRef,
) {
  return invoke<{ hooks: Hook[] }>({ operation: 'generateHooks', ...ref, brief, angle, model })
}

export function generateScript(
  ref: ContextRef,
  brief: Partial<Brief>,
  angle: { type: string; description: string },
  hook: string,
  model?: ModelRef,
) {
  return invoke<GeneratedScript>({ operation: 'generateScript', ...ref, brief, angle, hook, model })
}

export interface RewriteResult {
  content: string
  note: string
}

export interface VariationDraftFromAi {
  label: string
  title: string
  hook: string
  cta: string
  hypothesis: string
  scenes: Array<{ voiceover: string; on_screen_text: string }>
}

/** Alteração cirúrgica: devolve só o fragmento do alvo (§7.3). */
export function rewriteSection(
  ref: ContextRef,
  instruction: string,
  target: { label: string; current: string },
  surrounding: string,
  model?: ModelRef,
) {
  return invoke<RewriteResult>({
    operation: 'rewriteSection',
    ...ref,
    instruction,
    target,
    surrounding,
    model,
  })
}

export function generateVariations(
  ref: ContextRef,
  script: { title: string; hook: string; cta: string; scenes: string[] },
  count: number,
  model?: ModelRef,
) {
  return invoke<{ variations: VariationDraftFromAi[] }>({
    operation: 'generateVariations',
    ...ref,
    script,
    count,
    model,
  })
}

export interface AdCopy {
  primary_text: string
  headline: string
  description: string
  cta_suggestion: string
  rationale: string
}

/**
 * Copy de anúncio do Meta a partir de uma descrição curta.
 *
 * scriptContext é a locução do roteiro vinculado, quando existe: é o que faz a
 * copy conversar com o vídeo em vez de repetir a locução.
 */
export function generateAdCopy(
  ref: ContextRef,
  input: { briefing: string; format: string; cta: string; scriptContext: string },
  model?: ModelRef,
) {
  return invoke<AdCopy>({ operation: 'generateAdCopy', ...ref, ...input, model })
}

export interface OpenRouterQuota {
  limit: number | null
  limitRemaining: number | null
  usage: number | null
  isFreeTier: boolean
}

export interface ProviderStatus {
  /** Provedores com chave configurada, na ordem em que a cadeia os tenta. */
  providers: string[]
  /** Saldo real da chave do OpenRouter. null quando ele não está configurado. */
  openRouter: OpenRouterQuota | null
  /** Por que o saldo não veio, quando não veio. */
  openRouterError: string | null
}

/**
 * Estado dos provedores. Não gera nada e não consome cota de geração.
 *
 * Passa pela Edge Function porque a chave do OpenRouter não pode sair do
 * servidor (N2) — consultar o saldo direto do navegador exporia a chave.
 */
export function fetchProviderStatus(workspaceId: string) {
  return invoke<ProviderStatus>({ operation: 'providerStatus', workspaceId })
}

export interface CatalogModel {
  id: string
  name: string
  contextLength: number | null
  /** USD por milhão de tokens. */
  pricePromptPerMillion: number | null
  priceCompletionPerMillion: number | null
  /** null = o catálogo não informou. Diferente de "não suporta". */
  supportsStructured: boolean | null
}

/** Catálogo de modelos. Passa pela Edge Function: a chave não sai do servidor. */
export function listModels(workspaceId: string, provider: ProviderName) {
  return invoke<{ models: CatalogModel[] }>({ operation: 'listModels', workspaceId, provider })
}
