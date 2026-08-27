import {
  FileText,
  Frame,
  Globe,
  Layers,
  Megaphone,
  MessageCircle,
  Radio,
  Shapes,
  StickyNote,
  Target,
  Type,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { NODE_LABELS, type CampaignNodeType } from '@/features/campaigns/types'

/**
 * Cor e ícone de cada tipo de nó, num lugar só.
 *
 * Antes isso estava espalhado: LEVEL_STYLES cobria só os três níveis do Meta e
 * os auxiliares carregavam a própria cor solta dentro do JSX. O painel lateral
 * não tinha de onde tirar a identidade do nó, e por isso mostrava só um título
 * cinza — sem dizer, de relance, o que estava selecionado.
 */
export interface NodeIdentity {
  label: string
  icon: LucideIcon
  /** Classe de cor do texto/ícone. */
  accent: string
  /** Classe de fundo suave, para o selo. */
  tint: string
}

const IDENTITIES: Record<string, NodeIdentity> = {
  campanha: { label: 'Campanha', icon: Target, accent: 'text-primary', tint: 'bg-primary/15' },
  conjunto: { label: 'Conjunto', icon: Layers, accent: 'text-info', tint: 'bg-info/15' },
  anuncio: { label: 'Anúncio', icon: Megaphone, accent: 'text-success', tint: 'bg-success/15' },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    accent: 'text-emerald-400',
    tint: 'bg-emerald-500/15',
  },
  landing_page: { label: 'Página', icon: Globe, accent: 'text-sky-400', tint: 'bg-sky-500/15' },
  formulario: { label: 'Formulário', icon: FileText, accent: 'text-blue-400', tint: 'bg-blue-500/15' },
  publico: { label: 'Público', icon: Users, accent: 'text-violet-400', tint: 'bg-violet-500/15' },
  oferta: { label: 'Oferta', icon: Target, accent: 'text-amber-400', tint: 'bg-amber-500/15' },
  pixel_evento: { label: 'Pixel', icon: Radio, accent: 'text-orange-400', tint: 'bg-orange-500/15' },
  meta_kpi: { label: 'Meta', icon: Target, accent: 'text-warning', tint: 'bg-warning/15' },
  observacao: {
    label: 'Observação',
    icon: StickyNote,
    accent: 'text-muted-foreground',
    tint: 'bg-muted',
  },
  nota: { label: 'Post-it', icon: StickyNote, accent: 'text-amber-500', tint: 'bg-amber-500/15' },
  frame: { label: 'Frame', icon: Frame, accent: 'text-muted-foreground', tint: 'bg-muted' },
  texto: { label: 'Texto', icon: Type, accent: 'text-muted-foreground', tint: 'bg-muted' },
  forma: { label: 'Forma', icon: Shapes, accent: 'text-muted-foreground', tint: 'bg-muted' },
}

/** Nunca devolve undefined: tipo desconhecido vira um selo neutro identificado. */
export function nodeIdentity(type: string): NodeIdentity {
  return (
    IDENTITIES[type] ?? {
      label: NODE_LABELS[type as CampaignNodeType] ?? type,
      icon: Shapes,
      accent: 'text-muted-foreground',
      tint: 'bg-muted',
    }
  )
}
