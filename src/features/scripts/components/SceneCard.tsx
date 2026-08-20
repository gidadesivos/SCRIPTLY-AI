import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Copy, GripVertical, Sparkles, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/FormField'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { countWords } from '@/lib/duration'
import type { Scene, ScenePatch } from '@/features/scripts/api'
import { cn } from '@/lib/utils'

const TEXT_FIELDS: Array<{ key: keyof ScenePatch; label: string; rows?: number }> = [
  { key: 'voiceover', label: 'Locução', rows: 3 },
  { key: 'on_screen_text', label: 'Texto em tela', rows: 2 },
  { key: 'visual', label: 'Visual', rows: 2 },
  { key: 'action', label: 'Ação', rows: 2 },
]

const SHORT_FIELDS: Array<{ key: keyof ScenePatch; label: string }> = [
  { key: 'shot', label: 'Plano' },
  { key: 'transition', label: 'Transição' },
  { key: 'broll', label: 'B-roll' },
  { key: 'sound_suggestion', label: 'Som' },
]

interface SceneCardProps {
  scene: Scene
  index: number
  onChange: (patch: ScenePatch) => void
  onBlur: () => void
  onDuplicate: () => void
  onDelete: () => void
  onRegenerate: () => void
  isBusy: boolean
}

export function SceneCard({
  scene,
  index,
  onChange,
  onBlur,
  onDuplicate,
  onDelete,
  onRegenerate,
  isBusy,
}: SceneCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const words = countWords(scene.voiceover ?? '')

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn('flex flex-col gap-4 p-4', isDragging && 'opacity-60 shadow-md')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-11 w-8 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
            aria-label={`Reordenar cena ${index + 1}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">Cena {index + 1}</span>
          {words > 0 && (
            <span className="text-xs text-muted-foreground">{words} palavras</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-11"
            onClick={onRegenerate}
            disabled={isBusy}
            aria-label={`Regenerar cena ${index + 1} com IA`}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Regenerar</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                aria-label={`Ações da cena ${index + 1}`}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onDuplicate}>
                <Copy className="h-4 w-4" />
                Duplicar cena
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4" />
                Excluir cena
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <FormField label="Função narrativa">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={scene.purpose ?? ''}
            onChange={(event) => onChange({ purpose: event.target.value })}
            onBlur={onBlur}
            placeholder="Ex: Hook, Prova, CTA"
          />
        )}
      </FormField>

      {TEXT_FIELDS.map(({ key, label, rows }) => (
        <FormField key={key} label={label}>
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              rows={rows}
              value={(scene[key as keyof Scene] as string | null) ?? ''}
              onChange={(event) => onChange({ [key]: event.target.value })}
              onBlur={onBlur}
            />
          )}
        </FormField>
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        {SHORT_FIELDS.map(({ key, label }) => (
          <FormField key={key} label={label}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                value={(scene[key as keyof Scene] as string | null) ?? ''}
                onChange={(event) => onChange({ [key]: event.target.value })}
                onBlur={onBlur}
              />
            )}
          </FormField>
        ))}
      </div>
    </Card>
  )
}
