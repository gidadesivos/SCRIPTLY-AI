import { z } from 'zod'

export type CampaignNodeType =
  | 'campanha'
  | 'conjunto'
  | 'anuncio'
  | 'publico'
  | 'landing_page'
  | 'whatsapp'
  | 'oferta'
  | 'pixel_evento'
  | 'observacao'
  | 'meta_kpi'
  | 'nota'
  | 'frame'
  | 'texto'
  | 'forma'
  | 'formulario'

/**
 * Qual tipo pode ficar dentro de qual. É a hierarquia do Meta, e a mesma regra
 * que o trigger do banco impõe (migration 0010) — aqui ela existe para a tela
 * não oferecer o que o banco vai recusar.
 */
export const ALLOWED_CHILD: Partial<Record<CampaignNodeType, CampaignNodeType | null>> = {
  campanha: 'conjunto',
  conjunto: 'anuncio',
  anuncio: 'whatsapp',
}

export const NODE_LABELS: Partial<Record<CampaignNodeType, string>> = {
  campanha: 'Campanha',
  conjunto: 'Conjunto',
  anuncio: 'Anúncio',
  formulario: 'Formulário',
  whatsapp: 'WhatsApp',
  landing_page: 'Página',
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

const taskSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
})

export type CampaignTask = z.infer<typeof taskSchema>

const baseDataSchema = z.object({
  description: text,
  status: z.string().catch('draft'),
  assignee: text,
  tags: z.array(z.string()).catch([]),
  tasks: z.array(taskSchema).catch([]),
  locked: z.boolean().catch(false),
  favorite: z.boolean().catch(false),
  notes: text,
})

export const campanhaDataSchema = baseDataSchema.extend({
  objective: text,
  buying_type: text,
  budget_level: text,
  budget_mode: text,
  budget_amount: num,
  ab_test: z.boolean().catch(false),
  platform: text,
  product: text,
  service: text,
  offer: text,
  start_date: text,
  end_date: text,
  funnel: text,
  planned_investment: num,
  realized_investment: num,
})

export const conjuntoDataSchema = baseDataSchema.extend({
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
  gender: text,
  language: text,
  interests: z.array(z.string()).catch([]),
  exclusions: text,
})

export const anuncioDataSchema = baseDataSchema.extend({
  format: text,
  primary_text: text,
  headline: text,
  cta: text,
  destination: text,
  angle: text,
  hook: text,
  whatsapp: text,
  utm: text,
})

/**
 * Tipos de campo que o lead preenche.
 *
 * A lista é fechada porque cada tipo decide a máscara, o teclado do celular e
 * o exemplo mostrado no card. Um tipo solto em string deixava tudo virar
 * "Sua resposta..." — inclusive telefone e CEP, onde o formato é o que evita
 * lead digitado errado.
 */
export const FIELD_TYPES = [
  { value: 'text', label: 'Texto', placeholder: 'Sua resposta…' },
  { value: 'email', label: 'E-mail', placeholder: 'exemplo@email.com' },
  { value: 'phone', label: 'Telefone / WhatsApp', placeholder: '(11) 99999-9999' },
  { value: 'number', label: 'Número', placeholder: '0' },
  { value: 'cep', label: 'CEP', placeholder: '00000-000' },
  { value: 'date', label: 'Data', placeholder: 'dd/mm/aaaa' },
  { value: 'textarea', label: 'Texto longo', placeholder: 'Escreva aqui…' },
  { value: 'select', label: 'Lista de opções', placeholder: 'Escolha uma opção' },
  { value: 'boolean', label: 'Sim / Não', placeholder: 'Sim ou Não' },
] as const

export type FormFieldType = (typeof FIELD_TYPES)[number]['value']

export function fieldPlaceholder(type: string): string {
  return FIELD_TYPES.find((f) => f.value === type)?.placeholder ?? 'Sua resposta…'
}

export function fieldTypeLabel(type: string): string {
  return FIELD_TYPES.find((f) => f.value === type)?.label ?? type
}

/**
 * Os três que praticamente todo formulário de lead pede. Existem como atalho
 * porque montar isso campo a campo, toda vez, é o trabalho repetitivo que a
 * tela deveria poupar.
 */
export const DEFAULT_LEAD_FIELDS: Array<{ label: string; type: FormFieldType }> = [
  { label: 'Nome', type: 'text' },
  { label: 'WhatsApp', type: 'phone' },
  { label: 'E-mail', type: 'email' },
]

export const formFieldSchema = z.object({
  id: z.string(),
  type: z.string().catch('text'),
  label: z.string().catch(''),
  required: z.boolean().catch(false),
  /** Só usado quando type é 'select'. */
  options: z.array(z.string()).catch([]),
  /** Dica abaixo do campo, opcional. */
  help: z.string().catch(''),
})

export type FormField = z.infer<typeof formFieldSchema>

/**
 * Destinos tinham schema nenhum: caíam no `return input as Record<string, any>`
 * do parseNodeData, e a URL ou o telefone eram guardados no `label` do nó — o
 * mesmo campo do nome que aparece no card. Campo próprio separa as duas coisas.
 */
export const landingPageDataSchema = baseDataSchema.extend({
  url: text,
  /** Cartão Open Graph resolvido pela Edge Function. Vazio até alguém buscar. */
  preview_title: text,
  preview_description: text,
  preview_image: text,
  preview_site: text,
})

export const whatsappDataSchema = baseDataSchema.extend({
  phone: text,
  message: text,
})

export type LandingPageData = z.infer<typeof landingPageDataSchema>
export type WhatsappData = z.infer<typeof whatsappDataSchema>

export const formularioDataSchema = baseDataSchema.extend({
  title: text,
  /** Texto do botão de envio. Vazio cai no padrão na hora de renderizar. */
  submit_label: text,
  form_fields: z.array(formFieldSchema).catch([]),
})

export type CampanhaData = z.infer<typeof campanhaDataSchema>
export type ConjuntoData = z.infer<typeof conjuntoDataSchema>
export type AnuncioData = z.infer<typeof anuncioDataSchema>
export type FormularioData = z.infer<typeof formularioDataSchema>
export type CampaignNodeData =
  | CampanhaData
  | ConjuntoData
  | AnuncioData
  | FormularioData
  | LandingPageData
  | WhatsappData
  | Record<string, any>

export function parseNodeData(type: CampaignNodeType, raw: unknown): CampaignNodeData {
  const input = raw && typeof raw === 'object' ? raw : {}
  if (type === 'campanha') return campanhaDataSchema.parse(input)
  if (type === 'conjunto') return conjuntoDataSchema.parse(input)
  if (type === 'anuncio') return anuncioDataSchema.parse(input)
  if (type === 'formulario') return formularioDataSchema.parse(input)
  if (type === 'landing_page') return landingPageDataSchema.parse(input)
  if (type === 'whatsapp') return whatsappDataSchema.parse(input)
  return input as Record<string, any>
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
  source_handle?: string
  target_handle?: string
  type?: string
  style?: Record<string, unknown>
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
