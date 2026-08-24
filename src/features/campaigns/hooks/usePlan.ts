import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { NotAllowedError } from '@/features/scripts/api'
import {
  createNode,
  createPlan,
  deleteNode,
  deletePlan,
  getPlan,
  listPlans,
  renamePlan,
  updateNode,
  updateNodePositions,
  type NodePatch,
} from '@/features/campaigns/api'
import type { CampaignNode, CampaignNodeType } from '@/features/campaigns/types'
import { strings } from '@/i18n/pt-BR'

export function planQueryKey(planId: string | undefined) {
  return ['campaign-plan', planId] as const
}

export function reportCampaignError(error: unknown) {
  toast.error(error instanceof NotAllowedError ? error.message : strings.errors.unexpected)
}

export function usePlans(workspaceId: string, brandId: string) {
  return useQuery({
    queryKey: ['campaign-plans', workspaceId, brandId],
    queryFn: () => listPlans(workspaceId, brandId),
    enabled: Boolean(workspaceId && brandId),
  })
}

export function usePlan(planId: string | undefined) {
  return useQuery({
    queryKey: planQueryKey(planId),
    queryFn: () => getPlan(planId as string),
    enabled: Boolean(planId),
  })
}

export function useCreatePlan(workspaceId: string, brandId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createPlan({ workspaceId, brandId, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-plans', workspaceId, brandId] })
    },
    onError: reportCampaignError,
  })
}

export function useDeletePlan(workspaceId: string, brandId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (planId: string) => deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-plans', workspaceId, brandId] })
      toast.success('Plano excluído.')
    },
    onError: reportCampaignError,
  })
}

export function useRenamePlan(planId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => renamePlan(planId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planQueryKey(planId) }),
    onError: reportCampaignError,
  })
}

export function useNodeMutations(planId: string) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: planQueryKey(planId) })

  const add = useMutation({
    mutationFn: (input: {
      workspaceId: string
      parentId: string | null
      type: CampaignNodeType
      label: string
      positionX: number
      positionY: number
      orderIndex: number
    }) => createNode({ ...input, planId }),
    onSuccess: invalidate,
    onError: reportCampaignError,
  })

  const patch = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: NodePatch }) => updateNode(id, patch),
    onSuccess: invalidate,
    onError: reportCampaignError,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteNode(id),
    onSuccess: invalidate,
    onError: reportCampaignError,
  })

  /**
   * Posição não invalida a consulta — refazer o fetch faria a árvore piscar a
   * cada arrasto. Em vez disso escreve direto no cache.
   *
   * Sem isso o cache guardaria as posições antigas, e sair do plano e voltar
   * dentro da janela de cache traria os nós de volta ao layout automático,
   * mesmo com a posição certa já gravada no banco.
   */
  const move = useMutation({
    mutationFn: updateNodePositions,
    onSuccess: (_result, positions) => {
      queryClient.setQueryData<{ plan: unknown; nodes: CampaignNode[] }>(
        planQueryKey(planId),
        (current) => {
          if (!current) return current
          const moved = new Map(positions.map((p) => [p.id, p]))
          return {
            ...current,
            nodes: current.nodes.map((node) => {
              const update = moved.get(node.id)
              return update
                ? { ...node, position_x: update.position_x, position_y: update.position_y }
                : node
            }),
          }
        },
      )
    },
    onError: reportCampaignError,
  })

  return { add, patch, remove, move }
}
