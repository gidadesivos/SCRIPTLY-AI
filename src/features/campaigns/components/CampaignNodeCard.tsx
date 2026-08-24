import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FileText, Layers, Megaphone, Plus, Target, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { labelFor } from '@/config/options'
import {
  META_AD_FORMATS,
  META_AUDIENCE_TYPES,
  META_CAMPAIGN_OBJECTIVES,
  META_CTAS,
  META_OPTIMIZATION_GOALS,
  META_PLACEMENT_MODES,
} from '@/features/campaigns/meta-options'
import { ALLOWED_CHILD, NODE_LABELS, type CampaignNodeType } from '@/features/campaigns/types'
import { cn } from '@/lib/utils'

export interface CampaignNodePayload extends Record<string, unknown> {
  type: CampaignNodeType
  label: string
  chips: string[]
  budget: string | null
  issues: string[]
  hasScript: boolean
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
  [key: string]: unknown
}

const ICONS: Record<CampaignNodeType, typeof Target> = {
  campanha: Target,
  conjunto: Layers,
  anuncio: Megaphone,
}

/**
 * Uma cor por nível da hierarquia do Meta.
 *
 * Quem monta campanha lê a árvore de relance e precisa saber o nível antes de
 * ler o texto — inclusive com o zoom afastado, onde o texto some. Por isso a
 * cor vai na faixa do topo e na borda, não num detalhe fino.
 *
 * As cores são as mesmas do resto do app: roxo é a ação principal, azul é
 * informação, verde é o que está pronto para ir ao ar.
 */
export const LEVEL_STYLES: Record<
  CampaignNodeType,
  { band: string; text: string; ring: string; border: string; hex: string }
> = {
  campanha: {
    band: 'bg-primary/10',
    text: 'text-primary',
    ring: 'ring-primary/40',
    border: 'border-primary/30',
    hex: 'hsl(250 80% 58%)',
  },
  conjunto: {
    band: 'bg-info/10',
    text: 'text-info',
    ring: 'ring-info/40',
    border: 'border-info/30',
    hex: 'hsl(217 91% 60%)',
  },
  anuncio: {
    band: 'bg-success/10',
    text: 'text-success',
    ring: 'ring-success/40',
    border: 'border-success/30',
    hex: 'hsl(142 71% 45%)',
  },
}

function CampaignNodeCardComponent({ id, data, selected }: NodeProps) {
  const payload = data as CampaignNodePayload
  const Icon = ICONS[payload.type]
  const style = LEVEL_STYLES[payload.type]
  const childType = ALLOWED_CHILD[payload.type]
  const hasIssues = payload.issues.length > 0

  return (
    <div
      className={cn(
        'w-64 overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow',
        style.border,
        selected ? cn('shadow-md ring-2', style.ring) : 'hover:shadow-md',
      )}
    >
      {payload.type !== 'campanha' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-2 !w-2 !border-0"
          style={{ background: style.hex }}
        />
      )}

      <div className={cn('flex items-center gap-1.5 px-3 py-1.5', style.band)}>
        <Icon className={cn('h-3.5 w-3.5 shrink-0', style.text)} />
        <span className={cn('text-[10px] font-semibold uppercase tracking-wider', style.text)}>
          {NODE_LABELS[payload.type]}
        </span>

        {hasIssues && (
          <span
            className="ml-auto inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning"
            title={payload.issues.join(' · ')}
          >
            <TriangleAlert className="h-3 w-3" />
            {payload.issues.length}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3">
        <p className="text-sm font-medium leading-snug">{payload.label || 'Sem nome'}</p>

        {(payload.chips.length > 0 || payload.budget) && (
          <div className="flex flex-wrap items-center gap-1">
            {payload.budget && (
              // Orçamento em destaque: é o número que se procura primeiro numa
              // revisão de campanha.
              <span className="rounded bg-foreground/5 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
                {payload.budget}
              </span>
            )}
            {payload.chips.map((chip) => (
              <span
                key={chip}
                className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {payload.hasScript && (
          <span className="inline-flex w-fit items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-[11px] text-success">
            <FileText className="h-3 w-3" />
            Roteiro vinculado
          </span>
        )}

        {/* A lista inteira só quando o nó está selecionado: senão um nó com
            quatro avisos fica três vezes mais alto que os vizinhos e a árvore
            perde o alinhamento. */}
        {hasIssues && selected && (
          <ul className="flex flex-col gap-1 border-t border-border pt-2">
            {payload.issues.map((issue) => (
              <li key={issue} className="flex items-start gap-1 text-[11px] leading-tight text-warning">
                <TriangleAlert className="mt-px h-3 w-3 shrink-0" />
                {issue}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-1">
          {childType && (
            <Button
              variant="ghost"
              size="sm"
              className="nodrag h-7 px-2 text-xs"
              onClick={(event) => {
                event.stopPropagation()
                payload.onAddChild(id)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {NODE_LABELS[childType]}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="nodrag ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
            aria-label={`Remover ${payload.label || NODE_LABELS[payload.type]}`}
            onClick={(event) => {
              event.stopPropagation()
              payload.onDelete(id)
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {childType && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-2 !w-2 !border-0"
          style={{ background: style.hex }}
        />
      )}
    </div>
  )
}

export const CampaignNodeCard = memo(CampaignNodeCardComponent)

export interface NodeSummary {
  chips: string[]
  budget: string | null
}

/**
 * Os campos que identificam o nó de relance, como etiquetas separadas.
 *
 * Era uma frase única com " · " no meio; virou lista porque etiqueta separada
 * é escaneável e frase é lida palavra por palavra.
 */
export function summarize(type: CampaignNodeType, data: Record<string, unknown>): NodeSummary {
  const chips: string[] = []
  const budget = data.budget_amount ? formatBudget(data.budget_amount as number) : null

  if (type === 'campanha') {
    push(chips, labelFor(META_CAMPAIGN_OBJECTIVES, data.objective as string))
    if (data.ab_test) chips.push('Teste A/B')
  }

  if (type === 'conjunto') {
    push(chips, labelFor(META_AUDIENCE_TYPES, data.audience_type as string))
    push(chips, labelFor(META_OPTIMIZATION_GOALS, data.optimization_goal as string))
    push(chips, labelFor(META_PLACEMENT_MODES, data.placement_mode as string))
  }

  if (type === 'anuncio') {
    push(chips, labelFor(META_AD_FORMATS, data.format as string))
    push(chips, labelFor(META_CTAS, data.cta as string))
  }

  return { chips, budget }
}

/** labelFor devolve "—" quando o campo está vazio; isso não vira etiqueta. */
function push(chips: string[], label: string) {
  if (label !== '—') chips.push(label)
}

function formatBudget(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}
