import { useEffect, useState } from 'react'
import {
  MousePointer2,
  Hand,
  PlusCircle,
  MessageSquare,
  StickyNote,
  Frame,
  Type,
  Shapes,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type ToolType =
  | 'cursor'
  | 'pan'
  | 'add_node'
  | 'note'
  | 'frame'
  | 'text'
  | 'shape'
  | 'comment'

/** Tecla -> ferramenta. É a mesma letra que aparece no rótulo do botão. */
const SHORTCUTS: Record<string, ToolType> = {
  v: 'cursor',
  h: 'pan',
  n: 'add_node',
  s: 'note',
  f: 'frame',
  t: 'text',
  r: 'shape',
  o: 'comment',
}

interface CanvasSidebarProps {
  activeTool: ToolType
  setActiveTool: (tool: ToolType) => void
}

export function CanvasSidebar({ activeTool, setActiveTool }: CanvasSidebarProps) {
  const [expanded, setExpanded] = useState(false)

  /*
   * Os atalhos anunciados nos tooltips agora existem.
   *
   * "Seleção (V)", "Post-it (S)", "Frame (F)" estavam escritos na tela desde
   * sempre, mas nada escutava o teclado — o rótulo prometia um atalho que não
   * era ligado a lugar nenhum.
   *
   * Modificador ligado é ignorado de propósito: Ctrl+V é colar, e trocar de
   * ferramenta no meio de uma colagem seria surpresa pura.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const alvo = document.activeElement
      if (
        alvo?.tagName === 'INPUT' ||
        alvo?.tagName === 'TEXTAREA' ||
        (alvo as HTMLElement | null)?.isContentEditable
      ) {
        return
      }

      const atalho = SHORTCUTS[event.key.toLowerCase()]
      if (!atalho) return
      event.preventDefault()
      setActiveTool(atalho)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setActiveTool])

  const handleDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/reactflow', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  const tools = [
    { id: 'cursor', icon: MousePointer2, label: 'Seleção (V)', shortcut: 'v' },
    { id: 'pan', icon: Hand, label: 'Mover (H)', shortcut: 'h' },
    { type: 'separator' },
    {
      id: 'add_node',
      icon: PlusCircle,
      label: 'Adicionar Nó (N)',
      shortcut: 'n',
      draggableTypes: ['campanha', 'conjunto', 'anuncio', 'formulario', 'publico', 'oferta', 'landing_page', 'whatsapp', 'observacao', 'meta_kpi', 'pixel_evento'],
    },
    { type: 'separator' },
    { id: 'note', icon: StickyNote, label: 'Post-it (S)', shortcut: 's' },
    { id: 'frame', icon: Frame, label: 'Frame (F)', shortcut: 'f' },
    { id: 'text', icon: Type, label: 'Texto (T)', shortcut: 't' },
    { id: 'shape', icon: Shapes, label: 'Forma (R)', shortcut: 'r' },
    { id: 'comment', icon: MessageSquare, label: 'Observação (O)', shortcut: 'o' },
  ]

  return (
    <div
      className={cn(
        'absolute left-4 top-1/2 z-50 flex -translate-y-1/2 flex-col items-center gap-1 rounded-xl border border-[#23232F] bg-[#14141C] p-2 shadow-xl transition-all duration-300',
        expanded ? 'w-48 items-start' : 'w-14 items-center',
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute -right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[#23232F] bg-[#1E1E28] text-[#8C8CA0] hover:text-[#EDEDF2]"
      >
        {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      <TooltipProvider delayDuration={300}>
        {tools.map((tool, idx) => {
          if (tool.type === 'separator') {
            return <div key={`sep-${idx}`} className="my-1 h-px w-full bg-[#23232F]" />
          }

          const isSelected = activeTool === tool.id
          const Icon = tool.icon!

          // Temporary drag example for add_node
          if (tool.id === 'add_node' && expanded) {
            return (
              <div key={tool.id} className="flex w-full flex-col gap-1">
                <div
                  className={cn(
                    'flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-[#8C8CA0] transition-colors hover:bg-[#1E1E28] hover:text-[#EDEDF2]',
                    isSelected && 'bg-[#1E1E28] text-[#EDEDF2]',
                  )}
                  onClick={() => setActiveTool(tool.id as ToolType)}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">{tool.label}</span>
                </div>
                {/* Draggable items */}
                <div className="flex flex-col gap-1 pl-8 pr-2 max-h-48 overflow-y-auto">
                  {tool.draggableTypes?.map((type) => (
                    <div
                      key={type}
                      className="cursor-grab rounded border border-[#23232F] bg-[#0E0E14] px-2 py-1 text-[10px] uppercase text-[#8C8CA0] hover:border-[#6C5DD3] hover:text-[#EDEDF2]"
                      draggable
                      onDragStart={(e) => handleDragStart(e, type)}
                    >
                      {type.replace('_', ' ')}
                    </div>
                  ))}
                </div>
              </div>
            )
          }

          const buttonContent = (
            <button
              onClick={() => {
                // Fechada, a lista de tipos não cabe: clicar em "Adicionar Nó"
                // abre o painel em vez de marcar uma ferramenta sem efeito.
                if (tool.id === 'add_node' && !expanded) setExpanded(true)
                setActiveTool(tool.id as ToolType)
              }}
              className={cn(
                'flex h-10 w-full items-center gap-3 rounded-lg px-2 text-[#8C8CA0] transition-colors hover:bg-[#1E1E28] hover:text-[#EDEDF2]',
                isSelected && 'bg-[#1E1E28] text-[#EDEDF2]',
                !expanded && 'justify-center',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {expanded && <span className="text-sm font-medium">{tool.label}</span>}
            </button>
          )

          if (expanded) return <div key={tool.id} className="w-full">{buttonContent}</div>

          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className="border-[#23232F] bg-[#14141C] text-[#EDEDF2]">
                <p>{tool.label}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </TooltipProvider>
    </div>
  )
}
