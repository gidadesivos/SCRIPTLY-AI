import type { CampaignNode } from '@/features/campaigns/types'


/**
 * Posiciona a árvore quando o nó ainda não tem lugar próprio.
 *
 * Layout em camadas, um nível por linha: campanhas em cima, conjuntos no meio,
 * anúncios embaixo — a mesma leitura do painel do Meta. Quem arrastar um nó
 * ganha posição salva e deixa de ser reposicionado; isto vale só para o
 * primeiro desenho e para nós recém-criados.
 */
export type LayoutMode = 'TB' | 'LR' | 'compact'

export function autoLayout(nodes: CampaignNode[], mode: LayoutMode = 'TB'): Map<string, { x: number; y: number }> {
  const colW = mode === 'compact' ? 240 : 300
  const rowH = mode === 'compact' ? 140 : 220

  const positions = new Map<string, { x: number; y: number }>()
  const childrenOf = new Map<string | null, CampaignNode[]>()

  for (const node of nodes) {
    const key = node.parent_id
    const list = childrenOf.get(key) ?? []
    list.push(node)
    childrenOf.set(key, list)
  }

  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.order_index - b.order_index)
  }

  // Cada folha ocupa uma coluna; um pai fica centralizado sobre as suas.
  let nextColumn = 0

  function place(node: CampaignNode, depth: number): number {
    const children = childrenOf.get(node.id) ?? []

    if (children.length === 0) {
      const pos = nextColumn * colW
      nextColumn += 1
      const coord = mode === 'LR' ? { x: depth * rowH, y: pos } : { x: pos, y: depth * rowH }
      positions.set(node.id, coord)
      return pos
    }

    const childPoss = children.map((child) => place(child, depth + 1))
    const pos = (childPoss[0] + childPoss[childPoss.length - 1]) / 2
    const coord = mode === 'LR' ? { x: depth * rowH, y: pos } : { x: pos, y: depth * rowH }
    positions.set(node.id, coord)
    return pos
  }

  for (const root of childrenOf.get(null) ?? []) {
    place(root, 0)
    // Respiro entre campanhas, para dois ramos não parecerem um só.
    nextColumn += 1
  }

  return positions
}

/** Uma posição já salva vence o layout automático. */
export function resolvePosition(
  node: CampaignNode,
  auto: Map<string, { x: number; y: number }>,
): { x: number; y: number } {
  if (node.position_x !== 0 || node.position_y !== 0) {
    return { x: node.position_x, y: node.position_y }
  }
  return auto.get(node.id) ?? { x: 0, y: 0 }
}
