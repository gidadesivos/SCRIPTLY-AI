import { Skeleton } from '@/components/ui/skeleton'

/**
 * Mostrado enquanto o chunk da rota é baixado (ver routes.tsx).
 *
 * Blocos com a forma aproximada de uma página do app — título, subtítulo e
 * conteúdo — em vez de um spinner centralizado: a barra lateral continua
 * pintada e só a área de conteúdo troca, então o layout não pula quando a
 * página real chega.
 */
export function RouteFallback() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando página">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}
