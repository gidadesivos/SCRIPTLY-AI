import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Step {
  key: string
  label: string
}

export function StepIndicator({ steps, currentIndex }: { steps: Step[]; currentIndex: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {steps.map((step, index) => {
        const isDone = index < currentIndex
        const isCurrent = index === currentIndex
        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                isDone && 'bg-primary/10 text-primary',
                isCurrent && 'bg-primary text-primary-foreground',
                !isDone && !isCurrent && 'bg-muted text-muted-foreground',
              )}
              aria-hidden
            >
              {isDone ? <Check className="h-3 w-3" /> : index + 1}
            </span>
            <span
              className={cn(
                isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span className="mx-1 text-muted-foreground" aria-hidden>
                ›
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
