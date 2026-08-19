import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createWorkspace, listWorkspaces } from '@/features/workspaces/api'

export const workspacesQueryKey = ['workspaces'] as const

export function useWorkspaces() {
  return useQuery({
    queryKey: workspacesQueryKey,
    queryFn: listWorkspaces,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => createWorkspace(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey })
    },
  })
}
