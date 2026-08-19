import { Gauge, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Hook } from '@/lib/ai'
import { strings } from '@/i18n/pt-BR'

const SUBSCORE_LABELS: Record<string, string> = {
  clareza: 'Clareza',
  especificidade: 'Especificidade',
  curiosidade: 'Curiosidade',
  relevancia: 'Relevância',
  forca: 'Força',
  retencao: 'Retenção',
  adequacao: 'Adequação',
}

/**
 * Score heurístico. Cor e rótulo propositalmente distintos de qualquer métrica
 * de performance medida (§7.3) — nunca devem ser confundidos na leitura.
 */
function HookScoreBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-info/10 px-2 py-1 text-xs font-medium text-info">
      <Gauge className="h-3.5 w-3.5" />
      {score}/100
    </span>
  )
}

interface HookStepProps {
  hooks: Hook[]
  selected: Hook | null
  onSelect: (hook: Hook) => void
  onRegenerate: () => void
  onBack: () => void
  onNext: () => void
  isRegenerating: boolean
}

export function HookStep({
  hooks,
  selected,
  onSelect,
  onRegenerate,
  onBack,
  onNext,
  isRegenerating,
}: HookStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{strings.create.chooseHook}</p>
          <p className="text-xs text-muted-foreground">{strings.create.hookScoreDisclaimer}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          <RefreshCw className={cn('h-4 w-4', isRegenerating && 'animate-spin')} />
          {strings.create.regenerateHooks}
        </Button>
      </div>

      <ul className="flex flex-col gap-3">
        {hooks.map((hook, index) => {
          const isSelected = selected?.text === hook.text
          const subscores = Object.entries(hook.subscores ?? {})
          return (
            <li key={`${hook.text}-${index}`}>
              <Card
                className={cn(
                  'transition-colors',
                  isSelected ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(hook)}
                  aria-pressed={isSelected}
                  className="flex w-full flex-col gap-3 p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium leading-snug">{hook.text}</span>
                    <HookScoreBadge score={hook.score} />
                  </div>

                  {hook.category && (
                    <span className="inline-flex w-fit rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {hook.category}
                    </span>
                  )}

                  {isSelected && (
                    <div className="flex flex-col gap-3 border-t border-border pt-3">
                      {subscores.length > 0 && (
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                          {subscores.map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between gap-2">
                              <dt className="text-xs text-muted-foreground">
                                {SUBSCORE_LABELS[key] ?? key}
                              </dt>
                              <dd className="text-xs font-medium tabular-nums">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {hook.strength && (
                        <p className="text-xs">
                          <span className="font-medium text-success">
                            {strings.create.strength}:{' '}
                          </span>
                          {hook.strength}
                        </p>
                      )}
                      {hook.issue && (
                        <p className="text-xs">
                          <span className="font-medium text-warning">
                            {strings.create.issue}:{' '}
                          </span>
                          {hook.issue}
                        </p>
                      )}
                      {hook.recommendation && (
                        <p className="text-xs">
                          <span className="font-medium text-info">
                            {strings.create.recommendation}:{' '}
                          </span>
                          {hook.recommendation}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              </Card>
            </li>
          )
        })}
      </ul>

      <div className="flex justify-between border-t border-border pt-4">
        <Button variant="ghost" className="h-11" onClick={onBack}>
          {strings.create.back}
        </Button>
        <Button className="h-11" onClick={onNext} disabled={!selected}>
          {strings.create.generateScript}
        </Button>
      </div>
    </div>
  )
}
