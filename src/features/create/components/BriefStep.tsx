import { useState } from 'react'
import { Sparkles, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/FormField'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { completeBrief, AiError, type Brief } from '@/lib/ai'
import type { FunnelStage, Platform } from '@/types/database'
import { OBJECTIVES, TONES, PLATFORMS, FUNNEL_STAGES, DURATIONS } from '@/config/options'
import { strings } from '@/i18n/pt-BR'

export interface BriefState extends Brief {
  platform: Platform
  /** '' = não escolhido; vira null ao salvar. */
  funnel_stage: FunnelStage | ''
  duration_seconds: number
}

const TEXT_FIELDS: Array<{ key: keyof Brief; label: string; multiline?: boolean }> = [
  { key: 'title', label: 'Título' },
  { key: 'description', label: 'Descrição', multiline: true },
  { key: 'target_audience', label: 'Público-alvo', multiline: true },
  { key: 'pain', label: 'Dor', multiline: true },
  { key: 'desire', label: 'Desejo', multiline: true },
  { key: 'promise', label: 'Promessa', multiline: true },
]

interface BriefStepProps {
  brief: BriefState
  onChange: (next: BriefState) => void
  onNext: () => void
  contextRef: { workspaceId: string; brandId: string; productId?: string | null }
}

export function BriefStep({ brief, onChange, onNext, contextRef }: BriefStepProps) {
  const [suggestions, setSuggestions] = useState<Partial<Brief> | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  async function handleComplete() {
    setIsCompleting(true)
    try {
      const result = await completeBrief(contextRef, brief)
      // Só sugestões para campos ainda vazios: a IA nunca sobrescreve o que
      // o usuário escreveu (§13 passo 6).
      const filtered: Partial<Brief> = {}
      for (const { key } of TEXT_FIELDS) {
        const suggested = result[key]?.trim()
        if (suggested && !brief[key]?.trim()) filtered[key] = suggested
      }
      if (Object.keys(filtered).length === 0) {
        toast.info('A IA não encontrou campos vazios para sugerir.')
      } else {
        setSuggestions(filtered)
      }
    } catch (error) {
      toast.error(error instanceof AiError ? error.message : strings.errors.unexpected)
    } finally {
      setIsCompleting(false)
    }
  }

  function acceptSuggestion(key: keyof Brief) {
    const value = suggestions?.[key]
    if (!value) return
    onChange({ ...brief, [key]: value })
    rejectSuggestion(key)
  }

  function rejectSuggestion(key: keyof Brief) {
    setSuggestions((current) => {
      if (!current) return null
      const next = { ...current }
      delete next[key]
      return Object.keys(next).length ? next : null
    })
  }

  function acceptAll() {
    if (!suggestions) return
    onChange({ ...brief, ...suggestions })
    setSuggestions(null)
  }

  const canContinue = brief.title.trim().length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Revise o briefing. A IA só sugere para campos vazios.
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={handleComplete}
          disabled={isCompleting}
        >
          <Sparkles className="h-4 w-4" />
          {isCompleting ? strings.create.completing : strings.create.completeWithAi}
        </Button>
      </div>

      {suggestions && (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{strings.create.suggestionsTitle}</p>
              <p className="text-xs text-muted-foreground">{strings.create.suggestionsHint}</p>
            </div>
            <Button type="button" size="sm" className="h-11" onClick={acceptAll}>
              {strings.create.acceptAll}
            </Button>
          </div>

          <ul className="flex flex-col gap-2">
            {TEXT_FIELDS.filter(({ key }) => suggestions[key]).map(({ key, label }) => (
              <li
                key={key}
                className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="text-sm">{suggestions[key]}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11"
                    onClick={() => acceptSuggestion(key)}
                    aria-label={`${strings.create.accept} sugestão de ${label}`}
                  >
                    <Check className="h-4 w-4" />
                    {strings.create.accept}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-11"
                    onClick={() => rejectSuggestion(key)}
                    aria-label={`${strings.create.reject} sugestão de ${label}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {TEXT_FIELDS.map(({ key, label, multiline }) => (
          <FormField key={key} label={label}>
            {(fieldProps) =>
              multiline ? (
                <Textarea
                  {...fieldProps}
                  rows={3}
                  value={brief[key]}
                  onChange={(event) => onChange({ ...brief, [key]: event.target.value })}
                />
              ) : (
                <Input
                  {...fieldProps}
                  value={brief[key]}
                  onChange={(event) => onChange({ ...brief, [key]: event.target.value })}
                />
              )
            }
          </FormField>
        ))}

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Plataforma">
            {(fieldProps) => (
              <Select
                value={brief.platform}
                onValueChange={(value) => onChange({ ...brief, platform: value as Platform })}
              >
                <SelectTrigger {...fieldProps}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          <FormField label="Duração">
            {(fieldProps) => (
              <Select
                value={String(brief.duration_seconds)}
                onValueChange={(value) =>
                  onChange({ ...brief, duration_seconds: Number(value) })
                }
              >
                <SelectTrigger {...fieldProps}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          <FormField label="Objetivo">
            {(fieldProps) => (
              <Select
                value={brief.objective}
                onValueChange={(value) => onChange({ ...brief, objective: value })}
              >
                <SelectTrigger {...fieldProps}>
                  <SelectValue placeholder="Escolha um objetivo" />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          <FormField label="Tom">
            {(fieldProps) => (
              <Select
                value={brief.tone}
                onValueChange={(value) => onChange({ ...brief, tone: value })}
              >
                <SelectTrigger {...fieldProps}>
                  <SelectValue placeholder="Escolha um tom" />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          <FormField label="Estágio de funil">
            {(fieldProps) => (
              <Select
                value={brief.funnel_stage}
                onValueChange={(value) => onChange({ ...brief, funnel_stage: value as FunnelStage })}
              >
                <SelectTrigger {...fieldProps}>
                  <SelectValue placeholder="Escolha o estágio" />
                </SelectTrigger>
                <SelectContent>
                  {FUNNEL_STAGES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button className="h-11" onClick={onNext} disabled={!canContinue}>
          {strings.create.generateAngles}
        </Button>
      </div>
    </div>
  )
}
