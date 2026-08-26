import { supabase } from '@/lib/supabase'
import type { ScriptWithBrand } from '@/features/scripts/api'

export interface DashboardData {
  totalScripts: number
  scriptsByStatus: Record<string, number>
  totalBrands: number
  totalProducts: number
  recentScripts: ScriptWithBrand[]
}

/**
 * Usa `head: true` nas contagens: o servidor devolve só o total, sem trafegar
 * as linhas. Só os 5 roteiros recentes vêm com dados de verdade.
 */
export async function getDashboardData(workspaceId: string): Promise<DashboardData> {
  const [scriptsCount, brandsCount, productsCount, statusRows, recent] = await Promise.all([
    supabase
      .from('scripts')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
    supabase
      .from('brands')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active'),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active'),
    supabase.from('scripts').select('status').eq('workspace_id', workspaceId),
    supabase
      .from('scripts')
      .select('*, brand:brands(id, name)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (scriptsCount.error) throw scriptsCount.error
  if (brandsCount.error) throw brandsCount.error
  if (productsCount.error) throw productsCount.error
  if (statusRows.error) throw statusRows.error
  if (recent.error) throw recent.error

  const scriptsByStatus: Record<string, number> = {}
  for (const row of statusRows.data) {
    scriptsByStatus[row.status] = (scriptsByStatus[row.status] ?? 0) + 1
  }

  return {
    totalScripts: scriptsCount.count ?? 0,
    scriptsByStatus,
    totalBrands: brandsCount.count ?? 0,
    totalProducts: productsCount.count ?? 0,
    recentScripts: recent.data as unknown as ScriptWithBrand[],
  }
}
