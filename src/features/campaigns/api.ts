import { supabase } from '@/lib/supabase'
import { NotAllowedError } from '@/features/scripts/api'
import {
  emptyNodeData,
  parseNodeData,
  type CampaignNode,
  type CampaignNodeData,
  type CampaignNodeType,
  type CampaignPlan,
} from '@/features/campaigns/types'

interface NodeRow extends Omit<CampaignNode, 'data'> {
  data: unknown
}

/** O jsonb do banco só vira CampaignNode depois de passar pelo schema do tipo. */
function toNode(row: NodeRow): CampaignNode {
  return { ...row, data: parseNodeData(row.type, row.data) }
}

export async function listPlans(
  workspaceId: string,
  brandId: string,
): Promise<CampaignPlan[]> {
  const { data, error } = await supabase
    .from('campaign_plans')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('brand_id', brandId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .returns<CampaignPlan[]>()

  if (error) throw error
  return data
}

export async function createPlan(input: {
  workspaceId: string
  brandId: string
  name: string
}): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('Sessão expirada.')

  const { data, error } = await supabase
    .from('campaign_plans')
    .insert({
      workspace_id: input.workspaceId,
      brand_id: input.brandId,
      name: input.name,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

export async function getPlan(
  planId: string,
): Promise<{ plan: CampaignPlan; nodes: CampaignNode[] }> {
  const [planResult, nodesResult] = await Promise.all([
    supabase.from('campaign_plans').select('*').eq('id', planId).single<CampaignPlan>(),
    supabase
      .from('campaign_nodes')
      .select('*')
      .eq('plan_id', planId)
      .order('order_index', { ascending: true })
      .returns<NodeRow[]>(),
  ])

  if (planResult.error) throw planResult.error
  if (nodesResult.error) throw nodesResult.error

  return { plan: planResult.data, nodes: nodesResult.data.map(toNode) }
}

export async function renamePlan(planId: string, name: string): Promise<void> {
  const { data, error } = await supabase
    .from('campaign_plans')
    .update({ name })
    .eq('id', planId)
    .select('id')

  if (error) throw error
  if (!data?.length) throw new NotAllowedError('Você não tem permissão para editar este plano.')
}

export async function deletePlan(planId: string): Promise<void> {
  const { data, error } = await supabase
    .from('campaign_plans')
    .delete()
    .eq('id', planId)
    .select('id')

  if (error) throw error
  if (!data?.length) {
    throw new NotAllowedError(
      'Você não tem permissão para excluir planos neste workspace. Só owner e admin podem.',
    )
  }
}

export async function createNode(input: {
  workspaceId: string
  planId: string
  parentId: string | null
  type: CampaignNodeType
  label: string
  positionX: number
  positionY: number
  orderIndex: number
}): Promise<CampaignNode> {
  const { data, error } = await supabase
    .from('campaign_nodes')
    .insert({
      workspace_id: input.workspaceId,
      plan_id: input.planId,
      parent_id: input.parentId,
      type: input.type,
      label: input.label,
      data: emptyNodeData(input.type),
      position_x: input.positionX,
      position_y: input.positionY,
      order_index: input.orderIndex,
    })
    .select('*')
    .single<NodeRow>()

  if (error) throw error
  return toNode(data)
}

export interface NodePatch {
  label?: string
  data?: CampaignNodeData
  script_id?: string | null
}

export async function updateNode(id: string, patch: NodePatch): Promise<void> {
  const { data, error } = await supabase
    .from('campaign_nodes')
    .update(patch)
    .eq('id', id)
    .select('id')

  if (error) throw error
  if (!data?.length) throw new NotAllowedError('Você não tem permissão para editar este plano.')
}

/**
 * Salva as posições dos nós movidos.
 *
 * Foi tentador usar upsert para mandar tudo num request, mas upsert INSERE
 * quando o id não existe: um payload só com posição estouraria nos NOT NULL de
 * workspace_id e plan_id. Estas linhas sempre existem, então são updates.
 *
 * Em paralelo é seguro aqui — diferente do reordenar cenas, posição não tem
 * restrição de unicidade, então duas escritas simultâneas não colidem.
 */
export async function updateNodePositions(
  positions: Array<{ id: string; position_x: number; position_y: number }>,
): Promise<void> {
  if (positions.length === 0) return

  const results = await Promise.all(
    positions.map(({ id, position_x, position_y }) =>
      supabase.from('campaign_nodes').update({ position_x, position_y }).eq('id', id),
    ),
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) throw failed.error
}

export async function deleteNode(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('campaign_nodes')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) throw error
  if (!data?.length) throw new NotAllowedError('Você não tem permissão para editar este plano.')
}
