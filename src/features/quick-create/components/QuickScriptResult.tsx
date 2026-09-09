import { Clock, Film, FileText, Loader2, RefreshCw, Save, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { estimateDuration, formatSeconds } from '@/lib/duration'
import { labelFor } from '@/config/options'
import { strings } from '@/i18n/pt-BR'
import { ScriptStrategy } from '@/features/quick-create/components/ScriptStrategy'
import { ScriptScenes } from '@/features/quick-create/components/ScriptScenes'
import { AiQuickActions } from '@/features/quick-create/components/AiQuickActions'
import {
  QUICK_PLATFORMS,
  type ReferenceMode,
} from '@/features/quick-create/schemas/quickScript'
import type { GeneratedScene, QuickScript } from '@/lib/ai'

const t = strings.quickCreate

interface QuickScriptResultProps {
  script: QuickScript
  brandName: string
  productName: string
  platform: string
  durationSeconds: number
  tone: string
  referenceMode: ReferenceMode
  isRefining: boolean
  isSaving: boolean
  onPatch: (patch: Partial<QuickScript>) => void
  onChangeScene: (index: number, patch: Partial<GeneratedScene>) => void
  onRefine: (instruction: string) => void
  onOtherHook: () => void
  onRegenerate: () => void
  onSave: () => void
}

export function QuickScriptResult({
  script,
  brandName,
  productName,
  platform,
  durationSeconds,
  tone,
  referenceMode,
  isRefining,
  isSaving,
  onPatch,
  onChangeScene,
  onRefine,
  onOtherHook,
  onRegenerate,
  onSave,
}: QuickScriptResultProps) {
  /*
   * A duração é calculada aqui, contando palavras — nunca perguntada ao modelo.
   * Modelo estima mal e com confiança; contar palavra é aritmética.
   */
  const estimativa = estimateDuration(
    script.scenes.map((scene) => scene.voiceover),
    durationSeconds,
    tone,
  )

  // Enquanto refina ou salva, tudo trava: é o que impede o duplo clique de
  // disparar duas gerações e o segundo resultado atropelar o primeiro.
  const travado = isRefining || isSaving

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      {/* Contexto: primeiro no mobile, coluna fixa no desktop */}
      <aside className="flex flex-col gap-4">
        <section className="rounded-xl border border-[#1E1E28] bg-[#0E0E14] p-4">
          <p className="text-[14px] font-medium text-[#EDEDF2]">{brandName}</p>
          {productName && <p className="text-[13px] text-[#8C8CA0]">{productName}</p>}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Etiqueta>{labelFor(QUICK_PLATFORMS, platform)}</Etiqueta>
            <Etiqueta>{durationSeconds}s</Etiqueta>
            {script.framework && <Etiqueta>{script.framework}</Etiqueta>}
          </div>

          <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[#8C8CA0]">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {strings.create.estimatedVoiceover}: {formatSeconds(estimativa.estimatedSeconds)}
          </p>
          {estimativa.isOverTarget && (
            <p className="mt-1 text-[12px] text-warning">
              {strings.create.overTarget} São {estimativa.totalWords} palavras.
            </p>
          )}

          {referenceMode !== 'none' && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[#6EE7A8]">
              {referenceMode === 'video' ? (
                <Film className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <FileText className="h-3.5 w-3.5" aria-hidden />
              )}
              {t.referenceUsed}
            </p>
          )}
          {script.reference_summary && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-[#5E5E75]">
              {script.reference_summary}
            </p>
          )}
        </section>

        <ScriptStrategy script={script} />

        <AiQuickActions onApply={onRefine} isBusy={isRefining} disabled={isSaving} />
      </aside>

      {/* Roteiro */}
      <div className="flex min-w-0 flex-col gap-4">
        <section className="rounded-xl border border-[#1E1E28] bg-[#0E0E14] p-4">
          <label htmlFor="quick-title" className="mb-1.5 block text-[11px] uppercase tracking-wide text-[#5E5E75]">
            Título
          </label>
          <Input
            id="quick-title"
            value={script.title}
            disabled={travado}
            maxLength={200}
            onChange={(e) => onPatch({ title: e.target.value })}
          />

          <div className="mt-4 flex items-center justify-between gap-2">
            <label htmlFor="quick-hook" className="text-[11px] uppercase tracking-wide text-[#5E5E75]">
              {t.hook}
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={travado}
              onClick={onOtherHook}
              className="h-7 text-[12px] text-[#8C8CA0] hover:text-[#EDEDF2]"
            >
              <Shuffle className="h-3.5 w-3.5" aria-hidden />
              {t.otherHook}
            </Button>
          </div>
          <Textarea
            id="quick-hook"
            rows={2}
            value={script.hook}
            disabled={travado}
            onChange={(e) => onPatch({ hook: e.target.value })}
          />
        </section>

        <ScriptScenes scenes={script.scenes} onChangeScene={onChangeScene} disabled={travado} />

        <section className="rounded-xl border border-[#1E1E28] bg-[#0E0E14] p-4">
          <label htmlFor="quick-cta" className="mb-1.5 block text-[11px] uppercase tracking-wide text-[#5E5E75]">
            {t.cta_}
          </label>
          <Textarea
            id="quick-cta"
            rows={2}
            value={script.cta}
            disabled={travado}
            onChange={(e) => onPatch({ cta: e.target.value })}
          />
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={travado} onClick={onRegenerate}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            {t.regenerate}
          </Button>
          <Button type="button" disabled={travado || !script.title.trim()} onClick={onSave}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t.saving}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden />
                {t.save}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-[#14141C] px-2 py-1 text-[11px] text-[#8C8CA0]">{children}</span>
  )
}
