import { z } from 'zod'

export type CampaignNodeType = 'campanha' | 'conjunto' | 'anuncio'

/**
 * Qual tipo pode ficar dentro de qual. É a hierarquia do Meta, e a mesma regra
 * que o trigger do banco impõe (migration 0010) — aqui ela existe para a tela
 * não oferecer o que o banco vai recusar.
 */
export const ALLOWED_CHILD: Record<CampaignNodeType, CampaignNodeType | null> = {
  campanha: 'conjunto',
  conjunto: 'anuncio',
  anuncio: null,
}

export const NODE_LABELS: Record<CampaignNodeType, string> = {
  campanha: 'Campanha',
  conjunto: 'Conjunto de anúncios',
  anuncio: 'Anúncio',
}

/**
 * Os campos de cada tipo, validados na leitura.
 *
 * data é jsonb no banco: aceita qualquer coisa. Estes schemas são o contrato
 * de verdade, e usam .catch() em vez de rejeitar — um plano com um campo a
 * mais de uma versão anterior deve abrir, não dar tela branca.
 */
const text = z.string().catch('')
const num = z.number().nullable().catch(null)

export const campanhaDataSchema = z.object({
  objective: text,
  buying_type: text,
  budget_level: text,
  budget_mode: text,
  budget_amount: num,
  ab_test: z.boolean().catch(false),
  notes: text,
})

export const conjuntoDataSchema = z.object({
  budget_mode: text,
  budget_amount: num,
  optimization_goal: text,
  conversion_event: text,
  audience_type: text,
  audience_detail: text,
  age_range: text,
  locations: text,
  placement_mode: text,
  placements: text,
  schedule: text,
  notes: text,
})

export const anuncioDataSchema = z.object({
  format: text,
  primary_text: text,
  headline: text,
  description: text,
  cta: text,
  destination: text,
  notes: text,
})

export type CampanhaData = z.infer<typeof campanhaDataSchema>
export type ConjuntoData = z.infer<typeof conjuntoDataSchema>
export type AnuncioData = z.infer<typeof anuncioDataSchema>
export type CampaignNodeData = CampanhaData | ConjuntoData | AnuncioData

export function parseNodeData(type: CampaignNodeType, raw: unknown): CampaignNodeData {
  const input = raw && typeof raw === 'object' ? raw : {}
  if (type === 'campanha') return campanhaDataSchema.parse(input)
  if (type === 'conjunto') return conjuntoDataSchema.parse(input)
  return anuncioDataSchema.parse(input)
}

export function emptyNodeData(type: CampaignNodeType): CampaignNodeData {
  return parseNodeData(type, {})
}

export interface CampaignPlan {
  id: string
  workspace_id: string
  brand_id: string
  name: string
  description: string
  objective: string
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

/**
 * Ligação de anotação entre dois nós — qualquer direção, qualquer par.
 *
 * Não é estrutura: a árvore (parent_id) é o que vira campanha no Meta. Isto
 * registra relação que existe na cabeça de quem planeja e não cabe na
 * hierarquia: "testa contra", "entra depois de", "mesmo criativo".
 */
export interface CampaignLink {
  id: string
  plan_id: string
  source_id: string
  target_id: string
  label: string
}

export type MediaKind = 'video' | 'image' | ''

export interface CampaignNode {
  id: string
  workspace_id: string
  plan_id: string
  parent_id: string | null
  type: CampaignNodeType
  label: string
  data: CampaignNodeData
  position_x: number
  position_y: number
  order_index: number
  script_id: string | null
  media_url: string
  media_kind: MediaKind
}
