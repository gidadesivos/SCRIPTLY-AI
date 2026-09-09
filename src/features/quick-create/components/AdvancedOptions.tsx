import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { strings } from '@/i18n/pt-BR'
import { FUNNEL_OPTIONS, type QuickDraft } from '@/features/quick-create/schemas/quickScript'

const t = strings.quickCreate

/**
 * Fechado por padrão. A tela promete poucos campos; estes existem para quem
 * precisa de controle fino, e deixá-los abertos entregaria de cara o formulário
 * grande que a Beta veio evitar.
 */
export function AdvancedOptions({
  draft,
  onChange,
  disabled,
}: {
  draft: QuickDraft
  onChange: (patch: Partial<QuickDraft>) => void
  disabled: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const painelId = useId()

  return (
    <section className="rounded-xl border border-[#1E1E28] bg-[#0E0E14]">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={painelId}
        className="flex w-full items-center justify-between px-4 py-3 text-[13px] text-[#8C8CA0] transition-colors hover:text-[#EDEDF2]"
      >
        {t.advanced}
        <ChevronDown className={cn('h-4 w-4 transition-transform', aberto && 'rotate-180')} />
      </button>

      <div id={painelId} hidden={!aberto} className="flex flex-col gap-4 border-t border-[#1E1E28] p-4">
        <Campo label={t.audience}>
          {(id) => (
            <Input
              id={id}
              disabled={disabled}
              placeholder={t.audiencePlaceholder}
              value={draft.audience}
              maxLength={300}
              onChange={(e) => onChange({ audience: e.target.value })}
            />
          )}
        </Campo>

        <Campo label={t.cta}>
          {(id) => (
            <Input
              id={id}
              disabled={disabled || draft.withoutCta}
              placeholder={t.ctaPlaceholder}
              value={draft.cta}
              maxLength={300}
              onChange={(e) => onChange({ cta: e.target.value })}
            />
          )}
        </Campo>

        <Campo label={t.funnelStage}>
          {(id) => (
            <Select
              value={draft.funnelStage || 'none'}
              onValueChange={(v) => onChange({ funnelStage: v === 'none' ? '' : v })}
              disabled={disabled}
            >
              <SelectTrigger id={id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUNNEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value || 'none'} value={option.value || 'none'}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Campo>

        <Campo label={t.extraInstructions}>
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              disabled={disabled}
              placeholder={t.extraPlaceholder}
              value={draft.extraInstructions}
              maxLength={1000}
              onChange={(e) => onChange({ extraInstructions: e.target.value })}
            />
          )}
        </Campo>

        <div className="flex flex-col gap-2.5">
          <Marcador
            label={t.withoutCta}
            checked={draft.withoutCta}
            disabled={disabled}
            onChange={(checked) => onChange({ withoutCta: checked })}
          />
          <Marcador
            label={t.voiceoverOnly}
            checked={draft.voiceoverOnly}
            disabled={disabled}
            onChange={(checked) => onChange({ voiceoverOnly: checked })}
          />
        </div>
      </div>
    </section>
  )
}

/** Gera o id e amarra label e controle — sem isso o clique no rótulo não foca. */
function Campo({
  label,
  children,
}: {
  label: string
  children: (id: string) => React.ReactNode
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-medium text-[#8C8CA0]">
        {label}
      </label>
      {children(id)}
    </div>
  )
}

function Marcador({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <label htmlFor={id} className="text-[13px] text-[#8C8CA0]">
        {label}
      </label>
    </div>
  )
}
