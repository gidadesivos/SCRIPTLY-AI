import { useState } from 'react'
import { Check, Loader2, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/FormField'
import { AiError, rewriteSection } from '@/lib/ai'
import { strings } from '@/i18n/pt-BR'
import type { Scene, Script } from '@/features/scripts/api'

/** Alvo da alteração cirúrgica: um campo do roteiro ou de uma cena específica. */
export type CopilotTarget =
  | { kind: 'script'; field: 'hook_text' | 'cta' | 'title' | 'strategy_summary'; label: string }
  | { kind: 'scene'; sceneId: string; field: 'voiceover' | 'on_screen_text'; label: string }

interface QuickAction {
  label: string
  instruction: string
  targetFor: (script: Script, scenes: Scene[]) => CopilotTarget | null
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Melhorar o CTA',
    instruction: 'Deixe o CTA mais direto e específico, mantendo o mesmo objetivo.',
    targetFor: () => ({ kind: 'script', field: 'cta', label: 'CTA' }),
  },
  {
    label: 'Fortalecer o hook',
    instruction: 'Deixe o hook mais específico e com mais tensão no primeiro segundo.',
    targetFor: () => ({ kind: 'script', field: 'hook_text', label: 'Hook' }),
  },
  {
    label: 'Encurtar a locução da primeira cena',
    instruction: 'Reduza a locução preservando a função narrativa e o sentido.',
    targetFor: (_script, scenes) =>
      scenes[0]
        ? { kind: 'scene', sceneId: scenes[0].id, field: 'voiceover', label: 'Locução da cena 1' }
        : null,
  },
]

interface CopilotPanelProps {
  script: Script
  scenes: Scene[]
  contextRef: { workspaceId: string; brandId: string; productId?: string | null }
  onApply: (target: CopilotTarget, content: string) => Promise<void>
}

export function CopilotPanel({ script, scenes, contextRef, onApply }: CopilotPanelProps) {
  const [instruction, setInstruction] = useState('')
  const [targetKey, setTargetKey] = useState<string>('cta')
  const [isRunning, setIsRunning] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [preview, setPreview] = useState<{
    target: CopilotTarget
    before: string
    after: string
    note: string
  } | null>(null)

  /** Opções de alvo: campos do roteiro + locução de cada cena. */
  const targetOptions: Array<{ key: string; target: CopilotTarget }> = [
    { key: 'hook_text', target: { kind: 'script', field: 'hook_text', label: 'Hook' } },
    { key: 'cta', target: { kind: 'script', field: 'cta', label: 'CTA' } },
    { key: 'title', target: { kind: 'script', field: 'title', label: 'Título' } },
    ...scenes.map((scene, index) => ({
      key: `scene:${scene.id}`,
      target: {
        kind: 'scene' as const,
        sceneId: scene.id,
        field: 'voiceover' as const,
        label: `Locução da cena ${index + 1}`,
      },
    })),
  ]

  function currentValueFor(target: CopilotTarget): string {
    if (target.kind === 'script') return script[target.field] ?? ''
    return scenes.find((s) => s.id === target.sceneId)?.[target.field] ?? ''
  }

  /** Contexto vizinho: dá coerência sem autorizar reescrita do resto. */
  function surroundingFor(target: CopilotTarget): string {
    const lines = [
      `Título: ${script.title}`,
      `Hook: ${script.hook_text ?? ''}`,
      `CTA: ${script.cta ?? ''}`,
      'Locução por cena:',
      ...scenes.map((s, i) => `${i + 1}. ${s.voiceover ?? ''}`),
    ]
    if (target.kind === 'scene') {
      const index = scenes.findIndex((s) => s.id === target.sceneId)
      lines.push(`O alvo é a cena ${index + 1}.`)
    }
    return lines.join('\n')
  }

  async function run(target: CopilotTarget, text: string) {
    const before = currentValueFor(target)
    setIsRunning(true)
    try {
      const result = await rewriteSection(contextRef, text,
        { label: target.label, current: before },
        surroundingFor(target),
      )
      setPreview({ target, before, after: result.content, note: result.note })
    } catch (error) {
      toast.error(error instanceof AiError ? error.message : strings.errors.unexpected)
    } finally {
      setIsRunning(false)
    }
  }

  async function applyPreview() {
    if (!preview) return
    setIsApplying(true)
    try {
      await onApply(preview.target, preview.after)
      toast.success(`${preview.target.label} atualizado.`)
      setPreview(null)
      setInstruction('')
    } catch {
      toast.error(strings.errors.unexpected)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Copilot
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Altera só o trecho escolhido. Nada é aplicado sem você aprovar.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            className="h-11 justify-start text-left"
            disabled={isRunning}
            onClick={() => {
              const target = action.targetFor(script, scenes)
              if (!target) {
                toast.error('Esse roteiro não tem cenas ainda.')
                return
              }
              void run(target, action.instruction)
            }}
          >
            {action.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <FormField label="Trecho a alterar">
          {(fieldProps) => (
            <Select value={targetKey} onValueChange={setTargetKey}>
              <SelectTrigger {...fieldProps}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targetOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.target.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>

        <FormField label="O que mudar">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="Ex: deixe mais urgente"
            />
          )}
        </FormField>

        <Button
          className="h-11"
          disabled={isRunning || instruction.trim().length === 0}
          onClick={() => {
            const option = targetOptions.find((o) => o.key === targetKey)
            if (option) void run(option.target, instruction)
          }}
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isRunning ? 'Gerando…' : 'Gerar alteração'}
        </Button>
      </div>

      {preview && (
        <Card className="flex flex-col gap-3 border-primary/40 p-3">
          <p className="text-xs font-medium">Prévia — {preview.target.label}</p>

          <div className="flex flex-col gap-2">
            <div className="rounded-md border border-border bg-muted/50 p-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Antes</p>
              <p className="text-sm text-muted-foreground line-through decoration-muted-foreground/40">
                {preview.before || '(vazio)'}
              </p>
            </div>
            <div className="rounded-md border border-success/40 bg-success/5 p-2">
              <p className="mb-1 text-xs font-medium text-success">Depois</p>
              <p className="text-sm">{preview.after}</p>
            </div>
          </div>

          {preview.note && <p className="text-xs text-muted-foreground">{preview.note}</p>}

          <div className="flex gap-2">
            <Button size="sm" className="h-11 flex-1" onClick={applyPreview} disabled={isApplying}>
              {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Aplicar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-11"
              onClick={() => setPreview(null)}
              disabled={isApplying}
            >
              <X className="h-4 w-4" />
              Descartar
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
