import { supabase } from '@/lib/supabase'
import { strings } from '@/i18n/pt-BR'

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

async function invoke<T>(payload: Record<string, unknown>): Promise<T> {
  if (!navigator.onLine) throw new AiError(strings.errors.offline, 'offline')

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) throw new AiError(strings.errors.sessionExpired, 'unauthorized')

  const { data, error } = await supabase.functions.invoke<{ data: T }>('ai-generate', {
    body: payload,
  })

  if (error) {
    // FunctionsHttpError expõe a resposta original; é dela que vem nosso código.
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      const body = (await context.json().catch(() => null)) as ErrorBody | null
      const code = body?.error?.code
      if (code) {
        throw new AiError(body?.error?.detail || MESSAGE_BY_CODE[code] || strings.errors.unexpected, code)
      }
    }
    throw new AiError(strings.errors.unexpected, 'unexpected')
  }

  if (!data) throw new AiError(strings.errors.unexpected, 'unexpected')
  return data.data
}

interface ContextRef {
  workspaceId: string
  brandId: string
  productId?: string | null
}

export function parseFreeformIdea(workspaceId: string, idea: string) {
  return invoke<Brief>({ operation: 'parseFreeformIdea', workspaceId, idea })
}

export function completeBrief(ref: ContextRef, brief: Partial<Brief>) {
  return invoke<Brief>({ operation: 'completeBrief', ...ref, brief })
}

export function generateAngles(ref: ContextRef, brief: Partial<Brief>) {
  return invoke<{ angles: Angle[] }>({ operation: 'generateAngles', ...ref, brief })
}

export function generateHooks(
  ref: ContextRef,
  brief: Partial<Brief>,
  angle: { type: string; description: string },
) {
  return invoke<{ hooks: Hook[] }>({ operation: 'generateHooks', ...ref, brief, angle })
}

export function generateScript(
  ref: ContextRef,
  brief: Partial<Brief>,
  angle: { type: string; description: string },
  hook: string,
) {
  return invoke<GeneratedScript>({ operation: 'generateScript', ...ref, brief, angle, hook })
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
) {
  return invoke<RewriteResult>({
    operation: 'rewriteSection',
    ...ref,
    instruction,
    target,
    surrounding,
  })
}

export function generateVariations(
  ref: ContextRef,
  script: { title: string; hook: string; cta: string; scenes: string[] },
  count: number,
) {
  return invoke<{ variations: VariationDraftFromAi[] }>({
    operation: 'generateVariations',
    ...ref,
    script,
    count,
  })
}
