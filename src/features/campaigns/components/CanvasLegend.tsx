import { Layers, Megaphone, Target } from 'lucide-react'
import { LEVEL_STYLES } from '@/features/campaigns/components/CampaignNodeCard'
import { NODE_LABELS } from '@/features/campaigns/types'
import { cn } from '@/lib/utils'

const LEVELS = [
  { type: 'campanha' as const, icon: Target },
  { type: 'conjunto' as const, icon: Layers },
  { type: 'anuncio' as const, icon: Megaphone },
]

/**
 * Diz o que cada cor significa.
 *
 * Cor sem legenda é decoração: quem abre o plano pela primeira vez não tem como
 * saber que roxo é campanha.
 *
 * Fica no topo à direita, deitada: embaixo à direita ela cobria o minimapa, e
 * embaixo à esquerda cobriria os controles de zoom.
 */
export function CanvasLegend() {
  return (
    <div className="pointer-events-none absolute right-3 top-3 hidden rounded-md border border-border bg-card/90 px-2 py-1.5 shadow-sm backdrop-blur md:block">
      <ul className="flex items-center gap-3">
        {LEVELS.map(({ type, icon: Icon }) => (
          <li key={type} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className={cn('flex h-4 w-4 items-center justify-center rounded', LEVEL_STYLES[type]?.band)}
            >
              <Icon className={cn('h-2.5 w-2.5', LEVEL_STYLES[type]?.text)} />
            </span>
            {NODE_LABELS[type]}
          </li>
        ))}
      </ul>
    </div>
  )
}
