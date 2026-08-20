import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SaveState } from '@/features/scripts/hooks/useAutosave'

function formatTime(date: Date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state.status === 'idle') return null

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
      {state.status === 'saving' && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Salvando…
        </>
      )}
      {state.status === 'saved' && (
        <>
          <Check className="h-3.5 w-3.5 text-success" />
          Salvo às {formatTime(state.at)}
        </>
      )}
      {state.status === 'error' && (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-destructive">Erro ao salvar</span>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onRetry}>
            Tentar novamente
          </Button>
        </>
      )}
    </span>
  )
}
