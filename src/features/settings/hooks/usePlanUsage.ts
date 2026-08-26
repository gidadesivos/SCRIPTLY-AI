import { useQuery } from '@tanstack/react-query'
import { fetchPlanUsage } from '@/features/settings/api'

export function usePlanUsage(workspaceId: string) {
  return useQuery({
    queryKey: ['plan-usage', workspaceId],
    queryFn: () => fetchPlanUsage(workspaceId),
    enabled: Boolean(workspaceId),
  })
}
