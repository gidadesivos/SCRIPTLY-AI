import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, Package, Settings, Sparkles, Wand2 } from 'lucide-react'

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
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Criar', href: '/create', icon: Wand2 },
  { label: 'Brand Brain', href: '/brands', icon: Sparkles },
  { label: 'Produtos', href: '/products', icon: Package },
  { label: 'Configurações', href: '/settings', icon: Settings },
]
