import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react'
import {
  Users,
  Globe,
  MessageCircle,
  Tag,
  Activity,
  Info,
  Target,
  StickyNote,
  Frame,
  Type,
  Shapes,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fieldPlaceholder } from '@/features/campaigns/types'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '@/components/ui/context-menu'
import type { CampaignNodePayload } from './CampaignNodeCard'
import { useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'

const AUX_STYLES: Record<string, { color: string; bg: string; border: string; icon: any }> = {
  publico: { color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', icon: Users },
  landing_page: { color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/30', icon: Globe },
  whatsapp: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', icon: MessageCircle },
  oferta: { color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', icon: Tag },
  pixel_evento: { color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/30', icon: Activity },
  observacao: { color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/30', icon: Info },
  meta_kpi: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', icon: Target },
  nota: { color: 'text-[#1E1E1E]', bg: 'bg-[#FFEB3B]', border: 'border-[#FBC02D]', icon: StickyNote },
  frame: { color: 'text-zinc-400', bg: 'bg-zinc-400/5', border: 'border-zinc-500', icon: Frame },
  texto: { color: 'text-[#EDEDF2]', bg: 'bg-transparent', border: 'border-transparent', icon: Type },
  forma: { color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/30', icon: Shapes },
  formulario: { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', icon: FileText },
}

export function AuxiliaryNodeCard({ id, data, type, selected }: NodeProps) {
  const payload = data as CampaignNodePayload
  const style = AUX_STYLES[type || 'observacao'] || AUX_STYLES.observacao
  const Icon = style.icon

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(payload.label)

  const handleSave = () => {
    if (editValue.trim() !== payload.label) {
      payload.onUpdate(id, { label: editValue.trim() || (type === 'texto' ? 'Texto' : 'Sem nome') })
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      setEditValue(payload.label)
      setIsEditing(false)
    }
  }

  const DESTINATION_TYPES = ['whatsapp', 'landing_page', 'formulario', 'publico', 'oferta', 'pixel_evento', 'observacao', 'meta_kpi']
  const isDestination = DESTINATION_TYPES.includes(type || '')

  const renderHandles = () => (
    <>
      {/* Structural parent handle — matches 'child' sourceHandle from CampaignNodeCard */}
      {isDestination && (
        <Handle
          type="target"
          position={Position.Left}
          id="parent"
          className="!h-2.5 !w-2.5 !border-0 !bg-emerald-400"
        />
      )}
      <Handle type="target" position={Position.Top} id="link-in" className="h-2 w-2 rounded-full border-2 border-[#14141C] bg-[#6E6E85] opacity-0 transition-opacity group-hover:opacity-100" />
      <Handle type="source" position={Position.Bottom} id="link-out" className="h-2 w-2 rounded-full border-2 border-[#14141C] bg-[#6E6E85] opacity-0 transition-opacity group-hover:opacity-100" />
      <Handle type="source" position={Position.Right} id="link-right" className="h-2 w-2 rounded-full border-2 border-[#14141C] bg-[#6E6E85] opacity-0 transition-opacity group-hover:opacity-100" />
      {!isDestination && (
        <Handle type="target" position={Position.Left} id="link-left" className="h-2 w-2 rounded-full border-2 border-[#14141C] bg-[#6E6E85] opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </>
  )

  const renderNota = () => (
    <div
      className={cn(
        'group relative flex flex-col rounded-md border p-3 shadow-md transition-all min-h-[120px] min-w-[120px]',
        style.bg,
        style.border,
        selected ? 'ring-2 ring-white/50' : 'hover:brightness-95'
      )}
      onDoubleClick={() => setIsEditing(true)}
    >
      <NodeResizer isVisible={selected} minWidth={120} minHeight={120} handleClassName="h-2 w-2 bg-white rounded-sm border border-neutral-300" lineClassName="border-blue-400" />
      {renderHandles()}
      {isEditing ? (
        <TextareaAutosize
          autoFocus
          className="w-full resize-none bg-transparent text-sm text-[#1E1E1E] outline-none placeholder:text-black/40"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="Escreva algo..."
        />
      ) : (
        <div className="whitespace-pre-wrap text-sm text-[#1E1E1E] break-words">
          {payload.label}
        </div>
      )}
    </div>
  )

  const renderTexto = () => (
    <div
      className={cn(
        'group relative transition-all min-w-[100px]',
        selected ? 'ring-1 ring-white/20 rounded p-1 -m-1' : ''
      )}
      onDoubleClick={() => setIsEditing(true)}
    >
      {renderHandles()}
      {isEditing ? (
        <TextareaAutosize
          autoFocus
          className="w-full resize-none bg-transparent text-lg font-medium text-[#EDEDF2] outline-none placeholder:text-muted-foreground"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="Texto..."
        />
      ) : (
        <div className="whitespace-pre-wrap text-lg font-medium text-[#EDEDF2]">
          {payload.label}
        </div>
      )}
    </div>
  )

  const renderFrame = () => (
    <div
      className={cn(
        'group relative rounded-lg border-2 border-dashed p-4 transition-all min-h-[300px] min-w-[300px] bg-[#0E0E14]',
        style.border,
        selected ? 'ring-2 ring-white/20' : ''
      )}
      style={{ zIndex: -10 }}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('.frame-header')) {
          setIsEditing(true)
        }
      }}
    >
      <NodeResizer isVisible={selected} minWidth={200} minHeight={200} handleClassName="h-2 w-2 bg-[#6D4AFF] rounded-sm" lineClassName="border-[#6D4AFF]" />
      {renderHandles()}
      <div className="frame-header absolute -top-3 left-4 flex items-center gap-2 bg-[#0E0E14] px-2 text-sm text-zinc-400 cursor-text">
        <Icon className="h-4 w-4" />
        {isEditing ? (
          <input
            autoFocus
            className="w-32 bg-transparent text-zinc-300 outline-none ring-0 placeholder:text-muted-foreground"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span className="font-semibold text-zinc-300">{payload.label}</span>
        )}
      </div>
    </div>
  )

  const renderWhatsApp = () => (
    <div
      className={cn(
        'group relative flex flex-col gap-1 rounded-xl border border-emerald-500/30 bg-gradient-to-b from-[#14141C] to-[#1A1A24] px-4 py-3 min-w-[220px] shadow-lg transition-all',
        selected ? 'ring-2 ring-emerald-500/50' : 'hover:border-emerald-500/50'
      )}
      onDoubleClick={() => setIsEditing(true)}
    >
      {renderHandles()}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-emerald-500/80 tracking-wider">Destino WhatsApp</span>
          {isEditing ? (
            <input
              autoFocus
              className="w-full bg-transparent outline-none ring-0 placeholder:text-muted-foreground text-sm font-semibold text-emerald-50"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <span className="text-sm font-semibold text-emerald-50 block truncate max-w-[150px]">{payload.label || 'Sem número'}</span>
          )}
        </div>
      </div>
    </div>
  )

  const renderLandingPage = () => (
    <div
      className={cn(
        'group relative flex flex-col gap-2 rounded-xl border border-sky-500/30 bg-gradient-to-b from-[#14141C] to-[#1A1A24] p-1 min-w-[240px] shadow-lg transition-all',
        selected ? 'ring-2 ring-sky-500/50' : 'hover:border-sky-500/50'
      )}
      onDoubleClick={() => setIsEditing(true)}
    >
      <NodeResizer isVisible={selected} minWidth={200} minHeight={120} handleClassName="h-2 w-2 bg-sky-400 rounded-sm" lineClassName="border-sky-400/50" />
      {renderHandles()}
      <div className="flex items-center gap-2 px-3 pt-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-sky-500/20 text-sky-400">
          <Globe className="h-3.5 w-3.5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-sky-500/80 tracking-wider">Página de Destino</span>
        </div>
      </div>
      <div className="px-3 pb-2 text-xs text-sky-100/70 truncate flex items-center">
        {isEditing ? (
            <input
              autoFocus
              className="w-full bg-transparent outline-none ring-0 placeholder:text-muted-foreground text-xs text-sky-100"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <span className="truncate max-w-[200px]">{payload.label || 'https://...'}</span>
          )}
      </div>
      <div className="h-24 w-full bg-[#1E1E28] rounded-lg mt-1 border border-white/5 flex items-center justify-center overflow-hidden relative">
         <span className="text-[10px] text-white/20 font-medium tracking-widest uppercase">Preview Indisponível</span>
      </div>
    </div>
  )

  const renderFormulario = () => {
    const formData = payload._originalData as any
    const fields = formData?.form_fields || []
    
    return (
      <div
        className={cn(
          'group relative flex flex-col gap-3 rounded-xl border border-blue-500/30 bg-gradient-to-b from-[#14141C] to-[#1A1A24] p-4 min-w-[260px] shadow-lg transition-all',
          selected ? 'ring-2 ring-blue-500/50' : 'hover:border-blue-500/50'
        )}
        onDoubleClick={() => setIsEditing(true)}
      >
        <NodeResizer isVisible={selected} minWidth={220} minHeight={150} handleClassName="h-2 w-2 bg-blue-400 rounded-sm" lineClassName="border-blue-400/50" />
        {renderHandles()}
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-[10px] uppercase font-bold text-blue-500/80 tracking-wider">Formulário de Lead</span>
            {isEditing ? (
              <input
                autoFocus
                className="w-full bg-transparent outline-none ring-0 placeholder:text-muted-foreground text-sm font-semibold text-blue-50"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
              />
            ) : (
              <span className="text-sm font-semibold text-blue-50 block truncate max-w-[180px]">{payload.label || 'Novo Formulário'}</span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 mt-2 nodrag">
          {fields.length === 0 ? (
            <div className="text-[11px] text-muted-foreground italic text-center py-4 bg-white/5 rounded border border-white/10">Nenhum campo.<br/>Configure no menu lateral.</div>
          ) : (
            fields.map((f: any, i: number) => (
              <div key={f.id || i} className="flex flex-col gap-1">
                <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                  {f.label || 'Sem pergunta'}{' '}
                  {f.required && <span className="text-destructive">*</span>}
                </span>
                {/* O exemplo vem do tipo do campo — é ele que diz ao lead qual
                    formato esperar. Antes tudo que não era e-mail ou telefone
                    virava "Sua resposta...", inclusive CEP e data. */}
                <div
                  className={cn(
                    'flex w-full items-center rounded border border-white/10 bg-black/40 px-2 text-[11px] text-white/30',
                    f.type === 'textarea' ? 'h-14 items-start pt-1.5' : 'h-8',
                  )}
                >
                  {f.type === 'select'
                    ? (f.options?.length ?? 0) > 0
                      ? f.options[0]
                      : 'Lista sem opções'
                    : f.type === 'boolean'
                      ? 'Sim / Não'
                      : fieldPlaceholder(f.type)}
                </div>
                {f.help && (
                  <span className="ml-1 text-[9px] text-muted-foreground/70">{f.help}</span>
                )}
              </div>
            ))
          )}
        </div>
        <button className="nodrag mt-2 w-full rounded bg-blue-600 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-blue-500">
          {String(formData?.submit_label || 'Cadastre-se')}
        </button>
      </div>
    )
  }

  const renderDefault = () => (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-sm backdrop-blur-md transition-all',
        'bg-[#14141C]/80',
        style.border,
        selected ? 'ring-2 ring-white/20' : 'hover:border-white/20',
      )}
      onDoubleClick={() => setIsEditing(true)}
    >
      {renderHandles()}
      <div className={cn('flex h-6 w-6 items-center justify-center rounded', style.bg, style.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 font-medium text-[#EDEDF2]">
        {isEditing ? (
          <input
            autoFocus
            className="w-32 bg-transparent outline-none ring-0 placeholder:text-muted-foreground"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span className="block truncate max-w-[120px]">{payload.label}</span>
        )}
      </div>
    </div>
  )

  let content = renderDefault()
  if (type === 'nota') content = renderNota()
  else if (type === 'texto') content = renderTexto()
  else if (type === 'frame') content = renderFrame()
  else if (type === 'whatsapp') content = renderWhatsApp()
  else if (type === 'landing_page') content = renderLandingPage()
  else if (type === 'formulario') content = renderFormulario()

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {content}
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48 border-[#1E1E28] bg-[#14141C] text-[#EDEDF2] z-[1000]">
        <ContextMenuItem onClick={() => setIsEditing(true)}>Editar</ContextMenuItem>
        <ContextMenuSeparator className="bg-[#23232F]" />
        <ContextMenuItem onClick={() => payload.onDuplicate(id)}>Duplicar</ContextMenuItem>
        <ContextMenuItem onClick={() => payload.onCopy(id)}>Copiar</ContextMenuItem>
        {payload.hasClipboard && <ContextMenuItem onClick={() => payload.onPaste()}>Colar (Irmão)</ContextMenuItem>}
        <ContextMenuSeparator className="bg-[#23232F]" />
        <ContextMenuItem
          className="text-red-400 focus:bg-red-400/10 focus:text-red-500"
          onClick={() => payload.onDelete(id)}
        >
          Excluir
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
