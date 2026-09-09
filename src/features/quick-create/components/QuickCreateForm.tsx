import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { strings } from '@/i18n/pt-BR'
import { ChoiceChips } from '@/features/quick-create/components/ChoiceChips'
import { AdvancedOptions } from '@/features/quick-create/components/AdvancedOptions'
import {
  ReferenceInput,
  type ReferenceState,
} from '@/features/quick-create/components/ReferenceInput'
import {
  CONTENT_TYPES,
  IDEA_SHORTCUTS,
  QUICK_DURATIONS,
  QUICK_PLATFORMS,
  QUICK_TONES,
  type QuickDraft,
  type ReferenceMode,
} from '@/features/quick-create/schemas/quickScript'

const t = strings.quickCreate

interface Produto {
  id: string
  name: string
}

interface QuickCreateFormProps {
  draft: QuickDraft
  onChange: (patch: Partial<QuickDraft>) => void
  products: Produto[]
  reference: ReferenceState
  onReferenceMode: (mode: ReferenceMode) => void
  onPickVideo: (file: File) => void
  onRemoveVideo: () => void
  onTranscriptError: (message: string) => void
  isBusy: boolean
  canGenerate: boolean
  onGenerate: () => void
}

export function QuickCreateForm({
  draft,
  onChange,
  products,
  reference,
  onReferenceMode,
  onPickVideo,
  onRemoveVideo,
  onTranscriptError,
  isBusy,
  canGenerate,
  onGenerate,
}: QuickCreateFormProps) {
  /**
   * Atalho apenas PREPARA a frase — não cria etapa nem envia nada. Ele existe
   * para a página em branco não ser um obstáculo, e por isso concatena em vez
   * de substituir: quem já escreveu algo não perde o que digitou.
   */
  function aplicarAtalho(texto: string) {
    const atual = draft.request.trimEnd()
    onChange({ request: atual ? `${atual}\n${texto}` : texto })
    // Foco vai para o fim do texto, senão o cursor fica no começo do textarea.
    requestAnimationFrame(() => {
      const campo = document.getElementById('quick-request') as HTMLTextAreaElement | null
      if (!campo) return
      campo.focus()
      campo.setSelectionRange(campo.value.length, campo.value.length)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-[#1E1E28] bg-[#0E0E14] p-4">
        <label
          htmlFor="quick-request"
          className="mb-2 block text-[13px] font-medium text-[#EDEDF2]"
        >
          {t.requestLabel}
        </label>
        <Textarea
          id="quick-request"
          rows={5}
          disabled={isBusy}
          placeholder={t.requestPlaceholder}
          value={draft.request}
          maxLength={4000}
          onChange={(e) => onChange({ request: e.target.value })}
          className="text-[14px] leading-relaxed"
        />
        <p className="mt-2 text-[12px] text-[#5E5E75]">{t.requestHint}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {IDEA_SHORTCUTS.map((atalho) => (
            <Button
              key={atalho.label}
              type="button"
              variant="ghost"
              size="sm"
              disabled={isBusy}
              onClick={() => aplicarAtalho(atalho.text)}
              className="h-7 rounded-full border border-[#1E1E28] px-2.5 text-[12px] text-[#8C8CA0] hover:text-[#EDEDF2]"
            >
              + {atalho.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[#1E1E28] bg-[#0E0E14] p-4">
        <label htmlFor="quick-product" className="mb-1.5 block text-[12px] font-medium text-[#8C8CA0]">
          {t.product}
        </label>
        <Select
          value={draft.productId}
          onValueChange={(value) => onChange({ productId: value })}
          disabled={isBusy}
        >
          <SelectTrigger id="quick-product">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t.productNone}</SelectItem>
            {products.map((produto) => (
              <SelectItem key={produto.id} value={produto.id}>
                {produto.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <ReferenceInput
        state={reference}
        disabled={isBusy}
        onModeChange={onReferenceMode}
        onPickVideo={onPickVideo}
        onRemoveVideo={onRemoveVideo}
        onTranscriptChange={(text) => onChange({ transcript: text })}
        onTranscriptError={onTranscriptError}
      />

      <section className="flex flex-col gap-4 rounded-xl border border-[#1E1E28] bg-[#0E0E14] p-4">
        <ChoiceChips
          label={t.contentType}
          options={CONTENT_TYPES}
          value={draft.contentType}
          disabled={isBusy}
          onChange={(value) => onChange({ contentType: value })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="quick-platform" className="mb-1.5 block text-[12px] font-medium text-[#8C8CA0]">
              {t.platform}
            </label>
            <Select
              value={draft.platform}
              onValueChange={(value) => onChange({ platform: value })}
              disabled={isBusy}
            >
              <SelectTrigger id="quick-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUICK_PLATFORMS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="quick-duration" className="mb-1.5 block text-[12px] font-medium text-[#8C8CA0]">
              {t.duration}
            </label>
            <Select
              value={String(draft.durationSeconds)}
              onValueChange={(value) => onChange({ durationSeconds: Number(value) })}
              disabled={isBusy}
            >
              <SelectTrigger id="quick-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUICK_DURATIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ChoiceChips
          label={t.tone}
          options={QUICK_TONES}
          value={draft.tone}
          disabled={isBusy}
          onChange={(value) => onChange({ tone: value })}
        />
      </section>

      <AdvancedOptions draft={draft} onChange={onChange} disabled={isBusy} />

      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={isBusy || !canGenerate}
        onClick={onGenerate}
      >
        {isBusy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t.generating}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" aria-hidden />
            {t.generate}
          </>
        )}
      </Button>
    </div>
  )
}
