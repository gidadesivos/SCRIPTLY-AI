import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ReactFlowProvider } from '@xyflow/react'
import { Copy, LayoutGrid, Network, Plus, Printer, TriangleAlert, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { CampaignCanvas } from '@/features/campaigns/components/CampaignCanvas'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CampaignTable } from '@/features/campaigns/components/CampaignTable'
import { CampaignDashboard } from '@/features/campaigns/components/CampaignDashboard'
import { AiAssistant } from '@/features/campaigns/components/AiAssistant'
import { NodeInspector } from '@/features/campaigns/components/NodeInspector'
import { CanvasLegend } from '@/features/campaigns/components/CanvasLegend'
import { PlanDocument } from '@/features/campaigns/components/PlanDocument'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNodeMutations, usePlan } from '@/features/campaigns/hooks/usePlan'
import { planTotals } from '@/features/campaigns/validation'
import { ALLOWED_CHILD, NODE_LABELS, type CampaignNode } from '@/features/campaigns/types'
import { getScriptWithScenes } from '@/features/scripts/api'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { useActiveBrand } from '@/features/brands/hooks/useActiveBrand'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { dbErrorMessage } from '@/lib/db-errors'
import { CanvasSidebar, type ToolType } from '@/features/campaigns/components/CanvasSidebar'

