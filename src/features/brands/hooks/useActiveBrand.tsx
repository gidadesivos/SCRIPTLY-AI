import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useBrands } from '@/features/brands/hooks/useBrands'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import type { Brand } from '@/features/brands/api'

/** Chave por workspace: trocar de workspace não deve herdar a marca do anterior. */
function storageKey(workspaceId: string) {
  return `scriptly:active-brand:${workspaceId}`
}

interface ActiveBrandContextValue {
  brands: Brand[]
  activeBrand: Brand | null
  isLoading: boolean
  setActiveBrandId: (id: string) => void
}

const ActiveBrandContext = createContext<ActiveBrandContextValue | null>(null)

export function ActiveBrandProvider({ children }: { children: React.ReactNode }) {
  const { activeWorkspace } = useActiveWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''
  const { data: brands = [], isLoading } = useBrands({ workspaceId, status: 'active' })
  const [activeId, setActiveId] = useState<string | null>(null)

  // Ao trocar de workspace, recarrega a marca salva daquele workspace.
  useEffect(() => {
    if (!workspaceId) return
    setActiveId(localStorage.getItem(storageKey(workspaceId)))
  }, [workspaceId])

  useEffect(() => {
    if (isLoading || !workspaceId) return
    const stillExists = brands.some((b) => b.id === activeId)
    if (!stillExists && brands.length > 0) {
      setActiveId(brands[0].id)
      localStorage.setItem(storageKey(workspaceId), brands[0].id)
    }
  }, [brands, isLoading, activeId, workspaceId])

  function setActiveBrandId(id: string) {
    if (workspaceId) localStorage.setItem(storageKey(workspaceId), id)
    setActiveId(id)
  }

  const activeBrand = useMemo(
    () => brands.find((b) => b.id === activeId) ?? null,
    [brands, activeId],
  )

  return (
    <ActiveBrandContext.Provider value={{ brands, activeBrand, isLoading, setActiveBrandId }}>
      {children}
    </ActiveBrandContext.Provider>
  )
}

export function useActiveBrand() {
  const ctx = useContext(ActiveBrandContext)
  if (!ctx) throw new Error('useActiveBrand precisa estar dentro de <ActiveBrandProvider>')
  return ctx
}

/** Ver useActiveWorkspaceOptional: devolve null em vez de lançar. */
export function useActiveBrandOptional() {
  return useContext(ActiveBrandContext)
}
