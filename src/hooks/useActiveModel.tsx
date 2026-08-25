import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listWorkspaceModels, type WorkspaceModel } from '@/features/settings/api'
import { useActiveWorkspaceOptional } from '@/features/workspaces/hooks/useActiveWorkspace'

/** Provedor + modelo escolhido pelo usuário. */
export interface ActiveModelChoice {
  provider: 'gemini' | 'openrouter' | 'groq'
  modelId: string
  label: string
}

interface ActiveModelContextValue {
  /** Modelo selecionado. null = nenhum configurado, usar cascata automática. */
  activeModel: ActiveModelChoice | null
  /** Troca o modelo ativo. */
  setActiveModel: (choice: ActiveModelChoice | null) => void
  /** Todos os modelos configurados no workspace. */
  availableModels: WorkspaceModel[]
  isLoading: boolean
}

const STORAGE_PREFIX = 'scriptly:active-model:'

function storageKey(workspaceId: string) {
  return `${STORAGE_PREFIX}${workspaceId}`
}

function loadFromStorage(workspaceId: string): ActiveModelChoice | null {
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    if (!raw) return null
    return JSON.parse(raw) as ActiveModelChoice
  } catch {
    return null
  }
}

function saveToStorage(workspaceId: string, choice: ActiveModelChoice | null) {
  const key = storageKey(workspaceId)
  if (choice) {
    localStorage.setItem(key, JSON.stringify(choice))
  } else {
    localStorage.removeItem(key)
  }
}

const ActiveModelContext = createContext<ActiveModelContextValue | null>(null)

export function ActiveModelProvider({ children }: { children: React.ReactNode }) {
  const ctx = useActiveWorkspaceOptional()
  const workspaceId = ctx?.activeWorkspace?.id ?? ''

  const [choice, setChoice] = useState<ActiveModelChoice | null>(() =>
    workspaceId ? loadFromStorage(workspaceId) : null,
  )

  const models = useQuery({
    queryKey: ['workspace-models', workspaceId],
    queryFn: () => listWorkspaceModels(workspaceId),
    enabled: Boolean(workspaceId),
  })

  // Quando o workspace muda, recarregar a escolha salva.
  useEffect(() => {
    if (!workspaceId) {
      setChoice(null)
      return
    }
    setChoice(loadFromStorage(workspaceId))
  }, [workspaceId])

  // Se o modelo salvo não existe mais nos configurados, limpar.
  useEffect(() => {
    if (!models.data || !choice) return
    const exists = models.data.some(
      (m) => m.provider === choice.provider && m.model_id === choice.modelId,
    )
    if (!exists) {
      setChoice(null)
      saveToStorage(workspaceId, null)
    }
  }, [models.data, choice, workspaceId])

  const setActiveModel = useCallback(
    (newChoice: ActiveModelChoice | null) => {
      setChoice(newChoice)
      if (workspaceId) saveToStorage(workspaceId, newChoice)
    },
    [workspaceId],
  )

  const value = useMemo<ActiveModelContextValue>(
    () => ({
      activeModel: choice,
      setActiveModel,
      availableModels: models.data ?? [],
      isLoading: models.isPending,
    }),
    [choice, setActiveModel, models.data, models.isPending],
  )

  return <ActiveModelContext.Provider value={value}>{children}</ActiveModelContext.Provider>
}

/**
 * Hook para acessar o modelo ativo.
 * Deve ser usado dentro de <ActiveModelProvider>.
 */
export function useActiveModel() {
  const ctx = useContext(ActiveModelContext)
  if (!ctx) throw new Error('useActiveModel precisa estar dentro de <ActiveModelProvider>')
  return ctx
}

/**
 * Versão segura que devolve null fora do provider.
 * Para componentes opcionais que devem se desabilitar em vez de crashar.
 */
export function useActiveModelOptional() {
  return useContext(ActiveModelContext)
}
