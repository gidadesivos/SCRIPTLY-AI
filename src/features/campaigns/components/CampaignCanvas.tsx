import { useCallback, useEffect, useMemo } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  CampaignNodeCard,
  summarize,
  type CampaignNodePayload,
} from '@/features/campaigns/components/CampaignNodeCard'
import { autoLayout, resolvePosition } from '@/features/campaigns/layout'
import { issuesFor } from '@/features/campaigns/validation'
import type { CampaignNode } from '@/features/campaigns/types'

interface CampaignCanvasProps {
  nodes: CampaignNode[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onAddChild: (parentId: string) => void
  onDelete: (id: string) => void
  onMove: (positions: Array<{ id: string; position_x: number; position_y: number }>) => void
}

const nodeTypes = { campaign: CampaignNodeCard as React.ComponentType<NodeProps> }

export function CampaignCanvas({
  nodes,
  selectedId,
  onSelect,
  onAddChild,
  onDelete,
  onMove,
}: CampaignCanvasProps) {
  const auto = useMemo(() => autoLayout(nodes), [nodes])

  const buildNodes = useCallback(
    (): Node<CampaignNodePayload>[] =>
      nodes.map((node) => ({
        id: node.id,
        type: 'campaign',
        position: resolvePosition(node, auto),
        selected: node.id === selectedId,
        data: {
          type: node.type,
          label: node.label,
          summary: summarize(node.type, node.data as Record<string, unknown>),
          issues: issuesFor(node, nodes),
          hasScript: node.script_id !== null,
          onAddChild,
          onDelete,
        },
      })),
    [nodes, auto, selectedId, onAddChild, onDelete],
  )

  /**
   * Estado local do React Flow, e não nós derivados direto das props.
   *
   * Em modo controlado, ele só desenha o que está no estado: derivar a posição
   * das props a cada render fazia o nó voltar sozinho ao soltar, e a posição
   * salva era a antiga. O estado é ressincronizado quando os dados do servidor
   * mudam.
   */
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node<CampaignNodePayload>>([])

  useEffect(() => {
    setFlowNodes(buildNodes())
  }, [buildNodes, setFlowNodes])

  /**
   * As arestas saem de parent_id, não de um estado editável.
   *
   * Deixar o usuário ligar nós à mão permitiria pendurar um anúncio direto na
   * campanha — estrutura que o Meta recusa. Quem cria a ligação é o botão
   * "adicionar dentro", que já sabe o tipo permitido.
   */
  const edges = useMemo<Edge[]>(
    () =>
      nodes
        .filter((node) => node.parent_id !== null)
        .map((node) => ({
          id: `${node.parent_id}-${node.id}`,
          source: node.parent_id as string,
          target: node.id,
          type: 'smoothstep',
        })),
    [nodes],
  )

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      // onNodeDragStop, e não onNodesChange: aqui a posição final já está
      // resolvida, e persiste uma vez por arrasto em vez de por quadro.
      onNodeDragStop={(_, node, dragged) => {
        const moved = (dragged.length > 0 ? dragged : [node]).map((n) => ({
          id: n.id,
          position_x: n.position.x,
          position_y: n.position.y,
        }))
        onMove(moved)
      }}
      onNodeClick={(_, node) => onSelect(node.id)}
      onPaneClick={() => onSelect(null)}
      // Sem conexão manual: a hierarquia vem do botão de adicionar.
      nodesConnectable={false}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      minZoom={0.2}
      maxZoom={1.5}
      proOptions={{ hideAttribution: false }}
    >
      <Background />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable className="hidden md:block" />
    </ReactFlow>
  )
}
