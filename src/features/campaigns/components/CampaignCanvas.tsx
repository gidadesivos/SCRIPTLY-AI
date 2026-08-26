import { useCallback, useEffect, useMemo } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useNodesState,
  useReactFlow,
  SelectionMode,
  type Connection,
  type Edge,
  type EdgeMouseHandler,
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
import { AuxiliaryNodeCard } from '@/features/campaigns/components/AuxiliaryNodeCard'
import { autoLayout, resolvePosition, type LayoutMode } from '@/features/campaigns/layout'
import { SelectionToolbar } from '@/features/campaigns/components/SelectionToolbar'
import { issuesFor } from '@/features/campaigns/validation'
import { resolveMedia } from '@/features/campaigns/media'
import { type CampaignLink, type CampaignNode } from '@/features/campaigns/types'
import { useTheme } from '@/features/settings/hooks/useTheme'

interface CampaignCanvasProps {
  nodes: CampaignNode[]
  links: CampaignLink[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onAddChild: (parentId: string) => void
  onDelete: (id: string) => void
  onMove: (positions: Array<{ id: string; position_x: number; position_y: number }>) => void
  onReparent: (childId: string, newParentId: string | null) => void
  onLink: (
    sourceId: string,
    targetId: string,
    sourceHandle?: string | null,
    targetHandle?: string | null
  ) => void
  onUnlink: (linkId: string) => void
  onInvalidConnection: (message: string) => void
  onUpdateNode: (id: string, patch: any) => void
  onDuplicateNode: (id: string) => void
  onCopyNode: (id: string) => void
  onPasteNode: () => void
  hasClipboard: boolean
  layoutMode: LayoutMode
  onAddNode: (type: string, position: { x: number; y: number }, parentId?: string) => void
  activeTool: string
  setActiveTool: (tool: string) => void
}

const nodeTypes = { 
  campanha: CampaignNodeCard as React.ComponentType<NodeProps>,
  conjunto: CampaignNodeCard as React.ComponentType<NodeProps>,
  anuncio: CampaignNodeCard as React.ComponentType<NodeProps>,
  publico: AuxiliaryNodeCard as React.ComponentType<NodeProps>,
  landing_page: AuxiliaryNodeCard as React.ComponentType<NodeProps>,
  whatsapp: AuxiliaryNodeCard as React.ComponentType<NodeProps>,
  oferta: AuxiliaryNodeCard as React.ComponentType<NodeProps>,
  pixel_evento: AuxiliaryNodeCard as React.ComponentType<NodeProps>,
  observacao: AuxiliaryNodeCard as React.ComponentType<NodeProps>,
  meta_kpi: AuxiliaryNodeCard as React.ComponentType<NodeProps>,
  nota: AuxiliaryNodeCard as React.ComponentType<NodeProps>,
  frame: AuxiliaryNodeCard as React.ComponentType<NodeProps>,
  texto: AuxiliaryNodeCard as React.ComponentType<NodeProps>,
  forma: AuxiliaryNodeCard as React.ComponentType<NodeProps>,
}

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
  onUpdateNode,
  onDuplicateNode,
  onCopyNode,
  onPasteNode,
  hasClipboard,
  layoutMode,
  onAddNode,
  activeTool,
  setActiveTool,
}: CampaignCanvasProps) {
  const auto = useMemo(() => autoLayout(nodes, layoutMode), [nodes, layoutMode])
  const { resolvedTheme } = useTheme()
  const { screenToFlowPosition } = useReactFlow()

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node<CampaignNodePayload>>([])

  useEffect(() => {
    setFlowNodes((current) => {
      const onScreen = new Map(current.map((node) => [node.id, node]))

      return nodes.map((node) => {
        const media = resolveMedia(node.media_url, node.media_kind)
        const d = node.data as Record<string, unknown>

        return {
          id: node.id,
          type: node.type,
          position: onScreen.get(node.id)?.position ?? resolvePosition(node, auto),
          selected: node.id === selectedId,
          draggable: !d.locked,
          data: {
            type: node.type,
            label: node.label,
            ...summarize(node.type, d),
            issues: issuesFor(node, nodes),
            hasScript: node.script_id !== null,
            media: media.embedUrl ? { kind: media.kind, embedUrl: media.embedUrl } : null,
            status: String(d.status ?? 'draft'),
            locked: Boolean(d.locked),
            favorite: Boolean(d.favorite),
            _originalData: d,
            onAddChild,
            onAddNode,
            onDelete,
            onUpdate: onUpdateNode,
            onDuplicate: onDuplicateNode,
            onCopy: onCopyNode,
            onPaste: onPasteNode,
            hasClipboard,
          },
        }
      })
    })
  }, [nodes, auto, selectedId, onAddChild, onDelete, onUpdateNode, onDuplicateNode, onCopyNode, onPasteNode, hasClipboard, setFlowNodes])

  const edges = useMemo<Edge[]>(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]))

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
          style: { stroke: parent ? (LEVEL_STYLES[parent.type] || LEVEL_STYLES.campanha!).hex : undefined, strokeWidth: 2 },
        }
      })

    const annotations: Edge[] = links.map((link) => ({
      id: `${LINK_PREFIX}${link.id}`,
      source: link.source_id,
      target: link.target_id,
      sourceHandle: link.source_handle || 'link-out',
      targetHandle: link.target_handle || 'link-in',
      type: 'bezier',
      label: link.label || undefined,
      animated: true,
      style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5, strokeDasharray: '5 4' },
      labelStyle: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
    }))

    return [...structural, ...annotations]
  }, [nodes, links])

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      if (connection.source === connection.target) return

      const isAnnotation =
        connection.sourceHandle?.startsWith('link-') || connection.targetHandle?.startsWith('link-')

      if (isAnnotation) {
        onLink(connection.source, connection.target, connection.sourceHandle, connection.targetHandle)
        return
      }

      const parent = nodes.find((node) => node.id === connection.source)
      const child = nodes.find((node) => node.id === connection.target)
      if (!parent || !child) return

      if (child.parent_id === parent.id) return
      onReparent(child.id, parent.id)
    },
    [nodes, onLink, onReparent, onInvalidConnection],
  )

  const handleEdgeClick = useCallback<EdgeMouseHandler>(
    (_event, edge) => {
      if (edge.id.startsWith(LINK_PREFIX)) {
        onUnlink(edge.id.slice(LINK_PREFIX.length))
      } else {
        // Deletar linha estrutural (transformar em órfão)
        onReparent(edge.target, null)
      }
    },
    [onUnlink, onReparent],
  )

  const handleConnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent, connectionState: any) => {
      if (!connectionState.isValid && connectionState.fromNode?.id) {
        if (connectionState.fromHandle?.id === 'child' || !connectionState.fromHandle?.id) {
          onAddChild(connectionState.fromNode.id)
        }
      }
    },
    [onAddChild],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      onAddNode(type, position)
    },
    [screenToFlowPosition, onAddNode],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = flowNodes.filter((n) => n.selected)
        if (selected.length > 0) {
          selected.forEach((n) => onDelete(n.id))
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selected = flowNodes.filter((n) => n.selected)
        if (selected.length === 1) onCopyNode(selected[0].id)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        onPasteNode()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        const selected = flowNodes.filter((n) => n.selected)
        selected.forEach((n) => onDuplicateNode(n.id))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flowNodes, onDelete, onCopyNode, onPasteNode, onDuplicateNode])

  return (
    <div className="h-full w-full bg-[#0E0E14]" onDragOver={onDragOver} onDrop={onDrop}>
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
        onConnectEnd={handleConnectEnd}
        onEdgeClick={handleEdgeClick}
        onNodeClick={(_, node) => {
          onSelect(node.id)
          if (activeTool !== 'cursor') setActiveTool('cursor')
        }}
      onPaneClick={(e) => {
        onSelect(null)
        if (['note', 'frame', 'text', 'shape', 'comment', 'forma', 'texto', 'nota'].includes(activeTool)) {
          const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
          let type = activeTool
          if (type === 'note') type = 'nota'
          if (type === 'text') type = 'texto'
          if (type === 'shape') type = 'forma'
          onAddNode(type, position)
          setActiveTool('cursor')
        }
      }}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      minZoom={0.2}
      maxZoom={1.5}
      colorMode={resolvedTheme}
      proOptions={{ hideAttribution: false }}
      snapToGrid={true}
      snapGrid={[20, 20]}
      selectionMode={SelectionMode.Partial}
      selectionOnDrag={activeTool === 'cursor'}
      panOnDrag={activeTool === 'pan' ? true : [1, 2]}
    >
      <Background gap={20} size={1} className="opacity-60" />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        className="hidden md:block"
        nodeColor={(node) => (LEVEL_STYLES[(node.data as CampaignNodePayload).type] || LEVEL_STYLES.campanha!).hex}
        nodeStrokeWidth={0}
        maskColor="hsl(var(--muted) / 0.6)"
      />
      <SelectionToolbar onMove={onMove} />
    </ReactFlow>
    </div>
  )
}
