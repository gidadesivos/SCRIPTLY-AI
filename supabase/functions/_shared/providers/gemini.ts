import { AI_MODEL } from '../ai-config.ts'
import { callGemini, GeminiError } from '../gemini.ts'
import { ProviderError, type CallOptions, type Provider, type ProviderResult } from './types.ts'

const API_KEY = Deno.env.get('GEMINI_API_KEY')

/**
 * Traduz o erro do Gemini para a taxonomia da cadeia.
 *
 * O Gemini devolve 429 tanto para "excesso momentâneo" quanto para "sua cota
 * acabou" — a diferença está na mensagem. Separar importa: cota esgotada não
 * volta sozinha, então insistir no mesmo provedor é perder tempo.
 */
function classify(error: GeminiError): ProviderError['kind'] {
  const message = error.message.toLowerCase()

  if (message.includes('exceeded your current quota') || message.includes('billing')) {
    return 'quota'
  }
  if (message.includes('no longer available') || message.includes('not found')) {
    return 'config'
  }
  if (message.includes('tempo esgotado')) return 'timeout'
  if (message.includes('resposta vazia')) return 'empty'

  if (error.status === 429) return 'rate_limit'
  if (error.status === 401 || error.status === 403 || error.status === 400) return 'config'
  if (error.status !== null && error.status >= 500) return 'upstream'

  return 'upstream'
}

export const geminiProvider: Provider = {
  name: 'gemini',

  isConfigured() {
    return Boolean(API_KEY)
  },

  async call(options: CallOptions): Promise<ProviderResult> {
    const modelId = options.geminiModels?.[0] ?? AI_MODEL
    try {
      const result = await callGemini(API_KEY as string, modelId, options)
      return {
        text: result.text,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        provider: 'gemini',
        model: modelId,
      }
    } catch (error) {
      if (error instanceof GeminiError) {
        throw new ProviderError('gemini', classify(error), error.message, error.status)
      }
      throw new ProviderError('gemini', 'upstream', (error as Error).message, null)
    }
  },
}

import type { CatalogModel } from './openrouter.ts'

export async function fetchGeminiCatalog(): Promise<CatalogModel[]> {
  // A API do Gemini até tem um endpoint de modelos, mas a resposta é barulhenta
  // e inclui modelos antigos ou sem suporte a JSON schema estruturado. Como a lista é
  // pequena e os modelos exatos foram pedidos, fixamos aqui.
  return [
    {
      id: 'gemini-3.5-flash',
      name: 'Gemini 3.5 Flash',
      contextLength: 250000,
      pricePromptPerMillion: 0,
      priceCompletionPerMillion: 0,
      supportsStructured: true,
    },
    {
      id: 'gemini-3.6-flash',
      name: 'Gemini 3.6 Flash',
      contextLength: 250000,
      pricePromptPerMillion: 0,
      priceCompletionPerMillion: 0,
      supportsStructured: true,
    },
    {
      id: 'gemini-3.5-flash-lite',
      name: 'Gemini 3.5 Flash Lite',
      contextLength: 250000,
      pricePromptPerMillion: 0,
      priceCompletionPerMillion: 0,
      supportsStructured: true,
    },
    {
      id: 'gemini-3.7-flash',
      name: 'Gemini 3.7 Flash',
      contextLength: 250000,
      pricePromptPerMillion: 0,
      priceCompletionPerMillion: 0,
      supportsStructured: true,
    },
    {
      id: 'gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash Lite',
      contextLength: 250000,
      pricePromptPerMillion: 0,
      priceCompletionPerMillion: 0,
      supportsStructured: true,
    },
  ]
}
