import { memo, useState, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FileText, Megaphone, Play, FolderTree, Users, Plus, Trash2, TriangleAlert, Lock, Star, CheckSquare, Target, Filter, MonitorSmartphone, MousePointerClick, Tag, SplitSquareHorizontal, CircleDollarSign, Lightbulb, Magnet, Type, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PROPERTY_ICONS: Record<string, any> = {
  objective: Target,
  ab_test: SplitSquareHorizontal,
  audience: Users,
  optimization: MousePointerClick,
  placement: MonitorSmartphone,
  format: Megaphone,
  cta: Tag,
  funnel: Filter,
  angle: Lightbulb,
  hook: Magnet,
  headline: Type,
  destination: Globe,
}
import { labelFor } from '@/config/options'
import {
  META_AD_FORMATS,
  META_AUDIENCE_TYPES,
  META_CAMPAIGN_OBJECTIVES,
  META_CTAS,
  META_OPTIMIZATION_GOALS,
  META_PLACEMENT_MODES,
  STATUS_OPTIONS,
} from '@/features/campaigns/meta-options'
import { ALLOWED_CHILD, NODE_LABELS, type CampaignNodeType } from '@/features/campaigns/types'
import { cn } from '@/lib/utils'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export interface CampaignNodePayload extends Record<string, unknown> {
  type: CampaignNodeType
  label: string
  properties?: Array<{ iconKey: string; text: string }>
  budget: string | null
  issues: string[]
  hasScript: boolean
  media: { kind: string; embedUrl: string } | null
  status: string
  locked: boolean
  favorite: boolean
  tasksInfo?: { total: number; completed: number } | null
  onAddChild: (id: string) => void
  onAddNode: (type: string, position: { x: number; y: number }, parentId?: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: any) => void
  onDuplicate: (id: string) => void
  onCopy: (id: string) => void
  onPaste: () => void
  hasClipboard: boolean
  [key: string]: unknown
}

const LEVEL_ICONS: Partial<Record<CampaignNodeType, any>> = {
  campanha: FolderTree,
  conjunto: Users,
  anuncio: Megaphone,
}

export const LEVEL_STYLES: Partial<Record<CampaignNodeType, { band: string; text: string; ring: string; border: string; hex: string }>> = {
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
  const Icon = LEVEL_ICONS[payload.type] || FolderTree
  const style = LEVEL_STYLES[payload.type] || LEVEL_STYLES.campanha!
  const childType = ALLOWED_CHILD[payload.type]
  const hasIssues = payload.issues.length > 0

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(payload.label)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleSave = () => {
    if (editValue.trim() !== payload.label) {
      payload.onUpdate(id, { label: editValue.trim() || 'Sem nome' })
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setEditValue(payload.label)
      setIsEditing(false)
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-400',
    planning: 'bg-blue-400',
    review: 'bg-purple-400',
    adjustments: 'bg-orange-400',
    approved: 'bg-emerald-400',
    active: 'bg-green-500 animate-pulse',
    paused: 'bg-yellow-500',
    finished: 'bg-indigo-400',
    archived: 'bg-zinc-600'
  }
  const statusColor = STATUS_COLORS[payload.status] || STATUS_COLORS.draft

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'group w-64 overflow-hidden rounded-xl border bg-card/95 backdrop-blur-sm text-card-foreground shadow-sm transition-all duration-300 ease-out relative',
            style.border,
            selected ? cn('shadow-lg ring-2 ring-offset-1 ring-offset-background scale-[1.02] z-10', style.ring) : 'hover:shadow-lg hover:-translate-y-1',
            payload.locked ? 'nodrag' : ''
          )}
          style={payload.locked ? { opacity: 0.9 } : undefined}
        >
          <div className={cn("absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-card shadow-sm z-10", statusColor)} title={`Status: ${payload.status}`} />
          {payload.type !== 'campanha' && (
            <Handle
              id="parent"
              type="target"
              position={Position.Left}
              className="!h-2.5 !w-2.5 !border-0"
              style={{ background: style.hex }}
              title="Conectar a uma campanha para mover este nó"
            />
          )}

          <Handle
            id="link-in"
            type="target"
            position={Position.Top}
            className="!h-2.5 !w-2.5 !border-2 !border-background !bg-muted-foreground opacity-0 transition-all duration-300 group-hover:opacity-100 hover:!scale-150"
            title="Receber uma ligação de anotação"
          />
          <Handle
            id="link-out"
            type="source"
            position={Position.Bottom}
            className="!h-2.5 !w-2.5 !border-2 !border-background !bg-muted-foreground opacity-0 transition-all duration-300 group-hover:opacity-100 hover:!scale-150"
            title="Ligar a outro nó (anotação, qualquer direção)"
          />

          <div className={cn('flex items-center gap-1.5 px-3 py-1.5', style.band)}>
            <Icon className={cn('h-3.5 w-3.5 shrink-0', style.text)} />
            <span className={cn('text-[10px] font-semibold uppercase tracking-wider', style.text)}>
              {NODE_LABELS[payload.type]}
            </span>

            <div className="ml-auto flex items-center gap-1">
              {payload.locked && <span title="Bloqueado"><Lock className="h-3 w-3 text-muted-foreground" /></span>}
              {payload.favorite && <span title="Favorito"><Star className="h-3 w-3 text-yellow-500" /></span>}
              
              {hasIssues && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning"
                  title={payload.issues.join(' · ')}
                >
                  <TriangleAlert className="h-3 w-3" />
                  {payload.issues.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 p-3">
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="h-7 text-sm font-semibold px-1 py-0"
              />
            ) : (
              <p 
                className="text-sm font-medium leading-snug cursor-text hover:bg-muted/50 rounded -mx-1 px-1 transition-colors"
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setEditValue(payload.label)
                  setIsEditing(true)
                }}
                title="Duplo clique para editar"
              >
                {payload.label || 'Sem nome'}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1">
              {payload.status && (
                <span 
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium border",
                    payload.status === 'active' || payload.status === 'approved' ? "bg-success/10 text-success border-success/20" :
                    payload.status === 'paused' || payload.status === 'archived' ? "bg-muted text-muted-foreground border-border" :
                    payload.status === 'changes_requested' ? "bg-destructive/10 text-destructive border-destructive/20" :
                    "bg-primary/10 text-primary border-primary/20"
                  )}
                >
                  {labelFor(STATUS_OPTIONS, payload.status)}
                </span>
              )}
              {payload.budget && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  <CircleDollarSign className="h-3 w-3" />
                  {payload.budget}
                </span>
              )}
              {payload.tasksInfo && (
                <span 
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide",
                    payload.tasksInfo.completed === payload.tasksInfo.total 
                      ? "bg-success/15 text-success" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <CheckSquare className="h-3 w-3" />
                  {payload.tasksInfo.completed}/{payload.tasksInfo.total}
                </span>
              )}
            </div>

            {payload.properties && payload.properties.length > 0 && (
              <div className="grid grid-cols-1 gap-1.5 mb-1 mt-2">
                {payload.properties.map((prop, i) => {
                  const PropIcon = PROPERTY_ICONS[prop.iconKey] || Tag
                  return (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground bg-foreground/[0.02] hover:bg-foreground/[0.05] transition-colors border border-border/40 px-2.5 py-1.5 rounded-lg">
                      <PropIcon className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform group-hover:scale-110" />
                      <span className="truncate font-medium">{prop.text}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {payload.media?.embedUrl && (
              <MediaThumb media={payload.media} />
            )}

            {payload.type === 'anuncio' && typeof payload._originalData?.primary_text === 'string' && payload._originalData.primary_text && (
              <div className="mb-2 mt-2 flex flex-col gap-1 rounded-md border border-border/40 bg-foreground/[0.02] p-2.5 text-[11px] text-muted-foreground transition-colors hover:bg-foreground/[0.04]">
                <span className="font-semibold text-foreground/80 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 opacity-70" /> Texto Principal</span>
                <p className="line-clamp-2 whitespace-pre-wrap leading-relaxed opacity-80 mt-0.5">{String(payload._originalData.primary_text)}</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" className="nodrag h-auto p-0 mt-0.5 text-[10px] text-primary/80 hover:text-primary justify-start w-fit">Ver completo</Button>
                  </DialogTrigger>
                  <DialogContent className="nodrag max-w-md max-h-[80vh] overflow-y-auto z-[100]">
                    <DialogHeader>
                      <DialogTitle className="text-lg">Texto Principal (Copy)</DialogTitle>
                      <DialogDescription>
                        Copy completa vinculada a este anúncio.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="text-sm text-foreground whitespace-pre-wrap mt-2 p-4 bg-muted/40 rounded-md border border-border/50">
                      {String(payload._originalData.primary_text)}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {payload.hasScript && (
              <span className="inline-flex w-fit items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-[11px] text-success">
                <FileText className="h-3 w-3" />
                Roteiro vinculado
              </span>
            )}

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

            <div className="flex items-center gap-1 mt-2 border-t border-border/50 pt-2 opacity-60 transition-opacity duration-300 group-hover:opacity-100">
              {childType && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="nodrag h-7 px-2.5 text-xs rounded-md hover:bg-foreground/5 transition-colors"
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
                className="nodrag ml-auto h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                onClick={(event) => {
                  event.stopPropagation()
                  payload.onDelete(id)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {(childType || payload.type === 'anuncio') && (
            <Handle
              id="child"
              type="source"
              position={Position.Right}
              className="!h-2.5 !w-2.5 !border-0"
              style={{ background: style.hex }}
              title={payload.type === 'anuncio' ? 'Conectar a um Destino' : `Conectar a um ${NODE_LABELS[childType!]?.toLowerCase() || 'nó'} para trazê-lo para cá`}
            />
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => setIsEditing(true)}>Editar Título</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => payload.onCopy(id)}>Copiar</ContextMenuItem>
        <ContextMenuItem onClick={() => payload.onPaste()} disabled={!payload.hasClipboard}>Colar (como irmão)</ContextMenuItem>
        <ContextMenuItem onClick={() => payload.onDuplicate(id)}>Duplicar (com filhos)</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => {
          if (childType) {
            payload.onAddChild(id)
          }
        }} disabled={!childType} className={!childType ? "hidden" : ""}>
          Criar {childType ? NODE_LABELS[childType] : 'Filho'}
        </ContextMenuItem>
        
        {payload.type === 'anuncio' && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => payload.onAddNode('whatsapp', { x: 0, y: 0 }, id)}>
              <span className="text-emerald-400 font-medium">+ Destino WhatsApp</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => payload.onAddNode('landing_page', { x: 0, y: 0 }, id)}>
              <span className="text-sky-400 font-medium">+ Destino Página</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => payload.onAddNode('formulario', { x: 0, y: 0 }, id)}>
              <span className="text-blue-400 font-medium">+ Destino Formulário</span>
            </ContextMenuItem>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => {
          payload.onUpdate(id, { 
            data: { ...(payload as Record<string, any>)._originalData, locked: !payload.locked } 
          })
        }}>
          {payload.locked ? 'Desbloquear movimentação' : 'Bloquear movimentação'}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => {
          payload.onUpdate(id, { 
            data: { ...(payload as Record<string, any>)._originalData, favorite: !payload.favorite } 
          })
        }}>
          {payload.favorite ? 'Remover dos favoritos' : 'Favoritar'}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => {
          payload.onUpdate(id, { 
            data: { ...(payload as Record<string, any>)._originalData, status: 'archived' } 
          })
        }}>
          Arquivar
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => payload.onDelete(id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          Excluir
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function MediaThumb({ media }: { media: { kind: string; embedUrl: string } }) {
  if (media.embedUrl.includes('/preview')) {
    return (
      <div className="relative mt-2 w-full aspect-square overflow-hidden rounded border border-border bg-black/5">
        <iframe
          src={media.embedUrl}
          className="absolute left-0 top-0 border-0"
          style={{ width: '300%', height: '300%', transform: 'scale(0.333333)', transformOrigin: '0 0' }}
          allow="autoplay; fullscreen"
          loading="lazy"
        />
      </div>
    )
  }

  if (media.kind === 'image') {
    return (
      <img
        src={media.embedUrl}
        alt=""
        loading="lazy"
        className="mt-2 h-32 w-full rounded border border-border object-cover"
      />
    )
  }

  if (media.kind === 'video') {
    return (
      <video
        src={media.embedUrl}
        controls
        className="mt-2 h-32 w-full rounded border border-border bg-black/5 object-contain"
      />
    )
  }

  return (
    <span className="mt-2 inline-flex w-fit items-center gap-1 rounded bg-info/10 px-1.5 py-0.5 text-[11px] text-info">
      <Play className="h-3 w-3" />
      {media.kind === 'image' ? 'Imagem anexada' : 'Criativo anexado'}
    </span>
  )
}

export const CampaignNodeCard = memo(CampaignNodeCardComponent)

export interface NodeSummary {
  properties: Array<{ iconKey: string; text: string }>
  budget: string | null
  tasksInfo?: { total: number; completed: number } | null
}

export function summarize(type: CampaignNodeType, data: Record<string, unknown>): NodeSummary {
  const properties: Array<{ iconKey: string; text: string }> = []
  
  let budget = null
  if (data.budget_amount) {
    const formatted = formatBudget(data.budget_amount as number)
    const mode = data.budget_mode === 'daily' ? '/dia' : data.budget_mode === 'lifetime' ? ' total' : ''
    budget = `${formatted}${mode}`
  }
  
  let tasksInfo = null
  const tasks = data.tasks as Array<{ id: string; text: string; completed: boolean }> | undefined
  if (tasks && tasks.length > 0) {
    tasksInfo = {
      total: tasks.length,
      completed: tasks.filter((t) => t.completed).length,
    }
  }

  if (type === 'campanha') {
    if (data.objective && data.objective !== '—') properties.push({ iconKey: 'objective', text: labelFor(META_CAMPAIGN_OBJECTIVES, data.objective as string) })
    if (data.ab_test) properties.push({ iconKey: 'ab_test', text: 'Teste A/B' })
  }

  if (type === 'conjunto') {
    if (data.audience_type && data.audience_type !== '—') properties.push({ iconKey: 'audience', text: labelFor(META_AUDIENCE_TYPES, data.audience_type as string) })
    if (data.optimization_goal && data.optimization_goal !== '—') properties.push({ iconKey: 'optimization', text: labelFor(META_OPTIMIZATION_GOALS, data.optimization_goal as string) })
    if (data.placement_mode && data.placement_mode !== '—') properties.push({ iconKey: 'placement', text: labelFor(META_PLACEMENT_MODES, data.placement_mode as string) })
  }

  if (type === 'anuncio') {
    if (data.format && data.format !== '—') properties.push({ iconKey: 'format', text: labelFor(META_AD_FORMATS, data.format as string) })
    if (data.angle && typeof data.angle === 'string') properties.push({ iconKey: 'angle', text: `Ângulo: ${data.angle}` })
    if (data.hook && typeof data.hook === 'string') properties.push({ iconKey: 'hook', text: `Hook: ${data.hook}` })
    if (data.headline && typeof data.headline === 'string') properties.push({ iconKey: 'headline', text: data.headline })
    if (data.cta && data.cta !== '—') properties.push({ iconKey: 'cta', text: labelFor(META_CTAS, data.cta as string) })
    if (data.destination && typeof data.destination === 'string') properties.push({ iconKey: 'destination', text: data.destination.replace(/^https?:\/\//, '') })
  }

  return { properties, budget, tasksInfo }
}

function formatBudget(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}
