import { z } from 'npm:zod@3.23.8'
import type { GeminiSchema } from './gemini.ts'

/**
 * Para cada operação: um responseSchema PLANO para o Gemini (ele só aceita um
 * subconjunto do OpenAPI) e um schema Zod forte, que é quem realmente valida.
 */

const str = (description?: string): GeminiSchema => ({ type: 'STRING', description })

// ---------------------------------------------------------------- brief
export const briefGeminiSchema: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    title: str('Título curto e descritivo'),
    description: str(),
    target_audience: str(),
    pain: str(),
    desire: str(),
    promise: str(),
    objective: str(),
    tone: str(),
  },
  required: ['title'],
}

export const briefZodSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
  target_audience: z.string().default(''),
  pain: z.string().default(''),
  desire: z.string().default(''),
  promise: z.string().default(''),
  objective: z.string().default(''),
  tone: z.string().default(''),
})

export type BriefOutput = z.infer<typeof briefZodSchema>

// ---------------------------------------------------------------- angles
export const anglesGeminiSchema: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    angles: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: str('Categoria do ângulo, ex: dor, curiosidade, comparação'),
          title: str('Nome curto do ângulo'),
          description: str('O ângulo em 1-2 frases'),
          rationale: str('Por que funciona para este público'),
        },
        required: ['type', 'title', 'description'],
      },
    },
  },
  required: ['angles'],
}

export const anglesZodSchema = z.object({
  angles: z
    .array(
      z.object({
        type: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
        rationale: z.string().default(''),
      }),
    )
    .min(1, 'A IA não devolveu nenhum ângulo.'),
})

export type AnglesOutput = z.infer<typeof anglesZodSchema>

// ---------------------------------------------------------------- hooks
const SUBSCORE_KEYS = [
  'clareza',
  'especificidade',
  'curiosidade',
  'relevancia',
  'forca',
  'retencao',
  'adequacao',
] as const

export const hooksGeminiSchema: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    hooks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: str('O hook em si'),
          category: str('Mecanismo usado'),
          score: { type: 'INTEGER', description: 'Avaliação heurística de 0 a 100' },
          clareza: { type: 'INTEGER' },
          especificidade: { type: 'INTEGER' },
          curiosidade: { type: 'INTEGER' },
          relevancia: { type: 'INTEGER' },
          forca: { type: 'INTEGER' },
          retencao: { type: 'INTEGER' },
          adequacao: { type: 'INTEGER' },
          strength: str('Maior ponto forte'),
          issue: str('Maior fraqueza'),
          recommendation: str('Como melhorar'),
        },
        required: ['text', 'category', 'score'],
      },
    },
  },
  required: ['hooks'],
}

/**
 * Scores fora de 0–100 são clampados, não rejeitados: erro pequeno não vale
 * derrubar a tela. Arredonda antes de clampar — com .int() um score 85.5
 * cairia no catch e viraria 0, que é pior que o valor aproximado.
 */
const score = z.coerce
  .number()
  .catch(0)
  .transform((n) => Math.min(100, Math.max(0, Math.round(n))))

export const hooksZodSchema = z.object({
  hooks: z
    .array(
      z
        .object({
          text: z.string().min(1),
          category: z.string().default(''),
          score,
          clareza: score.optional(),
          especificidade: score.optional(),
          curiosidade: score.optional(),
          relevancia: score.optional(),
          forca: score.optional(),
          retencao: score.optional(),
          adequacao: score.optional(),
          strength: z.string().default(''),
          issue: z.string().default(''),
          recommendation: z.string().default(''),
        })
        .transform((hook) => {
          const subscores: Record<string, number> = {}
          for (const key of SUBSCORE_KEYS) {
            const value = hook[key]
            if (typeof value === 'number') subscores[key] = value
          }
          return {
            text: hook.text,
            category: hook.category,
            score: hook.score,
            subscores,
            strength: hook.strength,
            issue: hook.issue,
            recommendation: hook.recommendation,
          }
        }),
    )
    .min(1, 'A IA não devolveu nenhum hook.'),
})

