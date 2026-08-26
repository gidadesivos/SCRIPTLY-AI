import { Suspense } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, Network, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RouteFallback } from '@/components/RouteFallback'
import {
  ActiveWorkspaceProvider,
  useActiveWorkspace,
} from '@/features/workspaces/hooks/useActiveWorkspace'
import { ActiveBrandProvider, useActiveBrand } from '@/features/brands/hooks/useActiveBrand'
import { ActiveModelProvider } from '@/hooks/useActiveModel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function CampaignsShellInner() {
  const { activeWorkspace } = useActiveWorkspace()
  const { brands, activeBrand, setActiveBrandId } = useActiveBrand()
  const location = useLocation()
  const isBoard = location.pathname !== '/campanhas'

  return (
    <div className="flex h-svh flex-col bg-[#0B0B10] text-[#EDEDF2]">
      {/* Topbar */}
      <header className="flex h-[52px] shrink-0 items-center gap-[12px] border-b border-[#1E1E28] bg-[#0E0E14] px-4">
        <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-[#8C8CA0] hover:bg-[#1E1E28] hover:text-[#EDEDF2]">
          <Link to={isBoard ? '/campanhas' : '/dashboard'}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-[#B9A6FF]" />
          <span className="font-sans text-[13px] font-medium text-[#EDEDF2]">
            {isBoard ? 'Planos' : 'Campanhas'}
          </span>
        </div>
        
        <span className="h-[12px] w-[1px] bg-[#23232F]"></span>

        <div className="flex items-center gap-2">
          {brands.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex cursor-pointer items-center gap-[6px] rounded-[6px] border border-[#23232F] bg-[#14141C] px-2 py-1 font-sans text-[11px] font-medium text-[#EDEDF2] outline-none transition-colors hover:bg-[#1E1E28]">
                  {activeBrand?.name ?? 'Marca'}
                  <ChevronDown className="h-3 w-3 text-[#6E6E85]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="border-[#1E1E28] bg-[#14141C] text-[#EDEDF2]">
                {brands.map((brand) => (
                  <DropdownMenuItem
                    key={brand.id}
                    onClick={() => setActiveBrandId(brand.id)}
                    className="focus:bg-[#1E1E28] focus:text-[#EDEDF2]"
                  >
                    {brand.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="ml-auto">
          <span className="font-sans text-[11px] text-[#5E5E75]">
            {activeWorkspace?.name}
          </span>
        </div>
      </header>

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
        <ActiveModelProvider>
          <CampaignsShellInner />
        </ActiveModelProvider>
      </ActiveBrandProvider>
    </ActiveWorkspaceProvider>
  )
}
