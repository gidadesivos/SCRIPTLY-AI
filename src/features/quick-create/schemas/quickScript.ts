import { z } from 'zod'

/**
 * Opções da tela e validação do rascunho.
 *
 * Os valores de plataforma e duração são os MESMOS de config/options.ts de
 * propósito: o roteiro salvo cai na coluna `platform` (um enum do banco) e em
 * `duration_seconds`. Inventar valores próprios aqui produziria roteiro que a
 * biblioteca não consegue filtrar.
 */

export interface QuickOption {
  value: string
  label: string
}

/** 'automatico' não é um tipo de conteúdo: é a ausência de escolha. */
export const AUTOMATIC = 'automatico'

export const CONTENT_TYPES: QuickOption[] = [
  { value: AUTOMATIC, label: 'Automático' },
  { value: 'venda', label: 'Venda' },
  { value: 'educativo', label: 'Educativo' },
  { value: 'quebra_objecao', label: 'Quebra de objeção' },
  { value: 'autoridade', label: 'Autoridade' },
  { value: 'prova_social', label: 'Prova social' },
  { value: 'institucional', label: 'Institucional' },
  { value: 'comparativo', label: 'Comparativo' },
]

export const QUICK_TONES: QuickOption[] = [
  { value: AUTOMATIC, label: 'Automático' },
  { value: 'conversacional', label: 'Conversacional' },
  { value: 'direto', label: 'Direto' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'descontraido', label: 'Descontraído' },
  { value: 'provocativo', label: 'Provocativo' },
  { value: 'inspirador', label: 'Inspirador' },
]

/** Subconjunto de PLATFORMS: as plataformas de vídeo curto orgânico. */
export const QUICK_PLATFORMS: QuickOption[] = [
  { value: 'instagram_reels', label: 'Instagram Reels' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube_shorts', label: 'YouTube Shorts' },
  { value: 'generic', label: 'Outro' },
]

export const QUICK_DURATIONS: QuickOption[] = [
  { value: '15', label: '15 segundos' },
  { value: '30', label: '30 segundos' },
  { value: '45', label: '45 segundos' },
  { value: '60', label: '60 segundos' },
  { value: '90', label: '90 segundos' },
]

export const FUNNEL_OPTIONS: QuickOption[] = [
  { value: '', label: 'Não especificar' },
  { value: 'topo', label: 'Topo' },
  { value: 'meio', label: 'Meio' },
  { value: 'fundo', label: 'Fundo' },
]

/** Atalhos: não criam etapa, só dão um começo de frase. */
export const IDEA_SHORTCUTS: Array<{ label: string; text: string }> = [
  { label: 'Falar de um produto', text: 'Quero apresentar ' },
  { label: 'Quebrar uma objeção', text: 'Quero responder a objeção de que ' },
  { label: 'Explicar alguma coisa', text: 'Quero explicar ' },
  { label: 'Criar uma oferta', text: 'Quero divulgar a oferta de ' },
  { label: 'Contar uma história', text: 'Quero contar a história de ' },
]

export type ReferenceMode = 'none' | 'video' | 'transcript'

/**
 * Estados da referência.
 *
 * 'uploaded' e 'ready' são coisas diferentes e a UI PRECISA distinguir: o
 * arquivo terminar de subir não significa que a IA já entendeu o vídeo. Juntar
 * os dois faria a tela dizer "pronto" enquanto a análise ainda nem começou.
 */
export type ReferenceStatus =
  | 'idle'
  | 'uploading'
  | 'uploaded'
  | 'analyzing'
  | 'ready'
  | 'error'

export const quickDraftSchema = z.object({
  request: z.string(),
  productId: z.string(),
  contentType: z.string(),
  platform: z.string(),
  durationSeconds: z.number(),
  tone: z.string(),
  audience: z.string(),
  cta: z.string(),
  funnelStage: z.string(),
  extraInstructions: z.string(),
  withoutCta: z.boolean(),
  voiceoverOnly: z.boolean(),
  referenceMode: z.enum(['none', 'video', 'transcript']),
  transcript: z.string(),
})

export type QuickDraft = z.infer<typeof quickDraftSchema>

export const EMPTY_QUICK_DRAFT: QuickDraft = {
  request: '',
  productId: 'none',
  contentType: AUTOMATIC,
  platform: 'instagram_reels',
  durationSeconds: 30,
  tone: AUTOMATIC,
  audience: '',
  cta: '',
  funnelStage: '',
  extraInstructions: '',
  withoutCta: false,
  voiceoverOnly: false,
  referenceMode: 'none',
  transcript: '',
}
