import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, FileText, Plus, Search, ChevronDown, MoreVertical } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace'
import { listScripts, SCRIPTS_PAGE_SIZE } from '@/features/scripts/api'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { dbErrorMessage } from '@/lib/db-errors'
import { strings } from '@/i18n/pt-BR'

export function ScriptsListPage() {
  const { activeWorkspace } = useActiveWorkspace()
  const workspaceId = activeWorkspace?.id ?? ''

  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') ?? 'all')
  const [page, setPage] = useState(0)
  const debouncedSearch = useDebouncedValue(search, 300)

  const filters = {
    workspaceId,
    search: debouncedSearch,
    status,
    brandId: 'all',
    platform: 'all',
    page,
  }

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['scripts', 'list', filters],
    queryFn: () => listScripts(filters),
    enabled: Boolean(workspaceId),
  })

  const hasFilters = debouncedSearch.trim() !== '' || status !== 'all'

  function resetFilters() {
    setSearch('')
    setStatus('all')
    setSearchParams({}, { replace: true })
    setPage(0)
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / SCRIPTS_PAGE_SIZE)) : 1

  return (
    <div className="flex h-full flex-col bg-[#0B0B10] text-[#EDEDF2]">
      {/* Topbar */}
      <div className="flex h-[52px] shrink-0 items-center gap-[12px] border-b border-[#1E1E28] bg-[#0E0E14] px-4">
        <div className="flex h-8 max-w-[360px] flex-1 items-center gap-2 rounded-lg border border-[#23232F] bg-[#14141C] px-2.5">
          <Search className="h-3.5 w-3.5 text-[#5E5E75]" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Buscar roteiros…"
            className="h-full flex-1 border-0 bg-transparent px-0 font-sans text-[13px] text-[#EDEDF2] placeholder:text-[#5E5E75] focus-visible:ring-0"
          />
          <span className="rounded-[4px] bg-[#1C1C27] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#8C8CA0]">
            ⌘K
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <Button
            className="h-8 gap-1.5 bg-[#6D4AFF] px-3 font-sans text-[13px] font-medium text-white hover:bg-[#6D4AFF]/90"
            asChild
          >
            <Link to="/create">
              <Plus className="h-3.5 w-3.5" />
              Novo roteiro
              <span className="font-mono text-[10px] font-medium opacity-65">⌘N</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="m-0 font-sans text-[24px] font-semibold tracking-[-0.03em] leading-tight text-[#EDEDF2]">
              Roteiros criados no workspace
            </h1>
            <p className="mt-1.5 font-sans text-[14px] text-[#8C8CA0]">
              {data?.total ?? 0} {data?.total === 1 ? 'roteiro organizado' : 'roteiros organizados'} por estado de produção.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#23232F] bg-[#14141C] px-2 py-1 font-sans text-[11px] font-medium text-[#EDEDF2] transition-colors hover:bg-[#1E1E28]">
              Marca <ChevronDown className="h-3 w-3 text-[#6E6E85]" />
            </span>
            <span className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#23232F] bg-[#14141C] px-2 py-1 font-sans text-[11px] font-medium text-[#EDEDF2] transition-colors hover:bg-[#1E1E28]">
              Estado <ChevronDown className="h-3 w-3 text-[#6E6E85]" />
            </span>
            <span className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#23232F] bg-[#14141C] px-2 py-1 font-sans text-[11px] font-medium text-[#EDEDF2] transition-colors hover:bg-[#1E1E28]">
              Data <ChevronDown className="h-3 w-3 text-[#6E6E85]" />
            </span>
          </div>
        </div>

        {/* Tabs Filter */}
        <div className="mb-4 flex items-center gap-4 border-b border-[#1E1E28]">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'idea', label: 'Ideia' },
            { value: 'script', label: 'Roteiro' },
            { value: 'approved', label: 'Aprovação' },
            { value: 'recording', label: 'Gravação' },
            { value: 'editing', label: 'Edição' },
            { value: 'published', label: 'Publicado' },
            { value: 'archived', label: 'Arquivado' },
          ].map((tab) => {
            const isActive = status === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setStatus(tab.value)
                  setSearchParams(tab.value === 'all' ? {} : { status: tab.value }, { replace: true })
                  setPage(0)
                }}
                className={`relative pb-3 font-sans text-[13px] font-medium transition-colors ${
                  isActive ? 'text-[#B9A6FF]' : 'text-[#8C8CA0] hover:text-[#EDEDF2]'
                }`}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#6D4AFF]" />
                )}
              </button>
            )
          })}
        </div>

        {/* Table Content */}
        {isPending ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[60px] w-full rounded-xl bg-[#14141C]" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title={strings.errors.unexpected}
            description={dbErrorMessage(error)}
            action={
              <Button variant="outline" onClick={() => refetch()}>
                {strings.common.tryAgain}
              </Button>
            }
          />
        ) : data?.items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={hasFilters ? strings.scripts.noResultsTitle : strings.scripts.emptyTitle}
            description={hasFilters ? strings.scripts.noResultsDescription : strings.scripts.emptyDescription}
            action={
              hasFilters ? (
                <Button variant="outline" onClick={resetFilters}>
                  {strings.common.clearFilters}
                </Button>
              ) : (
                <Button asChild className="h-11">
                  <Link to="/create">
                    <Plus className="mr-2 h-4 w-4" />
                    {strings.create.title}
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="flex flex-col">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_minmax(0,1fr)_120px_100px_100px_40px] items-center gap-4 border-b border-[#1E1E28] pb-3 text-left">
              <div className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border border-[#3A3A4A]" />
              <span className="font-sans text-[11px] font-medium text-[#8C8CA0]">Título e marca</span>
              <span className="font-sans text-[11px] font-medium text-[#8C8CA0]">Estado</span>
              <span className="font-sans text-[11px] font-medium text-[#8C8CA0]">Plataforma</span>
              <span className="font-sans text-[11px] font-medium text-[#8C8CA0]">Duração</span>
              <span />
            </div>

            {/* Table Rows */}
            <div className="flex flex-col">
              {data?.items.map((script) => (
                <div
                  key={script.id}
                  className="group grid grid-cols-[auto_minmax(0,1fr)_120px_100px_100px_40px] items-center gap-4 border-b border-[#1E1E28] py-3 transition-colors hover:bg-[#14141C]"
                >
                  <div className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border border-[#3A3A4A]" />
                  <div className="flex min-w-0 flex-col">
                    <Link
                      to={`/scripts/${script.id}`}
                      className="truncate font-sans text-[13px] font-medium text-[#EDEDF2] hover:text-[#B9A6FF]"
                    >
                      {script.title}
                    </Link>
                    <span className="truncate font-sans text-[11px] text-[#8C8CA0]">
                      {script.brand?.name ?? '—'}
                    </span>
                  </div>
                  <div>
                    <span className="inline-flex rounded-[5px] bg-[#1C1C27] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.05em] text-[#8C8CA0]">
                      {script.status}
                    </span>
                  </div>
                  <span className="font-sans text-[12px] text-[#8C8CA0]">
                    {script.platform === 'instagram_reels' ? 'Reels' : script.platform === 'tiktok' ? 'TikTok' : script.platform === 'youtube_shorts' ? 'Shorts' : script.platform}
                  </span>
                  <span className="font-sans text-[12px] text-[#8C8CA0]">{script.duration_seconds}s</span>
                  <button className="flex h-6 w-6 items-center justify-center rounded-md text-[#5E5E75] opacity-0 transition-opacity hover:bg-[#23232F] hover:text-[#EDEDF2] group-hover:opacity-100">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <p className="font-sans text-[12px] text-[#5E5E75]">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-[#23232F] bg-[#14141C] text-[#8C8CA0] hover:text-[#EDEDF2]"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-[#23232F] bg-[#14141C] text-[#8C8CA0] hover:text-[#EDEDF2]"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
