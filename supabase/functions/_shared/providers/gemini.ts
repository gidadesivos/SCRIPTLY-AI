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
    try {
      const result = await callGemini(API_KEY as string, options)
      return {
        text: result.text,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        provider: 'gemini',
        model: AI_MODEL,
      }
    } catch (error) {
      if (error instanceof GeminiError) {
        throw new ProviderError('gemini', classify(error), error.message, error.status)
      }
      throw new ProviderError('gemini', 'upstream', (error as Error).message, null)
    }
  },
}
