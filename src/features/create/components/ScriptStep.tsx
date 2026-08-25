import { AlertTriangle, Clock, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { estimateDuration, formatSeconds } from '@/lib/duration'
import type { GeneratedScript } from '@/lib/ai'
import { strings } from '@/i18n/pt-BR'

interface ScriptStepProps {
  script: GeneratedScript
  targetSeconds: number
  tone: string
  isSaving: boolean
  onBack: () => void
  onSave: () => void
}

export function ScriptStep({
  script,
  targetSeconds,
  tone,
  isSaving,
  onBack,
  onSave,
}: ScriptStepProps) {
  const estimate = estimateDuration(
    script.scenes.map((scene) => scene.voiceover),
    targetSeconds,
    tone,
  )

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3 p-4">
        <h2 className="text-lg font-semibold leading-tight">{script.title}</h2>
        {script.strategy_summary && (
          <p className="text-sm text-muted-foreground">{script.strategy_summary}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {script.framework && (
            <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
              {script.framework}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {strings.create.estimatedVoiceover}: {formatSeconds(estimate.estimatedSeconds)} (
            {strings.create.target}: {targetSeconds} s)
          </span>
        </div>

        {estimate.isOverTarget && (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <span>
              {strings.create.overTarget} São {estimate.totalWords} palavras de locução — cerca de{' '}
              {formatSeconds(estimate.estimatedSeconds)} contra os {targetSeconds} s pedidos. Dá
              para encurtar no editor depois de salvar.
            </span>
          </div>
        )}
      </Card>

      <ol className="flex flex-col gap-3">
        {script.scenes.map((scene, index) => (
          <li key={index}>
            <Card className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Cena {index + 1}</span>
                {scene.purpose && (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {scene.purpose}
                  </span>
                )}
              </div>

              <dl className="flex flex-col gap-2 text-sm">
                <SceneField label="Locução" value={scene.voiceover} emphasis />
                <SceneField label="Texto em tela" value={scene.on_screen_text} />
                <SceneField label="Visual" value={scene.visual} />
                <SceneField label="Ação" value={scene.action} />
                <SceneField label="Plano" value={scene.shot} />
                <SceneField label="B-roll" value={scene.broll} />
                <SceneField label="Edição" value={scene.editing_direction} />
                <SceneField label="Transição" value={scene.transition} />
                <SceneField label="Som" value={scene.sound_suggestion} />
              </dl>
            </Card>
          </li>
        ))}
      </ol>

      {script.cta && (
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-xs font-medium text-muted-foreground">CTA</span>
          <p className="text-sm">{script.cta}</p>
        </Card>
      )}

      <div className="flex justify-between border-t border-border pt-4">
        <Button variant="ghost" className="h-11" onClick={onBack} disabled={isSaving}>
          {strings.create.back}
        </Button>
        <Button className="h-11" onClick={onSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? strings.create.saving : strings.create.saveScript}
        </Button>
      </div>
    </div>
  )
}

function SceneField({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  if (!value?.trim()) return null
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-28 shrink-0 text-xs text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd className={emphasis ? 'font-medium' : 'text-muted-foreground'}>{value}</dd>
    </div>
  )
}
