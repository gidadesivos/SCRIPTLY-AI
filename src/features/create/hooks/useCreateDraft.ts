import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import type { BriefState } from '@/features/create/components/BriefStep'
import type { Angle, GeneratedScript, Hook } from '@/lib/ai'
import type { FunnelStage, Platform } from '@/types/database'

export type StepKey = 'idea' | 'brief' | 'angle' | 'hook' | 'script'

export interface CreateDraft {
  step: StepKey
  idea: string
  productId: string
  brief: BriefState
  angles: Angle[]
  selectedAngle: Angle | null
  hooks: Hook[]
  selectedHook: Hook | null
  script: GeneratedScript | null
}

/**
 * Sobe quando o formato do rascunho muda de forma incompatível. Rascunhos de
 * versões anteriores são descartados em vez de migrados: um rascunho é
 * trabalho de minutos, não vale carregar código de migração para sempre.
 */
const VERSION = 1

/** Depois disso o rascunho é lixo: a ideia já não é mais a que o usuário tinha. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

const SAVE_DEBOUNCE_MS = 600

/**
 * Por marca, não só por workspace: o rascunho carrega ângulos e hooks escritos
 * a partir de um Brand Brain específico. Restaurar isso sob outra marca
 * misturaria contextos e produziria um roteiro que não é de ninguém.
 */
function storageKey(workspaceId: string, brandId: string) {
  return `scriptly:create-draft:${workspaceId}:${brandId}`
}

const angleSchema = z.object({
  type: z.string(),
  title: z.string(),
  description: z.string(),
  rationale: z.string(),
})

const hookSchema = z.object({
  text: z.string(),
  category: z.string(),
  score: z.number(),
  subscores: z.record(z.string(), z.number()),
  strength: z.string(),
  issue: z.string(),
  recommendation: z.string(),
})

const sceneSchema = z.object({
  purpose: z.string(),
  shot: z.string(),
  visual: z.string(),
  action: z.string(),
  voiceover: z.string(),
  on_screen_text: z.string(),
  broll: z.string(),
  editing_direction: z.string(),
  transition: z.string(),
  sound_suggestion: z.string(),
})

const briefSchema = z.object({
  title: z.string(),
  description: z.string(),
  target_audience: z.string(),
  pain: z.string(),
  desire: z.string(),
  promise: z.string(),
  objective: z.string(),
  tone: z.string(),
  platform: z.string(),
  funnel_stage: z.string(),
  duration_seconds: z.number(),
})

const draftSchema = z.object({
  step: z.enum(['idea', 'brief', 'angle', 'hook', 'script']),
  idea: z.string(),
  productId: z.string(),
  brief: briefSchema,
  angles: z.array(angleSchema),
  selectedAngle: angleSchema.nullable(),
  hooks: z.array(hookSchema),
  selectedHook: hookSchema.nullable(),
  script: z
    .object({
      title: z.string(),
      framework: z.string(),
      cta: z.string(),
      strategy_summary: z.string(),
      scenes: z.array(sceneSchema),
    })
    .nullable(),
})

const storedSchema = z.object({
  version: z.literal(VERSION),
  savedAt: z.number(),
  draft: draftSchema,
})

/**
 * Rascunho vazio é o estado inicial: não vale salvar nem oferecer para
 * restaurar. Um rascunho só existe quando o usuário escreveu a ideia ou a IA
 * já produziu alguma coisa.
 */
export function isDraftEmpty(draft: CreateDraft) {
  return draft.step === 'idea' && draft.idea.trim() === ''
}

