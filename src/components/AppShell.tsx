import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Loader2 } from 'lucide-react'
import { AppSidebar } from '@/components/AppSidebar'
import { ModelSelector } from '@/components/ModelSelector'
import { RouteFallback } from '@/components/RouteFallback'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ActiveWorkspaceProvider, useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { ActiveBrandProvider } from '@/features/brands/hooks/useActiveBrand'
import { ActiveModelProvider } from '@/hooks/useActiveModel'
import { OnboardingPage } from '@/features/workspaces/components/OnboardingPage'
import { APP_NAME } from '@/config/brand'

function AppShellInner() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { workspaces, isLoading } = useActiveWorkspace()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (workspaces.length === 0) {
    return <OnboardingPage />
  }

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-64 shrink-0 border-r border-border md:block">
        <AppSidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-border px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold">{APP_NAME}</span>
          <div className="ml-auto">
            <ModelSelector />
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="hidden h-12 items-center justify-end border-b border-border px-4 md:flex">
          <ModelSelector />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* As páginas são carregadas sob demanda (routes.tsx); sem este
              Suspense elas lançariam ao montar. O boundary fica aqui, e não
              acima, para a barra lateral não sumir a cada navegação. */}
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <AppSidebar onNavigate={() => setIsDrawerOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}

export function AppShell() {
  return (
    <ActiveWorkspaceProvider>
      <ActiveBrandProvider>
        <ActiveModelProvider>
          <AppShellInner />
        </ActiveModelProvider>
      </ActiveBrandProvider>
    </ActiveWorkspaceProvider>
  )
}
