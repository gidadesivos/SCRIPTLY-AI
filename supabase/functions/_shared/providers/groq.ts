import { GROQ_MODELS, REQUEST_TIMEOUT_MS } from '../ai-config.ts'
import { ProviderError, type CallOptions, type Provider, type ProviderResult } from './types.ts'

const API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODELS_URL = 'https://api.groq.com/openai/v1/models'

// API_KEY é lida dinamicamente para evitar cache de cold start caso a secret seja adicionada depois do deploy

interface ChatResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  model?: string
  error?: { message?: string; code?: string | number }
}

function classify(status: number): ProviderError['kind'] {
  if (status === 402) return 'quota'
  if (status === 429) return 'rate_limit'
  if (status === 401 || status === 403 || status === 404 || status === 400) return 'config'
  if (status >= 500) return 'upstream'
  return 'upstream'
}

export const groqProvider: Provider = {
  name: 'groq',

  isConfigured() {
    return Boolean(Deno.env.get('GROQ_API_KEY'))
  },

  async call(options: CallOptions): Promise<ProviderResult> {
    const modelsToTry = options.groqModels?.length ? options.groqModels : GROQ_MODELS

    // O Groq não tem fallback automático em array no backend igual o OpenRouter.
    // Temos que fazer o loop manual na lista de modelos.
    for (let i = 0; i < modelsToTry.length; i++) {
      const currentModel = modelsToTry[i]

      /*
       * Um controller e um timer POR TENTATIVA, e não um para o loop inteiro.
       *
       * Compartilhado, o relógio do primeiro modelo continuava correndo no
       * segundo: se o primeiro gastasse quase todo o tempo antes de falhar, o
       * seguinte era abortado em segundos — e a cascata, que existe justamente
       * para salvar a chamada, virava uma sequência de timeouts. O clearTimeout
       * no finally é o par disso: sem ele cada geração deixava um timer vivo.
       */
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const apiKey = Deno.env.get('GROQ_API_KEY')
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: currentModel,
            messages: [
              { role: 'system', content: options.systemInstruction },
              { role: 'user', content: options.userPrompt },
            ],
            temperature: options.temperature,
            max_tokens: options.maxOutputTokens,
            /*
             * json_object, não json_schema: o Groq garante JSON sintaticamente
             * válido, mas NÃO obriga o formato. Quem cobra o formato é o Zod do
             * pipeline, com a tentativa de reparo. Por isso os prompts dizem
             * "objeto JSON válido" — sem essa palavra no texto, este modo
             * recusa a requisição.
             */
            response_format: { type: 'json_object' },
          }),
        })

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as ChatResponse | null
          const message = body?.error?.message ?? `Groq respondeu ${response.status}`
          
          const kind = classify(response.status)
          // Se for erro de rate limit ou upstream, tenta o próximo modelo da cascata
          if ((kind === 'rate_limit' || kind === 'upstream') && i < modelsToTry.length - 1) {
            continue
          }

          throw new ProviderError(
            'groq',
            kind,
            message,
            response.status,
          )
        }

        const body = (await response.json()) as ChatResponse

        if (body.error) {
          const errorCode = typeof body.error.code === 'number' ? body.error.code : 500
          const kind = classify(errorCode)
          if ((kind === 'rate_limit' || kind === 'upstream') && i < modelsToTry.length - 1) {
            continue
          }

          throw new ProviderError(
            'groq',
            kind,
            body.error.message ?? 'Erro do Groq',
            errorCode,
          )
        }

        const text = body.choices?.[0]?.message?.content ?? ''
        if (!text) {
          if (i < modelsToTry.length - 1) continue
          throw new ProviderError(
            'groq',
            'empty',
            `Resposta vazia (finish_reason: ${body.choices?.[0]?.finish_reason ?? 'desconhecido'})`,
            null,
          )
        }

        return {
          text,
          inputTokens: body.usage?.prompt_tokens ?? null,
          outputTokens: body.usage?.completion_tokens ?? null,
          provider: 'groq',
          model: body.model ?? currentModel,
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new ProviderError('groq', 'timeout', 'Tempo esgotado no Groq.', null)
        }
        if (error instanceof ProviderError) throw error

        if (i === modelsToTry.length - 1) {
          throw new ProviderError('groq', 'upstream', (error as Error).message, null)
        }
      } finally {
        clearTimeout(timeout)
      }
    }
    
    throw new ProviderError('groq', 'upstream', 'Todos os modelos do Groq falharam.', null)
  },
}

export interface CatalogModel {
  id: string
  name: string
  contextLength: number | null
  pricePromptPerMillion: number | null
  priceCompletionPerMillion: number | null
  supportsStructured: boolean | null
}

export async function fetchGroqCatalog(): Promise<CatalogModel[]> {
  const apiKey = Deno.env.get('GROQ_API_KEY')
  if (!apiKey) return []

  const response = await fetch(MODELS_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'No text')
    throw new Error(`Groq respondeu ${response.status} ao listar modelos: ${errorText}`)
  }

  const body = (await response.json()) as {
    data?: Array<{
      id?: string
      context_window?: number
    }>
  }

  return (body.data ?? [])
    .filter((model): model is { id: string } & typeof model => Boolean(model.id))
    .map((model) => {
      return {
        id: model.id,
        name: model.id, // Groq devolve nome no ID
        contextLength: model.context_window ?? null,
        // O catálogo do Groq não publica preço nem suporte a schema. null é o
        // valor honesto para "não informado" — dizer 0 e true aqui inventaria
        // uma garantia que ninguém deu.
        pricePromptPerMillion: null,
        priceCompletionPerMillion: null,
        supportsStructured: null,
      }
    })
}