export function PlanBoardPage() {
  const { planId } = useParams<{ planId: string }>()
  const { activeWorkspace } = useActiveWorkspace()
  const { activeBrand } = useActiveBrand()
  const workspaceId = activeWorkspace?.id ?? ''

  const { data, isPending, isError, error } = usePlan(planId)
  const mutations = useNodeMutations(planId ?? '')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [viewMode, setViewMode] = useState<'canvas' | 'table' | 'dashboard'>('canvas')
  const [clipboardNodeId, setClipboardNodeId] = useState<string | null>(null)
  const [layoutMode, setLayoutMode] = useState<'TB' | 'LR' | 'compact'>('LR')
  const [activeTool, setActiveTool] = useState<ToolType>('cursor')

  const [draft, setDraft] = useState<CampaignNode | null>(null)
  const debouncedDraft = useDebouncedValue(draft, 700)

  const nodes = useMemo(() => data?.nodes ?? [], [data])
  const links = useMemo(() => data?.links ?? [], [data])
  const selected = nodes.find((node) => node.id === selectedId) ?? null

  useEffect(() => {
    setDraft(selected)
  }, [selectedId])

  useEffect(() => {
    if (!debouncedDraft) return
    const original = nodes.find((node) => node.id === debouncedDraft.id)
    if (!original) return

    const labelChanged = original.label !== debouncedDraft.label
    const dataChanged = JSON.stringify(original.data) !== JSON.stringify(debouncedDraft.data)
    const mediaChanged = original.media_url !== debouncedDraft.media_url
    if (!labelChanged && !dataChanged && !mediaChanged) return

    mutations.patch.mutate({
      id: debouncedDraft.id,
      patch: {
        label: debouncedDraft.label,
        data: debouncedDraft.data,
        media_url: debouncedDraft.media_url,
      },
    })
  }, [debouncedDraft])

  const totals = useMemo(() => planTotals(nodes), [nodes])

  const { data: linkedScript } = useQuery({
    queryKey: ['campaign-script-context', selected?.script_id],
    queryFn: () => getScriptWithScenes(selected?.script_id as string),
    enabled: Boolean(selected?.script_id),
  })

  const scriptContext = useMemo(() => {
    if (!linkedScript) return ''
    const falas = linkedScript.scenes.map((scene) => scene.voiceover).filter(Boolean)
    return [linkedScript.script.title, ...falas].join('\n').slice(0, 3500)
  }, [linkedScript])

  const addNode = useCallback(
    (parentId: string | null) => {
      const parent = parentId ? nodes.find((node) => node.id === parentId) : null
      const type = parent ? ALLOWED_CHILD[parent.type] : 'campanha'
      if (!type) return

      const siblings = nodes.filter((node) => node.parent_id === parentId)

      mutations.add.mutate({
        workspaceId,
        parentId,
        type,
        label: '',
        positionX: 0,
        positionY: 0,
        orderIndex: siblings.length,
      })
    },
    [nodes, workspaceId],
  )

  const [nodeToDelete, setNodeToDelete] = useState<{ id: string, msg: string } | null>(null)

  const confirmDelete = useCallback(() => {
    if (nodeToDelete) {
      setSelectedId((current) => (current === nodeToDelete.id ? null : current))
      mutations.remove.mutate(nodeToDelete.id)
      setNodeToDelete(null)
    }
  }, [nodeToDelete, mutations])

  const removeNode = useCallback(
    (id: string) => {
      const node = nodes.find(n => n.id === id)
      const children = nodes.filter(n => n.parent_id === id)
      const hasChildren = children.length > 0
      
      if (hasChildren) {
        let msg = `Este nó possui dependentes. Deseja excluir toda a estrutura de "${node?.label || 'Sem nome'}"?`
        if (node?.type === 'campanha') {
           const conjCount = nodes.filter(n => n.parent_id === id && n.type === 'conjunto').length
           const adCount = nodes.filter(n => n.type === 'anuncio' && nodes.find(p => p.id === n.parent_id && p.parent_id === id)).length
           msg = `Esta campanha possui ${conjCount} conjuntos e ${adCount} anúncios. Deseja excluir toda a estrutura?`
        } else if (node?.type === 'conjunto') {
           msg = `Este conjunto possui ${children.length} anúncios. Deseja excluir toda a estrutura?`
        }

        setNodeToDelete({ id, msg })
        return
      }

      setSelectedId((current) => (current === id ? null : current))
      mutations.remove.mutate(id)
    },
    [nodes, mutations],
  )

  const updateNode = useCallback(
    (id: string, patch: any) => {
      if (id === selectedId) {
        setDraft((current) => current ? { ...current, ...patch } : current)
      }
      mutations.patch.mutate({ id, patch })
    },
    [selectedId, mutations],
  )

  const duplicateNode = useCallback(
    (id: string) => {
      mutations.duplicate.mutate({ nodeId: id, allNodes: nodes })
    },
    [nodes, mutations],
  )

  const copyNode = useCallback((id: string) => {
    setClipboardNodeId(id)
    toast.success('Nó copiado para a área de transferência')
  }, [])

  const pasteNode = useCallback(() => {
    if (clipboardNodeId) {
      mutations.duplicate.mutate({ nodeId: clipboardNodeId, allNodes: nodes })
    }
  }, [clipboardNodeId, nodes, mutations])

  const moveNodes = useCallback(
    (positions: Array<{ id: string; position_x: number; position_y: number }>) => {
      mutations.move.mutate(positions)
    },
    [],
  )

  const reparent = useCallback(
    (childId: string, parentId: string | null) => mutations.reparent.mutate({ childId, parentId }),
    [],
  )

  const onLink = useCallback(
    (sourceId: string, targetId: string, sourceHandle?: string | null, targetHandle?: string | null) => {
      if (!activeWorkspace) return
      mutations.link.mutate({
        workspaceId: activeWorkspace.id,
        sourceId,
        targetId,
        sourceHandle: sourceHandle || undefined,
        targetHandle: targetHandle || undefined
      })
    },
    [mutations.link, activeWorkspace],
  )

  const unlink = useCallback(
    (id: string) => mutations.unlink.mutate(id),
    [],
  )

  const reorganize = useCallback((mode: 'TB' | 'LR' | 'compact') => {
    setLayoutMode(mode)
    mutations.move.mutate(nodes.map((node) => ({ id: node.id, position_x: 0, position_y: 0 })))
    toast.success('Layout reorganizado.')
  }, [nodes, mutations])

  if (isPending) {
    return (
      <div className="p-6">
        <Skeleton className="h-[60vh] w-full bg-[#1E1E28]" />
      </div>
    )
  }

  if (isError || !data) {
    return <p className="p-6 text-[13px] text-[#FF4D4D]">{dbErrorMessage(error)}</p>
  }

  if (isPrinting) {
    return (
      <div className="h-full overflow-y-auto bg-white text-black">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2 print:hidden">
          <Button variant="ghost" size="sm" className="h-9" onClick={() => setIsPrinting(false)}>
            <X className="h-4 w-4" />
            Voltar ao mapa
          </Button>
          <Button size="sm" className="ml-auto h-9" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Salvar em PDF
          </Button>
        </div>

        <PlanDocument plan={data.plan} nodes={nodes} brandName={activeBrand?.name ?? ''} />
      </div>
    )
  }

  return (
    <div className="flex h-full bg-[#0B0B10]">
      <div className="relative flex-1 bg-[#0E0E14]">
        <CanvasSidebar activeTool={activeTool} setActiveTool={setActiveTool} />
        {nodes.length === 0 ? (
          <div className="mx-auto max-w-lg p-8">
            <EmptyState
              icon={Network}
              title={data.plan.name}
              description="Comece pela campanha. Depois pendure os conjuntos nela, e os anúncios nos conjuntos — a mesma hierarquia do Meta."
              action={
                <Button className="h-11 bg-[#6D4AFF] text-white hover:bg-[#6D4AFF]/90" onClick={() => addNode(null)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova campanha
                </Button>
              }
            />
          </div>
        ) : viewMode === 'table' ? (
          <CampaignTable nodes={nodes} />
        ) : viewMode === 'dashboard' ? (
          <CampaignDashboard nodes={nodes} />
        ) : (
          <ReactFlowProvider>
            <CampaignCanvas
              nodes={nodes}
              links={links}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAddChild={addNode}
              onDelete={removeNode}
              onMove={moveNodes}
              onReparent={reparent}
              onLink={onLink}
              onUnlink={unlink}
              onInvalidConnection={(message) => toast.error(message)}
              onUpdateNode={updateNode}
              onDuplicateNode={duplicateNode}
              onCopyNode={copyNode}
              onPasteNode={pasteNode}
              hasClipboard={!!clipboardNodeId}
              layoutMode={layoutMode}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              onAddNode={(type, position, parentId) => {
                mutations.add.mutate({ workspaceId: activeWorkspace!.id, parentId: parentId || null, label: '', orderIndex: 0, type: type as any, positionX: position.x, positionY: position.y })
              }}
            />
            <CanvasLegend />
          </ReactFlowProvider>
        )}

        <Dialog open={!!nodeToDelete} onOpenChange={(open) => !open && setNodeToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir estrutura</DialogTitle>
              <DialogDescription>
                {nodeToDelete?.msg}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNodeToDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmDelete}>Excluir</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {nodes.length > 0 && (
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <div className="pointer-events-auto">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList className="h-9 bg-[#14141C] border border-[#23232F] p-1">
                  <TabsTrigger value="canvas" className="text-xs">Canvas</TabsTrigger>
                  <TabsTrigger value="table" className="text-xs">Tabela</TabsTrigger>
                  <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <span className="pointer-events-auto rounded-md border border-[#23232F] bg-[#14141C] px-2.5 py-1.5 font-sans text-[13px] font-medium text-[#EDEDF2] shadow-sm">
              {data.plan.name}
            </span>

            <span className="pointer-events-auto rounded-md border border-[#23232F] bg-[#14141C] px-2.5 py-1.5 font-sans text-[12px] text-[#8C8CA0] shadow-sm">
              {totals.campanhas} camp · {totals.conjuntos} conj · {totals.anuncios} anún
              {totals.orcamento > 0 && (
                <>
                  {' · '}
                  <span className="font-semibold text-[#EDEDF2]">
                    {totals.orcamento.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </>
              )}
            </span>

            <span className="pointer-events-auto rounded-md border border-[#23232F] bg-[#14141C] px-2.5 py-1.5 font-sans text-[12px] text-[#8C8CA0] shadow-sm">
              {mutations.patch.isPending ? 'Salvando...' : 'Salvo'}
            </span>

            {totals.issues > 0 && (
              <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md border border-[#FFB84D]/40 bg-[#14141C] px-2.5 py-1.5 font-sans text-[12px] text-[#FFB84D] shadow-sm">
                <TriangleAlert className="h-3.5 w-3.5" />
                {totals.issues === 1 ? '1 ponto de atenção' : `${totals.issues} pontos de atenção`}
              </span>
            )}

            <Button
              size="sm"
              variant="outline"
              className="pointer-events-auto h-8 border-[#23232F] bg-[#14141C] text-[#8C8CA0] hover:text-[#EDEDF2]"
              onClick={() => addNode(null)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Campanha
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="pointer-events-auto h-8 border-[#23232F] bg-[#14141C] text-[#8C8CA0] hover:text-[#EDEDF2]"
                  title="Devolve todos os nós ao layout automático"
                >
                  <LayoutGrid className="mr-1 h-3.5 w-3.5" />
                  Reorganizar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => reorganize('TB')}>Layout Vertical</DropdownMenuItem>
                <DropdownMenuItem onClick={() => reorganize('LR')}>Layout Horizontal</DropdownMenuItem>
                <DropdownMenuItem onClick={() => reorganize('compact')}>Layout Compacto</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="outline"
              className="pointer-events-auto h-8 border-[#23232F] bg-[#14141C] text-[#8C8CA0] hover:text-[#EDEDF2]"
              onClick={() => setIsPrinting(true)}
            >
              <Printer className="mr-1 h-3.5 w-3.5" />
              Exportar PDF
            </Button>
          </div>
        )}

        {nodes.length > 0 && <AiAssistant nodes={nodes} />}
      </div>

      {draft && (
        <aside className="w-[320px] shrink-0 overflow-y-auto border-l border-[#1E1E28] bg-[#0E0E14] p-4 text-[#EDEDF2]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-sans text-[14px] font-semibold">{NODE_LABELS[draft.type]}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#8C8CA0] hover:bg-[#1E1E28] hover:text-[#EDEDF2]"
              aria-label="Fechar painel"
              onClick={() => setSelectedId(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mb-4 h-9 w-full border-[#23232F] bg-[#14141C] text-[#8C8CA0] hover:text-[#EDEDF2]"
            onClick={() => mutations.duplicate.mutate({ nodeId: draft.id, allNodes: nodes })}
            disabled={mutations.duplicate.isPending}
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicar com descendentes
          </Button>

          <NodeInspector
            node={draft}
            scriptContext={scriptContext}
            onChange={(patch) => {
              const immediate = {
                ...(patch.script_id !== undefined ? { script_id: patch.script_id } : {}),
                ...(patch.media_kind !== undefined ? { media_kind: patch.media_kind } : {}),
              }

              if (Object.keys(immediate).length > 0) {
                mutations.patch.mutate({ id: draft.id, patch: immediate })
                setDraft((current) => (current ? { ...current, ...immediate } : current))
                if (patch.media_url === undefined) return
              }

              setDraft((current) =>
                current
                  ? {
                      ...current,
                      ...(patch.label !== undefined ? { label: patch.label } : {}),
                      ...(patch.media_url !== undefined ? { media_url: patch.media_url } : {}),
                      ...(patch.data !== undefined
                        ? { data: patch.data as CampaignNode['data'] }
                        : {}),
                    }
                  : current,
              )
            }}
          />
        </aside>
      )}
    </div>
  )
}
