import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GitBranch, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createVariation, listVariations } from '@/features/scripts/versions-api'
import { AiError, generateVariations } from '@/lib/ai'
import { strings } from '@/i18n/pt-BR'
import type { Scene, Script } from '@/features/scripts/api'

const LABELS = ['B', 'C', 'D', 'E']

interface VariationsPanelProps {
  script: Script
  scenes: Scene[]
  contextRef: { workspaceId: string; brandId: string; productId?: string | null }
}

export function VariationsPanel({ script, scenes, contextRef }: VariationsPanelProps) {
  const queryClient = useQueryClient()
  const [isGenerating, setIsGenerating] = useState(false)

  const { data: variations = [] } = useQuery({
    queryKey: ['scripts', 'variations', script.id],
    queryFn: () => listVariations(script.id),
  })

  const create = useMutation({
    mutationFn: async () => {
      const used = new Set(variations.map((v) => v.label))
      const nextLabel = LABELS.find((label) => !used.has(label))
      if (!nextLabel) throw new Error('Limite de variações atingido.')

      const result = await generateVariations(
        contextRef,
        {
          title: script.title,
          hook: script.hook_text ?? '',
          cta: script.cta ?? '',
          scenes: scenes.map((scene) => scene.voiceover ?? ''),
        },
        1,
      )

      const draft = result.variations[0]
      if (!draft) throw new Error('A IA não devolveu variação.')

      return createVariation(script.id, { ...draft, label: nextLabel })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts', 'variations', script.id] })
      toast.success('Variação criada. O original não foi alterado.')
    },
    onError: (error) => {
      toast.error(error instanceof AiError ? error.message : strings.errors.unexpected)
    },
    onSettled: () => setIsGenerating(false),
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <GitBranch className="h-4 w-4" />
          Variações A/B
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="h-11"
          disabled={isGenerating || create.isPending || scenes.length === 0}
          onClick={() => {
            setIsGenerating(true)
            create.mutate()
          }}
        >
          {create.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Criar variação
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Cada variação vira um roteiro próprio. O original nunca é tocado.
      </p>

      {variations.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Nenhuma variação ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {variations.map((item) => (
            <li key={item.id}>
              <Card className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Variação {item.label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.variation?.title ?? '—'}
                  </p>
                </div>
                {item.variation && (
                  <Button asChild variant="ghost" size="sm" className="h-11 shrink-0">
                    <Link to={`/scripts/${item.variation.id}`}>Abrir</Link>
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
