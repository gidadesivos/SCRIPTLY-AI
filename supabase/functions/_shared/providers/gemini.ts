import { AI_MODEL, GEMINI_API_BASE } from '../ai-config.ts'
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

/** Resposta do endpoint de modelos do Gemini. */
interface ListaModelos {
  models?: Array<{
    name?: string
    displayName?: string
    description?: string
    inputTokenLimit?: number
    supportedGenerationMethods?: string[]
  }>
}

/**
 * Só estes quando a API não responde.
 *
 * São os que já geraram com sucesso neste projeto, conferidos na telemetria de
 * ai_generations — e não uma lista escrita de memória. Fallback com modelo
 * inventado é pior que fallback vazio: o usuário escolhe, e só descobre que
 * não existe quando a geração falha.
 */
const GEMINI_CONHECIDOS: CatalogModel[] = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
].map((id) => ({
  id,
  name: id,
  contextLength: null,
  pricePromptPerMillion: null,
  priceCompletionPerMillion: null,
  supportsStructured: null,
}))

/**
 * Catálogo do Gemini, perguntado à API.
 *
 * Era uma lista fixa no código, com o comentário "os modelos exatos foram
 * pedidos". É exatamente isso que envelhece: cada modelo novo do Google exigia
 * editar e publicar a function, e quem escrevesse o identificador de cabeça
 * podia errar — um id errado só aparece na hora em que a geração falha.
 *
 * Perguntando, os identificadores vêm de quem os define, e modelo novo aparece
 * sozinho. Filtra por generateContent porque embedding e outros não servem aqui.
 */
export async function fetchGeminiCatalog(): Promise<CatalogModel[]> {
  if (!API_KEY) return []

  try {
    const resposta = await fetch(`${GEMINI_API_BASE}/models?key=${API_KEY}&pageSize=200`)
    if (!resposta.ok) {
      console.error(`[gemini] catálogo respondeu ${resposta.status}; usando a lista conhecida.`)
      return GEMINI_CONHECIDOS
    }

    const corpo = (await resposta.json()) as ListaModelos
    const modelos = (corpo.models ?? [])
      .filter((m) => m.name && m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => ({
        // Vem como "models/gemini-3.5-flash"; o resto do código usa o id puro.
        id: m.name!.replace(/^models\//, ''),
        name: m.displayName || m.name!.replace(/^models\//, ''),
        contextLength: m.inputTokenLimit ?? null,
        // O Gemini não cobra por token nesta listagem e não publica preço aqui.
        pricePromptPerMillion: null,
        priceCompletionPerMillion: null,
        /*
         * null, e não true: a listagem não diz se o modelo aceita
         * responseSchema. Afirmar que aceita esconderia justamente o caso em
         * que ele não aceita — os Gemma, por exemplo, são de outra família.
         */
        supportsStructured: null,
      }))

    return modelos.length > 0 ? modelos : GEMINI_CONHECIDOS
  } catch (erro) {
    console.error('[gemini] falha ao listar modelos:', (erro as Error).message)
    return GEMINI_CONHECIDOS
  }
}
