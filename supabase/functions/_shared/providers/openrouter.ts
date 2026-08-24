import { OPENROUTER_MODELS, REQUEST_TIMEOUT_MS } from '../ai-config.ts'
import type { GeminiSchema } from '../gemini.ts'
import { ProviderError, type CallOptions, type Provider, type ProviderResult } from './types.ts'

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const KEY_URL = 'https://openrouter.ai/api/v1/key'

const API_KEY = Deno.env.get('OPENROUTER_API_KEY')

/**
 * O OpenRouter identifica o app que chama por estes headers, e é o que faz o
 * consumo aparecer nomeado no painel dele em vez de "unknown".
 */
const APP_URL = Deno.env.get('OPENROUTER_APP_URL') ?? 'https://scriptly.ai'
const APP_NAME = 'Scriptly AI'

interface ChatResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  model?: string
  error?: { message?: string; code?: number }
}

/**
 * Converte o schema do Gemini para JSON Schema.
 *
 * O Gemini usa tipos em MAIÚSCULAS ('STRING', 'OBJECT'); o resto do mundo usa
 * minúsculas. Converter aqui, e não manter dois schemas por operação, evita que
 * eles saiam de sincronia — que é como um provedor começa a devolver um formato
 * diferente do outro sem ninguém perceber.
 */
function toJsonSchema(schema: GeminiSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { type: schema.type.toLowerCase() }

  if (schema.description) out.description = schema.description
  if (schema.enum) out.enum = schema.enum
  if (schema.items) out.items = toJsonSchema(schema.items)

  if (schema.properties) {
    const properties: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(schema.properties)) {
      properties[key] = toJsonSchema(value)
    }
    out.properties = properties

    // strict exige que TODA propriedade esteja em required e que
    // additionalProperties seja false. Campos que o Gemini tratava como
    // opcionais viram obrigatórios aqui — o Zod do pipeline já dá default para
    // vazio, então isso não muda o resultado final.
    out.required = Object.keys(schema.properties)
    out.additionalProperties = false
  }

  return out
}

function classify(status: number, message: string): ProviderError['kind'] {
  // 402 é a resposta do OpenRouter para crédito acabado — específica dele,
  // diferente do 429 de excesso momentâneo.
  if (status === 402) return 'quota'
  if (status === 429) return 'rate_limit'
  if (status === 401 || status === 403 || status === 404 || status === 400) return 'config'
  if (status >= 500) return 'upstream'
  return 'upstream'
}

export const openRouterProvider: Provider = {
  name: 'openrouter',

  isConfigured() {
    return Boolean(API_KEY)
  },

  async call(options: CallOptions): Promise<ProviderResult> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': APP_URL,
          'X-Title': APP_NAME,
        },
        signal: controller.signal,
        body: JSON.stringify({
          // Lista, não modelo único: o OpenRouter percorre em ordem quando um
          // está fora ou recusa. É a cadeia de fallback dele, dentro da nossa.
          models: OPENROUTER_MODELS,
          messages: [
            { role: 'system', content: options.systemInstruction },
            { role: 'user', content: options.userPrompt },
          ],
          temperature: options.temperature,
          max_tokens: options.maxOutputTokens,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'resposta',
              strict: true,
              schema: toJsonSchema(options.responseSchema),
            },
          },
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ChatResponse | null
        const message = body?.error?.message ?? `OpenRouter respondeu ${response.status}`
        throw new ProviderError(
          'openrouter',
          classify(response.status, message),
          message,
          response.status,
        )
      }

      const body = (await response.json()) as ChatResponse

      // O OpenRouter pode responder 200 com erro no corpo quando a falha veio
      // do modelo lá atrás, e não dele.
      if (body.error) {
        throw new ProviderError(
          'openrouter',
          classify(body.error.code ?? 500, body.error.message ?? ''),
          body.error.message ?? 'Erro do OpenRouter',
          body.error.code ?? null,
        )
      }

      const text = body.choices?.[0]?.message?.content ?? ''
      if (!text) {
        throw new ProviderError(
          'openrouter',
          'empty',
          `Resposta vazia (finish_reason: ${body.choices?.[0]?.finish_reason ?? 'desconhecido'})`,
          null,
        )
      }

      return {
        text,
        inputTokens: body.usage?.prompt_tokens ?? null,
        outputTokens: body.usage?.completion_tokens ?? null,
        provider: 'openrouter',
        // Qual modelo da lista atendeu — o OpenRouter informa na resposta.
        model: body.model ?? OPENROUTER_MODELS[0],
      }
    } catch (error) {
      if (error instanceof ProviderError) throw error
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ProviderError('openrouter', 'timeout', 'Tempo esgotado no OpenRouter.', null)
      }
      throw new ProviderError('openrouter', 'upstream', (error as Error).message, null)
    } finally {
      clearTimeout(timeout)
    }
  },
}

export interface OpenRouterQuota {
  /** Teto de crédito da chave. null = sem teto definido. */
  limit: number | null
  /** Quanto ainda dá para gastar. null quando não há teto. */
  limitRemaining: number | null
  /** Total já consumido pela chave. */
  usage: number | null
  isFreeTier: boolean
}

/**
 * Saldo real da chave, direto do OpenRouter.
 *
 * É o que o Gemini não oferece: lá só dá para contar o que a gente gastou e
 * esperar o 429. Aqui a tela consegue mostrar quanto falta ANTES de acabar.
 */
export async function fetchOpenRouterQuota(): Promise<OpenRouterQuota | null> {
  if (!API_KEY) return null

  const response = await fetch(KEY_URL, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })

  if (!response.ok) {
    throw new Error(`OpenRouter respondeu ${response.status} ao consultar a chave.`)
  }

  const body = (await response.json()) as {
    data?: {
      limit?: number | null
      limit_remaining?: number | null
      usage?: number | null
      is_free_tier?: boolean
    }
  }

  return {
    limit: body.data?.limit ?? null,
    limitRemaining: body.data?.limit_remaining ?? null,
    usage: body.data?.usage ?? null,
    isFreeTier: Boolean(body.data?.is_free_tier),
  }
}
