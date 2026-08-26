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

/** Timecode de uma cena dentro do roteiro. */
export interface SceneTiming {
  startSeconds: number
  endSeconds: number
  words: number
  seconds: number
}

/**
 * Distribui o tempo entre as cenas acumulando a locução de cada uma.
 *
 * As colunas start_second/end_second existem no banco desde a Fase 3 mas nunca
 * foram preenchidas: derivar aqui evita gravar um dado que ficaria defasado
 * assim que alguém editasse a locução.
 */
export function sceneTimings(
  voiceoverTexts: string[],
  tone: string | null | undefined,
): SceneTiming[] {
  const wps = wordsPerSecondFor(tone)
  let cursor = 0

  return voiceoverTexts.map((text) => {
    const words = countWords(text)
    const seconds = words / wps
    const startSeconds = cursor
    cursor += seconds
    return { startSeconds, endSeconds: cursor, words, seconds }
  })
}

/** Formata como mm:ss — é assim que se lê timecode de vídeo curto. */
export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}
