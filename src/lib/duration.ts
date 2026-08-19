/**
 * Estimativa de duração da locução (§7.2). Determinístico e no cliente —
 * nunca pedido ao modelo.
 *
 * Base: locução em PT-BR rende ~2,5 palavras/segundo (≈150 ppm) em ritmo
 * comercial; 2,2 para premium/pausado e 3,0 para acelerado/UGC.
 */

const WORDS_PER_SECOND_BY_TONE: Record<string, number> = {
  premium: 2.2,
  educativo: 2.2,
  emocional: 2.2,
  minimalista: 2.2,
  ugc: 3.0,
  urgente: 3.0,
  descontraido: 3.0,
}

const DEFAULT_WORDS_PER_SECOND = 2.5

/** Acima disto, oferecemos o ajuste automático. */
export const OVERRUN_TOLERANCE = 0.15

export function wordsPerSecondFor(tone: string | null | undefined): number {
  if (!tone) return DEFAULT_WORDS_PER_SECOND
  return WORDS_PER_SECOND_BY_TONE[tone] ?? DEFAULT_WORDS_PER_SECOND
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export interface DurationEstimate {
  totalWords: number
  estimatedSeconds: number
  targetSeconds: number
  /** Passou da tolerância e vale oferecer o ajuste. */
  isOverTarget: boolean
  overrunRatio: number
}

export function estimateDuration(
  voiceoverTexts: string[],
  targetSeconds: number,
  tone: string | null | undefined,
): DurationEstimate {
  const totalWords = voiceoverTexts.reduce((sum, text) => sum + countWords(text), 0)
  const estimatedSeconds = totalWords / wordsPerSecondFor(tone)

  // Guard contra divisão por zero se o alvo vier zerado.
  const overrunRatio =
    targetSeconds > 0 ? (estimatedSeconds - targetSeconds) / targetSeconds : 0

  return {
    totalWords,
    estimatedSeconds,
    targetSeconds,
    isOverTarget: overrunRatio > OVERRUN_TOLERANCE,
    overrunRatio,
  }
}

export function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(1).replace('.', ',')} s`
}
