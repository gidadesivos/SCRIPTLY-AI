import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowDown, ArrowUp, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { NotAllowedError } from '@/features/scripts/api'
import {
  addWorkspaceModel,
  listWorkspaceModels,
  removeWorkspaceModel,
  reorderWorkspaceModels,
  type WorkspaceModel,
} from '@/features/settings/api'
import { listModels, type CatalogModel } from '@/lib/ai'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { canDeleteScripts } from '@/lib/permissions'
import { strings } from '@/i18n/pt-BR'

/**
 * Escolha dos modelos que o OpenRouter tenta, em ordem.
 *
 * Sem escolha, a Edge Function usa a lista padrão — a configuração é opcional.
 * Por isso a tela diz qual estado está valendo em vez de mostrar uma lista
 * vazia que pareceria "nada configurado, nada funciona".
 */
export function ModelPicker({ provider }: { provider: 'openrouter' | 'groq' | 'gemini' }) {
  const { activeWorkspace } = useActiveWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''
  const canEdit = canDeleteScripts(activeWorkspace?.role)
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [isBrowsing, setIsBrowsing] = useState(false)

  const chosen = useQuery({
    queryKey: ['workspace-models', workspaceId],
    queryFn: () => listWorkspaceModels(workspaceId),
    enabled: Boolean(workspaceId),
  })

  const catalog = useQuery({
    queryKey: ['model-catalog', workspaceId, provider],
    queryFn: () => listModels(workspaceId, provider),
    // Só busca quando o usuário abre a lista: são centenas de modelos e a
    // chamada sai da Edge Function até o OpenRouter.
    enabled: isBrowsing && Boolean(workspaceId),
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['workspace-models', workspaceId] })
  }

  function report(error: unknown) {
    toast.error(error instanceof NotAllowedError ? error.message : strings.errors.unexpected)
  }

  const models = useMemo(() => {
    return (chosen.data ?? []).filter((m) => m.provider === provider)
  }, [chosen.data, provider])

  const add = useMutation({
    mutationFn: (model: CatalogModel) =>
      addWorkspaceModel({
        workspaceId,
        provider,
        modelId: model.id,
        label: model.name,
        position: models.length + 1,
      }),
    onSuccess: refresh,
    onError: report,
  })

  const remove = useMutation({
    mutationFn: (id: string) => removeWorkspaceModel(id),
    onSuccess: refresh,
    onError: report,
  })

  const reorder = useMutation({
    mutationFn: reorderWorkspaceModels,
    onSuccess: refresh,
    onError: report,
  })

  const chosenIds = new Set(models.map((model) => model.model_id))

  const results = useMemo(() => {
    const all = catalog.data?.models ?? []
    const term = search.trim().toLowerCase()
    return all
      .filter((model) => !chosenIds.has(model.id))
      .filter(
        (model) => model.pricePromptPerMillion === 0 && model.priceCompletionPerMillion === 0
      )
      .filter(
        (model) =>
          !term || model.id.toLowerCase().includes(term) || model.name.toLowerCase().includes(term),
      )
      .slice(0, 40)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog.data, search, chosen.data])

  function move(index: number, direction: -1 | 1) {
    const next = [...models]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    reorder.mutate(next.map((model, position) => ({ id: model.id, position: position + 1 })))
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium">Modelos do {provider === 'openrouter' ? 'OpenRouter' : 'Groq'}</p>
        <p className="text-xs text-muted-foreground">
          Tentados nesta ordem quando o Gemini não atende. Sem escolha, vale a lista padrão.
        </p>
      </div>

      {chosen.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : models.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Usando a lista padrão. Escolha modelos aqui para substituí-la.
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {models.map((model, index) => (
            <ChosenRow
              key={model.id}
              model={model}
              index={index}
              isLast={index === models.length - 1}
              canEdit={canEdit}
              busy={reorder.isPending || remove.isPending}
              onMove={move}
              onRemove={() => remove.mutate(model.id)}
            />
          ))}
        </ol>
      )}

      {canEdit && (
        <>
          {!isBrowsing ? (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setIsBrowsing(true)}
              >
                <Plus className="h-4 w-4" />
                Adicionar modelo
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  className="pl-8"
                  placeholder="Buscar modelo (ex: claude, gemini, gpt)"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              {catalog.isPending && (
                <p className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Buscando o catálogo…
                </p>
              )}

              {catalog.isError && (
                <div className="flex flex-col items-start gap-1.5 py-2 text-xs text-warning">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                    Não consegui ler o catálogo. Confira se {provider === 'openrouter' ? 'OPENROUTER_API_KEY' : provider === 'groq' ? 'GROQ_API_KEY' : 'GEMINI_API_KEY'} está nos secrets.
                  </div>
                  <span className="text-muted-foreground">{catalog.error instanceof Error ? catalog.error.message : String(catalog.error)}</span>
                </div>
              )}

              {catalog.data && (
                <ul className="max-h-64 overflow-y-auto">
                  {results.length === 0 && (
                    <li className="py-2 text-xs text-muted-foreground">Nenhum modelo encontrado.</li>
                  )}
                  {results.map((model) => (
                    <CatalogRow
                      key={model.id}
                      model={model}
                      busy={add.isPending}
                      onAdd={() => add.mutate(model)}
                    />
                  ))}
                </ul>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-8 self-start text-xs"
                onClick={() => setIsBrowsing(false)}
              >
                Fechar
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ChosenRow({
  model,
  index,
  isLast,
  canEdit,
  busy,
  onMove,
  onRemove,
}: {
  model: WorkspaceModel
  index: number
  isLast: boolean
  canEdit: boolean
  busy: boolean
  onMove: (index: number, direction: -1 | 1) => void
  onRemove: () => void
}) {
  return (
    <li className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{model.label || model.model_id}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">{model.model_id}</p>
      </div>

      {canEdit && (
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Subir na ordem"
            disabled={index === 0 || busy}
            onClick={() => onMove(index, -1)}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Descer na ordem"
            disabled={isLast || busy}
            onClick={() => onMove(index, 1)}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            aria-label={`Remover ${model.label || model.model_id}`}
            disabled={busy}
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </li>
  )
}

function CatalogRow({
  model,
  busy,
  onAdd,
}: {
  model: CatalogModel
  busy: boolean
  onAdd: () => void
}) {
  // Preço por milhão de tokens: por-token vem como número minúsculo que
  // ninguém compara de cabeça.
  const price = (value: number | null) =>
    value === null ? null : value === 0 ? 'grátis' : `$${value.toFixed(2)}/M`

  const input = price(model.pricePromptPerMillion)
  const output = price(model.priceCompletionPerMillion)

  return (
    <li className="flex items-center gap-2 border-b border-border/50 py-1.5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm">
          {model.name}
          {model.supportsStructured === false && (
            <span
              className="shrink-0 text-warning"
              title="O catálogo não lista suporte a JSON estruturado — pode não funcionar aqui."
            >
              <AlertTriangle className="h-3 w-3" />
            </span>
          )}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {input && output ? `entrada ${input} · saída ${output}` : 'preço não informado'}
          {model.contextLength ? ` · ${Math.round(model.contextLength / 1000)}k contexto` : ''}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 px-2 text-xs"
        disabled={busy}
        onClick={onAdd}
      >
        <Plus className="h-3.5 w-3.5" />
        Usar
      </Button>
    </li>
  )
}
