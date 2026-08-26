import { useCallback, useEffect, useMemo } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeMouseHandler,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  CampaignNodeCard,
  styleFor,
  summarize,
  type CampaignNodePayload,
} from '@/features/campaigns/components/CampaignNodeCard'
import { autoLayout, resolvePosition } from '@/features/campaigns/layout'
import { issuesFor } from '@/features/campaigns/validation'
import { resolveMedia } from '@/features/campaigns/media'
import { ALLOWED_CHILD, type CampaignLink, type CampaignNode } from '@/features/campaigns/types'
import { useTheme } from '@/features/settings/hooks/useTheme'

interface CampaignCanvasProps {
  nodes: CampaignNode[]
  links: CampaignLink[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onAddChild: (parentId: string) => void
  onDelete: (id: string) => void
  onMove: (positions: Array<{ id: string; position_x: number; position_y: number }>) => void
  /** Arrasto entre conectores de estrutura: move o nó para outro pai. */
  onReparent: (childId: string, newParentId: string) => void
  /** Arrasto entre conectores laterais: cria anotação. */
  onLink: (sourceId: string, targetId: string) => void
  onUnlink: (linkId: string) => void
  /** Sinaliza que o arrasto não formou uma estrutura válida. */
  onInvalidConnection: (message: string) => void
}

const nodeTypes = { campaign: CampaignNodeCard as React.ComponentType<NodeProps> }

/** Prefixo que distingue anotação de estrutura no id da aresta. */
const LINK_PREFIX = 'link:'

export function CampaignCanvas({
  nodes,
  links,
  selectedId,
  onSelect,
  onAddChild,
  onDelete,
  onMove,
  onReparent,
  onLink,
  onUnlink,
  onInvalidConnection,
}: CampaignCanvasProps) {
  const auto = useMemo(() => autoLayout(nodes), [nodes])
  const { resolvedTheme } = useTheme()

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node<CampaignNodePayload>>([])

  /**
   * Ressincroniza com o servidor SEM mexer em quem já está na tela.
   *
   * A posição de um nó que já está no canvas vence: remontar tudo a cada render
   * fazia o nó voltar ao lugar no fim do arrasto. Só nó novo é posicionado,
   * pelo layout automático.
   */
  useEffect(() => {
    setFlowNodes((current) => {
      const onScreen = new Map(current.map((node) => [node.id, node]))

      return nodes.map((node) => {
        const media = resolveMedia(node.media_url, node.media_kind)

        return {
          id: node.id,
          type: 'campaign',
          position: onScreen.get(node.id)?.position ?? resolvePosition(node, auto),
          selected: node.id === selectedId,
          data: {
            type: node.type,
            label: node.label,
            ...summarize(node.type, node.data as Record<string, unknown>),
            issues: issuesFor(node, nodes),
            hasScript: node.script_id !== null,
            media: media.embedUrl ? { kind: media.kind, embedUrl: media.embedUrl } : null,
            onAddChild,
            onDelete,
          },
        }
      })
    })
  }, [nodes, auto, selectedId, onAddChild, onDelete, setFlowNodes])

  const edges = useMemo<Edge[]>(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]))

    // Estrutura: sai de parent_id, cor do nível de ORIGEM, para dar para seguir
    // uma linha para baixo sem chegar até o nó.
    const structural: Edge[] = nodes
      .filter((node) => node.parent_id !== null)
      .map((node) => {
        const parent = byId.get(node.parent_id as string)
        return {
          id: `${node.parent_id}-${node.id}`,
          source: node.parent_id as string,
          target: node.id,
          sourceHandle: 'child',
          targetHandle: 'parent',
          type: 'smoothstep',
          style: { stroke: parent ? styleFor(parent.type).hex : undefined, strokeWidth: 2 },
        }
      })

    // Anotação: tracejada e cinza, para não competir com a estrutura. Quem bate
    // o olho precisa ver a árvore primeiro.
    const annotations: Edge[] = links.map((link) => ({
      id: `${LINK_PREFIX}${link.id}`,
      source: link.source_id,
      target: link.target_id,
      sourceHandle: 'link-out',
      targetHandle: 'link-in',
      type: 'bezier',
      label: link.label || undefined,
      animated: true,
      style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5, strokeDasharray: '5 4' },
      labelStyle: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
    }))

    return [...structural, ...annotations]
  }, [nodes, links])

  /**
   * Um arrasto só pode significar duas coisas, e o conector usado diz qual.
   *
   * Sem essa separação, soltar uma linha de uma campanha num conjunto seria
   * ambíguo: mover o conjunto para esta campanha, ou anotar que um depende do
   * outro? Aqui o conector de baixo move, o da lateral anota.
   */
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      if (connection.source === connection.target) return

      const isAnnotation =
        connection.sourceHandle === 'link-out' || connection.targetHandle === 'link-in'

      if (isAnnotation) {
        onLink(connection.source, connection.target)
        return
      }

      const parent = nodes.find((node) => node.id === connection.source)
      const child = nodes.find((node) => node.id === connection.target)
      if (!parent || !child) return

      if (ALLOWED_CHILD[parent.type] !== child.type) {
        onInvalidConnection(
          `Um ${child.type} não pode ficar dentro de um ${parent.type}. Use os conectores das laterais para apenas anotar a relação.`,
        )
        return
      }

      if (child.parent_id === parent.id) return
      onReparent(child.id, parent.id)
    },
    [nodes, onLink, onReparent, onInvalidConnection],
  )

  /** Clicar numa anotação apaga: é o gesto que as pessoas tentam primeiro. */
  const handleEdgeClick = useCallback<EdgeMouseHandler>(
    (_event, edge) => {
      if (edge.id.startsWith(LINK_PREFIX)) {
        onUnlink(edge.id.slice(LINK_PREFIX.length))
      }
    },
    [onUnlink],
  )

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeDragStop={(_, node, dragged) => {
        const moved = (dragged.length > 0 ? dragged : [node]).map((n) => ({
          id: n.id,
          position_x: n.position.x,
          position_y: n.position.y,
        }))
        onMove(moved)
      }}
      onConnect={handleConnect}
      onEdgeClick={handleEdgeClick}
      onNodeClick={(_, node) => onSelect(node.id)}
      onPaneClick={() => onSelect(null)}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      minZoom={0.2}
      maxZoom={1.5}
      colorMode={resolvedTheme}
      proOptions={{ hideAttribution: false }}
    >
      <Background gap={20} size={1} className="opacity-60" />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        className="hidden md:block"
        nodeColor={(node) => styleFor((node.data as CampaignNodePayload).type).hex}
        nodeStrokeWidth={0}
        maskColor="hsl(var(--muted) / 0.6)"
      />
    </ReactFlow>
  )
}
