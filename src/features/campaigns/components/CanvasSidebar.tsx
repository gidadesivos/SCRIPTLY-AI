import { useState } from 'react'
import {
  MousePointer2,
  Hand,
  PlusCircle,
  MessageSquare,
  StickyNote,
  Frame,
  Type,
  Shapes,
  MoreHorizontal,
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
  | 'connector'
  | 'note'
  | 'frame'
  | 'text'
  | 'shape'
  | 'comment'
  | 'more'

interface CanvasSidebarProps {
  activeTool: ToolType
  setActiveTool: (tool: ToolType) => void
}

export function CanvasSidebar({ activeTool, setActiveTool }: CanvasSidebarProps) {
  const [expanded, setExpanded] = useState(false)

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
    { id: 'shape', icon: Shapes, label: 'Formas', shortcut: '' },
    { id: 'comment', icon: MessageSquare, label: 'Comentário', shortcut: '' },
    { type: 'separator' },
    { id: 'more', icon: MoreHorizontal, label: 'Mais ferramentas', shortcut: '' },
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
              onClick={() => setActiveTool(tool.id as ToolType)}
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
