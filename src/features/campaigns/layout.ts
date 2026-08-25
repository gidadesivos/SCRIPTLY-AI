import type { CampaignNode } from '@/features/campaigns/types'

const COLUMN_WIDTH = 300
const ROW_HEIGHT = 220

/**
 * Posiciona a árvore quando o nó ainda não tem lugar próprio.
 *
 * Layout em camadas, um nível por linha: campanhas em cima, conjuntos no meio,
 * anúncios embaixo — a mesma leitura do painel do Meta. Quem arrastar um nó
 * ganha posição salva e deixa de ser reposicionado; isto vale só para o
 * primeiro desenho e para nós recém-criados.
 */
export function autoLayout(nodes: CampaignNode[]): Map<string, { x: number; y: number }> {
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
      const x = nextColumn * COLUMN_WIDTH
      nextColumn += 1
      positions.set(node.id, { x, y: depth * ROW_HEIGHT })
      return x
    }

    const childXs = children.map((child) => place(child, depth + 1))
    const x = (childXs[0] + childXs[childXs.length - 1]) / 2
    positions.set(node.id, { x, y: depth * ROW_HEIGHT })
    return x
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
