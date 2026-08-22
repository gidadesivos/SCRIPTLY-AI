import { z } from 'npm:zod@3.23.8'
import { callGemini, type GeminiSchema, type GeminiResult } from './gemini.ts'
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
  apiKey: string
  operation: OperationName
  userPrompt: string
  geminiSchema: GeminiSchema
  zodSchema: z.ZodType<T>
}

export interface RunOutcome<T> {
  data: T
  inputTokens: number | null
  outputTokens: number | null
}

/**
 * Pipeline do §7.2: receber → JSON.parse seguro → Zod → normalizar.
 * Falhou? UMA tentativa de reparo, reenviando o erro do Zod. Falhou de novo,
 * erro amigável — nunca persistir objeto parcial.
 */
export async function runOperation<T>({
  apiKey,
  operation,
  userPrompt,
  geminiSchema,
  zodSchema,
}: RunOptions<T>): Promise<RunOutcome<T>> {
  let prompt = userPrompt
  let lastResult: GeminiResult | null = null
  let lastIssue = ''

  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    lastResult = await callGemini(apiKey, {
      systemInstruction: CONTENT_SYSTEM_V1,
      userPrompt: prompt,
      responseSchema: geminiSchema,
      temperature: TEMPERATURE[operation],
      maxOutputTokens: MAX_OUTPUT_TOKENS[operation],
      thinkingLevel: THINKING_LEVEL[operation],
    })

    try {
      const parsed = safeJsonParse(lastResult.text)
      const validated = zodSchema.parse(parsed)
      return {
        data: validated,
        inputTokens: lastResult.inputTokens,
        outputTokens: lastResult.outputTokens,
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
