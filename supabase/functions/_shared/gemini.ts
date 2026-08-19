import {
  AI_MODEL,
  GEMINI_API_BASE,
  MAX_RETRIES,
  REQUEST_TIMEOUT_MS,
  RETRY_BASE_DELAY_MS,
} from './ai-config.ts'

/**
 * Subconjunto do OpenAPI aceito pelo responseSchema do Gemini.
 * Sem oneOf/anyOf/$ref: schemas planos aqui, validação forte no Zod (§7.1).
 */
export interface GeminiSchema {
  type: 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT'
  description?: string
  nullable?: boolean
  enum?: string[]
  items?: GeminiSchema
  properties?: Record<string, GeminiSchema>
  required?: string[]
}

export interface GeminiResult {
  text: string
  inputTokens: number | null
  outputTokens: number | null
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean,
  ) {
    super(message)
    this.name = 'GeminiError'
  }
}

interface GeminiResponseBody {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
  }
  error?: { message?: string }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface CallOptions {
  systemInstruction: string
  userPrompt: string
  responseSchema: GeminiSchema
  temperature: number
  maxOutputTokens: number
}

async function callOnce(apiKey: string, options: CallOptions): Promise<GeminiResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${AI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: options.systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: options.userPrompt }] }],
          generationConfig: {
            temperature: options.temperature,
            maxOutputTokens: options.maxOutputTokens,
            responseMimeType: 'application/json',
            responseSchema: options.responseSchema,
          },
        }),
      },
    )

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as GeminiResponseBody | null
      const retryable = response.status === 429 || response.status >= 500
      throw new GeminiError(
        body?.error?.message ?? `Gemini respondeu ${response.status}`,
        response.status,
        retryable,
      )
    }

    const body = (await response.json()) as GeminiResponseBody
    const candidate = body.candidates?.[0]
    const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''

    if (!text) {
      // Sem texto normalmente significa corte por safety ou maxOutputTokens.
      throw new GeminiError(
        `Resposta vazia do modelo (finishReason: ${candidate?.finishReason ?? 'desconhecido'})`,
        null,
        false,
      )
    }

    return {
      text,
      inputTokens: body.usageMetadata?.promptTokenCount ?? null,
      outputTokens: body.usageMetadata?.candidatesTokenCount ?? null,
    }
  } catch (error) {
    if (error instanceof GeminiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new GeminiError('Tempo esgotado ao falar com o Gemini.', null, true)
    }
    throw new GeminiError((error as Error).message, null, true)
  } finally {
    clearTimeout(timeout)
  }
}

/** Chama o Gemini com retry exponencial apenas em falhas transitórias. */
export async function callGemini(apiKey: string, options: CallOptions): Promise<GeminiResult> {
  let lastError: GeminiError | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callOnce(apiKey, options)
    } catch (error) {
      lastError = error as GeminiError
      if (!lastError.retryable || attempt === MAX_RETRIES) break
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt)
    }
  }

  throw lastError ?? new GeminiError('Falha desconhecida ao chamar o Gemini.', null, false)
}
