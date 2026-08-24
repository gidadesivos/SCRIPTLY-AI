import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ReactFlowProvider } from '@xyflow/react'
import { Copy, LayoutGrid, Network, Plus, Printer, TriangleAlert, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { CampaignCanvas } from '@/features/campaigns/components/CampaignCanvas'
import { NodeInspector } from '@/features/campaigns/components/NodeInspector'
import { CanvasLegend } from '@/features/campaigns/components/CanvasLegend'
import { PlanDocument } from '@/features/campaigns/components/PlanDocument'
import { useNodeMutations, usePlan } from '@/features/campaigns/hooks/usePlan'
import { planTotals } from '@/features/campaigns/validation'
import { ALLOWED_CHILD, NODE_LABELS, type CampaignNode } from '@/features/campaigns/types'
import { getScriptWithScenes } from '@/features/scripts/api'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { useActiveBrand } from '@/features/brands/hooks/useActiveBrand'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { dbErrorMessage } from '@/lib/db-errors'

export function PlanBoardPage() {
  const { planId } = useParams<{ planId: string }>()
  const { activeWorkspace } = useActiveWorkspace()
  const { activeBrand } = useActiveBrand()
  const workspaceId = activeWorkspace?.id ?? ''

  const { data, isPending, isError, error } = usePlan(planId)
  const mutations = useNodeMutations(planId ?? '')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  /**
   * Cópia local do nó em edição, para o formulário responder na hora.
   *
   * Sem ela, cada tecla esperaria o round-trip ao banco e o campo perderia o
   * cursor a cada revalidação.
   */
  const [draft, setDraft] = useState<CampaignNode | null>(null)
  const debouncedDraft = useDebouncedValue(draft, 700)

  const nodes = useMemo(() => data?.nodes ?? [], [data])
  const links = useMemo(() => data?.links ?? [], [data])
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
    // mutations muda de identidade a cada render; incluí-lo aqui dispararia o
    // efeito em loop.
  }, [debouncedDraft]) // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => planTotals(nodes), [nodes])

  /**
   * Locução do roteiro vinculado, para a IA de copy escrever conversando com o
   * vídeo em vez de repetir a locução.
   *
   * Só busca quando há anúncio selecionado COM roteiro: carregar o roteiro a
   * cada seleção seria um request por clique no canvas.
   */
  const { data: linkedScript } = useQuery({
    queryKey: ['campaign-script-context', selected?.script_id],
    queryFn: () => getScriptWithScenes(selected?.script_id as string),
    enabled: Boolean(selected?.script_id),
  })

  const scriptContext = useMemo(() => {
    if (!linkedScript) return ''
    const falas = linkedScript.scenes.map((scene) => scene.voiceover).filter(Boolean)
    // Truncado: o schema da Edge Function aceita 4000, e mandar o roteiro
    // inteiro de um vídeo longo só encareceria a chamada.
    return [linkedScript.script.title, ...falas].join('\n').slice(0, 3500)
  }, [linkedScript])

  /**
   * Estáveis de propósito.
   *
   * Estes callbacks descem para o canvas e entram nas dependências do efeito
   * que ressincroniza os nós. Recriados a cada render, faziam esse efeito rodar
   * o tempo todo — foi o que fez o arrasto voltar ao lugar.
   */
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
        // Zero pede o layout automático; um nó novo entra posicionado pela árvore.
        positionX: 0,
        positionY: 0,
        orderIndex: siblings.length,
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, workspaceId],
  )

  const removeNode = useCallback(
    (id: string) => {
      setSelectedId((current) => (current === id ? null : current))
      mutations.remove.mutate(id)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const moveNodes = useCallback(
    (positions: Array<{ id: string; position_x: number; position_y: number }>) => {
      mutations.move.mutate(positions)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const reparent = useCallback(
    (childId: string, parentId: string) => mutations.reparent.mutate({ childId, parentId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const link = useCallback(
    (sourceId: string, targetId: string) =>
      mutations.link.mutate({ workspaceId, sourceId, targetId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceId],
  )

  const unlink = useCallback(
    (id: string) => mutations.unlink.mutate(id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  /**
   * Devolve tudo ao layout automático.
   *
   * Zerar a posição é o que faz resolvePosition voltar a calcular — o mesmo
   * caminho de um nó recém-criado, sem uma segunda regra para manter.
   */
  const reorganize = useCallback(() => {
    mutations.move.mutate(nodes.map((node) => ({ id: node.id, position_x: 0, position_y: 0 })))
    toast.success('Layout reorganizado.')
  }, [nodes]) // eslint-disable-line react-hooks/exhaustive-deps

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

  /**
   * A vista de documento entra no lugar do canvas.
   *
   * Não é modal nem aba nova: as regras de @media print do app já escondem
   * header, aside e .print:hidden, então basta o documento ser o que está na
   * tela na hora de imprimir. Aba nova perderia os dados já carregados.
   */
  if (isPrinting) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background px-4 py-2 print:hidden">
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
              links={links}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAddChild={addNode}
              onDelete={removeNode}
              onMove={moveNodes}
              onReparent={reparent}
              onLink={link}
              onUnlink={unlink}
              onInvalidConnection={(message) => toast.error(message)}
            />
            <CanvasLegend />
          </ReactFlowProvider>
        )}

        {nodes.length > 0 && (
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <span className="pointer-events-auto rounded-md border border-border bg-card px-2.5 py-1.5 text-sm font-medium shadow-sm">
              {data.plan.name}
            </span>

            <span className="pointer-events-auto rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm">
              {totals.campanhas} camp · {totals.conjuntos} conj · {totals.anuncios} anún
              {totals.orcamento > 0 && (
                <>
                  {' · '}
                  <span className="font-semibold text-foreground">
                    {totals.orcamento.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </>
              )}
            </span>

            {totals.issues > 0 && (
              <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-card px-2.5 py-1.5 text-xs text-warning shadow-sm">
                <TriangleAlert className="h-3.5 w-3.5" />
                {totals.issues === 1 ? '1 ponto de atenção' : `${totals.issues} pontos de atenção`}
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
            <Button
              size="sm"
              variant="outline"
              className="pointer-events-auto h-9 bg-card"
              onClick={reorganize}
              title="Devolve todos os nós ao layout automático"
            >
              <LayoutGrid className="h-4 w-4" />
              Reorganizar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="pointer-events-auto h-9 bg-card"
              onClick={() => setIsPrinting(true)}
            >
              <Printer className="h-4 w-4" />
              Exportar PDF
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

          <Button
            variant="outline"
            size="sm"
            className="mb-4 h-9 w-full"
            onClick={() => mutations.duplicate.mutate({ nodeId: draft.id, allNodes: nodes })}
            disabled={mutations.duplicate.isPending}
          >
            <Copy className="h-4 w-4" />
            Duplicar com o que está dentro
          </Button>

          <NodeInspector
            node={draft}
            scriptContext={scriptContext}
            onChange={(patch) => {
              /**
               * Escolha de um clique salva na hora; digitação espera o débito.
               *
               * Vincular roteiro e marcar vídeo/imagem são um clique só —
               * esperar 700 ms ali daria a sensação de que não pegou. Já o link
               * da mídia é DIGITADO: salvar a cada tecla seria uma escrita por
               * caractere, então ele vai pelo rascunho como os outros campos.
               */
              const immediate = {
                ...(patch.script_id !== undefined ? { script_id: patch.script_id } : {}),
                ...(patch.media_kind !== undefined ? { media_kind: patch.media_kind } : {}),
              }

              if (Object.keys(immediate).length > 0) {
                mutations.patch.mutate({ id: draft.id, patch: immediate })
                setDraft((current) => (current ? { ...current, ...immediate } : current))
                // media_url pode vir junto com media_kind quando o link já diz o
                // tipo; nesse caso ele segue para o rascunho abaixo.
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
