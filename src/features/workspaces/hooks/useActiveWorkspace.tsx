import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useWorkspaces } from './useWorkspaces'
import type { Workspace } from '@/features/workspaces/types'

const STORAGE_KEY = 'scriptly:active-workspace-id'

interface ActiveWorkspaceContextValue {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  isLoading: boolean
  setActiveWorkspaceId: (id: string) => void
}

const ActiveWorkspaceContext = createContext<ActiveWorkspaceContextValue | null>(null)

export function ActiveWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: workspaces = [], isLoading } = useWorkspaces()
  const [activeId, setActiveId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  )

  useEffect(() => {
    if (isLoading) return
    const stillExists = workspaces.some((w) => w.id === activeId)
    if (!stillExists && workspaces.length > 0) {
      setActiveId(workspaces[0].id)
    }
  }, [workspaces, isLoading, activeId])

  function setActiveWorkspaceId(id: string) {
    localStorage.setItem(STORAGE_KEY, id)
    setActiveId(id)
  }

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeId) ?? null,
    [workspaces, activeId],
  )

  return (
    <ActiveWorkspaceContext.Provider
      value={{ workspaces, activeWorkspace, isLoading, setActiveWorkspaceId }}
    >
      {children}
    </ActiveWorkspaceContext.Provider>
  )
}

export function useActiveWorkspace() {
  const ctx = useContext(ActiveWorkspaceContext)
  if (!ctx) throw new Error('useActiveWorkspace precisa estar dentro de <ActiveWorkspaceProvider>')
  return ctx
}

/**
 * Versão que devolve null em vez de lançar.
 * Para componentes opcionais (como o botão de IA), que devem se desabilitar
 * fora do shell autenticado em vez de derrubar a página inteira.
 */
export function useActiveWorkspaceOptional() {
  return useContext(ActiveWorkspaceContext)
}