export type HooksOutput = z.infer<typeof hooksZodSchema>

// ---------------------------------------------------------------- script
export const scriptGeminiSchema: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    title: str(),
    framework: str('Framework narrativo usado'),
    cta: str(),
    strategy_summary: str(),
    scenes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          purpose: str('Função narrativa da cena'),
          shot: str('Tipo de plano'),
          visual: str(),
          action: str(),
          voiceover: str('O que é falado'),
          on_screen_text: str('Texto em tela, curto'),
          broll: str(),
          editing_direction: str(),
          transition: str(),
          sound_suggestion: str(),
        },
        required: ['purpose', 'voiceover'],
      },
    },
  },
  required: ['title', 'scenes'],
}

export const scriptZodSchema = z.object({
  title: z.string().min(1),
  framework: z.string().default(''),
  cta: z.string().default(''),
  strategy_summary: z.string().default(''),
  scenes: z
    .array(
      z.object({
        purpose: z.string().default(''),
        shot: z.string().default(''),
        visual: z.string().default(''),
        action: z.string().default(''),
        voiceover: z.string().default(''),
        on_screen_text: z.string().default(''),
        broll: z.string().default(''),
        editing_direction: z.string().default(''),
        transition: z.string().default(''),
        sound_suggestion: z.string().default(''),
      }),
    )
    .min(1, 'A IA não devolveu nenhuma cena.'),
})

export type ScriptOutput = z.infer<typeof scriptZodSchema>

// ------------------------------------------------------- rewriteSection
export const rewriteGeminiSchema: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    content: str('O novo conteúdo APENAS deste campo'),
    note: str('Observação curta, se a instrução não se aplicar'),
  },
  required: ['content'],
}

export const rewriteZodSchema = z.object({
  content: z.string().min(1, 'A IA devolveu um trecho vazio.'),
  note: z.string().default(''),
})

export type RewriteOutput = z.infer<typeof rewriteZodSchema>

// ---------------------------------------------------- generateVariations
export const variationsGeminiSchema: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    variations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: str('Rótulo curto, ex: B, C'),
          title: str(),
          hook: str(),
          cta: str(),
          hypothesis: str('O que esta variação testa em relação ao original'),
          scenes: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                voiceover: str(),
                on_screen_text: str(),
              },
              required: ['voiceover'],
            },
          },
        },
        required: ['title', 'hook', 'scenes'],
      },
    },
  },
  required: ['variations'],
}

export const variationsZodSchema = z.object({
  variations: z
    .array(
      z.object({
        label: z.string().default(''),
        title: z.string().min(1),
        hook: z.string().default(''),
        cta: z.string().default(''),
        hypothesis: z.string().default(''),
        scenes: z
          .array(
            z.object({
              voiceover: z.string().default(''),
              on_screen_text: z.string().default(''),
            }),
          )
          .min(1),
      }),
    )
    .min(1, 'A IA não devolveu nenhuma variação.'),
})

export type VariationsOutput = z.infer<typeof variationsZodSchema>

// ---------------------------------------------------------- generateAdCopy
export const adCopyGeminiSchema: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    primary_text: str('Texto acima do criativo'),
    headline: str('Título, até 40 caracteres'),
    description: str('Linha de apoio, até 30 caracteres'),
    cta_suggestion: str('Um dos valores de CTA permitidos'),
    rationale: str('Por que essa copy funciona para este público'),
  },
  required: ['primary_text', 'headline'],
}

export const adCopyZodSchema = z.object({
  primary_text: z.string().min(1, 'A IA devolveu o texto principal vazio.'),
  headline: z.string().min(1, 'A IA devolveu o título vazio.'),
  description: z.string().default(''),
  cta_suggestion: z.string().default(''),
  rationale: z.string().default(''),
})

export type AdCopyOutput = z.infer<typeof adCopyZodSchema>
