import { supabase } from '@/lib/supabase'
import { NotAllowedError } from '@/features/scripts/api'
import {
  emptyNodeData,
  parseNodeData,
  type CampaignLink,
  type CampaignNode,
  type CampaignNodeData,
  type CampaignNodeType,
  type CampaignPlan,
  type MediaKind,
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
): Promise<{ plan: CampaignPlan; nodes: CampaignNode[]; links: CampaignLink[] }> {
  const [planResult, nodesResult, linksResult] = await Promise.all([
    supabase.from('campaign_plans').select('*').eq('id', planId).single<CampaignPlan>(),
    supabase
      .from('campaign_nodes')
      .select('*')
      .eq('plan_id', planId)
      .order('order_index', { ascending: true })
      .returns<NodeRow[]>(),
    supabase
      .from('campaign_links')
      .select('id, plan_id, source_id, target_id, label')
      .eq('plan_id', planId)
      .returns<CampaignLink[]>(),
  ])

  if (planResult.error) throw planResult.error
  if (nodesResult.error) throw nodesResult.error
  if (linksResult.error) throw linksResult.error

  return {
    plan: planResult.data,
    nodes: nodesResult.data.map(toNode),
    links: linksResult.data,
  }
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
  media_url?: string
  media_kind?: MediaKind
  /** Mover o nó para outro pai. O trigger do banco valida a hierarquia. */
  parent_id?: string | null
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

/**
 * Move o nó para outro pai.
 *
 * A validação de hierarquia fica no trigger (migration 0010): tentar pendurar
 * um anúncio direto na campanha volta como erro do banco, não como sucesso
 * silencioso.
 */
export async function reparentNode(id: string, parentId: string): Promise<void> {
  const { data, error } = await supabase
    .from('campaign_nodes')
    .update({ parent_id: parentId })
    .eq('id', id)
    .select('id')

  if (error) throw error
  if (!data?.length) throw new NotAllowedError('Você não tem permissão para editar este plano.')
}

export async function createLink(input: {
  workspaceId: string
  planId: string
  sourceId: string
  targetId: string
}): Promise<CampaignLink> {
  const { data, error } = await supabase
    .from('campaign_links')
    .insert({
      workspace_id: input.workspaceId,
      plan_id: input.planId,
      source_id: input.sourceId,
      target_id: input.targetId,
    })
    .select('id, plan_id, source_id, target_id, label')
    .single<CampaignLink>()

  if (error) throw error
  return data
}

export async function updateLinkLabel(id: string, label: string): Promise<void> {
  const { error } = await supabase.from('campaign_links').update({ label }).eq('id', id)
  if (error) throw error
}

export async function deleteLink(id: string): Promise<void> {
  const { error } = await supabase.from('campaign_links').delete().eq('id', id)
  if (error) throw error
}

/**
 * Duplica o nó e tudo que está pendurado nele.
 *
 * Montar três conjuntos que variam só no público é o caso mais comum de
 * planejamento, e refazer campo por campo é o que faz alguém desistir da
 * ferramenta e voltar para a planilha.
 *
 * Os filhos são criados por nível, e não em paralelo: o id do pai novo precisa
 * existir antes de o filho apontar para ele.
 */
export async function duplicateNodeTree(
  nodeId: string,
  allNodes: CampaignNode[],
): Promise<void> {
  const original = allNodes.find((node) => node.id === nodeId)
  if (!original) return

  async function copy(source: CampaignNode, parentId: string | null): Promise<void> {
    const { data, error } = await supabase
      .from('campaign_nodes')
      .insert({
        workspace_id: source.workspace_id,
        plan_id: source.plan_id,
        parent_id: parentId,
        type: source.type,
        label: source === original ? `${source.label || 'Sem nome'} (cópia)` : source.label,
        data: source.data,
        // Deslocado para a cópia não nascer exatamente embaixo do original,
        // onde pareceria que nada aconteceu.
        position_x: source.position_x + (source === original ? 40 : 0),
        position_y: source.position_y + (source === original ? 40 : 0),
        order_index: source.order_index,
        script_id: source.script_id,
        media_url: source.media_url,
        media_kind: source.media_kind,
      })
      .select('id')
      .single()

    if (error) throw error

    const children = allNodes.filter((node) => node.parent_id === source.id)
    for (const child of children) {
      await copy(child, data.id)
    }
  }

  await copy(original, original.parent_id)
}
