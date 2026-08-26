import type { CampaignNode } from '@/features/campaigns/types'

/**
 * Destinos de um anúncio. Não são um nível da árvore — são satélites.
 *
 * O autoLayout posiciona por PROFUNDIDADE: campanha na primeira linha,
 * conjunto na segunda, anúncio na terceira. Um destino filho de anúncio caía
 * numa quarta linha, muito abaixo, e ainda consumia uma coluna inteira
 * (nextColumn += 1), empurrando os anúncios vizinhos para o lado. Era isso que
 * fazia o WhatsApp aparecer "totalmente errado" ao ser criado pelo menu.
 *
 * Satélite fica AO LADO do pai, e não conta como coluna da árvore.
 */
export const SATELLITE_TYPES = ['whatsapp', 'landing_page', 'formulario'] as const

export function isSatellite(type: string): boolean {
  return (SATELLITE_TYPES as readonly string[]).includes(type)
}

/** Largura estimada do card, por tipo. Usada para o satélite não sobrepor o pai. */
export function cardWidth(type: string): number {
  if (type === 'formulario') return 260
  if (type === 'landing_page') return 240
  if (isSatellite(type)) return 220
  return 256
}

/** Folga horizontal entre o pai e a coluna de satélites. */
export const SATELLITE_GAP = 48
/** Distância vertical entre dois satélites do mesmo pai. */
export const SATELLITE_ROW = 132

/**
 * Onde nasce um satélite novo: à direita do pai, empilhando para baixo
 * conforme o pai já tenha outros.
 */
export function satellitePosition(
  parent: { position_x: number; position_y: number; type: string },
  existingSatellites: number,
): { x: number; y: number } {
  return {
    x: parent.position_x + cardWidth(parent.type) + SATELLITE_GAP,
    y: parent.position_y + existingSatellites * SATELLITE_ROW,
  }
}


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

  // Satélites ficam FORA da recursão da árvore: entram depois, ao lado do pai.
  const satellites = nodes.filter((node) => isSatellite(node.type) && node.parent_id)
  const treeNodes = nodes.filter((node) => !satellites.includes(node))

  /*
   * Quem tem satélite precisa de uma coluna a mais reservada.
   *
   * Sem isso o satélite nascia em parent.x + largura + folga e caía EM CIMA do
   * anúncio da coluna seguinte — o destino ficava sobre o vizinho em vez de ao
   * lado do próprio pai.
   */
  const hasSatellite = new Set(satellites.map((s) => s.parent_id!))

  for (const node of treeNodes) {
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
      // Uma coluna para o nó e, quando ele tem destinos, outra para a faixa deles.
      nextColumn += hasSatellite.has(node.id) ? 2 : 1
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

  /*
   * Satélites por último, já sabendo onde o pai ficou. Empilham para baixo
   * quando o mesmo anúncio tem mais de um destino — dois satélites no mesmo
   * ponto ficariam um escondido embaixo do outro.
   */
  const usedByParent = new Map<string, number>()
  for (const satellite of satellites) {
    const parentPos = positions.get(satellite.parent_id!)
    if (!parentPos) continue

    const parent = nodes.find((n) => n.id === satellite.parent_id)
    const index = usedByParent.get(satellite.parent_id!) ?? 0
    usedByParent.set(satellite.parent_id!, index + 1)

    positions.set(satellite.id, {
      x: parentPos.x + cardWidth(parent?.type ?? 'anuncio') + SATELLITE_GAP,
      y: parentPos.y + index * SATELLITE_ROW,
    })
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
