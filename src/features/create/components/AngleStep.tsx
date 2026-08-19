import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Angle } from '@/lib/ai'
import { strings } from '@/i18n/pt-BR'

interface AngleStepProps {
  angles: Angle[]
  selected: Angle | null
  onSelect: (angle: Angle) => void
  onRegenerate: () => void
  onBack: () => void
  onNext: () => void
  isRegenerating: boolean
}

export function AngleStep({
  angles,
  selected,
  onSelect,
  onRegenerate,
  onBack,
  onNext,
  isRegenerating,
}: AngleStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{strings.create.chooseAngle}</p>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          <RefreshCw className={cn('h-4 w-4', isRegenerating && 'animate-spin')} />
          {strings.create.regenerateAngles}
        </Button>
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {angles.map((angle, index) => {
          const isSelected = selected?.title === angle.title
          return (
            <li key={`${angle.title}-${index}`}>
              <Card
                className={cn(
                  'h-full transition-colors',
                  isSelected ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(angle)}
                  aria-pressed={isSelected}
                  className="flex h-full w-full flex-col gap-2 p-4 text-left"
                >
                  <span className="inline-flex w-fit rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {angle.type}
                  </span>
                  <span className="font-medium leading-tight">{angle.title}</span>
                  <span className="text-sm text-muted-foreground">{angle.description}</span>
                  {angle.rationale && (
                    <span className="mt-auto pt-2 text-xs text-muted-foreground">
                      {angle.rationale}
                    </span>
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
          {strings.create.generateHooks}
        </Button>
      </div>
    </div>
  )
}
