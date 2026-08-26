import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Loader2 } from 'lucide-react'
import { AppSidebar } from '@/components/AppSidebar'
import { AppRail } from '@/components/AppRail'
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
    <div className="flex min-h-svh bg-[#0B0B10]">
      <aside className="hidden shrink-0 md:block">
        <AppRail />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-[#1E1E28] bg-[#0E0E14] px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-[#8C8CA0]"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold text-[#EDEDF2]">{APP_NAME}</span>
          <div className="ml-auto">
            <ModelSelector />
          </div>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto bg-[#0B0B10]">
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
