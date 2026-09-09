import type { LucideIcon } from 'lucide-react'
import {
  FileText,
  Network,
  Package,
  SlidersHorizontal,
  Brain,
  WandSparkles,
  Radio,
  Zap,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /**
   * Selo curto ao lado do item, quando o recurso é experimental.
   *
   * Opcional para não obrigar os itens existentes a declararem nada. O rail
   * lateral tem 60px e uma fonte de 9px: qualquer texto maior que quatro letras
   * quebraria o layout, então o selo é o rótulo — não o nome do item.
   */
  badge?: string
  /** Nome por extenso, para onde há espaço (drawer do mobile). */
  fullLabel?: string
}

/**
 * Apenas rotas reais e implementadas entram aqui (N4 — proibido item de menu morto).
 * Itens das fases futuras (Criar, Roteiros, Ideias, Hook Lab, Templates,
 * Calendário, Performance, Insights) entram conforme suas fases forem implementadas.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'hoje', href: '/dashboard', icon: Radio },
  { label: 'criar', href: '/create', icon: WandSparkles },
  {
    label: 'rápido',
    href: '/create-beta',
    icon: Zap,
    badge: 'BETA',
    fullLabel: 'Criação (Beta)',
  },
  { label: 'roteiros', href: '/scripts', icon: FileText },
  { label: 'marcas', href: '/brands', icon: Brain },
  { label: 'produtos', href: '/products', icon: Package },
  { label: 'planos', href: '/campanhas', icon: Network },
  { label: 'ajustes', href: '/settings', icon: SlidersHorizontal },
]
