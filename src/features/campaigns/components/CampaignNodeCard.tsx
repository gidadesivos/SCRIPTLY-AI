import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FileText, Layers, Megaphone, Plus, Target, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { labelFor } from '@/config/options'
import {
  META_AD_FORMATS,
  META_AUDIENCE_TYPES,
  META_CAMPAIGN_OBJECTIVES,
  META_OPTIMIZATION_GOALS,
} from '@/features/campaigns/meta-options'
import { ALLOWED_CHILD, NODE_LABELS, type CampaignNodeType } from '@/features/campaigns/types'
import { cn } from '@/lib/utils'

export interface CampaignNodePayload extends Record<string, unknown> {
  type: CampaignNodeType
  label: string
  summary: string
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
 * Cor por nível, não por estado.
 *
 * Quem monta campanha lê a árvore de relance: o nível precisa ser reconhecível
 * antes de ler o texto. O aviso de problema entra como borda, sem competir com
 * essa leitura.
 */
const TONES: Record<CampaignNodeType, string> = {
  campanha: 'border-l-primary',
  conjunto: 'border-l-info',
  anuncio: 'border-l-success',
}

function CampaignNodeCardComponent({ id, data, selected }: NodeProps) {
  const payload = data as CampaignNodePayload
  const Icon = ICONS[payload.type]
  const childType = ALLOWED_CHILD[payload.type]
  const hasIssues = payload.issues.length > 0

  return (
    <div
      className={cn(
        'w-64 rounded-lg border border-l-4 bg-card p-3 text-card-foreground shadow-sm transition-colors',
        TONES[payload.type],
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border',
        hasIssues && !selected && 'border-warning',
      )}
    >
      {/* Campanha é raiz: não recebe conexão de cima. */}
      {payload.type !== 'campanha' && (
        <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      )}

      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {NODE_LABELS[payload.type]}
          </p>
          <p className="truncate text-sm font-medium">{payload.label || 'Sem nome'}</p>
        </div>
      </div>

      {payload.summary && (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{payload.summary}</p>
      )}

      {payload.hasScript && (
        <p className="mt-2 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
          <FileText className="h-3 w-3" />
          Roteiro vinculado
        </p>
      )}

      {hasIssues && (
        <ul className="mt-2 flex flex-col gap-1">
          {payload.issues.map((issue) => (
            <li
              key={issue}
              className="flex items-start gap-1 text-[11px] leading-tight text-warning"
            >
              <TriangleAlert className="mt-px h-3 w-3 shrink-0" />
              {issue}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center gap-1">
        {childType && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
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
          className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label={`Remover ${payload.label || NODE_LABELS[payload.type]}`}
          onClick={(event) => {
            event.stopPropagation()
            payload.onDelete(id)
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {childType && (
        <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
      )}
    </div>
  )
}

export const CampaignNodeCard = memo(CampaignNodeCardComponent)

/** Resumo de uma linha, com os campos que identificam o nó de relance. */
export function summarize(type: CampaignNodeType, data: Record<string, unknown>): string {
  if (type === 'campanha') {
    const parts = [labelFor(META_CAMPAIGN_OBJECTIVES, data.objective as string)]
    if (data.budget_amount) parts.push(formatBudget(data.budget_amount as number))
    return parts.filter((p) => p !== '—').join(' · ')
  }

  if (type === 'conjunto') {
    const parts = [
      labelFor(META_AUDIENCE_TYPES, data.audience_type as string),
      labelFor(META_OPTIMIZATION_GOALS, data.optimization_goal as string),
    ]
    if (data.budget_amount) parts.push(formatBudget(data.budget_amount as number))
    return parts.filter((p) => p !== '—').join(' · ')
  }

  const parts = [labelFor(META_AD_FORMATS, data.format as string)]
  if (data.headline) parts.push(String(data.headline))
  return parts.filter((p) => p !== '—').join(' · ')
}

function formatBudget(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}
