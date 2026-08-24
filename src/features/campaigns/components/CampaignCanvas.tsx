import { useEffect, useMemo } from 'react'
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
  LEVEL_STYLES,
  summarize,
  type CampaignNodePayload,
} from '@/features/campaigns/components/CampaignNodeCard'
import { autoLayout, resolvePosition } from '@/features/campaigns/layout'
import { issuesFor } from '@/features/campaigns/validation'
import type { CampaignNode } from '@/features/campaigns/types'
import { useTheme } from '@/features/settings/hooks/useTheme'

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

  /**
   * Os controles e o minimapa vêm do React Flow com estilo próprio, que não
   * segue o tema do app: no escuro ficavam painéis brancos com ícones
   * invisíveis. colorMode é o que faz a biblioteca trocar as próprias
   * variáveis de cor.
   *
   * Vai o tema RESOLVIDO, não o escolhido: 'system' precisa virar light ou dark
   * para a biblioteca entender.
   */
  const { resolvedTheme } = useTheme()

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node<CampaignNodePayload>>([])

  /**
   * Ressincroniza com o servidor SEM mexer em quem já está na tela.
   *
   * A versão anterior remontava todos os nós, posição inclusive, sempre que o
   * componente recebia props novas. Como onAddChild e onDelete são recriados a
   * cada render do pai, isso acontecia o tempo todo — e no fim de um arrasto,
   * quando mutations.move.mutate() re-renderiza a página, o nó era jogado de
   * volta para a posição antiga. A posição chegava a ser salva no banco; o que
   * o usuário via era o nó grudado no lugar, como se não desse para mover.
   *
   * Agora a posição de um nó que já está no canvas vence: só nó novo é
   * posicionado, pelo layout automático.
   */
  useEffect(() => {
    setFlowNodes((current) => {
      const onScreen = new Map(current.map((node) => [node.id, node]))

      return nodes.map((node) => ({
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
          onAddChild,
          onDelete,
        },
      }))
    })
  }, [nodes, auto, selectedId, onAddChild, onDelete, setFlowNodes])

  /**
   * As arestas saem de parent_id, não de um estado editável.
   *
   * Deixar o usuário ligar nós à mão permitiria pendurar um anúncio direto na
   * campanha — estrutura que o Meta recusa. Quem cria a ligação é o botão
   * "adicionar dentro", que já sabe o tipo permitido.
   */
  const edges = useMemo<Edge[]>(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]))

    return nodes
      .filter((node) => node.parent_id !== null)
      .map((node) => {
        // Cor do nível de ORIGEM: seguir uma linha para baixo mostra de onde
        // ela saiu sem precisar chegar até o nó.
        const parent = byId.get(node.parent_id as string)
        const color = parent ? LEVEL_STYLES[parent.type].hex : undefined

        return {
          id: `${node.parent_id}-${node.id}`,
          source: node.parent_id as string,
          target: node.id,
          type: 'smoothstep',
          style: { stroke: color, strokeWidth: 2 },
        }
      })
  }, [nodes])

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
      colorMode={resolvedTheme}
      proOptions={{ hideAttribution: false }}
    >
      <Background gap={20} size={1} className="opacity-60" />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        className="hidden md:block"
        // Sem cor por nível o minimapa vira um borrão cinza e não ajuda a se
        // localizar num plano grande.
        nodeColor={(node) => LEVEL_STYLES[(node.data as CampaignNodePayload).type].hex}
        nodeStrokeWidth={0}
        maskColor="hsl(var(--muted) / 0.6)"
      />
    </ReactFlow>
  )
}
