import { z } from 'npm:zod@3.23.8'
import type { GeminiSchema } from './gemini.ts'
import { callWithFallback, callExplicit, type ChainAttempt, type ChainResult } from './providers/index.ts'
import type { ProviderName } from './providers/types.ts'
import { CONTENT_SYSTEM_V1 } from './prompts.ts'
import {
  MAX_REPAIR_ATTEMPTS,
  MAX_OUTPUT_TOKENS,
  TEMPERATURE,
  THINKING_LEVEL,
  type OperationName,
} from './ai-config.ts'

export class InvalidAiOutputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidAiOutputError'
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    // Alguns retornos vêm cercados por cerca de markdown mesmo com responseMimeType.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1])
      } catch {
        throw new InvalidAiOutputError('A IA devolveu um JSON que não pôde ser lido.')
      }
    }
    throw new InvalidAiOutputError('A IA devolveu um JSON que não pôde ser lido.')
  }
}

export interface RunOptions<T> {
  operation: OperationName
  systemPrompt?: string
  userPrompt: string
  geminiSchema: GeminiSchema
  zodSchema: z.ZodType<T>
  /** Modelos que o workspace escolheu para o OpenRouter. */
  openRouterModels?: string[]
  groqModels?: string[]
  geminiModels?: string[]
  /**
   * Quando presente, chama exatamente este provedor/modelo sem fallback.
   * É o modo "seleção manual" do usuário.
   */
  explicitModel?: { provider: ProviderName; modelId: string }
}

export interface RunOutcome<T> {
  data: T
  inputTokens: number | null
  outputTokens: number | null
  /** Quem atendeu de fato — pode não ser o primeiro da cadeia. */
  provider: string
  model: string
  /** O que falhou antes, para a telemetria registrar a troca. */
  attempts: ChainAttempt[]
}

/**
 * Pipeline do §7.2: receber → JSON.parse seguro → Zod → normalizar.
 * Falhou? UMA tentativa de reparo, reenviando o erro do Zod. Falhou de novo,
 * erro amigável — nunca persistir objeto parcial.
 */
export async function runOperation<T>({
  operation,
  systemPrompt,
  userPrompt,
  geminiSchema,
  zodSchema,
  openRouterModels,
  groqModels,
  geminiModels,
  explicitModel,
}: RunOptions<T>): Promise<RunOutcome<T>> {
  let prompt = userPrompt
  let lastResult: ChainResult | null = null
  let lastIssue = ''

  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    const callOptions = {
      systemInstruction: systemPrompt ?? CONTENT_SYSTEM_V1,
      userPrompt: prompt,
      responseSchema: geminiSchema,
      temperature: TEMPERATURE[operation],
      maxOutputTokens: MAX_OUTPUT_TOKENS[operation],
      thinkingLevel: THINKING_LEVEL[operation],
      openRouterModels,
      groqModels,
      geminiModels,
    }

    lastResult = explicitModel
      ? await callExplicit(explicitModel.provider, explicitModel.modelId, callOptions)
      : await callWithFallback(callOptions)

    try {
      const parsed = safeJsonParse(lastResult.text)
      const validated = zodSchema.parse(parsed)
      return {
        data: validated,
        inputTokens: lastResult.inputTokens,
        outputTokens: lastResult.outputTokens,
        provider: lastResult.provider,
        model: lastResult.model,
        attempts: lastResult.attempts,
      }
    } catch (error) {
      lastIssue =
        error instanceof z.ZodError
          ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
          : (error as Error).message

      if (attempt === MAX_REPAIR_ATTEMPTS) break

      prompt = `${userPrompt}

A resposta anterior foi rejeitada pela validação com estes erros:
${lastIssue}

Devolva o JSON corrigido, respeitando exatamente o schema pedido.`
    }
  }

  throw new InvalidAiOutputError(lastIssue || 'A saída da IA não passou na validação.')
}
