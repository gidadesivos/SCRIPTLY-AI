import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import { Plus, TriangleAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { Network } from 'lucide-react'
import { CampaignCanvas } from '@/features/campaigns/components/CampaignCanvas'
import { NodeInspector } from '@/features/campaigns/components/NodeInspector'
import { useNodeMutations, usePlan } from '@/features/campaigns/hooks/usePlan'
import { countIssues } from '@/features/campaigns/validation'
import { ALLOWED_CHILD, NODE_LABELS, type CampaignNode } from '@/features/campaigns/types'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { dbErrorMessage } from '@/lib/db-errors'

export function PlanBoardPage() {
  const { planId } = useParams<{ planId: string }>()
  const { activeWorkspace } = useActiveWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''

  const { data, isPending, isError, error } = usePlan(planId)
  const mutations = useNodeMutations(planId ?? '')

  const [selectedId, setSelectedId] = useState<string | null>(null)

  /**
   * Cópia local do nó em edição, para o formulário responder na hora.
   *
   * Sem ela, cada tecla esperaria o round-trip ao banco e o campo perderia o
   * cursor a cada revalidação.
   */
  const [draft, setDraft] = useState<CampaignNode | null>(null)
  const debouncedDraft = useDebouncedValue(draft, 700)

  const nodes = useMemo(() => data?.nodes ?? [], [data])
  const selected = nodes.find((node) => node.id === selectedId) ?? null

  useEffect(() => {
    setDraft(selected)
    // Trocar de nó recarrega o rascunho; editar o mesmo nó não.
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave do nó em edição, com o mesmo débito do editor de roteiro.
  useEffect(() => {
    if (!debouncedDraft) return
    const original = nodes.find((node) => node.id === debouncedDraft.id)
    if (!original) return

    const labelChanged = original.label !== debouncedDraft.label
    const dataChanged =
      JSON.stringify(original.data) !== JSON.stringify(debouncedDraft.data)
    if (!labelChanged && !dataChanged) return

    mutations.patch.mutate({
      id: debouncedDraft.id,
      patch: { label: debouncedDraft.label, data: debouncedDraft.data },
    })
    // mutations muda de identidade a cada render; incluí-lo aqui dispararia o
    // efeito em loop.
  }, [debouncedDraft]) // eslint-disable-line react-hooks/exhaustive-deps

  const issueCount = useMemo(() => countIssues(nodes), [nodes])

  function addNode(parentId: string | null) {
    const parent = parentId ? nodes.find((node) => node.id === parentId) : null
    const type = parent ? ALLOWED_CHILD[parent.type] : 'campanha'
    if (!type) return

    const siblings = nodes.filter((node) => node.parent_id === parentId)

    mutations.add.mutate({
      workspaceId,
      parentId,
      type,
      label: '',
      // Zero pede o layout automático; um nó novo entra posicionado pela árvore.
      positionX: 0,
      positionY: 0,
      orderIndex: siblings.length,
    })
  }

  if (isPending) {
    return (
      <div className="p-6">
        <Skeleton className="h-[60vh] w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return <p className="p-6 text-sm text-destructive">{dbErrorMessage(error)}</p>
  }

  return (
    <div className="flex h-full">
      <div className="relative min-w-0 flex-1">
        {nodes.length === 0 ? (
          <div className="mx-auto max-w-lg p-8">
            <EmptyState
              icon={Network}
              title={data.plan.name}
              description="Comece pela campanha. Depois pendure os conjuntos nela, e os anúncios nos conjuntos — a mesma hierarquia do Meta."
              action={
                <Button className="h-11" onClick={() => addNode(null)}>
                  <Plus className="h-4 w-4" />
                  Nova campanha
                </Button>
              }
            />
          </div>
        ) : (
          <ReactFlowProvider>
            <CampaignCanvas
              nodes={nodes}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAddChild={addNode}
              onDelete={(id) => {
                if (selectedId === id) setSelectedId(null)
                mutations.remove.mutate(id)
              }}
              onMove={(positions) => mutations.move.mutate(positions)}
            />
          </ReactFlowProvider>
        )}

        {nodes.length > 0 && (
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <span className="pointer-events-auto rounded-md border border-border bg-card px-2.5 py-1.5 text-sm font-medium shadow-sm">
              {data.plan.name}
            </span>
            {issueCount > 0 && (
              <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-card px-2.5 py-1.5 text-xs text-warning shadow-sm">
                <TriangleAlert className="h-3.5 w-3.5" />
                {issueCount === 1 ? '1 ponto de atenção' : `${issueCount} pontos de atenção`}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="pointer-events-auto h-9 bg-card"
              onClick={() => addNode(null)}
            >
              <Plus className="h-4 w-4" />
              Campanha
            </Button>
          </div>
        )}
      </div>

      {draft && (
        <aside className="w-full max-w-sm shrink-0 overflow-y-auto border-l border-border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium">{NODE_LABELS[draft.type]}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Fechar painel"
              onClick={() => setSelectedId(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <NodeInspector
            node={draft}
            onChange={(patch) => {
              // Vincular roteiro é uma escolha única, não digitação: salva na
              // hora em vez de esperar o débito de 700 ms.
              if (patch.script_id !== undefined) {
                mutations.patch.mutate({ id: draft.id, patch: { script_id: patch.script_id } })
                setDraft((current) =>
                  current ? { ...current, script_id: patch.script_id ?? null } : current,
                )
                return
              }

              setDraft((current) =>
                current
                  ? {
                      ...current,
                      ...(patch.label !== undefined ? { label: patch.label } : {}),
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