function read(key: string): { savedAt: number; draft: CreateDraft } | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(key)
  } catch {
    return null
  }
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  // O conteúdo do localStorage é editável pelo usuário e sobrevive a deploys
  // com formatos diferentes. Validar aqui evita restaurar um objeto quebrado e
  // derrubar a página inteira na renderização seguinte.
  const result = storedSchema.safeParse(parsed)
  if (!result.success) return null
  if (Date.now() - result.data.savedAt > MAX_AGE_MS) return null

  // O schema afrouxa platform e funnel_stage para string; o banco é a
  // autoridade sobre esses valores e a UI já os trata como opcionais.
  const draft: CreateDraft = {
    ...result.data.draft,
    brief: {
      ...result.data.draft.brief,
      platform: result.data.draft.brief.platform as Platform,
      funnel_stage: result.data.draft.brief.funnel_stage as FunnelStage | '',
    },
  }
  if (isDraftEmpty(draft)) return null

  return { savedAt: result.data.savedAt, draft }
}

function write(key: string, draft: CreateDraft) {
  try {
    if (isDraftEmpty(draft)) {
      localStorage.removeItem(key)
      return
    }
    localStorage.setItem(key, JSON.stringify({ version: VERSION, savedAt: Date.now(), draft }))
  } catch {
    // Aba anônima, cota estourada, storage bloqueado: o fluxo continua
    // funcionando em memória. Não vale interromper o usuário por isto.
  }
}

interface UseCreateDraftOptions {
  workspaceId: string
  brandId: string
  /** Estado atual do fluxo, montado pela página a cada render. */
  draft: CreateDraft
  /** Chamado uma vez por marca, se houver rascunho válido guardado. */
  onRestore: (draft: CreateDraft) => void
}

/**
 * Mantém o fluxo do /create vivo entre recarregamentos.
 *
 * Antes disso, fechar a aba no meio do fluxo perdia ideia, briefing, ângulos e
 * hooks já gerados — trabalho que custou chamadas de IA e minutos de escolha.
 */
export function useCreateDraft({
  workspaceId,
  brandId,
  draft,
  onRestore,
}: UseCreateDraftOptions) {
  const [restoredAt, setRestoredAt] = useState<Date | null>(null)

  // Identidade instável de propósito: a página remonta o callback a cada
  // render, e colocá-lo nas dependências do efeito reidrataria sem parar.
  const onRestoreRef = useRef(onRestore)
  onRestoreRef.current = onRestore

  // Lido pelo timer e pelo flush de saída, que não devem depender do render
  // em que foram agendados.
  const draftRef = useRef(draft)
  draftRef.current = draft

  const hydratedKey = useRef<string | null>(null)

  const key = workspaceId && brandId ? storageKey(workspaceId, brandId) : null

  useEffect(() => {
    if (!key || hydratedKey.current === key) return
    hydratedKey.current = key
    setRestoredAt(null)

    // A marca ativa pode demorar um render a mais que a página. Se o usuário
    // já começou a escrever nesse intervalo, o que ele digitou vale mais que o
    // rascunho guardado.
    if (!isDraftEmpty(draftRef.current)) return

    const stored = read(key)
    if (!stored) return

    onRestoreRef.current(stored.draft)
    setRestoredAt(new Date(stored.savedAt))
  }, [key])

  useEffect(() => {
    // Antes da hidratação o estado ainda é o inicial vazio; gravar agora
    // apagaria o rascunho guardado um instante antes de restaurá-lo.
    if (!key || hydratedKey.current !== key) return

    // Sem o debounce, cada tecla digitada na ideia serializaria o roteiro
    // inteiro e gravaria de forma síncrona no localStorage.
    const timer = setTimeout(() => write(key, draftRef.current), SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [key, draft])

  useEffect(() => {
    if (!key) return
    // Fechar a aba é exatamente o caso que este hook existe para cobrir, e é
    // quando o debounce ainda não disparou. pagehide, e não beforeunload,
    // porque é o único que o Safari de iOS dispara ao trocar de app.
    const activeKey = key
    const flush = () => {
      if (hydratedKey.current === activeKey) write(activeKey, draftRef.current)
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [key])

  /** Apaga o rascunho guardado. A página cuida de zerar o próprio estado. */
  const clear = useCallback(() => {
    setRestoredAt(null)
    if (!key) return
    try {
      localStorage.removeItem(key)
    } catch {
      // Ver acima.
    }
  }, [key])

  return { restoredAt, clear }
}
