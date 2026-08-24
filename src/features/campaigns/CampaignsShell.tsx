import { Suspense } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, Network } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RouteFallback } from '@/components/RouteFallback'
import {
  ActiveWorkspaceProvider,
  useActiveWorkspace,
} from '@/features/workspaces/hooks/useActiveWorkspace'
import { ActiveBrandProvider, useActiveBrand } from '@/features/brands/hooks/useActiveBrand'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Shell próprio do planejador.
 *
 * É outro produto visualmente — barra superior no lugar da lateral, canvas
 * ocupando a tela inteira — mas roda no mesmo login, no mesmo workspace e na
 * mesma marca ativa. Separar de verdade obrigaria a recadastrar Brand Brain e
 * roteiros, que é justamente o que dá contexto ao plano.
 */
function CampaignsShellInner() {
  const { activeWorkspace } = useActiveWorkspace()
  const { brands, activeBrand, setActiveBrandId } = useActiveBrand()
  const location = useLocation()
  const isBoard = location.pathname !== '/campanhas'

  return (
    <div className="flex h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <Button asChild variant="ghost" size="sm" className="h-10 gap-2">
          <Link to={isBoard ? '/campanhas' : '/dashboard'}>
            <ArrowLeft className="h-4 w-4" />
            {isBoard ? 'Planos' : 'Scriptly'}
          </Link>
        </Button>

        <div className="flex items-center gap-2 text-sm font-semibold">
          <Network className="h-4 w-4 text-primary" />
          Campanhas
        </div>

        <div className="ml-auto flex items-center gap-2">
          {brands.length > 0 && (
            <Select value={activeBrand?.id ?? ''} onValueChange={setActiveBrandId}>
              <SelectTrigger className="h-10 w-44" aria-label="Marca ativa">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {activeWorkspace?.name}
          </span>
        </div>
      </header>

      {/* min-h-0 é o que permite o canvas encolher dentro do flex; sem isso ele
          empurra a página e cria barra de rolagem em vez de caber na tela. */}
      <main className="min-h-0 flex-1">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}

export function CampaignsShell() {
  return (
    <ActiveWorkspaceProvider>
      <ActiveBrandProvider>
        <CampaignsShellInner />
      </ActiveBrandProvider>
    </ActiveWorkspaceProvider>
  )
}
