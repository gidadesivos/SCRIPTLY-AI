import type { LucideIcon } from 'lucide-react'
import { FileText, Network, Package, SlidersHorizontal, Brain, WandSparkles, Radio } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

/**
 * Apenas rotas reais e implementadas entram aqui (N4 — proibido item de menu morto).
 * Itens das fases futuras (Criar, Roteiros, Ideias, Hook Lab, Templates,
 * Calendário, Performance, Insights) entram conforme suas fases forem implementadas.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'hoje', href: '/dashboard', icon: Radio },
  { label: 'criar', href: '/create', icon: WandSparkles },
  { label: 'roteiros', href: '/scripts', icon: FileText },
  { label: 'marcas', href: '/brands', icon: Brain },
  { label: 'produtos', href: '/products', icon: Package },
  { label: 'planos', href: '/campanhas', icon: Network },
  { label: 'ajustes', href: '/settings', icon: SlidersHorizontal },
]
