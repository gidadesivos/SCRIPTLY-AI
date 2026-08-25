import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, FileText, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { useBrands } from '@/features/brands/hooks/useBrands'
import { listScripts, SCRIPTS_PAGE_SIZE, type ScriptWithBrand } from '@/features/scripts/api'
import { ScriptCard } from '@/features/scripts/components/ScriptCard'
import { DeleteScriptDialog } from '@/features/scripts/components/DeleteScriptDialog'
import { useArchiveScript, useDeleteScript } from '@/features/scripts/hooks/useScriptActions'
import { canDeleteScripts, canEditScripts } from '@/lib/permissions'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { PLATFORMS, SCRIPT_STATUSES } from '@/config/options'
import { dbErrorMessage } from '@/lib/db-errors'
import { strings } from '@/i18n/pt-BR'

export function ScriptsListPage() {
  const { activeWorkspace } = useActiveWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''

  // O papel vem do banco (ver listWorkspaces): oferecer "Excluir" a quem a RLS
  // barra produziria um sucesso falso, porque delete barrado volta sem erro.
  const canDelete = canDeleteScripts(activeWorkspace?.role)
  const canArchive = canEditScripts(activeWorkspace?.role)

  const archive = useArchiveScript()
  const remove = useDeleteScript()
  const [pendingDelete, setPendingDelete] = useState<ScriptWithBrand | null>(null)

  // Permite chegar filtrado a partir do dashboard (/scripts?status=roteiro).
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') ?? 'all')
  const [brandId, setBrandId] = useState('all')
  const [platform, setPlatform] = useState('all')
  const [page, setPage] = useState(0)
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data: brands = [] } = useBrands({ workspaceId, status: 'all' })

  const filters = {
    workspaceId,
    search: debouncedSearch,
    status,
    brandId,
    platform,
    page,
  }

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['scripts', 'list', filters],
    queryFn: () => listScripts(filters),
    enabled: Boolean(workspaceId),
  })

  const hasFilters =
    debouncedSearch.trim() !== '' || status !== 'all' || brandId !== 'all' || platform !== 'all'

  function resetFilters() {
    setSearch('')
    setStatus('all')
    setSearchParams({}, { replace: true })
    setBrandId('all')
    setPlatform('all')
    setPage(0)
  }

  /** Qualquer mudança de filtro volta para a primeira página. */
  function withPageReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(0)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / SCRIPTS_PAGE_SIZE)) : 1

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.scripts.title}
        description={strings.scripts.subtitle}
        action={
          <Button asChild className="h-11">
            <Link to="/create">
              <Plus className="h-4 w-4" />
              {strings.create.title}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(0)
            }}
            placeholder={strings.scripts.searchPlaceholder}
            aria-label={strings.scripts.searchPlaceholder}
            className="pl-9"
          />
        </div>

        <Select value={brandId} onValueChange={withPageReset(setBrandId)}>
          <SelectTrigger className="lg:w-48" aria-label="Filtrar por marca">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{strings.products.allBrands}</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={withPageReset((value: string) => {
            setStatus(value)
            // Mantém a URL coerente com o filtro visível, para poder compartilhar.
            setSearchParams(value === 'all' ? {} : { status: value }, { replace: true })
          })}
        >
          <SelectTrigger className="lg:w-44" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {SCRIPT_STATUSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={platform} onValueChange={withPageReset(setPlatform)}>
          <SelectTrigger className="lg:w-48" aria-label="Filtrar por plataforma">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as plataformas</SelectItem>
            {PLATFORMS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          title={strings.errors.unexpected}
          description={dbErrorMessage(error)}
          action={
            <Button variant="outline" className="h-11" onClick={() => refetch()}>
              {strings.common.tryAgain}
            </Button>
          }
        />
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={FileText}
          title={hasFilters ? strings.scripts.noResultsTitle : strings.scripts.emptyTitle}
          description={
            hasFilters ? strings.scripts.noResultsDescription : strings.scripts.emptyDescription
          }
          action={
            hasFilters ? (
              <Button variant="outline" className="h-11" onClick={resetFilters}>
                {strings.common.clearFilters}
              </Button>
            ) : (
              <Button asChild className="h-11">
                <Link to="/create">
                  <Plus className="h-4 w-4" />
                  {strings.create.title}
                </Link>
              </Button>
            )
          }
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((script) => (
              <li key={script.id}>
                <ScriptCard
                  script={script}
                  canArchive={canArchive}
                  canDelete={canDelete}
                  onArchive={(target) => archive.mutate(target.id)}
                  onDelete={setPendingDelete}
                />
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              {data.total} {data.total === 1 ? 'roteiro' : 'roteiros'} · página {page + 1} de{' '}
              {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-11"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-11"
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <DeleteScriptDialog
        scriptId={pendingDelete?.id ?? null}
        title={pendingDelete?.title ?? ''}
        isDeleting={remove.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          remove.mutate(pendingDelete.id, { onSettled: () => setPendingDelete(null) })
        }}
      />
    </div>
  )
}
